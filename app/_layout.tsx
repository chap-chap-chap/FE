// app/_layout.tsx (RootLayout)
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, Redirect, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useFonts, Sunflower_300Light } from '@expo-google-fonts/sunflower';
import React, { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BYPASS_LOGIN = true; // ✅ 배포 전 반드시 false

export default function RootLayout() {
  const pathname = usePathname();
  const colorScheme = useColorScheme();

  const [fontsLoaded] = useFonts({
    Sunflower_300Light,
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  const [ready, setReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    (async () => {
      if (BYPASS_LOGIN) {
        setSignedIn(true);
        setReady(true);
        return;
      }
      try {
        const flag = await AsyncStorage.getItem('signedIn');
        setSignedIn(flag === 'true');
      } catch (e) {
        // 에러 나도 로그인 안 된 것으로 처리
        setSignedIn(false);
      } finally {
        setReady(true);
      }
    })();
  }, []);

  // 폰트/로그인 상태 로딩될 때는 빈 화면로 두어 깜빡임 방지
  if (!fontsLoaded || !ready) return null;

  // ✅ 로그인 안됐는데 /sign 이 아니면 강제 이동
  if (!signedIn && pathname !== '/sign') {
    return <Redirect href="/sign" />;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="sign" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="dark" />
    </ThemeProvider>
  );
}
