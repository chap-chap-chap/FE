import 'dotenv/config';

export default ({ config }) => ({
  // 기존 app.json 내용 그대로 이관 + 보완
  name: '산책가자',
  slug: 'sancheck-gaja',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  splash: {
    image: './assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#ffffff'
  },
  assetBundlePatterns: ['**/*'],

  // 🔗 딥링크/링킹 경고 해결용
  scheme: 'sancheckgaja',

  ios: {
    supportsTablet: true,
    // 🗺 iOS Google Maps 키 (환경변수)
    config: {
      googleMapsApiKey: process.env.GOOGLE_MAPS_IOS_KEY
    }
  },

  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#ffffff'
    },
    package: 'com.hanguyun.sancheckgaja',
    // 🗺 Android Google Maps 키 (환경변수)
    config: {
      googleMaps: {
        apiKey: process.env.GOOGLE_MAPS_ANDROID_KEY
      }
    }
  },

  androidStatusBar: { hidden: true },
  androidNavigationBar: { visible: false },

  web: { favicon: './assets/favicon.png' },

  plugins: [
    'expo-font',
    ['expo-navigation-bar', { visible: false }],
    'expo-secure-store'
  ],

  // 📡 API 베이스 (현재 값 유지)
  extra: {
    SPRING_API: 'http://192.168.75.231:8078',
    FAST_API: 'http://192.168.75.231:8077',
    eas: { projectId: 'cbb42f5d-37f2-49c8-90dd-77ed39c85c8b' }
  }
});
