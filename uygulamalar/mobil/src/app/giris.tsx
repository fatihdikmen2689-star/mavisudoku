import { useState } from 'react';
import { KeyboardAvoidingView, Linking, Platform, ScrollView, Text } from 'react-native';
import { router } from 'expo-router';
import { useOturum } from '../lib/oturum.tsx';
import { ApiHatasi } from '../lib/api.ts';
import { R, Y } from '../lib/tema.ts';
import { Dugme, Uyari, Yazi } from '../bilesenler/ortak.tsx';
import { Alan } from '../bilesenler/Form.tsx';

export default function Giris() {
  const { oyuncu, giris } = useOturum();
  const [kimlik, setKimlik] = useState('');
  const [sifre, setSifre] = useState('');
  const [hata, setHata] = useState<string | null>(null);
  const [bekle, setBekle] = useState(false);
  const gonder = async () => {
    if (!kimlik.trim() || !sifre) { setHata('E-posta/rumuz ve şifreni yaz.'); return; }
    setBekle(true);
    try { await giris(kimlik, sifre); router.back(); }
    catch (e) { setHata(e instanceof ApiHatasi ? e.message : 'Giriş yapılamadı.'); }
    finally { setBekle(false); }
  };
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }} keyboardShouldPersistTaps="handled">
        <Alan etiket="E-posta veya rumuz" value={kimlik} onChangeText={(t) => { setKimlik(t); setHata(null); }} autoCapitalize="none" autoCorrect={false} autoComplete="username" textContentType="username" />
        <Alan etiket="Şifre" value={sifre} onChangeText={(t) => { setSifre(t); setHata(null); }} secureTextEntry autoComplete="current-password" textContentType="password" onSubmitEditing={gonder} />
        {hata && <Uyari metin={hata} />}
        <Dugme metin="Giriş yap" onPress={gonder} yukleniyor={bekle} />
        {oyuncu?.tip === 'misafir' && <Yazi style={{ color: R.soluk, fontSize: 13, textAlign: 'center' }}>Giriş yapınca {oyuncu.ad} olarak çözdüklerin hesabına eklenir.</Yazi>}
        <Text accessibilityRole="link" onPress={() => void Linking.openURL('https://mavisudoku.com/sifremi-unuttum')} style={{ textAlign: 'center', fontFamily: Y.yari, color: R.mavi, padding: 6 }}>Şifremi unuttum</Text>
        <Text accessibilityRole="link" onPress={() => router.replace('/kayit')} style={{ textAlign: 'center', fontFamily: Y.yari, color: R.mavi, padding: 6 }}>Hesabın yok mu? Ücretsiz kayıt ol</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
