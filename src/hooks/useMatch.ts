"use client";

import { useState, useCallback } from "react";
import type { Match, MatchStatus } from "@/types";

interface UseMatchResult {
  match: Match | null;
  status: MatchStatus | null;
  startMatch: (match: Match) => void;
  updateStatus: (status: MatchStatus) => void;
  clearMatch: () => void;
}

export function useMatch(): UseMatchResult {
  const [match, setMatch] = useState<Match | null>(null);
  const [status, setStatus] = useState<MatchStatus | null>(null);

  const startMatch = useCallback((newMatch: Match) => {
    setMatch(newMatch);
    setStatus(newMatch.status);
  }, []);

  const updateStatus = useCallback((newStatus: MatchStatus) => {
    setStatus(newStatus);
    setMatch((prev) => (prev ? { ...prev, status: newStatus } : null));
  }, []);

  const clearMatch = useCallback(() => {
    setMatch(null);
    setStatus(null);
  }, []);

  return { match, status, startMatch, updateStatus, clearMatch };
}
