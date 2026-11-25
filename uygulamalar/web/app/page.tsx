import Link from 'next/link';
import { Reklam } from '../bilesenler/Reklam.tsx';
import { SEVIYE_SIRASI } from '@mavisudoku/motor';
import { UstMenu } from '../bilesenler/UstMenu.tsx';
import { MiniIzgara } from '../bilesenler/MiniIzgara.tsx';
import { mevcutOyuncu } from '../sunucu/istek.ts';
import { veritabani } from '../sunucu/db.ts';
import { oyuncuOzeti, gununBulmacasi, bulmacaBilgisi, bulmacaSiralamasi } from '../sunucu/oyun.ts';
import { sureMetni, sayi, SEVIYE_UI, TARIH_BICIMI } from '../lib/bicim.ts';

export const dynamic = 'force-dynamic';

export default async function AnaSayfa() {
  const db = await veritabani();
  const oyuncu = await mevcutOyuncu();
  const ozet = await oyuncuOzeti(db, oyuncu);
  const gunlukId = await gununBulmacasi(db);
  const gunluk = (await bulmacaBilgisi(db, gunlukId))!;
  const enHizlilar = (await bulmacaSiralamasi(db, gunlukId, oyuncu, 5));
  const sonSeviye = ozet.yarim?.seviye ?? 'kolay';

  return (
    <>
      <UstMenu oyuncu={oyuncu} seri={ozet.seri} />
      <main className="sayfa" style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
        <section className="hero" aria-labelledby="hero-baslik">
          <div className="hero-sol">
            <p className="ust-yazi">{TARIH_BICIMI.format(new Date()).toLocaleUpperCase('tr')}</p>
            <h1 id="hero-baslik">Bugünün sudokusu seni bekliyor.</h1>
            <p>Her bulmaca sana bir kez gelir. Çöz, süreni bulmacanın sıralamasında gör, yorumlarda taktiğini paylaş.</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
              <Link className="ana-btn" href={`/oyna/${sonSeviye}`}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
                Hemen oyna <span style={{ fontSize: 14, fontWeight: 600, color: '#5A2E00' }}>· {SEVIYE_UI[sonSeviye].ad}</span>
              </Link>
            </div>
            {ozet.yarim && (
              <Link className="devam" href={`/oyna/${ozet.yarim.seviye}`}>
                <span style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--mavi)', color: '#fff', display: 'grid', placeItems: 'center' }}><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg></span>
                <span style={{ flex: '1 1 200px' }}><strong style={{ display: 'block', fontSize: 15 }}>Kaldığın yerden devam et</strong><span style={{ fontSize: 13, color: 'var(--soluk)' }}>Bulmaca #{ozet.yarim.bulmacaId} · {SEVIYE_UI[ozet.yarim.seviye].ad}</span></span>
              </Link>
            )}
            <p style={{ margin: '16px 0 0', fontSize: 13, color: 'var(--soluk)' }}>
              {oyuncu?.tip === 'uye' ? 'Skorların ve serin hesabına kaydediliyor.' : 'Üye olmadan da oynayabilirsin: sana misafir adı verilir ve sıralamaya girersin.'}
            </p>
          </div>
          <Link className="hero-sag" href={`/bulmaca/${gunlukId}`} aria-label={`Günün sudokusu: ${SEVIYE_UI[gunluk.seviye].ad}`}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontSize: 20, fontWeight: 700 }}>Günün Sudokusu</span>
              <span className="rozet" style={{ background: 'var(--mavi)' }}>{SEVIYE_UI[gunluk.seviye].ad}</span>
            </div>
            <div style={{ alignSelf: 'center', width: '100%', maxWidth: 230 }}><MiniIzgara bulmaca={gunluk.bulmaca} boyut={230} koyu /></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 14, color: '#C9DBF5' }}>
              <span><strong style={{ color: '#fff', fontSize: 18 }}>{sayi(gunluk.cozulme)}</strong> kişi çözdü</span>
              <span>Rekor <strong style={{ color: '#fff', fontSize: 18 }}>{sureMetni(gunluk.rekor)}</strong></span>
            </div>
            <span style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 48, borderRadius: 12, background: 'var(--mavi-acik)', fontWeight: 700 }}>Günün sudokusunu çöz</span>
          </Link>
        </section>

        <section id="seviyeler" aria-labelledby="seviye-baslik">
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, marginBottom: 14 }}>
            <h2 id="seviye-baslik" style={{ margin: 0, fontSize: 24, fontWeight: 700, color: 'var(--lacivert)' }}>Seviyeni seç</h2>
            <span style={{ fontSize: 14, color: 'var(--soluk)' }}>Her seviyede daha önce çözmediğin bir bulmaca gelir</span>
          </div>
          <div className="seviye-izgara">
            {SEVIYE_SIRASI.map((s) => {
              const o = ozet.seviyeler[s];
              return (
                <Link key={s} className="seviye-kart" href={`/oyna/${s}`}>
                  <span className="serit" style={{ background: SEVIYE_UI[s].renk }} />
                  <b>{SEVIYE_UI[s].ad}</b>
                  <small>{SEVIYE_UI[s].aciklama}</small>
                  <small>{o ? `${o.cozulen} çözüldü · en iyi ${sureMetni(o.enIyi)}` : 'Henüz çözmedin'}</small>
                  <span style={{ marginTop: 6, fontWeight: 700, fontSize: 14, color: 'var(--mavi)' }}>Oyna</span>
                </Link>
              );
            })}
          </div>
        </section>

        <Reklam yer="icerik" />

        <section style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'flex-start' }}>
          <div className="kart" style={{ flex: '1 1 380px' }}>
            <h2>Bugünün en hızlıları</h2>
            <p className="kart-alt">Günün sudokusu · {SEVIYE_UI[gunluk.seviye].ad}</p>
            {enHizlilar.length ? (
              <ol className="liste-hizli">
                {enHizlilar.map((s) => (
                  <li key={s.sira} className={[s.sira === 1 ? 'ilk' : '', s.benim ? 'ben' : ''].join(' ')}>
                    <span className="no">{s.sira}</span>
                    <span className="ad">{s.ad}{s.misafir && <> <span className="etiket">Misafir</span></>}</span>
                    <span className="sure-yazi">{sureMetni(s.sure)}</span>
                  </li>
                ))}
              </ol>
            ) : <p style={{ margin: 0, color: 'var(--soluk)' }}>Bugün henüz kimse çözmedi. İlk sen ol!</p>}
            <Link href={`/bulmaca/${gunlukId}`} style={{ display: 'inline-block', marginTop: 12, fontWeight: 600, fontSize: 14, padding: '8px 0' }}>Sıralama ve yorumlar</Link>
          </div>
          <div className="kart" style={{ flex: '1 1 380px' }}>
            <h2>Sudoku öğren</h2>
            <p className="kart-alt">Takıldığın yerde işine yarayacak taktikler</p>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[['Sudoku nasıl oynanır? Başlangıç rehberi', 'Kolay', 'sudoku-nasil-oynanir'], ['Gizli tekli yöntemi adım adım', 'Orta', 'gizli-tekli'], ['X-Wing tekniği ile zor bulmacaları aç', 'Usta', 'x-wing']].map(([b, s, slug]) => (
                <li key={b}><Link href={`/taktikler/${slug}`} style={{ display: 'block', padding: '12px 14px', borderRadius: 12, background: 'var(--zemin)', color: 'var(--lacivert)' }}><strong style={{ display: 'block' }}>{b}</strong><span style={{ fontSize: 13, color: 'var(--soluk)' }}>{s}</span></Link></li>
              ))}
            </ul>
          </div>
        </section>
      </main>
    </>
  );
}
