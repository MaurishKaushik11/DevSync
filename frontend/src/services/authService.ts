import { apiClient } from "./apiClient";
import type {
  AuthTokensResponse,
  AuthUser,
  LoginRequest,
  SignupRequest,
} from "../types/auth";

export async function signup(
  payload: SignupRequest
): Promise<AuthTokensResponse> {
  const { data } = await apiClient.post<AuthTokensResponse>(
    "/api/auth/signup",
    payload
  );
  return data;
}

export async function login(
  payload: LoginRequest
): Promise<AuthTokensResponse> {
  const { data } = await apiClient.post<AuthTokensResponse>(
    "/api/auth/login",
    payload
  );
  return data;
}

export async function refresh(): Promise<AuthTokensResponse> {
  const { data } = await apiClient.post<AuthTokensResponse>(
    "/api/auth/refresh"
  );
  return data;
}

export async function logout(): Promise<void> {
  await apiClient.post("/api/auth/logout");
}

export async function getMe(): Promise<AuthUser> {
  const { data } = await apiClient.get<AuthUser>("/api/auth/me");
  return data;
}
