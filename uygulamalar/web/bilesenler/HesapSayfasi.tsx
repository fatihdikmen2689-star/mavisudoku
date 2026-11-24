import Link from 'next/link';
import { redirect } from 'next/navigation';
import { UstMenu } from './UstMenu.tsx';
import { KayitFormu, GirisFormu } from './HesapFormlari.tsx';
import { mevcutOyuncu } from '../sunucu/istek.ts';
import { veritabani } from '../sunucu/db.ts';
import { oyuncuOzeti } from '../sunucu/oyun.ts';
import { buYil } from '../sunucu/kimlik.ts';

export async function HesapSayfasi({ sekme }: { sekme: 'kayit' | 'giris' }) {
  const oyuncu = await mevcutOyuncu();
  if (oyuncu?.tip === 'uye') redirect('/');
  const ozet = await oyuncuOzeti(await veritabani(), oyuncu);
  const cozulen = Object.values(ozet.seviyeler).reduce((t, s) => t + (s?.cozulen ?? 0), 0);
  const misafirAdi = oyuncu?.tip === 'misafir' ? oyuncu.ad : null;
  return (
    <>
      <UstMenu oyuncu={oyuncu} />
      <main className="sayfa iki-sutun" style={{ gap: 32 }}>
        <section style={{ flex: '1 1 300px', paddingTop: 12 }}>
          <h1 style={{ margin: '0 0 14px', fontSize: 34, lineHeight: 1.15, fontWeight: 900, color: 'var(--lacivert)' }}>Skorların kaybolmasın.</h1>
          <ul style={{ listStyle: 'none', margin: '0 0 22px', padding: 0, display: 'flex', flexDirection: 'column', gap: 14, fontSize: 16 }}>
            {['Serin ve istatistiklerin her cihazda seninle', 'Bulmacalara yorum yaz, taktiğini paylaş', 'Sıralamada ad soyadınla ya da rumuzunla görün', 'Yakında: arkadaşlarını kullanıcı adıyla davet et'].map((m) => (
              <li key={m} style={{ display: 'flex', gap: 12 }}><span style={{ width: 28, height: 28, flex: 'none', borderRadius: '50%', background: 'var(--mavi)', color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 900, fontSize: 14 }} aria-hidden="true">✓</span>{m}</li>
            ))}
          </ul>
          {misafirAdi && cozulen > 0 && <div style={{ padding: '14px 16px', borderRadius: 14, background: '#FFF6EC', border: '1px solid #F5D2AE', fontSize: 14, color: '#5A2E00' }}><strong>{misafirAdi}</strong> olarak çözdüğün {cozulen} bulmaca{ozet.seri ? ` ve ${ozet.seri} günlük serin` : ''} hesabına aktarılacak.</div>}
        </section>
        <section className="kart" style={{ flex: '1 1 440px', padding: 28 }} aria-label="Hesap formu">
          <nav className="sekmeler" aria-label="Kayıt veya giriş">
            <Link href="/kayit" aria-current={sekme === 'kayit' ? 'page' : undefined}>Kayıt ol</Link>
            <Link href="/giris" aria-current={sekme === 'giris' ? 'page' : undefined}>Giriş yap</Link>
          </nav>
          {sekme === 'kayit' ? <KayitFormu misafirAdi={misafirAdi} yil={buYil()} /> : <GirisFormu misafirAdi={misafirAdi} />}
        </section>
      </main>
    </>
  );
}
