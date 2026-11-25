import Link from 'next/link';
import { UstMenu } from '../../bilesenler/UstMenu.tsx';
import { YeniSifreFormu } from '../../bilesenler/SifreSifirlamaFormlari.tsx';
import { mevcutOyuncu } from '../../sunucu/istek.ts';
import { veritabani } from '../../sunucu/db.ts';
import { sifirlamaJetonuGecerli } from '../../sunucu/hesap.ts';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Yeni şifre belirle', robots: { index: false }, referrer: 'no-referrer' as const };

export default async function SifreYenile({ searchParams }: { searchParams: Promise<{ jeton?: string }> }) {
  const jeton = (await searchParams).jeton;
  const gecerli = await sifirlamaJetonuGecerli(await veritabani(), jeton);
  return (
    <>
      <UstMenu oyuncu={await mevcutOyuncu()} />
      <main className="sayfa">
        <section className="kart" style={{ maxWidth: 480, margin: '20px auto', padding: 28 }}>
          <h1 style={{ margin: '0 0 8px', fontSize: 26, fontWeight: 700, color: 'var(--lacivert)' }}>Yeni şifre belirle</h1>
          {gecerli ? <YeniSifreFormu jeton={jeton!} /> : (
            <div className="form">
              <p className="uyari" style={{ margin: 0 }}>Bu bağlantı geçersiz, kullanılmış ya da süresi dolmuş.</p>
              <Link className="ana-btn" href="/sifremi-unuttum">Yeni bağlantı iste</Link>
            </div>
          )}
        </section>
      </main>
    </>
  );
}
