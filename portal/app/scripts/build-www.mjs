// Zostaví www/ z webového portálu (../). Rovnaký kód beží na webe aj v aplikácii,
// aplikácia ho len zabalí a pridá natívne pluginy. Dáta sú vždy v Supabase, nie v balíku.
import { cpSync, rmSync, mkdirSync, readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');      // portal/
const out = join(here, '..', 'www');

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
for (const name of readdirSync(root)) {
  if (['app', 'supabase', 'scripts', 'README.md', '.htaccess', 'robots.txt', 'sitemap.xml', 'node_modules'].includes(name)) continue;
  cpSync(join(root, name), join(out, name), { recursive: true });
}

// supabase-js z node_modules namiesto CDN (funguje offline, žiadna závislosť na treťom hoste)
const sbUmd = join(here, '..', 'node_modules', '@supabase', 'supabase-js', 'dist', 'umd', 'supabase.js');
if (existsSync(sbUmd)) {
  mkdirSync(join(out, 'vendor'), { recursive: true });
  cpSync(sbUmd, join(out, 'vendor', 'supabase.js'));
}
// Capacitor runtime + pluginy sa injektujú samé cez cap sync; tu len prepneme CDN -> lokálny súbor a označíme natívny build
for (const name of readdirSync(out).filter(f => f.endsWith('.html'))) {
  const p = join(out, name);
  let html = readFileSync(p, 'utf8');
  html = html.replace(/<script src="https:\/\/cdn\.jsdelivr\.net\/npm\/@supabase\/supabase-js@2[^"]*" defer><\/script>/, '<script src="/vendor/supabase.js" defer></script>');
  html = html.replace('<html lang="sk">', '<html lang="sk" data-native="1">');
  writeFileSync(p, html);
}
// service worker v natívnej appke netreba (Capacitor má vlastné cache); odstránime registráciu
const native = join(out, 'js', 'native.js');
if (existsSync(native)) {
  const pkg = JSON.parse(readFileSync(join(here, '..', 'package.json'), 'utf8'));
  writeFileSync(join(out, 'js', 'version.js'), `window.NP_APP_VERSION='${pkg.version}';`);
}
console.log('www/ zostavené z', root);
