import styles from "./AdminPanel.module.scss";
import { Gender } from "@/types/user";

interface AdminPanelProps {
  onAdd: (gender: Gender) => void;
  onRemove: (gender: Gender) => void;
  counts: { man: number; woman: number };
}

export const AdminPanel = ({ onAdd, onRemove, counts }: AdminPanelProps) => {
  return (
    <div className={styles.adminPanel}>
      <div className={styles.title}>ADMIN DEBUG PANEL</div>
      <div className={styles.row}>
        <span>Man: {counts.man}</span>
        <div className={styles.btns}>
          <button onClick={() => onRemove('man')}>-</button>
          <button onClick={() => onAdd('man')}>+</button>
        </div>
      </div>
      <div className={styles.row}>
        <span>Woman: {counts.woman}</span>
        <div className={styles.btns}>
          <button onClick={() => onRemove('woman')}>-</button>
          <button onClick={() => onAdd('woman')}>+</button>
        </div>
      </div>
    </div>
  );
};