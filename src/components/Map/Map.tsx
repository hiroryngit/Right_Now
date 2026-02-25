"use client";

import { useEffect, useRef, type ReactNode } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { LocateFixed } from "lucide-react";
import styles from "./Map.module.scss";
import type { Coordinates } from "@/types";
import type { Profile } from "@/types/user";

const LAST_LOCATION_KEY = "rightnow_last_location";
const DEFAULT_CENTER: [number, number] = [139.6917, 35.6895];

function getCachedCenter(): [number, number] {
  try {
    const cached = localStorage.getItem(LAST_LOCATION_KEY);
    if (cached) {
      const { lng, lat } = JSON.parse(cached);
      return [lng, lat];
    }
  } catch {}
  return DEFAULT_CENTER;
}

function cacheCenter(lng: number, lat: number) {
  try {
    localStorage.setItem(LAST_LOCATION_KEY, JSON.stringify({ lng, lat }));
  } catch {}
}

interface MapProps {
  center: Coordinates | null;
  children?: ReactNode;
  showLocationMarker?: boolean;
  demoUsers?: Profile[];
}

export function Map({ center, children, showLocationMarker = true, demoUsers = [] }: MapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const demoMarkerRefs = useRef<Record<string, mapboxgl.Marker>>({});
  const initialCenterApplied = useRef(false);

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) return;

    mapboxgl.accessToken = token;

    const initialCenter = center
      ? [center.longitude, center.latitude] as [number, number]
      : getCachedCenter();

    if (center) {
      initialCenterApplied.current = true;
      cacheCenter(center.longitude, center.latitude);
    }

    mapRef.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: initialCenter,
      zoom: 15,
    });

    return () => {
      markerRef.current?.remove();
      markerRef.current = null;
      Object.values(demoMarkerRefs.current).forEach((m) => m.remove());
      demoMarkerRefs.current = {};
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current || !center) return;

    cacheCenter(center.longitude, center.latitude);

    if (!initialCenterApplied.current) {
      initialCenterApplied.current = true;
      mapRef.current.jumpTo({
        center: [center.longitude, center.latitude],
      });
    }
  }, [center]);

  useEffect(() => {
    if (!mapRef.current || !center || !showLocationMarker) return;

    if (!markerRef.current) {
      const el = document.createElement("div");
      el.className = styles.locationMarker;
      el.innerHTML = `
        <span class="${styles.locationPulse}"></span>
        <span class="${styles.locationDot}"></span>
      `;

      markerRef.current = new mapboxgl.Marker({ element: el })
        .setLngLat([center.longitude, center.latitude])
        .addTo(mapRef.current);
    } else {
      markerRef.current.setLngLat([center.longitude, center.latitude]);
    }
  }, [center, showLocationMarker]);

  // デモユーザーのマーカー管理
  useEffect(() => {
    if (!mapRef.current) return;

    const currentIds = new Set(demoUsers.map((u) => u.id));

    // 削除されたユーザーのマーカーを除去
    for (const id of Object.keys(demoMarkerRefs.current)) {
      if (!currentIds.has(id)) {
        demoMarkerRefs.current[id].remove();
        delete demoMarkerRefs.current[id];
      }
    }

    // 追加・更新
    for (const user of demoUsers) {
      const color = user.gender === "woman" ? "#ff4d6d" : "#4d9fff";
      const lngLat: [number, number] = [user.coordinates.lng, user.coordinates.lat];

      if (demoMarkerRefs.current[user.id]) {
        // 既存マーカーの座標を更新
        demoMarkerRefs.current[user.id].setLngLat(lngLat);
      } else {
        // 新規マーカー作成
        const el = document.createElement("div");
        el.style.cssText = `
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: ${color};
          border: 2px solid rgba(255,255,255,0.8);
          box-shadow: 0 0 8px ${color}80;
        `;

        demoMarkerRefs.current[user.id] = new mapboxgl.Marker({ element: el })
          .setLngLat(lngLat)
          .addTo(mapRef.current!);
      }
    }
  }, [demoUsers]);

  const handleRecenter = () => {
    if (!mapRef.current || !center) return;
    mapRef.current.flyTo({
      center: [center.longitude, center.latitude],
      zoom: 15,
      essential: true,
    });
  };

  return (
    <div className={styles.wrapper}>
      <div ref={mapContainer} className={styles.container} />
      {center && (
        <button
          className={styles.recenterBtn}
          onClick={handleRecenter}
          aria-label="現在地に戻る"
        >
          <LocateFixed size={20} />
        </button>
      )}
      {children && <div className={styles.overlay}>{children}</div>}
    </div>
  );
}
