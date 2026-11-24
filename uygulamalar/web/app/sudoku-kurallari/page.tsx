import { UstMenu } from '../../bilesenler/UstMenu.tsx';
import { Yakinda } from '../../bilesenler/Yakinda.tsx';
import { mevcutOyuncu } from '../../sunucu/istek.ts';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Sudoku kuralları' };

export default async function Sayfa() {
  return (
    <>
      <UstMenu oyuncu={await mevcutOyuncu()} aktif={null} />
      <Yakinda baslik="Sudoku kuralları" metin="Her satır, her sütun ve her kalın çizgili kutu rakamları birer kez içermelidir. Ayrıntılı ve görselli kurallar hazırlanıyor." />
    </>
  );
}
