"use client";

import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import styles from "./AdminToast.module.scss";

interface AdminToastProps {
  show: boolean;
  onDone: () => void;
}

export const AdminToast = ({ show, onDone }: AdminToastProps) => {
  const [phase, setPhase] = useState<"hidden" | "in" | "out">("hidden");

  useEffect(() => {
    if (!show) return;
    setPhase("in");
    const timer = setTimeout(() => setPhase("out"), 2000);
    const cleanup = setTimeout(() => {
      setPhase("hidden");
      onDone();
    }, 2400);
    return () => { clearTimeout(timer); clearTimeout(cleanup); };
  }, [show, onDone]);

  if (phase === "hidden") return null;

  return (
    <div className={`${styles.toast} ${phase === "out" ? styles.fadeOut : ""}`}>
      <ShieldCheck size={18} className={styles.icon} />
      <span className={styles.label}>Admin Mode</span>
    </div>
  );
};
