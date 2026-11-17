// Označí, že skript beží – až potom sa prvky pred zobrazením skryjú a animujú.
// Bez skriptu ostáva celá stránka viditeľná.
document.documentElement.classList.add('js')

// Kto si pri minulej návšteve vybral iný jazyk, dostane ho aj na úvodnej (slovenskej) adrese.
// Výnimkou je príchod z niektorej jazykovej verzie tejto stránky: to je voľba slovenčiny
// v prepínači jazykov, a tá musí fungovať vždy.
;(function () {
  try {
    var want = window.localStorage.getItem('jh:lang')
    if (document.documentElement.lang !== 'sk' || !/^(en|hr|de|hu)$/.test(want || '')) return
    var home = new URL('.', document.currentScript.src).href
    var from = document.referrer.split(/[?#]/)[0]
    if (from.indexOf(home) === 0 && /^((en|hr|de|hu)\/)?(index\.html)?$/.test(from.slice(home.length))) return
    window.location.replace(home + want + '/' + window.location.search + window.location.hash)
  } catch {
    /* bez úložiska prehliadača ostáva stránka v slovenčine */
  }
})()
