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
  StatusBar
} from 'react-native';
import { router } from 'expo-router';

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
    { id: 4, name: '동결건조 닭가슴살', type: '간식', rating: 4.9 }
  ];

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
        <Text style={styles.screenTitle}>🦴 사료 & 간식</Text>
      </View>
      
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
            <TouchableOpacity key={item.id} style={styles.foodItem}>
              <View style={styles.foodInfo}>
                <Text style={styles.foodName}>{item.name}</Text>
                <Text style={styles.foodType}>{item.type}</Text>
                <Text style={styles.foodRating}>⭐ {item.rating}</Text>
              </View>
              <Text style={styles.arrowSmall}>›</Text>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
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
    marginRight: 15,
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
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 15,
  },
  foodItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  foodInfo: {
    flex: 1,
  },
  foodName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 5,
  },
  foodType: {
    fontSize: 14,
    color: '#7F8C8D',
    marginBottom: 3,
  },
  foodRating: {
    fontSize: 14,
    color: '#F39C12',
  },
  arrowSmall: {
    fontSize: 18,
    color: '#BDC3C7',
  },
});