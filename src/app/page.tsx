"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Map } from "@/components/Map/Map";
import { LoginModal } from "@/components/LoginModal/LoginModal";
import { ProfileSetup } from "@/components/ProfileSetup/ProfileSetup";
import { MatchTimer } from "@/components/MatchTimer/MatchTimer";
import { useLocation } from "@/hooks/useLocation";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { AdminPanel } from "@/components/Admin/AdminPanel";
import { AdminToast } from "@/components/Admin/AdminToast";
import { useDemoUsers } from "@/hooks/useDemoUsers";
import { Star } from "lucide-react";
import { Gender } from "../types/user";
import styles from "./page.module.scss";

type AppStatus = "idle" | "searching" | "matched" | "accepted";

interface MatchData {
  id: string;
  status: string;
  role: "requester" | "receiver";
  expiresAt: string;
  other: {
    id: string;
    nickname: string;
    gender: string;
    age: string;
    isDemo: boolean;
  };
}

export default function MatchMapPage() {
  const [status, setStatus] = useState<AppStatus>("idle");
  const [searchingLabel, setSearchingLabel] = useState("マッチングを探しています");
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showProfileSetup, setShowProfileSetup] = useState(false);
  const [showAdminToast, setShowAdminToast] = useState(false);
  const [prevUser, setPrevUser] = useState<typeof user>(undefined as any);
  const [matchData, setMatchData] = useState<MatchData | null>(null);
  const [responding, setResponding] = useState(false);
  const searchIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const router = useRouter();

  const { coordinates } = useLocation(true);
  const { user } = useAuth();
  const { profile, loading: profileLoading, checked, refetch: refetchProfile } = useProfile(user);
  const demoLocation = coordinates ? { lat: coordinates.latitude, lng: coordinates.longitude } : null;
  const { demoUsers, addDemoUser, removeDemoUser, counts } = useDemoUsers(demoLocation);

  // searching中のラベル切り替え
  useEffect(() => {
    if (status !== "searching") return;
    setSearchingLabel("マッチングを探しています");
    const labels = ["マッチングを探しています", "オンラインです"];
    let index = 0;
    const interval = setInterval(() => {
      index = (index + 1) % labels.length;
      setSearchingLabel(labels[index]);
    }, 3000);
    return () => clearInterval(interval);
  }, [status]);

  // searching中: 定期的にマッチングを試行 + 受信チェック
  useEffect(() => {
    if (status !== "searching") {
      if (searchIntervalRef.current) {
        clearInterval(searchIntervalRef.current);
        searchIntervalRef.current = null;
      }
      return;
    }

    const tryMatch = async () => {
      try {
        // まず受信チェック（相手からのマッチリクエストがあるか）
        const getRes = await fetch("/api/match");
        if (getRes.ok) {
          const getData = await getRes.json();
          if (getData.match && getData.match.status === "PENDING") {
            setMatchData(getData.match);
            setStatus("matched");
            return;
          }
        }

        // なければ自分からマッチング試行
        const postRes = await fetch("/api/match", { method: "POST" });
        if (postRes.ok) {
          const postData = await postRes.json();
          if (postData.match) {
            setMatchData(postData.match);
            setStatus("matched");
          }
        }
      } catch {
        // ネットワークエラーは無視
      }
    };

    // 即時実行 + 5秒間隔
    tryMatch();
    searchIntervalRef.current = setInterval(tryMatch, 5000);

    return () => {
      if (searchIntervalRef.current) {
        clearInterval(searchIntervalRef.current);
        searchIntervalRef.current = null;
      }
    };
  }, [status]);

  // matched中: requesterの場合、相手の応答をポーリング
  useEffect(() => {
    if (status !== "matched" || !matchData || matchData.role !== "requester") return;

    const poll = setInterval(async () => {
      try {
        const res = await fetch("/api/match");
        if (!res.ok) return;
        const data = await res.json();

        if (!data.match || data.match.status === "EXPIRED" || data.match.status === "REJECTED") {
          setMatchData(null);
          setStatus("searching");
          return;
        }
        if (data.match.status === "ACCEPTED") {
          setMatchData(data.match);
          setStatus("accepted");
          return;
        }
      } catch {
        // ignore
      }
    }, 2000);

    return () => clearInterval(poll);
  }, [status, matchData]);

  // 承認/拒否ハンドラ（receiver用）
  const handleRespond = async (action: "accept" | "reject") => {
    if (!matchData) return;
    setResponding(true);
    try {
      const res = await fetch("/api/match/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId: matchData.id, action }),
      });
      if (res.ok) {
        if (action === "accept") {
          setMatchData((prev) => prev ? { ...prev, status: "ACCEPTED" } : null);
          setStatus("accepted");
        } else {
          setMatchData(null);
          setStatus("searching");
        }
      }
    } catch {
      // ignore
    } finally {
      setResponding(false);
    }
  };

  // タイマー期限切れハンドラ
  const handleMatchExpire = useCallback(() => {
    setMatchData(null);
    setStatus("searching");
  }, []);

  // マッチ成立画面を閉じる
  const handleDismissAccepted = useCallback(() => {
    setMatchData(null);
    setStatus("idle");
  }, []);

  const handleGoOnline = () => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }
    if (checked && !profile) {
      setShowProfileSetup(true);
      return;
    }
    if (!profile?.currentTag) {
      return;
    }
    setStatus("searching");
  };

  const handleCancel = () => {
    setMatchData(null);
    setStatus("idle");
  };

  const handleLoginClose = () => {
    setShowLoginModal(false);
  };

  const handleProfileComplete = async () => {
    await refetchProfile();
    setShowProfileSetup(false);
  };

  useEffect(() => {
    if (user && checked && !profileLoading && !profile && !showLoginModal) {
      setShowProfileSetup(true);
    }
  }, [user, checked, profileLoading, profile, showLoginModal]);

  useEffect(() => {
    const justLoggedIn = !prevUser && user;
    setPrevUser(user);
    if (justLoggedIn && profile?.role === "admin") {
      setShowAdminToast(true);
    }
  }, [user, profile, prevUser]);

  const handleAdminToastDone = useCallback(() => {
    setShowAdminToast(false);
  }, []);

  const hasTag = !!profile?.currentTag;
  const genderColor = matchData?.other.gender === "woman" ? "#ff4d6d" : "#4d9fff";

  return (
    <div className={styles.root}>
      {profile?.role === "admin" && (
        <AdminPanel
          counts={counts}
          onAdd={(gender: Gender) => addDemoUser(gender)}
          onRemove={(gender: Gender) => removeDemoUser(gender)}
        />
      )}

      {/* Top bar */}
      <header className={styles.topBar}>
        <button className={styles.homeBtn} aria-label="プロフィール" onClick={() => router.push("/profile")}>
          <span className={styles.homeBtnIcon}>⌂</span>
        </button>
        {profile && (
          <div className={styles.starRating}>
            <span className={styles.ratingValue}>{profile.rating.toFixed(1)}</span>
            <div className={styles.stars}>
              {[1, 2, 3, 4, 5].map((i) => (
                <Star
                  key={i}
                  size={14}
                  className={i <= Math.round(profile.rating) ? styles.starFilled : styles.starEmpty}
                  fill={i <= Math.round(profile.rating) ? "currentColor" : "none"}
                  strokeWidth={i <= Math.round(profile.rating) ? 0 : 1.5}
                />
              ))}
            </div>
          </div>
        )}
        <div className={styles.topBarSpacer} />
      </header>

      {/* Map */}
      <Map center={coordinates} demoUsers={demoUsers}>
        <div className={styles.mapOverlay}>
          {status === "searching" && <div className={styles.searchRing} />}
        </div>
      </Map>

      {/* Bottom panel */}
      <div className={styles.bottomPanel}>
        {/* Searching state */}
        {status === "searching" && (
          <div className={styles.searchingInfo}>
            <span className={styles.searchingDot} />
            <span key={searchingLabel} className={styles.searchingLabel}>{searchingLabel}</span>
          </div>
        )}

        {/* Matched state */}
        {status === "matched" && matchData && (
          <div className={styles.matchCard}>
            <MatchTimer expiresAt={matchData.expiresAt} onExpire={handleMatchExpire} />
            <div className={styles.matchInfo}>
              <span className={styles.matchDot} style={{ background: genderColor }} />
              <span className={styles.matchNickname}>{matchData.other.nickname}</span>
              <span className={styles.matchAge}>{matchData.other.age}</span>
            </div>
            {matchData.role === "receiver" ? (
              <div className={styles.matchActions}>
                <button
                  className={styles.acceptBtn}
                  onClick={() => handleRespond("accept")}
                  disabled={responding}
                >
                  承認
                </button>
                <button
                  className={styles.rejectBtn}
                  onClick={() => handleRespond("reject")}
                  disabled={responding}
                >
                  拒否
                </button>
              </div>
            ) : (
              <p className={styles.matchWaiting}>相手の応答を待っています...</p>
            )}
          </div>
        )}

        {/* Accepted state */}
        {status === "accepted" && matchData && (
          <div className={styles.matchCard}>
            <div className={styles.matchSuccess}>
              <span className={styles.matchDot} style={{ background: genderColor }} />
              <span className={styles.matchNickname}>{matchData.other.nickname}</span>
              <span className={styles.matchSuccessText}>とマッチしました！</span>
            </div>
            <button className={styles.dismissBtn} onClick={handleDismissAccepted}>
              閉じる
            </button>
          </div>
        )}

        {/* CTA button */}
        {(status === "idle" || status === "searching") && (
          <button
            className={`${styles.goBtn} ${status === "searching" ? styles.goBtnActive : ""}`}
            onClick={status === "idle" ? handleGoOnline : handleCancel}
            disabled={status === "idle" && user !== null && profile !== null && !hasTag}
          >
            {status === "idle" ? "マッチング開始" : "キャンセル"}
          </button>
        )}
      </div>

      {/* Modals */}
      <LoginModal isOpen={showLoginModal} onClose={handleLoginClose} />
      <ProfileSetup isOpen={showProfileSetup} onComplete={handleProfileComplete} />
      <AdminToast show={showAdminToast} onDone={handleAdminToastDone} />
    </div>
  );
}
