/**
 * Taktik yazılarındaki örnek ızgaralar. Her şeklin iddiası (ör. "buraya yalnızca 7 gelir")
 * test/sekiller.test.ts tarafından doğrulanır; yanlış örnek yayına çıkmaz.
 */
export type Kontrol =
  | { tur: 'tekAday'; hucre: number; rakam: number }
  | { tur: 'gizliTekli'; hucre: number; rakam: number; birim: 'kutu' | 'satir' | 'sutun' }
  | { tur: 'isaretleme'; kutu: number; rakam: number }
  | { tur: 'ciplakCift'; hucreler: [number, number] }
  | { tur: 'xWing'; rakam: number; satirlar: [number, number]; sutunlar: [number, number] };

export type Sekil = {
  rakamlar: Record<number, number>;
  adaylar?: Record<number, number[]>;
  silinen?: Record<number, number[]>;
  cevap?: Record<number, number>;
  bolge?: number[];
  anahtar?: number[];
  aciklama: string;
  kontrol?: Kontrol;
};

const h = (r: number, c: number) => r * 9 + c;
const yerles = (liste: [number, number, number][]) => Object.fromEntries(liste.map(([r, c, v]) => [h(r, c), v]));
export const satirHucreleri = (r: number) => Array.from({ length: 9 }, (_, c) => h(r, c));
export const sutunHucreleri = (c: number) => Array.from({ length: 9 }, (_, r) => h(r, c));
export const kutuHucreleri = (k: number) => Array.from({ length: 9 }, (_, i) => h(Math.floor(k / 3) * 3 + Math.floor(i / 3), (k % 3) * 3 + (i % 3)));

/** Kuralları göstermek için geçerli, tam dolu bir ızgara */
export const TAM_IZGARA: number[] = Array.from({ length: 81 }, (_, i) => {
  const r = Math.floor(i / 9), c = i % 9;
  return ((r * 3 + Math.floor(r / 3) + c) % 9) + 1;
});

export const SEKILLER = {
  tekAday: {
    rakamlar: yerles([[4, 0, 1], [4, 2, 3], [4, 8, 9], [0, 4, 2], [7, 4, 6], [3, 3, 4], [5, 5, 5], [3, 5, 8]]),
    cevap: { [h(4, 4)]: 7 },
    bolge: [...satirHucreleri(4), ...sutunHucreleri(4), ...kutuHucreleri(4)],
    aciklama: 'Ortadaki hücrenin satırında 1, 3, 9; sütununda 2, 6; kutusunda 4, 5, 8 var. Geriye yalnızca 7 kalıyor.',
    kontrol: { tur: 'tekAday', hucre: h(4, 4), rakam: 7 },
  },
  gizliTekli: {
    rakamlar: yerles([[1, 5, 5], [2, 7, 5], [6, 0, 5], [4, 1, 5], [1, 1, 3], [2, 2, 8], [2, 0, 1]]),
    cevap: { [h(0, 2)]: 5 },
    bolge: kutuHucreleri(0),
    anahtar: [h(1, 5), h(2, 7), h(6, 0), h(4, 1)],
    aciklama: 'Turuncu 5\'ler sol üst kutudaki iki satırı ve iki sütunu kapatıyor. Kutuda 5 için tek boş yer kalıyor.',
    kontrol: { tur: 'gizliTekli', hucre: h(0, 2), rakam: 5, birim: 'kutu' },
  },
  isaretleme: {
    rakamlar: yerles([[3, 3, 1], [3, 4, 2], [3, 5, 3], [5, 3, 7], [5, 4, 8], [5, 5, 9]]),
    adaylar: { [h(4, 3)]: [4, 5, 6], [h(4, 4)]: [4, 6], [h(4, 5)]: [5, 6], [h(4, 0)]: [2, 6], [h(4, 7)]: [6, 8] },
    silinen: { [h(4, 0)]: [6], [h(4, 7)]: [6] },
    bolge: kutuHucreleri(4),
    anahtar: [h(4, 3), h(4, 4), h(4, 5)],
    aciklama: 'Ortadaki kutuda 6 yalnızca orta satıra gelebilir. O halde aynı satırın kutu dışındaki hücrelerinden 6 adayı silinir.',
    kontrol: { tur: 'isaretleme', kutu: 4, rakam: 6 },
  },
  ciplakCift: {
    rakamlar: yerles([[0, 0, 1], [0, 2, 3], [0, 4, 5], [0, 6, 6], [0, 8, 8], [4, 1, 4], [7, 1, 9], [3, 5, 4], [6, 5, 9], [5, 3, 9], [8, 7, 4]]),
    adaylar: { [h(0, 1)]: [2, 7], [h(0, 5)]: [2, 7], [h(0, 3)]: [2, 4, 7], [h(0, 7)]: [2, 7, 9] },
    silinen: { [h(0, 3)]: [2, 7], [h(0, 7)]: [2, 7] },
    bolge: satirHucreleri(0),
    anahtar: [h(0, 1), h(0, 5)],
    aciklama: 'İki hücrede yalnızca 2 ve 7 olabilir. Bu iki rakam o iki hücreye kilitlenir; satırın diğer hücrelerinden silinir ve 4 ile 9 ortaya çıkar.',
    kontrol: { tur: 'ciplakCift', hucreler: [h(0, 1), h(0, 5)] },
  },
  xWing: {
    rakamlar: yerles([
      [1, 0, 1], [1, 1, 2], [1, 3, 4], [1, 4, 5], [1, 5, 6], [1, 7, 7], [1, 8, 8],
      [5, 0, 2], [5, 1, 1], [5, 3, 5], [5, 4, 4], [5, 5, 7], [5, 7, 8], [5, 8, 6],
    ]),
    adaylar: { [h(1, 2)]: [3], [h(1, 6)]: [3], [h(5, 2)]: [3], [h(5, 6)]: [3], [h(3, 2)]: [3], [h(7, 6)]: [3], [h(8, 2)]: [3], [h(7, 3)]: [3] },
    silinen: { [h(3, 2)]: [3], [h(7, 6)]: [3], [h(8, 2)]: [3] },
    bolge: [...sutunHucreleri(2), ...sutunHucreleri(6)],
    anahtar: [h(1, 2), h(1, 6), h(5, 2), h(5, 6)],
    aciklama: 'İki satırda 3 yalnızca aynı iki sütuna gelebiliyor (turuncu köşeler). Bu sütunlardaki 3\'ler bu satırlara ayrılmış olur; sütunların geri kalanından 3 silinir.',
    kontrol: { tur: 'xWing', rakam: 3, satirlar: [1, 5], sutunlar: [2, 6] },
  },
} satisfies Record<string, Sekil>;

export type SekilId = keyof typeof SEKILLER;
