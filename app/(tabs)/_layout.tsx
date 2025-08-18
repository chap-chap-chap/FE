// app/(tabs)/_layout.tsx
import React from "react";
import { Tabs } from "expo-router";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";

function SegmentedTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const bottomLift = 18; // 홈바 위로 띄우기

  return (
    <View pointerEvents="box-none" style={[styles.host, { bottom: insets.bottom + bottomLift }]}>
      <View style={styles.pill}>
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const label =
            route.name === "index"
              ? "홈"
              : descriptors[route.key]?.options?.title ?? route.name;

          const onPress = () => {
            const e = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
            if (!focused && !e.defaultPrevented) navigation.navigate(route.name as never);
          };

          return (
            <TouchableOpacity
              key={route.key}
              style={[styles.seg, focused && styles.segActive]}
              onPress={onPress}
              activeOpacity={0.9}
            >
              <Text style={[styles.segText, focused && styles.segTextActive]} numberOfLines={1}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      // 기본 탭바 숨기고 커스텀 탭바 사용
      screenOptions={{ headerShown: false, tabBarStyle: { display: "none" } }}
      tabBar={(props) => <SegmentedTabBar {...props} />}
    >
      <Tabs.Screen name="index" options={{ title: "홈" }} />
      <Tabs.Screen name="running" options={{ title: "러닝" }} />
      <Tabs.Screen name="calendar" options={{ title: "캘린더" }} />
      <Tabs.Screen name="dog_food" options={{ title: "사료&간식" }} />
      <Tabs.Screen name="hospital" options={{ title: "병원" }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  host: {
    position: "absolute",
    left: 0,
    right: 0,
    paddingHorizontal: 16,
  },
  // 캡슐 컨테이너 (스크린샷 느낌)
  pill: {
    height: 48,
    borderRadius: 999,
    padding: 6,
    backgroundColor: "#E9F2E8",          // 연한 민트(스크린샷 배경 톤)
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.95)", // 흰색 스트로크
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",

    // 아주 약한 그림자
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  // 각 세그먼트
  seg: {
    flex: 1,
    height: "100%",
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 3, // 세그 사이 여백
  },
  // 활성 세그먼트: 반투명 화이트 오버레이(스크린샷처럼)
  segActive: {
    backgroundColor: "rgba(255,255,255,0.6)",
  },
  segText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1D1B20",
  },
  segTextActive: {
    color: "#0088FF", // 파란 텍스트
  },
});
