// react-native-maps.web.js
import { View } from 'react-native';

const Dummy = (props) => (
  <View style={[{ width: '100%', height: 300, backgroundColor: '#eef' }, props.style]} />
);

export const Marker = (props) => <View {...props} />;
export const Polyline = (props) => <View {...props} />;
export const PROVIDER_GOOGLE = 'google';
export default Dummy;
