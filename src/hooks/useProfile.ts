"use client";

import { useState, useEffect, useCallback } from "react";
import type { User } from "@supabase/supabase-js";
import { Profile } from "@/types/user";

interface UseProfileResult {
  profile: Profile | null;
  loading: boolean;
  checked: boolean;
  refetch: () => Promise<void>;
}

export function useProfile(user: User | null): UseProfileResult {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(false);
  const [checked, setChecked] = useState(false);

  const refetch = useCallback(async () => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      setChecked(false);
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/profile");
      const data = await res.json();
      setProfile(data.profile ?? null);
    } catch {
      setProfile(null);
    } finally {
      setLoading(false);
      setChecked(true);
    }
  }, [user]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { profile, loading, checked, refetch };
}
