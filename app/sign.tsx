import React, { useMemo, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  View, Text, StatusBar, StyleSheet, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView, Dimensions, Alert, ActivityIndicator
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { login as apiLogin, register as apiRegister } from "../src/api/auth"; // ✅ 백엔드 연결

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
};

const RAD = { sm: S(8), md: S(12), lg: S(20) };
const LOGO_H = 52;

export default function Sign() {
  const [mode, setMode] = useState<"login" | "signup">("login");

  // 로그인 폼
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // 회원가입 폼
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);

  const canLogin = useMemo(() => !!loginEmail && !!loginPassword, [loginEmail, loginPassword]);
  const canSignUp = useMemo(() => email.includes("@") && password.length >= 6 && !!name, [email, password, name]);

  const completeSignIn = async (emailToSave: string) => {
    await AsyncStorage.setItem("signedIn", "true");
    await AsyncStorage.setItem("currentUserEmail", emailToSave);
    router.replace("/(tabs)"); // 로그인 후 탭 화면으로 이동
  };

  // 로그인
  const handleLogin = async () => {
    if (!canLogin) {
      Alert.alert("입력 확인", "이메일과 비밀번호를 입력하세요.");
      return;
    }
    try {
      setLoading(true);
      const data = await apiLogin(loginEmail.trim(), loginPassword);
      const displayName = data?.user?.name || loginEmail.trim();
      Alert.alert("로그인 성공", `안녕, ${displayName}`);
      await completeSignIn(loginEmail.trim());
    } catch (e: any) {
      Alert.alert("로그인 실패", e?.response?.data?.message || e?.message || "다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  };

  // 회원가입
  const handleSignUp = async () => {
    if (!canSignUp) {
      Alert.alert("입력 확인", "이름, 이메일, 비밀번호(6자 이상)를 입력하세요.");
      return;
    }
    try {
      setLoading(true);
      await apiRegister(name.trim(), email.trim(), password);
      Alert.alert("가입 완료", "회원가입이 완료되었습니다. 로그인해 주세요.");
      setMode("login");
    } catch (e: any) {
      Alert.alert("회원가입 실패", e?.response?.data?.message || e?.message || "다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      <SafeAreaView style={s.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
          keyboardVerticalOffset={0}
        >
          <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" bounces={false}>
            <View style={s.logoBox}>
              <Text style={s.title}>산책갈까</Text>
            </View>

            <View style={s.card}>
              {/* 탭 스위처 */}
              <View style={s.switchWrap}>
                <TouchableOpacity
                  style={[s.switchBtn, mode === "login" && s.switchBtnActive]}
                  onPress={() => setMode("login")}
                >
                  <Text style={[s.switchTxt, mode === "login" && s.switchTxtActive]}>로그인</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.switchBtn, mode === "signup" && s.switchBtnActive]}
                  onPress={() => setMode("signup")}
                >
                  <Text style={[s.switchTxt, mode === "signup" && s.switchTxtActive]}>회원가입</Text>
                </TouchableOpacity>
              </View>

              {mode === "login" ? (
                <>
                  <Text style={s.heading}>이메일로 로그인</Text>
                  <Text style={s.captionBlack}>이메일과 비밀번호를 입력하세요.</Text>

                  <TextInput
                    style={s.input}
                    placeholder="email@domain.com"
                    placeholderTextColor={COLORS.sub}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={loginEmail}
                    onChangeText={setLoginEmail}
                  />
                  <TextInput
                    style={s.input}
                    placeholder="비밀번호"
                    placeholderTextColor={COLORS.sub}
                    secureTextEntry
                    value={loginPassword}
                    onChangeText={setLoginPassword}
                  />

                  <TouchableOpacity style={s.primaryBtn} onPress={handleLogin} disabled={loading}>
                    {loading ? <ActivityIndicator /> : <Text style={s.primaryTxt}>로그인</Text>}
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <Text style={s.heading}>계정 만들기</Text>
                  <Text style={s.captionBlack}>이름, 이메일, 비밀번호를 입력하세요.</Text>

                  <TextInput
                    style={s.input}
                    placeholder="이름"
                    placeholderTextColor={COLORS.sub}
                    value={name}
                    onChangeText={setName}
                  />
                  <TextInput
                    style={s.input}
                    placeholder="email@domain.com"
                    placeholderTextColor={COLORS.sub}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={email}
                    onChangeText={setEmail}
                  />
                  <TextInput
                    style={s.input}
                    placeholder="비밀번호 (6자 이상)"
                    placeholderTextColor={COLORS.sub}
                    secureTextEntry
                    value={password}
                    onChangeText={setPassword}
                  />

                  <TouchableOpacity style={s.primaryBtn} onPress={handleSignUp} disabled={loading}>
                    {loading ? <ActivityIndicator /> : <Text style={s.primaryTxt}>회원가입</Text>}
                  </TouchableOpacity>
                </>
              )}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { flexGrow: 1, paddingHorizontal: 16, paddingTop: S(40), paddingBottom: S(24) },
  logoBox: {
    width: Math.min(width - 32, 420),
    height: LOGO_H,
    alignSelf: "center",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: S(16),
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
    paddingTop: 24,
    alignSelf: "center",
  },
  switchWrap: { flexDirection: "row", backgroundColor: COLORS.white, borderRadius: RAD.sm, padding: 4, marginBottom: S(16) },
  switchBtn: { flex: 1, height: S(36), borderRadius: RAD.sm, alignItems: "center", justifyContent: "center" },
  switchBtnActive: { backgroundColor: COLORS.black },
  switchTxt: { color: COLORS.text, fontWeight: "700" },
  switchTxtActive: { color: COLORS.white },
  heading: { fontSize: S(16), fontWeight: "800", color: COLORS.text, textAlign: "center" },
  captionBlack: { fontSize: S(12), color: COLORS.black, textAlign: "center", marginTop: S(6), marginBottom: S(8) },
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
  primaryBtn: { height: S(44), borderRadius: RAD.sm, backgroundColor: COLORS.black, alignItems: "center", justifyContent: "center", marginTop: S(12) },
  primaryTxt: { color: COLORS.white, fontWeight: "700", fontSize: S(14) },
});
