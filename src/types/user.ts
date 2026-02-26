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
  education: string | null;
  preferredGender: string;
  preferredAge: string | null;
  preferredPurpose: string | null;
  role: UserRole;      // これがないと page.tsx でエラーになります
  isDemo: boolean;     // これがないと page.tsx でエラーになります
  currentTag: string | null;
  meetingPurpose: string | null;
  bio: string | null;
  rating: number;
  interests: string[];
  coordinates: {
    lat: number;
    lng: number;
  };
  createdAt: any;
}