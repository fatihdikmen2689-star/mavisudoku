import Link from 'next/link';
import type { Metadata } from 'next';
import { UstMenu } from '../../bilesenler/UstMenu.tsx';
import { TaktikIzgara } from '../../bilesenler/TaktikIzgara.tsx';
import { mevcutOyuncu } from '../../sunucu/istek.ts';
import { TAM_IZGARA, satirHucreleri, sutunHucreleri, kutuHucreleri } from '../../lib/sekiller.ts';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Sudoku kuralları', description: 'Sudoku kuralları: her satır, sütun ve 3×3 kutu 1-9 rakamlarını birer kez içerir. Mini 4×4 ve 6×6 kuralları, puanlama ve sıralama.', alternates: { canonical: '/sudoku-kurallari' } };

const tam = Object.fromEntries(TAM_IZGARA.map((v, i) => [i, v]));

export default async function Kurallar() {
  return (
    <>
      <UstMenu oyuncu={await mevcutOyuncu()} />
      <main className="sayfa">
        <article className="makale" style={{ margin: '0 auto', maxWidth: 820 }}>
          <h1>Sudoku kuralları</h1>
          <p className="giris-metni">Sudokunun tek bir kuralı var: her satır, her sütun ve kalın çizgili her kutu, rakamları birer kez içermelidir.</p>
          <h2>9×9 sudoku</h2>
          <p>Izgara 9 satır, 9 sütun ve 3×3 boyutunda 9 kutudan oluşur. Her birinde 1, 2, 3, 4, 5, 6, 7, 8 ve 9 rakamları tam olarak bir kez bulunur. Aşağıda tamamen çözülmüş bir ızgarada bir satır, bir sütun ve bir kutu işaretli.</p>
          <div className="sekil-uclu">
            <TaktikIzgara sekil={{ rakamlar: tam, bolge: satirHucreleri(1), aciklama: 'Satır: 1–9 birer kez' }} />
            <TaktikIzgara sekil={{ rakamlar: tam, bolge: sutunHucreleri(6), aciklama: 'Sütun: 1–9 birer kez' }} />
            <TaktikIzgara sekil={{ rakamlar: tam, bolge: kutuHucreleri(4), aciklama: 'Kutu: 1–9 birer kez' }} />
          </div>
          <h2>Mini sudoku (4×4 ve 6×6)</h2>
          <p>Kural aynıdır, yalnızca rakam sayısı azalır. 4×4 ızgarada 1–4 rakamları ve 2×2 kutular, 6×6 ızgarada 1–6 rakamları ve 2×3 kutular kullanılır. Çocuklar ve sudokuyu yeni öğrenenler için idealdir; <Link href="/yazdirilabilir">yazdırılabilir</Link> olarak da indirebilirsin.</p>
          <h2>MaviSudoku&apos;da puan ve sıralama</h2>
          <ul>
            <li>Her bulmaca sana yalnızca bir kez gelir ve ilk denemen sıralamaya girer. Yarım bıraktığın bulmaca kaldığı yerden devam eder; süren de kaldığı yerden sayılır.</li>
            <li>Puan; seviyeye, süreye, hata ve ipucu sayısına göre hesaplanır. Hedef süreden hızlı bitirirsen puanın artar, her hata ve ipucu puanı düşürür.</li>
            <li>Sıralama puana göre yapılır; puanlar eşitse daha kısa sürede bitiren öne geçer.</li>
            <li>Her gün bir &quot;Günün Sudokusu&quot; seçilir. Her gün en az bir bulmaca çözersen serin büyür.</li>
          </ul>
          <p>Teknikleri öğrenmek için <Link href="/taktikler">taktik yazılarına</Link> göz at.</p>
        </article>
      </main>
    </>
  );
}
