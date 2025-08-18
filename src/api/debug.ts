// src/api/debug.ts
import { api } from "./client";
export async function ping() {
  const { data } = await api.get("/ping"); // 백에 맞는 경로로 바꿔
  return data;
}
