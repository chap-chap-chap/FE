import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  ScrollView,
  Platform,
  StatusBar
} from 'react-native';
import { router } from 'expo-router';
import MapView, { Marker, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface RunningRecord {
  duration: string;
  distance: string;
  calories: string;
  dogCalories: string;
}

interface DayRecord {
  date: string;
  photos: string[];
  memo: string;
  runningRecord?: RunningRecord;
  mood: '😊' | '😐' | '😢' | '🤗' | '😴' | '';
}

interface LocationCoords {
  latitude: number;
  longitude: number;
}

interface DogInfo {
  name: string;
  weight: number; // kg
  age: number; // 연령
  breed: string; // 견종
  activityLevel: 'low' | 'medium' | 'high'; // 활동성
}

export default function RunningScreen() {
  const [isRunning, setIsRunning] = useState(false);
  const [time, setTime] = useState('00:00');
  const [seconds, setSeconds] = useState(0);
  const [location, setLocation] = useState<LocationCoords | null>(null);
  const [route, setRoute] = useState<LocationCoords[]>([]);
  const [distance, setDistance] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [showDogModal, setShowDogModal] = useState(false);
  const [dogInfo, setDogInfo] = useState<DogInfo | null>(null);
  const [humanCalories, setHumanCalories] = useState(0);
  const [dogCalories, setDogCalories] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);

  // 강아지 정보 입력 폼 상태
  const [dogForm, setDogForm] = useState({
    name: '',
    weight: '',
    age: '',
    breed: '믹스견',
    activityLevel: 'medium' as 'low' | 'medium' | 'high'
  });

  // 견종 목록
  const breeds = [
    '믹스견', '골든 리트리버', '래브라도', '시바견', '보더 콜리', '허스키',
    '말티즈', '푸들', '비숑 프리제', '치와와', '요크셔테리어', '비글', '불독', '진돗개'
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
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('권한 필요', '위치 권한이 필요합니다.');
        return;
      }

      let currentLocation = await Location.getCurrentPositionAsync({});
      const coords = {
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
      };
      setLocation(coords);
      setRoute([coords]);
      setIsLoading(false);
    })();
  }, []);

  // 타이머 기능
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning) {
      interval = setInterval(() => {
        setSeconds((prevSeconds) => {
          const newSeconds = prevSeconds + 1;
          const minutes = Math.floor(newSeconds / 60);
          const remainingSeconds = newSeconds % 60;
          setTime(`${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`);
          return newSeconds;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning]);

  // 런닝 중 위치 추적
  useEffect(() => {
    let locationSubscription: Location.LocationSubscription;

    const trackLocation = async () => {
      if (isRunning) {
        locationSubscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 5000,
            distanceInterval: 10,
          },
          (newLocation) => {
            const newCoords = {
              latitude: newLocation.coords.latitude,
              longitude: newLocation.coords.longitude,
            };
            
            setLocation(newCoords);
            setRoute((prevRoute) => {
              const updatedRoute = [...prevRoute, newCoords];
              calculateDistance(updatedRoute);
              return updatedRoute;
            });
          }
        );
      }
    };

    trackLocation();

    return () => {
      if (locationSubscription) {
        locationSubscription.remove();
      }
    };
  }, [isRunning]);

  // 칼로리 계산 (거리와 시간 변화 시)
  useEffect(() => {
    if (distance > 0 && seconds > 0) {
      calculateCalories();
    }
  }, [distance, seconds, dogInfo]);

  // 거리 계산 함수
  const calculateDistance = (coordinates: LocationCoords[]) => {
    if (coordinates.length < 2) return;

    let totalDistance = 0;
    for (let i = 1; i < coordinates.length; i++) {
      const dist = getDistanceBetweenPoints(
        coordinates[i - 1],
        coordinates[i]
      );
      totalDistance += dist;
    }
    setDistance(totalDistance);
  };

  // 두 점 사이의 거리 계산 (Haversine 공식)
  const getDistanceBetweenPoints = (point1: LocationCoords, point2: LocationCoords) => {
    const R = 6371;
    const dLat = (point2.latitude - point1.latitude) * Math.PI / 180;
    const dLon = (point2.longitude - point1.longitude) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(point1.latitude * Math.PI / 180) * Math.cos(point2.latitude * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    return distance;
  };

  // 칼로리 계산 함수
  const calculateCalories = () => {
    const timeInHours = seconds / 3600;
    
    // 인간 칼로리 (평균 체중 70kg 기준)
    const humanCaloriesPerHour = 600; // 런닝 시 시간당 칼로리
    const calculatedHumanCalories = Math.round(humanCaloriesPerHour * timeInHours);
    setHumanCalories(calculatedHumanCalories);

    // 강아지 칼로리 계산
    if (dogInfo) {
      const dogCaloriesCalculated = calculateDogCalories(dogInfo, timeInHours, distance);
      setDogCalories(dogCaloriesCalculated);
    }
  };

  // 캘린더에 기록 저장하는 함수
  const saveToCalendar = async (runningData: RunningRecord) => {
    try {
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD 형식
      
      // 기존 캘린더 데이터 가져오기
      const existingData = await AsyncStorage.getItem('dayRecords');
      let dayRecords: DayRecord[] = existingData ? JSON.parse(existingData) : [];
      
      // 오늘 날짜의 기록 찾기
      const todayRecordIndex = dayRecords.findIndex(record => record.date === today);
      
      if (todayRecordIndex >= 0) {
        // 기존 기록이 있으면 런닝 기록만 업데이트
        dayRecords[todayRecordIndex] = {
          ...dayRecords[todayRecordIndex],
          runningRecord: runningData
        };
      } else {
        // 새로운 기록 생성
        const newRecord: DayRecord = {
          date: today,
          photos: [],
          memo: '',
          runningRecord: runningData,
          mood: ''
        };
        dayRecords.push(newRecord);
      }
      
      // AsyncStorage에 저장
      await AsyncStorage.setItem('dayRecords', JSON.stringify(dayRecords));
      
      return true;
    } catch (error) {
      console.log('캘린더 저장 오류:', error);
      return false;
    }
  };
  // 강아지 칼로리 계산 (체중, 견종, 활동성 고려)
  const calculateDogCalories = (dog: DogInfo, timeInHours: number, distanceKm: number) => {
    // 기본 대사율 (체중 기반)
    const baseMER = 70 * Math.pow(dog.weight, 0.75); // kcal/day
    
    // 활동성 계수
    const activityMultiplier = {
      low: 1.2,
      medium: 1.4,
      high: 1.8
    };
    
    // 견종별 에너지 계수 (활동적인 견종일수록 높음)
    const breedMultiplier: { [key: string]: number } = {
      '골든 리트리버': 1.3,
      '래브라도': 1.3,
      '허스키': 1.5,
      '보더 콜리': 1.4,
      '비글': 1.2,
      '시바견': 1.1,
      '진돗개': 1.2,
      '말티즈': 0.9,
      '비숑 프리제': 1.0,
      '치와와': 0.8,
      '요크셔테리어': 0.8,
      '푸들': 1.0,
      '불독': 0.9,
      '믹스견': 1.0
    };

    // 런닝 강도 (거리 기반)
    const runningIntensity = distanceKm > 0 ? Math.min(distanceKm / timeInHours, 15) : 5; // km/h, 최대 15km/h
    const intensityMultiplier = 1 + (runningIntensity / 20); // 속도에 따른 추가 계수

    const dailyCalories = baseMER * activityMultiplier[dog.activityLevel] * (breedMultiplier[dog.breed] || 1.0);
    const caloriesPerHour = dailyCalories / 24;
    const runningCalories = caloriesPerHour * intensityMultiplier * timeInHours;

    return Math.round(runningCalories);
  };

  const handleStartStop = () => {
    if (!isRunning) {
      // 런닝 시작
      setIsRunning(true);
      setSeconds(0);
      setTime('00:00');
      setDistance(0);
      setHumanCalories(0);
      setDogCalories(0);
      setIsCompleted(false);
      if (location) {
        setRoute([location]);
      }
    } else {
      // 런닝 정지 및 완료 처리
      setIsRunning(false);
      setIsCompleted(true);
      
      // 운동 완료 알림과 캘린더 저장 확인
      if (seconds > 0 && (distance > 0 || humanCalories > 0)) {
        Alert.alert(
          '🏃‍♂️ 운동 완료!',
          `시간: ${time}\n거리: ${distance.toFixed(2)}km\n내 칼로리: ${humanCalories}kcal\n강아지 칼로리: ${dogCalories}kcal\n\n캘린더에 기록하시겠습니까?`,
          [
            {
              text: '아니오',
              style: 'cancel'
            },
            {
              text: '예',
              onPress: async () => {
                const runningRecord: RunningRecord = {
                  duration: time,
                  distance: `${distance.toFixed(2)}km`,
                  calories: `${humanCalories}`,
                  dogCalories: `${dogCalories}`
                };
                
                const saved = await saveToCalendar(runningRecord);
                if (saved) {
                  Alert.alert('저장 완료!', '오늘의 운동 기록이 캘린더에 저장되었습니다! 📅');
                } else {
                  Alert.alert('저장 실패', '캘린더 저장 중 오류가 발생했습니다.');
                }
              }
            }
          ]
        );
      }
    }
  };

  const handleReset = () => {
    Alert.alert(
      '초기화 확인',
      '현재 운동 기록을 초기화하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '초기화',
          onPress: () => {
            setIsRunning(false);
            setSeconds(0);
            setTime('00:00');
            setDistance(0);
            setHumanCalories(0);
            setDogCalories(0);
            setIsCompleted(false);
            if (location) {
              setRoute([location]);
            }
          }
        }
      ]
    );
  };

  const saveDogInfo = () => {
    if (!dogForm.name || !dogForm.weight || !dogForm.age) {
      Alert.alert('입력 오류', '모든 정보를 입력해주세요.');
      return;
    }

    const newDogInfo: DogInfo = {
      name: dogForm.name,
      weight: parseFloat(dogForm.weight),
      age: parseInt(dogForm.age),
      breed: dogForm.breed,
      activityLevel: dogForm.activityLevel
    };

    setDogInfo(newDogInfo);
    setShowDogModal(false);
    Alert.alert('저장 완료', `${newDogInfo.name}의 정보가 저장되었습니다!`);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B6B" />
          <Text style={styles.loadingText}>위치를 가져오는 중...</Text>
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
        <Text style={styles.screenTitle}>🏃‍♂️ 산책 & 런닝</Text>
        <TouchableOpacity 
          style={styles.dogButton}
          onPress={() => setShowDogModal(true)}
        >
          <Text style={styles.dogButtonText}>🐕</Text>
        </TouchableOpacity>
      </View>

      {/* 지도 */}
      <View style={styles.mapContainer}>
        {location && (
          <MapView
            style={styles.map}
            initialRegion={{
              latitude: location.latitude,
              longitude: location.longitude,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            }}
            showsUserLocation={true}
            followsUserLocation={isRunning}
            showsMyLocationButton={true}
          >
            <Marker
              coordinate={location}
              title="현재 위치"
              pinColor="#FF6B6B"
            />
            
            {route.length > 1 && (
              <Polyline
                coordinates={route}
                strokeColor="#FF6B6B"
                strokeWidth={4}
                lineCap="round"
                lineJoin="round"
              />
            )}
          </MapView>
        )}
      </View>

      {/* 강아지 정보 표시 */}
      {dogInfo && (
        <View style={styles.dogInfoBanner}>
          <Text style={styles.dogInfoText}>
            🐕 {dogInfo.name} ({dogInfo.weight}kg, {dogInfo.breed})
          </Text>
        </View>
      )}

      {/* 런닝 정보 */}
      <View style={styles.runningInfo}>
        <View style={styles.timerContainer}>
          <Text style={styles.timerText}>{time}</Text>
          <Text style={styles.timerLabel}>경과 시간</Text>
        </View>
        
        <View style={styles.controlButtons}>
          <TouchableOpacity 
            style={[styles.runButton, { backgroundColor: isRunning ? '#E74C3C' : '#27AE60' }]}
            onPress={handleStartStop}
          >
            <Text style={styles.runButtonText}>
              {isRunning ? '정지' : '시작'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.resetButton}
            onPress={handleReset}
          >
            <Text style={styles.resetButtonText}>초기화</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{distance.toFixed(2)}</Text>
            <Text style={styles.statLabel}>km</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{humanCalories}</Text>
            <Text style={styles.statLabel}>내 칼로리</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{dogCalories}</Text>
            <Text style={styles.statLabel}>🐕 칼로리</Text>
          </View>
        </View>

        {/* 완료 상태 표시 */}
        {isCompleted && (
          <View style={styles.completedBanner}>
            <Text style={styles.completedText}>🎉 운동 완료!</Text>
            <Text style={styles.completedSubtext}>캘린더에서 기록을 확인해보세요</Text>
          </View>
        )}
      </View>

      {/* 강아지 정보 입력 모달 */}
      <Modal
        visible={showDogModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDogModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>🐕 강아지 정보</Text>
            
            <ScrollView style={styles.modalForm}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>이름</Text>
                <TextInput
                  style={styles.textInput}
                  value={dogForm.name}
                  onChangeText={(text) => setDogForm({...dogForm, name: text})}
                  placeholder="강아지 이름"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>체중 (kg)</Text>
                <TextInput
                  style={styles.textInput}
                  value={dogForm.weight}
                  onChangeText={(text) => setDogForm({...dogForm, weight: text})}
                  placeholder="체중을 입력하세요"
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>나이</Text>
                <TextInput
                  style={styles.textInput}
                  value={dogForm.age}
                  onChangeText={(text) => setDogForm({...dogForm, age: text})}
                  placeholder="나이를 입력하세요"
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>견종</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.breedContainer}>
                    {breeds.map((breed) => (
                      <TouchableOpacity
                        key={breed}
                        style={[
                          styles.breedButton,
                          dogForm.breed === breed && styles.breedButtonSelected
                        ]}
                        onPress={() => setDogForm({...dogForm, breed})}
                      >
                        <Text style={[
                          styles.breedButtonText,
                          dogForm.breed === breed && styles.breedButtonTextSelected
                        ]}>
                          {breed}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>활동성</Text>
                <View style={styles.activityContainer}>
                  {(['low', 'medium', 'high'] as const).map((level) => (
                    <TouchableOpacity
                      key={level}
                      style={[
                        styles.activityButton,
                        dogForm.activityLevel === level && styles.activityButtonSelected
                      ]}
                      onPress={() => setDogForm({...dogForm, activityLevel: level})}
                    >
                      <Text style={[
                        styles.activityButtonText,
                        dogForm.activityLevel === level && styles.activityButtonTextSelected
                      ]}>
                        {level === 'low' ? '낮음' : level === 'medium' ? '보통' : '높음'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowDogModal(false)}
              >
                <Text style={styles.modalCancelText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSaveButton}
                onPress={saveDogInfo}
              >
                <Text style={styles.modalSaveText}>저장</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  dogButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dogButtonText: {
    fontSize: 20,
  },
  mapContainer: {
    flex: 1,
    margin: 10,
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
  dogInfoBanner: {
    backgroundColor: '#4ECDC4',
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginHorizontal: 10,
    borderRadius: 20,
    marginBottom: 5,
  },
  dogInfoText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  runningInfo: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  timerContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  timerText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  timerLabel: {
    fontSize: 16,
    color: '#7F8C8D',
    marginTop: 5,
  },

  // 완료 배너 스타일
  completedBanner: {
    backgroundColor: '#27AE60',
    borderRadius: 15,
    padding: 15,
    marginTop: 20,
    alignItems: 'center',
  },
  completedText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 5,
  },
  completedSubtext: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  controlButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    gap: 15,
  },
  runButton: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  runButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  resetButton: {
    backgroundColor: '#95A5A6',
    borderRadius: 25,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  resetButtonText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  statLabel: {
    fontSize: 12,
    color: '#7F8C8D',
    marginTop: 5,
  },

  // 모달 스타일
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2C3E50',
    textAlign: 'center',
    marginBottom: 20,
  },
  modalForm: {
    maxHeight: 400,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#F8F9FA',
  },
  breedContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 5,
  },
  breedButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  breedButtonSelected: {
    backgroundColor: '#FF6B6B',
    borderColor: '#FF6B6B',
  },
  breedButtonText: {
    fontSize: 14,
    color: '#7F8C8D',
  },
  breedButtonTextSelected: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  activityContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  activityButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    alignItems: 'center',
  },
  activityButtonSelected: {
    backgroundColor: '#4ECDC4',
    borderColor: '#4ECDC4',
  },
  activityButtonText: {
    fontSize: 14,
    color: '#7F8C8D',
  },
  activityButtonTextSelected: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 10,
    backgroundColor: '#95A5A6',
    alignItems: 'center',
  },
  modalCancelText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalSaveButton: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 10,
    backgroundColor: '#27AE60',
    alignItems: 'center',
  },
  modalSaveText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});