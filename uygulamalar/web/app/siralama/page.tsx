import Link from 'next/link';
import type { Metadata } from 'next';
import { UstMenu } from '../../bilesenler/UstMenu.tsx';
import { Reklam } from '../../bilesenler/Reklam.tsx';
import { mevcutOyuncu } from '../../sunucu/istek.ts';
import { veritabani } from '../../sunucu/db.ts';
import { genelSiralama, donemMi, type Donem } from '../../sunucu/siralama.ts';
import { seriHesapla } from '../../sunucu/oyun.ts';
import { sayi } from '../../lib/bicim.ts';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Genel sıralama', description: 'MaviSudoku genel sıralaması: bugünün, bu haftanın ve tüm zamanların en çok puan toplayan oyuncuları.', alternates: { canonical: '/siralama' } };

const SEKME: Record<Donem, string> = { gun: 'Bugün', hafta: 'Bu hafta', tum: 'Tüm zamanlar' };

export default async function Siralama({ searchParams }: { searchParams: Promise<{ donem?: string }> }) {
  const d = (await searchParams).donem;
  const donem: Donem = donemMi(d) ? d : 'hafta';
  const oyuncu = await mevcutOyuncu();
  const db = await veritabani();
  const [liste, seri] = await Promise.all([genelSiralama(db, donem, oyuncu), oyuncu ? seriHesapla(db, oyuncu) : Promise.resolve(0)]);
  const ust = liste.filter((s) => s.sira <= 100);
  const ben = liste.find((s) => s.benim && s.sira > 100);
  return (
    <>
      <UstMenu oyuncu={oyuncu} aktif="siralama" seri={seri} />
      <main className="sayfa iki-sutun">
        <div className="ana-sutun">
          <header>
            <h1 style={{ margin: '6px 0 8px', fontSize: 34, fontWeight: 700, color: 'var(--lacivert)' }}>Genel sıralama</h1>
            <p style={{ margin: 0, fontSize: 16, color: '#3B4A60' }}>Sıralamaya giren her çözümün puanı toplanır. Zor seviyeler ve hızlı çözümler daha çok puan getirir.</p>
          </header>
          <nav className="sekmeler" aria-label="Dönem" style={{ maxWidth: 480 }}>
            {(Object.keys(SEKME) as Donem[]).map((k) => <Link key={k} href={`/siralama?donem=${k}`} aria-current={k === donem ? 'page' : undefined}>{SEKME[k]}</Link>)}
          </nav>
          <section className="kart" aria-label={`${SEKME[donem]} sıralaması`}>
            {ust.length === 0 ? <p style={{ margin: 0, color: 'var(--soluk)' }}>Bu dönemde henüz kimse puan almadı. <Link href="/gunluk" style={{ fontWeight: 600 }}>İlk sen ol!</Link></p> : (
              <div className="tablo-kutu">
                <table className="tablo">
                  <thead><tr><th scope="col">Sıra</th><th scope="col">Oyuncu</th><th scope="col">Yaş</th><th scope="col">Çözülen</th><th scope="col">Puan</th></tr></thead>
                  <tbody>
                    {[...ust, ...(ben ? [ben] : [])].map((s) => (
                      <tr key={s.sira} className={s.benim ? 'ben' : undefined}>
                        <td style={{ fontWeight: 700, color: s.sira <= 3 ? '#8A4300' : undefined }}>{s.sira}</td>
                        <td style={{ fontWeight: 600 }}>{s.ad}{s.misafir && <> <span className="etiket">Misafir</span></>}{s.benim && <> <span className="etiket" style={{ background: 'var(--acik)', color: 'var(--mavi)' }}>Sen</span></>}</td>
                        <td style={{ color: 'var(--soluk)' }}>{s.yas ?? '—'}</td>
                        <td>{sayi(s.cozulen)}</td>
                        <td style={{ fontWeight: 700, color: 'var(--mavi)' }}>{sayi(s.puan)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p style={{ margin: '10px 0 0', fontSize: 12, color: 'var(--soluk)' }}>Günler ve haftalar Türkiye saatine göre başlar; hafta pazartesi başlar. Oyuncular ad soyadıyla ya da rumuzuyla görünmeyi kendileri seçer.</p>
          </section>
          <Reklam yer="icerik" />
        </div>
        <aside className="yan-sutun">
          <section className="kart">
            <h2>Sıralamaya gir</h2>
            <p className="kart-alt">Her çözüm puan getirir; seri de motivasyon.</p>
            <Link className="ana-btn" href="/gunluk" style={{ width: '100%' }}>Günün sudokusunu çöz</Link>
          </section>
          <Reklam yer="yan" uzun />
        </aside>
      </main>
    </>
  );
}
