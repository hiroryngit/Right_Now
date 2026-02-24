"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { LoginModal } from "@/components/LoginModal/LoginModal";
import { createClient } from "@/lib/supabase/client";
import styles from "./page.module.scss";

export default function ProfilePage() {
  const [showLoginModal, setShowLoginModal] = useState(false);
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading, checked } = useProfile(user);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  };

  if (authLoading || profileLoading || (user && !checked)) {
    return (
      <div className={styles.page}>
        <div className={styles.loading}>読み込み中...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <p className={styles.emptyMessage}>ログインしていません</p>
          <button className={styles.backBtn} onClick={() => setShowLoginModal(true)}>
            ログイン
          </button>
          <button className={styles.logoutBtn} onClick={() => router.push("/")}>
            マップに戻る
          </button>
          <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <p className={styles.emptyMessage}>プロフィールが登録されていません</p>
          <button className={styles.backBtn} onClick={() => router.push("/")}>
            マップに戻る
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <h1 className={styles.title}>プロフィール</h1>
        </header>

        {/* 基本情報 */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>基本情報</h2>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>ニックネーム</span>
            <span className={styles.fieldValue}>{profile.nickname}</span>
          </div>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>年齢</span>
            <span className={styles.fieldValue}>{profile.age}</span>
          </div>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>居住地</span>
            <span className={styles.fieldValue}>
              {profile.prefecture}{profile.city ? ` ${profile.city}` : ""}
            </span>
          </div>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>職業</span>
            <span className={styles.fieldValue}>{profile.occupation}</span>
          </div>
          {profile.education && (
            <div className={styles.field}>
              <span className={styles.fieldLabel}>学歴</span>
              <span className={styles.fieldValue}>{profile.education}</span>
            </div>
          )}
        </div>

        {/* マッチング */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>マッチング</h2>
          {profile.currentTag && (
            <div className={styles.field}>
              <span className={styles.fieldLabel}>マッチングタグ</span>
              <span className={styles.tag}>{profile.currentTag}</span>
            </div>
          )}
          {profile.meetingPurpose && (
            <div className={styles.field}>
              <span className={styles.fieldLabel}>出会う目的</span>
              <span className={styles.fieldValue}>{profile.meetingPurpose}</span>
            </div>
          )}
        </div>

        {/* 自己紹介 */}
        {profile.bio && (
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>自己紹介</h2>
            <p className={styles.bio}>{profile.bio}</p>
          </div>
        )}

        {/* 興味あること */}
        {profile.interests && profile.interests.length > 0 && (
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>興味あること</h2>
            <div className={styles.chipGrid}>
              {profile.interests.map((interest: string) => (
                <span key={interest} className={styles.chip}>{interest}</span>
              ))}
            </div>
          </div>
        )}

        {/* 非公開設定 */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>非公開設定</h2>
          <p className={styles.privateNote}>この情報は他のユーザーには表示されません</p>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>相手の性別</span>
            <span className={styles.fieldValue}>{profile.preferredGender}</span>
          </div>
        </div>

        {/* アクション */}
        <div className={styles.actions}>
          <button className={styles.backBtn} onClick={() => router.push("/")}>
            マップに戻る
          </button>
          <button className={styles.logoutBtn} onClick={handleLogout}>
            ログアウト
          </button>
        </div>
      </div>
    </div>
  );
}
