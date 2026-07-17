export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
}

export interface AuthTokensResponse {
  accessToken: string;
  user: AuthUser;
}

export interface SignupRequest {
  email: string;
  password: string;
  displayName: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface GuestUser {
  id: string;
  displayName: string;
  guest: true;
}
