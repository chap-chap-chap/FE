import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
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
  View
} from 'react-native';
import MapView, { Marker, Region } from 'react-native-maps';

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

const TABS = ['전체', '거리', '평점', '응급', '24H'] as const;
type TabKey = typeof TABS[number];

export default function HospitalScreen() {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [region, setRegion] = useState<Region>({
    latitude: 37.5665,
    longitude: 126.9780,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });
  const [tab, setTab] = useState<TabKey>('전체');

  // 샘플 데이터
  const hospitals: Hospital[] = [
    { id:1, name:'우리동물병원', address:'서울시 강남구 테헤란로 123', phone:'02-1234-5678', latitude:37.5765, longitude:126.988, rating:4.8, isEmergency:false, hours:'09:00-18:00' },
    { id:2, name:'24시 응급동물병원', address:'서울시 강남구 강남대로 456', phone:'02-2345-6789', latitude:37.5565, longitude:126.993, rating:4.7, isEmergency:true, hours:'24시간' },
    { id:3, name:'행복한동물병원', address:'서울시 강남구 선릉로 789', phone:'02-3456-7890', latitude:37.5815, longitude:126.968, rating:4.6, isEmergency:false, hours:'10:00-19:00' },
    { id:4, name:'사랑동물병원', address:'서울시 강남구 봉은사로 101', phone:'02-4567-8901', latitude:37.5615, longitude:126.963, rating:4.9, isEmergency:false, hours:'09:30-18:30' },
    { id:5, name:'펫케어 동물병원', address:'서울시 강남구 역삼로 202', phone:'02-5678-9012', latitude:37.5745, longitude:126.983, rating:4.5, isEmergency:false, hours:'08:00-20:00' },
  ];

  // 네비게이션 바 숨김
  useEffect(() => {
    const hideNavigationBar = async () => {
      if (Platform.OS === 'android') {
        try {
          const NavigationBar = await import('expo-navigation-bar');
          await NavigationBar.setVisibilityAsync('hidden');
          await NavigationBar.setBehaviorAsync('overlay-swipe');
        } catch {}
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
        const cur = await Location.getCurrentPositionAsync({});
        setLocation(cur);
        setRegion(r => ({ ...r, latitude: cur.coords.latitude, longitude: cur.coords.longitude }));
      } catch (e) {
        console.log('위치 실패:', e);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const calculateDistance = (lat1:number, lon1:number, lat2:number, lon2:number) => {
    const R = 6371, dLat=(lat2-lat1)*Math.PI/180, dLon=(lon2-lon1)*Math.PI/180;
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
    return (R*2*Math.atan2(Math.sqrt(a), Math.sqrt(1-a))).toFixed(1);
  };

  const makePhoneCall = (phone:string) => {
    const url = Platform.OS === 'ios' ? `telprompt:${phone}` : `tel:${phone}`;
    Linking.canOpenURL(url).then(s => s ? Linking.openURL(url) : Alert.alert('오류','전화 기능을 사용할 수 없습니다.'));
  };

  const openNavigation = (h:Hospital) => {
    const url = Platform.OS === 'ios' ? `maps://?daddr=${h.latitude},${h.longitude}` : `google.navigation:q=${h.latitude},${h.longitude}`;
    Linking.canOpenURL(url)
      .then(s => s ? Linking.openURL(url) : Linking.openURL(`https://maps.google.com/maps?daddr=${h.latitude},${h.longitude}`))
      .catch(e => console.log('네비 오류:', e));
  };

  // 거리 계산 + 탭 필터/정렬
  const hospitalsWithDistance = useMemo(() => {
    const base = hospitals.map(h => ({
      ...h,
      distance: location
        ? `${calculateDistance(location.coords.latitude, location.coords.longitude, h.latitude, h.longitude)}km`
        : undefined
    }));

    const toKm = (d?:string) => (d ? parseFloat(d) : Number.POSITIVE_INFINITY);

    let list = base.slice();

    switch (tab) {
      case '거리':
        list.sort((a,b) => toKm(a.distance) - toKm(b.distance));
        break;
      case '평점':
        list.sort((a,b) => b.rating - a.rating);
        break;
      case '응급':
        list = list.filter(h => h.isEmergency);
        break;
      case '24H':
        list = list.filter(h => h.isEmergency || /24/.test(h.hours));
        break;
      case '전체':
      default:
        // 위치 있으면 기본은 거리순, 없으면 그대로
        if (location) list.sort((a,b) => toKm(a.distance) - toKm(b.distance));
        break;
    }
    return list;
  }, [hospitals, location, tab]);

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

  const emergencyHospital = hospitals.find(h => h.isEmergency);

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#F5F7FB" />
      <SafeAreaView style={styles.container}>
        {/* 상단 헤더 */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
            <MaterialCommunityIcons name="chevron-left" size={24} color="#1A1A1A" />
          </TouchableOpacity>
          <Text style={styles.title}>Hospital</Text>
          <View style={styles.iconBtn} />
        </View>

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
                      { text: '전화걸기', onPress: () => makePhoneCall(emergencyHospital.phone) }
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
          <MapView
            style={{ flex:1 }}
            region={region}
            showsUserLocation={!!location}
            showsMyLocationButton
            onRegionChangeComplete={setRegion}
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
                      { text:'닫기', style:'cancel' },
                      { text:'전화걸기', onPress: () => makePhoneCall(h.phone) },
                      { text:'길찾기', onPress: () => openNavigation(h) },
                    ]
                  );
                }}
              />
            ))}
          </MapView>
        </View>

        {/* 리스트 카드 */}
        <View style={styles.listCard}>
          <View style={styles.listHeaderRow}>
            <Text style={styles.listTitle}>근처 동물병원</Text>
            <Text style={styles.listCount}>{hospitalsWithDistance.length}곳</Text>
          </View>

          <ScrollView style={{ flex:1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 84 }}>
            {hospitalsWithDistance.map(h => (
              <View key={h.id} style={[styles.item, h.isEmergency && styles.itemEmergency]}>
                <View style={{ flex:1 }}>
                  <View style={styles.itemTopRow}>
                    <Text style={styles.itemName} numberOfLines={1}>
                      {h.name} {h.isEmergency && <Text style={styles.itemBadge}>24H</Text>}
                    </Text>
                    <Text style={styles.itemDistance}>{h.distance ?? '-'}</Text>
                  </View>
                  <Text style={styles.itemAddr} numberOfLines={1}>{h.address}</Text>
                  <View style={styles.itemMeta}>
                    <Text style={styles.itemRating}>⭐ {h.rating}</Text>
                    <Text style={styles.itemHours}>🕐 {h.hours}</Text>
                  </View>
                  <Text style={styles.itemPhone}>📞 {h.phone}</Text>
                </View>

                <View style={styles.itemActions}>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => makePhoneCall(h.phone)}>
                    <MaterialCommunityIcons name="phone" size={18} color="#FFF" />
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.actionBtn, { backgroundColor:'#1A73E8' }]} onPress={() => openNavigation(h)}>
                    <MaterialCommunityIcons name="navigation" size={18} color="#FFF" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* ▼▼ 스샷 스타일 하단 '목차' 세그먼트 탭 ▼▼ */}
        <View style={styles.bottomTabsWrap}>
          {TABS.map(t => (
            <TouchableOpacity
              key={t}
              style={[styles.tabBtn, tab === t && styles.tabBtnActive]}
              onPress={() => setTab(t)}
              activeOpacity={0.9}
            >
              <Text style={[styles.tabTxt, tab === t && styles.tabTxtActive]}>{t}</Text>
            </TouchableOpacity>
          ))}
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
  container: { flex:1, backgroundColor:'#F5F7FB' },

  // 헤더
  header: {
    flexDirection:'row',
    alignItems:'center',
    justifyContent:'space-between',
    paddingHorizontal:16,
    paddingVertical:12,
    backgroundColor:'#F5F7FB'
  },
  iconBtn: { width:36, height:36, borderRadius:18, alignItems:'center', justifyContent:'center' },
  title: { fontSize:18, fontWeight:'700', color: TEXT },

  // 툴바
  toolbar: { paddingHorizontal:16, paddingBottom:8 },
  searchBar: {
    flexDirection:'row', alignItems:'center', gap:8,
    backgroundColor:'#FFFFFF', borderColor:BORDER, borderWidth:1,
    borderRadius:12, paddingHorizontal:12, height:40
  },
  searchPlaceholder: { color: SUBTEXT, fontSize:14 },

  filterRow: { flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginTop:10 },
  filterChip: {
    flexDirection:'row', alignItems:'center', gap:6,
    backgroundColor:'#FFFFFF', borderColor:BORDER, borderWidth:1,
    borderRadius:999, paddingHorizontal:12, height:34
  },
  filterText: { color: TEXT, fontSize:13, fontWeight:'600' },

  emergencyChip: {
    flexDirection:'row', alignItems:'center', gap:6,
    backgroundColor:'#FF5A5F', borderRadius:999, paddingHorizontal:12, height:34
  },
  emergencyChipText: { color:'#FFF', fontSize:12, fontWeight:'800' },

  // 지도 카드
  mapCard: {
    height:220, marginHorizontal:16, marginTop:12,
    backgroundColor:CARD_BG, borderRadius:16,
    overflow:'hidden', borderWidth:1, borderColor:BORDER,
    shadowColor:'#000', shadowOpacity:0.06, shadowRadius:8, shadowOffset:{ width:0, height:4 },
    elevation:3
  },

  // 리스트 카드
  listCard: {
    flex:1,
    marginTop:14,
    backgroundColor:CARD_BG,
    borderTopLeftRadius:20, borderTopRightRadius:20,
    paddingTop:16, paddingHorizontal:16,
    borderTopWidth:1, borderColor:BORDER
  },
  listHeaderRow: { flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:8 },
  listTitle: { fontSize:16, fontWeight:'800', color: TEXT },
  listCount: { fontSize:12, fontWeight:'700', color: SUBTEXT },

  // 아이템
  item: {
    flexDirection:'row', alignItems:'center',
    padding:14, borderRadius:14, backgroundColor:'#FAFBFF',
    borderWidth:1, borderColor:BORDER, marginBottom:10, gap:12
  },
  itemEmergency: { borderColor:'#FF5A5F', backgroundColor:'#FFF6F6' },
  itemTopRow: { flexDirection:'row', alignItems:'center', justifyContent:'space-between' },
  itemName: { fontSize:15, fontWeight:'700', color: TEXT, maxWidth:'72%' },
  itemBadge: { fontSize:11, color:'#FF5A5F', fontWeight:'800' },
  itemDistance: { fontSize:13, color:'#1A73E8', fontWeight:'800' },
  itemAddr: { fontSize:13, color:SUBTEXT, marginTop:2 },
  itemMeta: { flexDirection:'row', gap:14, marginTop:4 },
  itemRating: { fontSize:13, color:'#F39C12' },
  itemHours: { fontSize:13, color:SUBTEXT },
  itemPhone: { fontSize:13, color:'#1A73E8', marginTop:2 },

  itemActions: { alignItems:'flex-end', gap:8 },
  actionBtn: {
    width:36, height:36, borderRadius:10, alignItems:'center', justifyContent:'center',
    backgroundColor:'#27AE60'
  },

  // 로딩
  loadingBox: { flex:1, alignItems:'center', justifyContent:'center' },
  loadingText: { marginTop:10, color:SUBTEXT, fontSize:14 },

  // ▼ 하단 목차(세그먼트 탭) — 스샷 느낌
  bottomTabsWrap: {
    position:'absolute',
    left:16, right:16, bottom:12,
    height:44,
    backgroundColor:'rgba(0,0,0,0.04)', // 스샷의 연한 바 느낌
    borderRadius:12,
    padding:4,
    flexDirection:'row',
    alignItems:'center',
    justifyContent:'space-between',
    borderWidth:1,
    borderColor:'rgba(0,0,0,0.06)',
    shadowColor:'#000', shadowOpacity:0.04, shadowRadius:8, shadowOffset:{ width:0, height:2 },
    elevation:2,
  },
  tabBtn: {
    flex:1,
    height:'100%',
    borderRadius:8,
    alignItems:'center',
    justifyContent:'center',
  },
  tabBtnActive: {
    backgroundColor:'#FFFFFF',
    borderWidth:1,
    borderColor:'#0088FF',
  },
  tabTxt: { fontSize:12, color:'#333333', fontWeight:'700' },
  tabTxtActive: { color:'#0088FF' },
});
