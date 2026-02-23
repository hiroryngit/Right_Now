"use client";

import { useState, useEffect, useRef } from "react";
import styles from "./page.module.scss";

// ── Types ──────────────────────────────────────────────────────────────────────
type AppStatus = "idle" | "online" | "searching" | "matched" | "meeting";

interface NearbyUser {
  id: string;
  x: number; // % position on map
  y: number;
  purpose: string;
  distanceM: number;
  isHot?: boolean;
}

// ── Mock data ──────────────────────────────────────────────────────────────────
const PURPOSES = ["ランチ", "コーヒー", "散歩", "勉強", "雑談"];

const MOCK_USERS: NearbyUser[] = [
  { id: "u1", x: 38, y: 52, purpose: "ランチ",   distanceM: 120, isHot: true },
  { id: "u2", x: 52, y: 58, purpose: "コーヒー", distanceM: 340 },
  { id: "u3", x: 44, y: 65, purpose: "ランチ",   distanceM: 560, isHot: true },
  { id: "u4", x: 60, y: 45, purpose: "散歩",     distanceM: 780 },
  { id: "u5", x: 35, y: 70, purpose: "雑談",     distanceM: 890 },
];

// ── Component ──────────────────────────────────────────────────────────────────
export default function MatchMapPage() {
  const [status, setStatus]           = useState<AppStatus>("idle");
  const [selectedPurpose, setSelectedPurpose] = useState<string | null>(null);
  const [countdown, setCountdown]     = useState<number | null>(null);
  const [matchedUser, setMatchedUser] = useState<NearbyUser | null>(null);
  const [elapsed, setElapsed]         = useState(0); // seconds after match
  const [earnings, setEarnings]       = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Countdown to match
  useEffect(() => {
    if (status !== "searching") return;
    setCountdown(30);
    const interval = setInterval(() => {
      setCountdown((c) => {
        if (c === null || c <= 1) {
          clearInterval(interval);
          // simulate match
          const target = MOCK_USERS.find((u) => u.purpose === selectedPurpose) ?? MOCK_USERS[0];
          setMatchedUser(target);
          setStatus("matched");
          return null;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [status, selectedPurpose]);

  // Meeting timer (max 30min)
  useEffect(() => {
    if (status !== "meeting") return;
    setElapsed(0);
    const interval = setInterval(() => {
      setElapsed((e) => {
        if (e >= 1800) { clearInterval(interval); handleEndMeeting(); return e; }
        return e + 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [status]);

  const handleGoOnline = () => {
    if (!selectedPurpose) return;
    setStatus("searching");
    setEarnings(0);
  };

  const handleAcceptMatch = () => setStatus("meeting");

  const handleEndMeeting = () => {
    setStatus("idle");
    setMatchedUser(null);
    setElapsed(0);
    setCountdown(null);
    setEarnings((e) => e + 500); // mock reward
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60).toString().padStart(2, "0");
    const s = (sec % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const isOnline = status !== "idle";

  return (
    <div className={styles.root}>
      {/* ── Top bar ── */}
      <header className={styles.topBar}>
        <button className={styles.homeBtn} aria-label="ホーム">
          <span className={styles.homeBtnIcon}>⌂</span>
        </button>

        <div className={styles.earningsBadge}>
          <span className={styles.earningsSymbol}>¥</span>
          <span className={styles.earningsValue}>{earnings.toLocaleString()}</span>
        </div>

        <div className={styles.topRight}>
          <span className={styles.timeLabel}>{new Date().toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}</span>
        </div>
      </header>

      <p className={styles.dateLabel}>今日</p>

      {/* ── Map area ── */}
      <div className={styles.mapWrapper}>
        {/* Heatmap blob */}
        <div className={styles.heatBlob} />

        {/* Nearby user dots */}
        {isOnline && MOCK_USERS.map((u) => (
          <div
            key={u.id}
            className={`${styles.userDot} ${u.isHot ? styles.userDotHot : ""} ${matchedUser?.id === u.id ? styles.userDotMatched : ""}`}
            style={{ left: `${u.x}%`, top: `${u.y}%` }}
            title={`${u.purpose} · ${u.distanceM}m`}
          >
            <span className={styles.userDotIcon}>🍽</span>
          </div>
        ))}

        {/* Self marker */}
        <div className={styles.selfMarker}>
          <div className={styles.selfPulse} />
          <div className={styles.selfDot}>▲</div>
        </div>

        {/* Searching ring */}
        {status === "searching" && <div className={styles.searchRing} />}

        {/* Match beam */}
        {status === "matched" && matchedUser && (
          <div
            className={styles.matchBeam}
            style={{ left: `${matchedUser.x}%`, top: `${matchedUser.y}%` }}
          />
        )}
      </div>

      {/* ── Bottom panel ── */}
      <div className={styles.bottomPanel}>

        {/* Purpose selector – shown when idle */}
        {status === "idle" && (
          <div className={styles.purposeRow}>
            {PURPOSES.map((p) => (
              <button
                key={p}
                className={`${styles.purposeChip} ${selectedPurpose === p ? styles.purposeChipActive : ""}`}
                onClick={() => setSelectedPurpose(p)}
              >
                {p}
              </button>
            ))}
          </div>
        )}

        {/* Searching state */}
        {status === "searching" && (
          <div className={styles.searchingInfo}>
            <span className={styles.searchingLabel}>マッチング中</span>
            <span className={styles.countdownBadge}>{countdown}s</span>
          </div>
        )}

        {/* Matched state */}
        {status === "matched" && matchedUser && (
          <div className={styles.matchCard}>
            <div className={styles.matchCardHeader}>
              <span className={styles.matchFlash}>⚡</span>
              <span className={styles.matchTitle}>マッチング成立！</span>
            </div>
            <p className={styles.matchSub}>{matchedUser.purpose} · {matchedUser.distanceM}m先</p>
            <div className={styles.matchActions}>
              <button className={styles.acceptBtn} onClick={handleAcceptMatch}>合流する</button>
              <button className={styles.declineBtn} onClick={() => setStatus("idle")}>キャンセル</button>
            </div>
          </div>
        )}

        {/* Meeting state */}
        {status === "meeting" && (
          <div className={styles.meetingCard}>
            <div className={styles.meetingTimer}>{formatTime(1800 - elapsed)}</div>
            <p className={styles.meetingLabel}>合流中 – セッション残り時間</p>
            <button className={styles.endBtn} onClick={handleEndMeeting}>終了する</button>
          </div>
        )}

        {/* CTA button */}
        {(status === "idle" || status === "searching") && (
          <button
            className={`${styles.goBtn} ${status === "searching" ? styles.goBtnActive : ""}`}
            onClick={status === "idle" ? handleGoOnline : () => setStatus("idle")}
            disabled={status === "idle" && !selectedPurpose}
          >
            {status === "idle" ? "出発" : "キャンセル"}
          </button>
        )}
      </div>

      {/* ── Bottom nav ── */}
      <nav className={styles.bottomNav}>
        <button className={styles.navItem} aria-label="シールド">🛡</button>
        <button className={styles.navItem} aria-label="グラフ">📊</button>
      </nav>
    </div>
  );
}
