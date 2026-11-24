/**
 * Bulmaca havuzu üretme aracı.
 * Kullanım:  node araclar/havuz-uret.ts [seviye başına adet] [çıktı dosyası]
 * Örnek:     node araclar/havuz-uret.ts 40 veri/havuz.json
 *
 * Gerçek sistemde bu araç sunucuda bir kez (ve havuz azaldıkça) çalıştırılır;
 * bulmacalar veritabanına yazılır. Her bulmacanın tohumu saklandığı için
 * gerekirse aynı bulmaca yeniden üretilebilir.
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import {
  hamBulmacaUret, zorlukAnalizi, seviyeBelirle, izgaraMetni, doluSayisi, SEVIYE_SIRASI,
} from '../paketler/motor/src/index.ts';
import type { SeviyeId, Boyut } from '../paketler/motor/src/index.ts';

const adet = Number(process.argv[2] ?? 40);
const cikti = process.argv[3] ?? 'veri/havuz.json';
const SURE_SINIRI_MS = 10 * 60 * 1000;

interface Kayit {
  id: string;
  tohum: number;
  bulmaca: string;
  cozum: string;
  ipucu: number;
  teknikler: string[];
}

const havuz: Record<SeviyeId, Kayit[]> = {
  mini4: [], mini6: [], kolay: [], orta: [], zor: [], uzman: [], usta: [], ekstrem: [],
};
const gorulen = new Set<string>();

function ekle(seviye: SeviyeId, tohum: number, bulmaca: number[], cozum: number[], teknikler: string[]): void {
  if (havuz[seviye].length >= adet) return;
  const metin = izgaraMetni(bulmaca);
  if (gorulen.has(metin)) return;
  gorulen.add(metin);
  havuz[seviye].push({
    id: `${seviye}-${tohum}`,
    tohum,
    bulmaca: metin,
    cozum: izgaraMetni(cozum),
    ipucu: doluSayisi(bulmaca),
    teknikler,
  });
}

const basla = Date.now();
let tohum = 20261124;

// Mini seviyeler: hedef ipucuna kadar boşalt
for (const [seviye, boyut, enAz, aralik] of [['mini4', 4, 5, 3], ['mini6', 6, 13, 4]] as [SeviyeId, Boyut, number, number][]) {
  while (havuz[seviye].length < adet) {
    tohum++;
    const { bulmaca, cozum } = hamBulmacaUret({ boyut, tohum, hedefIpucu: enAz + (tohum % aralik) });
    const a = zorlukAnalizi(bulmaca);
    if (a.cozuldu) ekle(seviye, tohum, bulmaca, cozum, Object.keys(a.kullanilan));
  }
}

// 9×9: kolay ve orta için hedef ipucuna, diğerleri için en aza kadar boşalt; seviyeyi analiz belirler
let deneme = 0;
while (SEVIYE_SIRASI.some((s) => havuz[s].length < adet) && Date.now() - basla < SURE_SINIRI_MS) {
  tohum++;
  deneme++;
  const tur = deneme % 4;
  const hedef = tur === 0 ? 36 + (tohum % 5) : tur === 1 ? 28 + (tohum % 5) : undefined;
  const { bulmaca, cozum } = hamBulmacaUret({ boyut: 9, tohum, hedefIpucu: hedef });
  const a = zorlukAnalizi(bulmaca);
  ekle(seviyeBelirle(a), tohum, bulmaca, cozum, Object.keys(a.kullanilan));
  if (deneme % 200 === 0) {
    const durum = SEVIYE_SIRASI.map((s) => `${s}:${havuz[s].length}`).join(' ');
    console.log(`${deneme} deneme · ${Math.round((Date.now() - basla) / 1000)} sn · ${durum}`);
  }
}

mkdirSync(dirname(cikti), { recursive: true });
writeFileSync(cikti, JSON.stringify({ uretildi: new Date().toISOString(), havuz }, null, 0));
console.log('Bitti:', SEVIYE_SIRASI.map((s) => `${s}=${havuz[s].length}`).join(', '), `· ${deneme} deneme`);
