import React, { useMemo, useState } from "react";
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
  Alert,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";

const DEV_MODE = true; // ✅ 개발용 바로 진입 스위치 (실서비스 시 false)

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
const LOGO_W = 150;
const LOGO_H = 52;

type Gender = "male" | "female";
type User = {
  email: string;
  password: string; // 데모용 평문 (실서비스는 반드시 해시!)
  gender: Gender;
  age: number;
  createdAt: string;
};

export default function Sign() {
  const [mode, setMode] = useState<"login" | "signup">("login");

  // 로그인 폼
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // 회원가입 폼
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [gender, setGender] = useState<Gender | null>(null);
  const [age, setAge] = useState("");

  const canLogin = useMemo(() => !!loginEmail && !!loginPassword, [loginEmail, loginPassword]);
  const canSignUp = useMemo(() => {
    return validateEmail(email) && password.length >= 6 && !!gender && Number(age) > 0;
  }, [email, password, gender, age]);

  const completeSignIn = async (emailToSave: string) => {
    await AsyncStorage.setItem("signedIn", "true");
    await AsyncStorage.setItem("currentUserEmail", emailToSave);
    router.replace("/(tabs)");
  };

  // 유저 저장 유틸 (Map: { [email]: User })
  const loadUsers = async (): Promise<Record<string, User>> => {
    const raw = await AsyncStorage.getItem("users");
    return raw ? JSON.parse(raw) : {};
  };
  const saveUsers = async (users: Record<string, User>) => {
    await AsyncStorage.setItem("users", JSON.stringify(users));
  };

  function validateEmail(v: string) {
    const re = /\S+@\S+\.\S+/;
    return re.test(v);
  }

  // 로그인
  const handleLogin = async () => {
    if (DEV_MODE) {
      // ✅ 개발용: 바로 진입
      await completeSignIn(loginEmail || "dev@local");
      return;
    }

    if (!canLogin) return;
    const users = await loadUsers();
    const key = loginEmail.toLowerCase();
    const u = users[key];
    if (!u) {
      Alert.alert("로그인 실패", "해당 이메일의 계정이 없습니다.");
      return;
    }
    if (u.password !== loginPassword) {
      Alert.alert("로그인 실패", "비밀번호가 올바르지 않습니다.");
      return;
    }
    await completeSignIn(u.email);
  };

  // 회원가입
  const handleSignUp = async () => {
    if (DEV_MODE) {
      // ✅ 개발용: 값 검증/저장 스킵하고 바로 진입
      await completeSignIn(email || "dev@local");
      return;
    }

    if (!canSignUp) {
      Alert.alert("입력 확인", "모든 항목을 올바르게 입력해주세요. (비밀번호 6자 이상)");
      return;
    }
    const users = await loadUsers();
    const key = email.toLowerCase();
    if (users[key]) {
      Alert.alert("회원가입 실패", "이미 가입된 이메일입니다.");
      return;
    }
    const newUser: User = {
      email: key,
      password,
      gender: gender as Gender,
      age: Number(age),
      createdAt: new Date().toISOString(),
    };
    users[key] = newUser;
    await saveUsers(users);
    Alert.alert("가입 완료", "회원가입이 완료되었습니다. 자동으로 로그인합니다.");
    await completeSignIn(key);
  };

  const GenderChip = ({ value, label }: { value: Gender; label: string }) => (
    <TouchableOpacity
      onPress={() => setGender(value)}
      style={[
        s.genderChip,
        gender === value && { backgroundColor: COLORS.black, borderColor: COLORS.black },
      ]}
    >
      <Text style={[s.genderChipTxt, gender === value && { color: COLORS.white }]}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      <SafeAreaView style={s.container}>
        <View style={s.logoBox}>
          <Text style={s.title}>산책갈까</Text>
        </View>

        {/* 키보드로 화면이 과하게 밀리지 않도록 height 사용 유지 */}
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
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
                  <Text style={s.captionBlack}>이메일과 비밀번호를 입력하세요 (개발용: 빈칸도 OK)</Text>

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

                  <TouchableOpacity
                    style={s.primaryBtn}
                    onPress={handleLogin}
                    // 개발용: 비활성화 해제
                    disabled={false}
                  >
                    <Text style={s.primaryTxt}>로그인</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <Text style={s.heading}>계정 만들기</Text>
                  <Text style={s.captionBlack}>이메일, 비밀번호, 성별(남/여), 나이 (개발용: 빈칸도 OK)</Text>

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

                  <View style={s.genderRow}>
                    <GenderChip value="male" label="남" />
                    <GenderChip value="female" label="여" />
                  </View>

                  <TextInput
                    style={s.input}
                    placeholder="나이"
                    placeholderTextColor={COLORS.sub}
                    keyboardType="number-pad"
                    value={age}
                    onChangeText={(t) => setAge(t.replace(/[^0-9]/g, ""))}
                  />

                  <TouchableOpacity
                    style={s.primaryBtn}
                    onPress={handleSignUp}
                    // 개발용: 비활성화 해제
                    disabled={false}
                  >
                    <Text style={s.primaryTxt}>회원가입</Text>
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
  container: { flex: 1, backgroundColor: COLORS.bg, position: "relative" },
  scroll: { flexGrow: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 16 },

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

  switchWrap: {
    flexDirection: "row",
    backgroundColor: COLORS.white,
    borderRadius: RAD.sm,
    padding: 4,
    marginBottom: S(16),
  },
  switchBtn: {
    flex: 1,
    height: S(36),
    borderRadius: RAD.sm,
    alignItems: "center",
    justifyContent: "center",
  },
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

  genderRow: { flexDirection: "row", gap: 8, marginTop: S(10) },
  genderChip: {
    flex: 1,
    height: S(36),
    borderRadius: RAD.sm,
    borderWidth: 1,
    borderColor: COLORS.line,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.white,
  },
  genderChipTxt: { color: COLORS.text, fontWeight: "700" },

  primaryBtn: {
    height: S(44),
    borderRadius: RAD.sm,
    backgroundColor: COLORS.black,
    alignItems: "center",
    justifyContent: "center",
    marginTop: S(12),
  },
  primaryTxt: { color: COLORS.white, fontWeight: "700", fontSize: S(14) },
});
