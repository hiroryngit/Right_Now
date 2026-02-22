"use client";

import { useEffect, useState } from "react";
import styles from "./MatchTimer.module.scss";

interface MatchTimerProps {
  expiresAt: string;
  onExpire: () => void;
}

export function MatchTimer({ expiresAt, onExpire }: MatchTimerProps) {
  const [remaining, setRemaining] = useState(30);

  useEffect(() => {
    const interval = setInterval(() => {
      const diff = Math.max(
        0,
        Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 1000)
      );
      setRemaining(diff);
      if (diff <= 0) {
        clearInterval(interval);
        onExpire();
      }
    }, 100);

    return () => clearInterval(interval);
  }, [expiresAt, onExpire]);

  const progress = remaining / 30;

  return (
    <div className={styles.timer}>
      <div className={styles.timer__bar}>
        <div
          className={styles["timer__bar-fill"]}
          style={{ transform: `scaleX(${progress})` }}
        />
      </div>
      <span className={styles.timer__text}>{remaining}s</span>
    </div>
  );
}
