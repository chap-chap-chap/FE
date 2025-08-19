// src/api/client.ts
import axios from "axios";

type AnyObj = Record<string, any>;

/** 공용 axios 인스턴스 (쿠키 세션) */
export const api = axios.create({
  baseURL: "https://www.shallwewalk.kro.kr", // ✅ 루트 도메인
  headers: { "Content-Type": "application/json" },
  withCredentials: true,                      // ✅ 쿠키 주고받기
  timeout: 15000,
});

/** 요청 인터셉터: Authorization 강제 제거 + 로깅 */
api.interceptors.request.use((config) => {
  if (config.headers?.Authorization) {
    delete (config.headers as AnyObj).Authorization; // ✅ 쿠키 방식이므로 제거
  }
  const fullUrl = `${config.baseURL ?? ""}${config.url ?? ""}`;
  console.log("REQ  >>>", (config.method || "GET").toUpperCase(), fullUrl);
  if (config.data) {
    console.log(
      "BODY >>>",
      typeof config.data === "string" ? config.data : JSON.stringify(config.data)
    );
  }
  return config;
});

/** 응답 인터셉터: 401이면 refresh 후 한 번 재시도 + 로깅 */
let isRefreshing = false;
let waiters: Array<() => void> = [];

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const status = error?.response?.status;
    const cfg: AnyObj = error?.config || {};
    const method = (cfg.method || "GET").toUpperCase();
    const url = `${cfg.baseURL ?? ""}${cfg.url ?? ""}`;

    console.log("STATUS >>>", status);
    console.log("URL    >>>", `${method} ${url}`);
    if (error?.response?.data) {
      try { console.log("DATA   >>>", JSON.stringify(error.response.data)); }
      catch { console.log("DATA   >>>", String(error.response.data)); }
    }

    // 401 처리: 로그인/회원가입/리프레시/로그아웃 요청 자체는 제외
    const u = (cfg.url || "").toLowerCase();
    const isAuthPath =
      u.includes("/api/auth/login") ||
      u.includes("/api/auth/signup") ||
      u.includes("/api/auth/refresh") ||
      u.includes("/api/auth/logout");

    if (status === 401 && !cfg._retried && !isAuthPath) {
      if (isRefreshing) {
        await new Promise<void>((resolve) => waiters.push(resolve));
      } else {
        isRefreshing = true;
        try {
          await api.post("/api/auth/refresh"); // ✅ 쿠키로 재발급
        } catch (e) {
          // 재발급 실패 -> 그대로 에러 반환
          isRefreshing = false;
          waiters.forEach((w) => w());
          waiters = [];
          return Promise.reject(error);
        }
        isRefreshing = false;
        waiters.forEach((w) => w());
        waiters = [];
      }
      cfg._retried = true;
      return api(cfg); // ✅ 한 번만 재시도
    }

    return Promise.reject(error);
  }
);

export default api;
