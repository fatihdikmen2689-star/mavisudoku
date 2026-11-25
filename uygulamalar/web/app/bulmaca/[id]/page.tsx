import Link from 'next/link';
import { Reklam } from '../../../bilesenler/Reklam.tsx';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { UstMenu } from '../../../bilesenler/UstMenu.tsx';
import { MiniIzgara } from '../../../bilesenler/MiniIzgara.tsx';
import { YorumFormu } from '../../../bilesenler/YorumFormu.tsx';
import { mevcutOyuncu } from '../../../sunucu/istek.ts';
import { veritabani } from '../../../sunucu/db.ts';
import { bulmacaBilgisi, bulmacaSiralamasi, oyunDurumu, seriHesapla } from '../../../sunucu/oyun.ts';
import { yorumlar } from '../../../sunucu/yorum.ts';
import { sureMetni, sayi, SEVIYE_UI } from '../../../lib/bicim.ts';

export const dynamic = 'force-dynamic';

const kimlikNo = async (params: Promise<{ id: string }>) => {
  const id = Number((await params).id);
  return Number.isInteger(id) && id > 0 ? id : null;
};

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const id = await kimlikNo(params);
  if (!id) return {};
  const b = await bulmacaBilgisi(await veritabani(), id);
  return b ? { title: `Bulmaca #${b.id} · ${SEVIYE_UI[b.seviye].ad} sudoku`, description: `${SEVIYE_UI[b.seviye].ad} seviyede sudoku. ${b.cozulme} kişi çözdü. Sıralamada yerini gör, taktiğini yorumlarda paylaş.` } : {};
}

const tarihMetni = (iso: string) => new Intl.DateTimeFormat('tr-TR', { timeZone: 'Europe/Istanbul', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));

export default async function BulmacaSayfasi({ params }: { params: Promise<{ id: string }> }) {
  const id = await kimlikNo(params);
  if (!id) notFound();
  const db = await veritabani();
  const b = await bulmacaBilgisi(db, id);
  if (!b) notFound();
  const oyuncu = await mevcutOyuncu();
  const [siralama, yorumListesi, durum, seri] = await Promise.all([
    bulmacaSiralamasi(db, id, oyuncu), yorumlar(db, id, oyuncu), oyunDurumu(db, oyuncu, id), oyuncu ? seriHesapla(db, oyuncu) : Promise.resolve(0),
  ]);
  const ui = SEVIYE_UI[b.seviye];
  const gunluk = b.gunlukTarih ? new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(b.gunlukTarih + 'T12:00:00')) : null;

  return (
    <>
      <UstMenu oyuncu={oyuncu} aktif={gunluk ? 'gunluk' : null} seri={seri} />
      <main className="sayfa iki-sutun">
        <div className="ana-sutun">
          <nav aria-label="Konum" style={{ fontSize: 14, color: 'var(--soluk)' }}><Link href="/">Ana sayfa</Link> › <Link href={`/oyna/${b.seviye}`}>{ui.ad}</Link> › Bulmaca #{b.id}</nav>
          <section className="kart" style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'center' }}>
            <MiniIzgara bulmaca={b.bulmaca} boyut={180} />
            <div style={{ flex: '1 1 280px' }}>
              {gunluk && <p style={{ margin: '0 0 6px', fontSize: 13, fontWeight: 800, color: 'var(--mavi)', letterSpacing: '.5px' }}>GÜNÜN SUDOKUSU · {gunluk.toLocaleUpperCase('tr')}</p>}
              <h1 style={{ margin: '0 0 12px', fontSize: 32, fontWeight: 900, color: 'var(--lacivert)', lineHeight: 1.15 }}>Bulmaca #{b.id} · {ui.ad}</h1>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px 22px', fontSize: 14, color: 'var(--soluk)', marginBottom: 18 }}>
                <span><strong style={{ color: 'var(--lacivert)', fontSize: 18 }}>{sayi(b.cozulme)}</strong> kişi çözdü</span>
                <span>Ortalama <strong style={{ color: 'var(--lacivert)', fontSize: 18 }}>{sureMetni(b.ortalamaSure)}</strong></span>
                <span>Rekor <strong style={{ color: 'var(--lacivert)', fontSize: 18 }}>{sureMetni(b.rekor)}</strong></span>
                <span><strong style={{ color: 'var(--lacivert)', fontSize: 18 }}>{b.yorumSayisi}</strong> yorum</span>
              </div>
              {durum === 'bitti' ? (
                <p className="bilgi" style={{ margin: 0 }}>Bu bulmacayı çözdün. <Link href={`/oyna/${b.seviye}`} style={{ fontWeight: 800 }}>Sıradaki {ui.ad} bulmacaya geç</Link></p>
              ) : (
                <>
                  <Link className="ana-btn" href={`/oyna/${b.seviye}?bulmaca=${b.id}`}>{durum === 'yarim' ? 'Kaldığın yerden devam et' : 'Çözmeye başla'}</Link>
                  <p style={{ margin: '12px 0 0', fontSize: 13, color: 'var(--soluk)' }}>{durum === 'yarim' ? 'Bu bulmacayı açmıştın; süren kaldığı yerden sayılır.' : 'Bu bulmacayı daha önce açmadın. Sıralamaya yalnızca ilk denemen girer.'}</p>
                </>
              )}
            </div>
          </section>

          <section className="kart" aria-labelledby="siralama-b">
            <h2 id="siralama-b">Bu bulmacanın sıralaması</h2>
            {siralama.length ? (
              <div className="tablo-kutu">
                <table className="tablo">
                  <thead><tr><th scope="col">Sıra</th><th scope="col">Oyuncu</th><th scope="col">Yaş</th><th scope="col">Süre</th><th scope="col">Hata</th><th scope="col">Puan</th></tr></thead>
                  <tbody>
                    {siralama.map((s) => (
                      <tr key={s.sira} className={s.benim ? 'ben' : undefined}>
                        <td style={{ fontWeight: 900, color: s.sira === 1 ? '#8A4300' : undefined }}>{s.sira}</td>
                        <td style={{ fontWeight: 800 }}>{s.ad}{s.misafir && <> <span className="etiket">Misafir</span></>}{s.benim && <> <span className="etiket" style={{ background: 'var(--acik)', color: 'var(--mavi)' }}>Sen</span></>}</td>
                        <td style={{ color: 'var(--soluk)' }}>{s.yas ?? '—'}</td>
                        <td className="sure-yazi">{sureMetni(s.sure)}</td>
                        <td>{s.hata}</td>
                        <td style={{ fontWeight: 900, color: 'var(--mavi)' }}>{sayi(s.puan)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <p style={{ margin: 0, color: 'var(--soluk)' }}>Henüz kimse çözmedi. İlk sıraya sen yerleş!</p>}
            <p style={{ margin: '10px 0 0', fontSize: 12, color: 'var(--soluk)' }}>Oyuncular sıralamada ad soyadıyla ya da rumuzuyla görünmeyi kendileri seçer. Yaş yalnızca izin verilirse görünür. Üye olmayanlar misafir adıyla sıralamaya girer.</p>
          </section>

          <Reklam yer="icerik" />

          <section className="kart" aria-labelledby="yorum-b" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <h2 id="yorum-b" style={{ margin: 0 }}>Yorumlar <span style={{ fontSize: 15, color: 'var(--soluk)' }}>· {b.yorumSayisi}</span></h2>
            {oyuncu?.tip === 'uye' && durum === 'bitti' ? (
              <YorumFormu bulmacaId={b.id} />
            ) : (
              <div style={{ border: '1px dashed #B8C7DB', borderRadius: 14, padding: 16, background: '#FAFCFF', fontSize: 14, color: '#3B4A60' }}>
                {oyuncu?.tip === 'uye'
                  ? 'Yorum yazmak için önce bu bulmacayı bitir. Böylece çözüm ipuçları sadece bitirenler arasında kalır.'
                  : <>Yorum yazmak için bu bulmacayı bitirmiş ve <Link href="/kayit" style={{ fontWeight: 800 }}>üye</Link> olmalısın. Böylece çözüm ipuçları sadece bitirenler arasında kalır.</>}
              </div>
            )}
            {yorumListesi.length === 0 && <p style={{ margin: 0, color: 'var(--soluk)' }}>Henüz yorum yok.</p>}
            {yorumListesi.map((y) => (
              <article key={y.id} className="yorum">
                <span className="av" aria-hidden="true">{y.ad.charAt(0).toLocaleUpperCase('tr')}</span>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 14 }}><strong>{y.ad}</strong> <span style={{ color: 'var(--soluk)' }}>· {y.sure ? `Çözdü · ${sureMetni(y.sure)}` : 'Çözdü'} · {tarihMetni(y.tarih)}</span>{y.durum === 'onay-bekliyor' && <> <span className="etiket">Onay bekliyor</span></>}</p>
                  <p style={{ fontSize: 15, lineHeight: 1.55, marginTop: 4, whiteSpace: 'pre-wrap' }}>{y.metin}</p>
                </div>
              </article>
            ))}
          </section>
        </div>
        <aside className="yan-sutun">
          <section className="kart">
            <h2>Daha fazla {ui.ad}</h2>
            <p className="kart-alt">Her seferinde daha önce açmadığın bir bulmaca gelir.</p>
            <Link className="ikincil-btn" href={`/oyna/${b.seviye}`} style={{ width: '100%' }}>Yeni {ui.ad} bulmaca</Link>
          </section>
          <Reklam yer="yan" uzun />
        </aside>
      </main>
    </>
  );
}
