/**
 * Tam ekran (geçiş) reklamı: oyuncu sonucunu gördükten sonra "Sıradaki bulmaca"ya basınca, en fazla
 * her 3 çözümde bir ve aralarında en az 3 dakika. Oyun sırasında asla gösterilmez. Mini (çocuk)
 * seviyelerde gösterilmez.
 */
import { AdEventType, InterstitialAd } from 'react-native-google-mobile-ads';
import { BIRIM, GECIS_HER, GECIS_ARA_MS } from './ayar.ts';
import { reklamHazirMi } from './durum.ts';

let reklam: InterstitialAd | null = null;
let cozulen = 0;
let sonGosterim = 0;

function hazirla() {
  if (!reklamHazirMi() || reklam) return;
  reklam = InterstitialAd.createForAdRequest(BIRIM.gecis);
  reklam.addAdEventListener(AdEventType.CLOSED, () => { reklam = null; hazirla(); });
  reklam.addAdEventListener(AdEventType.ERROR, () => { reklam = null; });
  reklam.load();
}

/** Oyun ekranı açılınca çağrılır: reklam önceden yüklenir */
export function gecisHazirla(): void { hazirla(); }

let siraGeldi = false;

/** Bulmaca bitince çağrılır: yalnızca sayar, reklam göstermez */
export function bulmacaBitti(cocukSeviyesi: boolean): void {
  if (cocukSeviyesi) return;
  cozulen++;
  if (cozulen % GECIS_HER === 0) siraGeldi = true;
  hazirla();
}

/** "Sıradaki bulmaca"ya basılınca çağrılır; sırası geldiyse ve reklam yüklüyse gösterir */
export function siradakiyeGecerken(): void {
  if (!siraGeldi || Date.now() - sonGosterim < GECIS_ARA_MS || !reklam?.loaded) return;
  siraGeldi = false;
  sonGosterim = Date.now();
  reklam.show().catch(() => undefined);
}
