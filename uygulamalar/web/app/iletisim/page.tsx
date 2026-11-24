import { UstMenu } from '../../bilesenler/UstMenu.tsx';
import { Yakinda } from '../../bilesenler/Yakinda.tsx';
import { mevcutOyuncu } from '../../sunucu/istek.ts';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'İletişim' };

export default async function Sayfa() {
  return (
    <>
      <UstMenu oyuncu={await mevcutOyuncu()} aktif={null} />
      <Yakinda baslik="İletişim" metin="İletişim bilgileri yayına alırken eklenecek." />
    </>
  );
}
