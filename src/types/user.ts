// src/types/user.ts

export type Gender = 'man' | 'woman' | '男性' | '女性';
export type UserRole = 'admin' | 'user';

export interface Profile {
  id: string;
  nickname: string;
  gender: string;
  age: string;
  prefecture: string;
  city: string | null;
  occupation: string;
  role: UserRole;
  isDemo: boolean;
  currentTag: string | null;
  meetingPurpose: string | null;
  bio: string | null;
  interests: string[];
  coordinates: {
    lat: number;
    lng: number;
  };
  rating: number;       // ★ page.tsx の表示に必要
  education?: string | null; // ★ useProfile.ts にあった項目
  createdAt: any;
}