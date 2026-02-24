// src/types/user.ts

export type Gender = 'man' | 'woman';
export type UserRole = 'admin' | 'user';

export interface Profile {
  id: string;
  nickname: string;    // nickname に統一
  gender: string;
  age: string;
  prefecture: string;
  city: string | null;
  occupation: string;
  role: UserRole;      // これがないと page.tsx でエラーになります
  isDemo: boolean;     // これがないと page.tsx でエラーになります
  currentTag: string | null;
  meetingPurpose: string | null;
  bio: string | null;
  interests: string[];
  coordinates: {
    lat: number;
    lng: number;
  };
  createdAt: any;
}