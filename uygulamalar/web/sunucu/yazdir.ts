import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PDFDocument, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { bulmacaUret } from '@mavisudoku/motor';
import { depoKoku } from './db.ts';

export type CocukBoyut = 4 | 6;
export interface YazdirAyari { boyut: CocukBoyut; sayfa: number; tohum: number }

const LACIVERT = rgb(11 / 255, 37 / 255, 69 / 255);
const MAVI = rgb(29 / 255, 95 / 255, 209 / 255);
const ACIK_MAVI = rgb(47 / 255, 123 / 255, 245 / 255);
const SOLUK = rgb(74 / 255, 90 / 255, 114 / 255);
const INCE = rgb(150 / 255, 168 / 255, 194 / 255);
const TURUNCU = rgb(242 / 255, 140 / 255, 40 / 255);

const A4 = { g: 595.28, y: 841.89 };
const KENAR = 40;
const SAYFA_BASI = { 4: 6, 6: 4 } as const;

let fontOnbellek: { normal: Buffer; kalin: Buffer } | null = null;
function fontlar() {
  if (!fontOnbellek) {
    const klasor = join(depoKoku(), 'uygulamalar', 'web', 'sunucu', 'yazitipi');
    fontOnbellek = {
      normal: readFileSync(/*turbopackIgnore: true*/ join(klasor, 'Nunito-600.ttf')),
      kalin: readFileSync(/*turbopackIgnore: true*/ join(klasor, 'Nunito-900.ttf')),
    };
  }
  return fontOnbellek;
}

export interface CocukBulmaca { bulmaca: string; cozum: string; ipucu: number }

/** Aynı tohum her zaman aynı bulmacaları verir; kolaydan zora sıralanır */
export function cocukBulmacalari(boyut: CocukBoyut, adet: number, tohum: number): CocukBulmaca[] {
  const seviye = boyut === 4 ? 'mini4' : 'mini6';
  const gorulen = new Set<string>();
  const liste: CocukBulmaca[] = [];
  for (let k = 0; liste.length < adet && k < adet * 20; k++) {
    const b = bulmacaUret(seviye, (tohum + k * 104729) >>> 0);
    if (!b || gorulen.has(b.bulmaca)) continue;
    gorulen.add(b.bulmaca);
    liste.push({ bulmaca: b.bulmaca, cozum: b.cozum, ipucu: b.ipucuSayisi });
  }
  return liste.sort((a, b) => b.ipucu - a.ipucu);
}

/** İpucu sayısına göre 1–3 yıldız (çok ipucu = kolay) */
export function yildiz(b: CocukBulmaca): number {
  const n = Math.round(Math.sqrt(b.bulmaca.length));
  const [kolay, orta] = n === 4 ? [7, 6] : [16, 14];
  return b.ipucu >= kolay ? 1 : b.ipucu >= orta ? 2 : 3;
}

function ortala(sayfa: PDFPage, yazi: string, font: PDFFont, boy: number, x: number, y: number, renk = LACIVERT) {
  sayfa.drawText(yazi, { x: x - font.widthOfTextAtSize(yazi, boy) / 2, y, size: boy, font, color: renk });
}

function yildizCiz(sayfa: PDFPage, cx: number, cy: number, r: number, dolu: boolean) {
  const n: string[] = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.45 : r;
    n.push(`${i ? 'L' : 'M'}${(Math.cos(a) * rr).toFixed(2)} ${(Math.sin(a) * rr).toFixed(2)}`);
  }
  sayfa.drawSvgPath(n.join(' ') + 'Z', { x: cx, y: cy, color: dolu ? TURUNCU : undefined, borderColor: TURUNCU, borderWidth: 1 });
}

function izgaraCiz(sayfa: PDFPage, x: number, yUst: number, kenar: number, b: CocukBulmaca, f: { kalin: PDFFont }, cevapli: boolean) {
  const n = Math.round(Math.sqrt(b.bulmaca.length));
  const kH = 2, kW = n === 4 ? 2 : 3;
  const h = kenar / n;
  const y0 = yUst - kenar;
  sayfa.drawRectangle({ x, y: y0, width: kenar, height: kenar, color: rgb(1, 1, 1) });
  for (let k = 1; k < n; k++) {
    const dikeyKalin = k % kW === 0, yatayKalin = k % kH === 0;
    sayfa.drawLine({ start: { x: x + k * h, y: y0 }, end: { x: x + k * h, y: yUst }, thickness: dikeyKalin ? 2.2 : 0.8, color: dikeyKalin ? LACIVERT : INCE });
    sayfa.drawLine({ start: { x, y: yUst - k * h }, end: { x: x + kenar, y: yUst - k * h }, thickness: yatayKalin ? 2.2 : 0.8, color: yatayKalin ? LACIVERT : INCE });
  }
  sayfa.drawRectangle({ x, y: y0, width: kenar, height: kenar, borderColor: LACIVERT, borderWidth: 2.6 });
  const boy = h * 0.58;
  for (let i = 0; i < b.bulmaca.length; i++) {
    const verilen = b.bulmaca[i] !== '0';
    if (!verilen && !cevapli) continue;
    const v = verilen ? b.bulmaca[i] : b.cozum[i];
    const cx = x + (i % n) * h + h / 2, cy = yUst - Math.floor(i / n) * h - h / 2 - boy * 0.36;
    ortala(sayfa, v, f.kalin, boy, cx, cy, verilen ? LACIVERT : ACIK_MAVI);
  }
}

function ustBilgi(sayfa: PDFPage, f: { normal: PDFFont; kalin: PDFFont }, boyut: CocukBoyut, baslik: string) {
  const y = A4.y - KENAR - 18;
  sayfa.drawText('Mavi', { x: KENAR, y, size: 20, font: f.kalin, color: LACIVERT });
  sayfa.drawText('Sudoku', { x: KENAR + f.kalin.widthOfTextAtSize('Mavi', 20), y, size: 20, font: f.kalin, color: MAVI });
  const sag = `Çocuklar için ${boyut}×${boyut} sudoku`;
  sayfa.drawText(sag, { x: A4.g - KENAR - f.normal.widthOfTextAtSize(sag, 11), y: y + 5, size: 11, font: f.normal, color: SOLUK });
  sayfa.drawLine({ start: { x: KENAR, y: y - 10 }, end: { x: A4.g - KENAR, y: y - 10 }, thickness: 1, color: INCE });
  sayfa.drawText(baslik, { x: KENAR, y: y - 36, size: 15, font: f.kalin, color: LACIVERT });
}

function altBilgi(sayfa: PDFPage, f: { normal: PDFFont }, no: number, toplam: number, metin: string) {
  sayfa.drawText(metin, { x: KENAR, y: 26, size: 9.5, font: f.normal, color: SOLUK });
  const s = `${no} / ${toplam}`;
  sayfa.drawText(s, { x: A4.g - KENAR - f.normal.widthOfTextAtSize(s, 9.5), y: 26, size: 9.5, font: f.normal, color: SOLUK });
}

export async function cocukPdf(ayar: YazdirAyari): Promise<Uint8Array> {
  const { boyut } = ayar;
  const sayfaSayisi = Math.min(10, Math.max(1, Math.floor(ayar.sayfa)));
  const basina = SAYFA_BASI[boyut];
  const bulmacalar = cocukBulmacalari(boyut, sayfaSayisi * basina, ayar.tohum);

  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const ham = fontlar();
  const f = { normal: await pdf.embedFont(ham.normal, { subset: true }), kalin: await pdf.embedFont(ham.kalin, { subset: true }) };
  pdf.setTitle(`MaviSudoku · Çocuklar için ${boyut}×${boyut} sudoku`);
  pdf.setAuthor('MaviSudoku');
  pdf.setSubject('Yazdırılabilir çocuk sudokusu');
  pdf.setLanguage('tr-TR');
  pdf.setCreator('mavisudoku.com');

  const cevapBasina = boyut === 4 ? 20 : 12;
  const cevapSayfasi = Math.ceil(bulmacalar.length / cevapBasina);
  const toplam = sayfaSayisi + cevapSayfasi;
  const rakamlar = boyut === 4 ? '1, 2, 3 ve 4' : '1, 2, 3, 4, 5 ve 6';

  // Bulmaca sayfaları
  for (let s = 0; s < sayfaSayisi; s++) {
    const sayfa = pdf.addPage([A4.g, A4.y]);
    ustBilgi(sayfa, f, boyut, 'Adın: ______________________          Tarih: ______________');
    const talimat = `Her satıra, her sütuna ve kalın çizgili her kutuya ${rakamlar} rakamlarını birer kez yaz.`;
    sayfa.drawText(talimat, { x: KENAR, y: A4.y - KENAR - 78, size: 11, font: f.normal, color: SOLUK, maxWidth: A4.g - 2 * KENAR });
    const sutun = 2, satir = basina / sutun;
    const alanUst = A4.y - KENAR - 100, alanAlt = 56;
    const hucreG = (A4.g - 2 * KENAR) / sutun, hucreY = (alanUst - alanAlt) / satir;
    const kenar = Math.min(hucreG - 40, hucreY - 44);
    for (let j = 0; j < basina; j++) {
      const idx = s * basina + j;
      const b = bulmacalar[idx];
      if (!b) break;
      const cx = KENAR + (j % sutun) * hucreG + hucreG / 2;
      const ust = alanUst - Math.floor(j / sutun) * hucreY - 6;
      const x = cx - kenar / 2;
      sayfa.drawText(`Bulmaca ${idx + 1}`, { x, y: ust - 12, size: 12, font: f.kalin, color: LACIVERT });
      const y = yildiz(b);
      for (let k = 0; k < 3; k++) yildizCiz(sayfa, x + kenar - 40 + k * 15, ust - 8, 6, k < y);
      izgaraCiz(sayfa, x, ust - 22, kenar, b, f, false);
    }
    altBilgi(sayfa, f, s + 1, toplam, 'mavisudoku.com  ·  Cevaplar son sayfada  ·  Yıldız sayısı zorluğu gösterir');
  }

  // Cevap anahtarı
  for (let s = 0; s < cevapSayfasi; s++) {
    const sayfa = pdf.addPage([A4.g, A4.y]);
    ustBilgi(sayfa, f, boyut, 'Cevap anahtarı');
    sayfa.drawText('Mavi rakamlar çocuğun yazması gereken rakamlardır.', { x: KENAR, y: A4.y - KENAR - 78, size: 11, font: f.normal, color: SOLUK });
    const sutun = boyut === 4 ? 4 : 3, satir = cevapBasina / sutun;
    const alanUst = A4.y - KENAR - 98, alanAlt = 50;
    const hucreG = (A4.g - 2 * KENAR) / sutun, hucreY = (alanUst - alanAlt) / satir;
    const kenar = Math.min(hucreG - 26, hucreY - 26);
    for (let j = 0; j < cevapBasina; j++) {
      const idx = s * cevapBasina + j;
      const b = bulmacalar[idx];
      if (!b) break;
      const x = KENAR + (j % sutun) * hucreG + (hucreG - kenar) / 2;
      const ust = alanUst - Math.floor(j / sutun) * hucreY;
      sayfa.drawText(`${idx + 1}`, { x, y: ust - 11, size: 10, font: f.kalin, color: LACIVERT });
      izgaraCiz(sayfa, x, ust - 16, kenar, b, f, true);
    }
    altBilgi(sayfa, f, sayfaSayisi + s + 1, toplam, 'mavisudoku.com  ·  Daha fazla bulmaca için siteyi ziyaret edin');
  }
  return pdf.save();
}
