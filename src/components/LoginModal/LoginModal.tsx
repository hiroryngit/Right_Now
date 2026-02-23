"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import styles from "./LoginModal.module.scss";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Mode = "login" | "signup";

export function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const [mode, setMode] = useState<Mode>("login");
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

    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError("メールアドレスまたはパスワードが正しくありません");
      } else {
        onClose();
      }
    } else {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setError(error.message);
      } else {
        onClose();
      }
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
        <h2 className={styles.title}>
          {mode === "login" ? "ログイン" : "新規登録"}
        </h2>
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
            {submitting ? "..." : mode === "login" ? "ログイン" : "登録する"}
          </button>
        </form>

        <div className={styles.divider}>
          <span>または</span>
        </div>

        <button className={styles.googleBtn} type="button" onClick={handleGoogleLogin}>
          Googleでログイン
        </button>

        <p className={styles.switchMode}>
          {mode === "login" ? (
            <>アカウントをお持ちでない方は<button type="button" onClick={() => { setMode("signup"); setError(null); }}>新規登録</button></>
          ) : (
            <>アカウントをお持ちの方は<button type="button" onClick={() => { setMode("login"); setError(null); }}>ログイン</button></>
          )}
        </p>

        <button className={styles.closeButton} onClick={onClose} type="button">
          閉じる
        </button>
      </div>
    </div>
  );
}
