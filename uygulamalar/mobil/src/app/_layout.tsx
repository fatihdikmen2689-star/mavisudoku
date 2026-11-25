import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View } from 'react-native';
import { OturumSaglayici } from '../lib/oturum.tsx';
import { ReklamBaslatici } from '../reklam/Baslatici';
import { R, Y } from '../lib/tema.ts';

export default function KokDuzen() {
  const [yuklendi] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold });
  if (!yuklendi) return <View style={{ flex: 1, backgroundColor: R.lacivert }} />;
  return (
    <SafeAreaProvider>
      <OturumSaglayici>
        <ReklamBaslatici />
        <StatusBar style="light" />
        <Stack screenOptions={{
          headerStyle: { backgroundColor: R.lacivert }, headerTintColor: '#fff',
          headerTitleStyle: { fontFamily: Y.yari, fontSize: 17 }, contentStyle: { backgroundColor: R.zemin },
          headerBackButtonDisplayMode: 'minimal',
        }}>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="oyna/[seviye]" options={{ title: '' }} />
          <Stack.Screen name="bulmaca/[id]" options={{ title: 'Bulmaca' }} />
          <Stack.Screen name="siralama" options={{ title: 'Genel sıralama' }} />
          <Stack.Screen name="giris" options={{ title: 'Giriş yap', presentation: 'modal' }} />
          <Stack.Screen name="kayit" options={{ title: 'Kayıt ol', presentation: 'modal' }} />
          <Stack.Screen name="profil" options={{ title: 'Profil' }} />
        </Stack>
      </OturumSaglayici>
    </SafeAreaProvider>
  );
}
