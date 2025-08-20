// app/sign.tsx
import React, { useMemo, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  View, Text, StatusBar, StyleSheet, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView, Dimensions, Alert, ActivityIndicator,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { login as apiLogin, register as apiRegister } from "../src/api/auth";

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
  danger: "#D32F2F",
};

const RAD = { sm: S(8), md: S(12), lg: S(20) };
const LOGO_H = 52;

type Sex = "MALE" | "FEMALE";
const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim().toLowerCase());

/** ---------- 로그인 응답에서 토큰 추출 & 저장 ---------- */
const TOKEN_KEYS = ["accessToken", "token", "jwt", "idToken", "Authorization"];
function pickToken(resp: any): string {
  if (!resp) return "";
  for (const k of TOKEN_KEYS) {
    const v = resp?.[k] ?? resp?.data?.[k];
    if (v) return String(v);
  }
  if (resp?.user?.token) return String(resp.user.token);
  return "";
}

async function persistAuth(resp: any, email: string) {
  const token = pickToken(resp);
  const pairs: [string, string][] = [
    ["signedIn", "true"],
    ["currentUserEmail", email],
  ];
  if (token) {
    pairs.push(["accessToken", token], ["Authorization", token.startsWith("Bearer ") ? token : `Bearer ${token}`]);
  }
  if (resp?.refreshToken) pairs.push(["refreshToken", String(resp.refreshToken)]);
  await AsyncStorage.multiSet(pairs);
}

export default function Sign() {
  const [mode, setMode] = useState<"login" | "signup">("login");

  // 로그인 폼
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // 회원가입 폼
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // 회원가입 - 프로필
  const [weightKg, setWeightKg] = useState<string>("65");
  const [heightCm, setHeightCm] = useState<string>("170");
  const [age, setAge] = useState<string>("25");
  const [sex, setSex] = useState<Sex>("MALE");

  const [loading, setLoading] = useState(false);
  const [navigating, setNavigating] = useState(false);
  const [errorText, setErrorText] = useState<string>("");

  // ===== 검증 =====
  const emailOk = useMemo(() => isEmail(email), [email]);
  const nameOk  = useMemo(() => !!name.trim(), [name]);
  const pwOk    = useMemo(() => password.length >= 6, [password]);

  const wNum = weightKg === "" ? NaN : Number(weightKg);
  const hNum = heightCm === "" ? NaN : Number(heightCm);
  const aNum = age === "" ? NaN : Number(age);

  const weightOk = Number.isFinite(wNum) && wNum >= 1 && wNum <= 300;
  const heightOk = Number.isFinite(hNum) && hNum >= 50 && hNum <= 250;
  const ageOk    = Number.isFinite(aNum) && aNum >= 1 && aNum <= 120;
  const sexOk    = !!sex;

  const canLogin  = useMemo(() => !!loginEmail.trim() && !!loginPassword, [loginEmail, loginPassword]);
  const canSignUp = emailOk && nameOk && pwOk && weightOk && heightOk && ageOk && sexOk;

  const completeSignIn = async (emailToSave: string, resp: any) => {
    // 1) 저장
    await persistAuth(resp, emailToSave);
    // 2) 중복 네비 방지 + 한 번만 replace
    if (navigating) return;
    setNavigating(true);
    // 다음 프레임에 라우팅(레이아웃 re-render 이후)
    requestAnimationFrame(() => {
      router.replace("/(tabs)");
      // 혹시 모를 중복 방지 타이머(옵션)
      setTimeout(() => setNavigating(false), 400);
    });
  };

  // 로그인
  const handleLogin = async () => {
    if (loading || navigating) return;
    const emailTrim = loginEmail.trim();
    if (!emailTrim || !loginPassword) {
      Alert.alert("입력 확인", "이메일과 비밀번호를 입력하세요.");
      return;
    }
    try {
      setLoading(true);
      const data = await apiLogin(emailTrim, loginPassword);
      const displayName = data?.user?.name || emailTrim;
      Alert.alert("로그인 성공", `안녕, ${displayName}`);
      await completeSignIn(emailTrim, data);
    } catch (e: any) {
      Alert.alert("로그인 실패", e?.response?.data?.message || e?.message || "다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  };

  // 회원가입
  const handleSignUp = async () => {
    if (loading || navigating) return;
    if (!canSignUp) {
      const reasons: string[] = [];
      if (!nameOk)   reasons.push("이름");
      if (!emailOk)  reasons.push("이메일 형식");
      if (!pwOk)     reasons.push("비밀번호(6자 이상)");
      if (!weightOk) reasons.push("몸무게(1–300)");
      if (!heightOk) reasons.push("키(50–250)");
      if (!ageOk)    reasons.push("나이(1–120)");
      if (!sexOk)    reasons.push("성별");
      setErrorText(`입력값을 다시 확인하세요: ${reasons.join(", ")}`);
      return;
    }
    setErrorText("");

    try {
      setLoading(true);
      await apiRegister(name.trim(), email.trim(), password, {
        weightKg: wNum, heightCm: hNum, age: aNum, sex,
      });
      Alert.alert("가입 완료", "회원가입이 완료되었습니다. 로그인해 주세요.");
      setMode("login");
    } catch (e: any) {
      const msg =
        e?.response?.data?.message ||
        (e?.response?.status === 502 ? "서버 게이트웨이 오류(502). 잠시 후 다시 시도해 주세요." : e?.message) ||
        "다시 시도해 주세요.";
      Alert.alert("회원가입 실패", msg);
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
                    autoCorrect={false}
                    autoComplete="email"
                    textContentType="emailAddress"
                    returnKeyType="next"
                    value={loginEmail}
                    onChangeText={setLoginEmail}
                  />

                  <TextInput
                    style={s.input}
                    placeholder="비밀번호"
                    placeholderTextColor={COLORS.sub}
                    secureTextEntry
                    autoComplete="password"
                    textContentType="password"
                    returnKeyType="done"
                    value={loginPassword}
                    onChangeText={setLoginPassword}
                    onSubmitEditing={handleLogin}
                  />

                  <TouchableOpacity
                    style={[s.primaryBtn, (loading || navigating || !canLogin) && { opacity: 0.6 }]}
                    onPress={handleLogin}
                    disabled={loading || navigating || !canLogin}
                  >
                    {loading ? <ActivityIndicator /> : <Text style={s.primaryTxt}>로그인</Text>}
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <Text style={s.heading}>계정 만들기</Text>
                  <Text style={s.captionBlack}>이름, 이메일, 비밀번호, 프로필 정보를 입력하세요.</Text>

                  <TextInput
                    style={s.input}
                    placeholder="이름"
                    placeholderTextColor={COLORS.sub}
                    autoCapitalize="words"
                    autoCorrect={false}
                    returnKeyType="next"
                    value={name}
                    onChangeText={setName}
                  />
                  <TextInput
                    style={s.input}
                    placeholder="email@domain.com"
                    placeholderTextColor={COLORS.sub}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="email"
                    textContentType="emailAddress"
                    returnKeyType="next"
                    value={email}
                    onChangeText={setEmail}
                  />
                  <TextInput
                    style={s.input}
                    placeholder="비밀번호 (6자 이상)"
                    placeholderTextColor={COLORS.sub}
                    secureTextEntry
                    autoComplete="new-password"
                    textContentType="newPassword"
                    returnKeyType="next"
                    value={password}
                    onChangeText={setPassword}
                  />

                  {/* 프로필 섹션 */}
                  <View style={s.profileBox}>
                    <Text style={s.profileTitle}>프로필</Text>

                    <View style={s.row}>
                      <View style={s.col}>
                        <Text style={s.label}>몸무게(kg)</Text>
                        <TextInput
                          style={s.input}
                          placeholder="예: 65"
                          placeholderTextColor={COLORS.sub}
                          keyboardType="decimal-pad"
                          returnKeyType="next"
                          value={weightKg}
                          onChangeText={(t) => setWeightKg(t.replace(/[^0-9.]/g, ""))}
                        />
                      </View>
                      <View style={s.col}>
                        <Text style={s.label}>키(cm)</Text>
                        <TextInput
                          style={s.input}
                          placeholder="예: 170"
                          placeholderTextColor={COLORS.sub}
                          keyboardType="number-pad"
                          returnKeyType="next"
                          value={heightCm}
                          onChangeText={(t) => setHeightCm(t.replace(/[^0-9]/g, ""))}
                        />
                      </View>
                    </View>

                    <View style={s.row}>
                      <View style={s.col}>
                        <Text style={s.label}>나이</Text>
                        <TextInput
                          style={s.input}
                          placeholder="예: 25"
                          placeholderTextColor={COLORS.sub}
                          keyboardType="number-pad"
                          returnKeyType="done"
                          value={age}
                          onChangeText={(t) => setAge(t.replace(/[^0-9]/g, ""))}
                        />
                      </View>
                    </View>

                    <Text style={[s.label, { marginTop: S(8) }]}>성별</Text>
                    <View style={s.sexWrap}>
                      {(["MALE", "FEMALE"] as Sex[]).map((v) => (
                        <TouchableOpacity
                          key={v}
                          style={[s.chip, sex === v && s.chipActive]}
                          onPress={() => setSex(v)}
                        >
                          <Text style={[s.chipTxt, sex === v && s.chipTxtActive]}>
                            {v === "MALE" ? "남성" : "여성"}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    {!!errorText && <Text style={s.error}>{errorText}</Text>}
                  </View>

                  <TouchableOpacity
                    style={[s.primaryBtn, (loading || navigating || !canSignUp) && { opacity: 0.6 }]}
                    onPress={handleSignUp}
                    disabled={loading || navigating || !canSignUp}
                  >
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

  /** 프로필 섹션 */
  profileBox: { marginTop: S(8), backgroundColor: COLORS.white, borderRadius: RAD.sm, padding: S(12) },
  profileTitle: { fontSize: S(14), fontWeight: "800", color: COLORS.text, marginBottom: S(8) },
  row: { flexDirection: "row", gap: S(10) },
  col: { flex: 1 },
  label: { marginTop: S(6), color: COLORS.sub, fontSize: S(12) },
  sexWrap: { flexDirection: "row", gap: S(8), marginTop: S(8) },
  chip: { paddingVertical: S(8), paddingHorizontal: S(12), borderRadius: RAD.sm, backgroundColor: "#F2F2F2" },
  chipActive: { backgroundColor: COLORS.black },
  chipTxt: { color: COLORS.text, fontWeight: "700" },
  chipTxtActive: { color: COLORS.white },

  error: { marginTop: S(8), color: COLORS.danger, fontSize: S(12) },
});
