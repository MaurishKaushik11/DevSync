import { create } from "zustand";
import {
  clearGuestAccessToken,
  configureApiClient,
  getGuestAccessToken,
  setGuestAccessToken,
} from "../services/apiClient";
import * as authService from "../services/authService";
import type { AuthUser, LoginRequest, SignupRequest } from "../types/auth";

interface GuestSession {
  accessToken: string;
  guestId: string;
  displayName: string;
  roomId: string;
  shareId: string;
}

interface AuthState {
  accessToken: string | null;
  user: AuthUser | null;
  guest: GuestSession | null;
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
  initialize: () => Promise<void>;
  login: (payload: LoginRequest) => Promise<void>;
  signup: (payload: SignupRequest) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<string | null>;
  setGuestSession: (guest: GuestSession) => void;
  clearGuestSession: () => void;
  clearError: () => void;
}

function mapError(error: unknown): string {
  if (typeof error === "object" && error !== null && "response" in error) {
    const response = (error as { response?: { data?: { message?: string } } })
      .response;
    if (response?.data?.message) return response.data.message;
  }
  if (error instanceof Error) return error.message;
  return "Something went wrong. Please try again.";
}

export const useAuthStore = create<AuthState>((set, get) => {
  const refresh = async (): Promise<string | null> => {
    try {
      const data = await authService.refresh();
      set({
        accessToken: data.accessToken,
        user: data.user,
        error: null,
      });
      return data.accessToken;
    } catch {
      set({ accessToken: null, user: null });
      return null;
    }
  };

  configureApiClient({
    getAccessToken: () => get().accessToken,
    tryRefresh: () => get().refresh(),
    onAuthFailure: () => {
      set({ accessToken: null, user: null });
    },
  });

  return {
    accessToken: null,
    user: null,
    guest: null,
    isInitialized: false,
    isLoading: false,
    error: null,

    clearError: () => set({ error: null }),

    initialize: async () => {
      if (get().isInitialized) return;
      set({ isLoading: true });
      try {
        const token = await refresh();
        if (token) {
          clearGuestAccessToken();
          set({ guest: null });
        } else {
          const guestToken = getGuestAccessToken();
          if (guestToken) {
            set({
              guest: {
                accessToken: guestToken,
                guestId: "guest",
                displayName: "Guest",
                roomId: "",
                shareId: "",
              },
            });
          }
        }
      } finally {
        set({ isInitialized: true, isLoading: false });
      }
    },

    login: async (payload) => {
      set({ isLoading: true, error: null });
      try {
        clearGuestAccessToken();
        const data = await authService.login(payload);
        set({
          accessToken: data.accessToken,
          user: data.user,
          guest: null,
          isLoading: false,
        });
      } catch (error) {
        set({ isLoading: false, error: mapError(error) });
        throw error;
      }
    },

    signup: async (payload) => {
      set({ isLoading: true, error: null });
      try {
        clearGuestAccessToken();
        const data = await authService.signup(payload);
        set({
          accessToken: data.accessToken,
          user: data.user,
          guest: null,
          isLoading: false,
        });
      } catch (error) {
        set({ isLoading: false, error: mapError(error) });
        throw error;
      }
    },

    logout: async () => {
      set({ isLoading: true, error: null });
      try {
        await authService.logout();
      } catch {
        // Still clear local session
      } finally {
        clearGuestAccessToken();
        set({
          accessToken: null,
          user: null,
          guest: null,
          isLoading: false,
        });
      }
    },

    refresh,

    setGuestSession: (guest) => {
      setGuestAccessToken(guest.accessToken);
      set({ guest, accessToken: null, user: null });
    },

    clearGuestSession: () => {
      clearGuestAccessToken();
      set({ guest: null });
    },
  };
});

export function selectIsAuthenticated(state: AuthState): boolean {
  return Boolean(state.accessToken && state.user);
}

export function selectEffectiveAccessToken(state: AuthState): string | null {
  return state.accessToken || state.guest?.accessToken || getGuestAccessToken();
}
