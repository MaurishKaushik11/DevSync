import axios, {
  AxiosError,
  AxiosInstance,
  InternalAxiosRequestConfig,
} from "axios";
import { getBackendUrl, getGithubOAuthUrl } from "../config/env";

const GUEST_TOKEN_KEY = "devsync_guest_access_token";

type TokenGetter = () => string | null;
type RefreshFn = () => Promise<string | null>;

let getAccessToken: TokenGetter = () => null;
let tryRefresh: RefreshFn = async () => null;
let onAuthFailure: () => void = () => {};

export function configureApiClient(options: {
  getAccessToken: TokenGetter;
  tryRefresh: RefreshFn;
  onAuthFailure?: () => void;
}): void {
  getAccessToken = options.getAccessToken;
  tryRefresh = options.tryRefresh;
  onAuthFailure = options.onAuthFailure ?? (() => {});
}

export function getGuestAccessToken(): string | null {
  try {
    return sessionStorage.getItem(GUEST_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setGuestAccessToken(token: string | null): void {
  try {
    if (token) {
      sessionStorage.setItem(GUEST_TOKEN_KEY, token);
    } else {
      sessionStorage.removeItem(GUEST_TOKEN_KEY);
    }
  } catch {
    // sessionStorage may be unavailable
  }
}

export function clearGuestAccessToken(): void {
  setGuestAccessToken(null);
}

export const apiClient: AxiosInstance = axios.create({
  baseURL: "",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  config.baseURL = getBackendUrl();
  const token = getAccessToken() || getGuestAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshPromise: Promise<string | null> | null = null;

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as
      | (InternalAxiosRequestConfig & { _retry?: boolean })
      | undefined;

    if (!original || error.response?.status !== 401 || original._retry) {
      return Promise.reject(error);
    }

    const url = original.url ?? "";
    if (
      url.includes("/api/auth/login") ||
      url.includes("/api/auth/signup") ||
      url.includes("/api/auth/refresh") ||
      url.includes("/api/auth/logout")
    ) {
      return Promise.reject(error);
    }

    if (!getAccessToken() && getGuestAccessToken()) {
      return Promise.reject(error);
    }

    original._retry = true;

    try {
      if (!refreshPromise) {
        refreshPromise = tryRefresh().finally(() => {
          refreshPromise = null;
        });
      }
      const newToken = await refreshPromise;
      if (!newToken) {
        onAuthFailure();
        return Promise.reject(error);
      }
      original.headers.Authorization = `Bearer ${newToken}`;
      return apiClient(original);
    } catch (refreshError) {
      onAuthFailure();
      return Promise.reject(refreshError);
    }
  }
);

export { getBackendUrl, getGithubOAuthUrl };
