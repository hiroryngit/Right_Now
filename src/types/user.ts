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
  rating: number;
  education?: string | null;
  preferredGender?: string;
  preferredAge?: string | null;
  preferredPurpose?: string | null;
  preferredDistance?: number | null;
  createdAt: any;
}