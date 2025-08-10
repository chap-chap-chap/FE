import React, { useEffect, useState } from "react";
import { View, Text, Button, StyleSheet } from "react-native";
import MapView, { Marker } from "react-native-maps";
import * as Location from "expo-location";

export default function Home() {
  const [pos, setPos] = useState<{ latitude: number; longitude: number } | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") { 
        setErr("위치 권한이 거부되었습니다."); 
        return; 
      }
      const cur = await Location.getCurrentPositionAsync({ accuracy: 5 });
      setPos({ latitude: cur.coords.latitude, longitude: cur.coords.longitude });
    })();
  }, []);

  return (
    <View style={s.screen}>
      <View style={s.header}>
        <Text style={s.title}>DogJog — 달리기</Text>
        <Button title="현위치" onPress={async () => {
          const cur = await Location.getCurrentPositionAsync({ accuracy: 5 });
          setPos({ latitude: cur.coords.latitude, longitude: cur.coords.longitude });
        }} />
        {err ? <Text style={s.err}>{err}</Text> : null}
      </View>
      <View style={s.mapWrap}>
        <MapView
          style={StyleSheet.absoluteFillObject}
          initialRegion={{
            latitude: pos?.latitude ?? 37.5665,
            longitude: pos?.longitude ?? 126.9780,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }}
          region={pos ? {
            latitude: pos.latitude,
            longitude: pos.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          } : undefined}
        >
          {pos && <Marker coordinate={pos} />}
        </MapView>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#fff" },
  header: { paddingTop: 50, padding: 12, gap: 8, backgroundColor: "#fff", zIndex: 1 },
  title: { fontSize: 18, fontWeight: "700" },
  err: { color: "red" },
  mapWrap: { flex: 1 },
});
