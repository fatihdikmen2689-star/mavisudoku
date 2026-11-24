import { UstMenu } from '../../bilesenler/UstMenu.tsx';
import { Yakinda } from '../../bilesenler/Yakinda.tsx';
import { mevcutOyuncu } from '../../sunucu/istek.ts';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Profil ve ayarlar' };

export default async function Sayfa() {
  return (
    <>
      <UstMenu oyuncu={await mevcutOyuncu()} aktif={null} />
      <Yakinda baslik="Profil ve ayarlar" metin="İstatistiklerin, sıralamada görünüm ayarların ve hesap ayarların burada olacak." />
    </>
  );
}
