import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { SEVIYE_SIRASI } from '@mavisudoku/motor';
import { UstMenu } from '../../bilesenler/UstMenu.tsx';
import { AyarFormu, SifreFormu, HesapSilFormu } from '../../bilesenler/ProfilFormlari.tsx';
import { mevcutOyuncu } from '../../sunucu/istek.ts';
import { veritabani } from '../../sunucu/db.ts';
import { profil } from '../../sunucu/hesap.ts';
import { sureMetni, sayi, SEVIYE_UI } from '../../lib/bicim.ts';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Profil ve ayarlar', robots: { index: false } };

const tarih = (iso: string, saat = false) => new Intl.DateTimeFormat('tr-TR', { timeZone: 'Europe/Istanbul', day: 'numeric', month: 'long', ...(saat ? { hour: '2-digit', minute: '2-digit' } : { year: 'numeric' }) }).format(new Date(iso));

export default async function Profil() {
  const oyuncu = await mevcutOyuncu();
  if (oyuncu?.tip !== 'uye') redirect('/giris');
  const p = await profil(await veritabani(), oyuncu);
  const seviyeler = SEVIYE_SIRASI.map((s) => ({ s, v: p.seviyeler.find((x) => x.seviye === s) }));
  return (
    <>
      <UstMenu oyuncu={oyuncu} seri={p.seri} />
      <main className="sayfa iki-sutun">
        <div className="ana-sutun">
          <header style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <span aria-hidden="true" style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--mavi-acik)', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 28, fontWeight: 900 }}>{p.rumuz.charAt(0).toLocaleUpperCase('tr')}</span>
            <div>
              <h1 style={{ margin: 0, fontSize: 30, fontWeight: 900, color: 'var(--lacivert)' }}>{p.rumuz}</h1>
              <p style={{ margin: '2px 0 0', color: 'var(--soluk)', fontSize: 14 }}>{tarih(p.uyelik)} tarihinden beri üye</p>
            </div>
          </header>

          <section className="kart" aria-labelledby="ist-b">
            <h2 id="ist-b">İstatistiklerin</h2>
            <dl className="ist" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))' }}>
              <div><dt>Çözülen</dt><dd>{sayi(p.cozulen)}</dd></div>
              <div><dt>Toplam puan</dt><dd>{sayi(p.toplamPuan)}</dd></div>
              <div><dt>Seri</dt><dd>{p.seri} gün</dd></div>
              <div><dt>Maçlar</dt><dd>{p.maclar.kazanilan}G · {p.maclar.kaybedilen}M</dd></div>
            </dl>
            <div className="tablo-kutu" style={{ marginTop: 16 }}>
              <table className="tablo">
                <thead><tr><th scope="col">Seviye</th><th scope="col">Çözülen</th><th scope="col">En iyi</th><th scope="col">Ortalama</th></tr></thead>
                <tbody>
                  {seviyeler.map(({ s, v }) => (
                    <tr key={s}><td style={{ fontWeight: 800 }}><span aria-hidden="true" style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 3, background: SEVIYE_UI[s].renk, marginRight: 8 }} />{SEVIYE_UI[s].ad}</td>
                      <td>{v?.cozulen ?? 0}</td><td className="sure-yazi">{sureMetni(v?.enIyi ?? null)}</td><td className="sure-yazi">{sureMetni(v?.ortalama ?? null)}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="kart" aria-labelledby="son-b">
            <h2 id="son-b">Son çözdüklerin</h2>
            {p.sonOyunlar.length === 0 ? <p style={{ margin: 0, color: 'var(--soluk)' }}>Henüz bulmaca çözmedin. <Link href="/oyna/kolay" style={{ fontWeight: 800 }}>İlkini çöz</Link></p> : (
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {p.sonOyunlar.map((o) => (
                  <li key={o.bulmacaId}><Link href={`/bulmaca/${o.bulmacaId}`} className="mac-satir" style={{ color: 'inherit' }}>
                    <span className="ad">#{o.bulmacaId} · {SEVIYE_UI[o.seviye].ad}</span>
                    <span className="ek">{tarih(o.tarih, true)}</span>
                    <span className="sure-yazi">{sureMetni(o.sure)}</span>
                    <strong style={{ color: 'var(--mavi)' }}>+{sayi(o.puan)}</strong>
                  </Link></li>
                ))}
              </ul>
            )}
          </section>

          <section className="kart" aria-labelledby="ayar-b">
            <h2 id="ayar-b">Hesap ayarları</h2>
            <p className="kart-alt">{p.eposta} · doğum yılı {p.dogumYili}</p>
            <AyarFormu ilk={{ ad: p.ad, soyad: p.soyad, gorunen: p.gorunen, yasGoster: p.yasGoster, pazarlama: p.pazarlama }} yetiskin={p.yetiskin} rumuz={p.rumuz} />
          </section>

          <section className="kart" aria-labelledby="sifre-b">
            <h2 id="sifre-b">Şifre</h2>
            <SifreFormu />
          </section>

          <section className="kart" aria-labelledby="veri-b" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <h2 id="veri-b" style={{ margin: 0 }}>Verilerin</h2>
            <p style={{ margin: 0, fontSize: 14.5, color: '#3B4A60' }}>KVKK kapsamında hakkında tuttuğumuz bilgilerin bir kopyasını indirebilir ya da hesabını tamamen silebilirsin.</p>
            <div><a className="ikincil-btn" href="/api/hesap/veriler" download>Verilerimi indir</a></div>
            <HesapSilFormu />
          </section>
        </div>
        <aside className="yan-sutun">
          <section className="kart">
            <h2>Kısayollar</h2>
            <nav style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Link href="/arkadas">Arkadaşla oyna</Link>
              <Link href="/siralama">Genel sıralama</Link>
              <Link href="/gunluk">Günün sudokusu</Link>
            </nav>
          </section>
        </aside>
      </main>
    </>
  );
}
