import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Dimensions,
  ScrollView,
  StatusBar,
  Platform,
  Image
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';

const { width } = Dimensions.get('window');

interface RunningRecord {
  duration: string;
  distance: string;
  calories: string;
  dogCalories: string;
}
interface DayRecordLegacy {
  date: string;
  photos: string[];
  memo: string;
  runningRecord?: RunningRecord;
  mood: '😊' | '😐' | '😢' | '🤗' | '😴' | '';
}
interface DayEntry { runningRecord?: RunningRecord; }
interface DayRecordNew {
  date: string;
  photos: string[];
  memo: string;
  mood: DayRecordLegacy['mood'];
  entries?: DayEntry[];
}
type AnyDayRecord = DayRecordLegacy | DayRecordNew;

export default function HomeScreen() {
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [allPhotos, setAllPhotos] = useState<string[]>([]);

  const [totalCal, setTotalCal] = useState(0);
  const [totalDogCal, setTotalDogCal] = useState(0);
  const [totalDist, setTotalDist] = useState(0);
  const [avgMonthCal, setAvgMonthCal] = useState(0);
  const [avgMonthDogCal, setAvgMonthDogCal] = useState(0);
  const [avgMonthDist, setAvgMonthDist] = useState(0);
  const [avgMonthSpeed, setAvgMonthSpeed] = useState(0);

  useEffect(() => {
    const hideNavigationBar = async () => {
      if (Platform.OS === 'android') {
        try {
          const NavigationBar = await import('expo-navigation-bar');
          await NavigationBar.setVisibilityAsync('hidden');
          await NavigationBar.setBehaviorAsync('overlay-swipe');
        } catch (e) {
          console.log('네비게이션 바 제어 불가:', e);
        }
      }
    };
    hideNavigationBar();
  }, []);

  // 최초 1회 로드
  useEffect(() => {
    loadAllFromStorage();
  }, []);

  // 화면이 다시 포커스될 때마다 최신 데이터 로드 ✅
  useFocusEffect(
    useCallback(() => {
      loadAllFromStorage();
    }, [])
  );

  useEffect(() => {
    if (allPhotos.length > 1) {
      const it = setInterval(() => {
        setCurrentPhotoIndex((p) => (p + 1) % allPhotos.length);
      }, 3000);
      return () => clearInterval(it);
    }
  }, [allPhotos.length]);

  const num = (s?: string) => {
    if (!s) return 0;
    const n = parseFloat(String(s).replace(/[^\d.]/g, ''));
    return isNaN(n) ? 0 : n;
  };

  const durationToHours = (raw?: string) => {
    if (!raw) return 0;
    const s = raw.trim();
    if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(s)) {
      const parts = s.split(':').map((v) => parseInt(v, 10));
      if (parts.length === 2) {
        const [m, sec] = parts;
        return m / 60 + (sec || 0) / 3600;
      }
      if (parts.length === 3) {
        const [h, m, sec] = parts;
        return h + m / 60 + (sec || 0) / 3600;
      }
    }
    const h = /(\d+(?:\.\d+)?)\s*(시간|h)/i.exec(s)?.[1];
    const m = /(\d+(?:\.\d+)?)\s*(분|m)/i.exec(s)?.[1];
    const sec = /(\d+(?:\.\d+)?)\s*(초|s)/i.exec(s)?.[1];
    if (h || m || sec) {
      return (h ? parseFloat(h) : 0) + (m ? parseFloat(m) / 60 : 0) + (sec ? parseFloat(sec) / 3600 : 0);
    }
    if (/^\d+(\.\d+)?$/.test(s)) return parseFloat(s) / 60;
    return 0;
  };

  const loadAllFromStorage = async () => {
    try {
      const saved = await AsyncStorage.getItem('dayRecords');
      if (!saved) {
        // 기록이 없으면 초기화
        setAllPhotos([]);
        setTotalCal(0);
        setTotalDogCal(0);
        setTotalDist(0);
        setAvgMonthCal(0);
        setAvgMonthDogCal(0);
        setAvgMonthDist(0);
        setAvgMonthSpeed(0);
        return;
      }

      const records: AnyDayRecord[] = JSON.parse(saved);

      // 최신 10장 사진
      const photos: string[] = [];
      records.forEach((r) => photos.push(...(r.photos || [])));
      setAllPhotos(photos.slice(-10).reverse());

      // 러닝 기록 평탄화(구/신 구조 호환)
      type FlatRun = { date: string; rr: RunningRecord };
      const flat: FlatRun[] = [];
      records.forEach((r) => {
        const date = (r as any).date;
        if ((r as DayRecordNew).entries && Array.isArray((r as DayRecordNew).entries)) {
          (r as DayRecordNew).entries!.forEach((e) => {
            if (e.runningRecord) flat.push({ date, rr: e.runningRecord });
          });
        }
        if ((r as DayRecordLegacy).runningRecord) {
          flat.push({ date, rr: (r as DayRecordLegacy).runningRecord! });
        }
      });

      // 총합
      let sumCal = 0;
      let sumDog = 0;
      let sumDist = 0;
      flat.forEach(({ rr }) => {
        sumCal += Math.round(num(rr.calories));
        sumDog += Math.round(num(rr.dogCalories));
        sumDist += num(rr.distance); // km
      });
      setTotalCal(sumCal);
      setTotalDogCal(sumDog);
      setTotalDist(sumDist);

      // 이번 달 평균
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

      let monthCalSum = 0;
      let monthDogCalSum = 0;
      let monthDistSum = 0;
      let monthHourSum = 0;
      let monthCount = 0;

      flat.forEach(({ date, rr }) => {
        const d = new Date(date);
        if (d >= monthStart && d < monthEnd) {
          const dist = num(rr.distance);
          const h = durationToHours(rr.duration);
          const cal = num(rr.calories);
          const dcal = num(rr.dogCalories);

          monthCalSum += cal;
          monthDogCalSum += dcal;
          monthDistSum += dist;
          monthHourSum += h;
          monthCount += 1;
        }
      });

      setAvgMonthCal(monthCount ? monthCalSum / monthCount : 0);
      setAvgMonthDogCal(monthCount ? monthDogCalSum / monthCount : 0);
      setAvgMonthDist(monthCount ? monthDistSum / monthCount : 0);
      setAvgMonthSpeed(monthHourSum > 0 ? monthDistSum / monthHourSum : 0);
    } catch (e) {
      console.log('기록 로드 오류:', e);
    }
  };

  const StatCard = ({
    label,
    value,
    color,
    wide = false,
  }: {
    label: string;
    value: string;
    color: string;
    wide?: boolean;
  }) => (
    <View style={[styles.statCard, { backgroundColor: color }, wide && styles.statCardWide]}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );

  return (
    <>
      <StatusBar hidden={true} />
      <SafeAreaView style={styles.container}>
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingTop: 28,
            paddingBottom: 30,
          }}
        >
          {/* 사진 섹션 */}
          <View style={styles.photoSection}>
            {allPhotos.length > 0 ? (
              <View style={styles.photoContainer}>
                <Image source={{ uri: allPhotos[currentPhotoIndex] }} style={styles.slidePhoto} />
                <View style={styles.photoOverlay}>
                  <Text style={styles.photoText}>우리의 추억 💕</Text>
                  {allPhotos.length > 1 && (
                    <View style={styles.photoIndicators}>
                      {allPhotos.map((_, i) => (
                        <View
                          key={i}
                          style={[styles.indicator, i === currentPhotoIndex && styles.activeIndicator]}
                        />
                      ))}
                    </View>
                  )}
                </View>
              </View>
            ) : (
              <View style={styles.noPhotoContainer}>
                <Text style={styles.noPhotoIcon}>📷</Text>
                <Text style={styles.noPhotoText}>아직 추억이 없어요</Text>
                <Text style={styles.noPhotoSubtext}>캘린더에서 사진을 추가해보세요!</Text>
              </View>
            )}
          </View>

          {/* 운동 통계 */}
          <View style={styles.statsHeader}>
            <Text style={styles.statsTitle}>운동 통계</Text>
            <Text style={styles.statsSub}>이번 달 평균과 전체 누적을 한눈에</Text>
          </View>

          <View style={styles.statsGrid}>
            <StatCard color="#45B7D1" label="총 거리" value={`${totalDist.toFixed(2)} km`} />
            <StatCard color="#FF6B6B" label="총 소모 칼로리" value={`${totalCal.toLocaleString()} kcal`} />
            <StatCard color="#4ECDC4" label="강아지 총 소모 칼로리" value={`${totalDogCal.toLocaleString()} kcal`} />
            <StatCard color="#9B59B6" label="한 달 평균 칼로리" value={`${Math.round(avgMonthCal).toLocaleString()} kcal`} />
            <StatCard color="#27AE60" label="강아지 한 달 평균 칼로리" value={`${Math.round(avgMonthDogCal).toLocaleString()} kcal`} />
            <StatCard color="#8E44AD" label="한 달 평균 거리" value={`${avgMonthDist.toFixed(2)} km`} />
            <StatCard color="#F39C12" label="한 달 평균 속도" value={`${avgMonthSpeed.toFixed(2)} km/h`} wide />
          </View>

          <View style={styles.bottomSpacing} />
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  // 캘린더와 동일 배경
  container: { flex: 1, backgroundColor: '#AEC3A9' },

  content: { flex: 1, paddingHorizontal: 20 },

  photoSection: { marginTop: 36, marginBottom: 28 },
  photoContainer: {
    position: 'relative',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 10,
  },
  slidePhoto: { width: '100%', height: 200, borderRadius: 20 },
  photoOverlay: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  photoText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 10 },
  photoIndicators: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  indicator: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.5)' },
  activeIndicator: { backgroundColor: '#FFFFFF' },
  noPhotoContainer: {
    height: 200,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 5,
  },
  noPhotoIcon: { fontSize: 48, marginBottom: 10 },
  noPhotoText: { fontSize: 18, fontWeight: 'bold', color: '#2C3E50', marginBottom: 5 },
  noPhotoSubtext: { fontSize: 14, color: '#7F8C8D', textAlign: 'center' },

  statsHeader: { marginTop: 8, marginBottom: 12 },
  statsTitle: { fontSize: 20, fontWeight: 'bold', color: '#2C3E50' },
  statsSub: { fontSize: 12, color: '#2C3E50', opacity: 0.7, marginTop: 4 },

  statsGrid: { marginTop: 14, rowGap: 12, columnGap: 12, flexDirection: 'row', flexWrap: 'wrap' },
  statCard: {
    width: (width - 20 * 2 - 12) / 2,
    minHeight: 92,
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 16,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 12,
  },
  statCardWide: { width: '100%' },
  statLabel: { color: '#FFFFFF', fontSize: 13, opacity: 0.95 },
  statValue: { marginTop: 6, color: '#FFFFFF', fontSize: 22, fontWeight: '800' },

  bottomSpacing: { height: 30 },
});
