// app/(tabs)/hospital.tsx
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type TextProps,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, type Region as RNRegion } from 'react-native-maps';

/** ✅ Region 타입 */
interface Region {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

interface Hospital {
  id: number;
  name: string;
  address: string;
  phone: string;
  latitude: number;
  longitude: number;
  distance?: string;
  rating: number;
  isEmergency: boolean;
  hours: string;
}

/** ✅ 이모지 폰트 폴백 전용 Text */
const EmojiText = ({ style, ...p }: TextProps) => (
  <Text
    {...p}
    style={[
      { fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif' },
      style,
    ]}
  />
);

export default function HospitalScreen() {
  const mapRef = useRef<MapView | null>(null);

  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // ✅ 지도 상태
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState(false);

  const [region, setRegion] = useState<Region>({
    latitude: 37.5665,
    longitude: 126.9780,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  });

  const hospitals: Hospital[] = useMemo(
    () => [
      { id: 1, name: '우리동물병원', address: '서울시 강남구 테헤란로 123', phone: '02-1234-5678', latitude: 37.5765, longitude: 126.988, rating: 4.8, isEmergency: false, hours: '09:00-18:00' },
      { id: 2, name: '24시 응급동물병원', address: '서울시 강남구 강남대로 456', phone: '02-2345-6789', latitude: 37.5565, longitude: 126.993, rating: 4.7, isEmergency: true, hours: '24시간' },
      { id: 3, name: '행복한동물병원', address: '서울시 강남구 선릉로 789', phone: '02-3456-7890', latitude: 37.5815, longitude: 126.968, rating: 4.6, isEmergency: false, hours: '10:00-19:00' },
      { id: 4, name: '사랑동물병원', address: '서울시 강남구 봉은사로 101', phone: '02-4567-8901', latitude: 37.5615, longitude: 126.963, rating: 4.9, isEmergency: false, hours: '09:30-18:30' },
      { id: 5, name: '펫케어 동물병원', address: '서울시 강남구 역삼로 202', phone: '02-5678-9012', latitude: 37.5745, longitude: 126.983, rating: 4.5, isEmergency: false, hours: '08:00-20:00' },
    ],
    []
  );

  // 네비게이션바 숨김
  useEffect(() => {
    const hideNavigationBar = async () => {
      if (Platform.OS === 'android') {
        try {
          const NavigationBar = await import('expo-navigation-bar');
          await NavigationBar.setVisibilityAsync('hidden');
          await NavigationBar.setBehaviorAsync('overlay-swipe');
        } catch (error) {
          console.log('Navigation bar error:', error);
        }
      }
    };
    hideNavigationBar();
  }, []);

  // 위치 권한 + 현재 위치
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('위치 권한', '근처 동물병원을 찾으려면 위치 권한이 필요합니다.');
          setIsLoading(false);
          return;
        }

        const cur = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        setLocation(cur);
        setRegion(prev => ({
          ...prev,
          latitude: cur.coords.latitude,
          longitude: cur.coords.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }));
      } catch (e) {
        console.log('위치 실패:', e);
        Alert.alert('위치 오류', '현재 위치를 가져올 수 없습니다.');
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  // ✅ 위치를 받은 뒤, 지도 준비되면 부드럽게 이동 (state 갱신 최소화)
  useEffect(() => {
    if (!mapReady || !location || !mapRef.current) return;
    const target: RNRegion = {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    };
    mapRef.current.animateToRegion(target, 500);
  }, [mapReady, location]);

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): string => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) ** 2;
    const distance = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return distance.toFixed(1);
  };

  const makePhoneCall = (phone: string) => {
    const url = Platform.OS === 'ios' ? `telprompt:${phone}` : `tel:${phone}`;
    Linking.canOpenURL(url)
      .then(supported => {
        if (supported) return Linking.openURL(url);
        Alert.alert('오류', '전화 기능을 사용할 수 없습니다.');
      })
      .catch(err => {
        console.error('전화 걸기 오류:', err);
        Alert.alert('오류', '전화 연결에 실패했습니다.');
      });
  };

  const openNavigation = (h: Hospital) => {
    const url =
      Platform.OS === 'ios'
        ? `maps://?daddr=${h.latitude},${h.longitude}`
        : `google.navigation:q=${h.latitude},${h.longitude}`;

    Linking.canOpenURL(url)
      .then(supported => {
        if (supported) return Linking.openURL(url);
        return Linking.openURL(`https://maps.google.com/maps?daddr=${h.latitude},${h.longitude}`);
      })
      .catch(error => {
        console.log('네비게이션 오류:', error);
        Alert.alert('오류', '길찾기 앱을 열 수 없습니다.');
      });
  };

  const hospitalsWithDistance = useMemo(() => {
    if (!location) return hospitals;
    return hospitals
      .map(h => ({
        ...h,
        distance: `${calculateDistance(
          location.coords.latitude,
          location.coords.longitude,
          h.latitude,
          h.longitude
        )}km`,
      }))
      .sort((a, b) => {
        const da = parseFloat(a.distance?.replace('km', '') || '999');
        const db = parseFloat(b.distance?.replace('km', '') || '999');
        return da - db;
      });
  }, [hospitals, location]);

  const emergencyHospital = useMemo(
    () => hospitals.find(h => h.isEmergency),
    [hospitals]
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#2E6FF2" />
          <Text style={styles.loadingText}>근처 동물병원을 찾는 중…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#AEC3A9" />
      <SafeAreaView style={styles.container}>
        {/* 검색 & 툴바 */}
        <View style={styles.toolbar}>
          <TouchableOpacity
            style={styles.searchBar}
            activeOpacity={0.8}
            onPress={() => Alert.alert('검색', '검색 기능은 곧 제공됩니다.')}
          >
            <MaterialCommunityIcons name="magnify" size={18} color="#8A8F98" />
            <Text style={styles.searchPlaceholder}>동물병원 검색</Text>
          </TouchableOpacity>

          <View style={styles.filterRow}>
            <TouchableOpacity
              style={styles.filterChip}
              activeOpacity={0.8}
              onPress={() => Alert.alert('기간', '기간 선택은 곧 제공됩니다.')}
            >
              <MaterialCommunityIcons name="calendar-blank-outline" size={16} color="#1B2B28" />
              <Text style={styles.filterText}>오늘 ~ 7일</Text>
              <MaterialCommunityIcons name="pencil-outline" size={16} color="#8A8F98" />
            </TouchableOpacity>

            {emergencyHospital && (
              <TouchableOpacity
                style={styles.emergencyChip}
                activeOpacity={0.85}
                onPress={() =>
                  Alert.alert(
                    '응급상황',
                    `${emergencyHospital.name}으로 연결하시겠습니까?`,
                    [
                      { text: '취소', style: 'cancel' },
                      { text: '전화걸기', onPress: () => makePhoneCall(emergencyHospital.phone) },
                    ]
                  )
                }
              >
                <MaterialCommunityIcons name="alarm-light" size={14} color="#FFF" />
                <Text style={styles.emergencyChipText}>24H</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* 지도 카드 */}
        <View style={styles.mapCard}>
          {mapError ? (
            <View style={styles.mapErrorView}>
              <MaterialCommunityIcons name="map-marker-off" size={48} color="#8A8F98" />
              <Text style={styles.mapErrorText}>지도를 불러올 수 없습니다</Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={() => { setMapError(false); setMapReady(false); }}
              >
                <Text style={styles.retryText}>다시 시도</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <MapView
              ref={mapRef}
              style={styles.map}
              initialRegion={{
                latitude: region.latitude,
                longitude: region.longitude,
                latitudeDelta: region.latitudeDelta,
                longitudeDelta: region.longitudeDelta,
              }}
              provider={Platform.OS === 'ios' ? PROVIDER_GOOGLE : undefined} // ✅ iOS만 강제 Google
              showsUserLocation={!!location}
              showsMyLocationButton
              showsCompass={false}
              showsScale={false}
              // ✅ 무한 로딩 방지: 준비되면 로딩 끄기
              loadingEnabled={!mapReady}
              loadingIndicatorColor="#2E6FF2"
              loadingBackgroundColor="#FFFFFF"
              cacheEnabled
              onMapReady={() => setMapReady(true)}
              onError={(error) => {
                console.log('MapView Error:', error);
                setMapError(true);
              }}
              onLayout={() => console.log('MapView layout complete')}
            >
              {hospitals.map(h => (
                <Marker
                  key={h.id}
                  coordinate={{ latitude: h.latitude, longitude: h.longitude }}
                  title={h.name}
                  description={`⭐ ${h.rating} • ${h.hours}`}
                  pinColor={h.isEmergency ? '#FF5A5F' : '#2E6FF2'}
                  onCalloutPress={() => {
                    Alert.alert(
                      h.name,
                      `${h.address}\n평점: ⭐ ${h.rating}\n운영시간: ${h.hours}`,
                      [
                        { text: '닫기', style: 'cancel' },
                        { text: '전화걸기', onPress: () => makePhoneCall(h.phone) },
                        { text: '길찾기', onPress: () => openNavigation(h) },
                      ]
                    );
                  }}
                />
              ))}
            </MapView>
          )}
        </View>

        {/* 리스트 카드 */}
        <View style={styles.listCard}>
          <View style={styles.listHeaderRow}>
            <Text style={styles.listTitle}>근처 동물병원</Text>
            <Text style={styles.listCount}>{hospitalsWithDistance.length}곳</Text>
          </View>

          <ScrollView
            style={{ flex: 1 }}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 84 }}
          >
            {hospitalsWithDistance.map(h => (
              <View key={h.id} style={[styles.item, h.isEmergency && styles.itemEmergency]}>
                <View style={{ flex: 1 }}>
                  <View style={styles.itemTopRow}>
                    <Text style={styles.itemName} numberOfLines={1}>
                      {h.name} {h.isEmergency && <Text style={styles.itemBadge}>24H</Text>}
                    </Text>
                    <Text style={styles.itemDistance}>{h.distance ?? '-'}</Text>
                  </View>
                  <Text style={styles.itemAddr} numberOfLines={1}>{h.address}</Text>
                  <View style={styles.itemMeta}>
                    <EmojiText style={styles.itemRating}>⭐ {h.rating}</EmojiText>
                    <EmojiText style={styles.itemHours}>🕐 {h.hours}</EmojiText>
                  </View>
                  <EmojiText style={styles.itemPhone}>📞 {h.phone}</EmojiText>
                </View>

                <View style={styles.itemActions}>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => makePhoneCall(h.phone)}>
                    <MaterialCommunityIcons name="phone" size={18} color="#FFF" />
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#1A73E8' }]} onPress={() => openNavigation(h)}>
                    <MaterialCommunityIcons name="navigation" size={18} color="#FFF" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      </SafeAreaView>
    </>
  );
}

const CARD_BG = '#FFFFFF';
const BORDER = '#E6EAF0';
const TEXT = '#1A1A1A';
const SUBTEXT = '#8A8F98';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#AEC3A9',
    paddingTop: (Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) : 0) + 8,
  },

  // 툴바
  toolbar: { paddingHorizontal: 16, paddingBottom: 8 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderColor: BORDER,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 40,
  },
  searchPlaceholder: { color: SUBTEXT, fontSize: 14 },

  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderColor: BORDER,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    height: 34,
  },
  filterText: { color: TEXT, fontSize: 13, fontWeight: '600' },

  emergencyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FF5A5F',
    borderRadius: 999,
    paddingHorizontal: 12,
    height: 34,
  },
  emergencyChipText: { color: '#FFF', fontSize: 12, fontWeight: '800' },

  // 지도 카드
  mapCard: {
    height: 220,
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: CARD_BG,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },

  map: {
    flex: 1,
    minHeight: 200,
  },

  mapErrorView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  mapErrorText: { marginTop: 12, fontSize: 14, color: SUBTEXT, textAlign: 'center' },
  retryButton: { marginTop: 12, paddingHorizontal: 20, paddingVertical: 8, backgroundColor: '#2E6FF2', borderRadius: 8 },
  retryText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },

  // 리스트 카드
  listCard: {
    flex: 1,
    marginTop: 14,
    backgroundColor: CARD_BG,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderColor: BORDER,
  },
  listHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  listTitle: { fontSize: 16, fontWeight: '800', color: TEXT },
  listCount: { fontSize: 12, fontWeight: '700', color: SUBTEXT },

  item: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#FAFBFF',
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 10,
    gap: 12,
  },
  itemEmergency: { borderColor: '#FF5A5F', backgroundColor: '#FFF6F6' },
  itemTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  itemName: { fontSize: 15, fontWeight: '700', color: TEXT, maxWidth: '72%' },
  itemBadge: { fontSize: 11, color: '#FF5A5F', fontWeight: '800' },
  itemDistance: { fontSize: 13, color: '#1A73E8', fontWeight: '800' },
  itemAddr: { fontSize: 13, color: SUBTEXT, marginTop: 2 },
  itemMeta: { flexDirection: 'row', gap: 14, marginTop: 4 },
  itemRating: { fontSize: 13, color: '#F39C12' },
  itemHours: { fontSize: 13, color: SUBTEXT },
  itemPhone: { fontSize: 13, color: '#1A73E8', marginTop: 2 },

  itemActions: { alignItems: 'flex-end', gap: 8 },
  actionBtn: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#27AE60' },

  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: 10, color: SUBTEXT, fontSize: 14 },
});
