"use client";

import { useState, useEffect, useCallback } from "react";
import type { User } from "@supabase/supabase-js";

interface Profile {
  id: string;
  nickname: string;
}

interface UseProfileResult {
  profile: Profile | null;
  loading: boolean;
  refetch: () => void;
}

export function useProfile(user: User | null): UseProfileResult {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(false);

  const refetch = useCallback(() => {
    if (!user) {
      setProfile(null);
      return;
    }

    setLoading(true);
    fetch("/api/profile")
      .then((res) => res.json())
      .then((data) => setProfile(data.profile ?? null))
      .catch(() => setProfile(null))
      .finally(() => setLoading(false));
  }, [user]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { profile, loading, refetch };
}
