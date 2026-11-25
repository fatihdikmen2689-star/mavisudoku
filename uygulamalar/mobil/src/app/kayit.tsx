import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Linking, Platform, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useOturum } from '../lib/oturum.tsx';
import { api, ApiHatasi } from '../lib/api.ts';
import { R, Y } from '../lib/tema.ts';
import { Dugme, Kart, Uyari, Yazi } from '../bilesenler/ortak.tsx';
import { Alan, Onay, formStil } from '../bilesenler/Form.tsx';

const buYil = Number(new Intl.DateTimeFormat('en', { timeZone: 'Europe/Istanbul', year: 'numeric' }).format(new Date()));
const baglanti = (yol: string) => () => void Linking.openURL(`https://mavisudoku.com${yol}`);

export default function Kayit() {
  const { oyuncu, kayit } = useOturum();
  const [f, setF] = useState({ ad: '', soyad: '', rumuz: '', eposta: '', sifre: '', yil: '', gorunen: 'rumuz' as 'rumuz' | 'adsoyad', yasGoster: false, aktar: true, kvkk: false, pazarlama: false });
  const [hatalar, setHatalar] = useState<Record<string, string>>({});
  const [genel, setGenel] = useState<string | null>(null);
  const [rumuz, setRumuz] = useState<{ musait: boolean; neden?: string } | null>(null);
  const [bekle, setBekle] = useState(false);
  const yas = /^\d{4}$/.test(f.yil) ? buYil - Number(f.yil) : null;
  const degis = (k: keyof typeof f) => (v: string | boolean) => { setF((x) => ({ ...x, [k]: v })); setHatalar((h) => ({ ...h, [k]: '' })); setGenel(null); };

  useEffect(() => {
    const r = f.rumuz.trim().toLowerCase();
    if (r.length < 3) { setRumuz(null); return; }
    const t = setTimeout(() => { api<{ musait: boolean; neden?: string }>(`/api/rumuz?ad=${encodeURIComponent(r)}`).then(setRumuz).catch(() => undefined); }, 400);
    return () => clearTimeout(t);
  }, [f.rumuz]);

  const gonder = async () => {
    const h: Record<string, string> = {};
    if (!f.ad.trim()) h.ad = 'Adını yaz.';
    if (!f.soyad.trim()) h.soyad = 'Soyadını yaz.';
    if (f.rumuz.trim().length < 3) h.rumuz = 'Rumuz en az 3 karakter olmalı.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.eposta.trim())) h.eposta = 'Geçerli bir e-posta adresi yaz.';
    if (f.sifre.length < 8) h.sifre = 'Şifre en az 8 karakter olmalı.';
    if (yas === null || yas > 110 || yas < 0) h.yil = 'Doğum yılını 4 haneli yaz (ör. 1995).';
    else if (yas < 13) h.yil = '13 yaşından küçükler üye olamaz; misafir olarak oynamaya devam edebilirsin.';
    if (!f.kvkk) h.kvkk = 'Devam etmek için onaylamalısın.';
    setHatalar(h);
    if (Object.keys(h).length) return;
    setBekle(true);
    try {
      await kayit({ ad: f.ad, soyad: f.soyad, rumuz: f.rumuz.trim().toLowerCase(), eposta: f.eposta, sifre: f.sifre, dogumYili: Number(f.yil),
        gorunen: yas! >= 18 ? f.gorunen : 'rumuz', yasGoster: yas! >= 18 && f.yasGoster, kvkk: f.kvkk, pazarlama: f.pazarlama, aktar: f.aktar });
      router.back();
    } catch (e) {
      if (e instanceof ApiHatasi && e.alan) setHatalar({ [e.alan === 'dogumYili' ? 'yil' : e.alan]: e.message });
      else setGenel(e instanceof ApiHatasi ? e.message : 'Kayıt tamamlanamadı.');
    } finally { setBekle(false); }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 14 }} keyboardShouldPersistTaps="handled">
        <Yazi style={{ fontFamily: Y.kalin, fontSize: 22, color: R.lacivert }}>Skorların kaybolmasın.</Yazi>
        <Alan etiket="Ad" value={f.ad} onChangeText={degis('ad')} hata={hatalar.ad} autoComplete="given-name" textContentType="givenName" />
        <Alan etiket="Soyad" value={f.soyad} onChangeText={degis('soyad')} hata={hatalar.soyad} autoComplete="family-name" textContentType="familyName" />
        <Alan etiket="Rumuz (kullanıcı adı)" value={f.rumuz} onChangeText={degis('rumuz')} autoCapitalize="none" autoCorrect={false}
          hata={hatalar.rumuz || (rumuz && !rumuz.musait ? rumuz.neden : null)} ipucu={rumuz?.musait ? '✓ Bu rumuz kullanılabilir' : 'Küçük harf, rakam, nokta ve alt çizgi; 3–20 karakter.'} />
        <Alan etiket="E-posta" value={f.eposta} onChangeText={degis('eposta')} hata={hatalar.eposta} keyboardType="email-address" autoCapitalize="none" autoComplete="email" textContentType="emailAddress" />
        <Alan etiket="Şifre" value={f.sifre} onChangeText={degis('sifre')} hata={hatalar.sifre} secureTextEntry placeholder="En az 8 karakter" autoComplete="new-password" textContentType="newPassword" />
        <Alan etiket="Doğum yılı" value={f.yil} onChangeText={(t) => degis('yil')(t.replace(/\D/g, '').slice(0, 4))} hata={hatalar.yil} keyboardType="number-pad" placeholder="ör. 1995"
          ipucu="18 yaşından küçüklerin adı ve yaşı sıralamada gösterilmez." />
        {yas !== null && yas >= 18 && (
          <Kart style={{ gap: 2 }}>
            <Text style={{ fontFamily: Y.yari, color: R.lacivert, marginBottom: 4 }}>Sıralamada nasıl görünmek istersin?</Text>
            <Onay radyo secili={f.gorunen === 'rumuz'} onDegis={() => degis('gorunen')('rumuz')}>{`Rumuzumla${f.rumuz ? ` (${f.rumuz.trim().toLowerCase()})` : ''}`}</Onay>
            <Onay radyo secili={f.gorunen === 'adsoyad'} onDegis={() => degis('gorunen')('adsoyad')}>{`Adım soyadımla${f.ad ? ` (${f.ad} ${f.soyad})` : ''}`}</Onay>
            <Onay secili={f.yasGoster} onDegis={degis('yasGoster')}>Yaşım sıralamada görünsün</Onay>
          </Kart>
        )}
        {oyuncu?.tip === 'misafir' && <Onay secili={f.aktar} onDegis={degis('aktar')}>{`${oyuncu.ad} olarak çözdüklerimi hesabıma aktar`}</Onay>}
        <Onay secili={f.kvkk} onDegis={degis('kvkk')}>
          <Text style={formStil.onayYazi}>
            <Text style={{ color: R.mavi, fontFamily: Y.yari }} onPress={baglanti('/kullanim-kosullari')}>Kullanım koşullarını</Text> kabul ediyorum ve{' '}
            <Text style={{ color: R.mavi, fontFamily: Y.yari }} onPress={baglanti('/gizlilik')}>KVKK aydınlatma metnini</Text> okudum. (zorunlu)
          </Text>
        </Onay>
        {!!hatalar.kvkk && <Text style={{ color: R.kirmizi, fontFamily: Y.orta, fontSize: 13 }}>{hatalar.kvkk}</Text>}
        <Onay secili={f.pazarlama} onDegis={degis('pazarlama')}>Turnuva ve yenilik e-postaları almak istiyorum. (isteğe bağlı)</Onay>
        {genel && <Uyari metin={genel} />}
        <Dugme metin="Hesabımı oluştur" onPress={gonder} yukleniyor={bekle} />
        <View style={{ height: 20 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
