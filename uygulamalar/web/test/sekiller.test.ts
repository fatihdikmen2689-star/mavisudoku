import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SEKILLER, TAM_IZGARA, satirHucreleri, sutunHucreleri, kutuHucreleri, type Sekil } from '../lib/sekiller.ts';

const kutuNo = (i: number) => Math.floor(Math.floor(i / 9) / 3) * 3 + Math.floor((i % 9) / 3);
const komsular = (i: number) => new Set([...satirHucreleri(Math.floor(i / 9)), ...sutunHucreleri(i % 9), ...kutuHucreleri(kutuNo(i))].filter((j) => j !== i));
const gorulen = (s: Sekil, i: number) => new Set([...komsular(i)].map((j) => s.rakamlar[j]).filter(Boolean));
const bos = (s: Sekil, i: number) => s.rakamlar[i] === undefined;
const olabilir = (s: Sekil, i: number, d: number) => bos(s, i) && !gorulen(s, i).has(d);
const birimler = [...Array(9).keys()].flatMap((k) => [satirHucreleri(k), sutunHucreleri(k), kutuHucreleri(k)]);

test('tam ızgara geçerli bir sudoku çözümü', () => {
  for (const b of birimler) assert.equal(new Set(b.map((i) => TAM_IZGARA[i])).size, 9);
});

for (const [ad, s] of Object.entries(SEKILLER) as [string, Sekil][]) {
  test(`şekil: ${ad}`, () => {
    // Yerleşik rakamlar birbirleriyle çakışmamalı
    for (const b of birimler) {
      const v = b.map((i) => s.rakamlar[i]).filter(Boolean);
      assert.equal(new Set(v).size, v.length, `${ad}: birimde tekrar`);
    }
    // Gösterilen her aday, komşulardaki rakamlarla çelişmemeli
    for (const [i, ad2] of Object.entries(s.adaylar ?? {})) for (const d of ad2) assert.ok(olabilir(s, +i, d), `${ad}: ${i} hücresinde ${d} adayı olamaz`);
    for (const [i, sl] of Object.entries(s.silinen ?? {})) for (const d of sl) assert.ok(s.adaylar?.[+i]?.includes(d), `${ad}: silinen aday gösterilmemiş`);
    const k = s.kontrol!;
    switch (k.tur) {
      case 'tekAday': {
        assert.ok(bos(s, k.hucre));
        const kalan = [1, 2, 3, 4, 5, 6, 7, 8, 9].filter((d) => !gorulen(s, k.hucre).has(d));
        assert.deepEqual(kalan, [k.rakam]);
        assert.equal(s.cevap?.[k.hucre], k.rakam);
        break;
      }
      case 'gizliTekli': {
        const birim = kutuHucreleri(kutuNo(k.hucre));
        assert.deepEqual(birim.filter((i) => olabilir(s, i, k.rakam)), [k.hucre]);
        assert.equal(s.cevap?.[k.hucre], k.rakam);
        break;
      }
      case 'isaretleme': {
        const yerler = kutuHucreleri(k.kutu).filter((i) => olabilir(s, i, k.rakam));
        const satirlar = new Set(yerler.map((i) => Math.floor(i / 9)));
        assert.equal(satirlar.size, 1, 'kutudaki adaylar tek satırda olmalı');
        const r = [...satirlar][0];
        for (const [i, sl] of Object.entries(s.silinen ?? {})) {
          assert.equal(Math.floor(+i / 9), r); assert.notEqual(kutuNo(+i), k.kutu); assert.deepEqual(sl, [k.rakam]);
          assert.ok(olabilir(s, +i, k.rakam));
        }
        // Kutu içindeki işaretli hücreler gerçekten adayı gösteriyor
        for (const i of yerler) assert.ok(s.adaylar?.[i]?.includes(k.rakam));
        break;
      }
      case 'ciplakCift': {
        const [a, b] = k.hucreler;
        const tam = (i: number) => [1, 2, 3, 4, 5, 6, 7, 8, 9].filter((d) => olabilir(s, i, d));
        assert.deepEqual(tam(a), s.adaylar![a]); assert.deepEqual(tam(b), s.adaylar![b]);
        assert.deepEqual(s.adaylar![a], s.adaylar![b]); assert.equal(s.adaylar![a].length, 2);
        const satir = Math.floor(a / 9); assert.equal(Math.floor(b / 9), satir);
        for (const i of satirHucreleri(satir)) {
          if (i === a || i === b || !bos(s, i)) continue;
          assert.deepEqual(s.adaylar![i], tam(i), 'satırdaki diğer adaylar tam gösterilmeli');
          const silinecek = tam(i).filter((d) => s.adaylar![a].includes(d));
          assert.deepEqual(s.silinen?.[i] ?? [], silinecek);
          assert.equal(tam(i).length - silinecek.length, 1, 'silme sonrası tek rakam kalmalı');
        }
        break;
      }
      case 'xWing': {
        for (const r of k.satirlar) assert.deepEqual(satirHucreleri(r).filter((i) => olabilir(s, i, k.rakam)).map((i) => i % 9), k.sutunlar);
        for (const [i, sl] of Object.entries(s.silinen ?? {})) {
          assert.ok(k.sutunlar.includes(+i % 9)); assert.ok(!k.satirlar.includes(Math.floor(+i / 9))); assert.deepEqual(sl, [k.rakam]);
        }
        break;
      }
    }
  });
}
