import React from 'react';
import { Text } from 'react-native';
import { Tabs } from 'expo-router';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false, // 모든 탭에서 헤더 숨기기
        tabBarActiveTintColor: '#FF6B6B', // 활성 탭 색상
        tabBarInactiveTintColor: '#95A5A6', // 비활성 탭 색상
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: '홈',
          tabBarIcon: ({ color, size }) => (
            <Text style={{ fontSize: size || 24, color }}>🏠</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: '탐색',
          tabBarIcon: ({ color, size }) => (
            <Text style={{ fontSize: size || 24, color }}>🔍</Text>
          ),
        }}
      />
    </Tabs>
  );
}