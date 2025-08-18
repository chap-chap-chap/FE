import { api } from "./client";
import * as SecureStore from "expo-secure-store";

export type User = { id?: number; name?: string; email: string };


type LoginBody = { email: string; password: string };
type LoginRes = any;  

type SignupBody = { email: string; password: string; name: string };
type SignupRes = any;

export async function login(email: string, password: string): Promise<LoginRes> {
  const { data } = await api.post<LoginRes>("/auth/login", { email, password } as LoginBody);


  if (data?.accessToken) await SecureStore.setItemAsync("accessToken", String(data.accessToken));
  if (data?.refreshToken) await SecureStore.setItemAsync("refreshToken", String(data.refreshToken));

  return data;
}

export async function register(name: string, email: string, password: string): Promise<SignupRes> {
  const { data } = await api.post<SignupRes>("/auth/signup", { email, password, name } as SignupBody);
  return data;
}

export async function logout() {
  await SecureStore.deleteItemAsync("accessToken");
  await SecureStore.deleteItemAsync("refreshToken");

}
