"use client";

import { useState, useEffect, useCallback } from "react";
import type { User } from "@supabase/supabase-js";
// ✅ ここでインポートした Profile 型だけを使うようにします
import { Profile } from "@/types/user"; 

// ❌ 8行目〜21行目の「interface Profile { ... }」は、まるごと削除してください！

interface UseProfileResult {
  profile: Profile | null;
  loading: boolean;
  checked: boolean; 
  refetch: () => void;
}

export function useProfile(user: User | null): UseProfileResult {
  // useState の型指定も自動的に外部の Profile になります
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