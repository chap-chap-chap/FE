import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
  StatusBar,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { api } from '../../src/api/client';   // ✅ src/api/client.ts 가져오기 (named export)


// ✅ axios client 버전 checkNutrient
async function checkNutrient(nutrient: string, value: number): Promise<string> {
  const res = await api.post<string>(
    '/check_nutrient',
    { nutrient, value },
    {
      responseType: 'text',       // 서버 응답이 string 이라 그대로 받음
      transformResponse: v => v,  // axios 자동 JSON 파싱 방지
    }
  );
  return typeof res.data === 'string' ? res.data : String(res.data ?? '');
}

export default function FoodScreen() {
  const [searchText, setSearchText] = useState('');

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

  const foodRecommendations = [
    { id: 1, name: '로얄캐닌 소형견용', type: '사료', rating: 4.8 },
    { id: 2, name: '프로플랜 연어&쌀', type: '사료', rating: 4.7 },
    { id: 3, name: '덴탈껌 (치킨맛)', type: '간식', rating: 4.6 },
    { id: 4, name: '동결건조 닭가슴살', type: '간식', rating: 4.9 },
  ];

  /** ---------------- 영양소 체크 UI 상태 ---------------- */
  const [nutrient, setNutrient] = useState('');      // 예: '단백질'
  const [valueStr, setValueStr] = useState('');      // 입력값 문자열 상태(숫자만 필터)
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>('');  // 서버에서 온 문자열 결과

  const quickNutrients = ['단백질', '지방', '섬유질', '수분'];

  const onPressCheck = async () => {
    const v = parseFloat(valueStr);
    if (!nutrient.trim()) {
      Alert.alert('입력 필요', '영양소명을 입력하세요.');
      return;
    }
    if (Number.isNaN(v)) {
      Alert.alert('입력 필요', '값을 숫자로 입력하세요.');
      return;
    }
    try {
      setLoading(true);
      setResult('');
      const msg = await checkNutrient(nutrient.trim(), v);
      setResult(msg || '결과 없음');
    } catch (e: any) {
      console.log('checkNutrient ERROR', e?.response?.status, e?.message);
      Alert.alert('요청 실패', e?.response?.data?.message || e?.message || '서버 요청 중 오류가 발생했습니다.');
      setResult('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <StatusBar hidden={true} />
      <SafeAreaView style={styles.container}>
        {/* 상단 여백(검색창 아래로 내림) */}
        <View style={{ height: 48 }} />

        <View style={styles.content}>
          <TextInput
            style={styles.searchInput}
            placeholder="사료나 간식을 검색해보세요"
            value={searchText}
            onChangeText={setSearchText}
          />

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.sectionTitle}>추천 제품</Text>
            {foodRecommendations.map((item) => (
              <TouchableOpacity key={item.id} style={styles.foodItem} activeOpacity={0.9}>
                <View style={styles.foodInfo}>
                  <Text style={styles.foodName}>{item.name}</Text>
                  <Text style={styles.foodType}>{item.type}</Text>
                  <Text style={styles.foodRating}>⭐ {item.rating}</Text>
                </View>
                <Text style={styles.arrowSmall}>›</Text>
              </TouchableOpacity>
            ))}

            {/* ---------------- 영양소 체크 카드 ---------------- */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>사료 영양소 체크</Text>

              {/* 빠른 선택 칩 */}
              <View style={styles.chipRow}>
                {quickNutrients.map((n) => (
                  <TouchableOpacity
                    key={n}
                    style={[styles.chip, nutrient === n && styles.chipActive]}
                    onPress={() => setNutrient(n)}
                    activeOpacity={0.9}
                  >
                    <Text style={[styles.chipText, nutrient === n && styles.chipTextActive]}>{n}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.inputRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>영양소명</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="예) 단백질"
                    value={nutrient}
                    onChangeText={setNutrient}
                  />
                </View>
                <View style={{ width: 110, marginLeft: 10 }}>
                  <Text style={styles.label}>값 (%)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="예) 25"
                    keyboardType="numeric"
                    value={valueStr}
                    onChangeText={(t) => setValueStr(t.replace(/[^0-9.]/g, ''))}
                  />
                </View>
              </View>

              <TouchableOpacity
                style={[styles.checkBtn, (!nutrient.trim() || !valueStr) && { opacity: 0.6 }]}
                onPress={onPressCheck}
                disabled={!nutrient.trim() || !valueStr || loading}
                activeOpacity={0.9}
              >
                {loading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.checkBtnText}>검사</Text>
                )}
              </TouchableOpacity>

              {!!result && (
                <View style={styles.resultBox}>
                  <Text style={styles.resultText}>{result}</Text>
                </View>
              )}
            </View>
            {/* --------------------------------------------------- */}
          </ScrollView>
        </View>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#AEC3A9' },
  content: { flex: 1, paddingHorizontal: 20, paddingTop: 8 },
  searchInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    marginBottom: 20,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },

  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#2C3E50', marginBottom: 15 },
  foodItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  foodInfo: { flex: 1 },
  foodName: { fontSize: 16, fontWeight: 'bold', color: '#2C3E50', marginBottom: 5 },
  foodType: { fontSize: 14, color: '#7F8C8D', marginBottom: 3 },
  foodRating: { fontSize: 14, color: '#F39C12' },
  arrowSmall: { fontSize: 18, color: '#BDC3C7' },

  /* 카드(영양소 체크) */
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginTop: 14,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  cardTitle: { fontSize: 17, fontWeight: '800', color: '#2C3E50', marginBottom: 12 },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#F4F6F7',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  chipActive: { backgroundColor: '#27AE60', borderColor: '#27AE60' },
  chipText: { color: '#2C3E50', fontWeight: '700' },
  chipTextActive: { color: '#FFF' },

  inputRow: { flexDirection: 'row', alignItems: 'flex-end', marginTop: 6 },
  label: { color: '#566573', fontSize: 12, marginBottom: 6, fontWeight: '700' },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    fontSize: 15,
  },

  checkBtn: {
    marginTop: 14,
    backgroundColor: '#27AE60',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  checkBtnText: { color: '#FFF', fontWeight: '800', fontSize: 16 },

  resultBox: {
    marginTop: 12,
    backgroundColor: '#ECFDF5',
    borderColor: '#C7F9E5',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  resultText: { color: '#1E8449', fontWeight: '700' },
});
