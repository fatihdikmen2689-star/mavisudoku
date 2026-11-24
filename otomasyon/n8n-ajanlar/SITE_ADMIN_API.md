# MaviSudoku Admin API: geliştirici için sözleşme

Ajanlar oyun veritabanına **doğrudan bağlanmaz**. Tüm okuma ve yazma işlemleri bu API üzerinden yapılır. Böylece sınırlar, izinler ve güvenlik kuralları yapay zekâ ne isterse istesin **sunucuda** uygulanır.

- **Adres:** `https://mavisudoku.com/api/admin`
- **Kimlik doğrulama:** Her istekte `X-Api-Key: <anahtar>` başlığı. Anahtar n8n'de "MaviSudoku Admin API" kimlik bilgisine yazılır.
- **IP kısıtı:** API yalnızca n8n sunucusunun IP adresinden gelen istekleri kabul etmeli.
- **Kayıt:** Her yazma isteği `admin_islem_kaydi` tablosuna (istek, sonuç, zaman) yazılmalı.
- **Hata formatı:** `{"hata": "Türkçe açıklama", "kod": "SINIR_ASILDI" | "YETKI_YOK" | "GECERSIZ"}`. Ajanlar bu mesajı okuyup raporlar.

## Okuma uç noktaları (GET)

| Uç nokta | Dönen veri |
|---|---|
| `/gunun-bulmacasi` | tarih, seviye, bulmaca_no, bağlantı, dünkü çözen sayısı, ortalama süre |
| `/haftanin-sampiyonu` | görünen ad (yalnızca herkese açık profiller), puan, çözüm sayısı, en iyi süre |
| `/turnuva/aktif` · `/turnuva/son-sonuc` | tarih, seviye, katılımcı, ilk 3 (görünen ad, süre) |
| `/lig/son-sonuc` | her lig için şampiyon ve yükselen oyuncu sayısı |
| `/istatistik?donem=gun\|hafta\|ay&karsilastir=evet` | aktif oyuncu, maç, yeni kayıt, Rakip Ara bekleme süresi, Beraber Çöz oda sayısı, seri dağılımı, önceki dönemle fark |
| `/icerik?tur=sosyal&gun=14` | ajan_islem_kaydi tablosunda `meta_yayin` kayıtlarından son paylaşımlar |
| `/blog?limit=200` | başlık, slug, yayın tarihi |
| `/sikayetler?durum=bekliyor&limit=100` | şikâyet_id, mesaj metni, bağlam (önceki 5 mesaj), şikâyet eden/edilen id |
| `/kullanici/{id}/gecmis` | ihlal geçmişi, hesap yaşı (gün), `yas_18_alti` (true/false), son 30 mesaj. **E-posta, gerçek ad ve doğum yılı döndürülmez.** |
| `/yorumlar?durum=onay-bekliyor` | yorum_id, metin, bulmaca_no, kullanıcı_id |
| `/hile-supheleri?durum=bekliyor` | oyun_id, kullanıcı_id, süre, seviye, şüphe nedeni |
| `/oyuncular/segment?ad=...` | kişi sayısı, izinli kişi sayısı, örnek özet (kişisel veri yok) |

## Yazma uç noktaları (POST) ve sunucu tarafı sınırlar

| Uç nokta | Gövde | Sunucunun uygulaması gereken kurallar |
|---|---|---|
| `/blog` | baslik, slug, meta_aciklama, html, etiketler, denetci_onayi | `denetci_onayi` true değilse reddet. **Haftada en fazla 3 yazı.** HTML'i temizle (script ve iframe kaldır). sitemap.xml'i güncelle. |
| `/moderasyon` | kullanici_id, islem, tur, sure_saat, hedef_id, gerekce, acil, denetci_onayi | Susturma en fazla 168 saat. `ban` için `denetci_onayi` true olmalı. **18 yaş altına ban reddedilir.** Günde en fazla 50 susturma ve 10 ban. Gerekçe zorunlu. |
| `/yorum/karar` | yorum_id, karar, gerekce | — |
| `/eposta/kampanya` | segment, konu, html, tur, denetci_onayi | Pazarlama e-postası yalnızca izin vermiş kullanıcılara gider. 18 yaş altına yalnızca `hizmet` türü gider. Kişi başı günde 1, haftada 3 e-posta. Abonelikten çıkma bağlantısını sunucu ekler. Gönderim Brevo üzerinden yapılır. 500 kişiden büyük segmentte `denetci_onayi` zorunlu. |
| `/duyuru` | baslik, metin, baglanti, bitis, denetci_onayi | Aynı anda en fazla 1 duyuru açık olur. Bitiş zamanı en fazla 7 gün sonrası olabilir. |

**API'de bulunmaması gerekenler:** silme işlemleri, kullanıcı e-postası veya gerçek adı döndüren uç noktalar, ödeme ve ayar değiştirme uç noktaları.

## Siteden n8n'e anlık olay gönderme (webhook)

Site önemli olayları n8n'e iletir:

```
POST https://<n8n-adresiniz>/webhook/mavisudoku-olay
Başlık: X-Webhook-Anahtari: <anahtar>   (n8n'de "MaviSudoku Webhook Anahtari" kimliği)
Gövde: {"tur": "sikayet_acil" | "site_alarm" | "turnuva_bitti" | "rekor", ...ayrıntılar}
```

- **sikayet_acil:** Küfür filtresi çocuk güvenliği, tehdit veya kendine zarar kelimelerini yakaladığında anında gönderilir.
- **site_alarm:** Hata oranı %5'i geçtiğinde veya yanıt süresi 3 saniyeyi aştığında gönderilir (en fazla 15 dakikada bir).
- **turnuva_bitti:** Cumartesi turnuvası sona erdiğinde gönderilir.
- **rekor:** Bir seviyede tüm zamanların en hızlı çözümü yapıldığında gönderilir.
