"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Map } from "@/components/Map/Map";
import { LoginModal } from "@/components/LoginModal/LoginModal";
import { ProfileSetup } from "@/components/ProfileSetup/ProfileSetup";
import { useLocation } from "@/hooks/useLocation";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { AdminPanel } from "@/components/Admin/AdminPanel";
import { AdminToast } from "@/components/Admin/AdminToast";
import { useDemoUsers } from "@/hooks/useDemoUsers";
import { Star } from "lucide-react";
import { Gender, Profile } from "../types/user";
import styles from "./page.module.scss";


type AppStatus = "idle" | "searching";

export default function MatchMapPage() {
  const [status, setStatus] = useState<AppStatus>("idle");
  const [searchingLabel, setSearchingLabel] = useState("マッチングを探しています");
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showProfileSetup, setShowProfileSetup] = useState(false);
  const [showAdminToast, setShowAdminToast] = useState(false);
  const [prevUser, setPrevUser] = useState<typeof user>(undefined as any);
  const router = useRouter();
  
  

  const { coordinates } = useLocation(true);
  const { user } = useAuth();
  
  const { profile, loading: profileLoading, checked, refetch: refetchProfile } = useProfile(user);
  // src/app/page.tsx の Hook 呼び出し部分
  const demoLocation = coordinates ? { lat: coordinates.latitude, lng: coordinates.longitude } : null;
  const { demoUsers, addDemoUser, removeDemoUser, counts } = useDemoUsers(demoLocation);

  // Cycling status label during search
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


  

  

  const handleGoOnline = () => {
    // 未ログイン → ログインモーダル
    if (!user) {
      setShowLoginModal(true);
      return;
    }

    // DB問い合わせ完了 + プロフィール未登録 → プロフィール登録
    if (checked && !profile) {
      setShowProfileSetup(true);
      return;
    }

    // タグ未設定
    if (!profile?.currentTag) {
      return;
    }

    setStatus("searching");
  };

  const handleLoginClose = () => {
    setShowLoginModal(false);
  };

  const handleProfileComplete = async () => {
    await refetchProfile();
    setShowProfileSetup(false);
  };

  // ログイン後、DB問い合わせ完了してプロフィールが無い場合のみ登録画面を出す
  useEffect(() => {
    if (user && checked && !profileLoading && !profile && !showLoginModal) {
      setShowProfileSetup(true);
    }
  }, [user, checked, profileLoading, profile, showLoginModal]);

  // 管理者ログイン時のアニメーション（ログインした瞬間のみ）
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
  // return のすぐ前あたり


  

  return (
    



    <div className={styles.root}>
     {/* 89行目あたりに追加 */}
      {profile?.role === "admin" && (
        <AdminPanel 
          counts={counts}
          onAdd={(gender: Gender) => addDemoUser(gender)}
          onRemove={(gender: Gender) => removeDemoUser(gender)}
  />
)}
        
      {/* ── Top bar ── */}
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

      {/* ── Map area ── */}
      <Map center={coordinates} demoUsers={demoUsers}>
        <div className={styles.mapOverlay}>
          {status === "searching" && <div className={styles.searchRing} />}
        </div>
      </Map>

      {/* ── Bottom panel ── */}
      <div className={styles.bottomPanel}>
        {/* Searching state */}
        {status === "searching" && (
          <div className={styles.searchingInfo}>
            <span className={styles.searchingDot} />
            <span key={searchingLabel} className={styles.searchingLabel}>{searchingLabel}</span>
          </div>
        )}

        {/* CTA button */}
        <button
          className={`${styles.goBtn} ${status === "searching" ? styles.goBtnActive : ""}`}
          onClick={status === "idle" ? handleGoOnline : () => setStatus("idle")}
          disabled={status === "idle" && user !== null && profile !== null && !hasTag}
        >
          {status === "idle" ? "マッチング開始" : "キャンセル"}
        </button>
      </div>


      


      
      


      

      {/* ── Modals ── */}
      <LoginModal isOpen={showLoginModal} onClose={handleLoginClose} />
      <ProfileSetup isOpen={showProfileSetup} onComplete={handleProfileComplete} />
      <AdminToast show={showAdminToast} onDone={handleAdminToastDone} />
    </div>
  );
}
