'use client';
/**
 * "Tek başına çöz" ekranı. Bulmacayı sunucudan alır; ilerleme (girilen rakamlar, notlar, süre)
 * tarayıcıda oyun numarasına göre saklanır, bitince çözüm sunucuya gönderilip doğrulanır.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Reklam } from './Reklam.tsx';
import Link from 'next/link';
import { duzen, metindenIzgara, SEVIYELER } from '@mavisudoku/motor';
import type { SeviyeId } from '@mavisudoku/motor';
import { sureMetni, sayi, SEVIYE_UI } from '../lib/bicim.ts';
import type { VerilenOyun, BittiSonucu } from '../sunucu/oyun.ts';
import type { MacDurumu } from '../sunucu/mac.ts';
import { useMac } from './MacBaglantisi.tsx';

interface Adim { i: number; deger: number; not: number }
interface Ilerleme { girilen: number[]; notlar: number[]; hata: number; ipucu: number; gecen: number }
interface Ayar { hataGoster: boolean; ayniVurgula: boolean; sureGizle: boolean }

const AYAR_ANAHTAR = 'ms:ayar';
const IPUCU_ANAHTAR = 'ms:ilk-ipucu';
const ilerlemeAnahtar = (oyunId: number) => `ms:oyun:${oyunId}`;

function oku<T>(anahtar: string): T | null {
  try { const h = localStorage.getItem(anahtar); return h ? (JSON.parse(h) as T) : null; } catch { return null; }
}
function yaz(anahtar: string, deger: unknown): void {
  try { localStorage.setItem(anahtar, JSON.stringify(deger)); } catch { /* gizli sekme */ }
}
function sil(anahtar: string): void {
  try { localStorage.removeItem(anahtar); } catch { /* yok say */ }
}
/** Sunucunun karıştırdığı çözümü açar (sunucudaki cozumKaristir ile aynı işlem) */
function cozumAc(k: string, anahtar: number): number[] {
  return [...k].map((c, i) => Number(String.fromCharCode(c.charCodeAt(0) ^ (((anahtar * 31 + i * 17) % 23) + 1))));
}

export interface OyuncuOzetiIstemci { cozulen: number; enIyi: number | null }

export function OyunEkrani({ seviye, bulmacaId, ozet, uye, mac }: { seviye: SeviyeId; bulmacaId?: number; ozet: OyuncuOzetiIstemci; uye: boolean; mac?: { id: number; rakip: string } }) {
  const [oyun, setOyun] = useState<VerilenOyun | null>(null);
  const [hataMesaji, setHataMesaji] = useState<string | null>(null);
  const [ilerleme, setIlerleme] = useState<Ilerleme | null>(null);
  const [secili, setSecili] = useState(-1);
  const [notModu, setNotModu] = useState(false);
  const [duraklat, setDuraklat] = useState(false);
  const [ayar, setAyar] = useState<Ayar>({ hataGoster: true, ayniVurgula: true, sureGizle: false });
  const [ipucuAdimi, setIpucuAdimi] = useState(0);
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [sonuc, setSonuc] = useState<BittiSonucu | null>(null);
  const [oyuncuAdi, setOyuncuAdi] = useState('');
  const gecmis = useRef<Adim[]>([]);

  const yukle = useCallback(async (yeni: boolean) => {
    setHataMesaji(null);
    setSonuc(null);
    setOyun(null);
    gecmis.current = [];
    try {
      const r = await fetch('/api/oyna', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seviye, bulmacaId: yeni ? undefined : bulmacaId, yeni }),
      });
      const veri = await r.json();
      if (!r.ok) { setHataMesaji(veri.hata ?? 'Bulmaca yüklenemedi.'); return; }
      const v: VerilenOyun = veri.oyun;
      const n = v.bulmaca.length;
      const kayitli = oku<Ilerleme>(ilerlemeAnahtar(v.oyunId));
      setIlerleme(kayitli && kayitli.girilen.length === n ? kayitli
        : { girilen: new Array(n).fill(0), notlar: new Array(n).fill(0), hata: 0, ipucu: 0, gecen: v.devam ? Math.max(0, Math.min(v.gecenSaniye, 3600)) : 0 });
      setOyun(v);
      setOyuncuAdi(veri.oyuncu?.ad ?? '');
      const b = metindenIzgara(v.bulmaca);
      setSecili(b.findIndex((x) => !x));
      setDuraklat(false);
      setNotModu(false);
      if (yeni) window.history.replaceState(null, '', `/oyna/${seviye}`);
    } catch {
      setHataMesaji('Bağlantı sorunu. İnternetini kontrol edip tekrar dene.');
    }
  }, [seviye, bulmacaId]);

  useEffect(() => {
    const a = oku<Ayar>(AYAR_ANAHTAR);
    if (a) setAyar((x) => ({ ...x, ...a }));
    if (!oku<boolean>(IPUCU_ANAHTAR)) setIpucuAdimi(1);
    void yukle(false);
  }, [yukle]);

  const bulmaca = useMemo(() => (oyun ? metindenIzgara(oyun.bulmaca) : []), [oyun]);
  const cozum = useMemo(() => (oyun ? cozumAc(oyun.cozumK, oyun.oyunId) : []), [oyun]);
  const d = useMemo(() => duzen((oyun ? Math.round(Math.sqrt(oyun.bulmaca.length)) : 9) as 4 | 6 | 9), [oyun]);
  const bitti = !!sonuc;
  const dogruSayisi = ilerleme ? bulmaca.filter((v, i) => !v && ilerleme.girilen[i] === cozum[i]).length : 0;
  const macB = useMac(mac?.id, dogruSayisi, ilerleme?.hata ?? 0);
  /** Maç modunda geri sayım bitene kadar tahta kapalı */
  const bekliyor = !!mac && !macB.basladi;

  // İlerlemeyi kaydet
  useEffect(() => { if (oyun && ilerleme && !bitti) yaz(ilerlemeAnahtar(oyun.oyunId), ilerleme); }, [oyun, ilerleme, bitti]);
  useEffect(() => { yaz(AYAR_ANAHTAR, ayar); }, [ayar]);

  // Süre: duraklatınca ve sekme gizlenince durur
  useEffect(() => {
    if (!oyun || bitti || duraklat || mac) return;
    const t = setInterval(() => {
      if (!document.hidden) setIlerleme((p) => (p ? { ...p, gecen: p.gecen + 1 } : p));
    }, 1000);
    return () => clearInterval(t);
  }, [oyun, bitti, duraklat, mac]);
  // Maçta süre, iki oyuncu için aynı olan başlangıç anından hesaplanır ve sekme gizlense de işler
  const baslangicYerel = macB.baslangicYerel;
  useEffect(() => {
    if (!mac || !oyun || bitti || baslangicYerel === null) return;
    const ayarla = () => setIlerleme((p) => (p ? { ...p, gecen: Math.max(0, Math.floor((Date.now() - baslangicYerel) / 1000)) } : p));
    ayarla();
    const t = setInterval(ayarla, 500);
    return () => clearInterval(t);
  }, [mac, oyun, bitti, baslangicYerel]);

  const deger = (p: Ilerleme, i: number) => bulmaca[i] || p.girilen[i];

  const bitir = useCallback(async (p: Ilerleme) => {
    if (!oyun) return;
    setGonderiliyor(true);
    try {
      const cevap = bulmaca.map((v, i) => v || p.girilen[i]).join('');
      const r = await fetch(`/api/oyun/${oyun.oyunId}/bitir`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cevap, sure: p.gecen, hata: p.hata, ipucu: p.ipucu }),
      });
      const veri = await r.json();
      if (!r.ok) { setHataMesaji(veri.hata ?? 'Sonuç kaydedilemedi.'); return; }
      setSonuc(veri.sonuc);
      sil(ilerlemeAnahtar(oyun.oyunId));
    } catch {
      setHataMesaji('Sonuç gönderilemedi. Bağlantını kontrol edip "Tekrar gönder"e bas.');
    } finally {
      setGonderiliyor(false);
    }
  }, [oyun, bulmaca]);

  /** Kullanıcı işlemleri mevcut duruma uygulanır (React'in durum güncelleyicisinde yan etki olmasın diye) */
  const guncelle = (fn: (p: Ilerleme) => Ilerleme | null) => {
    if (!ilerleme) return;
    const yeni = fn(ilerleme);
    if (yeni) setIlerleme(yeni);
  };

  // Tahta doğru doldurulunca çözümü bir kez gönder
  const gonderilen = useRef<number | null>(null);
  useEffect(() => {
    if (!oyun || !ilerleme || sonuc || gonderilen.current === oyun.oyunId || !cozum.length) return;
    if (cozum.every((v, i) => (bulmaca[i] || ilerleme.girilen[i]) === v)) {
      gonderilen.current = oyun.oyunId;
      void bitir(ilerleme);
    }
  }, [oyun, ilerleme, sonuc, cozum, bulmaca, bitir]);

  const rakamGir = (v: number) => {
    if (!oyun || bitti || duraklat || bekliyor || secili < 0 || bulmaca[secili]) return;
    guncelle((p) => {
      const i = secili;
      if (notModu ? !!p.girilen[i] : p.girilen[i] === v) return null;
      gecmis.current.push({ i, deger: p.girilen[i], not: p.notlar[i] });
      const girilen = p.girilen.slice(), notlar = p.notlar.slice();
      let hata = p.hata;
      if (notModu) notlar[i] ^= 1 << (v - 1);
      else {
        girilen[i] = v; notlar[i] = 0;
        if (v !== cozum[i]) hata++;
        else for (const j of d.komsular[i]) notlar[j] &= ~(1 << (v - 1));
      }
      return { ...p, girilen, notlar, hata };
    });
  };
  const temizle = () => {
    if (bitti || bekliyor || secili < 0 || bulmaca[secili]) return;
    guncelle((p) => {
      if (!p.girilen[secili] && !p.notlar[secili]) return null;
      gecmis.current.push({ i: secili, deger: p.girilen[secili], not: p.notlar[secili] });
      const girilen = p.girilen.slice(), notlar = p.notlar.slice();
      girilen[secili] = 0; notlar[secili] = 0;
      return { ...p, girilen, notlar };
    });
  };
  const geriAl = () => {
    const a = gecmis.current.pop();
    if (!a || bitti) return;
    setSecili(a.i);
    guncelle((p) => {
      const girilen = p.girilen.slice(), notlar = p.notlar.slice();
      girilen[a.i] = a.deger; notlar[a.i] = a.not;
      return { ...p, girilen, notlar };
    });
  };
  const ipucuVer = () => {
    if (!oyun || bitti || duraklat || mac || !ilerleme) return;
    let i = secili;
    if (i < 0 || bulmaca[i] || ilerleme.girilen[i] === cozum[i]) i = cozum.findIndex((v, k) => !bulmaca[k] && ilerleme.girilen[k] !== v);
    if (i < 0) return;
    setSecili(i);
    guncelle((p) => {
      gecmis.current.push({ i, deger: p.girilen[i], not: p.notlar[i] });
      const girilen = p.girilen.slice(), notlar = p.notlar.slice();
      girilen[i] = cozum[i]; notlar[i] = 0;
      for (const j of d.komsular[i]) notlar[j] &= ~(1 << (cozum[i] - 1));
      return { ...p, girilen, notlar, ipucu: p.ipucu + 1 };
    });
  };

  // Klavye
  useEffect(() => {
    const dinle = (e: KeyboardEvent) => {
      if (!oyun || bitti || e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.ctrlKey || e.metaKey) return;
      const n = d.n;
      if (/^[1-9]$/.test(e.key) && Number(e.key) <= n) { rakamGir(Number(e.key)); e.preventDefault(); return; }
      const yon: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -n, ArrowDown: n };
      if (e.key in yon) {
        const s = Math.max(0, secili), y = s + yon[e.key];
        if (y >= 0 && y < n * n && !(Math.abs(yon[e.key]) === 1 && Math.floor(y / n) !== Math.floor(s / n))) setSecili(y);
        e.preventDefault();
      } else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') { temizle(); e.preventDefault(); }
      else if (e.key === 'n' || e.key === 'N') setNotModu((x) => !x);
      else if (e.key === 'z' || e.key === 'Z') { geriAl(); e.preventDefault(); }
      else if ((e.key === 'p' || e.key === 'P') && !mac) setDuraklat((x) => !x);
    };
    window.addEventListener('keydown', dinle);
    return () => window.removeEventListener('keydown', dinle);
  });

  const ui = SEVIYE_UI[seviye];
  const ipucuMetni = [
    null,
    ['Bir boş hücre seç', 'Seçtiğin hücrenin satırı, sütunu ve kutusu vurgulanır.'],
    ['Alttaki rakama bas', `Her satır, sütun ve kalın çizgili kutuda 1–${d.n} rakamları birer kez olmalı.`],
    ['Emin değilsen Not modunu aç', 'Not modunda küçük aday rakamlar yazarsın. Yanlış girişler kırmızı görünür.'],
  ][ipucuAdimi];
  const ipucuKapat = () => { setIpucuAdimi(0); yaz(IPUCU_ANAHTAR, true); };

  const p = ilerleme;
  const sDeger = p && secili >= 0 ? deger(p, secili) : 0;
  const kalan = p ? bulmaca.filter((v, i) => !v && !p.girilen[i]).length : 0;

  return (
    <>
      <div className="oyun-cubuk">
        <div className="oyun-cubuk-ic">
          <h1>{oyun ? `Bulmaca #${oyun.bulmacaId}` : 'Bulmaca yükleniyor…'}</h1>
          <span className="rozet tek">{mac ? `MAÇ · ${mac.rakip}` : 'TEK BAŞINA'}</span>
          <span className="rozet">{ui.ad}</span>
          <div className="sure-kutu">
            <span className="sure" role="timer" aria-label="Geçen süre">{ayar.sureGizle ? '––:––' : sureMetni(p?.gecen ?? 0)}</span>
            {!mac && <button type="button" className="kare-btn" aria-label={duraklat ? 'Devam et' : 'Duraklat'} onClick={() => !bitti && setDuraklat((x) => !x)}>
              {duraklat
                ? <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
                : <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>}
            </button>}
          </div>
        </div>
      </div>

      <main className="sayfa iki-sutun">
        <section className="oyun-sol" aria-label="Sudoku">
          {hataMesaji && (
            <div className="uyari genislik" role="alert">
              {hataMesaji}{' '}
              {p && oyun && !sonuc && cozum.every((v, i) => (bulmaca[i] || p.girilen[i]) === v)
                ? <button type="button" className="ikincil-btn" style={{ minHeight: 36, marginLeft: 8 }} onClick={() => void bitir(p)}>Tekrar gönder</button>
                : !mac && <button type="button" className="ikincil-btn" style={{ minHeight: 36, marginLeft: 8 }} onClick={() => void yukle(true)}>Yeni bulmaca</button>}
            </div>
          )}

          {mac && macB.hata && !sonuc && <p className="uyari genislik" role="status" style={{ margin: 0 }}>{macB.hata}</p>}
          {sonuc && mac && <MacSonucu durum={macB.durum} rakip={mac.rakip} />}
          {sonuc && <SonucPaneli sonuc={sonuc} uye={uye} oyuncuAdi={oyuncuAdi} onSiradaki={() => void yukle(true)} mac={!!mac} />}

          {!sonuc && oyun && p && (
            <div className="genislik" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="durum">
                <span>Hata: <b style={{ color: 'var(--kirmizi)' }}>{p.hata}</b></span>
                <span>İpucu: <b>{p.ipucu}</b></span>
                <span>Kalan hücre: <b style={{ color: 'var(--mavi)' }}>{kalan}</b></span>
              </div>
              {mac && macB.durum?.rakip.bitti && (
                <p className="uyari" role="status" style={{ margin: 0 }}><strong>{mac.rakip}</strong> bulmacayı {sureMetni(macB.durum.rakip.sure)} sürede bitirdi. Sen de bitir; süren bulmacanın sıralamasına girer.</p>
              )}
              {ipucuMetni && !mac && (
                <div className="ipucu-balon" role="dialog" aria-labelledby="ipucu-baslik">
                  <span className="no">{ipucuAdimi}/3</span>
                  <div style={{ flex: '1 1 240px' }}><p className="b" id="ipucu-baslik">{ipucuMetni[0]}</p><p className="m">{ipucuMetni[1]}</p></div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button type="button" onClick={ipucuKapat} style={{ border: '1px solid #4E73A6', background: 'transparent', color: '#fff' }}>Geç</button>
                    <button type="button" onClick={() => (ipucuAdimi >= 3 ? ipucuKapat() : setIpucuAdimi(ipucuAdimi + 1))} style={{ border: 0, background: '#fff', color: 'var(--lacivert)', fontWeight: 800 }}>{ipucuAdimi >= 3 ? 'Anladım' : 'İleri'}</button>
                  </div>
                </div>
              )}
              <div className={`tahta-alani${duraklat || bekliyor ? ' duraklatildi' : ''}`}>
                <div className={`tahta n${d.n}`} role="grid" aria-label="Sudoku tahtası" style={{ gridTemplateColumns: `repeat(${d.n}, minmax(0, 1fr))` }}>
                  {bulmaca.map((_, i) => {
                    const v = deger(p, i);
                    const verilen = !!bulmaca[i];
                    const yanlis = !verilen && !!v && v !== cozum[i] && ayar.hataGoster;
                    const r = d.satirOf[i], c = d.sutunOf[i];
                    const bolge = secili >= 0 && i !== secili && (r === d.satirOf[secili] || c === d.sutunOf[secili] || d.kutuOf[i] === d.kutuOf[secili]);
                    const sinif = ['hucre',
                      c === d.n - 1 ? 'son-sutun' : (c + 1) % d.kutuSutun === 0 ? 'kalin-sag' : '',
                      r === d.n - 1 ? 'son-satir' : (r + 1) % d.kutuSatir === 0 ? 'kalin-alt' : '',
                      verilen ? 'verilen' : '', i === secili ? 'secili' : bolge ? 'bolge' : '',
                      ayar.ayniVurgula && sDeger && i !== secili && v === sDeger ? 'ayni' : '', yanlis ? 'yanlis' : ''].filter(Boolean).join(' ');
                    return (
                      <button key={i} type="button" role="gridcell" className={sinif} onClick={() => setSecili(i)}
                        aria-label={`Satır ${r + 1}, sütun ${c + 1}, ${v || (p.notlar[i] ? 'notlu' : 'boş')}${verilen ? ', verilen' : ''}${yanlis ? ', hatalı' : ''}`}>
                        {v ? v : p.notlar[i] ? (
                          <span className="notlar" style={{ gridTemplateColumns: `repeat(${d.kutuSutun}, 1fr)` }}>
                            {Array.from({ length: d.n }, (_, k) => <span key={k}>{p.notlar[i] & (1 << k) ? k + 1 : ''}</span>)}
                          </span>
                        ) : ''}
                      </button>
                    );
                  })}
                </div>
                {bekliyor && (
                  <div className="perde" role="status" aria-live="polite"><div>
                    <p>{mac!.rakip} ile maç</p>
                    <span className="geri-sayim">{macB.durum ? macB.kalanSaniye : '…'}</span>
                    <p style={{ fontSize: 15, fontWeight: 600, marginTop: 10 }}>{macB.durum ? 'saniye sonra başlıyor' : 'Maç bilgisi alınıyor'}</p>
                  </div></div>
                )}
                {duraklat && (
                  <div className="perde"><div><p>Oyun duraklatıldı</p><button type="button" className="ana-btn" onClick={() => setDuraklat(false)}>Devam et</button></div></div>
                )}
              </div>
              <div className="rakamlar" role="group" aria-label="Rakam seç" style={{ gridTemplateColumns: `repeat(${d.n}, minmax(0, 1fr))` }}>
                {Array.from({ length: d.n }, (_, k) => {
                  const v = k + 1;
                  let yerlesen = 0;
                  for (let i = 0; i < cozum.length; i++) if (deger(p, i) === v && cozum[i] === v) yerlesen++;
                  const kalanRakam = d.n - yerlesen;
                  return (
                    <button key={v} type="button" className="rakam" disabled={kalanRakam === 0 && !notModu} onClick={() => rakamGir(v)}>
                      <b>{v}</b><small>{kalanRakam ? `${kalanRakam} kaldı` : 'tamam'}</small>
                    </button>
                  );
                })}
              </div>
              <div className="araclar">
                <button type="button" onClick={geriAl}>Geri al</button>
                <button type="button" onClick={temizle}>Sil</button>
                <button type="button" className={notModu ? 'acik' : ''} aria-pressed={notModu} onClick={() => setNotModu((x) => !x)}>{notModu ? 'Not: Açık' : 'Not: Kapalı'}</button>
                {!mac && <button type="button" onClick={ipucuVer}>İpucu</button>}
              </div>
              {gonderiliyor && <p className="bilgi" role="status">Çözümün kontrol ediliyor…</p>}
            </div>
          )}

          {!sonuc && !oyun && !hataMesaji && <p className="bilgi genislik" role="status">Bulmaca hazırlanıyor…</p>}
        </section>

        <aside className="yan-sutun">
          {mac && <RakipKarti durum={macB.durum} rakip={mac.rakip} benimDogru={dogruSayisi} benimHata={p?.hata ?? 0} bitti={bitti} />}
          {!mac && <section className="kart" aria-labelledby="bilgi-b">
            <h2 id="bilgi-b">Bu seviyede sen</h2>
            <dl className="ist">
              <div><dt>Çözülen</dt><dd>{ozet.cozulen + (sonuc ? 1 : 0)}</dd></div>
              <div><dt>En iyi süre</dt><dd>{sureMetni(sonuc ? Math.min(ozet.enIyi ?? sonuc.sure, sonuc.sure) : ozet.enIyi)}</dd></div>
            </dl>
          </section>}
          {!mac && <section className="kart" aria-labelledby="seviye-b">
            <h2 id="seviye-b">Seviye seç</h2>
            <nav className="seviye-listesi" aria-label="Seviyeler">
              {(Object.keys(SEVIYELER) as SeviyeId[]).map((s) => (
                <Link key={s} href={`/oyna/${s}`} aria-current={s === seviye ? 'page' : undefined}>{SEVIYE_UI[s].ad}</Link>
              ))}
            </nav>
            <p style={{ margin: '12px 0 0', fontSize: 13, color: 'var(--soluk)' }}>Her seviyede daha önce açmadığın bir bulmaca gelir. Yarım kalan bulmacan kaydedilir.</p>
          </section>}
          <section className="kart" aria-labelledby="ayar-b">
            <h2 id="ayar-b">Oyun ayarları</h2>
            <label className="ayar">Hataları hemen göster<input type="checkbox" checked={ayar.hataGoster} onChange={(e) => setAyar({ ...ayar, hataGoster: e.target.checked })} /></label>
            <label className="ayar">Aynı rakamları vurgula<input type="checkbox" checked={ayar.ayniVurgula} onChange={(e) => setAyar({ ...ayar, ayniVurgula: e.target.checked })} /></label>
            <label className="ayar">Süreyi gizle<input type="checkbox" checked={ayar.sureGizle} onChange={(e) => setAyar({ ...ayar, sureGizle: e.target.checked })} /></label>
            <p style={{ margin: '8px 0 0', fontSize: 12, color: 'var(--soluk)' }}>Klavye: rakamlar, ok tuşları, Sil, N (not), Z (geri al){mac ? '' : ', P (duraklat)'}</p>
          </section>
          <Reklam yer="yan" uzun />
        </aside>
      </main>
    </>
  );
}

function SonucPaneli({ sonuc, uye, oyuncuAdi, onSiradaki, mac = false }: { sonuc: BittiSonucu; uye: boolean; oyuncuAdi: string; onSiradaki: () => void; mac?: boolean }) {
  const ui = SEVIYE_UI[sonuc.seviye];
  const paylasMetni = `MaviSudoku'da ${ui.ad} bir bulmacayı ${sureMetni(sonuc.sure)} sürede çözdüm. Sen geçebilir misin?`;
  const paylasUrl = typeof window !== 'undefined' ? `${window.location.origin}/bulmaca/${sonuc.bulmacaId}` : '';
  return (
    <section className="sonuc genislik" aria-labelledby="tebrik">
      <div className="sonuc-ust">
        <span>{ui.ad} · {sonuc.cozulenSeviyede} çözüldü</span>
        {sonuc.rekor && <span className="rekor">Yeni kişisel rekor!</span>}
      </div>
      <h2 id="tebrik">{mac ? 'Bulmacayı çözdün' : 'Tebrikler, çözdün!'}</h2>
      <div className="sonuc-kutular">
        <div><small>Süre</small><strong>{sureMetni(sonuc.sure)}</strong><em>{sonuc.oncekiEnIyi ? `Önceki en iyin ${sureMetni(sonuc.oncekiEnIyi)}` : 'Bu seviyedeki ilk çözümün'}</em></div>
        <div><small>Sıralamada</small><strong>{sonuc.sira ? `${sayi(sonuc.sira)}.` : '—'}</strong><em>{sonuc.siralamada ? `${sayi(sonuc.toplam)} kişi içinde` : 'Sıralamaya alınmadı'}</em></div>
        <div><small>Puan</small><strong>+{sayi(sonuc.puan)}</strong><em>{sonuc.hata} hata · {sonuc.ipucu ? `${sonuc.ipucu} ipucu` : 'ipucu yok'}</em></div>
        <div><small>Seri</small><strong style={{ color: '#FFC58F' }}>{sonuc.seri} gün</strong><em>Bugünkü seri tamam</em></div>
      </div>
      {!sonuc.siralamada && <p className="uyari" style={{ margin: 0 }}>Bu süre insan için olağan dışı kısa olduğundan skor sıralamaya alınmadı.</p>}
      {!uye && (
        <div className="beyaz-kutu">
          <span style={{ flex: '1 1 260px' }}><strong>{oyuncuAdi || 'Misafir'}</strong> olarak oynuyorsun. Bu skoru ve serini kaybetmemek için ücretsiz kayıt ol.</span>
          <Link className="btn-mavi" style={{ minHeight: 48 }} href="/kayit">Skorumu kaydet</Link>
        </div>
      )}
      <div className="sonuc-btnlar">
        {mac ? <Link className="ana-btn" href="/arkadas">Yeni maç</Link> : <button type="button" className="ana-btn" onClick={onSiradaki}>Sıradaki bulmaca</button>}
        <Link className="koyu-btn" href={`/bulmaca/${sonuc.bulmacaId}`}>{uye ? 'Sıralama ve yorumlar' : 'Sıralamayı gör'}</Link>
        <a className="koyu-btn" href={`https://wa.me/?text=${encodeURIComponent(`${paylasMetni} ${paylasUrl}`)}`} target="_blank" rel="noopener noreferrer">WhatsApp'ta paylaş</a>
      </div>
    </section>
  );
}

function Cubuk({ dogru, toplam, rakip = false, etiket }: { dogru: number; toplam: number; rakip?: boolean; etiket: string }) {
  const yuzde = toplam ? Math.round((dogru / toplam) * 100) : 0;
  return (
    <div className={`rakip-cubuk${rakip ? ' rakip' : ''}`} role="progressbar" aria-label={etiket} aria-valuemin={0} aria-valuemax={100} aria-valuenow={yuzde}>
      <span style={{ width: `${yuzde}%` }} />
    </div>
  );
}

function RakipKarti({ durum, rakip, benimDogru, benimHata, bitti }: { durum: MacDurumu | null; rakip: string; benimDogru: number; benimHata: number; bitti: boolean }) {
  const toplam = durum?.bosHucre ?? 0;
  const r = durum?.rakip;
  return (
    <section className="kart" aria-labelledby="rakip-b" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <h2 id="rakip-b" style={{ margin: 0 }}>Maç durumu</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}><strong>Sen</strong><span>{bitti ? 'Bitirdin' : `${benimDogru}/${toplam} · ${benimHata} hata`}</span></div>
        <Cubuk dogru={bitti ? toplam : benimDogru} toplam={toplam} etiket="Senin ilerlemen" />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}><strong>{rakip}</strong><span>{r?.bitti ? `Bitirdi · ${sureMetni(r.sure)}` : `${r?.dogru ?? 0}/${toplam} · ${r?.hata ?? 0} hata`}</span></div>
        <Cubuk dogru={r?.dogru ?? 0} toplam={toplam} rakip etiket={`${rakip} ilerlemesi`} />
      </div>
      <p style={{ margin: 0, fontSize: 12.5, color: 'var(--soluk)' }}>Doğru yerleştirilen hücreler sayılır. Maçta ipucu ve duraklatma yoktur.</p>
    </section>
  );
}

function MacSonucu({ durum, rakip }: { durum: MacDurumu | null; rakip: string }) {
  const s = durum?.ben.bitti ? durum.sonuc : null;
  const baslik = s === 'kazandin' ? 'Kazandın! 🏆' : s === 'kaybettin' ? `${rakip} önce bitirdi` : 'Sonuç hesaplanıyor…';
  const alt = s === 'kazandin'
    ? (durum!.rakip.bitti ? `${rakip} ${sureMetni(durum!.rakip.sure)} sürede bitirdi.` : `${rakip} hâlâ çözüyor.`)
    : s === 'kaybettin' ? `${rakip} ${sureMetni(durum!.rakip.sure)} sürede bitirdi. Rövanş ister misin?` : '';
  return (
    <section className={`kart genislik`} role="status" aria-live="polite" style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between', borderColor: s === 'kazandin' ? '#5BC48A' : undefined, borderWidth: 2 }}>
      <div>
        <strong style={{ display: 'block', fontSize: 24, fontWeight: 900, color: 'var(--lacivert)' }}>{baslik}</strong>
        {alt && <span style={{ fontSize: 14, color: 'var(--soluk)' }}>{alt}</span>}
      </div>
      <Link className="btn-mavi" style={{ minHeight: 46, padding: '0 20px' }} href={`/arkadas?rakip=${encodeURIComponent(rakip)}`}>Rövanş</Link>
    </section>
  );
}
