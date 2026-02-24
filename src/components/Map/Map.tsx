"use client";

import { useEffect, useRef, type ReactNode } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import styles from "./Map.module.scss";
import type { Coordinates } from "@/types";

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
}

export function Map({ center, children, showLocationMarker = true }: MapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
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
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current || !center) return;

    cacheCenter(center.longitude, center.latitude);

    if (!initialCenterApplied.current) {
      // First time getting location — jump directly, no animation
      initialCenterApplied.current = true;
      mapRef.current.jumpTo({
        center: [center.longitude, center.latitude],
      });
    } else {
      mapRef.current.flyTo({
        center: [center.longitude, center.latitude],
        essential: true,
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

  return (
    <div className={styles.wrapper}>
      <div ref={mapContainer} className={styles.container} />
      {children && <div className={styles.overlay}>{children}</div>}
    </div>
  );
}
