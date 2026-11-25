/**
 * Reklam ayarları. Değerler derleme sırasında ortam değişkenlerinden okunur (AdSense onayı gelince girilir):
 *   NEXT_PUBLIC_ADSENSE_ISTEMCI      ca-pub-1234567890123456
 *   NEXT_PUBLIC_ADSENSE_SLOT_ICERIK  sayfa içi (yatay) reklam biriminin numarası
 *   NEXT_PUBLIC_ADSENSE_SLOT_YAN     yan sütun (dikey) reklam biriminin numarası
 * Tanımlı değilse geliştirmede "Reklam alanı" kutusu görünür, yayında hiçbir şey görünmez.
 */
export const ADSENSE_ISTEMCI = process.env.NEXT_PUBLIC_ADSENSE_ISTEMCI ?? '';
export const REKLAM_SLOT = {
  icerik: process.env.NEXT_PUBLIC_ADSENSE_SLOT_ICERIK ?? '',
  yan: process.env.NEXT_PUBLIC_ADSENSE_SLOT_YAN ?? '',
} as const;
export type ReklamYeri = keyof typeof REKLAM_SLOT;

/**
 * Sayfa açılırken (reklam betiğinden önce) çalışır:
 * - Çerez tercihi yapılmadıysa reklam isteği bekletilir (pauseAdRequests).
 * - "Yalnızca gerekli" seçildiyse kişiselleştirilmemiş reklam istenir.
 * - Google onay modu sinyalleri seçime göre ayarlanır.
 */
export const ONAY_BETIGI = `(function(){var c=document.cookie,t=/(?:^|; )ms_cerez=tumu/.test(c),s=/(?:^|; )ms_cerez=/.test(c),a=window.adsbygoogle=window.adsbygoogle||[];
a.pauseAdRequests=s?0:1;a.requestNonPersonalizedAds=t?0:1;
window.dataLayer=window.dataLayer||[];window.gtag=window.gtag||function(){dataLayer.push(arguments)};
var d=t?'granted':'denied';gtag('consent','default',{ad_storage:d,ad_user_data:d,ad_personalization:d,analytics_storage:d});})();`;

/** Çerez bandında seçim yapılınca çağrılır */
export function reklamOnayiniUygula(secim: 'gerekli' | 'tumu'): void {
  const w = window as unknown as { adsbygoogle?: { pauseAdRequests?: number; requestNonPersonalizedAds?: number }; gtag?: (...a: unknown[]) => void };
  const d = secim === 'tumu' ? 'granted' : 'denied';
  w.gtag?.('consent', 'update', { ad_storage: d, ad_user_data: d, ad_personalization: d, analytics_storage: d });
  if (w.adsbygoogle) {
    w.adsbygoogle.requestNonPersonalizedAds = secim === 'tumu' ? 0 : 1;
    w.adsbygoogle.pauseAdRequests = 0;
  }
}
