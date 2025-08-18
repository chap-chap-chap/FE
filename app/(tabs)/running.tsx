import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, { Marker, Polyline } from 'react-native-maps';

interface RunningRecord {
  duration: string;
  distance: string;
  calories: string;
  dogCalories: string;
}
interface DayEntry { runningRecord?: RunningRecord; }
interface DayRecord {
  date: string;
  photos: string[];
  memo: string;
  mood: '😊' | '😐' | '😢' | '🤗' | '😴' | '';
  entries?: DayEntry[];
  runningRecord?: RunningRecord;
  runningLogs?: RunningRecord[];
}
interface LocationCoords { latitude: number; longitude: number; }
interface DogInfo {
  name: string; weight: number; age: number; breed: string;
  activityLevel: 'low' | 'medium' | 'high';
}

export default function RunningScreen() {
  const insets = useSafeAreaInsets();
  const TABBAR_OVERLAY = 130;

  const [isRunning, setIsRunning] = useState(false);
  const [activityType, setActivityType] = useState<'run' | 'walk'>('run'); // ▶ 활동(런/워크)
  const [showActivityPicker, setShowActivityPicker] = useState(false);

  const [time, setTime] = useState('00:00');
  const [seconds, setSeconds] = useState(0);
  const [location, setLocation] = useState<LocationCoords | null>(null);
  const [route, setRoute] = useState<LocationCoords[]>([]);
  const [distance, setDistance] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const [dogProfiles, setDogProfiles] = useState<DogInfo[]>([]);
  const [activeDogIndex, setActiveDogIndex] = useState<number | null>(null);
  const [selectedDogIndices, setSelectedDogIndices] = useState<number[]>([]);

  const [humanCalories, setHumanCalories] = useState(0);
  const [dogCaloriesTotal, setDogCaloriesTotal] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);

  const [showDogManageModal, setShowDogManageModal] = useState(false);
  const [showDogPicker, setShowDogPicker] = useState(false);

  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [dogForm, setDogForm] = useState({
    name: '', weight: '', age: '',
    breed: '믹스견',
    activityLevel: 'medium' as 'low' | 'medium' | 'high'
  });

  const breeds = [
    '믹스견','골든 리트리버','래브라도','시바견','보더 콜리','허스키',
    '말티즈','푸들','비숑 프리제','치와와','요크셔테리어','비글','불독','진돗개'
  ];

  // 시스템 UI
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

  // 위치 초기화
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { status, canAskAgain } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          if (canAskAgain) Alert.alert('권한 필요', '위치 권한을 허용해야 지도를 사용할 수 있습니다.');
          else Alert.alert('권한 필요', '설정에서 위치 권한을 허용해주세요.');
          if (!cancelled) setIsLoading(false);
          return;
        }
        const current = await Promise.race([
          Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced, mayShowUserSettingsDialog: true }),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 8000))
        ]);
        let coords: LocationCoords | null = null;
        if (current && 'coords' in current) {
          coords = { latitude: current.coords.latitude, longitude: current.coords.longitude };
        } else {
          const last = await Location.getLastKnownPositionAsync();
          if (last) coords = { latitude: last.coords.latitude, longitude: last.coords.longitude };
        }
        if (!coords) {
          coords = { latitude: 37.5665, longitude: 126.9780 };
          Alert.alert('안내', '현재 위치를 가져오지 못해 기본 위치로 표시합니다.');
        }
        if (!cancelled) {
          setLocation(coords);
          setRoute([coords]);
          setIsLoading(false);
        }
      } catch {
        if (!cancelled) {
          const fallback = { latitude: 37.5665, longitude: 126.9780 };
          setLocation(fallback);
          setRoute([fallback]);
          setIsLoading(false);
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // 타이머
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning) {
      interval = setInterval(() => {
        setSeconds((prev) => {
          const next = prev + 1;
          const m = Math.floor(next / 60);
          const s = next % 60;
          setTime(`${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
          return next;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning]);

  // 이동 경로 추적
  useEffect(() => {
    let sub: Location.LocationSubscription | undefined;
    const track = async () => {
      if (isRunning) {
        sub = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.Balanced, timeInterval: 3000, distanceInterval: 5 },
          (loc) => {
            const p = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
            setLocation(p);
            setRoute((prev) => {
              const next = [...prev, p];
              calculateDistance(next);
              return next;
            });
          }
        );
      }
    };
    track();
    return () => { if (sub) sub.remove(); };
  }, [isRunning]);

  // 강아지 목록 로드
  useEffect(() => {
    (async () => {
      const raw = await AsyncStorage.getItem('dogProfiles');
      if (raw) {
        const arr: DogInfo[] = JSON.parse(raw);
        setDogProfiles(arr);
        setActiveDogIndex(arr.length ? 0 : null);
      }
    })();
  }, []);

  // 칼로리 계산 트리거
  useEffect(() => {
    if (distance > 0 && seconds > 0) calculateCalories();
  }, [distance, seconds, activityType, selectedDogIndices.join(','), dogProfiles.length]);

  const calculateDistance = (coordinates: LocationCoords[]) => {
    if (coordinates.length < 2) return;
    let total = 0;
    for (let i = 1; i < coordinates.length; i++) {
      total += getDistanceBetweenPoints(coordinates[i - 1], coordinates[i]);
    }
    setDistance(total);
  };

  const getDistanceBetweenPoints = (a: LocationCoords, b: LocationCoords) => {
    const R = 6371;
    const dLat = (b.latitude - a.latitude) * Math.PI / 180;
    const dLon = (b.longitude - a.longitude) * Math.PI / 180;
    const s =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(a.latitude * Math.PI / 180) * Math.cos(b.latitude * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
    return R * c; // km
  };

  // ▶️ 활동타입에 따라 칼로리 분리 계산
  const calculateCalories = () => {
    const h = seconds / 3600;

    // 사람 칼로리: 러닝/워킹 단순 분리(개발용)
    // 러닝 ≈ 700 kcal/h, 산책 ≈ 280 kcal/h
    const humanPerHour = activityType === 'run' ? 700 : 280;
    setHumanCalories(Math.round(humanPerHour * h));

    // 강아지 칼로리: 활동타입에 따른 가중치
    const typeFactor = activityType === 'run' ? 1.0 : 0.7;

    const totalDog = selectedDogIndices.reduce((sum, idx) => {
      const d = dogProfiles[idx];
      if (!d) return sum;
      return sum + calculateDogCalories(d, h, distance, typeFactor);
    }, 0);
    setDogCaloriesTotal(totalDog);
  };

  const saveToCalendar = async (runningData: RunningRecord) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const existing = await AsyncStorage.getItem('dayRecords');
      let records: DayRecord[] = existing ? JSON.parse(existing) : [];
      const idx = records.findIndex((r) => r.date === today);

      if (idx >= 0) {
        const rec = records[idx];
        let entries: DayEntry[] = Array.isArray(rec.entries) ? rec.entries.slice() : [];
        if (rec.runningLogs?.length) {
          entries = [...entries, ...rec.runningLogs.map(l => ({ runningRecord: l }))];
        }
        if (rec.runningRecord) entries.push({ runningRecord: rec.runningRecord });
        entries.push({ runningRecord: runningData });
        records[idx] = { ...rec, entries, runningLogs: undefined, runningRecord: undefined };
      } else {
        records.push({ date: today, photos: [], memo: '', mood: '', entries: [{ runningRecord: runningData }] });
      }
      await AsyncStorage.setItem('dayRecords', JSON.stringify(records));
      return true;
    } catch {
      return false;
    }
  };

  const calculateDogCalories = (dog: DogInfo, hours: number, km: number, typeFactor = 1.0) => {
    const base = 70 * Math.pow(dog.weight, 0.75);
    const act = { low: 1.2, medium: 1.4, high: 1.8 }[dog.activityLevel];
    const breed: { [k: string]: number } = {
      '골든 리트리버': 1.3, '래브라도': 1.3, '허스키': 1.5, '보더 콜리': 1.4, '비글': 1.2,
      '시바견': 1.1, '진돗개': 1.2, '말티즈': 0.9, '비숑 프리제': 1.0, '치와와': 0.8,
      '요크셔테리어': 0.8, '푸들': 1.0, '불독': 0.9, '믹스견': 1.0
    };
    const speed = km > 0 && hours > 0 ? Math.min(km / hours, 15) : 5;
    const intensity = (1 + speed / 20) * typeFactor;
    const daily = base * act * (breed[dog.breed] || 1.0);
    const perHour = daily / 24;
    return Math.round(perHour * intensity * hours);
  };

  // ▶️ 시작/정지(선택 모달 포함)
  const openStartFlow = () => {
    if (isRunning) {
      // 정지 로직
      setIsRunning(false);
      setIsCompleted(true);
      if (seconds > 0 && (distance > 0 || humanCalories > 0)) {
        const names = selectedDogIndices.map(i => dogProfiles[i]?.name).filter(Boolean).join(', ');
        Alert.alert(
          '🏃‍♂️ 운동 완료!',
          `시간: ${time}\n거리: ${distance.toFixed(2)}km\n내 칼로리: ${humanCalories}kcal\n강아지 칼로리(합계): ${dogCaloriesTotal}kcal${names ? `\n동반: ${names}` : ''}\n\n캘린더에 기록하시겠습니까?`,
          [
            { text: '아니오', style: 'cancel' },
            {
              text: '예',
              onPress: async () => {
                const data: RunningRecord = {
                  duration: time, distance: `${distance.toFixed(2)}km`,
                  calories: `${humanCalories}`, dogCalories: `${dogCaloriesTotal}`
                };
                const ok = await saveToCalendar(data);
                if (ok) Alert.alert('저장 완료!', '오늘의 운동 기록이 캘린더에 저장되었습니다! 📅');
                else Alert.alert('저장 실패', '캘린더 저장 중 오류가 발생했습니다.');
              }
            }
          ]
        );
      }
    } else {
      // 시작 전 활동 선택
      setShowActivityPicker(true);
    }
  };

  const startWithType = (t: 'run' | 'walk') => {
    setActivityType(t);
    setShowActivityPicker(false);
    setIsRunning(true);
    setSeconds(0);
    setTime('00:00');
    setDistance(0);
    setHumanCalories(0);
    setDogCaloriesTotal(0);
    setIsCompleted(false);
    if (location) setRoute([location]);
  };

  const handleReset = () => {
    Alert.alert('초기화 확인', '현재 운동 기록을 초기화하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '초기화',
        onPress: () => {
          setIsRunning(false);
          setSeconds(0);
          setTime('00:00');
          setDistance(0);
          setHumanCalories(0);
          setDogCaloriesTotal(0);
          setIsCompleted(false);
          if (location) setRoute([location]);
        }
      }
    ]);
  };

  // ---------- 프로필 관리 ----------
  const newDogForm = () => {
    setFormMode('create');
    setDogForm({ name: '', weight: '', age: '', breed: '믹스견', activityLevel: 'medium' });
    setShowDogManageModal(true);
  };
  const editSelectedDog = (index: number) => {
    setActiveDogIndex(index);
    const d = dogProfiles[index];
    setFormMode('edit');
    setDogForm({
      name: d.name,
      weight: String(d.weight),
      age: String(d.age),
      breed: d.breed,
      activityLevel: d.activityLevel
    });
    setShowDogManageModal(true);
  };
  const saveDogInfo = async () => {
    if (!dogForm.name || !dogForm.weight || !dogForm.age) {
      Alert.alert('입력 오류', '모든 정보를 입력해주세요.');
      return;
    }
    const info: DogInfo = {
      name: dogForm.name,
      weight: parseFloat(dogForm.weight),
      age: parseInt(dogForm.age),
      breed: dogForm.breed,
      activityLevel: dogForm.activityLevel
    };

    let nextProfiles = dogProfiles.slice();
    if (formMode === 'create') {
      nextProfiles.push(info);
      setActiveDogIndex(nextProfiles.length - 1);
    } else if (formMode === 'edit' && activeDogIndex !== null) {
      nextProfiles[activeDogIndex] = info;
    }

    setDogProfiles(nextProfiles);
    await AsyncStorage.setItem('dogProfiles', JSON.stringify(nextProfiles));
    setShowDogManageModal(false);
    Alert.alert('저장 완료', `${info.name}의 정보가 저장되었습니다!`);
  };
  const deleteDog = async () => {
    if (activeDogIndex === null) return;
    const target = dogProfiles[activeDogIndex];
    Alert.alert(
      '삭제 확인',
      `${target.name} 프로필을 삭제할까요?`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            const removedIndex = activeDogIndex;
            const next = dogProfiles.filter((_, i) => i !== removedIndex);
            const nextSelected = selectedDogIndices
              .filter(i => i !== removedIndex)
              .map(i => (i > removedIndex ? i - 1 : i));

            setDogProfiles(next);
            setSelectedDogIndices(nextSelected);
            await AsyncStorage.setItem('dogProfiles', JSON.stringify(next));

            if (next.length === 0) {
              setActiveDogIndex(null);
              setFormMode('create');
              setDogForm({ name: '', weight: '', age: '', breed: '믹스견', activityLevel: 'medium' });
            } else {
              const nextIndex = Math.min(removedIndex, next.length - 1);
              setActiveDogIndex(nextIndex);
              setFormMode('edit');
              const d = next[nextIndex];
              setDogForm({
                name: d.name, weight: String(d.weight), age: String(d.age),
                breed: d.breed, activityLevel: d.activityLevel
              });
            }
            Alert.alert('삭제 완료', '프로필이 삭제되었습니다.');
          }
        }
      ]
    );
  };

  const toggleSelectDog = (idx: number) => {
    setSelectedDogIndices(prev => (
      prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
    ));
  };
  const clearSelection = () => setSelectedDogIndices([]);

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B6B" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#AEC3A9" />
      <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
        {/* ▼ 바닥 언더레이: 탭/안전영역까지 아이보리로 매끈하게 덮기 */}
        <View pointerEvents="none" style={[styles.bottomUnderlay, { height: (insets.bottom ?? 0) + 120 }]} />

        {/* 지도 (추천 코스 영역으로 활용 예정) */}
        <View style={[styles.mapContainer, { flex: 1.5, marginTop: -12, marginBottom: -5 }]}>
          {location && (
            <MapView
              style={styles.map}
              initialRegion={{
                latitude: location.latitude,
                longitude: location.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01
              }}
              showsUserLocation
              followsUserLocation={isRunning}
              showsMyLocationButton
            >
              <Marker coordinate={location} title="현재 위치" pinColor="#FF6B6B" />
              {route.length > 1 && (
                <Polyline coordinates={route} strokeColor="#FF6B6B" strokeWidth={4} lineCap="round" lineJoin="round" />
              )}
            </MapView>
          )}
        </View>

        {/* 선택된 강아지 배너 */}
        {selectedDogIndices.length > 0 && (
          <View style={styles.dogInfoBanner}>
            <Text style={styles.dogInfoText}>
              🐕 동반: {selectedDogIndices.map(i => dogProfiles[i]?.name).filter(Boolean).join(', ')}
            </Text>
          </View>
        )}

        {/* 하단 패널(아이보리) */}
        <View style={[styles.runningInfo, { paddingBottom: 80 + insets.bottom }]}>
          {/* 상단 행: 좌측 동반강아지, 우측 프로필관리 */}
          <View style={styles.panelTopRow}>
            <TouchableOpacity style={styles.miniSelectDogBtn} onPress={() => setShowDogPicker(true)}>
              <Text style={styles.miniSelectDogTxt}>🐶 동반 강아지</Text>
              {selectedDogIndices.length > 0 && (
                <View style={styles.miniBadge}>
                  <Text style={styles.miniBadgeTxt}>{selectedDogIndices.length}</Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.manageBtn} onPress={newDogForm}>
              <Text style={styles.manageBtnText}>프로필 관리</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.timerContainer}>
            <Text style={styles.timerText}>{time}</Text>
            <Text style={styles.timerLabel}>경과 시간 · {activityType === 'run' ? '런닝' : '산책'}</Text>
          </View>

          {/* 중앙 컨트롤 */}
          <View style={styles.controlButtons}>
            <TouchableOpacity
              style={[styles.runButton, { backgroundColor: isRunning ? '#E74C3C' : '#27AE60' }]}
              onPress={openStartFlow}
            >
              <Text style={styles.runButtonText}>{isRunning ? '정지' : '시작'}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
              <Text style={styles.resetButtonText}>초기화</Text>
            </TouchableOpacity>
          </View>

          {/* 선택 칩 */}
          {selectedDogIndices.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 6 }}
              style={{ marginTop: 6 }}
            >
              <View style={styles.selectedChipRow}>
                {selectedDogIndices.map((idx) => {
                  const d = dogProfiles[idx];
                  if (!d) return null;
                  return (
                    <View key={`${d.name}-${idx}`} style={styles.selectedChip}>
                      <Text style={styles.selectedChipText}>{d.name}</Text>
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          )}

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
              <Text style={styles.statValue}>{dogCaloriesTotal}</Text>
              <Text style={styles.statLabel}>🐕 칼로리(합계)</Text>
            </View>
          </View>

          {isCompleted && (
            <View style={styles.completedBanner}>
              <Text style={styles.completedText}>🎉 운동 완료!</Text>
              <Text style={styles.completedSubtext}>캘린더에서 기록을 확인해보세요</Text>
            </View>
          )}
        </View>

        {/* 동반 강아지 선택 모달 */}
        <Modal visible={showDogPicker} animationType="slide" transparent onRequestClose={() => setShowDogPicker(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>🐶 동반 강아지 선택</Text>
              <ScrollView style={{ maxHeight: 400 }}>
                {dogProfiles.length === 0 ? (
                  <Text style={{ color: '#2C3E50', marginBottom: 12 }}>
                    등록된 강아지가 없어요. 아래 '프로필 추가'로 만들어주세요.
                  </Text>
                ) : (
                  dogProfiles.map((d, idx) => {
                    const selected = selectedDogIndices.includes(idx);
                    return (
                      <TouchableOpacity
                        key={`${d.name}-${idx}`}
                        style={[styles.pickRow, selected && styles.pickRowSelected]}
                        onPress={() => toggleSelectDog(idx)}
                      >
                        <View style={[styles.checkbox, selected && styles.checkboxChecked]}>
                          {selected && <Text style={styles.checkboxMark}>✓</Text>}
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.pickName}>{d.name} ({d.weight}kg, {d.breed})</Text>
                          <Text style={styles.pickSub}>활동성: {d.activityLevel === 'low' ? '낮음' : d.activityLevel === 'medium' ? '보통' : '높음'}</Text>
                        </View>
                        <TouchableOpacity style={styles.pickEdit} onPress={() => { setShowDogPicker(false); editSelectedDog(idx); }}>
                          <Text style={styles.pickEditText}>수정</Text>
                        </TouchableOpacity>
                      </TouchableOpacity>
                    );
                  })
                )}
              </ScrollView>

              <View style={styles.modalButtons}>
                <TouchableOpacity style={styles.modalGhostButton} onPress={clearSelection}>
                  <Text style={styles.modalGhostText}>선택 해제</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalGhostButton} onPress={newDogForm}>
                  <Text style={styles.modalGhostText}>프로필 추가</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalSaveButton} onPress={() => setShowDogPicker(false)}>
                  <Text style={styles.modalSaveText}>완료</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* 활동 선택 모달 (런닝/산책) */}
        <Modal visible={showActivityPicker} transparent animationType="fade" onRequestClose={() => setShowActivityPicker(false)}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { paddingVertical: 24 }]}>
              <Text style={styles.modalTitle}>활동을 선택하세요</Text>
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
                <TouchableOpacity style={styles.activityPickBtn} onPress={() => startWithType('run')}>
                  <Text style={styles.activityPickTxt}>🏃‍♂️ 런닝</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.activityPickBtn, { backgroundColor: '#4ECDC4' }]} onPress={() => startWithType('walk')}>
                  <Text style={styles.activityPickTxt}>🚶 산책</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity onPress={() => setShowActivityPicker(false)} style={{ marginTop: 10, alignSelf: 'center' }}>
                <Text style={{ color: '#7F8C8D', fontWeight: '700' }}>취소</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* 강아지 프로필 관리 모달 */}
        <Modal visible={showDogManageModal} animationType="slide" transparent onRequestClose={() => setShowDogManageModal(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>🐕 강아지 정보</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                <View style={styles.dogChipRow}>
                  {dogProfiles.map((d, idx) => (
                    <TouchableOpacity
                      key={`${d.name}-${idx}`}
                      style={[styles.dogChip, activeDogIndex === idx && styles.dogChipActive]}
                      onPress={() => editSelectedDog(idx)}
                    >
                      <Text style={[styles.dogChipText, activeDogIndex === idx && styles.dogChipTextActive]}>
                        {d.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity style={styles.dogChipAdd} onPress={newDogForm}>
                    <Text style={styles.dogChipAddText}>+ 새 강아지</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>

              <ScrollView style={styles.modalForm}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>이름</Text>
                  <TextInput style={styles.textInput} value={dogForm.name} onChangeText={(text) => setDogForm({ ...dogForm, name: text })} placeholder="강아지 이름" />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>체중 (kg)</Text>
                  <TextInput style={styles.textInput} value={dogForm.weight} onChangeText={(text) => setDogForm({ ...dogForm, weight: text })} placeholder="체중을 입력하세요" keyboardType="numeric" />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>나이</Text>
                  <TextInput style={styles.textInput} value={dogForm.age} onChangeText={(text) => setDogForm({ ...dogForm, age: text })} placeholder="나이를 입력하세요" keyboardType="numeric" />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>견종</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.breedContainer}>
                      {breeds.map((breed) => (
                        <TouchableOpacity
                          key={breed}
                          style={[styles.breedButton, dogForm.breed === breed && styles.breedButtonSelected]}
                          onPress={() => setDogForm({ ...dogForm, breed })}
                        >
                          <Text style={[styles.breedButtonText, dogForm.breed === breed && styles.breedButtonTextSelected]}>
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
                        style={[styles.activityButton, dogForm.activityLevel === level && styles.activityButtonSelected]}
                        onPress={() => setDogForm({ ...dogForm, activityLevel: level })}
                      >
                        <Text style={[styles.activityButtonText, dogForm.activityLevel === level && styles.activityButtonTextSelected]}>
                          {level === 'low' ? '낮음' : level === 'medium' ? '보통' : '높음'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </ScrollView>

              <View style={styles.modalButtons}>
                {formMode === 'edit' && activeDogIndex !== null && (
                  <TouchableOpacity style={styles.modalDeleteButton} onPress={deleteDog}>
                    <Text style={styles.modalDeleteText}>삭제</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={styles.modalCancelButton} onPress={() => setShowDogManageModal(false)}>
                  <Text style={styles.modalCancelText}>닫기</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalSaveButton} onPress={saveDogInfo}>
                  <Text style={styles.modalSaveText}>{formMode === 'create' ? '추가' : '수정 저장'}</Text>
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
  container: { flex: 1, backgroundColor: '#AEC3A9', position: 'relative' },

  // ▼ 하단 언더레이(아이보리): 카드가 밑에서 끊겨 보이지 않게 바닥까지 채움
  bottomUnderlay: {
    position: 'absolute',
    left: 0, right: 0, bottom: 0,
    backgroundColor: '#F7F4E9',
    zIndex: 0
  },

  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // 지도(조금 더 크게)
  mapContainer: {
    flex: 1,
    margin: 8,
    marginTop: 0,
    marginBottom: 0,
    borderRadius: 15,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 1
  },
  map: { flex: 1 },

  // 선택 배너
  dogInfoBanner: {
    backgroundColor: '#4ECDC4',
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginHorizontal: 10,
    borderRadius: 20,
    marginBottom: 5,
    zIndex: 1
  },
  dogInfoText: { color: '#FFFFFF', fontSize: 14, fontWeight: 'bold', textAlign: 'center' },

  // 하단 패널(아이보리, 살짝 작게)
  runningInfo: {
    backgroundColor: '#F7F4E9',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 2,
    marginTop: 15
  },
  panelTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8
  },

  // 좌측 상단: 동반 강아지(미니)
  miniSelectDogBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#EEF3F7',
    borderRadius: 12,
    alignSelf: 'flex-start'
  },
  miniSelectDogTxt: { color: '#2C3E50', fontWeight: '800' },
  miniBadge: {
    position: 'absolute',
    top: -6, right: -6,
    width: 20, height: 20, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#FF6B6B'
  },
  miniBadgeTxt: { color: '#FFF', fontSize: 11, fontWeight: '800' },

  manageBtn: {
    alignSelf: 'flex-end',
    backgroundColor: '#F0F1F2',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12
  },
  manageBtnText: { color: '#2C3E50', fontWeight: '700' },

  timerContainer: { alignItems: 'center', marginBottom: 10 },
  timerText: { fontSize: 44, fontWeight: 'bold', color: '#2C3E50' }, // 살짝 작게
  timerLabel: { fontSize: 16, color: '#2C3E50', opacity: 0.75, marginTop: 5 },

  controlButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    gap: 10
  },
  runButton: { width: 92, height: 92, borderRadius: 46, justifyContent: 'center', alignItems: 'center' }, // 작게
  runButtonText: { fontSize: 16, color: '#FFFFFF', fontWeight: 'bold' },

  resetButton: { backgroundColor: '#95A5A6', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12 },
  resetButtonText: { fontSize: 14, color: '#FFFFFF', fontWeight: 'bold' },

  // 선택된 칩
  selectedChipRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  selectedChip: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#F0F1F2', borderRadius: 14 },
  selectedChipText: { color: '#2C3E50', fontWeight: '700' },

  // 통계
  statsContainer: { flexDirection: 'row', justifyContent: 'space-around', paddingTop: 18, borderTopWidth: 1, borderTopColor: '#E0E0E0' },
  statItem: { alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: 'bold', color: '#2C3E50' },
  statLabel: { fontSize: 12, color: '#7F8C8D', marginTop: 5 },

  completedBanner: { backgroundColor: '#27AE60', borderRadius: 15, padding: 15, marginTop: 20, alignItems: 'center' },
  completedText: { fontSize: 18, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 5 },
  completedSubtext: { fontSize: 14, color: '#FFFFFF', opacity: 0.9 },

  // 공통 모달
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  modalContent: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20, width: '92%', maxHeight: '85%' },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: '#2C3E50', textAlign: 'center', marginBottom: 12 },

  // 활동 선택 모달용 버튼
  activityPickBtn: {
    flex: 1,
    backgroundColor: '#2D9CDB',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center'
  },
  activityPickTxt: { color: '#FFF', fontWeight: '800' },

  // 동반 강아지 선택 모달
  pickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginBottom: 8
  },
  pickRowSelected: { backgroundColor: '#ECF8FF', borderColor: '#2D9CDB' },
  checkbox: {
    width: 22, height: 22, marginRight: 10, borderRadius: 6,
    borderWidth: 2, borderColor: '#B0BEC5', alignItems: 'center', justifyContent: 'center'
  },
  checkboxChecked: { backgroundColor: '#2D9CDB', borderColor: '#2D9CDB' },
  checkboxMark: { color: '#FFFFFF', fontWeight: '900' },
  pickName: { fontSize: 16, color: '#2C3E50', fontWeight: '700' },
  pickSub: { fontSize: 12, color: '#7F8C8D', marginTop: 2 },
  pickEdit: { paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#F0F1F2', borderRadius: 8, marginLeft: 8 },
  pickEditText: { color: '#2C3E50', fontWeight: '700', fontSize: 12 },

  modalButtons: { flexDirection: 'row', gap: 10, marginTop: 14, alignItems: 'center', justifyContent: 'flex-end' },
  modalGhostButton: { paddingVertical: 12, paddingHorizontal: 14, borderRadius: 10, backgroundColor: '#F0F1F2' },
  modalGhostText: { color: '#2C3E50', fontWeight: '700' },
  modalCancelButton: { flex: 1, paddingVertical: 14, borderRadius: 10, backgroundColor: '#95A5A6', alignItems: 'center' },
  modalCancelText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  modalSaveButton: { paddingVertical: 14, paddingHorizontal: 18, borderRadius: 10, backgroundColor: '#27AE60', alignItems: 'center' },
  modalSaveText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },

  // 프로필 관리 모달 폼
  modalForm: { maxHeight: 420 },
  inputGroup: { marginBottom: 16 },
  inputLabel: { fontSize: 14, fontWeight: 'bold', color: '#2C3E50', marginBottom: 6 },
  textInput: { borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, backgroundColor: '#F8F9FA' },

  breedContainer: { flexDirection: 'row', gap: 8, paddingVertical: 5 },
  breedButton: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F8F9FA', borderWidth: 1, borderColor: '#E0E0E0' },
  breedButtonSelected: { backgroundColor: '#FF6B6B', borderColor: '#FF6B6B' },
  breedButtonText: { fontSize: 13, color: '#7F8C8D' },
  breedButtonTextSelected: { color: '#FFFFFF', fontWeight: 'bold' },

  activityContainer: { flexDirection: 'row', gap: 10 },
  activityButton: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: '#F8F9FA', borderWidth: 1, borderColor: '#E0E0E0', alignItems: 'center' },
  activityButtonSelected: { backgroundColor: '#4ECDC4', borderColor: '#4ECDC4' },
  activityButtonText: { fontSize: 14, color: '#7F8C8D' },
  activityButtonTextSelected: { color: '#FFFFFF', fontWeight: 'bold' },

  dogChipRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dogChip: { paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#F8F9FA', borderColor: '#E0E0E0', borderWidth: 1, borderRadius: 18 },
  dogChipActive: { backgroundColor: '#27AE60', borderColor: '#27AE60' },
  dogChipText: { color: '#2C3E50', fontSize: 13 },
  dogChipTextActive: { color: '#FFFFFF', fontWeight: '700' },
  dogChipAdd: { paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#FF6B6B', borderRadius: 18 },
  dogChipAddText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },

  modalDeleteButton: { flex: 1, paddingVertical: 14, borderRadius: 10, backgroundColor: '#E74C3C', alignItems: 'center' },
  modalDeleteText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' }
});