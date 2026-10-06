// Supabase Edge Function: webhook platobnej brány -> označí objednávku ako zaplatenú.
// Trigger orders_after_update v databáze potom predĺži TOP / zvýraznenie.
// Nasadenie: supabase functions deploy payment-webhook --no-verify-jwt
// Tajomstvá:  supabase secrets set PAYMENT_WEBHOOK_SECRET=...  (SUPABASE_URL a SERVICE_ROLE_KEY sú dostupné automaticky)
import { createClient } from "npm:@supabase/supabase-js@2";

const SECRET = Deno.env.get("PAYMENT_WEBHOOK_SECRET") ?? "";

async function hmacHex(body: string, secret: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function timingSafeEqual(a: string, b: string) {
  const ab = new TextEncoder().encode(a), bb = new TextEncoder().encode(b);
  if (ab.length !== bb.length) return false;
  let diff = 0; for (let i = 0; i < ab.length; i++) diff |= ab[i] ^ bb[i];
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const raw = await req.text();

  // Overenie podpisu – prispôsobte konkrétnej bráne (CCBill, Segpay, Verotel majú vlastné schémy).
  const given = req.headers.get("x-signature") ?? "";
  const expected = await hmacHex(raw, SECRET);
  if (!SECRET || !timingSafeEqual(given, expected)) return new Response("Invalid signature", { status: 401 });

  let payload: { order_id?: string; status?: string; provider?: string; provider_ref?: string; amount?: number };
  try { payload = JSON.parse(raw); } catch { return new Response("Bad JSON", { status: 400 }); }
  if (!payload.order_id) return new Response("order_id missing", { status: 400 });

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const status = payload.status === "paid" ? "paid" : payload.status === "refunded" ? "refunded" : "failed";

  // Suma od brány musí zodpovedať objednávke (klient nemôže zaplatiť menej za drahší produkt)
  const { data: order } = await sb.from("orders").select("id,amount_eur,status").eq("id", payload.order_id).maybeSingle();
  if (!order) return new Response("Unknown order", { status: 404 });
  if (order.status !== "pending" && status === "paid") return new Response(JSON.stringify({ ok: true, idempotent: true }), { headers: { "content-type": "application/json" } });
  if (status === "paid" && (typeof payload.amount !== "number" || payload.amount + 0.001 < Number(order.amount_eur))) {
    await sb.from("audit_log").insert({ action: "payment_amount_mismatch", entity: "order", entity_id: payload.order_id, data: { expected: order.amount_eur, got: payload.amount } });
    return new Response("Amount mismatch", { status: 400 });
  }
  const { error } = await sb.from("orders").update({
    status, provider: payload.provider ?? "unknown", provider_ref: payload.provider_ref ?? null,
    paid_at: status === "paid" ? new Date().toISOString() : null,
  }).eq("id", payload.order_id).eq("status", "pending");
  if (error) return new Response(error.message, { status: 500 });

  await sb.from("audit_log").insert({ action: "payment_" + status, entity: "order", entity_id: payload.order_id, data: payload });
  return new Response(JSON.stringify({ ok: true }), { headers: { "content-type": "application/json" } });
});
