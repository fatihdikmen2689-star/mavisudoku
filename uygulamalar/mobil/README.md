# MaviSudoku mobil uygulama (Android ve iPhone)

Expo (React Native) ile tek kod tabanı. Web sitesiyle **aynı sunucuyu** kullanır: hesaplar, sıralamalar,
"her bulmaca bir kez" kuralı, günün sudokusu ve seri ortaktır. Sudoku motoru `paketler/motor` ortak pakettir.

## Ekranlar

| Ekran | Dosya |
|---|---|
| Ana sayfa: günün sudokusu, kaldığın yerden devam, seviyeler, bugünün en hızlıları | `src/app/index.tsx` |
| Oyun: not, geri al, sil, ipucu, hata gösterimi, süre (arka planda durur), sonuç | `src/app/oyna/[seviye].tsx` |
| Bulmacanın sıralaması ve yorumları | `src/app/bulmaca/[id].tsx` |
| Genel sıralama | `src/app/siralama.tsx` |
| Giriş, kayıt (misafir skorları aktarılır) | `src/app/giris.tsx`, `src/app/kayit.tsx` |
| Profil, reklam tercihleri, çıkış, **hesabı silme** (App Store şartı) | `src/app/profil.tsx` |

Uygulama çerez kullanmaz: oturum jetonu iOS Anahtar Zinciri / Android Keystore'da (expo-secure-store) saklanır
ve `Authorization: Bearer uye.<jeton>` başlığıyla gönderilir. İlk açılışta otomatik misafir kimliği alınır.

## Reklamlar (AdMob)

- Açılışta Google'ın onay aracı (UMP) gerekiyorsa onay formunu gösterir; onay yoksa reklam istenmez.
- Alt şerit reklam: ana sayfa, oyun, sıralama ekranları. **Mini 4×4 ve 6×6 (çocuk) seviyelerinde reklam yok.**
- Tam ekran reklam: yalnızca oyuncu sonucu gördükten sonra "Sıradaki bulmaca"ya basınca, en fazla her 3 çözümde
  bir ve arada en az 3 dakika. Oyun sırasında asla çıkmaz.
- Reklam içeriği aile dostu (PG) ile sınırlı.
- Şu an **Google'ın test kimlikleri** kullanılıyor. AdMob hesabı açılınca:
  1. `app.json` içinde `react-native-google-mobile-ads` eklentisindeki `androidAppId` ve `iosAppId` değerlerini gerçek uygulama kimlikleriyle değiştirin.
  2. Reklam birimi kimliklerini EAS ortam değişkeni olarak girin: `EXPO_PUBLIC_ADMOB_BANNER_ANDROID`, `EXPO_PUBLIC_ADMOB_BANNER_IOS`, `EXPO_PUBLIC_ADMOB_GECIS_ANDROID`, `EXPO_PUBLIC_ADMOB_GECIS_IOS`.

## Çalıştırma

AdMob yerel (native) kod içerdiği için uygulama **Expo Go'da çalışmaz**; bir geliştirme derlemesi gerekir.

```bash
cd uygulamalar/mobil
npm install
npx eas-cli@latest build --profile development --platform android   # telefona kurulacak geliştirme sürümü
npx expo start --dev-client                                          # kodu canlı yükler
```

Yerel sunucuya bağlanmak için: `EXPO_PUBLIC_API_ADRESI=http://BILGISAYARIN_IP_ADRESI:3000 npx expo start --dev-client`

Kontroller: `npm run tip` (TypeScript), `npm run web-cikti` (web paketini derler; tarayıcıda denemek içindir, reklam yoktur).

## Mağazaya gönderme

1. Hesaplar: **Google Play Console** (tek seferlik 25 $) ve **Apple Developer Program** (yıllık 99 $). Expo hesabı ücretsiz.
2. `npx eas-cli@latest build --profile production --platform all` (imzalama anahtarlarını EAS yönetir).
3. `npx eas-cli@latest submit --platform android` / `--platform ios`.
4. Mağaza sayfaları için gerekenler: gizlilik politikası adresi (`https://mavisudoku.com/gizlilik`), hesap silme
   adresi (uygulama içinde Profil → Hesabı sil; web'de `https://mavisudoku.com/profil`), veri güvenliği formu
   (e-posta, ad, doğum yılı, oyun verileri; reklam kimliği), yaş derecelendirmesi anketi, ekran görüntüleri.

Uygulama kimliği: `com.mavisudoku.app` (Android ve iOS).
