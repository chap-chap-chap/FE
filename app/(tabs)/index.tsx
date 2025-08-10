import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Dimensions,
  ScrollView,
  StatusBar,
  Platform,
  Image
} from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

interface DayRecord {
  date: string;
  photos: string[];
  memo: string;
  runningRecord?: {
    duration: string;
    distance: string;
    calories: string;
    dogCalories: string;
  };
  mood: '😊' | '😐' | '😢' | '🤗' | '😴' | '';
}

export default function HomeScreen() {
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [allPhotos, setAllPhotos] = useState<string[]>([]);

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

  // 캘린더에서 사진들 로드
  useEffect(() => {
    loadPhotosFromCalendar();
  }, []);

  // 사진 자동 변경
  useEffect(() => {
    if (allPhotos.length > 1) {
      const interval = setInterval(() => {
        setCurrentPhotoIndex((prevIndex) => 
          (prevIndex + 1) % allPhotos.length
        );
      }, 3000); // 3초마다 변경

      return () => clearInterval(interval);
    }
  }, [allPhotos.length]);

  const loadPhotosFromCalendar = async () => {
    try {
      const savedRecords = await AsyncStorage.getItem('dayRecords');
      if (savedRecords) {
        const dayRecords: DayRecord[] = JSON.parse(savedRecords);
        const photos: string[] = [];
        
        dayRecords.forEach(record => {
          photos.push(...record.photos);
        });
        
        // 최신 사진부터 정렬 (최대 10장)
        setAllPhotos(photos.slice(-10).reverse());
      }
    } catch (error) {
      console.log('사진 로드 오류:', error);
    }
  };

  const categories = [
    {
      id: 1,
      title: '런닝',
      subtitle: '함께 달리기',
      icon: '🏃‍♂️',
      color: '#FF6B6B',
      route: 'running'
    },
    {
      id: 2,
      title: '캘린더',
      subtitle: '추억 기록',
      icon: '📅',
      color: '#9B59B6',
      route: 'calendar'
    },
    {
      id: 3,
      title: '사료 & 간식',
      subtitle: '맛있는 먹거리',
      icon: '🦴',
      color: '#4ECDC4',
      route: 'food'
    },
    {
      id: 4,
      title: '병원',
      subtitle: '건강 관리',
      icon: '🏥',
      color: '#45B7D1',
      route: 'hospital'
    }
  ];

  const handleCategoryPress = (category: any) => {
    try {
      router.push(`/${category.route}`);
    } catch (error) {
      console.log('Navigation error:', error);
    }
  };

  const CategoryCard = ({ category, index }: { category: any; index: number }) => (
    <TouchableOpacity
      style={[
        styles.categoryCard,
        { backgroundColor: category.color },
        index % 2 === 0 ? styles.leftCard : styles.rightCard
      ]}
      onPress={() => handleCategoryPress(category)}
      activeOpacity={0.8}
    >
      <Text style={styles.categoryIcon}>{category.icon}</Text>
      <Text style={styles.categoryTitle}>{category.title}</Text>
      <Text style={styles.categorySubtitle}>{category.subtitle}</Text>
    </TouchableOpacity>
  );

  return (
    <>
      <StatusBar hidden={true} />
      <SafeAreaView style={styles.container}>
        {/* 헤더 */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>🐕 산책가자</Text>
          <Text style={styles.headerSubtitle}>오늘도 행복한 산책!</Text>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* 사진 슬라이드 섹션 */}
          <View style={styles.photoSection}>
            {allPhotos.length > 0 ? (
              <View style={styles.photoContainer}>
                <Image 
                  source={{ uri: allPhotos[currentPhotoIndex] }} 
                  style={styles.slidePhoto}
                />
                <View style={styles.photoOverlay}>
                  <Text style={styles.photoText}>우리의 추억 💕</Text>
                  {allPhotos.length > 1 && (
                    <View style={styles.photoIndicators}>
                      {allPhotos.map((_, index) => (
                        <View
                          key={index}
                          style={[
                            styles.indicator,
                            index === currentPhotoIndex && styles.activeIndicator
                          ]}
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

          {/* 빠른 액세스 텍스트 */}
          <View style={styles.quickAccessHeader}>
            <Text style={styles.quickAccessTitle}>빠른 액세스</Text>
          </View>

          {/* 2x2 그리드 카테고리 */}
          <View style={styles.gridContainer}>
            <View style={styles.gridRow}>
              {categories.slice(0, 2).map((category, index) => (
                <CategoryCard key={category.id} category={category} index={index} />
              ))}
            </View>
            <View style={styles.gridRow}>
              {categories.slice(2, 4).map((category, index) => (
                <CategoryCard key={category.id} category={category} index={index + 2} />
              ))}
            </View>
          </View>

          {/* 하단 여백 */}
          <View style={styles.bottomSpacing} />
        </ScrollView>
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
    paddingHorizontal: 25,
    paddingTop: 20,
    paddingBottom: 15,
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 8,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#7F8C8D',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  photoSection: {
    marginTop: 20,
    marginBottom: 25,
  },
  photoContainer: {
    position: 'relative',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 10,
  },
  slidePhoto: {
    width: '100%',
    height: 200,
    borderRadius: 20,
  },
  photoOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  photoText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  photoIndicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  activeIndicator: {
    backgroundColor: '#FFFFFF',
  },
  noPhotoContainer: {
    height: 200,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 5,
  },
  noPhotoIcon: {
    fontSize: 48,
    marginBottom: 10,
  },
  noPhotoText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 5,
  },
  noPhotoSubtext: {
    fontSize: 14,
    color: '#7F8C8D',
    textAlign: 'center',
  },
  quickAccessHeader: {
    marginBottom: 15,
  },
  quickAccessTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  gridContainer: {
    gap: 15,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 15,
  },
  categoryCard: {
    flex: 1,
    height: 120,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 12,
  },
  leftCard: {
    marginRight: 7.5,
  },
  rightCard: {
    marginLeft: 7.5,
  },
  categoryIcon: {
    fontSize: 36,
    marginBottom: 8,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 3,
    textAlign: 'center',
  },
  categorySubtitle: {
    fontSize: 12,
    color: '#FFFFFF',
    opacity: 0.9,
    textAlign: 'center',
  },
  bottomSpacing: {
    height: 30,
  },
});