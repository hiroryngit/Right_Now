"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TagSelector } from "@/components/TagSelector/TagSelector";
import { LoginModal } from "@/components/LoginModal/LoginModal";
import { useAuth } from "@/hooks/useAuth";
import type { PurposeTag } from "@/types";
import styles from "./page.module.scss";

export default function Home() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [isOnline, setIsOnline] = useState(false);
  const [selectedTag, setSelectedTag] = useState<PurposeTag | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);

  const handleGoOnline = () => {
    if (!selectedTag) return;

    if (!user) {
      setShowLoginModal(true);
      return;
    }

    setIsOnline(true);
    router.push("/map");
  };

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <h1 className={styles.title}>RightNow</h1>
        <p className={styles.subtitle}>
          今、この瞬間の目的が一致する人と繋がる
        </p>

        <div className={styles.section}>
          <p className={styles.label}>目的を選択</p>
          <TagSelector selected={selectedTag} onSelect={setSelectedTag} />
        </div>

        <button
          className={`${styles.button} ${selectedTag ? styles["button--ready"] : ""}`}
          onClick={handleGoOnline}
          disabled={!selectedTag || loading}
          type="button"
        >
          {isOnline ? "オンライン中" : "オンラインにする"}
        </button>
      </main>

      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
      />
    </div>
  );
}
