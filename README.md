# MaviSudoku

Türkçe, ücretsiz, reklamla desteklenen sudoku sitesi ve mobil uygulaması.
Kararların tamamı **MaviSudoku – Proje Özeti** dokümanında, ekran tasarımları **MaviSudoku – Web ve Mobil Tasarım** tuvalindedir.

## Durum: 2. adım tamamlandı

| Parça | Durum |
|---|---|
| Sudoku motoru (`paketler/motor`) | ✅ 13 test geçiyor |
| Bulmaca havuzu (`veri/havuz.json`) | ✅ 8 seviye × 60 bulmaca; havuz bitince sunucu yenisini üretir |
| Next.js web sitesi (`uygulamalar/web`) | ✅ Ana sayfa, oyun ekranı, sonuç ekranı, bulmaca sayfası (sıralama + yorumlar), günün sudokusu, kayıt, giriş |
| Misafir sistemi | ✅ `misafir1234` adıyla oynar, sıralamaya girer; kayıt/giriş yapınca skorları hesabına aktarılır |
| Üyelik | ✅ E-posta, ad soyad, rumuz, doğum yılı; sıralamada ad soyad veya rumuz, isteğe bağlı yaş; 18 yaş altı yalnızca rumuzla görünür |
| Her bulmaca bir kişiye bir kez | ✅ Veritabanı kısıtıyla garanti; önce başkalarının oynadığı bulmacalar verilir |
| Yorumlar ve küfür filtresi | ✅ Yalnızca bulmacayı bitiren üyeler yazar; ağır küfür reddedilir, şüpheli olan onaya düşer |
| Sunucu testleri | ✅ 12 test geçiyor; tarayıcıda uçtan uca akış denendi (misafir oyna → sonuç → sıralama → kayıt + aktarım → yorum → çıkış/giriş, mobil) |
| Taktikler, yazdırılabilir, genel sıralama, profil, yasal metinler | ⏳ "Yakında" sayfası; 3. ve 5. adımda |
| Arkadaşınla oyna | ⏳ 4. adım |
| Mobil uygulama | ⏳ 6. adım |

## Web sitesini çalıştırma

```bash
npm install            # depo kökünde bir kez
npm run dev            # http://localhost:3000
npm test               # motor + sunucu testleri
npm run build && npm start   # üretim derlemesi
```

Veritabanı ayarı ortam değişkenleriyle yapılır (şifreler `.env` dosyasına yazılır, git'e girmez):

| Değişken | Ne işe yarar |
|---|---|
| `DATABASE_URL` | Gerçek PostgreSQL bağlantısı (yayında bu kullanılır) |
| `PGLITE_DIR` | `DATABASE_URL` yoksa gömülü PostgreSQL (PGlite) dosyalarının klasörü; varsayılan `veri/pglite` |
| `MS_DB=bellek` | Testler için bellekte geçici veritabanı |
| `SITE_URL` | Sitenin adresi (varsayılan `https://mavisudoku.com`) |

Tablolar ilk çalıştırmada kendiliğinden kurulur ve havuz yüklenir. Şema: `uygulamalar/web/sunucu/sema.sql`.

## Bilinen sınırlar (yayından önce ele alınacak)

- Çözüm, oyunu çevrimdışı ve gecikmesiz oynatmak için tarayıcıya karıştırılmış olarak gönderilir. Kodu okuyan biri çözebilir. Süre sunucuda da ölçülür ve seviyeye göre en kısa süre sınırı vardır; yine de ilk sıralardaki şüpheli süreleri yönetici ajanı incelemeli.
- Hatalı giriş sınırı sunucu belleğinde tutulur; birden çok sunucuya geçilirse Redis'e taşınmalı.
- Misafir kimliği tarayıcı çerezine bağlıdır; çerez silinirse misafir skoru kaybolur (sonuç ekranı bu yüzden kayda yönlendirir).
- Şifre sıfırlama e-postası henüz yok (e-posta servisi seçilince eklenecek).
- n8n ajan dosyaları henüz gerçek bir n8n kurulumunda denenmedi.

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
uygulamalar/web/         Next.js web sitesi
  app/                   Sayfalar ve API uçları (app/api/...)
  bilesenler/            Ekran parçaları (üst menü, oyun ekranı, formlar)
  sunucu/                Veritabanı, kimlik, oyun dağıtımı, sıralama, yorum, küfür filtresi
  test/                  Sunucu testleri
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
