import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal,
  Image, Alert, Platform, Dimensions, TextInput, StatusBar, TouchableWithoutFeedback
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';

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
interface DayRecord {
  date: string;
  photos: string[];
  memo: string;
  runningRecord?: RunningRecord;
  mood: '😊' | '😐' | '😢' | '🤗' | '😴' | '';
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

  const [showMonthYear, setShowMonthYear] = useState(false);
  const [pickYear, setPickYear] = useState(currentDate.getFullYear());
  const [pickMonth, setPickMonth] = useState(currentDate.getMonth());

  useEffect(() => {
    (async () => {
      const saved = await AsyncStorage.getItem('dayRecords');
      if (saved) setDayRecords(JSON.parse(saved));
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
      setTempRunning(ex.runningRecord || { duration:'', distance:'', calories:'', dogCalories:'' });
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

  const saveRecord = async () => {
    if (!currentRecord || !selectedDate) return;
    const final: DayRecord = {
      ...currentRecord,
      memo: tempMemo,
      mood: tempMood,
      runningRecord: (tempRunning.duration || tempRunning.distance || tempRunning.calories || tempRunning.dogCalories) ? tempRunning : undefined,
    };
    const updated = dayRecords.filter(r => r.date !== selectedDate);
    updated.push(final);
    setDayRecords(updated);
    await saveDayRecords(updated);
    setShowRecordModal(false);
    Alert.alert('저장 완료', '기록이 저장되었습니다! 🐕');
  };

  const deleteRecord = async () => {
    if (!selectedDate) return;
    const updated = dayRecords.filter(r => r.date !== selectedDate);
    setDayRecords(updated);
    await saveDayRecords(updated);
    setShowRecordModal(false);
    Alert.alert('삭제 완료', '기록이 삭제되었습니다.');
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

  return (
    <>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          {/*<Text style={styles.screenTitle}>🐕 산책 일기</Text>*/}
        </View>

        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + tabBarHeight + 24 }}
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
                            {!!record.photos.length && <Text style={styles.smallIcon}>📷</Text>}
                            {!!record.runningRecord && <Text style={styles.smallIcon}>🏃‍♂️</Text>}
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
              {/*<Text style={styles.sectionTitle}>🐕 이달의 기록</Text>*/}
              <ScrollView horizontal showsVerticalScrollIndicator={false}>
                <View style={styles.summaryList}>
                  {dayRecords
                    .filter(r => isSameMonth(new Date(r.date), currentDate))
                    .sort((a,b)=> new Date(b.date).getTime() - new Date(a.date).getTime())
                    .map((rec, idx) => (
                      <TouchableOpacity
                        key={idx}
                        style={styles.summaryItem}
                        onPress={() => {
                          setSelectedDate(rec.date);
                          setCurrentRecord(rec);
                          setTempMemo(rec.memo);
                          setTempRunning(rec.runningRecord || { duration:'', distance:'', calories:'', dogCalories:'' });
                          setTempMood(rec.mood);
                          setShowRecordModal(true);
                        }}
                      >
                        <Text style={styles.summaryDate}>{new Date(rec.date).getDate()}일</Text>
                        {!!rec.photos.length && <Image source={{ uri: rec.photos[0] }} style={styles.summaryPhoto} />}
                        <Text style={styles.summaryMood}>{rec.mood}</Text>
                        {!!rec.runningRecord && <Text style={styles.summaryRun}>🏃‍♂️</Text>}
                      </TouchableOpacity>
                    ))}
                </View>
              </ScrollView>
            </View>
          )}
        </ScrollView>

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
                            style={styles.runningInput} placeholder="시간 (예: 30분)"
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

  calendarCard: { backgroundColor: COLORS.surface, borderRadius: RADII.xl, borderWidth: 0, padding: SP[4] },
  cardCaption: { color: COLORS.subtext, fontSize: 12, marginBottom: SP[2] },
  headlineRow: { flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom: SP[2] },
  cardHeadline: { fontSize: 28, fontWeight:'800', color: COLORS.text },
  editGlyph: { color: COLORS.subtext, fontSize: 16 },

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
  sectionTitle: { fontSize:16, fontWeight:'800', color: COLORS.text, marginBottom: SP[3] },
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
  primaryButtonText: { color: COLORS.onPrimary, fontSize: 16, fontWeight:'800' },
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
});
