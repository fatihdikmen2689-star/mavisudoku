import { UstMenu } from '../../bilesenler/UstMenu.tsx';
import { SifirlamaIstegiFormu } from '../../bilesenler/SifreSifirlamaFormlari.tsx';
import { mevcutOyuncu } from '../../sunucu/istek.ts';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Şifremi unuttum', robots: { index: false } };

export default async function SifremiUnuttum() {
  return (
    <>
      <UstMenu oyuncu={await mevcutOyuncu()} />
      <main className="sayfa">
        <section className="kart" style={{ maxWidth: 480, margin: '20px auto', padding: 28 }}>
          <h1 style={{ margin: '0 0 8px', fontSize: 26, fontWeight: 700, color: 'var(--lacivert)' }}>Şifreni mi unuttun?</h1>
          <p style={{ margin: '0 0 18px', color: 'var(--soluk)' }}>E-posta adresini yaz, sana şifre yenileme bağlantısı gönderelim.</p>
          <SifirlamaIstegiFormu />
        </section>
      </main>
    </>
  );
}
