/* Konfigurácia frontendu. Po vytvorení Supabase projektu doplňte URL a publishable key
   (Supabase > Project Settings > API). Kým sú prázdne, stránka zobrazuje demo obsah. */
window.NP_CONFIG = {
  supabaseUrl: '',
  supabaseKey: '',
  siteUrl: 'https://nazovportalu.sk',
  photoBucket: 'listing-photos',      /* verejný: len schválené fotky */
  uploadBucket: 'listing-uploads',    /* privátny: nahrávanie, kým moderátor neschváli */
  /* Priame stiahnutie Android aplikácie: version.json nesie verziu, odkaz a SHA-256.
     Ak APK hostujete inde (napr. GitHub Releases), zmeňte pole "apk" vo version.json. */
  appVersionUrl: '/downloads/version.json',
  appPageUrl: '/aplikacia.html'
};
