// Téma sa nastaví pred prvým vykreslením, aby stránka nepreblikla.
try {
  var t = localStorage.getItem('jhcrm:theme')
  if (t === 'light' || t === 'dark') document.documentElement.setAttribute('data-theme', t)
} catch {
  // bez úložiska platí téma systému
}
