import { UstMenu } from '../../bilesenler/UstMenu.tsx';
import { Yakinda } from '../../bilesenler/Yakinda.tsx';
import { mevcutOyuncu } from '../../sunucu/istek.ts';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Çerez politikası' };

export default async function Sayfa() {
  return (
    <>
      <UstMenu oyuncu={await mevcutOyuncu()} aktif={null} />
      <Yakinda baslik="Çerez politikası" metin="Metnin taslağı hazırlanıyor ve yayından önce bir avukat tarafından kontrol edilecek." />
    </>
  );
}
