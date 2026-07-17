/**
 * Auth store + API refresh behavior tests.
 * Uses mocked authService to avoid real network.
 */
import { act } from "@testing-library/react";

jest.mock("../../services/authService", () => ({
  login: jest.fn(),
  signup: jest.fn(),
  logout: jest.fn(),
  refresh: jest.fn(),
  getMe: jest.fn(),
}));

import * as authService from "../../services/authService";
import { useAuthStore } from "../../store/useAuthStore";
import { clearGuestAccessToken } from "../../services/apiClient";

const mockedRefresh = authService.refresh as jest.MockedFunction<
  typeof authService.refresh
>;
const mockedLogin = authService.login as jest.MockedFunction<
  typeof authService.login
>;
const mockedLogout = authService.logout as jest.MockedFunction<
  typeof authService.logout
>;
const generatedValue = () => `${Date.now()}-${Math.random()}`;

describe("useAuthStore", () => {
  beforeEach(() => {
    clearGuestAccessToken();
    useAuthStore.setState({
      accessToken: null,
      user: null,
      guest: null,
      isInitialized: false,
      isLoading: false,
      error: null,
    });
    jest.clearAllMocks();
  });

  it("keeps access token in memory after login (not localStorage)", async () => {
    const accessToken = generatedValue();
    const password = `${generatedValue()}Aa1!`;
    mockedLogin.mockResolvedValue({
      accessToken,
      user: {
        id: "u1",
        email: "a@b.com",
        displayName: "Alex",
      },
    });

    await act(async () => {
      await useAuthStore.getState().login({
        email: "a@b.com",
        password,
      });
    });

    const state = useAuthStore.getState();
    expect(state.accessToken).toBe(accessToken);
    expect(state.user?.displayName).toBe("Alex");
    expect(localStorage.getItem("accessToken")).toBeNull();
    expect(sessionStorage.getItem("accessToken")).toBeNull();
  });

  it("refresh updates in-memory access token", async () => {
    const accessToken = generatedValue();
    mockedRefresh.mockResolvedValue({
      accessToken,
      user: { id: "u1", email: "a@b.com", displayName: "Alex" },
    });

    const token = await useAuthStore.getState().refresh();
    expect(token).toBe(accessToken);
    expect(useAuthStore.getState().accessToken).toBe(accessToken);
  });

  it("refresh failure clears account session", async () => {
    useAuthStore.setState({
      accessToken: generatedValue(),
      user: { id: "u1", email: "a@b.com", displayName: "Alex" },
    });
    mockedRefresh.mockRejectedValue(new Error("unauthorized"));

    const token = await useAuthStore.getState().refresh();
    expect(token).toBeNull();
    expect(useAuthStore.getState().accessToken).toBeNull();
    expect(useAuthStore.getState().user).toBeNull();
  });

  it("logout clears session", async () => {
    useAuthStore.setState({
      accessToken: generatedValue(),
      user: { id: "u1", email: "a@b.com", displayName: "Alex" },
    });
    mockedLogout.mockResolvedValue(undefined);

    await act(async () => {
      await useAuthStore.getState().logout();
    });

    expect(useAuthStore.getState().accessToken).toBeNull();
    expect(useAuthStore.getState().user).toBeNull();
  });

  it("setGuestSession stores token in sessionStorage", () => {
    const accessToken = generatedValue();
    useAuthStore.getState().setGuestSession({
      accessToken,
      guestId: "g1",
      displayName: "Pat",
      roomId: "r1",
      shareId: "s1",
    });

    expect(useAuthStore.getState().guest?.displayName).toBe("Pat");
    expect(sessionStorage.getItem("devsync_guest_access_token")).toBe(
      accessToken
    );
    expect(localStorage.getItem("devsync_guest_access_token")).toBeNull();
  });
});
