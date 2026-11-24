import { UstMenu } from '../../bilesenler/UstMenu.tsx';
import { Yakinda } from '../../bilesenler/Yakinda.tsx';
import { mevcutOyuncu } from '../../sunucu/istek.ts';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Genel sıralama' };

export default async function Sayfa() {
  return (
    <>
      <UstMenu oyuncu={await mevcutOyuncu()} aktif={'siralama'} />
      <Yakinda baslik="Genel sıralama" metin="Günlük, haftalık ve tüm zamanların sıralaması çok yakında burada. Şimdilik her bulmacanın kendi sayfasında sıralamayı görebilirsin." />
    </>
  );
}
