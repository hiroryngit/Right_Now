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
import { Star, MapPin, History, User } from "lucide-react";
import { Gender } from "../types/user";
import styles from "./page.module.scss";

type AppStatus = "idle" | "searching" | "matched" | "waiting" | "accepted";

interface MatchOther {
  id: string;
  nickname: string;
  gender: string;
  age: string;
  isDemo: boolean;
  prefecture?: string;
  occupation?: string;
  meetingPurpose?: string | null;
  currentTag?: string | null;
  bio?: string | null;
  interests?: string[];
}


interface MatchData {
  id: string;
  status: string;
  role: "requester" | "receiver";
  expiresAt: string;
  other: MatchOther;
  distanceKm?: number | null;
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
  const [rejectedMessage, setRejectedMessage] = useState<string | null>(null);
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

  // waiting中: 相手の応答をポーリング
  useEffect(() => {
    if (status !== "waiting" || !matchData) return;

    const poll = setInterval(async () => {
      try {
        const res = await fetch("/api/match");
        if (!res.ok) return;
        const data = await res.json();

        if (!data.match || data.match.status === "EXPIRED" || data.match.status === "REJECTED") {
          const msg = data.match?.status === "REJECTED"
            ? "マッチングが拒否されました"
            : "マッチングの期限が切れました";
          setRejectedMessage(msg);
          setMatchData(null);
          setTimeout(() => {
            setRejectedMessage(null);
            setStatus("searching");
          }, 3000);
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

  // 承認/拒否ハンドラ
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
        const data = await res.json();
        if (action === "accept") {
          if (data.match.status === "ACCEPTED") {
            // receiver承認 → 即成立
            setMatchData((prev) => prev ? { ...prev, status: "ACCEPTED" } : null);
            setStatus("accepted");
          } else {
            // 承認 → 相手の応答待ち（30秒カウントダウン開始）
            setMatchData((prev) => prev ? {
              ...prev,
              expiresAt: new Date(Date.now() + 30 * 1000).toISOString(),
            } : null);
            setStatus("waiting");
          }
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

  // マッチ成立 → 即座にチャットへ遷移
  useEffect(() => {
    if (status === "accepted" && matchData) {
      router.push(`/chat/${matchData.id}`);
    }
  }, [status, matchData, router]);

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
  const otherGender = matchData?.other.gender;
  const genderColor = (otherGender === "woman" || otherGender === "女性") ? "#ff4d6d" : "#4d9fff";
  const genderLabel = (otherGender === "woman" || otherGender === "女性") ? "女性" : "男性";

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

        {/* Matched state — プロフィールカード */}
        {status === "matched" && matchData && (
          <div className={styles.profileCard}>
            <MatchTimer expiresAt={matchData.expiresAt} onExpire={handleMatchExpire} />

            {/* ヘッダー: 名前・性別・年齢 */}
            <div className={styles.profileCardHeader}>
              <span className={styles.profileCardAvatar} style={{ background: genderColor }}>
                {matchData.other.nickname.charAt(0)}
              </span>
              <div className={styles.profileCardName}>
                <span className={styles.profileCardNickname}>{matchData.other.nickname}</span>
                <span className={styles.profileCardMeta}>{genderLabel} / {matchData.other.age}</span>
              </div>
            </div>

            {/* 基本情報 */}
            <div className={styles.profileCardBody}>
              {matchData.distanceKm != null && (
                <div className={styles.profileCardRow}>
                  <span className={styles.profileCardLabel}>距離</span>
                  <span className={styles.profileCardValue}>
                    {matchData.distanceKm < 1
                      ? `${Math.round(matchData.distanceKm * 1000)}m`
                      : `${matchData.distanceKm}km`}
                  </span>
                </div>
              )}
              {matchData.other.prefecture && (
                <div className={styles.profileCardRow}>
                  <span className={styles.profileCardLabel}>居住地</span>
                  <span className={styles.profileCardValue}>{matchData.other.prefecture}</span>
                </div>
              )}
              {matchData.other.occupation && (
                <div className={styles.profileCardRow}>
                  <span className={styles.profileCardLabel}>職業</span>
                  <span className={styles.profileCardValue}>{matchData.other.occupation}</span>
                </div>
              )}
              {matchData.other.currentTag && (
                <div className={styles.profileCardRow}>
                  <span className={styles.profileCardLabel}>タグ</span>
                  <span className={styles.profileCardTag}>{matchData.other.currentTag}</span>
                </div>
              )}
              {matchData.other.meetingPurpose && (
                <div className={styles.profileCardRow}>
                  <span className={styles.profileCardLabel}>目的</span>
                  <span className={styles.profileCardValue}>{matchData.other.meetingPurpose}</span>
                </div>
              )}
              {matchData.other.interests && matchData.other.interests.length > 0 && (
                <div className={styles.profileCardRow}>
                  <span className={styles.profileCardLabel}>興味</span>
                  <div className={styles.profileCardChips}>
                    {matchData.other.interests.slice(0, 4).map((tag) => (
                      <span key={tag} className={styles.profileCardChip}>{tag}</span>
                    ))}
                    {matchData.other.interests.length > 4 && (
                      <span className={styles.profileCardChip}>+{matchData.other.interests.length - 4}</span>
                    )}
                  </div>
                </div>
              )}
              {matchData.other.bio && (
                <p className={styles.profileCardBio}>{matchData.other.bio}</p>
              )}
            </div>

            {/* アクション */}
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
          </div>
        )}

        {/* Waiting state — 相手の承認待ち */}
        {status === "waiting" && matchData && (
          <div className={styles.profileCard}>
            <MatchTimer expiresAt={matchData.expiresAt} onExpire={handleMatchExpire} />
            <div className={styles.profileCardHeader}>
              <span className={styles.profileCardAvatar} style={{ background: genderColor }}>
                {matchData.other.nickname.charAt(0)}
              </span>
              <div className={styles.profileCardName}>
                <span className={styles.profileCardNickname}>{matchData.other.nickname}</span>
                <span className={styles.profileCardMeta}>{genderLabel} / {matchData.other.age}</span>
              </div>
            </div>
            <p className={styles.matchWaiting}>相手の承認を待っています...</p>
          </div>
        )}

        {/* Rejected/Expired notification */}
        {rejectedMessage && (
          <div className={styles.rejectedNotice}>
            <p>{rejectedMessage}</p>
          </div>
        )}

        {/* Accepted state */}
        {status === "accepted" && matchData && (
          <div className={styles.profileCard}>
            <div className={styles.profileCardHeader}>
              <span className={styles.profileCardAvatar} style={{ background: genderColor }}>
                {matchData.other.nickname.charAt(0)}
              </span>
              <div className={styles.profileCardName}>
                <span className={styles.profileCardNickname}>{matchData.other.nickname}</span>
                <span className={styles.matchSuccessText}>とマッチしました！</span>
              </div>
            </div>
            <p className={styles.matchRedirect}>チャットに移動しています...</p>
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

      {/* Footer nav */}
      <nav className={styles.footerNav}>
        <button className={`${styles.navTab} ${styles.navTabActive}`}>
          <MapPin size={20} />
          <span>マップ</span>
        </button>
        <button className={styles.navTab} onClick={() => router.push("/history")}>
          <History size={20} />
          <span>履歴</span>
        </button>
        <button className={styles.navTab} onClick={() => router.push("/profile")}>
          <User size={20} />
          <span>プロフィール</span>
        </button>
      </nav>

      {/* Modals */}
      <LoginModal isOpen={showLoginModal} onClose={handleLoginClose} />
      <ProfileSetup isOpen={showProfileSetup} onComplete={handleProfileComplete} />
      <AdminToast show={showAdminToast} onDone={handleAdminToastDone} />
    </div>
  );
}
