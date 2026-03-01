"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle, Clock } from "lucide-react";
import styles from "./page.module.scss";

interface MatchHistory {
  id: string;
  verified: boolean;
  chatExpiresAt: string | null;
  createdAt: string;
  other: {
    id: string;
    nickname: string;
    gender: string;
    age: string;
  } | null;
}

export default function HistoryPage() {
  const router = useRouter();
  const [matches, setMatches] = useState<MatchHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/match/history")
      .then((res) => res.json())
      .then((data) => {
        setMatches(data.matches ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${d.getMinutes().toString().padStart(2, "0")}`;
  };

  const getGenderColor = (gender: string) => {
    return gender === "woman" || gender === "女性" ? "#ff4d6d" : "#4d9fff";
  };

  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={() => router.push("/")} aria-label="戻る">
          <ArrowLeft size={20} />
        </button>
        <h1 className={styles.title}>マッチ履歴</h1>
        <div className={styles.headerSpacer} />
      </header>

      <main className={styles.content}>
        {loading && <p className={styles.loadingText}>読み込み中...</p>}

        {!loading && matches.length === 0 && (
          <p className={styles.emptyText}>まだマッチ履歴がありません</p>
        )}

        {matches.map((match) => (
          <button
            key={match.id}
            className={styles.matchRow}
            onClick={() => router.push(`/chat/${match.id}`)}
          >
            <span
              className={styles.avatar}
              style={{ background: match.other ? getGenderColor(match.other.gender) : "#888" }}
            >
              {match.other?.nickname.charAt(0) ?? "?"}
            </span>
            <div className={styles.matchInfo}>
              <span className={styles.nickname}>{match.other?.nickname ?? "不明"}</span>
              <span className={styles.meta}>{formatDate(match.createdAt)}</span>
            </div>
            <div className={styles.statusBadge}>
              {match.verified ? (
                <span className={styles.verifiedBadge}>
                  <CheckCircle size={14} />
                  合流済
                </span>
              ) : (
                <span className={styles.pendingBadge}>
                  <Clock size={14} />
                  未確認
                </span>
              )}
            </div>
          </button>
        ))}
      </main>
    </div>
  );
}
