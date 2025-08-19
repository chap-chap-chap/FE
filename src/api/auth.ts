// src/api/auth.ts
import { api } from "./client";

/** 서버에서 사용하는 사용자 타입(필요 시 확장) */
export type User = { id?: number; name?: string; email: string };

/** ====== 요청/응답 타입 ====== */
type LoginBody = { email: string; password: string };
type LoginRes = any;   // 백엔드 스키마에 맞게 필요 시 구체화

type SignupBody = {
  email: string;
  password: string;
  name: string;
  profile: {
    weightKg: number;
    heightCm: number;
    age: number;
    sex: "MALE" | "FEMALE" | "OTHER";
  };
};
type SignupRes = any;

/** ====== API 함수 ====== */

/** 로그인: 쿠키 기반 (withCredentials: true는 axios 인스턴스에서 설정) */
export async function login(email: string, password: string): Promise<LoginRes> {
  const { data } = await api.post<LoginRes>("/api/auth/login", { email, password } as LoginBody);
  // 쿠키는 자동 저장되므로 토큰을 앱 스토리지에 저장할 필요가 없음.
  return data;
}

/** 회원가입: Swagger 스펙에 맞춰 profile 포함 */
export async function register(
  name: string,
  email: string,
  password: string,
  profile?: Partial<SignupBody["profile"]>
): Promise<SignupRes> {
  const body: SignupBody = {
    email,
    password,
    name,
    profile: {
      weightKg: profile?.weightKg ?? 65,
      heightCm: profile?.heightCm ?? 170,
      age: profile?.age ?? 25,
      sex: profile?.sex ?? "MALE",
    },
  };

  const { data } = await api.post<SignupRes>("/api/auth/signup", body);
  return data;
}

/** 로그아웃: 서버에 쿠키 만료 요청 */
export async function logout(): Promise<void> {
  await api.post("/api/auth/logout");
  // 쿠키는 서버가 만료시키므로 별도 로컬 정리는 필요 없음.
}
