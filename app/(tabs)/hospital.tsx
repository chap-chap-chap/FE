// app/(tabs)/hospital.tsx
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
  TextInput,
  TouchableOpacity,
  View,
  type TextProps,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, type Region as RNRegion } from 'react-native-maps';

/* ===================== 서버 설정 ===================== */
const BASE_URL = 'https://www.shallwewalk.kro.kr';
const HISTORY_KEY = '@hospital_search_history_v1';

// 서버가 API Key도 받는 구조라면 여기 설정(없으면 빈 문자열 유지)
const API_KEY = ''; // 예: 'abc123'  → 헤더 X-API-Key로 전송

/** ✅ Region 타입 */
interface Region {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

/** ✅ 서버 응답 타입 */
type ApiHospital = {
  placeId: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  distanceKm?: number;
  rating?: number;
  userRatingsTotal?: number;
  openNow?: boolean;
  openingHours?: string;
  phone?: string | null;
};
type ApiResponse = { count: number; information: ApiHospital[] };

interface Hospital {
  id: string;
  name: string;
  address: string;
  phone: string;
  latitude: number;
  longitude: number;
  distance?: string;
  rating: number;
  isEmergency: boolean;
  hours: string;
  openNow?: boolean;
}

/** ✅ 이모지 폰트 폴백 전용 Text */
const EmojiText = ({ style, ...p }: TextProps) => (
  <Text
    {...p}
    style={[{ fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif' }, style]}
  />
);

/* ===================== 토큰 읽어서 Authorization 헤더 구성 ===================== */
const ACCESS_TOKEN_KEYS = ['accessToken', 'ACCESS_TOKEN', 'token', 'jwt', 'Authorization'];

async function buildAuthHeaders() {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  for (const k of ACCESS_TOKEN_KEYS) {
    const v = await AsyncStorage.getItem(k);
    if (v) {
      headers.Authorization = v.startsWith('Bearer ') ? v : `Bearer ${v}`;
      break;
    }
  }
  if (API_KEY) headers['X-API-Key'] = API_KEY;
  return headers;
}

export default function HospitalScreen() {
  const mapRef = useRef<MapView | null>(null);

  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [isBootLoading, setIsBootLoading] = useState(true);

  // 지도/네트워크 상태
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // API 필터
  const [openNow, setOpenNow] = useState(false);

  // 검색 & 검색 기록
  const [searchText, setSearchText] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<string[]>([]);

  // ✅ 지도 “제어 모드” 영역
  const [region, setRegion] = useState<Region>({
    latitude: 37.5665,
    longitude: 126.978,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  });

  // 병원 데이터
  const [hospitals, setHospitals] = useState<Hospital[]>([]);

  /* ========== 유틸 ========== */
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

  const parseHours = (openingHours?: string): string => {
    if (!openingHours) return '-';
    try {
      const arr = JSON.parse(openingHours) as string[];
      if (Array.isArray(arr) && arr.length) return arr.join(' · ');
    } catch {}
    return openingHours;
  };

  const guessEmergency = (name: string, hours: string): boolean => {
    const t = `${name} ${hours}`.toLowerCase();
    return /24|응급|emergency/.test(t);
  };

  const recenterMyLocation = () => {
    if (!location) return;
    const next: RNRegion = {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    };
    setRegion(next);
    mapRef.current?.animateToRegion(next, 450);
  };

  /* ========== 전화/네비 ========== */
  const makePhoneCall = (phone: string) => {
    if (!phone || phone === '정보없음') return Alert.alert('전화번호가 없습니다.');
    const url = Platform.OS === 'ios' ? `telprompt:${phone}` : `tel:${phone}`;
    Linking.canOpenURL(url)
      .then(supported => supported ? Linking.openURL(url) : Alert.alert('오류', '전화 기능을 사용할 수 없습니다.'))
      .catch(() => Alert.alert('오류', '전화 연결에 실패했습니다.'));
  };

  const openNavigation = (h: Hospital) => {
    const url = Platform.OS === 'ios'
      ? `maps://?daddr=${h.latitude},${h.longitude}`
      : `google.navigation:q=${h.latitude},${h.longitude}`;
    Linking.canOpenURL(url)
      .then(supported => supported
        ? Linking.openURL(url)
        : Linking.openURL(`https://maps.google.com/maps?daddr=${h.latitude},${h.longitude}`))
      .catch(() => Alert.alert('오류', '길찾기 앱을 열 수 없습니다.'));
  };

  /* ========== 검색 기록 ========== */
  const loadHistory = async () => {
    try {
      const raw = await AsyncStorage.getItem(HISTORY_KEY);
      if (raw) setHistory(JSON.parse(raw));
    } catch {}
  };

  const pushHistory = async (q: string) => {
    const v = q.trim();
    if (!v) return;
    try {
      const next = [v, ...history.filter(x => x !== v)].slice(0, 10);
      setHistory(next);
      await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(next));
    } catch {}
  };

  const clearHistory = async () => {
    try {
      await AsyncStorage.removeItem(HISTORY_KEY);
      setHistory([]);
    } catch {}
  };

  /* ========== 위치 권한 & 초기화 ========== */
  useEffect(() => {
    (async () => {
      await loadHistory();
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('위치 권한', '근처 동물병원을 찾으려면 위치 권한이 필요합니다.');
          setIsBootLoading(false);
          return;
        }
        const cur = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setLocation(cur);
        setRegion(prev => ({
          ...prev,
          latitude: cur.coords.latitude,
          longitude: cur.coords.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }));
      } catch {
        Alert.alert('위치 오류', '현재 위치를 가져올 수 없습니다.');
      } finally {
        setIsBootLoading(false);
      }
    })();
  }, []);

  /* ========== API 호출 ========== */
  const fetchHospitals = async () => {
    if (!location) return;
    setIsFetching(true);
    setFetchError(null);
    try {
      const body = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        openNow,
      };
      const headers = await buildAuthHeaders();
      const res = await fetch(`${BASE_URL}/api/place/hospital`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });

      // 401 → 로그인 필요 or 토큰 만료
      if (res.status === 401) {
        const t = await res.text().catch(() => '');
        setFetchError('로그인이 필요하거나 토큰이 만료되었습니다. 다시 로그인해주세요.');
        setHospitals([]);
        console.log('401 body:', t);
        return;
      }
      if (!res.ok) {
        const t = await res.text().catch(() => '');
        throw new Error(`HTTP ${res.status} ${t}`);
      }

      const data = (await res.json()) as ApiResponse;

      const mapped: Hospital[] = (data.information ?? []).map((it) => {
        const hours = parseHours(it.openingHours);
        return {
          id: it.placeId,
          name: it.name,
          address: it.address,
          phone: it.phone ?? '정보없음',
          latitude: it.lat,
          longitude: it.lng,
          distance:
            typeof it.distanceKm === 'number'
              ? `${it.distanceKm.toFixed(1)}km`
              : `${calculateDistance(location.coords.latitude, location.coords.longitude, it.lat, it.lng)}km`,
          rating: typeof it.rating === 'number' ? it.rating : 0,
          isEmergency: guessEmergency(it.name, hours),
          hours,
          openNow: it.openNow,
        };
      });

      mapped.sort((a, b) => {
        const da = parseFloat(a.distance?.replace('km', '') || '999');
        const db = parseFloat(b.distance?.replace('km', '') || '999');
        return da - db;
      });

      setHospitals(mapped);
    } catch (e: any) {
      console.log('병원 조회 실패:', e?.message || e);
      setFetchError('병원 정보를 불러오지 못했습니다.');
      setHospitals([]);
    } finally {
      setIsFetching(false);
    }
  };

  // 위치 또는 openNow 바뀌면 재조회
  useEffect(() => {
    if (location) fetchHospitals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location, openNow]);

  /* ========== 파생 데이터 ========== */
  const filteredHospitals = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return hospitals;
    return hospitals.filter(
      h => h.name.toLowerCase().includes(q) || h.address.toLowerCase().includes(q)
    );
  }, [hospitals, searchText]);

  const emergencyHospital = useMemo(
    () => filteredHospitals.find(h => h.isEmergency),
    [filteredHospitals]
  );

  /* ========== 렌더링 ========== */
  if (isBootLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#2E6FF2" />
          <Text style={styles.loadingText}>초기화 중…</Text>
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
          <View style={styles.searchBar}>
            <MaterialCommunityIcons name="magnify" size={18} color="#8A8F98" />
            <TextInput
              style={styles.searchInput}
              placeholder="동물병원 검색"
              value={searchText}
              onChangeText={setSearchText}
              onFocus={() => setShowHistory(true)}
              onSubmitEditing={async () => {
                await pushHistory(searchText);
                setShowHistory(false);
              }}
              returnKeyType="search"
            />
            {searchText.length > 0 && (
              <TouchableOpacity onPress={() => setSearchText('')}>
                <MaterialCommunityIcons name="close-circle" size={18} color="#B0B7C3" />
              </TouchableOpacity>
            )}
          </View>

          {/* 필터/버튼 */}
          <View style={styles.filterRow}>
            <TouchableOpacity
              style={[styles.filterChip, openNow && styles.filterChipActive]}
              activeOpacity={0.85}
              onPress={() => setOpenNow(v => !v)}
            >
              <MaterialCommunityIcons name="clock-outline" size={16} color={openNow ? '#FFF' : '#1B2B28'} />
              <Text style={[styles.filterText, openNow && { color: '#FFF' }]}>지금 영업중</Text>
            </TouchableOpacity>

            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity style={styles.smallBtn} onPress={fetchHospitals} activeOpacity={0.85}>
                <MaterialCommunityIcons name="refresh" size={16} color="#1B2B28" />
                <Text style={styles.smallBtnText}>새로고침</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* 검색 기록 패널 */}
          {showHistory && (
            <View style={styles.historyPanel}>
              <View style={styles.historyHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <MaterialCommunityIcons name="history" size={16} color="#8A8F98" />
                  <Text style={styles.historyTitle}>최근 검색</Text>
                </View>
                <TouchableOpacity onPress={clearHistory}>
                  <Text style={styles.historyClear}>모두 지우기</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.historyList}>
                {history.length === 0 ? (
                  <Text style={{ color: '#98A2B3', fontSize: 12 }}>아직 검색 기록이 없습니다.</Text>
                ) : (
                  history.map((h) => (
                    <TouchableOpacity
                      key={h}
                      style={styles.historyItem}
                      onPress={() => { setSearchText(h); setShowHistory(false); }}
                    >
                      <MaterialCommunityIcons name="magnify" size={14} color="#98A2B3" />
                      <Text style={styles.historyText} numberOfLines={1}>{h}</Text>
                    </TouchableOpacity>
                  ))
                )}
              </View>
              <TouchableOpacity style={styles.historyClose} onPress={() => setShowHistory(false)}>
                <Text style={styles.historyCloseText}>닫기</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* 지도 카드 */}
        <View style={styles.mapCard}>
          {mapError ? (
            <View style={styles.mapErrorView}>
              <MaterialCommunityIcons name="map-marker-off" size={48} color="#8A8F98" />
              <Text style={styles.mapErrorText}>지도를 불러올 수 없습니다</Text>
              <TouchableOpacity style={styles.retryButton} onPress={() => { setMapError(false); setMapReady(false); }}>
                <Text style={styles.retryText}>다시 시도</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <MapView
                ref={mapRef}
                style={styles.map}
                region={region} // ✅ 제어 모드 (initialRegion + cacheEnabled 제거)
                provider={Platform.OS === 'ios' ? PROVIDER_GOOGLE : undefined}
                showsUserLocation={!!location}
                showsMyLocationButton
                showsCompass={false}
                showsScale={false}
                loadingEnabled={!mapReady}
                loadingIndicatorColor="#2E6FF2"
                loadingBackgroundColor="#FFFFFF"
                onMapReady={() => setMapReady(true)}
                onError={() => setMapError(true)}
                onRegionChangeComplete={(r) => setRegion(r)}
              >
                {filteredHospitals.map(h => (
                  <Marker
                    key={h.id}
                    coordinate={{ latitude: h.latitude, longitude: h.longitude }}
                    title={h.name}
                    description={`⭐ ${h.rating} • ${h.hours}`}
                    pinColor={h.isEmergency ? '#FF5A5F' : '#2E6FF2'}
                    onCalloutPress={() => {
                      Alert.alert(
                        h.name,
                        `${h.address}\n평점: ⭐ ${h.rating}\n운영시간: ${h.hours}${h.openNow !== undefined ? `\n지금 영업중: ${h.openNow ? '예' : '아니오'}` : ''}`,
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

              {/* 내 위치로 리센터 */}
              <TouchableOpacity style={styles.locateBtn} onPress={recenterMyLocation} activeOpacity={0.9}>
                <MaterialCommunityIcons name="crosshairs-gps" size={20} color="#1B2B28" />
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* 리스트 카드 */}
        <View style={styles.listCard}>
          <View style={styles.listHeaderRow}>
            <Text style={styles.listTitle}>근처 동물병원 {isFetching ? '(불러오는 중…)' : ''}</Text>
            <Text style={styles.listCount}>{filteredHospitals.length}곳</Text>
          </View>

          {fetchError && <Text style={{ color: '#D92D20', marginBottom: 8 }}>{fetchError}</Text>}

          <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 84 }}>
            {filteredHospitals.map(h => (
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
                    <EmojiText style={styles.itemRating}>⭐ {h.rating || 0}</EmojiText>
                    <EmojiText style={styles.itemHours}>🕐 {h.hours}</EmojiText>
                    {h.openNow !== undefined && (
                      <EmojiText style={[styles.itemHours, { fontWeight: '700' }]}>
                        {h.openNow ? '영업중' : '영업종료'}
                      </EmojiText>
                    )}
                  </View>
                  <EmojiText style={styles.itemPhone}>📞 {h.phone || '정보없음'}</EmojiText>
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

/* ===================== 스타일 ===================== */
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
  searchInput: { flex: 1, color: TEXT, fontSize: 14 },

  filterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
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
  filterChipActive: { backgroundColor: '#1A73E8', borderColor: '#1A73E8' },
  filterText: { color: TEXT, fontSize: 13, fontWeight: '600' },

  smallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderColor: BORDER,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 34,
  },
  smallBtnText: { color: TEXT, fontSize: 12, fontWeight: '600' },

  // 검색 기록 패널
  historyPanel: { marginTop: 8, backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: BORDER, padding: 12, gap: 8 },
  historyHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  historyTitle: { color: TEXT, fontSize: 13, fontWeight: '700' },
  historyClear: { color: '#667085', fontSize: 12, textDecorationLine: 'underline' },
  historyList: { gap: 6 },
  historyItem: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  historyText: { color: TEXT, fontSize: 13, flexShrink: 1 },
  historyClose: { alignSelf: 'flex-end', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: '#F2F4F7' },
  historyCloseText: { fontSize: 12, color: '#344054', fontWeight: '700' },

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
  map: { flex: 1, minHeight: 200 },
  locateBtn: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
  },

  mapErrorView: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8F9FA' },
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
  itemMeta: { flexDirection: 'row', gap: 14, marginTop: 4, flexWrap: 'wrap' },
  itemRating: { fontSize: 13, color: '#F39C12' },
  itemHours: { fontSize: 13, color: SUBTEXT },
  itemPhone: { fontSize: 13, color: '#1A73E8', marginTop: 2 },

  itemActions: { alignItems: 'flex-end', gap: 8 },
  actionBtn: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#27AE60' },

  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: 10, color: SUBTEXT, fontSize: 14 },
});
