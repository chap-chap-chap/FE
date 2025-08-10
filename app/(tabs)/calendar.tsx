import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Modal,
  Image,
  Alert,
  Platform,
  Dimensions,
  TextInput,
  StatusBar
} from 'react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

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

export default function CalendarScreen() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [dayRecords, setDayRecords] = useState<DayRecord[]>([]);
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [currentRecord, setCurrentRecord] = useState<DayRecord | null>(null);
  const [tempMemo, setTempMemo] = useState('');
  const [tempRunning, setTempRunning] = useState<RunningRecord>({
    duration: '',
    distance: '',
    calories: '',
    dogCalories: ''
  });
  const [tempMood, setTempMood] = useState<'😊' | '😐' | '😢' | '🤗' | '😴' | ''>('');

  // AsyncStorage에서 데이터 로드
  useEffect(() => {
    loadDayRecords();
  }, []);

  const loadDayRecords = async () => {
    try {
      const savedRecords = await AsyncStorage.getItem('dayRecords');
      if (savedRecords) {
        setDayRecords(JSON.parse(savedRecords));
      }
    } catch (error) {
      console.log('데이터 로드 오류:', error);
    }
  };

  const saveDayRecords = async (records: DayRecord[]) => {
    try {
      await AsyncStorage.setItem('dayRecords', JSON.stringify(records));
    } catch (error) {
      console.log('데이터 저장 오류:', error);
    }
  };

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

  // 이미지 권한 요청
  useEffect(() => {
    (async () => {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('권한 필요', '사진을 선택하려면 갤러리 접근 권한이 필요합니다.');
      }
    })();
  }, []);

  // 날짜 관련 함수들
  const getMonthData = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    const days = [];
    const current = new Date(startDate);

    for (let i = 0; i < 42; i++) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }

    return { days, firstDay, lastDay };
  };

  const formatDate = (date: Date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  const formatDisplayDate = (date: Date) => {
    const months = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];
    return `${date.getFullYear()}년 ${months[date.getMonth()]}`;
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return formatDate(date) === formatDate(today);
  };

  const isSameMonth = (date: Date, month: Date) => {
    return date.getMonth() === month.getMonth() && date.getFullYear() === month.getFullYear();
  };

  const getRecordForDate = (date: Date) => {
    return dayRecords.find(record => record.date === formatDate(date));
  };

  // 이미지 선택
  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && currentRecord) {
        const updatedRecord = {
          ...currentRecord,
          photos: [...currentRecord.photos, result.assets[0].uri]
        };
        setCurrentRecord(updatedRecord);
      }
    } catch (error) {
      Alert.alert('오류', '사진을 선택할 수 없습니다.');
    }
  };

  // 카메라로 촬영
  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('권한 필요', '카메라 접근 권한이 필요합니다.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && currentRecord) {
        const updatedRecord = {
          ...currentRecord,
          photos: [...currentRecord.photos, result.assets[0].uri]
        };
        setCurrentRecord(updatedRecord);
      }
    } catch (error) {
      Alert.alert('오류', '사진을 촬영할 수 없습니다.');
    }
  };

  // 사진 삭제
  const deletePhoto = (photoIndex: number) => {
    if (currentRecord) {
      const updatedPhotos = currentRecord.photos.filter((_, index) => index !== photoIndex);
      setCurrentRecord({
        ...currentRecord,
        photos: updatedPhotos
      });
    }
  };

  // 날짜 터치 처리
  const handleDatePress = (date: Date) => {
    if (isSameMonth(date, currentDate)) {
      const dateStr = formatDate(date);
      setSelectedDate(dateStr);
      
      const existingRecord = getRecordForDate(date);
      if (existingRecord) {
        setCurrentRecord(existingRecord);
        setTempMemo(existingRecord.memo);
        setTempRunning(existingRecord.runningRecord || { duration: '', distance: '', calories: '', dogCalories: '' });
        setTempMood(existingRecord.mood);
      } else {
        const newRecord: DayRecord = {
          date: dateStr,
          photos: [],
          memo: '',
          mood: ''
        };
        setCurrentRecord(newRecord);
        setTempMemo('');
        setTempRunning({ duration: '', distance: '', calories: '', dogCalories: '' });
        setTempMood('');
      }
      setShowRecordModal(true);
    }
  };

  // 기록 저장
  const saveRecord = async () => {
    if (!currentRecord || !selectedDate) return;

    const finalRecord: DayRecord = {
      ...currentRecord,
      memo: tempMemo,
      mood: tempMood,
      runningRecord: (tempRunning.duration || tempRunning.distance || tempRunning.calories || tempRunning.dogCalories) 
        ? tempRunning 
        : undefined
    };

    const updatedRecords = dayRecords.filter(r => r.date !== selectedDate);
    updatedRecords.push(finalRecord);
    
    setDayRecords(updatedRecords);
    await saveDayRecords(updatedRecords);

    setShowRecordModal(false);
    Alert.alert('저장 완료', '기록이 저장되었습니다! 🐕');
  };

  // 기록 삭제
  const deleteRecord = async () => {
    if (selectedDate) {
      const updatedRecords = dayRecords.filter(r => r.date !== selectedDate);
      setDayRecords(updatedRecords);
      await saveDayRecords(updatedRecords);
      
      setShowRecordModal(false);
      Alert.alert('삭제 완료', '기록이 삭제되었습니다.');
    }
  };

  const { days } = getMonthData(currentDate);
  const weekDays = ['일', '월', '화', '수', '목', '금', '토'];

  const navigateMonth = (direction: number) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + direction);
      return newDate;
    });
  };

  const moods = ['😊', '😐', '😢', '🤗', '😴'];

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
        <Text style={styles.screenTitle}>🐕 산책 일기</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* 월 네비게이션 */}
        <View style={styles.monthHeader}>
          <TouchableOpacity 
            style={styles.monthButton}
            onPress={() => navigateMonth(-1)}
          >
            <Text style={styles.monthButtonText}>‹</Text>
          </TouchableOpacity>
          
          <Text style={styles.monthTitle}>
            {formatDisplayDate(currentDate)}
          </Text>
          
          <TouchableOpacity 
            style={styles.monthButton}
            onPress={() => navigateMonth(1)}
          >
            <Text style={styles.monthButtonText}>›</Text>
          </TouchableOpacity>
        </View>

        {/* 요일 헤더 */}
        <View style={styles.weekHeader}>
          {weekDays.map((day, index) => (
            <View key={index} style={styles.weekDay}>
              <Text style={[
                styles.weekDayText,
                index === 0 && styles.sundayText,
                index === 6 && styles.saturdayText
              ]}>
                {day}
              </Text>
            </View>
          ))}
        </View>

        {/* 캘린더 그리드 */}
        <View style={styles.calendar}>
          {Array.from({ length: Math.ceil(days.length / 7) }, (_, weekIndex) => (
            <View key={weekIndex} style={styles.week}>
              {days.slice(weekIndex * 7, (weekIndex + 1) * 7).map((date, dayIndex) => {
                const record = getRecordForDate(date);
                const isCurrentMonth = isSameMonth(date, currentDate);
                const isTodayDate = isToday(date);

                return (
                  <TouchableOpacity
                    key={dayIndex}
                    style={[
                      styles.day,
                      !isCurrentMonth && styles.otherMonthDay,
                      isTodayDate && styles.today,
                      record && styles.dayWithRecord
                    ]}
                    onPress={() => handleDatePress(date)}
                    disabled={!isCurrentMonth}
                  >
                    <Text style={[
                      styles.dayText,
                      !isCurrentMonth && styles.otherMonthText,
                      isTodayDate && styles.todayText,
                      dayIndex === 0 && styles.sundayText,
                      dayIndex === 6 && styles.saturdayText
                    ]}>
                      {date.getDate()}
                    </Text>
                    {record && (
                      <View style={styles.recordIndicators}>
                        {record.mood && <Text style={styles.moodIndicator}>{record.mood}</Text>}
                        {record.photos.length > 0 && <Text style={styles.photoIndicator}>📷</Text>}
                        {record.runningRecord && <Text style={styles.runIndicator}>🏃‍♂️</Text>}
                        {record.memo && <Text style={styles.memoIndicator}>📝</Text>}
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>

        {/* 이번 달 기록 요약 */}
        {dayRecords.filter(record => {
          const recordDate = new Date(record.date);
          return isSameMonth(recordDate, currentDate);
        }).length > 0 && (
          <View style={styles.summarySection}>
            <Text style={styles.sectionTitle}>🐕 이달의 기록</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.summaryList}>
                {dayRecords
                  .filter(record => {
                    const recordDate = new Date(record.date);
                    return isSameMonth(recordDate, currentDate);
                  })
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .map((record, index) => (
                    <TouchableOpacity 
                      key={index} 
                      style={styles.summaryItem}
                      onPress={() => {
                        setSelectedDate(record.date);
                        setCurrentRecord(record);
                        setTempMemo(record.memo);
                        setTempRunning(record.runningRecord || { duration: '', distance: '', calories: '', dogCalories: '' });
                        setTempMood(record.mood);
                        setShowRecordModal(true);
                      }}
                    >
                      <Text style={styles.summaryDate}>
                        {new Date(record.date).getDate()}일
                      </Text>
                      {record.photos.length > 0 && (
                        <Image source={{ uri: record.photos[0] }} style={styles.summaryPhoto} />
                      )}
                      <Text style={styles.summaryMood}>{record.mood}</Text>
                      {record.runningRecord && <Text style={styles.summaryRun}>🏃‍♂️</Text>}
                    </TouchableOpacity>
                  ))}
              </View>
            </ScrollView>
          </View>
        )}
      </ScrollView>

      {/* 기록 작성/보기 모달 */}
      <Modal
        visible={showRecordModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowRecordModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>
                {selectedDate ? `${new Date(selectedDate).getMonth() + 1}월 ${new Date(selectedDate).getDate()}일 기록` : ''}
              </Text>

              {/* 기분 선택 */}
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>🐕 오늘 기분</Text>
                <View style={styles.moodSelector}>
                  {moods.map((mood) => (
                    <TouchableOpacity
                      key={mood}
                      style={[
                        styles.moodButton,
                        tempMood === mood && styles.selectedMoodButton
                      ]}
                      onPress={() => setTempMood(mood as any)}
                    >
                      <Text style={styles.moodButtonText}>{mood}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* 주행 기록 */}
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>🏃‍♂️ 주행 기록</Text>
                <View style={styles.runningInputs}>
                  <View style={styles.inputRow}>
                    <TextInput
                      style={styles.runningInput}
                      placeholder="시간 (예: 30분)"
                      value={tempRunning.duration}
                      onChangeText={(text) => setTempRunning({...tempRunning, duration: text})}
                    />
                    <TextInput
                      style={styles.runningInput}
                      placeholder="거리 (예: 2.5km)"
                      value={tempRunning.distance}
                      onChangeText={(text) => setTempRunning({...tempRunning, distance: text})}
                    />
                  </View>
                  <View style={styles.inputRow}>
                    <TextInput
                      style={styles.runningInput}
                      placeholder="내 칼로리"
                      value={tempRunning.calories}
                      onChangeText={(text) => setTempRunning({...tempRunning, calories: text})}
                      keyboardType="numeric"
                    />
                    <TextInput
                      style={styles.runningInput}
                      placeholder="강아지 칼로리"
                      value={tempRunning.dogCalories}
                      onChangeText={(text) => setTempRunning({...tempRunning, dogCalories: text})}
                      keyboardType="numeric"
                    />
                  </View>
                </View>
              </View>

              {/* 사진 */}
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
                {currentRecord && currentRecord.photos.length > 0 && (
                  <ScrollView horizontal style={styles.photoList} showsHorizontalScrollIndicator={false}>
                    {currentRecord.photos.map((photo, index) => (
                      <View key={index} style={styles.photoContainer}>
                        <Image source={{ uri: photo }} style={styles.modalPhoto} />
                        <TouchableOpacity 
                          style={styles.deletePhotoButton}
                          onPress={() => deletePhoto(index)}
                        >
                          <Text style={styles.deletePhotoText}>❌</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </ScrollView>
                )}
              </View>

              {/* 메모 */}
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>📝 메모</Text>
                <TextInput
                  style={styles.memoInput}
                  placeholder="오늘 강아지와 함께한 특별한 일을 적어보세요..."
                  value={tempMemo}
                  onChangeText={setTempMemo}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>

              {/* 버튼들 */}
              <View style={styles.modalButtons}>
                <TouchableOpacity style={styles.saveButton} onPress={saveRecord}>
                  <Text style={styles.saveButtonText}>저장</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.cancelButton} onPress={() => setShowRecordModal(false)}>
                  <Text style={styles.cancelButtonText}>취소</Text>
                </TouchableOpacity>
                {currentRecord && dayRecords.some(r => r.date === selectedDate) && (
                  <TouchableOpacity style={styles.deleteButton} onPress={deleteRecord}>
                    <Text style={styles.deleteButtonText}>삭제</Text>
                  </TouchableOpacity>
                )}
              </View>
            </ScrollView>
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
  content: {
    flex: 1,
    padding: 20,
  },
  monthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    paddingVertical: 15,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  monthButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthButtonText: {
    fontSize: 20,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  monthTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  weekHeader: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    marginBottom: 10,
    paddingVertical: 10,
  },
  weekDay: {
    flex: 1,
    alignItems: 'center',
  },
  weekDayText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  sundayText: {
    color: '#E74C3C',
  },
  saturdayText: {
    color: '#3498DB',
  },
  calendar: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  week: {
    flexDirection: 'row',
  },
  day: {
    flex: 1,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 1,
    borderRadius: 8,
  },
  otherMonthDay: {
    backgroundColor: 'transparent',
  },
  today: {
    backgroundColor: '#FF6B6B',
  },
  dayWithRecord: {
    backgroundColor: '#E8F5E8',
  },
  dayText: {
    fontSize: 16,
    color: '#2C3E50',
    fontWeight: '500',
  },
  otherMonthText: {
    color: '#BDC3C7',
  },
  todayText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  recordIndicators: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 2,
  },
  moodIndicator: {
    fontSize: 12,
  },
  photoIndicator: {
    fontSize: 10,
    marginHorizontal: 1,
  },
  runIndicator: {
    fontSize: 10,
    marginHorizontal: 1,
  },
  memoIndicator: {
    fontSize: 10,
    marginHorizontal: 1,
  },
  summarySection: {
    marginTop: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 15,
  },
  summaryList: {
    flexDirection: 'row',
    gap: 15,
  },
  summaryItem: {
    alignItems: 'center',
    width: 80,
  },
  summaryDate: {
    fontSize: 12,
    color: '#7F8C8D',
    fontWeight: 'bold',
    marginBottom: 5,
  },
  summaryPhoto: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginBottom: 5,
  },
  summaryMood: {
    fontSize: 16,
    marginBottom: 2,
  },
  summaryRun: {
    fontSize: 12,
  },
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
    width: '95%',
    maxHeight: '90%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2C3E50',
    textAlign: 'center',
    marginBottom: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 10,
  },
  moodSelector: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  moodButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedMoodButton: {
    borderColor: '#FF6B6B',
    backgroundColor: '#FFE5E5',
  },
  moodButtonText: {
    fontSize: 24,
  },
  runningInputs: {
    gap: 10,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 10,
  },
  runningInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    backgroundColor: '#F8F9FA',
  },
  photoActions: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  photoActionButton: {
    flex: 1,
    backgroundColor: '#4ECDC4',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  photoActionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  photoList: {
    marginTop: 10,
  },
  photoContainer: {
    marginRight: 10,
    position: 'relative',
  },
  modalPhoto: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  deletePhotoButton: {
    position: 'absolute',
    top: -5,
    right: -5,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deletePhotoText: {
    fontSize: 12,
  },
  memoInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    backgroundColor: '#F8F9FA',
    minHeight: 80,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#27AE60',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#95A5A6',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  deleteButton: {
    flex: 1,
    backgroundColor: '#E74C3C',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});