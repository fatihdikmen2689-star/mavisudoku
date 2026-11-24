import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  metindenIzgara, izgaraMetni, cakismaVarMi, duzen,
  cozumSay, coz, tekCozumluMu, rastgeleTamIzgara, tohumluRastgele,
  zorlukAnalizi, hamBulmacaUret, bulmacaUret, seviyeBelirle,
  puanHesapla, cozumuDogrula,
} from '../src/index.ts';

// Bilinen klasik bulmaca ve çözümü
const KLASIK = '530070000600195000098000060800060003400803001700020006060000280000419005000080079';
const KLASIK_COZUM = '534678912672195348198342567859761423426853791713924856961537284287419635345286179';
// Tahmin gerektiren, bilinen çok zor bir bulmaca ("AI Escargot")
const ESCARGOT = '100007090030020008009600500005300900010080002600004000300000010040000007007000300';

test('düzen: 9×9, 6×6 ve 4×4 birim ve komşu sayıları doğru', () => {
  const d9 = duzen(9);
  assert.equal(d9.birimler.length, 27);
  assert.equal(d9.komsular[0].length, 20);
  const d6 = duzen(6);
  assert.equal(d6.birimler.length, 18);
  // 6×6'da kutular 2 satır × 3 sütun: hücre 0 ile hücre 8 (satır 1, sütun 2) aynı kutuda
  assert.equal(d6.kutuOf[0], d6.kutuOf[8]);
  assert.notEqual(d6.kutuOf[0], d6.kutuOf[3]);
  const d4 = duzen(4);
  assert.equal(d4.komsular[0].length, 7);
});

test('metin dönüşümü gidip geliyor', () => {
  assert.equal(izgaraMetni(metindenIzgara(KLASIK)), KLASIK);
  assert.deepEqual(metindenIzgara('1.2.3.4.4.3.2.1.'.replace(/\./g, '0')).length, 16);
  assert.throws(() => metindenIzgara('123'));
});

test('çözücü klasik bulmacayı doğru çözer ve tek çözüm bulur', () => {
  const g = metindenIzgara(KLASIK);
  assert.equal(izgaraMetni(coz(g)!), KLASIK_COZUM);
  assert.equal(cozumSay(g), 1);
  assert.equal(tekCozumluMu(g), true);
});

test('çözücü birden çok çözümü ve çözümsüzlüğü tanır', () => {
  const bos = new Array(81).fill(0);
  assert.equal(cozumSay(bos, 2), 2);
  const bozuk = metindenIzgara(KLASIK);
  bozuk[2] = 5; // aynı satırda iki 5
  assert.equal(cozumSay(bozuk), 0);
  assert.equal(coz(bozuk), null);
});

test('rastgele tam ızgaralar geçerli ve tohum aynıysa aynı', () => {
  for (const n of [4, 6, 9] as const) {
    const a = rastgeleTamIzgara(n, tohumluRastgele(42));
    const b = rastgeleTamIzgara(n, tohumluRastgele(42));
    assert.deepEqual(a, b);
    assert.ok(a.every((v) => v >= 1 && v <= n));
    assert.equal(cakismaVarMi(a), false);
  }
});

test('ham üretici tek çözümlü bulmaca üretir', () => {
  for (const n of [4, 6, 9] as const) {
    const { bulmaca, cozum } = hamBulmacaUret({ boyut: n, tohum: 7 });
    assert.equal(tekCozumluMu(bulmaca), true);
    assert.deepEqual(coz(bulmaca), cozum);
  }
});

test('zorluk: klasik bulmaca yalnızca basit tekniklerle çözülür', () => {
  const a = zorlukAnalizi(metindenIzgara(KLASIK));
  assert.equal(a.cozuldu, true);
  assert.equal(a.enYuksekDerece, 1);
  assert.equal(a.ipucuSayisi, 30);
  assert.equal(seviyeBelirle(a), 'orta');
});

test('zorluk: AI Escargot tekniklerle çözülemez → ekstrem', () => {
  const g = metindenIzgara(ESCARGOT);
  assert.equal(tekCozumluMu(g), true);
  const a = zorlukAnalizi(g);
  assert.equal(a.cozuldu, false);
  assert.equal(seviyeBelirle(a), 'ekstrem');
});

test('zorluk: teknikler hiçbir zaman yanlış rakam yerleştirmez', () => {
  // Minimum ipucuna kadar boşaltılmış 60 bulmacada, tekniklerin koyduğu her rakam gerçek çözümle aynı olmalı
  const gorulen = new Set<number>();
  for (let t = 1; t <= 60; t++) {
    const { bulmaca, cozum } = hamBulmacaUret({ boyut: 9, tohum: t * 101 });
    const a = zorlukAnalizi(bulmaca);
    gorulen.add(a.cozuldu ? a.enYuksekDerece : 99);
    a.sonIzgara.forEach((v, i) => {
      if (v) assert.equal(v, cozum[i], `tohum ${t * 101}, hücre ${i}`);
    });
    if (a.cozuldu) assert.ok(a.sonIzgara.every((v) => v !== 0));
  }
  // Farklı zorluklar gerçekten ortaya çıkıyor olmalı
  assert.ok(gorulen.size >= 3, `yalnızca şu dereceler görüldü: ${[...gorulen]}`);
});

test('zorluk: Mini bulmacalarda da teknikler doğru', () => {
  for (const n of [4, 6] as const) {
    for (let t = 1; t <= 30; t++) {
      const { bulmaca, cozum } = hamBulmacaUret({ boyut: n, tohum: t });
      const a = zorlukAnalizi(bulmaca);
      a.sonIzgara.forEach((v, i) => { if (v) assert.equal(v, cozum[i]); });
    }
  }
});

test('seviyeye göre üretim: kolay, orta, zor ve mini', () => {
  for (const seviye of ['mini4', 'mini6', 'kolay', 'orta', 'zor'] as const) {
    const b = bulmacaUret(seviye, 1000);
    assert.ok(b, `${seviye} üretilemedi`);
    assert.equal(b.seviye, seviye);
    assert.equal(tekCozumluMu(metindenIzgara(b.bulmaca)), true);
    assert.equal(izgaraMetni(coz(metindenIzgara(b.bulmaca))!), b.cozum);
    // Aynı tohum aynı bulmacayı verir
    const tekrar = hamBulmacaUret({ boyut: b.boyut, tohum: b.tohum, hedefIpucu: b.ipucuSayisi });
    assert.equal(izgaraMetni(tekrar.cozum), b.cozum);
  }
});

test('puan: hızlı çözüm bonus alır, hata ve ipucu düşürür, insan dışı hız işaretlenir', () => {
  const normal = puanHesapla({ seviye: 'zor', sureSaniye: 900, hata: 0, ipucu: 0 });
  assert.deepEqual(normal, { puan: 400, siralamayaUygun: true });
  const hizli = puanHesapla({ seviye: 'zor', sureSaniye: 300, hata: 0, ipucu: 0 });
  assert.equal(hizli.puan, 800); // çarpan 2'de sınırlı
  const hatali = puanHesapla({ seviye: 'zor', sureSaniye: 900, hata: 2, ipucu: 1 });
  assert.equal(hatali.puan, 400 - 80 - 60);
  const hileli = puanHesapla({ seviye: 'zor', sureSaniye: 30, hata: 0, ipucu: 0 });
  assert.equal(hileli.siralamayaUygun, false);
  const cokYavas = puanHesapla({ seviye: 'kolay', sureSaniye: 100000, hata: 20, ipucu: 5 });
  assert.equal(cokYavas.puan, 10); // en az tabanın %10'u
});

test('doğrulama: doğru çözüm kabul, hileler reddedilir', () => {
  assert.deepEqual(cozumuDogrula(KLASIK, KLASIK_COZUM, KLASIK_COZUM), { gecerli: true });
  assert.deepEqual(cozumuDogrula(KLASIK, KLASIK_COZUM), { gecerli: true });
  const eksik = '0' + KLASIK_COZUM.slice(1);
  assert.equal(cozumuDogrula(KLASIK, eksik).hata, 'verilen-degistirilmis');
  const bos = KLASIK_COZUM.slice(0, 2) + '0' + KLASIK_COZUM.slice(3);
  assert.equal(cozumuDogrula(KLASIK, bos).hata, 'eksik-hucre');
  // İki boş hücrenin değerlerini değiştir → çakışma
  const c = [...KLASIK_COZUM];
  [c[2], c[3]] = [c[3], c[2]];
  assert.equal(cozumuDogrula(KLASIK, c.join('')).hata, 'cakisma');
  assert.equal(cozumuDogrula(KLASIK, '123').hata, 'boyut-uyusmuyor');
});
