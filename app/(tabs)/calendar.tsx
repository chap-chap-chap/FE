import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Dimensions,
  Image,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

const COLORS = {
  bg: '#AEC3A9',
  surface: '#AEC3A9',
  text: '#1D1B20',
  subtext: '#49454F',
  primary: '#6750A4',
  onPrimary: '#FFFFFF',
  white: '#FFFFFF',
  white24: 'rgba(255,255,255,0.24)',
};

const RADII = { sm: 8, md: 12, lg: 20, xl: 28 };
const SP = { 0:0, 1:4, 2:8, 3:12, 4:16, 5:20, 6:24, 7:28, 8:32 };

interface RunningRecord { duration: string; distance: string; calories: string; dogCalories: string; }
interface DayEntry { runningRecord?: RunningRecord; }
interface DayRecord {
  date: string;
  photos: string[];
  memo: string;
  mood: '😊' | '😐' | '😢' | '🤗' | '😴' | '';
  // ✅ 홈 화면이 읽는 표준 스키마
  entries?: DayEntry[];

  // ⬇️ 하위호환(예전/다른 스키마)
  runningRecord?: RunningRecord;         // 단일 기록
  runningLogs?: RunningRecord[];         // 누적 기록
}

export default function CalendarScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [dayRecords, setDayRecords] = useState<DayRecord[]>([]);
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [currentRecord, setCurrentRecord] = useState<DayRecord | null>(null);
  const [tempMemo, setTempMemo] = useState('');
  const [tempRunning, setTempRunning] = useState<RunningRecord>({ duration:'', distance:'', calories:'', dogCalories:'' });
  const [tempMood, setTempMood] = useState<'😊'|'😐'|'😢'|'🤗'|'😴'|''>('');

  // 상세(요약) 모달
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailRecord, setDetailRecord] = useState<DayRecord | null>(null);

  const [showMonthYear, setShowMonthYear] = useState(false);
  const [pickYear, setPickYear] = useState(currentDate.getFullYear());
  const [pickMonth, setPickMonth] = useState(currentDate.getMonth());

  // ---------- 유틸: 숫자/시간 파서 ----------
  const num = (s?: string) => {
    if (!s) return 0;
    const n = parseFloat(String(s).replace(/[^\d.]/g, ''));
    return isNaN(n) ? 0 : n;
  };
  // "mm:ss" | "hh:mm:ss" | "30분" | "1시간 5분" | "45" -> hours
  const durationToHours = (raw?: string) => {
    if (!raw) return 0;
    const s = raw.trim();
    if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(s)) {
      const parts = s.split(':').map(v => parseInt(v, 10));
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
    if (/^\d+(\.\d+)?$/.test(s)) return parseFloat(s) / 60; // 숫자만 → 분
    return 0;
  };

  useEffect(() => {
    (async () => {
      // 초기 로드 + 스키마 마이그레이션(runningRecord/runningLogs → entries[])
      const saved = await AsyncStorage.getItem('dayRecords');
      if (!saved) return;

      const rawList: DayRecord[] = JSON.parse(saved);
      let mutated = false;

      const migrated = rawList.map((r) => {
        const baseEntries: DayEntry[] = Array.isArray(r.entries) ? r.entries.filter(e => !!e?.runningRecord) : [];

        // runningLogs → entries
        if (Array.isArray(r.runningLogs) && r.runningLogs.length) {
          r.runningLogs.forEach(log => baseEntries.push({ runningRecord: log }));
          mutated = true;
        }
        // 단일 runningRecord → entries
        if (r.runningRecord) {
          baseEntries.push({ runningRecord: r.runningRecord });
          mutated = true;
        }
        // 정리: 표준 필드에 붙이고, 구식 필드는 비우기
        const clean: DayRecord = {
          ...r,
          entries: baseEntries,
          runningLogs: undefined,
          runningRecord: undefined,
        };
        return clean;
      });

      if (mutated) {
        await AsyncStorage.setItem('dayRecords', JSON.stringify(migrated));
      }
      setDayRecords(migrated);
    })();
  }, []);

  const saveDayRecords = async (records: DayRecord[]) => {
    await AsyncStorage.setItem('dayRecords', JSON.stringify(records));
  };

  useEffect(() => {
    (async () => {
      if (Platform.OS === 'android') {
        try {
          const NavigationBar = await import('expo-navigation-bar');
          await NavigationBar.setVisibilityAsync('hidden');
          await NavigationBar.setBehaviorAsync('overlay-swipe');
        } catch {}
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') Alert.alert('권한 필요', '사진을 선택하려면 갤러리 접근 권한이 필요합니다.');
    })();
  }, []);

  const getMonthData = (d: Date) => {
    const y = d.getFullYear(), m = d.getMonth();
    const first = new Date(y, m, 1);
    const start = new Date(first);
    start.setDate(start.getDate() - first.getDay());
    const days: Date[] = [];
    const cur = new Date(start);
    for (let i = 0; i < 42; i++) { days.push(new Date(cur)); cur.setDate(cur.getDate() + 1); }
    return { days };
  };

  const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const labelKR = (d: Date) => `${d.getMonth()+1}월`;
  const labelEN = (d: Date) => {
    const m = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    return `${m[d.getMonth()]} ${d.getFullYear()}`;
  };
  const monthNamesKR = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];
  const isToday = (d: Date) => fmt(d) === fmt(new Date());
  const isSameMonth = (d: Date, m: Date) => d.getMonth()===m.getMonth() && d.getFullYear()===m.getFullYear();
  const recOf = (d: Date) => dayRecords.find(r => r.date === fmt(d));

  const pickImage = async () => {
    try {
      const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [4,3], quality: 0.8 });
      if (!r.canceled && currentRecord) setCurrentRecord({ ...currentRecord, photos: [...currentRecord.photos, r.assets[0].uri] });
    } catch { Alert.alert('오류', '사진을 선택할 수 없습니다.'); }
  };
  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') { Alert.alert('권한 필요', '카메라 접근 권한이 필요합니다.'); return; }
      const r = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [4,3], quality: 0.8 });
      if (!r.canceled && currentRecord) setCurrentRecord({ ...currentRecord, photos: [...currentRecord.photos, r.assets[0].uri] });
    } catch { Alert.alert('오류', '사진을 촬영할 수 없습니다.'); }
  };
  const deletePhoto = (i: number) => {
    if (currentRecord) setCurrentRecord({ ...currentRecord, photos: currentRecord.photos.filter((_, idx) => idx !== i) });
  };

  const prepareModalFor = (date: Date) => {
    const ds = fmt(date);
    setSelectedDate(ds);
    const ex = recOf(date);
    if (ex) {
      setCurrentRecord(ex);
      setTempMemo(ex.memo);
      setTempRunning({ duration:'', distance:'', calories:'', dogCalories:'' }); // 새 엔트리 입력용은 빈칸
      setTempMood(ex.mood);
    } else {
      const n: DayRecord = { date: ds, photos: [], memo: '', mood: '' };
      setCurrentRecord(n);
      setTempMemo('');
      setTempRunning({ duration:'', distance:'', calories:'', dogCalories:'' });
      setTempMood('');
    }
  };

  const onDatePress = (date: Date) => {
    if (!isSameMonth(date, currentDate)) return;
    prepareModalFor(date);
    setShowRecordModal(true);
  };

  const hasNewRun = (r: RunningRecord) =>
    Boolean(r.duration?.trim() || r.distance?.trim() || r.calories?.trim() || r.dogCalories?.trim());

  const saveRecord = async () => {
    if (!currentRecord || !selectedDate) return;

    // 기존 entries + (있다면) 새 입력
    const existingEntries = Array.isArray(currentRecord.entries) ? currentRecord.entries.slice() : [];
    const nextEntries = hasNewRun(tempRunning)
      ? [...existingEntries, { runningRecord: tempRunning }]
      : existingEntries;

    const final: DayRecord = {
      ...currentRecord,
      memo: tempMemo,
      mood: tempMood,
      entries: nextEntries,
      // 하위호환 필드 제거(홈에서 entries만 읽어도 되도록)
      runningLogs: undefined,
      runningRecord: undefined,
    };

    const updated = dayRecords.filter(r => r.date !== selectedDate);
    updated.push(final);
    setDayRecords(updated);
    await saveDayRecords(updated);
    setShowRecordModal(false);
    Alert.alert('저장 완료', hasNewRun(tempRunning) ? '달리기 기록이 누적 저장되었습니다! 🐕' : '기록이 저장되었습니다! 🐕');
  };

  const deleteRecord = async () => {
    if (!selectedDate) return;
    const updated = dayRecords.filter(r => r.date !== selectedDate);
    setDayRecords(updated);
    await saveDayRecords(updated);
    setShowRecordModal(false);
    Alert.alert('삭제 완료', '기록이 삭제되었습니다.');
  };

  // ---------- 상세 모달 계산 유틸 ----------
  const recToRuns = (rec?: DayRecord): RunningRecord[] => {
    if (!rec) return [];
    const e = (rec.entries ?? []).map(x => x.runningRecord).filter(Boolean) as RunningRecord[];
    const legacy = [
      ...(rec.runningLogs ?? []),
      ...(rec.runningRecord ? [rec.runningRecord] : []),
    ];
    return [...e, ...legacy];
  };

  const sumDetail = (rec?: DayRecord) => {
    const logs = recToRuns(rec);
    const totalKm = logs.reduce((a, l) => a + num(l.distance), 0);
    const totalUserKcal = logs.reduce((a, l) => a + num(l.calories), 0);
    const totalDogKcal  = logs.reduce((a, l) => a + num(l.dogCalories), 0);
    return {
      km: totalKm,
      user: totalUserKcal,
      dog: totalDogKcal,
    };
  };

  const openDetail = (rec: DayRecord) => {
    setDetailRecord(rec);
    setShowDetailModal(true);
  };

  const { days } = getMonthData(currentDate);
  const weekDays = ['S','M','T','W','T','F','S'];
  const nav = (dir:number) => setCurrentDate(p => { const d = new Date(p); d.setMonth(d.getMonth() + dir); return d; });

  const openMonthYear = () => {
    setPickYear(currentDate.getFullYear());
    setPickMonth(currentDate.getMonth());
    setShowMonthYear(true);
  };
  const applyMonthYear = () => {
    setCurrentDate(new Date(pickYear, pickMonth, 1));
    setShowMonthYear(false);
  };

  // ✅ 입력 중 실시간 평균 속도 계산 (거리/시간)
  const tempHours = durationToHours(tempRunning.duration);
  const tempKm = num(tempRunning.distance);
  const tempAvgSpeed = tempHours > 0 ? (tempKm / tempHours) : 0;

  return (
    <>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      <SafeAreaView style={styles.container}>
        <View style={styles.header} />
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingTop: insets.top + 24,
            paddingBottom: insets.bottom + tabBarHeight + 24
          }}
          contentInsetAdjustmentBehavior="always"
        >
          <View style={styles.calendarCard}>
            <Text style={styles.cardCaption}>Select date</Text>

            <View style={styles.headlineRow}>
              <TouchableOpacity onPress={openMonthYear}>
                <Text style={styles.cardHeadline}>{labelKR(currentDate)}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={openMonthYear}
                style={styles.editIconWrap}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel="월/년도 편집"
              >
                <MaterialCommunityIcons name="pencil-outline" size={18} color={COLORS.subtext} />
              </TouchableOpacity>
            </View>

            <View style={styles.subHeaderRow}>
              <TouchableOpacity onPress={openMonthYear}>
                <Text style={styles.cardSubTitle}>{labelEN(currentDate)}</Text>
              </TouchableOpacity>
              <View style={styles.arrows}>
                <TouchableOpacity onPress={() => nav(-1)}><Text style={styles.navArrow}>‹</Text></TouchableOpacity>
                <TouchableOpacity onPress={() => nav(1)}><Text style={styles.navArrow}>›</Text></TouchableOpacity>
              </View>
            </View>

            <View style={styles.weekHeader}>
              {weekDays.map((d, i) => (
                <View key={i} style={styles.weekDay}>
                  <Text style={styles.weekDayText}>{d}</Text>
                </View>
              ))}
            </View>

            <View style={styles.calendarGrid}>
              {Array.from({ length: Math.ceil(days.length / 7) }, (_, w) => (
                <View key={w} style={styles.weekRow}>
                  {days.slice(w * 7, (w + 1) * 7).map((date, di) => {
                    const inMonth = isSameMonth(date, currentDate);
                    const today = isToday(date);
                    const isSelected = selectedDate === fmt(date);
                    const record = recOf(date);
                    const hasRun = Boolean(
                      (record?.entries && record.entries.length) ||
                      (record?.runningLogs && record.runningLogs.length) ||
                      record?.runningRecord
                    );
                    return (
                      <TouchableOpacity
                        key={di}
                        style={styles.dayCell}
                        activeOpacity={0.7}
                        onPress={() => onDatePress(date)}
                        disabled={!inMonth}
                      >
                        <View style={[
                          styles.dayNumberWrap,
                          today && !isSelected && styles.dayTodayOutline,
                          isSelected && styles.daySelected,
                          !inMonth && styles.dayDisabledWrap,
                        ]}>
                          <Text style={[
                            styles.dayNumberText,
                            !inMonth && styles.otherMonthText,
                            isSelected && styles.daySelectedText,
                          ]}>
                            {date.getDate()}
                          </Text>
                        </View>

                        {record && (
                          <View style={styles.recordIndicators}>
                            {!!record.mood && <Text style={styles.moodIndicator}>{record.mood}</Text>}
                            {!!record.photos?.length && <Text style={styles.smallIcon}>📷</Text>}
                            {hasRun && <Text style={styles.smallIcon}>🏃‍♂️</Text>}
                            {!!record.memo && <Text style={styles.smallIcon}>📝</Text>}
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}
            </View>
          </View>

          {dayRecords.some(r => isSameMonth(new Date(r.date), currentDate)) && (
            <View style={styles.summarySection}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.summaryList}>
                  {dayRecords
                    .filter(r => isSameMonth(new Date(r.date), currentDate))
                    .sort((a,b)=> new Date(b.date).getTime() - new Date(a.date).getTime())
                    .map((rec, idx) => (
                      <TouchableOpacity
                        key={idx}
                        style={styles.summaryItem}
                        onPress={() => {
                          // 카드 탭 → 편집 모달
                          setSelectedDate(rec.date);
                          setCurrentRecord(rec);
                          setTempMemo(rec.memo);
                          setTempRunning({ duration:'', distance:'', calories:'', dogCalories:'' });
                          setTempMood(rec.mood);
                          setShowRecordModal(true);
                        }}
                      >
                        <Text style={styles.summaryDate}>{new Date(rec.date).getDate()}일</Text>

                        {!!rec.photos?.length ? (
                          <TouchableOpacity onPress={() => openDetail(rec)} activeOpacity={0.85}>
                            <Image source={{ uri: rec.photos[0] }} style={styles.summaryPhoto} />
                          </TouchableOpacity>
                        ) : (
                          <View style={[styles.summaryPhoto, { alignItems:'center', justifyContent:'center', backgroundColor:'#ffffff' }]}>
                            <Text style={{color:COLORS.subtext, fontSize:12}}>사진 없음</Text>
                          </View>
                        )}

                        <Text style={styles.summaryMood}>{rec.mood}</Text>
                        {Boolean((rec.entries?.length) || rec.runningLogs || rec.runningRecord) && <Text style={styles.summaryRun}>🏃‍♂️</Text>}
                      </TouchableOpacity>
                    ))}
                </View>
              </ScrollView>
            </View>
          )}
        </ScrollView>

        {/* 편집 모달 */}
        <Modal
          visible={showRecordModal}
          animationType="slide"
          transparent
          statusBarTranslucent
          presentationStyle="overFullScreen"
          onRequestClose={() => setShowRecordModal(false)}
        >
          <TouchableWithoutFeedback onPress={() => setShowRecordModal(false)}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback onPress={() => {}}>
                <View style={[styles.modalContent, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + tabBarHeight + 12 }]}>
                  <ScrollView showsVerticalScrollIndicator={false}>
                    <Text style={styles.modalTitle}>
                      {selectedDate ? `${new Date(selectedDate).getMonth()+1}월 ${new Date(selectedDate).getDate()}일 기록` : ''}
                    </Text>

                    <View style={styles.section}>
                      <Text style={styles.sectionLabel}>🏃‍♂️ 주행 기록</Text>
                      <View style={styles.runningInputs}>
                        <View style={styles.inputRow}>
                          <TextInput
                            style={styles.runningInput} placeholder="시간 (예: 30분 / 45:00 / 1:05:00)"
                            placeholderTextColor={COLORS.subtext}
                            value={tempRunning.duration} onChangeText={t=>setTempRunning({...tempRunning, duration:t})}
                          />
                          <TextInput
                            style={styles.runningInput} placeholder="거리 (예: 2.5km)"
                            placeholderTextColor={COLORS.subtext}
                            value={tempRunning.distance} onChangeText={t=>setTempRunning({...tempRunning, distance:t})}
                          />
                        </View>
                        <View style={styles.inputRow}>
                          <TextInput
                            style={styles.runningInput} placeholder="내 칼로리"
                            placeholderTextColor={COLORS.subtext}
                            value={tempRunning.calories} onChangeText={t=>setTempRunning({...tempRunning, calories:t})}
                            keyboardType="numeric"
                          />
                          <TextInput
                            style={styles.runningInput} placeholder="강아지 칼로리"
                            placeholderTextColor={COLORS.subtext}
                            value={tempRunning.dogCalories} onChangeText={t=>setTempRunning({...tempRunning, dogCalories:t})}
                            keyboardType="numeric"
                          />
                        </View>

                        {/* ✅ 입력값 기반 평균 속도 표시 */}
                        <View style={{ marginTop: 8, paddingVertical: 10, paddingHorizontal: 12, backgroundColor: COLORS.white, borderRadius: RADII.sm }}>
                          <Text style={{ color: COLORS.text, fontWeight: '800' }}>
                            평균 속도: {tempAvgSpeed.toFixed(2)} km/h
                          </Text>
                          <Text style={{ color: COLORS.subtext, fontSize: 12, marginTop: 2 }}>
                            * 시간과 거리를 입력하면 자동 계산됩니다.
                          </Text>
                        </View>
                      </View>
                    </View>

                    <View style={styles.section}>
                      <Text style={styles.sectionLabel}>📷 사진</Text>
                      <View style={styles.photoActions}>
                        <TouchableOpacity style={styles.photoActionButton} onPress={pickImage}>
                          <Text style={styles.photoActionText}>📱 갤러리</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.photoActionButton} onPress={takePhoto}>
                          <Text style={styles.photoActionText}>📸 카메라</Text>
                        </TouchableOpacity>
                      </View>
                      {currentRecord && currentRecord.photos.length>0 && (
                        <ScrollView horizontal style={styles.photoList} showsHorizontalScrollIndicator={false}>
                          {currentRecord.photos.map((p,i)=>(
                            <View key={i} style={styles.photoContainer}>
                              <Image source={{ uri:p }} style={styles.modalPhoto}/>
                              <TouchableOpacity style={styles.deletePhotoButton} onPress={()=>deletePhoto(i)}>
                                <Text style={styles.deletePhotoText}>❌</Text>
                              </TouchableOpacity>
                            </View>
                          ))}
                        </ScrollView>
                      )}
                    </View>

                    <View style={styles.section}>
                      <Text style={styles.sectionLabel}>📝 메모</Text>
                      <TextInput
                        style={styles.memoInput}
                        placeholder="오늘 강아지와 함께한 특별한 일을 적어보세요..."
                        placeholderTextColor={COLORS.subtext}
                        value={tempMemo} onChangeText={setTempMemo}
                        multiline numberOfLines={4} textAlignVertical="top"
                      />
                    </View>

                    <View style={styles.modalButtons}>
                      <TouchableOpacity style={styles.primaryButton} onPress={saveRecord}>
                        <Text style={styles.primaryButtonText}>저장</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.secondaryButton} onPress={()=>setShowRecordModal(false)}>
                        <Text style={styles.secondaryButtonText}>취소</Text>
                      </TouchableOpacity>
                      {currentRecord && dayRecords.some(r=>r.date===selectedDate) && (
                        <TouchableOpacity style={styles.deleteButton} onPress={deleteRecord}>
                          <Text style={styles.deleteButtonText}>삭제</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </ScrollView>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>

        {/* 상세(요약) 모달: 사진 클릭 시 */}
        <Modal
          visible={showDetailModal}
          animationType="fade"
          transparent
          statusBarTranslucent
          presentationStyle="overFullScreen"
          onRequestClose={() => setShowDetailModal(false)}
        >
          <TouchableWithoutFeedback onPress={() => setShowDetailModal(false)}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback onPress={() => {}}>
                <View style={[styles.modalContent, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + tabBarHeight + 12 }]}>
                  <ScrollView showsVerticalScrollIndicator>
                    <Text style={styles.modalTitle}>
                      {detailRecord ? `${new Date(detailRecord.date).getMonth()+1}월 ${new Date(detailRecord.date).getDate()}일 요약` : ''}
                    </Text>

                    {(() => {
                      const s = sumDetail(detailRecord || undefined);
                      return (
                        <View style={styles.detailStatWrap}>
                          <View style={styles.detailStat}>
                            <Text style={styles.detailVal}>{s.km.toFixed(2)}</Text>
                            <Text style={styles.detailLabel}>km</Text>
                          </View>
                          <View style={styles.detailStat}>
                            <Text style={styles.detailVal}>{s.user}</Text>
                            <Text style={styles.detailLabel}>유저 칼로리</Text>
                          </View>
                          <View style={styles.detailStat}>
                            <Text style={styles.detailVal}>{s.dog}</Text>
                            <Text style={styles.detailLabel}>강아지 칼로리</Text>
                          </View>
                        </View>
                      );
                    })()}

                    <View style={{ marginTop: SP[3] }}>
                      <Text style={styles.sectionLabel}>📷 사진</Text>
                      {detailRecord?.photos?.length ? (
                        <View style={{ gap: 10 }}>
                          {detailRecord.photos.map((uri, i) => (
                            <Image key={i} source={{ uri }} style={styles.detailPhoto} />
                          ))}
                        </View>
                      ) : (
                        <Text style={{ color: COLORS.subtext, marginTop: 6 }}>등록된 사진이 없습니다.</Text>
                      )}
                    </View>

                    <View style={[styles.modalButtons, { marginTop: SP[4] }]}>
                      <TouchableOpacity style={styles.secondaryButton} onPress={() => setShowDetailModal(false)}>
                        <Text style={styles.secondaryButtonText}>닫기</Text>
                      </TouchableOpacity>
                    </View>
                  </ScrollView>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>

        {/* 월/년도 선택 모달 */}
        <Modal
          visible={showMonthYear}
          animationType="fade"
          transparent
          statusBarTranslucent
          presentationStyle="overFullScreen"
          onRequestClose={()=>setShowMonthYear(false)}
        >
          <TouchableWithoutFeedback onPress={()=>setShowMonthYear(false)}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback onPress={()=>{}}>
                <View style={[styles.modalContent, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + tabBarHeight + 12 }]}>
                  <Text style={styles.modalTitle}>월/년도 선택</Text>

                  <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom: SP[3] }}>
                    <TouchableOpacity onPress={()=>setPickYear(y=>y-1)} style={styles.yearBtn}><Text style={styles.yearBtnText}>‹</Text></TouchableOpacity>
                    <Text style={{ fontSize:18, fontWeight:'800', color: COLORS.text }}>{pickYear}</Text>
                    <TouchableOpacity onPress={()=>setPickYear(y=>y+1)} style={styles.yearBtn}><Text style={styles.yearBtnText}>›</Text></TouchableOpacity>
                  </View>

                  <View style={styles.monthGrid}>
                    {monthNamesKR.map((mName, idx)=>(
                      <TouchableOpacity
                        key={mName}
                        style={[styles.monthChip, pickMonth===idx && styles.monthChipSelected]}
                        onPress={()=>setPickMonth(idx)}
                      >
                        <Text style={[styles.monthChipText, pickMonth===idx && styles.monthChipTextSel]}>
                          {mName}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <View style={styles.modalButtons}>
                    <TouchableOpacity style={styles.secondaryButton} onPress={()=>setShowMonthYear(false)}>
                      <Text style={styles.secondaryButtonText}>취소</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.primaryButton} onPress={applyMonthYear}>
                      <Text style={styles.primaryButtonText}>적용</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex:1, backgroundColor: COLORS.bg },

  header: { alignItems:'center', justifyContent:'center', paddingHorizontal: SP[4], paddingVertical: SP[4], backgroundColor: COLORS.bg },
  screenTitle: { fontSize: 20, fontWeight:'700', color: COLORS.text },

  content: { flex:1, paddingHorizontal: SP[4] },

  calendarCard: { backgroundColor: COLORS.surface, borderRadius: RADII.xl, borderWidth: 0, padding: SP[4], marginTop: SP[6] },
  cardCaption: { color: COLORS.subtext, fontSize: 12, marginBottom: SP[2] },
  headlineRow: { flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom: SP[2] },
  cardHeadline: { fontSize: 28, fontWeight:'800', color: COLORS.text },

  subHeaderRow: { flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom: SP[2] },
  cardSubTitle: { color: COLORS.subtext, fontSize: 12 },
  arrows: { flexDirection:'row', gap: 12 },
  navArrow: { color: COLORS.subtext, fontSize: 18, fontWeight:'700' },

  weekHeader: { flexDirection:'row', paddingVertical: SP[1] },
  weekDay: { flex:1, alignItems:'center' },
  weekDayText: { fontSize: 12, fontWeight:'700', color: COLORS.subtext },

  calendarGrid: {},
  weekRow: { flexDirection:'row' },
  dayCell: { flex:1, height: 48, alignItems:'center', justifyContent:'center' },

  dayNumberWrap: { width: 36, height: 36, borderRadius: 18, alignItems:'center', justifyContent:'center' },
  dayTodayOutline: { borderWidth: 1, borderColor: COLORS.primary },
  daySelected: { backgroundColor: COLORS.primary },
  dayDisabledWrap: { opacity: 0.45 },

  dayNumberText: { fontSize: 15, fontWeight:'700', color: COLORS.text },
  daySelectedText: { color: COLORS.onPrimary },
  otherMonthText: { color: COLORS.subtext },

  recordIndicators: { flexDirection:'row', flexWrap:'wrap', justifyContent:'center', marginTop: 2 },
  moodIndicator: { fontSize: 12 },
  smallIcon: { fontSize: 10, marginHorizontal: 1 },

  summarySection: { marginTop: SP[4], backgroundColor: COLORS.surface, borderRadius: RADII.xl, padding: SP[4] },
  summaryList: { flexDirection:'row', columnGap: SP[4] as any },
  summaryItem: { alignItems:'center', width: 80 },
  summaryDate: { fontSize:12, color: COLORS.subtext, fontWeight:'700', marginBottom: 6 },
  summaryPhoto: { width: 60, height: 60, borderRadius: RADII.sm, marginBottom: 6 },
  summaryMood: { fontSize: 16, marginBottom: 2, color: COLORS.text },
  summaryRun: { fontSize: 12, color: COLORS.text },

  modalOverlay: { flex:1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent:'center', alignItems:'center' },
  modalContent: { backgroundColor: COLORS.surface, borderRadius: RADII.xl, padding: SP[4], width:'95%', maxHeight:'90%' },
  modalTitle: { fontSize:18, fontWeight:'800', color: COLORS.text, textAlign:'center', marginBottom: SP[4] },

  section: { marginBottom: SP[4] },
  sectionLabel: { fontSize:14, fontWeight:'800', color: COLORS.text, marginBottom: SP[2] },

  runningInputs: { gap: SP[2] },
  inputRow: { flexDirection:'row', gap: SP[2] },
  runningInput: { flex:1, borderRadius: RADII.sm, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, backgroundColor: COLORS.white, color: COLORS.text },

  photoActions: { flexDirection:'row', gap: SP[2], marginBottom: SP[2] },
  photoActionButton: { flex:1, backgroundColor: COLORS.white, borderRadius: RADII.sm, paddingVertical: 12, alignItems:'center' },
  photoActionText: { color: COLORS.text, fontSize: 14, fontWeight:'800' },

  photoList: { marginTop: SP[2] },
  photoContainer: { marginRight: 10, position:'relative' },
  modalPhoto: { width: 80, height: 80, borderRadius: RADII.sm },
  deletePhotoButton: { position:'absolute', top:-5, right:-5, width:20, height:20, borderRadius:10, backgroundColor: COLORS.white24, justifyContent:'center', alignItems:'center' },
  deletePhotoText: { fontSize: 12, color: COLORS.text },

  memoInput: { borderRadius: RADII.sm, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, backgroundColor: COLORS.white, color: COLORS.text, minHeight: 80 },

  modalButtons: { flexDirection:'row', gap: SP[2], marginTop: SP[2] },
  primaryButton: { flex:1, backgroundColor: COLORS.primary, borderRadius: RADII.sm, paddingVertical: 12, alignItems:'center' },
  primaryButtonText: { color: COLORS.onPrimary, fontSize: 16, fontWeight: '800' },
  secondaryButton: { flex:1, backgroundColor: COLORS.white, borderRadius: RADII.sm, paddingVertical: 12, alignItems:'center' },
  secondaryButtonText: { color: COLORS.text, fontSize: 16, fontWeight:'800' },
  deleteButton: { flex:1, backgroundColor: '#E74C3C', borderRadius: RADII.sm, paddingVertical: 12, alignItems:'center' },
  deleteButtonText: { color: COLORS.onPrimary, fontSize: 16, fontWeight:'800' },

  yearBtn: { width: 44, height: 36, borderRadius: 10, backgroundColor: COLORS.white, alignItems:'center', justifyContent:'center' },
  yearBtnText: { fontSize: 18, fontWeight:'800', color: COLORS.text },
  monthGrid: { flexDirection:'row', flexWrap:'wrap', justifyContent:'space-between' },
  monthChip: {
    width: (width * 0.95 - SP[4]*2 - SP[2]*2) / 3,
    alignItems:'center', justifyContent:'center',
    backgroundColor: COLORS.white, borderRadius: RADII.md,
    paddingVertical: 12, marginBottom: SP[2]
  },
  monthChipSelected: { backgroundColor: COLORS.primary },
  monthChipText: { color: COLORS.text, fontWeight:'800' },
  monthChipTextSel: { color: COLORS.onPrimary, fontWeight:'800' },
  editIconWrap: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },

  // 상세(요약) 모달 전용
  detailStatWrap: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  detailStat: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: RADII.md,
    paddingVertical: 12,
    alignItems: 'center',
  },
  detailVal: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text,
  },
  detailLabel: {
    marginTop: 4,
    fontSize: 12,
    color: COLORS.subtext,
    fontWeight: '700',
  },
  detailPhoto: {
    width: '100%',
    height: 220,
    borderRadius: RADII.md,
    backgroundColor: COLORS.white,
  },
});
