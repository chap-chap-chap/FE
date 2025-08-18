// FE/app/api/config.ts (교체)

// 플랫폼/환경별 API Base URL을 안전하게 선택 + 정규화
import { Platform } from "react-native";
import Constants from "expo-constants";

type Extra = {
  SPRING_API_ANDROID?: string; // 안드로이드(에뮬레이터/실기기) 전용
  SPRING_API_IOS?: string;     // iOS 전용
  SPRING_API_LAN?: string;     // 같은 Wi-Fi(사설 IP)로 접속할 때
};

// expo.extra 읽기
const extra = (Constants.expoConfig?.extra || {}) as Extra;

// 실기기/LAN 테스트 시 true 로 바꿔 쓰면 됨.
// (같은 공유기 안에서 서버가 192.168.x.x 인 경우)
const USE_LAN = false;

// 프로덕션 기본값 (extra 에 값이 없어도 여기로 폴백)
const DEFAULT_PROD = "https://www.shallwewalk.kro.kr";

// URL 끝의 슬래시 제거
function stripTrailingSlash(url?: string | null): string | undefined {
  if (!url) return url ?? undefined;
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

// 우선순위: LAN 옵션 → 플랫폼별 extra → 프로덕션 기본값
const picked =
  (USE_LAN && extra.SPRING_API_LAN) ||
  (Platform.OS === "ios" ? extra.SPRING_API_IOS : extra.SPRING_API_ANDROID) ||
  DEFAULT_PROD;

// 최종 BASE (뒤 슬래시 제거해서 중복 슬래시 방지)
export const SPRING_API_BASE = stripTrailingSlash(picked) as string;

// 편의 헬퍼: path 앞 슬래시 유무 상관없이 완전한 URL 생성
export function apiUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${SPRING_API_BASE}${p}`;
}

// 디버그 경고
if (!SPRING_API_BASE) {
  console.warn("SPRING_API_BASE가 비어있습니다. app.json의 extra를 확인하세요.");
} else {
  // 개발 중 파악용 로그 (필요 없으면 지워도 됨)
  // console.log("[API BASE]", SPRING_API_BASE);
}
