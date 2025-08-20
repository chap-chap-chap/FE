// app/_layout.tsx
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, Redirect, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useFonts, Sunflower_300Light } from '@expo-google-fonts/sunflower';
import React, { useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';

const BYPASS_LOGIN = false; // 배포 전 반드시 false

export default function RootLayout() {
  const pathname = usePathname();
  const colorScheme = useColorScheme();

  const [fontsLoaded] = useFonts({
    Sunflower_300Light,
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  // ✅ 부팅용 플래그(최초 1회만 null 렌더 허용)
  const [booting, setBooting] = useState(true);
  const [signedIn, setSignedIn] = useState(false);

  const readSignedIn = useCallback(async () => {
    if (BYPASS_LOGIN) {
      setSignedIn(true);
      return;
    }
    try {
      const flag = await AsyncStorage.getItem('signedIn');
      setSignedIn(flag === 'true');
    } catch {
      setSignedIn(false);
    }
  }, []);

  // 최초 부팅: 스토리지 읽고 부팅 완료
  useEffect(() => {
    (async () => {
      await readSignedIn();
      setBooting(false);
    })();
  }, [readSignedIn]);

  // 포그라운드 복귀 시: 화면 유지한 채로 상태만 갱신(절대 null 렌더 X)
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') {
        readSignedIn();
      }
    });
    return () => sub.remove();
  }, [readSignedIn]);

  // 폰트 or 최초 부팅 중엔 한 번만 스플래시로 비워둠
  if (!fontsLoaded || booting) return null;

  // 현재 위치
  const inAuth = (pathname ?? '') === '/sign';

  // 가드: 비로그인인데 /sign 이 아니면 /sign 으로
  if (!signedIn && !inAuth) {
    return <Redirect href="/sign" />;
  }
  // 가드: 로그인 상태에서 /sign 접근 시 탭으로
  if (signedIn && inAuth) {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="sign" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
