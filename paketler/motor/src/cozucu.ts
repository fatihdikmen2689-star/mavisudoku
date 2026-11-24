/**
 * Hızlı geri izlemeli (backtracking) çözücü.
 * Bit maskeleri ve "en az aday" seçimiyle 9×9 bulmacaları milisaniyeler içinde çözer.
 * Bulmacanın tek çözümü olup olmadığını kontrol etmek için çözümleri sayar.
 */

import { duzen, boyutOf, bitSay, bittenRakam } from './izgara.ts';
import type { Izgara } from './izgara.ts';
import type { Rastgele } from './rastgele.ts';

interface Durum {
  g: Izgara;
  satir: number[];
  sutun: number[];
  kutu: number[];
}

function durumKur(g: Izgara): Durum | null {
  const n = boyutOf(g);
  const d = duzen(n);
  const s: Durum = { g: g.slice(), satir: new Array(n).fill(0), sutun: new Array(n).fill(0), kutu: new Array(n).fill(0) };
  for (let i = 0; i < g.length; i++) {
    const v = g[i];
    if (!v) continue;
    const bit = 1 << (v - 1);
    const r = d.satirOf[i], c = d.sutunOf[i], b = d.kutuOf[i];
    if ((s.satir[r] | s.sutun[c] | s.kutu[b]) & bit) return null; // çakışma
    s.satir[r] |= bit;
    s.sutun[c] |= bit;
    s.kutu[b] |= bit;
  }
  return s;
}

/**
 * Çözümleri en fazla `sinir` adede kadar sayar.
 * 0 = çözüm yok, 1 = tek çözüm, sinir = birden fazla (sayma durdurulur).
 * `rng` verilirse rakamları rastgele sırayla dener (tam ızgara üretimi için).
 */
function ara(s: Durum, sinir: number, rng: Rastgele | null, ilkCozum: { g: Izgara | null }): number {
  const n = boyutOf(s.g);
  const d = duzen(n);
  // En az adaylı boş hücreyi bul
  let enIyi = -1;
  let enIyiMaske = 0;
  let enAz = 99;
  for (let i = 0; i < s.g.length; i++) {
    if (s.g[i]) continue;
    const maske = d.tumAdaylar & ~(s.satir[d.satirOf[i]] | s.sutun[d.sutunOf[i]] | s.kutu[d.kutuOf[i]]);
    const k = bitSay(maske);
    if (k === 0) return 0;
    if (k < enAz) {
      enAz = k;
      enIyi = i;
      enIyiMaske = maske;
      if (k === 1) break;
    }
  }
  if (enIyi === -1) {
    if (!ilkCozum.g) ilkCozum.g = s.g.slice();
    return 1;
  }
  const rakamlar: number[] = [];
  for (let m = enIyiMaske; m; m &= m - 1) rakamlar.push(bittenRakam(m & -m));
  if (rng) {
    for (let i = rakamlar.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [rakamlar[i], rakamlar[j]] = [rakamlar[j], rakamlar[i]];
    }
  }
  const r = d.satirOf[enIyi], c = d.sutunOf[enIyi], b = d.kutuOf[enIyi];
  let toplam = 0;
  for (const v of rakamlar) {
    const bit = 1 << (v - 1);
    s.g[enIyi] = v;
    s.satir[r] |= bit;
    s.sutun[c] |= bit;
    s.kutu[b] |= bit;
    toplam += ara(s, sinir - toplam, rng, ilkCozum);
    s.g[enIyi] = 0;
    s.satir[r] &= ~bit;
    s.sutun[c] &= ~bit;
    s.kutu[b] &= ~bit;
    if (toplam >= sinir) break;
  }
  return toplam;
}

/** Çözüm sayısı (en fazla `sinir`). Tek çözüm kontrolü için sinir = 2 yeterlidir. */
export function cozumSay(g: Izgara, sinir = 2): number {
  const s = durumKur(g);
  if (!s) return 0;
  return ara(s, sinir, null, { g: null });
}

/** Bulmacanın (varsa ilk bulunan) çözümünü döndürür. */
export function coz(g: Izgara): Izgara | null {
  const s = durumKur(g);
  if (!s) return null;
  const sonuc = { g: null as Izgara | null };
  ara(s, 1, null, sonuc);
  return sonuc.g;
}

/** Tek çözümlü mü? */
export function tekCozumluMu(g: Izgara): boolean {
  return cozumSay(g, 2) === 1;
}

/** Rastgele, tamamen dolu ve geçerli bir ızgara üretir. */
export function rastgeleTamIzgara(n: 4 | 6 | 9, rng: Rastgele): Izgara {
  const s = durumKur(new Array(n * n).fill(0));
  if (!s) throw new Error('beklenmeyen durum');
  const sonuc = { g: null as Izgara | null };
  ara(s, 1, rng, sonuc);
  if (!sonuc.g) throw new Error('Tam ızgara üretilemedi');
  return sonuc.g;
}
