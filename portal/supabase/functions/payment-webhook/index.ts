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

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const raw = await req.text();

  // Overenie podpisu – prispôsobte konkrétnej bráne (CCBill, Segpay, Verotel majú vlastné schémy).
  const given = req.headers.get("x-signature") ?? "";
  if (!SECRET || given !== (await hmacHex(raw, SECRET))) return new Response("Invalid signature", { status: 401 });

  let payload: { order_id?: string; status?: string; provider?: string; provider_ref?: string; amount?: number };
  try { payload = JSON.parse(raw); } catch { return new Response("Bad JSON", { status: 400 }); }
  if (!payload.order_id) return new Response("order_id missing", { status: 400 });

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const status = payload.status === "paid" ? "paid" : payload.status === "refunded" ? "refunded" : "failed";
  const { error } = await sb.from("orders").update({
    status, provider: payload.provider ?? "unknown", provider_ref: payload.provider_ref ?? null,
    paid_at: status === "paid" ? new Date().toISOString() : null,
  }).eq("id", payload.order_id).eq("status", "pending");
  if (error) return new Response(error.message, { status: 500 });

  await sb.from("audit_log").insert({ action: "payment_" + status, entity: "order", entity_id: payload.order_id, data: payload });
  return new Response(JSON.stringify({ ok: true }), { headers: { "content-type": "application/json" } });
});
