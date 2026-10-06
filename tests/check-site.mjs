/**
 * Automatischer Funktionstest der SX Workforce Website.
 *
 * Startet einen lokalen HTTP-Server, öffnet die Seiten in Chromium (Playwright)
 * und prüft Links, Bilder, Konsole, Navigation, Galerie, Formular und Layout.
 *
 * Aufruf:  node tests/check-site.mjs
 */
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
let chromium;
try {
  ({ chromium } = require("playwright"));
} catch {
  ({ chromium } = require("/opt/node-tools/node_modules/playwright"));
}

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = {
  ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript",
  ".png": "image/png", ".jpg": "image/jpeg", ".ico": "image/x-icon",
  ".xml": "application/xml", ".txt": "text/plain",
};

// --- Mini-Webserver (statisch) ---------------------------------------------
const server = createServer(async (req, res) => {
  let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (p.endsWith("/")) p += "index.html";
  const file = path.join(ROOT, p);
  try {
    const s = await stat(file);
    if (!s.isFile()) throw new Error();
    res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "application/octet-stream" });
    res.end(await readFile(file));
  } catch {
    res.writeHead(404); res.end("not found");
  }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const BASE = `http://127.0.0.1:${server.address().port}`;

// --- Test-Helfer -------------------------------------------------------------
const results = [];
const ok = (name, detail = "") => results.push({ name, pass: true, detail });
const fail = (name, detail = "") => results.push({ name, pass: false, detail });
const check = (cond, name, detail = "") => (cond ? ok(name, detail) : fail(name, detail));

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || undefined,
});

try {
  // 1. Alle Seiten erreichbar, keine Konsolenfehler, keine fehlgeschlagenen Requests
  for (const page of ["/", "/impressum.html", "/datenschutz.html", "/404.html"]) {
    const p = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const errors = [], failed = [];
    p.on("pageerror", (e) => errors.push(e.message));
    p.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
    p.on("requestfailed", (r) => failed.push(r.url()));
    p.on("response", (r) => { if (r.status() >= 400 && r.url().startsWith(BASE)) failed.push(`${r.status()} ${r.url()}`); });
    const resp = await p.goto(BASE + page, { waitUntil: "networkidle" });
    check(resp.status() === 200, `Seite ${page} liefert HTTP 200`, `Status ${resp.status()}`);
    check(errors.length === 0, `Seite ${page}: keine JavaScript-/Konsolenfehler`, errors.join(" | "));
    const localFailed = failed.filter((u) => u.includes("127.0.0.1"));
    check(localFailed.length === 0, `Seite ${page}: alle lokalen Ressourcen geladen`, localFailed.join(" | "));
    const lang = await p.getAttribute("html", "lang");
    check(lang === "de", `Seite ${page}: Sprache ist Deutsch (lang="de")`, `lang=${lang}`);
    const title = await p.title();
    check(title.length > 10 && title.length <= 70, `Seite ${page}: Title gesetzt (${title.length} Zeichen)`, title);
    await p.close();
  }

  // 2. Startseite im Detail
  const p = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await p.goto(BASE + "/", { waitUntil: "networkidle" });

  // Bilder: alle geladen und mit alt-Text
  const imgs = await p.$$eval("img", (els) => els.map((i) => ({
    src: i.getAttribute("src"), alt: i.getAttribute("alt"), loaded: i.complete && i.naturalWidth > 0,
  })));
  // Lazy-Bilder nachladen: einmal durchscrollen
  const h = await p.evaluate(() => document.body.scrollHeight);
  for (let y = 0; y < h; y += 400) { await p.evaluate((y) => window.scrollTo(0, y), y); await p.waitForTimeout(150); }
  await p.waitForLoadState("networkidle");
  await p.waitForFunction(
    () => [...document.images].filter((i) => i.getAttribute("src")).every((i) => i.complete),
    null, { timeout: 15000 }
  ).catch(() => {});
  const imgs2 = (await p.$$eval("img", (els) => els.map((i) => ({
    src: i.getAttribute("src"), alt: i.getAttribute("alt"), loaded: i.complete && i.naturalWidth > 0,
  })))).filter((i) => i.src); // Lightbox-Platzhalter (leeres src) ausnehmen
  const broken = imgs2.filter((i) => !i.loaded).map((i) => i.src);
  check(broken.length === 0, `Alle ${imgs2.length} Bilder der Startseite werden geladen`, broken.join(", "));
  const noAlt = imgs2.filter((i) => i.alt === null || i.alt.trim() === "").map((i) => i.src);
  check(noAlt.length === 0, "Alle Bilder haben einen alt-Text", noAlt.join(", "));
  const heroBg = await p.evaluate(() => getComputedStyle(document.querySelector(".hero__bg")).backgroundImage);
  const heroResp = await p.request.get(BASE + "/assets/img/hero.jpg");
  check(heroBg.includes("hero.jpg") && heroResp.status() === 200, "Hero-Hintergrundbild vorhanden");

  // Interne Links: alle Anker und Seiten existieren
  const links = await p.$$eval("a[href]", (els) => els.map((a) => a.getAttribute("href")));
  const missingAnchors = [];
  for (const href of links.filter((l) => l.startsWith("#") && l.length > 1)) {
    if (!(await p.$(href))) missingAnchors.push(href);
  }
  check(missingAnchors.length === 0, "Alle Menü-/Ankerlinks zeigen auf vorhandene Abschnitte", missingAnchors.join(", "));
  const pageLinks = [...new Set(links.filter((l) => /^[a-z0-9-]+\.html$/i.test(l)))];
  const missingPages = [];
  for (const l of pageLinks) { if ((await p.request.get(BASE + "/" + l)).status() !== 200) missingPages.push(l); }
  check(missingPages.length === 0, `Verlinkte Unterseiten erreichbar (${pageLinks.join(", ")})`, missingPages.join(", "));
  const telMail = links.filter((l) => l.startsWith("tel:") || l.startsWith("mailto:"));
  check(telMail.some((l) => l.includes("+421952566014")) && telMail.some((l) => l.includes("info@sxworkforce.de")),
    "Telefon- und E-Mail-Links korrekt");

  // Pflichtinhalte
  const text = await p.evaluate(() => document.body.textContent);
  for (const must of ["Elektroinstallationen", "HLS-Arbeiten", "Trockenbauarbeiten", "Gerüstbauarbeiten", "Komplette Bauarbeiten",
    "Luca Schulz", "Peter Krško", "Büro & Recruiting", "Fuhrpark", "Impressum", "Datenschutz", "info@sxworkforce.de", "+421 952 566 014", "www.sxworkforce.de"]) {
    check(text.includes(must), `Inhalt vorhanden: „${must}“`);
  }
  const brandImgs = imgs2.filter((i) => /hero|service-|project-(site|team|geruest)|team-|fleet|van|truck/.test(i.src)).length;
  check(brandImgs >= 12, `Fotos mit SX Workforce Branding eingebunden (${brandImgs})`);

  // Galerie + Lightbox
  const figures = await p.$$(".gallery figure");
  check(figures.length >= 10, `Projektgalerie enthält ${figures.length} Fotos`);
  await figures[0].scrollIntoViewIfNeeded();
  await figures[0].click();
  await p.waitForTimeout(200);
  const lbOpen = await p.evaluate(() => document.querySelector(".lightbox").classList.contains("is-open"));
  const lbSrc = await p.evaluate(() => document.querySelector(".lightbox img").getAttribute("src"));
  check(lbOpen && lbSrc && lbSrc.length > 0, "Lightbox öffnet sich beim Klick auf ein Galeriebild", lbSrc);
  await p.keyboard.press("Escape");
  await p.waitForTimeout(100);
  check(!(await p.evaluate(() => document.querySelector(".lightbox").classList.contains("is-open"))), "Lightbox schließt mit Escape");

  // Cookie-Banner
  await p.evaluate(() => localStorage.removeItem("sx-cookie-consent"));
  await p.reload({ waitUntil: "networkidle" });
  check(await p.isVisible(".cookie"), "Cookie-Hinweis wird beim ersten Besuch angezeigt");
  await p.click('.cookie [data-consent="necessary"]');
  await p.waitForTimeout(100);
  check(!(await p.isVisible(".cookie")), "Cookie-Hinweis verschwindet nach Klick");
  await p.reload({ waitUntil: "networkidle" });
  check(!(await p.isVisible(".cookie")), "Cookie-Auswahl wird gespeichert (kein erneutes Anzeigen)");

  // Formular: Pflichtfelder + mailto
  await p.goto(BASE + "/#kontakt", { waitUntil: "networkidle" });
  const requiredCount = await p.$$eval("#kontaktformular [required]", (els) => els.length);
  check(requiredCount >= 4, `Formular hat Pflichtfelder (${requiredCount})`);
  await p.fill("#f-name", "Max Mustermann");
  await p.fill("#f-email", "max@beispiel.de");
  await p.fill("#f-text", "Testanfrage");
  await p.check("#kontaktformular .consent input");
  await p.click("#kontaktformular button[type=submit]");
  await p.waitForTimeout(300);
  const navTarget = await p.evaluate(() => document.querySelector("#kontaktformular").dataset.lastMailto);
  check(typeof navTarget === "string" && navTarget.startsWith("mailto:info@sxworkforce.de") && navTarget.includes("Mustermann"),
    "Formular erzeugt korrekte mailto-Anfrage mit eingegebenen Daten", String(navTarget).slice(0, 80));
  check(await p.isVisible("#kontaktformular .form__success"), "Erfolgsmeldung nach dem Absenden sichtbar");
  await p.close();

  // 3. Mobile Ansicht
  const m = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await m.goto(BASE + "/", { waitUntil: "networkidle" });
  const sw = await m.evaluate(() => document.documentElement.scrollWidth);
  check(sw <= 390, "Mobil: kein horizontales Scrollen", `scrollWidth=${sw}`);
  check(await m.isVisible(".nav-toggle"), "Mobil: Menü-Button sichtbar");
  check(!(await m.isVisible(".nav")), "Mobil: Menü standardmäßig geschlossen");
  await m.click(".nav-toggle");
  await m.waitForTimeout(150);
  check(await m.isVisible(".nav"), "Mobil: Menü öffnet sich per Klick");
  await m.click('.nav a[href="#leistungen"]');
  await m.waitForTimeout(400);
  check(!(await m.isVisible(".nav")), "Mobil: Menü schließt nach Linkklick");
  const scrolled = await m.evaluate(() => window.scrollY);
  check(scrolled > 200, "Mobil: Ankerlink scrollt zum Abschnitt", `scrollY=${scrolled}`);
  const viewport = await m.$eval('meta[name="viewport"]', (e) => e.content);
  check(viewport.includes("width=device-width"), "Viewport-Meta für Mobilgeräte gesetzt");
  await m.close();

  // 4. Desktop-Layout: keine Überlappung / kein horizontales Scrollen
  for (const w of [1920, 1440, 1024, 768]) {
    const d = await browser.newPage({ viewport: { width: w, height: 900 } });
    await d.goto(BASE + "/", { waitUntil: "networkidle" });
    const s = await d.evaluate(() => document.documentElement.scrollWidth);
    check(s <= w, `Breite ${w}px: kein horizontales Scrollen`, `scrollWidth=${s}`);
    await d.close();
  }

  // 5. Hosting-Dateien
  for (const f of ["/robots.txt", "/sitemap.xml", "/favicon.ico", "/404.html", "/assets/css/style.css", "/assets/js/main.js"]) {
    const r = await (await browser.newContext()).request.get(BASE + f);
    check(r.status() === 200, `Datei vorhanden: ${f}`);
  }
  const ht = await readFile(path.join(ROOT, ".htaccess"), "utf8");
  check(ht.includes("ErrorDocument 404") && ht.includes("RewriteEngine On"), ".htaccess mit HTTPS-Umleitung und 404-Seite vorhanden");
  const html = await readFile(path.join(ROOT, "index.html"), "utf8");
  check(/<link rel="canonical" href="https:\/\/www\.sxworkforce\.de\/">/.test(html), "Canonical-URL gesetzt");
  check(/<meta name="description"/.test(html) && /og:title/.test(html), "SEO-Meta (description, Open Graph) gesetzt");
  const tags = html.match(/<(div|section|article|figure|ul|li|form|header|footer|nav|main|a|p|h[1-6]|span|button|label|select|textarea)\b[^>]*>/g).length;
  const closing = html.match(/<\/(div|section|article|figure|ul|li|form|header|footer|nav|main|a|p|h[1-6]|span|button|label|select|textarea)>/g).length;
  check(tags === closing, `HTML: öffnende und schließende Tags ausgeglichen (${tags}/${closing})`);
} finally {
  await browser.close();
  server.close();
}

// --- Ergebnis ----------------------------------------------------------------
const passed = results.filter((r) => r.pass).length;
const failed = results.filter((r) => !r.pass);
for (const r of results) console.log(`${r.pass ? "✔" : "✘"} ${r.name}${r.detail && !r.pass ? `  →  ${r.detail}` : ""}`);
console.log(`\n${passed}/${results.length} Prüfungen bestanden${failed.length ? `, ${failed.length} fehlgeschlagen` : ""}.`);
process.exit(failed.length ? 1 : 0);
