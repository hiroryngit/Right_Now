"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import styles from "./LoginModal.module.scss";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const supabase = createClient();

    // まずログインを試みる
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    if (!signInError) {
      onClose();
      setSubmitting(false);
      return;
    }

    // アカウントが存在しない場合は自動でサインアップ
    if (signInError.message === "Invalid login credentials") {
      const { error: signUpError } = await supabase.auth.signUp({ email, password });
      if (signUpError) {
        setError(signUpError.message);
      } else {
        onClose();
      }
    } else {
      setError("ログインに失敗しました");
    }

    setSubmitting(false);
  };

  const handleGoogleLogin = async () => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${location.origin}/auth/callback` },
    });
  };

  return (
    <div className={styles.overlay} onClick={handleOverlayClick}>
      <div className={styles.modal}>
        <h2 className={styles.title}>ログイン</h2>
        <p className={styles.subtitle}>
          マッチングを開始するにはログインが必要です
        </p>

        <form className={styles.form} onSubmit={handleSubmit}>
          <input
            className={styles.input}
            type="email"
            placeholder="メールアドレス"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            className={styles.input}
            type="password"
            placeholder="パスワード"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
          {error && <p className={styles.error}>{error}</p>}
          <button className={styles.submitBtn} type="submit" disabled={submitting}>
            {submitting ? "..." : "ログイン"}
          </button>
        </form>

        <div className={styles.divider}>
          <span>または</span>
        </div>

        <button className={styles.googleBtn} type="button" onClick={handleGoogleLogin}>
          Googleでログイン
        </button>

        <button className={styles.closeButton} onClick={onClose} type="button">
          閉じる
        </button>
      </div>
    </div>
  );
}
