import axios from "axios";
import * as SecureStore from "expo-secure-store";

/**
 * Axios 인스턴스
 * - baseURL은 반드시 /api 까지 포함 (Swagger 서버 주소 확인)
 * - Authorization 헤더 자동 부착
 */
export const api = axios.create({
  baseURL: "https://www.shallwewalk.kro.kr/api",
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
  // withCredentials: true, // 쿠키 세션 방식 쓸 때만 켬
});

/** 요청 인터셉터: 토큰 자동 부착 */
api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync("accessToken");
  if (token) {
    config.headers = config.headers ?? {};
    (config.headers as any).Authorization = `Bearer ${token}`;
  }

  console.log(
    "REQ  >>>",
    config.method?.toUpperCase(),
    config.baseURL + (config.url || "")
  );
  if (config.data) {
    console.log(
      "BODY >>>",
      typeof config.data === "string"
        ? config.data
        : JSON.stringify(config.data)
    );
  }
  return config;
});

/** 응답 인터셉터: 에러 로깅 */
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err?.response?.status;
    const method = err?.config?.method?.toUpperCase();
    const url = `${err?.config?.baseURL}${err?.config?.url}`;
    console.log("STATUS >>>", status);
    console.log("URL    >>>", `${method} ${url}`);
    console.log("DATA   >>>", JSON.stringify(err?.response?.data));
    return Promise.reject(err);
  }
);
