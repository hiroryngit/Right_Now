"use client";

import { useState, useEffect, useRef } from "react";
import { Gender, Profile } from "@/types/user";

interface DemoUserCoords {
  id: string;
  nickname: string;
  gender: string;
  lat: number;
  lng: number;
}

export const useDemoUsers = (currentLocation: { lat: number; lng: number } | null) => {
  const [demoUsers, setDemoUsers] = useState<Profile[]>([]);
  const counterRef = useRef<Record<Gender, number>>({ man: 0, woman: 0 });
  const loadedRef = useRef(false);

  // DBからデモユーザーを読み込む
  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;

    fetch("/api/demo-users")
      .then((res) => res.json())
      .then((data) => {
        const users: DemoUserCoords[] = data.users || [];
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
          isDemo: true,
          currentTag: null,
          meetingPurpose: null,
          bio: null,
          interests: [],
          coordinates: { lat: u.lat, lng: u.lng },
          createdAt: new Date(),
        }));

        // カウンターを復元
        for (const p of profiles) {
          if (p.gender === "man") counterRef.current.man++;
          if (p.gender === "woman") counterRef.current.woman++;
        }

        setDemoUsers(profiles);
      })
      .catch(() => {});
  }, []);

  // ランダムウォーク
  useEffect(() => {
    if (demoUsers.length === 0) return;

    const interval = setInterval(() => {
      setDemoUsers((prev) =>
        prev.map((u) => ({
          ...u,
          coordinates: {
            lat: u.coordinates.lat + (Math.random() - 0.5) * 0.001,
            lng: u.coordinates.lng + (Math.random() - 0.5) * 0.001,
          },
        }))
      );
    }, 2000);

    return () => clearInterval(interval);
  }, [demoUsers.length]);

  const addDemoUser = async (gender: Gender) => {
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

    // DBに保存（座標込み）
    try {
      await fetch("/api/demo-users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id, nickname: name, gender, currentTag, meetingPurpose, bio,
          lat: coords.lat, lng: coords.lng,
        }),
      });
    } catch (e) {
      console.error("デモユーザーのDB保存に失敗:", e);
    }

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
      coordinates: coords,
      createdAt: new Date(),
    };

    setDemoUsers((prev) => [...prev, newDemo]);
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
    man: demoUsers.filter((u) => u.gender === "man").length,
    woman: demoUsers.filter((u) => u.gender === "woman").length,
  };

  return { demoUsers, addDemoUser, removeDemoUser, counts };
};
