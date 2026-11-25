/**
 * "Tek başına çöz" ekranı — tarayıcı tarafı.
 * Sunucu henüz yok: bulmaca havuzu sayfaya gömülü, ilerleme tarayıcıda (localStorage) saklanır.
 * Next.js'e geçerken bu mantık aynen bir React bileşenine taşınacak.
 */

import { duzen, metindenIzgara, SEVIYELER, SEVIYE_SIRASI, puanHesapla, EN_FAZLA_IPUCU } from '../../paketler/motor/src/index.ts';
import type { SeviyeId, Duzen } from '../../paketler/motor/src/index.ts';

interface HavuzKaydi { id: string; bulmaca: string; cozum: string; ipucu: number }
declare const HAVUZ: Record<SeviyeId, HavuzKaydi[]>;

interface Adim { i: number; deger: number; not: number }
interface Oyun {
  seviye: SeviyeId;
  id: string;
  bulmaca: number[];
  cozum: number[];
  girilen: number[];
  notlar: number[];
  secili: number;
  notModu: boolean;
  hata: number;
  ipucu: number;
  gecen: number;
  bitti: boolean;
  gecmis: Adim[];
}
interface Kayit {
  misafir: string;
  oynanan: Record<string, true>;
  devam: Partial<Record<SeviyeId, Oyun>>;
  enIyi: Partial<Record<SeviyeId, number>>;
  cozulen: Partial<Record<SeviyeId, number>>;
  sonSeviye: SeviyeId;
  ipucuGoruldu: boolean;
  ayar: { hataGoster: boolean; ayniVurgula: boolean; sureGizle: boolean };
}

const ANAHTAR = 'mavisudoku:v1';
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

// ---------- Kalıcı kayıt (tarayıcı belleği kapalıysa bellekte devam eder) ----------
function kayitYukle(): Kayit {
  const bos: Kayit = {
    misafir: 'misafir' + String(1000 + Math.floor(Math.random() * 9000)),
    oynanan: {}, devam: {}, enIyi: {}, cozulen: {}, sonSeviye: 'kolay', ipucuGoruldu: false,
    ayar: { hataGoster: true, ayniVurgula: true, sureGizle: false },
  };
  try {
    const ham = localStorage.getItem(ANAHTAR);
    if (ham) return { ...bos, ...JSON.parse(ham), ayar: { ...bos.ayar, ...JSON.parse(ham).ayar } };
  } catch { /* gizli sekme vb. */ }
  return bos;
}
const kayit = kayitYukle();
function kaydet(): void {
  try { localStorage.setItem(ANAHTAR, JSON.stringify(kayit)); } catch { /* yok say */ }
}

// ---------- Oyun durumu ----------
let oyun: Oyun;
let d: Duzen;
let duraklatildi = false;
let ipucuAdimi = kayit.ipucuGoruldu ? 0 : 1;

function sonrakiBulmaca(seviye: SeviyeId): HavuzKaydi {
  const liste = HAVUZ[seviye];
  const yeni = liste.find((b) => !kayit.oynanan[b.id]);
  // Havuz biterse (prototipte 60 bulmaca) en baştan döner; gerçek sistemde sunucu yenisini verir
  return yeni ?? liste[Math.floor(Math.random() * liste.length)];
}

function oyunBaslat(seviye: SeviyeId, yeniIste = false): void {
  kayit.sonSeviye = seviye;
  const devam = kayit.devam[seviye];
  if (devam && !devam.bitti && !yeniIste) {
    oyun = devam;
  } else {
    const b = sonrakiBulmaca(seviye);
    const n = SEVIYELER[seviye].boyut;
    oyun = {
      seviye, id: b.id,
      bulmaca: metindenIzgara(b.bulmaca), cozum: metindenIzgara(b.cozum),
      girilen: new Array(n * n).fill(0), notlar: new Array(n * n).fill(0),
      secili: -1, notModu: false, hata: 0, ipucu: 0, gecen: 0, bitti: false, gecmis: [],
    };
    kayit.oynanan[b.id] = true; // her bulmaca bir kez: açıldığı an "oynandı" sayılır
    kayit.devam[seviye] = oyun;
  }
  d = duzen(SEVIYELER[seviye].boyut);
  if (oyun.secili < 0) oyun.secili = oyun.bulmaca.findIndex((v, i) => !v && !oyun.girilen[i]);
  duraklatildi = false;
  kaydet();
  tahtaKur();
  ciz();
}

const deger = (i: number) => oyun.bulmaca[i] || oyun.girilen[i];

function rakamGir(v: number): void {
  if (oyun.bitti || duraklatildi) return;
  const i = oyun.secili;
  if (i < 0 || oyun.bulmaca[i]) return;
  if (oyun.notModu ? !!oyun.girilen[i] : oyun.girilen[i] === v) return;
  oyun.gecmis.push({ i, deger: oyun.girilen[i], not: oyun.notlar[i] });
  if (oyun.notModu) {
    oyun.notlar[i] ^= 1 << (v - 1);
  } else {
    oyun.girilen[i] = v;
    oyun.notlar[i] = 0;
    if (v !== oyun.cozum[i]) {
      oyun.hata++;
    } else {
      for (const j of d.komsular[i]) oyun.notlar[j] &= ~(1 << (v - 1));
    }
    bittiMi();
  }
  kaydet();
  ciz();
}

function temizle(): void {
  const i = oyun.secili;
  if (oyun.bitti || i < 0 || oyun.bulmaca[i]) return;
  if (!oyun.girilen[i] && !oyun.notlar[i]) return;
  oyun.gecmis.push({ i, deger: oyun.girilen[i], not: oyun.notlar[i] });
  oyun.girilen[i] = 0;
  oyun.notlar[i] = 0;
  kaydet();
  ciz();
}

function geriAl(): void {
  const a = oyun.gecmis.pop();
  if (!a || oyun.bitti) return;
  oyun.girilen[a.i] = a.deger;
  oyun.notlar[a.i] = a.not;
  oyun.secili = a.i;
  kaydet();
  ciz();
}

function ipucuVer(): void {
  if (oyun.bitti || duraklatildi || oyun.ipucu >= EN_FAZLA_IPUCU) return;
  let i = oyun.secili;
  if (i < 0 || oyun.bulmaca[i] || oyun.girilen[i] === oyun.cozum[i]) {
    i = oyun.cozum.findIndex((v, k) => !oyun.bulmaca[k] && oyun.girilen[k] !== v);
  }
  if (i < 0) return;
  oyun.gecmis.push({ i, deger: oyun.girilen[i], not: oyun.notlar[i] });
  oyun.girilen[i] = oyun.cozum[i];
  oyun.notlar[i] = 0;
  for (const j of d.komsular[i]) oyun.notlar[j] &= ~(1 << (oyun.cozum[i] - 1));
  oyun.secili = i;
  oyun.ipucu++;
  bittiMi();
  kaydet();
  ciz();
}

function bittiMi(): void {
  if (!oyun.cozum.every((v, i) => deger(i) === v)) return;
  oyun.bitti = true;
  const s = oyun.seviye;
  kayit.cozulen[s] = (kayit.cozulen[s] ?? 0) + 1;
  const onceki = kayit.enIyi[s];
  if (!onceki || oyun.gecen < onceki) kayit.enIyi[s] = oyun.gecen;
  sonucGoster(onceki);
}

// ---------- Çizim ----------
const sureMetni = (sn: number) => `${String(Math.floor(sn / 60)).padStart(2, '0')}:${String(sn % 60).padStart(2, '0')}`;

function tahtaKur(): void {
  const tahta = $('tahta');
  tahta.innerHTML = '';
  tahta.style.gridTemplateColumns = `repeat(${d.n}, minmax(0, 1fr))`;
  tahta.dataset.n = String(d.n);
  for (let i = 0; i < d.n * d.n; i++) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'hucre';
    b.setAttribute('role', 'gridcell');
    const r = d.satirOf[i], c = d.sutunOf[i];
    if (c === d.n - 1) b.classList.add('son-sutun');
    else if ((c + 1) % d.kutuSutun === 0) b.classList.add('kalin-sag');
    if (r === d.n - 1) b.classList.add('son-satir');
    else if ((r + 1) % d.kutuSatir === 0) b.classList.add('kalin-alt');
    b.addEventListener('click', () => { oyun.secili = i; ciz(); });
    tahta.appendChild(b);
  }
  const tus = $('rakamlar');
  tus.innerHTML = '';
  tus.style.gridTemplateColumns = `repeat(${d.n}, minmax(0, 1fr))`;
  for (let v = 1; v <= d.n; v++) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'rakam';
    b.dataset.v = String(v);
    b.innerHTML = `<span class="rakam-no">${v}</span><span class="rakam-kalan"></span>`;
    b.addEventListener('click', () => rakamGir(v));
    tus.appendChild(b);
  }
}

function ciz(): void {
  const sv = SEVIYELER[oyun.seviye];
  const ayar = kayit.ayar;
  const s = oyun.secili;
  const sDeger = s >= 0 ? deger(s) : 0;
  const hucreler = $('tahta').children;
  let kalan = 0;
  for (let i = 0; i < hucreler.length; i++) {
    const h = hucreler[i] as HTMLButtonElement;
    const v = deger(i);
    if (!v) kalan++;
    const verilen = !!oyun.bulmaca[i];
    const yanlis = !verilen && !!v && v !== oyun.cozum[i] && ayar.hataGoster;
    const ayniBolge = s >= 0 && i !== s && (d.satirOf[i] === d.satirOf[s] || d.sutunOf[i] === d.sutunOf[s] || d.kutuOf[i] === d.kutuOf[s]);
    h.classList.toggle('verilen', verilen);
    h.classList.toggle('secili', i === s);
    h.classList.toggle('bolge', ayniBolge);
    h.classList.toggle('ayni', ayar.ayniVurgula && !!sDeger && i !== s && v === sDeger);
    h.classList.toggle('yanlis', yanlis);
    if (v) {
      h.textContent = String(v);
    } else if (oyun.notlar[i]) {
      let notHtml = '<span class="notlar" style="grid-template-columns:repeat(' + d.kutuSutun + ',1fr)">';
      for (let k = 1; k <= d.n; k++) notHtml += `<span>${oyun.notlar[i] & (1 << (k - 1)) ? k : ''}</span>`;
      h.innerHTML = notHtml + '</span>';
    } else {
      h.textContent = '';
    }
    h.setAttribute('aria-label', `Satır ${d.satirOf[i] + 1}, sütun ${d.sutunOf[i] + 1}, ${v ? v : oyun.notlar[i] ? 'notlu' : 'boş'}${verilen ? ', verilen' : ''}${yanlis ? ', hatalı' : ''}`);
  }
  // Rakam tuşları: kaç tane kaldığı
  for (const el of Array.from($('rakamlar').children) as HTMLButtonElement[]) {
    const v = Number(el.dataset.v);
    let yerlesen = 0;
    for (let i = 0; i < oyun.cozum.length; i++) if (deger(i) === v && v === oyun.cozum[i]) yerlesen++;
    const k = d.n - yerlesen;
    (el.querySelector('.rakam-kalan') as HTMLElement).textContent = k ? `${k} kaldı` : 'tamam';
    el.disabled = k === 0 && !oyun.notModu;
  }
  $('bulmaca-adi').textContent = `Bulmaca #${oyun.id.split('-')[1].slice(-5)}`;
  $('seviye-rozet').textContent = sv.ad;
  $('hata').textContent = String(oyun.hata);
  $('ipucu-sayi').textContent = `${oyun.ipucu}/${EN_FAZLA_IPUCU}`;
  const ipb = $('ipucu-btn') as HTMLButtonElement;
  ipb.textContent = `İpucu (${EN_FAZLA_IPUCU - oyun.ipucu})`;
  ipb.disabled = oyun.ipucu >= EN_FAZLA_IPUCU;
  $('kalan').textContent = String(kalan);
  $('sure').textContent = ayar.sureGizle ? '––:––' : sureMetni(oyun.gecen);
  const notBtn = $('not-btn');
  notBtn.textContent = oyun.notModu ? 'Not: Açık' : 'Not: Kapalı';
  notBtn.setAttribute('aria-pressed', String(oyun.notModu));
  notBtn.classList.toggle('acik', oyun.notModu);
  $('duraklat-btn').setAttribute('aria-label', duraklatildi ? 'Devam et' : 'Duraklat');
  $('duraklat-btn').innerHTML = duraklatildi
    ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>'
    : '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>';
  $('tahta-alani').classList.toggle('duraklatildi', duraklatildi);
  $('duraklat-perde').hidden = !duraklatildi;
  // Bilgi kartı
  $('en-iyi').textContent = kayit.enIyi[oyun.seviye] ? sureMetni(kayit.enIyi[oyun.seviye]!) : '—';
  $('cozulen').textContent = String(kayit.cozulen[oyun.seviye] ?? 0);
  $('misafir-adi').textContent = kayit.misafir;
  // Seviye listesi
  for (const el of Array.from(document.querySelectorAll<HTMLButtonElement>('[data-seviye]'))) {
    const on = el.dataset.seviye === oyun.seviye;
    el.classList.toggle('secili', on);
    el.setAttribute('aria-pressed', String(on));
  }
  // İlk oyun ipuçları
  const ip = $('ilk-ipucu');
  ip.hidden = ipucuAdimi === 0 || oyun.bitti;
  if (ipucuAdimi) {
    const metin = [
      ['', ''],
      ['Bir boş hücre seç', 'Seçtiğin hücrenin satırı, sütunu ve kutusu vurgulanır.'],
      ['Alttaki rakama bas', `Her satır, sütun ve kalın çizgili kutuda 1–${d.n} rakamları birer kez olmalı.`],
      ['Emin değilsen Not modunu aç', 'Not modunda küçük aday rakamlar yazarsın. Yanlış girişler kırmızı görünür.'],
    ][ipucuAdimi];
    $('ipucu-no').textContent = `${ipucuAdimi}/3`;
    $('ipucu-baslik').textContent = metin[0];
    $('ipucu-metin').textContent = metin[1];
    $('ipucu-ileri').textContent = ipucuAdimi === 3 ? 'Anladım' : 'İleri';
  }
  $('sonuc').hidden = !oyun.bitti;
  $('oyun-alani').hidden = oyun.bitti;
}

function sonucGoster(oncekiEnIyi?: number): void {
  const p = puanHesapla({ seviye: oyun.seviye, sureSaniye: oyun.gecen, hata: oyun.hata, ipucu: oyun.ipucu });
  $('s-sure').textContent = sureMetni(oyun.gecen);
  $('s-puan').textContent = '+' + p.puan.toLocaleString('tr-TR');
  $('s-hata').textContent = `${oyun.hata} hata · ${oyun.ipucu ? oyun.ipucu + ' ipucu' : 'ipucu yok'}`;
  $('s-rekor').hidden = !(oncekiEnIyi && oyun.gecen < oncekiEnIyi);
  $('s-rekor-metin').textContent = oncekiEnIyi ? `Önceki en iyin ${sureMetni(oncekiEnIyi)}` : 'Bu seviyedeki ilk çözümün';
  $('s-seviye').textContent = `${SEVIYELER[oyun.seviye].ad} · ${kayit.cozulen[oyun.seviye]} çözüldü`;
  $('s-uyari').hidden = p.siralamayaUygun;
  $('s-misafir').textContent = kayit.misafir;
}

// ---------- Olaylar ----------
function baglan(): void {
  $('not-btn').addEventListener('click', () => { oyun.notModu = !oyun.notModu; kaydet(); ciz(); });
  $('sil-btn').addEventListener('click', temizle);
  $('geri-btn').addEventListener('click', geriAl);
  $('ipucu-btn').addEventListener('click', ipucuVer);
  $('duraklat-btn').addEventListener('click', () => { if (!oyun.bitti) { duraklatildi = !duraklatildi; ciz(); } });
  $('devam-btn').addEventListener('click', () => { duraklatildi = false; ciz(); });
  $('siradaki-btn').addEventListener('click', () => oyunBaslat(oyun.seviye, true));
  $('ipucu-ileri').addEventListener('click', () => {
    ipucuAdimi = ipucuAdimi >= 3 ? 0 : ipucuAdimi + 1;
    if (!ipucuAdimi) { kayit.ipucuGoruldu = true; kaydet(); }
    ciz();
  });
  $('ipucu-gec').addEventListener('click', () => { ipucuAdimi = 0; kayit.ipucuGoruldu = true; kaydet(); ciz(); });
  for (const [id, anahtar] of [['ayar-hata', 'hataGoster'], ['ayar-ayni', 'ayniVurgula'], ['ayar-sure', 'sureGizle']] as const) {
    const kutu = $<HTMLInputElement>(id);
    kutu.checked = kayit.ayar[anahtar];
    kutu.addEventListener('change', () => { kayit.ayar[anahtar] = kutu.checked; kaydet(); ciz(); });
  }
  // Seviye listesi
  const liste = $('seviye-listesi');
  for (const s of SEVIYE_SIRASI) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'seviye-btn';
    b.dataset.seviye = s;
    b.textContent = SEVIYELER[s].ad;
    b.addEventListener('click', () => {
      oyunBaslat(s);
      // Dar ekranda seviye listesi tahtanın altında kalır; seçimden sonra tahtaya dön
      const ust = $('tahta-alani').getBoundingClientRect().top;
      if (ust < 0 || ust > window.innerHeight * 0.6) $('oyun-alani').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    liste.appendChild(b);
  }
  // Klavye: rakamlar, oklar, silme, N = not, Z = geri al, P = duraklat
  document.addEventListener('keydown', (e) => {
    if (e.target instanceof HTMLInputElement) return;
    if (oyun.bitti) return;
    const n = d.n;
    if (/^[1-9]$/.test(e.key) && Number(e.key) <= n) { rakamGir(Number(e.key)); e.preventDefault(); return; }
    const s = Math.max(0, oyun.secili);
    const yon: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -n, ArrowDown: n };
    if (e.key in yon) {
      const yeni = s + yon[e.key];
      if (yeni >= 0 && yeni < n * n && !(Math.abs(yon[e.key]) === 1 && Math.floor(yeni / n) !== Math.floor(s / n))) oyun.secili = yeni;
      ciz();
      e.preventDefault();
    } else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') { temizle(); e.preventDefault(); }
    else if (e.key === 'n' || e.key === 'N') { oyun.notModu = !oyun.notModu; ciz(); }
    else if ((e.key === 'z' || e.key === 'Z') && !e.altKey) { geriAl(); e.preventDefault(); }
    else if (e.key === 'p' || e.key === 'P') { duraklatildi = !duraklatildi; ciz(); }
  });
  // Süre: sekme gizlenince otomatik durur
  setInterval(() => {
    if (!oyun || oyun.bitti || duraklatildi || document.hidden) return;
    oyun.gecen++;
    if (oyun.gecen % 5 === 0) kaydet();
    $('sure').textContent = kayit.ayar.sureGizle ? '––:––' : sureMetni(oyun.gecen);
  }, 1000);
  document.addEventListener('visibilitychange', () => { if (document.hidden) kaydet(); });
}

baglan();
const adres = new URLSearchParams(location.search).get('seviye') as SeviyeId | null;
oyunBaslat(adres && SEVIYELER[adres] ? adres : kayit.sonSeviye);
