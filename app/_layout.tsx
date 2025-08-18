import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useFonts, Sunflower_300Light } from '@expo-google-fonts/sunflower';

const BYPASS_LOGIN = false; // ← 로그인 임시 우회(배포 전엔 false)

export default function RootLayout() {
  const colorScheme = useColorScheme();

  const [loaded] = useFonts({
    Sunflower_300Light,
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });
  if (!loaded) return null;

  const initial = BYPASS_LOGIN ? '(tabs)' : 'sign';

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack initialRouteName={initial} screenOptions={{ headerShown: false }}>
        {/* 우회 중엔 sign 스크린을 아예 등록하지 않아 왕복을 차단 */}
        {!BYPASS_LOGIN && <Stack.Screen name="sign" options={{ headerShown: false }} />}
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="dark" />
    </ThemeProvider>
  );
}
