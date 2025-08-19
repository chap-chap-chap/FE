// react-native-maps.web.d.ts
declare module 'react-native-maps' {
  import * as React from 'react';
  import { ViewProps } from 'react-native';

  export type MapEvent = { nativeEvent: { coordinate: { latitude: number; longitude: number } } };

  export const Marker: React.FC<ViewProps & { coordinate?: { latitude: number; longitude: number } }>;
  export const Polyline: React.FC<ViewProps & { coordinates?: Array<{ latitude: number; longitude: number }> }>;
  export const PROVIDER_GOOGLE: 'google';

  const MapView: React.FC<ViewProps>;
  export default MapView;
}
