'use client';
/** Alt bilgideki "Çerez tercihlerim": bandı yeniden açar, böylece onay her zaman geri alınabilir */
export function CerezTercihButonu() {
  return <button type="button" className="metin-btn" onClick={() => window.dispatchEvent(new Event('ms-cerez-tercih'))}>Çerez tercihlerim</button>;
}
