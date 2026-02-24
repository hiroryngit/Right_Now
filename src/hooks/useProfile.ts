"use client";

import { useState, useEffect, useCallback } from "react";
import type { User } from "@supabase/supabase-js";

interface Profile {
  id: string;
  nickname: string;
  age: string;
  prefecture: string;
  city: string | null;
  occupation: string;
  education: string | null;
  meetingPurpose: string | null;
  currentTag: string | null;
  bio: string | null;
  interests: string[];
  preferredGender: string;
}

interface UseProfileResult {
  profile: Profile | null;
  loading: boolean;
  checked: boolean; // DBへの問い合わせが完了したかどうか
  refetch: () => void;
}

export function useProfile(user: User | null): UseProfileResult {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(false);
  const [checked, setChecked] = useState(false);

  const refetch = useCallback(() => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      setChecked(false);
      return;
    }

    setLoading(true);
    setChecked(false);

    fetch("/api/profile")
      .then((res) => res.json())
      .then((data) => setProfile(data.profile ?? null))
      .catch(() => setProfile(null))
      .finally(() => {
        setLoading(false);
        setChecked(true);
      });
  }, [user]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { profile, loading, checked, refetch };
}
