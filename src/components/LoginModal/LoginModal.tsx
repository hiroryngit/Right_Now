"use client";

import { useRouter } from "next/navigation";
import styles from "./LoginModal.module.scss";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const router = useRouter();

  if (!isOpen) return null;

  const handleLogin = () => {
    router.push("/login");
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className={styles.overlay} onClick={handleOverlayClick}>
      <div className={styles.modal}>
        <p className={styles.message}>ログインしてください</p>
        <button
          className={styles.loginButton}
          onClick={handleLogin}
          type="button"
        >
          ログインページへ
        </button>
        <button
          className={styles.closeButton}
          onClick={onClose}
          type="button"
        >
          閉じる
        </button>
      </div>
    </div>
  );
}
