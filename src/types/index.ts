export interface Coordinates {
  latitude: number;
  longitude: number;
}

export type MatchStatus = "PENDING" | "ACCEPTED" | "REJECTED" | "EXPIRED";

export interface Profile {
  id: string;
  nickname: string;
  gender: 'man' | 'woman';
  isDemo: boolean;        // デモユーザー判定
  isOnline: boolean;
  role: 'admin' | 'user'; // 管理者権限
  currentTag?: string | null;
  lastLocation: Coordinates | null;
  rating: number;
  createdAt: string;
  coordinates: { lat: number; lng: number };
  updatedAt: string;
}

export interface Match {
  id: string;
  requesterId: string;
  receiverId: string;
  status: MatchStatus;
  expiresAt: string;
  createdAt: string;
}

export type PurposeTag = "work" | "lunch" | "walk" | "cafe" | "exercise";
