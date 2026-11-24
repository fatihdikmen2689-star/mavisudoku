/**
 * Bulmaca üretici.
 * 1) Rastgele tam bir ızgara oluşturur.
 * 2) Hücreleri (9×9'da simetrik çiftler hâlinde) rastgele sırayla siler; her silmeden sonra
 *    bulmacanın hâlâ TEK çözümlü olduğunu kontrol eder.
 * 3) Ortaya çıkan bulmacayı insan teknikleriyle derecelendirip seviyesini belirler.
 */

import { rastgeleTamIzgara, tekCozumluMu } from './cozucu.ts';
import { tohumluRastgele, karistir } from './rastgele.ts';
import { zorlukAnalizi } from './zorluk.ts';
import { doluSayisi, izgaraMetni } from './izgara.ts';
import type { Izgara, Boyut } from './izgara.ts';
import type { SeviyeId } from './seviyeler.ts';
import type { ZorlukSonucu } from './zorluk.ts';

export interface Bulmaca {
  /** Üretimde kullanılan tohum: aynı tohum ve ayar aynı bulmacayı verir */
  tohum: number;
  seviye: SeviyeId;
  boyut: Boyut;
  /** Başlangıç ızgarası, satır satır; 0 = boş */
  bulmaca: string;
  /** Tek çözüm */
  cozum: string;
  ipucuSayisi: number;
  analiz: ZorlukSonucu;
}

export interface UretimAyari {
  boyut: Boyut;
  tohum: number;
  /** Bu sayıya inince silmeyi durdurur; verilmezse mümkün olan en aza iner */
  hedefIpucu?: number;
  /** 9×9'da merkeze göre simetrik silme (görsel olarak daha dengeli bulmacalar) */
  simetrik?: boolean;
}

/** Ham bulmaca üretir (henüz seviye kontrolü yok). */
export function hamBulmacaUret(ayar: UretimAyari): { bulmaca: Izgara; cozum: Izgara } {
  const rng = tohumluRastgele(ayar.tohum);
  const n = ayar.boyut;
  const cozum = rastgeleTamIzgara(n, rng);
  const g = cozum.slice();
  const simetrik = ayar.simetrik ?? n === 9;
  const hedef = ayar.hedefIpucu ?? 0;
  const sira = karistir(Array.from({ length: n * n }, (_, i) => i), rng);
  for (const i of sira) {
    if (doluSayisi(g) <= hedef) break;
    if (!g[i]) continue;
    const es = n * n - 1 - i;
    const silinecek = simetrik && es !== i && g[es] ? [i, es] : [i];
    if (doluSayisi(g) - silinecek.length < hedef) continue;
    const yedek = silinecek.map((k) => g[k]);
    for (const k of silinecek) g[k] = 0;
    if (!tekCozumluMu(g)) silinecek.forEach((k, x) => (g[k] = yedek[x]));
  }
  return { bulmaca: g, cozum };
}

/** Analiz sonucuna göre 9×9 bulmacanın seviyesi */
export function seviyeBelirle(analiz: ZorlukSonucu): SeviyeId {
  if (!analiz.cozuldu) return 'ekstrem';
  const d = analiz.enYuksekDerece;
  if (d <= 1) return analiz.ipucuSayisi >= 34 ? 'kolay' : 'orta';
  if (d === 2) return 'zor';
  if (d === 3) return 'uzman';
  return 'usta';
}

/** Seviyeye göre silme hedefi: kolay/orta bulmacalar fazla boşaltılmaz */
function hedefIpucu(seviye: SeviyeId, rng: () => number): number | undefined {
  switch (seviye) {
    case 'mini4': return 5 + Math.floor(rng() * 3); // 5–7
    case 'mini6': return 13 + Math.floor(rng() * 4); // 13–16
    case 'kolay': return 36 + Math.floor(rng() * 5); // 36–40
    case 'orta': return 28 + Math.floor(rng() * 5); // 28–32
    default: return undefined; // olabildiğince boşalt
  }
}

/**
 * İstenen seviyede bir bulmaca bulana kadar tohum tohum dener.
 * Döndürdüğü bulmacanın tohumu kayıtlıdır; aynı tohumla tekrar üretilebilir.
 */
export function bulmacaUret(seviye: SeviyeId, baslangicTohum: number, enFazlaDeneme = 400): Bulmaca | null {
  const boyut: Boyut = seviye === 'mini4' ? 4 : seviye === 'mini6' ? 6 : 9;
  for (let k = 0; k < enFazlaDeneme; k++) {
    const tohum = (baslangicTohum + k * 7919) >>> 0;
    const hedef = hedefIpucu(seviye, tohumluRastgele(tohum ^ 0x9e3779b9));
    const { bulmaca, cozum } = hamBulmacaUret({ boyut, tohum, hedefIpucu: hedef });
    const analiz = zorlukAnalizi(bulmaca);
    const bulunan: SeviyeId = boyut === 4 ? 'mini4' : boyut === 6 ? 'mini6' : seviyeBelirle(analiz);
    if (bulunan !== seviye) continue;
    if (boyut !== 9 && !analiz.cozuldu) continue; // Mini bulmacalar mantıkla çözülebilmeli
    return {
      tohum,
      seviye,
      boyut,
      bulmaca: izgaraMetni(bulmaca),
      cozum: izgaraMetni(cozum),
      ipucuSayisi: doluSayisi(bulmaca),
      analiz,
    };
  }
  return null;
}
