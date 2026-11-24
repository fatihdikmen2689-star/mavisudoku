/**
 * Zorluk derecelendirme: bulmacayı bir insanın kullandığı tekniklerle çözmeye çalışır.
 * Her adımda en kolay işe yarayan teknik denenir; bulmacanın zorluğu,
 * çözüm için GEREKEN en zor tekniğe göre belirlenir.
 * Hiçbir teknikle çözülemeyen (tahmin gerektiren) bulmacalar "ekstrem" sayılır.
 */

import { duzen, boyutOf, bitSay, bittenRakam, doluSayisi } from './izgara.ts';
import type { Izgara, Duzen } from './izgara.ts';

export type Teknik =
  | 'tekAday'
  | 'gizliTekli'
  | 'isaretleme'
  | 'ciplakCift'
  | 'gizliCift'
  | 'ciplakUclu'
  | 'xWing'
  | 'xyWing'
  | 'swordfish';

/** Tekniklerin zorluk puanı (1 = en kolay) */
export const TEKNIK_DERECESI: Record<Teknik, number> = {
  tekAday: 1,
  gizliTekli: 1,
  isaretleme: 2,
  ciplakCift: 2,
  gizliCift: 3,
  ciplakUclu: 3,
  xWing: 4,
  xyWing: 4,
  swordfish: 5,
};

/** Türkçe teknik adları (taktik yazılarıyla aynı) */
export const TEKNIK_ADI: Record<Teknik, string> = {
  tekAday: 'Tek aday',
  gizliTekli: 'Gizli tekli',
  isaretleme: 'İşaretleme (kilitli aday)',
  ciplakCift: 'Aday çifti',
  gizliCift: 'Gizli çift',
  ciplakUclu: 'Aday üçlüsü',
  xWing: 'X-Wing',
  xyWing: 'XY-Wing',
  swordfish: 'Swordfish',
};

export interface ZorlukSonucu {
  cozuldu: boolean;
  /** Gereken en yüksek teknik derecesi (0 = hiç adım yok) */
  enYuksekDerece: number;
  /** Teknik başına kullanım sayısı */
  kullanilan: Partial<Record<Teknik, number>>;
  /** Başlangıçtaki dolu hücre sayısı */
  ipucuSayisi: number;
  /** Tekniklerin ulaştığı son ızgara (çözüldüyse tam çözüm) */
  sonIzgara: Izgara;
}

interface Cozum {
  d: Duzen;
  g: Izgara;
  aday: number[];
}

function kur(g0: Izgara): Cozum {
  const d = duzen(boyutOf(g0));
  const g = g0.slice();
  const aday = new Array(g.length).fill(0);
  for (let i = 0; i < g.length; i++) {
    if (g[i]) continue;
    let m = d.tumAdaylar;
    for (const j of d.komsular[i]) if (g[j]) m &= ~(1 << (g[j] - 1));
    aday[i] = m;
  }
  return { d, g, aday };
}

function yerlestir(s: Cozum, i: number, v: number): void {
  s.g[i] = v;
  s.aday[i] = 0;
  const bit = 1 << (v - 1);
  for (const j of s.d.komsular[i]) s.aday[j] &= ~bit;
}

/** Hücreden aday siler; gerçekten bir şey sildiyse true */
function sil(s: Cozum, i: number, maske: number): boolean {
  if (s.aday[i] & maske) {
    s.aday[i] &= ~maske;
    return true;
  }
  return false;
}

function tekAday(s: Cozum): boolean {
  for (let i = 0; i < s.g.length; i++) {
    if (!s.g[i] && bitSay(s.aday[i]) === 1) {
      yerlestir(s, i, bittenRakam(s.aday[i]));
      return true;
    }
  }
  return false;
}

function gizliTekli(s: Cozum): boolean {
  const n = s.d.n;
  for (const birim of s.d.birimler) {
    for (let v = 1; v <= n; v++) {
      const bit = 1 << (v - 1);
      let yer = -1;
      let say = 0;
      for (const i of birim) {
        if (s.aday[i] & bit) {
          say++;
          yer = i;
          if (say > 1) break;
        }
      }
      if (say === 1) {
        yerlestir(s, yer, v);
        return true;
      }
    }
  }
  return false;
}

/** Kilitli adaylar: kutudaki aday tek satır/sütundaysa o satır/sütunun geri kalanından silinir (ve tersi). */
function isaretleme(s: Cozum): boolean {
  const { n, birimler, satirOf, sutunOf, kutuOf } = s.d;
  for (let v = 1; v <= n; v++) {
    const bit = 1 << (v - 1);
    // Kutu -> satır/sütun
    for (let b = 0; b < n; b++) {
      const yerler = birimler[2 * n + b].filter((i) => s.aday[i] & bit);
      if (yerler.length < 2) continue;
      const r = satirOf[yerler[0]];
      if (yerler.every((i) => satirOf[i] === r)) {
        let degisti = false;
        for (const i of birimler[r]) if (kutuOf[i] !== b) degisti = sil(s, i, bit) || degisti;
        if (degisti) return true;
      }
      const c = sutunOf[yerler[0]];
      if (yerler.every((i) => sutunOf[i] === c)) {
        let degisti = false;
        for (const i of birimler[n + c]) if (kutuOf[i] !== b) degisti = sil(s, i, bit) || degisti;
        if (degisti) return true;
      }
    }
    // Satır/sütun -> kutu
    for (let u = 0; u < 2 * n; u++) {
      const yerler = birimler[u].filter((i) => s.aday[i] & bit);
      if (yerler.length < 2) continue;
      const b = kutuOf[yerler[0]];
      if (yerler.every((i) => kutuOf[i] === b)) {
        let degisti = false;
        for (const i of birimler[2 * n + b]) if (!birimler[u].includes(i)) degisti = sil(s, i, bit) || degisti;
        if (degisti) return true;
      }
    }
  }
  return false;
}

/** Çıplak k'lı: bir birimde k hücrenin adaylarının birleşimi k rakamsa, bu rakamlar birimin diğer hücrelerinden silinir. */
function ciplakGrup(s: Cozum, k: number): boolean {
  for (const birim of s.d.birimler) {
    const bos = birim.filter((i) => s.aday[i] && bitSay(s.aday[i]) <= k);
    const secim: number[] = [];
    const dene = (bas: number, birlesim: number): boolean => {
      if (secim.length === k) {
        if (bitSay(birlesim) !== k) return false;
        let degisti = false;
        for (const i of birim) if (s.aday[i] && !secim.includes(i)) degisti = sil(s, i, birlesim) || degisti;
        return degisti;
      }
      for (let x = bas; x < bos.length; x++) {
        const yeni = birlesim | s.aday[bos[x]];
        if (bitSay(yeni) > k) continue;
        secim.push(bos[x]);
        if (dene(x + 1, yeni)) return true;
        secim.pop();
      }
      return false;
    };
    if (dene(0, 0)) return true;
  }
  return false;
}

/** Gizli çift: iki rakam bir birimde yalnızca aynı iki hücrede geçiyorsa, o hücrelerin diğer adayları silinir. */
function gizliCift(s: Cozum): boolean {
  const n = s.d.n;
  for (const birim of s.d.birimler) {
    const yerler: number[][] = [];
    for (let v = 1; v <= n; v++) yerler.push(birim.filter((i) => s.aday[i] & (1 << (v - 1))));
    for (let a = 0; a < n; a++) {
      if (yerler[a].length !== 2) continue;
      for (let b = a + 1; b < n; b++) {
        if (yerler[b].length !== 2) continue;
        if (yerler[a][0] !== yerler[b][0] || yerler[a][1] !== yerler[b][1]) continue;
        const tut = (1 << a) | (1 << b);
        let degisti = false;
        for (const i of yerler[a]) degisti = sil(s, i, ~tut & s.d.tumAdaylar) || degisti;
        if (degisti) return true;
      }
    }
  }
  return false;
}

/** Balık deseni (X-Wing için boyut 2, Swordfish için 3). Hem satır hem sütun yönünde denenir. */
function balik(s: Cozum, boyut: number): boolean {
  const { n, birimler } = s.d;
  for (let v = 1; v <= n; v++) {
    const bit = 1 << (v - 1);
    for (const yon of [0, 1]) {
      // yon 0: tabanlar satır, örtüler sütun; yon 1: tersi
      const tabanlar: { u: number; pozisyonlar: number }[] = [];
      for (let u = 0; u < n; u++) {
        const birim = birimler[yon === 0 ? u : n + u];
        let poz = 0;
        let say = 0;
        for (let k = 0; k < n; k++) {
          if (s.aday[birim[k]] & bit) {
            poz |= 1 << k;
            say++;
          }
        }
        if (say >= 2 && say <= boyut) tabanlar.push({ u, pozisyonlar: poz });
      }
      const secim: number[] = [];
      const dene = (bas: number, birlesim: number): boolean => {
        if (secim.length === boyut) {
          if (bitSay(birlesim) !== boyut) return false;
          let degisti = false;
          for (let k = 0; k < n; k++) {
            if (!(birlesim & (1 << k))) continue;
            const ortu = birimler[yon === 0 ? n + k : k];
            for (let u = 0; u < n; u++) {
              if (secim.includes(u)) continue;
              degisti = sil(s, ortu[u], bit) || degisti;
            }
          }
          return degisti;
        }
        for (let x = bas; x < tabanlar.length; x++) {
          const yeni = birlesim | tabanlar[x].pozisyonlar;
          if (bitSay(yeni) > boyut) continue;
          secim.push(tabanlar[x].u);
          if (dene(x + 1, yeni)) return true;
          secim.pop();
        }
        return false;
      };
      if (dene(0, 0)) return true;
    }
  }
  return false;
}

/** XY-Wing: {a,b} pivotu, {a,c} ve {b,c} kıskaçları; iki kıskacı da gören hücrelerden c silinir. */
function xyWing(s: Cozum): boolean {
  const { komsular } = s.d;
  const iki = (i: number) => s.aday[i] !== 0 && bitSay(s.aday[i]) === 2;
  for (let p = 0; p < s.g.length; p++) {
    if (!iki(p)) continue;
    const pm = s.aday[p];
    const kiskac = komsular[p].filter((i) => iki(i) && bitSay(s.aday[i] & pm) === 1);
    for (let x = 0; x < kiskac.length; x++) {
      for (let y = x + 1; y < kiskac.length; y++) {
        const a = kiskac[x], b = kiskac[y];
        const ma = s.aday[a], mb = s.aday[b];
        if ((ma & pm) === (mb & pm)) continue;
        const c = ma & mb & ~pm;
        if (bitSay(c) !== 1) continue;
        if ((ma | mb | pm) !== (pm | c)) continue;
        let degisti = false;
        for (const i of komsular[a]) {
          if (i === b || i === p || !komsular[b].includes(i)) continue;
          degisti = sil(s, i, c) || degisti;
        }
        if (degisti) return true;
      }
    }
  }
  return false;
}

const SIRA: { ad: Teknik; uygula: (s: Cozum) => boolean }[] = [
  { ad: 'tekAday', uygula: tekAday },
  { ad: 'gizliTekli', uygula: gizliTekli },
  { ad: 'isaretleme', uygula: isaretleme },
  { ad: 'ciplakCift', uygula: (s) => ciplakGrup(s, 2) },
  { ad: 'gizliCift', uygula: gizliCift },
  { ad: 'ciplakUclu', uygula: (s) => ciplakGrup(s, 3) },
  { ad: 'xWing', uygula: (s) => balik(s, 2) },
  { ad: 'xyWing', uygula: xyWing },
  { ad: 'swordfish', uygula: (s) => balik(s, 3) },
];

/** Bulmacayı insan teknikleriyle çözer ve hangi tekniklerin gerektiğini raporlar. */
export function zorlukAnalizi(bulmaca: Izgara): ZorlukSonucu {
  const s = kur(bulmaca);
  const kullanilan: Partial<Record<Teknik, number>> = {};
  let enYuksek = 0;
  for (;;) {
    if (s.g.every((v) => v !== 0)) {
      return { cozuldu: true, enYuksekDerece: enYuksek, kullanilan, ipucuSayisi: doluSayisi(bulmaca), sonIzgara: s.g };
    }
    let ilerledi = false;
    for (const t of SIRA) {
      if (t.uygula(s)) {
        kullanilan[t.ad] = (kullanilan[t.ad] ?? 0) + 1;
        enYuksek = Math.max(enYuksek, TEKNIK_DERECESI[t.ad]);
        ilerledi = true;
        break;
      }
    }
    if (!ilerledi) {
      return { cozuldu: false, enYuksekDerece: enYuksek, kullanilan, ipucuSayisi: doluSayisi(bulmaca), sonIzgara: s.g };
    }
  }
}
