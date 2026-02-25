import { User, Plus, Minus } from "lucide-react";
import styles from "./AdminPanel.module.scss";
import { Gender } from "@/types/user";

interface AdminPanelProps {
  onAdd: (gender: Gender) => void;
  onRemove: (gender: Gender) => void;
  counts: { man: number; woman: number };
}

export const AdminPanel = ({ onAdd, onRemove, counts }: AdminPanelProps) => {
  return (
    <div className={styles.panel}>
      <div className={styles.col}>
        <User size={14} color="#5b9eff" />
        <span className={styles.count}>{counts.man}</span>
        <button className={styles.btn} onClick={() => onAdd("man")}><Plus size={12} /></button>
        <button className={styles.btn} onClick={() => onRemove("man")}><Minus size={12} /></button>
      </div>
      <div className={styles.col}>
        <User size={14} color="#ff6b9d" />
        <span className={styles.count}>{counts.woman}</span>
        <button className={styles.btn} onClick={() => onAdd("woman")}><Plus size={12} /></button>
        <button className={styles.btn} onClick={() => onRemove("woman")}><Minus size={12} /></button>
      </div>
    </div>
  );
};
