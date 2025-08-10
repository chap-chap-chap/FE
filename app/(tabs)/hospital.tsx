import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Linking,
  Platform,
  StatusBar
} from 'react-native';
import { router } from 'expo-router';
import MapView, { Marker, Region } from 'react-native-maps';
import * as Location from 'expo-location';

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

export default function HospitalScreen() {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [region, setRegion] = useState<Region>({
    latitude: 37.5665,
    longitude: 126.9780,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });

  // 샘플 동물병원 데이터 (실제로는 API에서 가져올 수 있음)
  const hospitals: Hospital[] = [
    {
      id: 1,
      name: '우리동물병원',
      address: '서울시 강남구 테헤란로 123',
      phone: '02-1234-5678',
      latitude: 37.5665 + 0.01,
      longitude: 126.9780 + 0.01,
      rating: 4.8,
      isEmergency: false,
      hours: '09:00-18:00'
    },
    {
      id: 2,
      name: '24시 응급동물병원',
      address: '서울시 강남구 강남대로 456',
      phone: '02-2345-6789',
      latitude: 37.5665 - 0.01,
      longitude: 126.9780 + 0.015,
      rating: 4.7,
      isEmergency: true,
      hours: '24시간'
    },
    {
      id: 3,
      name: '행복한동물병원',
      address: '서울시 강남구 선릉로 789',
      phone: '02-3456-7890',
      latitude: 37.5665 + 0.015,
      longitude: 126.9780 - 0.01,
      rating: 4.6,
      isEmergency: false,
      hours: '10:00-19:00'
    },
    {
      id: 4,
      name: '사랑동물병원',
      address: '서울시 강남구 봉은사로 101',
      phone: '02-4567-8901',
      latitude: 37.5665 - 0.005,
      longitude: 126.9780 - 0.015,
      rating: 4.9,
      isEmergency: false,
      hours: '09:30-18:30'
    },
    {
      id: 5,
      name: '펫케어 동물병원',
      address: '서울시 강남구 역삼로 202',
      phone: '02-5678-9012',
      latitude: 37.5665 + 0.008,
      longitude: 126.9780 + 0.005,
      rating: 4.5,
      isEmergency: false,
      hours: '08:00-20:00'
    }
  ];

  // 네비게이션 바 숨기기
  useEffect(() => {
    const hideNavigationBar = async () => {
      if (Platform.OS === 'android') {
        try {
          const NavigationBar = await import('expo-navigation-bar');
          await NavigationBar.setVisibilityAsync('hidden');
          await NavigationBar.setBehaviorAsync('overlay-swipe');
        } catch (error) {
          console.log('네비게이션 바 제어 불가:', error);
        }
      }
    };
    hideNavigationBar();
  }, []);

  // 위치 권한 요청 및 현재 위치 가져오기
  useEffect(() => {
    (async () => {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('위치 권한', '근처 동물병원을 찾으려면 위치 권한이 필요합니다.');
          setIsLoading(false);
          return;
        }

        let currentLocation = await Location.getCurrentPositionAsync({});
        setLocation(currentLocation);
        
        // 현재 위치로 지도 중심 설정
        setRegion({
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        });
        
        setIsLoading(false);
      } catch (error) {
        console.log('위치 가져오기 실패:', error);
        setIsLoading(false);
      }
    })();
  }, []);

  // 거리 계산 함수
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // 지구 반지름 (km)
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    return distance.toFixed(1);
  };

  // 전화걸기 함수
  const makePhoneCall = (phoneNumber: string) => {
    const url = Platform.OS === 'ios' ? `telprompt:${phoneNumber}` : `tel:${phoneNumber}`;
    Linking.canOpenURL(url)
      .then((supported) => {
        if (supported) {
          return Linking.openURL(url);
        } else {
          Alert.alert('오류', '전화 기능을 사용할 수 없습니다.');
        }
      })
      .catch((err) => console.log('전화 오류:', err));
  };

  // 길찾기 함수
  const openNavigation = (hospital: Hospital) => {
    const url = Platform.OS === 'ios' 
      ? `maps://?daddr=${hospital.latitude},${hospital.longitude}`
      : `google.navigation:q=${hospital.latitude},${hospital.longitude}`;
    
    Linking.canOpenURL(url)
      .then((supported) => {
        if (supported) {
          return Linking.openURL(url);
        } else {
          // 대체 URL
          const webUrl = `https://maps.google.com/maps?daddr=${hospital.latitude},${hospital.longitude}`;
          return Linking.openURL(webUrl);
        }
      })
      .catch((err) => console.log('네비게이션 오류:', err));
  };

  // 병원까지의 거리 계산된 병원 목록
  const hospitalsWithDistance = hospitals.map(hospital => ({
    ...hospital,
    distance: location 
      ? calculateDistance(
          location.coords.latitude,
          location.coords.longitude,
          hospital.latitude,
          hospital.longitude
        ) + 'km'
      : '위치 없음'
  })).sort((a, b) => {
    if (!location) return 0;
    const distanceA = parseFloat(a.distance?.replace('km', '') || '999');
    const distanceB = parseFloat(b.distance?.replace('km', '') || '999');
    return distanceA - distanceB;
  });

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#45B7D1" />
          <Text style={styles.loadingText}>근처 동물병원을 찾는 중...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <>
      <StatusBar hidden={true} />
      <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.screenTitle}>🏥 우리 동네 병원</Text>
        <View style={styles.headerRight} />
      </View>

      {/* 응급상황 버튼 */}
      <TouchableOpacity 
        style={styles.emergencyButton}
        onPress={() => {
          const emergencyHospital = hospitals.find(h => h.isEmergency);
          if (emergencyHospital) {
            Alert.alert(
              '응급상황',
              `${emergencyHospital.name}으로 연결하시겠습니까?`,
              [
                { text: '취소', style: 'cancel' },
                { text: '전화걸기', onPress: () => makePhoneCall(emergencyHospital.phone) }
              ]
            );
          }
        }}
      >
        <Text style={styles.emergencyText}>🚨 응급상황</Text>
        <Text style={styles.emergencySubtext}>24시간 응급병원</Text>
      </TouchableOpacity>

      {/* 지도 */}
      <View style={styles.mapContainer}>
        <MapView
          style={styles.map}
          region={region}
          showsUserLocation={!!location}
          showsMyLocationButton={true}
          onRegionChangeComplete={setRegion}
        >
          {/* 동물병원 마커들 */}
          {hospitals.map((hospital) => (
            <Marker
              key={hospital.id}
              coordinate={{
                latitude: hospital.latitude,
                longitude: hospital.longitude,
              }}
              title={hospital.name}
              description={`⭐ ${hospital.rating} • ${hospital.hours}`}
              pinColor={hospital.isEmergency ? '#E74C3C' : '#45B7D1'}
              onCalloutPress={() => {
                Alert.alert(
                  hospital.name,
                  `${hospital.address}\n평점: ⭐ ${hospital.rating}\n운영시간: ${hospital.hours}`,
                  [
                    { text: '닫기', style: 'cancel' },
                    { text: '전화걸기', onPress: () => makePhoneCall(hospital.phone) },
                    { text: '길찾기', onPress: () => openNavigation(hospital) }
                  ]
                );
              }}
            />
          ))}
        </MapView>
      </View>

      {/* 병원 목록 */}
      <View style={styles.listContainer}>
        <Text style={styles.sectionTitle}>근처 동물병원 ({hospitalsWithDistance.length}곳)</Text>
        <ScrollView style={styles.hospitalList} showsVerticalScrollIndicator={false}>
          {hospitalsWithDistance.map((hospital) => (
            <TouchableOpacity 
              key={hospital.id} 
              style={[
                styles.hospitalItem,
                hospital.isEmergency && styles.emergencyHospitalItem
              ]}
              onPress={() => {
                Alert.alert(
                  hospital.name,
                  `${hospital.address}\n평점: ⭐ ${hospital.rating}\n운영시간: ${hospital.hours}`,
                  [
                    { text: '닫기', style: 'cancel' },
                    { text: '전화걸기', onPress: () => makePhoneCall(hospital.phone) },
                    { text: '길찾기', onPress: () => openNavigation(hospital) }
                  ]
                );
              }}
            >
              <View style={styles.hospitalInfo}>
                <View style={styles.hospitalHeader}>
                  <Text style={styles.hospitalName}>
                    {hospital.name}
                    {hospital.isEmergency && <Text style={styles.emergencyBadge}> 24H</Text>}
                  </Text>
                  <Text style={styles.hospitalDistance}>{hospital.distance}</Text>
                </View>
                <Text style={styles.hospitalAddress}>{hospital.address}</Text>
                <View style={styles.hospitalMeta}>
                  <Text style={styles.hospitalRating}>⭐ {hospital.rating}</Text>
                  <Text style={styles.hospitalHours}>🕐 {hospital.hours}</Text>
                </View>
                <Text style={styles.hospitalPhone}>📞 {hospital.phone}</Text>
              </View>
              <View style={styles.hospitalActions}>
                <TouchableOpacity 
                  style={styles.callButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    makePhoneCall(hospital.phone);
                  }}
                >
                  <Text style={styles.callButtonText}>전화</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#7F8C8D',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 24,
    color: '#2C3E50',
    fontWeight: 'bold',
  },
  screenTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  headerRight: {
    width: 40,
  },
  emergencyButton: {
    backgroundColor: '#E74C3C',
    marginHorizontal: 20,
    marginVertical: 10,
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  emergencyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 3,
  },
  emergencySubtext: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  mapContainer: {
    height: 250,
    margin: 15,
    borderRadius: 15,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  map: {
    flex: 1,
  },
  listContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 15,
  },
  hospitalList: {
    flex: 1,
  },
  hospitalItem: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  emergencyHospitalItem: {
    borderColor: '#E74C3C',
    borderWidth: 2,
  },
  hospitalInfo: {
    flex: 1,
  },
  hospitalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  hospitalName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2C3E50',
    flex: 1,
  },
  emergencyBadge: {
    fontSize: 12,
    color: '#E74C3C',
    fontWeight: 'bold',
  },
  hospitalDistance: {
    fontSize: 14,
    color: '#45B7D1',
    fontWeight: 'bold',
  },
  hospitalAddress: {
    fontSize: 14,
    color: '#7F8C8D',
    marginBottom: 5,
  },
  hospitalMeta: {
    flexDirection: 'row',
    gap: 15,
    marginBottom: 3,
  },
  hospitalRating: {
    fontSize: 14,
    color: '#F39C12',
  },
  hospitalHours: {
    fontSize: 14,
    color: '#7F8C8D',
  },
  hospitalPhone: {
    fontSize: 14,
    color: '#45B7D1',
  },
  hospitalActions: {
    alignItems: 'flex-end',
  },
  callButton: {
    backgroundColor: '#27AE60',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 8,
  },
  callButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
});