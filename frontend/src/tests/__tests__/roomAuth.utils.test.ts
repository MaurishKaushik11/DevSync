import {
  clearGuestAccessToken,
  getGuestAccessToken,
  setGuestAccessToken,
} from "../../services/apiClient";
import { canEditRole } from "../../types/room";
import { buildJoinShareLink } from "../../services/roomService";

describe("canEditRole", () => {
  it("allows HOST and EDITOR", () => {
    expect(canEditRole("HOST")).toBe(true);
    expect(canEditRole("EDITOR")).toBe(true);
  });

  it("denies VIEWER and empty", () => {
    expect(canEditRole("VIEWER")).toBe(false);
    expect(canEditRole(null)).toBe(false);
    expect(canEditRole(undefined)).toBe(false);
  });
});

describe("guest token sessionStorage", () => {
  const generatedValue = () => `${Date.now()}-${Math.random()}`;

  beforeEach(() => {
    clearGuestAccessToken();
  });

  afterEach(() => {
    clearGuestAccessToken();
  });

  it("stores guest token in sessionStorage only", () => {
    const accessToken = generatedValue();
    setGuestAccessToken(accessToken);
    expect(getGuestAccessToken()).toBe(accessToken);
    expect(sessionStorage.getItem("devsync_guest_access_token")).toBe(
      accessToken
    );
    expect(localStorage.getItem("devsync_guest_access_token")).toBeNull();
  });

  it("clears guest token", () => {
    setGuestAccessToken(generatedValue());
    clearGuestAccessToken();
    expect(getGuestAccessToken()).toBeNull();
  });
});

describe("buildJoinShareLink", () => {
  it("builds /join/{shareId} path", () => {
    const link = buildJoinShareLink("abc-share");
    expect(link).toContain("/join/abc-share");
  });
});
