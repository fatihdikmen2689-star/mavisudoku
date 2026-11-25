import Link from 'next/link';
import { Reklam } from '../../bilesenler/Reklam.tsx';
import type { Metadata } from 'next';
import { UstMenu } from '../../bilesenler/UstMenu.tsx';
import { ArkadasPaneli } from '../../bilesenler/ArkadasPaneli.tsx';
import { mevcutOyuncu } from '../../sunucu/istek.ts';
import { veritabani } from '../../sunucu/db.ts';
import { macListesi } from '../../sunucu/mac.ts';
import { seriHesapla } from '../../sunucu/oyun.ts';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Arkadaşınla oyna', description: 'Arkadaşını rumuzuyla davet et, aynı sudokuyu aynı anda çözün. İlk bitiren kazanır.' };

export default async function Arkadas({ searchParams }: { searchParams: Promise<{ rakip?: string }> }) {
  const oyuncu = await mevcutOyuncu();
  const db = await veritabani();
  const uye = oyuncu?.tip === 'uye';
  const rakip = (await searchParams).rakip;
  return (
    <>
      <UstMenu oyuncu={oyuncu} aktif="arkadas" seri={uye ? await seriHesapla(db, oyuncu) : 0} />
      <main className="sayfa iki-sutun">
        <div className="ana-sutun">
          <header>
            <h1 style={{ margin: '6px 0 8px', fontSize: 34, fontWeight: 900, color: 'var(--lacivert)' }}>Arkadaşınla oyna</h1>
            <p style={{ margin: 0, fontSize: 17, color: '#3B4A60' }}>Aynı bulmaca, aynı an, iki ekran. Kim önce çözecek?</p>
          </header>
          {uye ? <ArkadasPaneli ilk={await macListesi(db, oyuncu)} rakip={typeof rakip === 'string' ? rakip.slice(0, 20) : undefined} /> : (
            <section className="kart" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <h2 style={{ margin: 0 }}>Bu bölüm üyelere özel</h2>
              <p style={{ margin: 0, color: '#3B4A60' }}>Arkadaşını rumuzuyla davet edebilmen ve arkadaşının seni bulabilmesi için ücretsiz bir hesap gerekiyor.{oyuncu ? ` ${oyuncu.ad} olarak çözdüğün bulmacalar hesabına aktarılır.` : ''}</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                <Link className="ana-btn" href="/kayit">Ücretsiz kayıt ol</Link>
                <Link className="ikincil-btn" href="/giris" style={{ minHeight: 56 }}>Giriş yap</Link>
              </div>
            </section>
          )}
        </div>
        <aside className="yan-sutun">
          <section className="kart">
            <h2>Nasıl oynanır?</h2>
            <ol style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 8, fontSize: 14.5, lineHeight: 1.55 }}>
              <li>Arkadaşının rumuzunu yaz ve seviye seç.</li>
              <li>Arkadaşın daveti 10 dakika içinde kabul eder.</li>
              <li>5 saniyelik geri sayımdan sonra ikiniz de aynı bulmacayı çözmeye başlarsınız.</li>
              <li>İlk doğru çözen kazanır. Maçta ipucu ve duraklatma yoktur.</li>
              <li>Süren, bulmacanın genel sıralamasına da girer.</li>
            </ol>
          </section>
          <Reklam yer="yan" uzun />
        </aside>
      </main>
    </>
  );
}
