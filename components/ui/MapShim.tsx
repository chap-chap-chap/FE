// components/ui/MapShim.tsx
import { Platform, View } from 'react-native';

let MapView: any, Marker: any, Polyline: any, PROVIDER_GOOGLE: any;

if (Platform.OS === 'web') {
  const Dummy = (props: any) => (
    <View style={[{ width: '100%', height: 300, backgroundColor: '#eef' }, props.style]} />
  );
  MapView = Dummy;
  Marker = (props: any) => <View {...props} />;
  Polyline = (props: any) => <View {...props} />;
  // 웹에선 문자열로 대체
  PROVIDER_GOOGLE = 'google';
} else {
  const rnMaps = require('react-native-maps');
  MapView = rnMaps.default;
  Marker = rnMaps.Marker;
  Polyline = rnMaps.Polyline;
  // 혹시 버전에 따라 상수 없을 때도 대비
  PROVIDER_GOOGLE = rnMaps.PROVIDER_GOOGLE ?? 'google';
}

// (선택) onLongPress 타입
export type MapEvent = {
  nativeEvent: { coordinate: { latitude: number; longitude: number } };
};

export default MapView;
export { Marker, Polyline, PROVIDER_GOOGLE };
