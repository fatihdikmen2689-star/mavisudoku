# MaviSudoku Yapay Zekâ Ajan Sistemi: Kurulum Rehberi

Bu paket, mavisudoku.com'un sosyal medyasını, içeriğini, topluluğunu, moderasyonunu ve raporlamasını kendi kendine yürüten 9 yapay zekâ ajanını içerir. Ajanların hepsi **Yönetici Ajan**'a bağlıdır.

**Kurulum bir kez yapılır** (geliştiriciyle birlikte yaklaşık 1–2 gün). Sonrasında sisteme girmeniz gerekmez. Telegram'a yalnızca bilgi mesajları gelir ve bunlara cevap vermek zorunda değilsiniz.

---

## Paket içeriği

| Klasör / dosya | Ne işe yarar |
|---|---|
| `is-akislari/` | n8n'e içe aktarılacak 12 iş akışı (JSON) |
| `ajan-gorev-tanimlari/` | Her ajanın görev tanımı. Bu metinler iş akışlarının içine zaten yerleştirildi; burada okumanız ve düzenlemeniz için ayrıca duruyor |
| `veritabani/01_ajan_tablolari.sql` | Ajanların kullandığı tablolar ve acil durdurma anahtarı |
| `SITE_ADMIN_API.md` | Sitenin geliştiricisinin yazması gereken yönetim API'si ve sunucu tarafı güvenlik sınırları |

## Ajan ekibi

```
                        ┌──────────────────────────┐
  Saatlik zamanlayıcı ─▶│   00 YÖNETİCİ AJAN        │◀─ Site olayları (webhook)
                        │   hafıza + karar + plan   │
                        └────────────┬─────────────┘
   ┌──────────┬──────────┬──────────┼──────────┬──────────┬──────────┬──────────┐
   ▼          ▼          ▼          ▼          ▼          ▼          ▼          ▼
01 Tasarım 02 Sosyal 03 İçerik 04 Moderatör 05 Topluluk 06 Analiz 07 Video 08 Denetçi
 (görsel)   medya     ve SEO    (şikâyet,   (e-posta,  (AdSense, (Reels)  (son onay)
              │       (blog)     yorum,      duyuru)    GA4, SC)
              ▼                  hile)
      09 Meta Yayınla ──▶ Denetçi onayı olmadan Instagram/Facebook'a hiçbir şey gitmez
```

- **10 Telegram Komutları** (isteğe bağlı): `/durum`, `/durdur`, `/baslat`
- **11 Hata Bildirimi:** Bir iş akışı hata verirse Telegram'a bilgi mesajı gönderir.

## Sistemin günlük ritmi (İstanbul saati)

| Saat | Ne olur |
|---|---|
| Her saat | Moderatör şikâyetleri, yorumları ve hile şüphelerini işler |
| 00:00 | Analiz ajanı günlük raporu hazırlar. %30'u aşan bir değişim varsa Telegram'a bildirim gelir |
| 09:00 | Günün bulmacası görseli üretilir, Instagram ve Facebook'ta paylaşılır |
| 13:00 | Yorumlar yanıtlanır, uygunsuz yorumlar gizlenir |
| 19:00 | Serisi bozulmak üzere olan oyunculara hatırlatma e-postası gider |
| 22:00 | Telegram'a günün özeti gelir (bilgi amaçlı) |
| Pzt 08:00 | Haftalık strateji: rapor, haftanın planı, lig şampiyonu paylaşımı |
| Pzt & Per 10:00 | Blog veya taktik yazısı yazılır, denetlenir ve yayınlanır |
| Sal & Cum 12:00 | Turnuva afişi hazırlanır, paylaşılır ve sitede duyuru açılır |
| Sal, Per, Cmt 20:00 | Reels videosu üretilir ve yayınlanır |
| Çar 11:00 | 7 gündür oynamayanlara "seni özledik" e-postası gider |
| Cmt 18:00 | Turnuvaya kayıtlı oyunculara hatırlatma gider |
| Cmt 23:00 | Turnuva şampiyonu kartı paylaşılır |
| Paz 16:00 | Haftalık bülten gönderilir |

Saatleri değiştirmek için 00 Yönetici iş akışındaki **"Görev Planla"** düğümünü düzenleyin.

---

## Kurulum adımları

### 1. n8n'i kurun
- **Seçenek A, kendi sunucunuz (önerilir):** Aylık 5–10 dolarlık bir VPS'e Docker ile n8n kurun. Saat dilimini `GENERIC_TIMEZONE=Europe/Istanbul` olarak ayarlayın.
- **Seçenek B, n8n Cloud:** Kurulum gerektirmez ama aylık ücretlidir.
- **Sürüm:** Güncel bir n8n sürümü kullanın (1.80 veya üzeri). AI Agent düğümü ve `$fromAI` özelliği gereklidir.

### 2. Veritabanını hazırlayın
`veritabani/01_ajan_tablolari.sql` dosyasını MaviSudoku PostgreSQL veritabanında (veya ayrı bir veritabanında) bir kez çalıştırın. İçindeki `BURAYA_GUCLU_BIR_SIFRE` ifadesini değiştirmeyi unutmayın.

### 3. Hesapları açın ve anahtarları alın

| Hizmet | Ne için | Ne alınacak |
|---|---|---|
| Anthropic (console.anthropic.com) | Ajanların yapay zekâ modeli | API anahtarı |
| Telegram (@BotFather) | Size bilgi mesajları | Bot tokeni ve sizin sohbet numaranız (chat id) |
| Meta for Developers | Instagram ve Facebook'ta paylaşım | Instagram işletme hesabına bağlı Facebook sayfası, **süresiz sayfa erişim tokeni**, IG kullanıcı numarası ve FB sayfa numarası |
| Google Cloud | AdSense, GA4 ve Search Console verisi | OAuth istemcisi. Kapsamlar: `analytics.readonly`, `webmasters.readonly`, `adsense.readonly` |
| Bannerbear | Görsel üretimi | API anahtarı ve 7 şablon (aşağıda) |
| Creatomate | Video üretimi | API anahtarı ve 5 şablon (aşağıda) |
| Brevo | E-posta gönderimi | API anahtarı. Bu anahtar **sitede** kullanılır, n8n'de kullanılmaz |

### 4. n8n'de kimlik bilgilerini (credentials) oluşturun

| n8n kimlik adı | Tür | Ayar |
|---|---|---|
| Anthropic (MaviSudoku) | Anthropic | API anahtarı |
| MaviSudoku Postgres | Postgres | Veritabanı bilgileri, kullanıcı `n8n_ajan` |
| MaviSudoku Telegram Bot | Telegram | Bot tokeni |
| MaviSudoku Admin API | Header Auth | Ad: `X-Api-Key`, Değer: site API anahtarı |
| MaviSudoku Webhook Anahtari | Header Auth | Ad: `X-Webhook-Anahtari`, Değer: uzun rastgele bir metin |
| Bannerbear | Header Auth | Ad: `Authorization`, Değer: `Bearer <anahtar>` |
| Creatomate | Header Auth | Ad: `Authorization`, Değer: `Bearer <anahtar>` |
| Meta Sayfa Tokeni | Query Auth | Ad: `access_token`, Değer: süresiz sayfa tokeni |
| Google MaviSudoku | OAuth2 API | Google OAuth istemci bilgileri ve yukarıdaki 3 kapsam |

### 5. İş akışlarını içe aktarın
n8n'de **Workflows → Import from File** ile dosyaları **şu sırayla** içe aktarın: 08, 09, 01, 02, 03, 04, 05, 06, 07, 11, 10, 00.

İçe aktarırken her düğümde kimlik bilgisi sorulursa 4. adımda oluşturduğunuz kimliği seçin.

### 6. İş akışlarını birbirine bağlayın
İçe aktarınca n8n her iş akışına yeni bir numara verir. Aşağıdaki düğümleri açın ve **"Workflow"** alanından doğru iş akışını listeden seçin:

| Hangi iş akışında | Hangi düğüm(ler) | Seçilecek iş akışı |
|---|---|---|
| 00 Yönetici | tasarim_ajani … denetci_ajani (8 araç) | 01 … 08 (adına göre) |
| 02 Sosyal Medya | meta_yayinla | 09 Meta Yayınla |
| 03, 04, 05 | denetci_kontrol | 08 Denetçi |
| 09 Meta Yayınla | Denetçi | 08 Denetçi |

İçe aktarılan dosyalarda bu alanlar `BAGLA_...` yazısıyla işaretlidir.

### 7. Yer tutucuları değiştirin
Aşağıdaki ifadeleri ilgili düğümlerde gerçek değerlerle değiştirin:

| Yer tutucu | Bulunduğu yer | Değer |
|---|---|---|
| `TELEGRAM_CHAT_ID` | 00 (telegram_bildir), 10, 11 | Sizin Telegram sohbet numaranız |
| `IG_KULLANICI_ID` | 02 (ig_yorumlari), 09 (IG düğümleri) | Instagram işletme hesabı numarası |
| `FB_SAYFA_ID` | 09 (Facebook Yayınla) | Facebook sayfa numarası |
| `GA4_PROPERTY_ID` | 06 (ga4_rapor) | GA4 mülk numarası (yalnızca rakamlar) |
| `ADSENSE_HESAP_ID` | 06 (adsense_rapor) | `pub-XXXXXXXXXXXXXXXX` |

### 8. Şablonları bir kez hazırlayın
Bu adım tasarımcıdan **tek seferlik** bir iştir. Ajanlar bu şablonları her gün doldurur.

- **Bannerbear (1080×1350 ve 1080×1920):** `gunun-bulmacasi`, `turnuva-afisi`, `sampiyon-karti`, `lig-karti`, `taktik-karti`, `duyuru`, `kapak-blog`. Katman adları anlamlı olmalı: `baslik`, `alt_metin`, `tarih`, `seviye`, `kullanici`, `sure`.
- **Creatomate (1080×1920, 15–30 sn):** `taktik-30sn`, `rekor`, `beraber-coz`, `turnuva-geri-sayim`, `seviye-meydan-okuma`. Metin alanları `Metin-1`, `Metin-2` gibi adlandırılmalı. Müzik yalnızca lisanslı kütüphaneden seçilmeli.

### 9. Site tarafını tamamlayın
Geliştirici `SITE_ADMIN_API.md` dosyasındaki uç noktaları, sunucu tarafı sınırları ve webhook olaylarını yazar. **Güvenlik kuralları sunucu tarafında uygulanır**, böylece yapay zekâ bir hata yapsa bile sınırları aşamaz.

### 10. Test edin ve açın
1. **Denetçi:** 08 Denetçi'yi elle çalıştırın. Girdiye `{"query": "Instagram paylaşımı: Bugün Zor seviye seni bekliyor! 👉 mavisudoku.com"}` yazın. Sonuçta ONAY veya RED içeren bir JSON görmelisiniz.
2. **Yönetici:** 00 Yönetici'yi elle çalıştırın. Önce tek görevle deneyin: Görev Planla düğümünün çıktısını sabitleyip (pin) "Analiz ajanından günlük rapor al ve Telegram'a gönder" yazın.
3. **Instagram:** İlk gerçek paylaşımı kontrol edin.
4. **Etkinleştirme:** 00, 10 ve 11 iş akışlarını **Active** yapın. 01–09 alt iş akışlarıdır, etkinleştirmeye gerek yoktur.
5. **Hata bildirimi:** Her iş akışının **Settings → Error Workflow** ayarını "11 Hata Bildirimi" olarak seçin.

---

## Güvenlik önlemleri

Sizin onayınız olmadan çalışan bir sistem için şu önlemler sisteme yerleşiktir:

1. **Denetçi Ajan:** Sosyal medyada, blogda, toplu e-postada ve duyurularda yayınlanacak her şey bağımsız bir ajandan geçer. Instagram ve Facebook'ta bu kontrol **atlanamaz**: 09 iş akışı Denetçi'yi kendisi çağırır ve RED gelirse yayın yapmaz.
2. **Sunucu tarafı sınırlar:** Günlük paylaşım, haftalık blog, e-posta sıklığı, susturma ve ban sayıları sitede kilitlidir.
3. **Kısıtlı erişim:** Ajanlar veritabanına doğrudan yazamaz. Silme, ödeme ve hesap ayarı değiştirme gibi araçlar ajanlara hiç verilmemiştir.
4. **18 yaş altı koruması:** Kalıcı ban verilemez, pazarlama e-postası gönderilemez, içeriklerde öne çıkarılmaz.
5. **Acil durumlar:** Çocuk güvenliği, tehdit ve kendine zarar ifadesi gibi durumlarda sistem kendi önlemini alır ve size "🚨 ACİL" mesajı gönderir. Bu mesajlar yasal sorumluluk gerektirebilecek olaylardır; okumanızı öneririz.
6. **Kayıt:** Her ajanın her işlemi `ajan_islem_kaydi` tablosuna yazılır. Telegram'a `/durum` yazarak son işlemleri görebilirsiniz.
7. **Acil durdurma:** Telegram'a `/durdur` yazarsanız bütün otomasyon durur, `/baslat` ile yeniden çalışır. Kullanmak zorunda değilsiniz, ama bir sorun çıkarsa elinizin altında.

## Maliyet tahmini

Kesin maliyet kullanıma göre değişir.
- **Yapay zekâ modeli:** Yönetici her saat çalışır. Moderatör ucuz ve hızlı model kullanır, diğer ajanlar güçlü model kullanır. Fiyatlar için Anthropic'in güncel fiyat sayfasına bakın.
- **Diğer hizmetler:** n8n sunucusu, Bannerbear, Creatomate ve Brevo'nun aylık planları.

**Maliyeti düşürme:** Gece 01:00–07:00 arasında Moderatör kontrolü 3 saatte bire indirilebilir. Bunun için 00'daki "Görev Planla" düğümünde ilk görev satırının başına `if (h < 1 || h > 6 || h % 3 === 0)` koşulu eklenir.

## Ajanların görevlerini değiştirmek

`ajan-gorev-tanimlari/` klasöründeki metinler, her iş akışındaki **Ajan** düğümünün **Options → System Message** alanına yerleştirilmiştir. Bir ajanın davranışını değiştirmek için oradaki metni düzenleyin. Örnek: sosyal medyanın dilini daha resmî yapmak veya hashtag listesini değiştirmek.

## Bilinen sınırlamalar

- **Meta tokeni ve API sürümü:** Meta sayfa tokeni Facebook şifresi değişirse geçersiz olur. Bu durumda 11 Hata Bildirimi sizi uyarır ve token yenilenmelidir. Graph API sürümü (`v21.0`) zamanla eskir; Meta duyurduğunda adreslerde güncellenmelidir.
- **AdSense gecikmesi:** AdSense verisi 1–2 gün gecikmeli gelir. Analiz ajanı bunu raporunda belirtir.
- **n8n sürüm farkları:** Bu dosyalar n8n'in genel iş akışı formatıyla hazırlandı ama gerçek bir n8n kurulumunda içe aktarılarak test edilmedi. İçe aktardıktan sonra bir düğüm uyarı verirse (sürüm farkı), o düğümü açıp aynı ayarlarla yeniden kaydetmek genelde yeterlidir. İlk kurulumda bu yüzden bir geliştiricinin 10. adımı mutlaka yapması gerekir.
