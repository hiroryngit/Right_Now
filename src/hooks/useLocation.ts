"use client";

import { useState, useEffect, useCallback } from "react";
import type { Coordinates } from "@/types";

interface UseLocationResult {
  coordinates: Coordinates | null;
  error: string | null;
  isWatching: boolean;
}

export function useLocation(active: boolean): UseLocationResult {
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isWatching, setIsWatching] = useState(false);

  const handleSuccess = useCallback((position: GeolocationPosition) => {
    setCoordinates({
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    });
    setError(null);
  }, []);

  const handleError = useCallback((err: GeolocationPositionError) => {
    setError(err.message);
  }, []);

  useEffect(() => {
    if (!active || !navigator.geolocation) {
      setIsWatching(false);
      return;
    }

    const watchId = navigator.geolocation.watchPosition(handleSuccess, handleError, {
      enableHighAccuracy: true,
      maximumAge: 5000,
      timeout: 10000,
    });

    setIsWatching(true);

    return () => {
      navigator.geolocation.clearWatch(watchId);
      setIsWatching(false);
    };
  }, [active, handleSuccess, handleError]);

  return { coordinates, error, isWatching };
}
