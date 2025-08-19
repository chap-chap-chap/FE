const { getDefaultConfig } = require('@expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// 웹에서 react-native-maps를 로컬 더미로 치환
if (process.env.EXPO_OS === 'web') {
  config.resolver.alias = {
    ...(config.resolver.alias || {}),
    'react-native-maps': path.resolve(__dirname, 'react-native-maps.web.js'),
  };
}

module.exports = config;
