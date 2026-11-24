import type { SeviyeId } from '@mavisudoku/motor';
import type { SekilId } from './sekiller.ts';

export type Bolum = { baslik?: string; paragraflar?: string[]; liste?: string[]; numarali?: boolean; sekil?: SekilId; not?: string };

export type Taktik = {
  slug: string;
  baslik: string;
  kisaAd: string;
  seviye: SeviyeId;
  ozet: string;
  giris: string;
  bolumler: Bolum[];
};

export const TAKTIKLER: Taktik[] = [
  {
    slug: 'sudoku-nasil-oynanir',
    baslik: 'Sudoku nasıl oynanır? Başlangıç rehberi',
    kisaAd: 'Başlangıç rehberi',
    seviye: 'kolay',
    ozet: 'Kurallar, ilk hamleler ve takılmadan ilerlemenin üç alışkanlığı.',
    giris: 'Sudoku için matematik bilmen gerekmez. Rakamlar burada yalnızca dokuz farklı sembol; toplama çıkarma yok, sadece mantık var.',
    bolumler: [
      {
        baslik: 'Tek kural',
        paragraflar: [
          '9×9 bir ızgarada her satır, her sütun ve kalın çizgiyle ayrılmış her 3×3 kutu, 1\'den 9\'a kadar rakamları birer kez içermelidir. Bulmacanın başında bazı rakamlar verilir; geri kalanları sen yerleştirirsin.',
          'İyi bir sudokunun tek bir çözümü vardır. MaviSudoku\'daki her bulmaca bu açıdan kontrol edilir, yani hiçbir yerde tahmin etmek zorunda kalmazsın; her rakam mantıkla bulunabilir.',
        ],
      },
      {
        baslik: 'İlk hamle: tarama',
        paragraflar: [
          'Bir rakam seç, örneğin 5. Izgarada zaten yerleşmiş 5\'lere bak ve her birinin satırını ve sütununu zihninde çiz. Sonra bir kutuya odaklan: bu çizgilerin kapatmadığı tek bir boş hücre kaldıysa 5 oraya gelir.',
          'Bu yönteme tarama denir ve Kolay seviyedeki bulmacaların büyük kısmı yalnızca bununla çözülür. Rakamları 1\'den 9\'a sırayla taramak iyi bir alışkanlıktır.',
        ],
        sekil: 'gizliTekli',
      },
      {
        baslik: 'Takılmamak için üç alışkanlık',
        numarali: true,
        liste: [
          'Önce en dolu satır, sütun ve kutulara bak. Az boşluk, az ihtimal demektir.',
          'Emin olmadığın hiçbir rakamı yazma. Bir hücre için iki ihtimal görüyorsan not modunu kullan (oyunda N tuşu ya da Not düğmesi).',
          'Her yeni rakamdan sonra o rakamın satırına, sütununa ve kutusuna yeniden bak. Bir yerleşim çoğu zaman bir sonrakini açar.',
        ],
      },
      {
        baslik: 'Sonra ne öğrenmeli?',
        paragraflar: ['Tarama yetmediğinde sıradaki adım bir hücrenin tek adayını bulmaktır. Ardından gizli tekli, işaretleme ve çiftler gelir. Bu sıra, Kolay\'dan Zor\'a giden yolun ta kendisidir.'],
      },
    ],
  },
  {
    slug: 'tek-aday',
    baslik: 'Tek aday: bir hücreye bakarak çözmek',
    kisaAd: 'Tek aday',
    seviye: 'kolay',
    ozet: 'Bir hücrenin satırını, sütununu ve kutusunu birlikte oku; geriye tek rakam kalıyorsa o hücre çözülmüştür.',
    giris: 'Taramada bir rakamı seçip yer ararsın. Tek adayda tersini yaparsın: bir hücre seçer, oraya hangi rakamların gelemeyeceğini sayarsın.',
    bolumler: [
      {
        baslik: 'Nasıl yapılır?',
        paragraflar: [
          'Boş bir hücre seç. Bu hücrenin satırındaki, sütunundaki ve kutusundaki tüm rakamları topla. Toplamda sekiz farklı rakam görüyorsan, eksik olan dokuzuncu rakam bu hücreye gelir.',
          'Örnekte mavi alan, ortadaki hücrenin "gördüğü" bütün hücrelerdir. Satırda 1, 3 ve 9; sütunda 2 ve 6; kutuda 4, 5 ve 8 var. Sekiz rakam görülüyor, eksik olan 7.',
        ],
        sekil: 'tekAday',
      },
      {
        baslik: 'Nerede aramalı?',
        liste: [
          'Üç yönden de kalabalık hücrelere: dolu bir satırla dolu bir sütunun kesiştiği yerler.',
          'Bir rakamı yeni yerleştirdiğin hücrenin komşularına. Yeni rakam, çevresindeki hücrelerin aday sayısını bir azaltır.',
        ],
        not: 'Oyundaki "Aynı rakamları vurgula" özelliği tek adayı görmeyi kolaylaştırır: dolu bir hücreyi seçtiğinde aynı rakamın ızgaradaki bütün kopyaları belirginleşir.',
      },
    ],
  },
  {
    slug: 'gizli-tekli',
    baslik: 'Gizli tekli yöntemi adım adım',
    kisaAd: 'Gizli tekli',
    seviye: 'orta',
    ozet: 'Bir hücrede birkaç aday olsa bile, bir rakam o kutuda yalnızca tek yere sığıyorsa oraya yazılır.',
    giris: 'Bazen bir hücreye 3 ya da 4 farklı rakam gelebilir gibi görünür. Yine de o hücrenin cevabı kesindir, çünkü bir rakamın kutuda başka gidecek yeri kalmamıştır.',
    bolumler: [
      {
        baslik: 'Fikir',
        paragraflar: [
          'Her kutu, her satır ve her sütun 1\'den 9\'a kadar bütün rakamları içermek zorundadır. Bir rakam bir birimde yalnızca tek bir hücreye konabiliyorsa, o hücrede başka adaylar olsa bile cevap o rakamdır. Bu yüzden "gizli" denir: hücreye bakınca değil, rakamın yerlerine bakınca görünür.',
        ],
      },
      {
        baslik: 'Örnek',
        paragraflar: [
          'Sol üst kutuda 5 nereye gelebilir? Turuncu 5\'ler ikinci ve üçüncü satırı, birinci ve ikinci sütunu kapatıyor. Kutudaki boş hücrelerden yalnızca sağ üstteki açık kalıyor; 5 oraya gelir.',
        ],
        sekil: 'gizliTekli',
      },
      {
        baslik: 'Adım adım',
        numarali: true,
        liste: [
          'Bir rakam ve bir kutu seç.',
          'Kutunun dışındaki aynı rakamların satır ve sütunlarını kutunun üzerinden geçir.',
          'Kapanmayan boş hücreleri say. Bir tane kaldıysa rakamı yaz.',
          'Aynı soruyu satırlar ve sütunlar için de sor: "Bu satırda 7 nereye gelebilir?"',
        ],
        not: 'Orta seviyedeki bulmacaların çoğunda kilit hamle bir gizli teklidir. Tek aday bulamadığında rakam rakam bu soruyu sor.',
      },
    ],
  },
  {
    slug: 'isaretleme',
    baslik: 'İşaretleme: bir kutudan satıra aday silmek',
    kisaAd: 'İşaretleme',
    seviye: 'zor',
    ozet: 'Bir rakam bir kutuda yalnızca tek satıra (ya da sütuna) sığıyorsa, o satırın geri kalanından silinebilir.',
    giris: 'Zor seviyede rakamı doğrudan yerleştiremediğin anlar artar. Bu noktada notlar devreye girer ve amaç rakam yazmaktan çok aday silmek olur.',
    bolumler: [
      {
        baslik: 'Kural',
        paragraflar: [
          'Bir kutuda bir rakamın bütün adayları aynı satırdaysa, o rakam kutunun içinde o satıra gelmek zorundadır. Demek ki aynı satırın kutu dışındaki hücrelerine gelemez; oradaki adaylarını silebilirsin. Sütunlar için de aynısı geçerlidir.',
        ],
      },
      {
        baslik: 'Örnek',
        paragraflar: [
          'Ortadaki kutuda üst ve alt satırlar dolu, 6 yalnızca orta satırdaki üç hücreden birine gelebilir. Hangisine geleceğini henüz bilmiyoruz, ama orta satırın 6\'sının bu kutuda olacağı kesin. Bu yüzden satırın soldaki ve sağdaki hücrelerinden 6 adayı silinir; soldakinde yalnızca 2, sağdakinde yalnızca 8 kalır.',
        ],
        sekil: 'isaretleme',
      },
      {
        baslik: 'Ters yönü de var',
        paragraflar: [
          'Bir satırda bir rakamın adayları yalnızca tek bir kutunun içindeyse, o kutunun diğer satırlarından o rakam silinir. İki yönü birlikte kullanmak Zor bulmacalarda çoğu zaman tıkanıklığı açar.',
        ],
      },
    ],
  },
  {
    slug: 'ciplak-cift',
    baslik: 'Çıplak çift: iki hücre, iki rakam',
    kisaAd: 'Çıplak çift',
    seviye: 'zor',
    ozet: 'Aynı birimdeki iki hücrenin adayları aynı iki rakamsa, bu rakamlar birimin geri kalanından silinir.',
    giris: 'Notlarını düzenli tutuyorsan çiftleri görmek kolaylaşır. Çiftler, adayları toplu halde silmenin en sık kullanılan yoludur.',
    bolumler: [
      {
        baslik: 'Neden işe yarar?',
        paragraflar: [
          'Bir satırda iki hücre yalnızca 2 ve 7 alabiliyorsa, biri 2 öbürü 7 olacaktır. Hangisinin hangisi olduğunu bilmesek bile, 2 ve 7 bu iki hücreye ayrılmıştır. Satırdaki başka hiçbir hücre 2 ya da 7 olamaz.',
        ],
        sekil: 'ciplakCift',
      },
      {
        baslik: 'Örnekte ne oldu?',
        paragraflar: [
          'Turuncu hücrelerin adayları {2, 7}. Silme işleminden sonra ortadaki hücrede yalnızca 4, sağdakinde yalnızca 9 kalır. Bir çift sayesinde iki hücre birden çözülmüş olur.',
        ],
      },
      {
        baslik: 'Akrabaları',
        liste: [
          'Çıplak üçlü: üç hücrede toplam üç farklı aday varsa (ör. {1,4}, {1,8}, {4,8}) aynı mantık işler.',
          'Gizli çift: iki rakam bir birimde yalnızca aynı iki hücreye gelebiliyorsa, o iki hücredeki diğer adaylar silinir.',
        ],
        not: 'Uzman seviyesinde üçlüler, Usta seviyesinde X-Wing gibi kalıplar gerekir. Çiftleri rahat görmeden bunlara geçmek zordur.',
      },
    ],
  },
  {
    slug: 'x-wing',
    baslik: 'X-Wing tekniği ile zor bulmacaları aç',
    kisaAd: 'X-Wing',
    seviye: 'usta',
    ozet: 'İki satırda bir rakam yalnızca aynı iki sütuna gelebiliyorsa, bu sütunların geri kalanından silinir.',
    giris: 'X-Wing adını dört köşesinin oluşturduğu dikdörtgenden alır. Tek bir rakama odaklanır; o yüzden bakarken diğer rakamları unutmak işini kolaylaştırır.',
    bolumler: [
      {
        baslik: 'Kalıp',
        paragraflar: [
          'İki satır düşün. İkisinde de 3 yalnızca iki hücreye gelebiliyor ve bu hücreler aynı iki sütunda. Birinci satırın 3\'ü sol sütundaysa ikinci satırınki sağ sütunda olmak zorundadır, ya da tam tersi. Her iki durumda da bu iki sütunun 3\'leri bu iki satıra ayrılmıştır.',
          'Sonuç: iki sütunun diğer satırlarındaki bütün 3 adayları silinir.',
        ],
        sekil: 'xWing',
      },
      {
        baslik: 'Nasıl bulunur?',
        numarali: true,
        liste: [
          'Bir rakam seç ve yalnızca onun adaylarına bak.',
          'O rakamın tam iki adayı olan satırları bul.',
          'Bu satırlardan ikisinin adayları aynı sütunlardaysa X-Wing buldun.',
          'Aynı aramayı sütunlar için yap; o zaman satırlardan silersin.',
        ],
      },
      {
        baslik: 'Bir adım ötesi',
        paragraflar: ['Aynı fikir üç satır ve üç sütunla da çalışır; buna Swordfish denir. Ekstrem seviyedeki bulmacalar bazen bu tür zincirleri gerektirir.'],
      },
    ],
  },
];

export const taktikBul = (slug: string) => TAKTIKLER.find((t) => t.slug === slug) ?? null;
