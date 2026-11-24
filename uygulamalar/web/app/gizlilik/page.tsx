import { UstMenu } from '../../bilesenler/UstMenu.tsx';
import { Yakinda } from '../../bilesenler/Yakinda.tsx';
import { mevcutOyuncu } from '../../sunucu/istek.ts';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Gizlilik politikası ve KVKK aydınlatma metni' };

export default async function Sayfa() {
  return (
    <>
      <UstMenu oyuncu={await mevcutOyuncu()} aktif={null} />
      <Yakinda baslik="Gizlilik politikası ve KVKK aydınlatma metni" metin="Metnin taslağı hazırlanıyor ve yayından önce bir avukat tarafından kontrol edilecek." />
    </>
  );
}
