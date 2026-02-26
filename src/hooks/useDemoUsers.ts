"use client";

import { useState, useEffect, useRef } from "react";
import { Gender, Profile } from "@/types/user";

interface MapUserCoords {
  id: string;
  nickname: string;
  gender: string;
  is_demo: boolean;
  lat: number;
  lng: number;
}

export const useDemoUsers = (currentLocation: { lat: number; lng: number } | null) => {
  const [demoUsers, setDemoUsers] = useState<Profile[]>([]);
  const counterRef = useRef<Record<Gender, number>>({ man: 0, woman: 0 });
  const loadedRef = useRef(false);

  // 位置情報を持つ全ユーザーをDBから読み込む
  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;

    fetch("/api/map-users")
      .then((res) => res.json())
      .then((data) => {
        const users: MapUserCoords[] = data.users || [];
        const profiles: Profile[] = users.map((u) => ({
          id: u.id,
          nickname: u.nickname,
          gender: u.gender,
          age: "20代",
          prefecture: "東京都",
          city: null,
          occupation: "会社員",
          education: null,
          preferredGender: "both",
          role: "user" as const,
          isDemo: u.is_demo,
          currentTag: null,
          meetingPurpose: null,
          bio: null,
          rating: 5.0,
          interests: [],
          coordinates: { lat: u.lat, lng: u.lng },
          createdAt: new Date(),
        }));

        // デモユーザーのカウンターを復元
        for (const p of profiles) {
          if (!p.isDemo) continue;
          if (p.gender === "man") counterRef.current.man++;
          if (p.gender === "woman") counterRef.current.woman++;
        }

        setDemoUsers(profiles);
      })
      .catch(() => {});
  }, []);

  // ログインユーザーの位置情報をDBに送信
  useEffect(() => {
    if (!currentLocation) return;

    fetch("/api/location", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lat: currentLocation.lat, lng: currentLocation.lng }),
    }).catch(() => {});
  }, [currentLocation]);

  // ランダムウォーク（デモユーザーのみ）
  useEffect(() => {
    if (demoUsers.length === 0) return;

    const interval = setInterval(() => {
      setDemoUsers((prev) =>
        prev.map((u) =>
          u.isDemo
            ? {
                ...u,
                coordinates: {
                  lat: u.coordinates.lat + (Math.random() - 0.5) * 0.001,
                  lng: u.coordinates.lng + (Math.random() - 0.5) * 0.001,
                },
              }
            : u
        )
      );
    }, 2000);

    return () => clearInterval(interval);
  }, [demoUsers.length]);

  const addDemoUser = (gender: Gender) => {
    if (!currentLocation) return;

    counterRef.current[gender] += 1;
    const name = `${gender}${counterRef.current[gender]}`;

    const purposes = ["友達作り", "飲みに行きたい", "趣味友募集", "暇つぶし"];
    const tags = ["募集中", "暇してます", "オンライン", "カフェにいます"];
    const currentTag = tags[Math.floor(Math.random() * tags.length)];
    const meetingPurpose = purposes[Math.floor(Math.random() * purposes.length)];
    const bio = `こんにちは、${name}です。`;
    const id = `demo-${gender}-${Date.now()}`;

    const coords = {
      lat: currentLocation.lat + (Math.random() - 0.5) * 0.03,
      lng: currentLocation.lng + (Math.random() - 0.5) * 0.03,
    };

    const newDemo: Profile = {
      id,
      nickname: name,
      gender,
      age: "20代",
      prefecture: "東京都",
      city: "渋谷区",
      occupation: "会社員",
      education: null,
      preferredGender: "both",
      role: "user",
      isDemo: true,
      currentTag,
      meetingPurpose,
      bio,
      interests: ["旅行", "グルメ"],
      rating: 5.0,
      coordinates: coords,
      createdAt: new Date(),
    };

    // 楽観的更新: 先にUIに反映
    setDemoUsers((prev) => [...prev, newDemo]);

    // DB保存はバックグラウンドで実行
    fetch("/api/demo-users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id, nickname: name, gender, currentTag, meetingPurpose, bio,
        lat: coords.lat, lng: coords.lng,
      }),
    }).catch((e) => {
      console.error("デモユーザーのDB保存に失敗:", e);
      // 失敗時はUIからも除去
      setDemoUsers((prev) => prev.filter((u) => u.id !== id));
    });
  };

  const removeDemoUser = async (gender: Gender) => {
    setDemoUsers((prev) => {
      const targets = prev.filter((u) => u.gender === gender);
      if (targets.length === 0) return prev;

      const last = targets[targets.length - 1];

      fetch("/api/demo-users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: last.id }),
      }).catch((e) => console.error("デモユーザーのDB削除に失敗:", e));

      return prev.filter((u) => u.id !== last.id);
    });
  };

  const counts = {
    man: demoUsers.filter((u) => u.isDemo && u.gender === "man").length,
    woman: demoUsers.filter((u) => u.isDemo && u.gender === "woman").length,
  };

  return { demoUsers, addDemoUser, removeDemoUser, counts };
};
