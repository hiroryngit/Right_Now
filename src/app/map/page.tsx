"use client";

import { Map } from "@/components/Map/Map";
import { useLocation } from "@/hooks/useLocation";
import styles from "./page.module.scss";

export default function MapPage() {
  const { coordinates, error } = useLocation(true);

  return (
    <div className={styles.page}>
      {error && <div className={styles.error}>{error}</div>}
      <Map center={coordinates} />
    </div>
  );
}
