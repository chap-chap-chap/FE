// app/(tabs)/_layout.tsx
import React from "react";
import { Tabs } from "expo-router";
import { View, TouchableOpacity, StyleSheet } from "react-native";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";

const THEME = {
  pillBg: "rgba(255,255,255,0.72)",
  pillBorder: "rgba(0,0,0,0.06)",
  segActiveBg: "#FFFFFF",
  segActiveBorder: "#E3EFE2",
  icon: "#1D1B20",
  iconMuted: "rgba(29,27,32,0.65)",
};

const ICONS: Record<string, keyof typeof MaterialCommunityIcons.glyphMap> = {
  index: "home-variant-outline",
  running: "run",
  calendar: "calendar-blank-outline",
  dog_food: "bone",
  hospital: "hospital-building",
};

function SegmentedTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const bottomLift = 18; // 홈바 위로 띄우기

  return (
    <View pointerEvents="box-none" style={[styles.host, { bottom: insets.bottom + bottomLift }]}>
      <View style={styles.pill}>
        {state.routes.map((route, index) => {
          const focused = state.index === index;

          const a11yLabel =
            route.name === "index"
              ? "홈"
              : descriptors[route.key]?.options?.title ?? route.name;

          const onPress = () => {
            const e = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
            if (!focused && !e.defaultPrevented) navigation.navigate(route.name as never);
          };

          const iconName = ICONS[route.name] ?? "circle-outline";

          return (
            <TouchableOpacity
              key={route.key}
              style={[styles.seg, focused && styles.segActive]}
              onPress={onPress}
              activeOpacity={0.9}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              accessibilityRole="tab"
              accessibilityLabel={a11yLabel}
            >
              <MaterialCommunityIcons
                name={iconName}
                size={20}
                color={focused ? THEME.icon : THEME.iconMuted}
                style={{ transform: [{ scale: focused ? 1.05 : 1 }] }}
              />
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
      screenOptions={{ headerShown: false, tabBarStyle: { display: "none" } }}
      tabBar={(props) => <SegmentedTabBar {...props} />}
    >
      <Tabs.Screen name="index" options={{ title: "홈" }} />
      <Tabs.Screen name="running" options={{ title: "러닝&산책" }} />
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
  pill: {
    height: 52,
    borderRadius: 999,
    padding: 6,
    backgroundColor: THEME.pillBg,
    borderWidth: 1,
    borderColor: THEME.pillBorder,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",

    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  seg: {
    flex: 1,
    height: "100%",
    borderRadius: 999,
    marginHorizontal: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  segActive: {
    backgroundColor: THEME.segActiveBg,
    borderWidth: 1,
    borderColor: THEME.segActiveBorder,
  },
});
