# MaviSudoku

Türkçe, ücretsiz, reklamla desteklenen sudoku sitesi ve mobil uygulaması.
Kararların tamamı **MaviSudoku – Proje Özeti** dokümanında, ekran tasarımları **MaviSudoku – Web ve Mobil Tasarım** tuvalindedir.

## Durum: 1. adım tamamlandı

| Parça | Durum |
|---|---|
| Sudoku motoru (`paketler/motor`) | ✅ Yazıldı, 13 test geçiyor, tip kontrolü temiz |
| Bulmaca havuzu aracı (`araclar/havuz-uret.ts`) | ✅ 8 seviye × 60 bulmaca üretildi (`veri/havuz.json`) |
| Tek başına çöz ekranı (`uygulamalar/web-prototip`) | ✅ Oynanabilir önizleme, tarayıcıda test edildi |
| Next.js web sitesi, sunucu, veritabanı | ⏳ Sonraki adım (paket kurulumu gerekiyor) |

## Klasörler

```
paketler/motor/        Sudoku motoru (web, mobil ve sunucu ortak kullanır)
  src/rastgele.ts        Tohumlu rastgele sayı: aynı tohum = aynı bulmaca
  src/izgara.ts          4×4, 6×6, 9×9 ızgara yapısı, satır/sütun/kutu
  src/cozucu.ts          Hızlı çözücü, çözüm sayma (tek çözüm kontrolü)
  src/zorluk.ts          İnsan teknikleriyle çözüp zorluk belirleme
  src/uretici.ts         Bulmaca üretimi ve seviyeye göre seçim
  src/seviyeler.ts       Seviyeler, puan hesabı, hile süre sınırı
  src/dogrulama.ts       Sunucuda çözüm doğrulama
  test/motor.test.ts     Birim testleri
araclar/
  havuz-uret.ts          Seviye başına bulmaca havuzu üretir
  prototip-derle.ts      Önizleme sayfasını tek HTML dosyası olarak derler
uygulamalar/web-prototip/
  oyun.ts                Tek başına çöz ekranının mantığı
  sablon.html            Sayfa şablonu ve stiller
veri/havuz.json          Üretilmiş bulmacalar (her biri tek çözümlü)
dagitim/                 Derlenmiş önizleme sayfası (git'e eklenmez, `npm run prototip` ile üretilir)
otomasyon/n8n-ajanlar/   Yapay zekâ ajanlarının n8n iş akışları, görev tanımları ve kurulum rehberi
```

## Çalıştırma

Node.js 22.18 veya üzeri yeterli; başka paket gerekmez (TypeScript dosyaları Node ile doğrudan çalışır).

```bash
# Testler
cd paketler/motor && node --test test/*.test.ts

# Tip kontrolü (TypeScript kuruluysa)
cd paketler/motor && npx tsc -p tsconfig.json

# Bulmaca havuzu: seviye başına 500 bulmaca
node araclar/havuz-uret.ts 500 veri/havuz.json

# Önizleme sayfasını derle, sonra dagitim/tek-basina.html dosyasını tarayıcıda aç
node araclar/prototip-derle.ts
```

## Zorluk nasıl belirleniyor

Bulmaca, bir insanın kullandığı tekniklerle çözülür; seviye, **gereken en zor tekniğe** göre belirlenir:

| Seviye | Gereken teknikler | İpucu sayısı |
|---|---|---|
| Mini 4×4 / 6×6 | Tek aday | 5–7 / 13–16 |
| Kolay | Tek aday, gizli tekli | 36–40 |
| Orta | Tek aday, gizli tekli | 33 ve altı |
| Zor | + işaretleme (kilitli aday), aday çifti | |
| Uzman | + gizli çift, aday üçlüsü | |
| Usta | + X-Wing, XY-Wing, Swordfish | |
| Ekstrem | Bu tekniklerle çözülemiyor (tek çözümlü ama çok zor) | |

Her bulmacanın tek çözümü olduğu çözücüyle kontrol edilir. Testler, tekniklerin yerleştirdiği her rakamın gerçek çözümle aynı olduğunu da doğrular.

## Puan

`puan = taban × süre çarpanı − hata × %10 taban − ipucu × %15 taban` (en az tabanın %10'u).
Süre çarpanı hedef süre / harcanan süre, 0,5 ile 2 arasında. Seviyenin en az süresinin altındaki çözümler sıralamaya alınmaz.
Değerler `paketler/motor/src/seviyeler.ts` dosyasında; yayından sonra gerçek oyuncu sürelerine göre ayarlanacak.

## Sonraki adım

1. Next.js web uygulaması ve Node.js sunucusu: motor `@mavisudoku/motor` paketi olarak kullanılacak.
2. PostgreSQL: bulmaca havuzu, misafir ve üye kayıtları, bulmaca başına sıralama.
3. Önizlemedeki "Tek başına çöz" mantığı (`oyun.ts`) React bileşenine taşınacak.
