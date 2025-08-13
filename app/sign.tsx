import React, { useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  View,
  Text,
  StatusBar,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Dimensions,
  Image,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { FontAwesome5 } from "@expo/vector-icons";

const { width } = Dimensions.get("window");
const BASE = 375;
const S = (n: number) => Math.round((width / BASE) * n);

const COLORS = {
  bg: "#AEC3A9",
  text: "#1D1B20",
  sub: "#828282",
  line: "#E6E6E6",
  white: "#FFFFFF",
  black: "#000000",
  lightGray: "#EEEEEE",
};

const RAD = { sm: S(8), md: S(12), lg: S(20) };
const LOGO_W = 150;
const LOGO_H = 52;

export default function Sign() {
  const [email, setEmail] = useState("");

  const completeSignIn = async () => {
    await AsyncStorage.setItem("signedIn", "true");
    router.replace("/(tabs)");
  };

  return (
    <>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      <SafeAreaView style={s.container}>
        <View style={s.logoBox}>
          <Text style={s.title}>산책갈까</Text>
        </View>

        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
            <View style={s.card}>
              <View style={{ height: S(12) }} />

              <Text style={s.heading}>계정 만들기</Text>
              <Text style={s.captionBlack}>이 앱에 가입하려면 이메일을 입력하세요</Text>

              <View style={{ height: S(12) }} />

              <TextInput
                style={s.input}
                placeholder="email@domain.com"
                placeholderTextColor={COLORS.sub}
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />

              <TouchableOpacity
                style={[s.primaryBtn, !email && { opacity: 0.5 }]}
                onPress={completeSignIn}
                disabled={!email}
              >
                <Text style={s.primaryTxt}>계속</Text>
              </TouchableOpacity>

              <View style={s.dividerWrap}>
                <View style={s.divider} />
                <Text style={s.dividerTxt}>또는</Text>
                <View style={s.divider} />
              </View>

              <TouchableOpacity style={s.oauthBtn} onPress={completeSignIn} activeOpacity={0.8}>
                <View style={s.gIconWrap}>
                  <Image source={require("../assets/google-g.png")} style={s.gIconImg} resizeMode="contain" />
                </View>
                <Text style={s.oauthTxt}>Google 계정으로 계속하기</Text>
              </TouchableOpacity>

              <TouchableOpacity style={s.oauthBtn} onPress={completeSignIn} activeOpacity={0.8}>
                <FontAwesome5 name="apple" size={S(18)} color={COLORS.black} />
                <Text style={s.oauthTxt}>Apple 계정으로 계속하기</Text>
              </TouchableOpacity>

              <Text style={s.legal}>
                계속을 클릭하면 당사의 <Text style={s.legalStrong}>서비스 이용 약관</Text> 및{" "}
                <Text style={s.legalStrong}>개인정보 처리방침</Text>에 동의하는 것으로 간주됩니다.
              </Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg, position: "relative" },
  scroll: { flexGrow: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 16, paddingVertical: 0 },

  logoBox: {
    position: "absolute",
    top: 120,
    left: (width - LOGO_W) / 2,
    width: LOGO_W,
    height: LOGO_H,
    justifyContent: "center",
    alignItems: "center",
    opacity: 1,
    zIndex: 10,
  },

  title: {
    fontFamily: "Sunflower_300Light",
    fontSize: 30,
    lineHeight: 45,
    letterSpacing: -0.3,
    textAlign: "center",
    color: COLORS.text,
  },

  card: {
    width: Math.min(width - 32, 420),
    backgroundColor: COLORS.bg,
    borderRadius: RAD.lg,
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 36,
  },

  heading: { fontSize: S(16), fontWeight: "800", color: COLORS.text, textAlign: "center" },
  captionBlack: { fontSize: S(12), color: COLORS.black, textAlign: "center", marginTop: S(6) },

  input: {
    height: S(44),
    backgroundColor: COLORS.white,
    borderRadius: RAD.sm,
    paddingHorizontal: S(14),
    color: COLORS.text,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    marginTop: S(10),
  },

  primaryBtn: {
    height: S(44),
    borderRadius: RAD.sm,
    backgroundColor: COLORS.black,
    alignItems: "center",
    justifyContent: "center",
    marginTop: S(12),
  },
  primaryTxt: { color: COLORS.white, fontWeight: "700", fontSize: S(14) },

  dividerWrap: { flexDirection: "row", alignItems: "center", gap: S(10), marginTop: S(16) },
  divider: { flex: 1, height: 1, backgroundColor: COLORS.line },
  dividerTxt: { color: COLORS.sub, fontSize: S(12) },

  oauthBtn: {
    height: S(44),
    borderRadius: RAD.sm,
    backgroundColor: COLORS.lightGray,
    borderWidth: 1,
    borderColor: COLORS.line,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    columnGap: S(10),
    marginTop: S(10),
  },
  gIconWrap: {
    width: S(18),
    height: S(18),
    borderRadius: S(9),
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  gIconImg: { width: "100%", height: "100%" },
  oauthTxt: { color: COLORS.text, fontWeight: "700", fontSize: S(14) },

  legal: { color: COLORS.sub, fontSize: S(11), lineHeight: S(16), marginTop: S(14), textAlign: "center" },
  legalStrong: { color: COLORS.black, fontWeight: "700" },
});
