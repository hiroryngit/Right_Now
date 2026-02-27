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
          preferredAge: null,
          preferredPurpose: null,
          preferredDistance: null,
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

  const addDemoUser = async (gender: Gender) => {
    if (!currentLocation) return;

    counterRef.current[gender] += 1;
    const name = `${gender}${counterRef.current[gender]}`;

    const purposes = ["友達探し", "暇つぶし", "趣味仲間", "飲み友達", "ビジネス", "恋愛"];
    const tags = ["募集中", "暇してます", "オンライン", "カフェにいます"];
    const ages = ["18~19", "20代前半", "20代後半", "30代前半", "30代後半", "40代前半", "40代後半"];
    const genderPrefs = ["同性のみ", "異性のみ", "気にしない"];
    const agePrefs = ["気にしない", "18~19", "20代前半", "20代後半", "30代前半", "30代後半", "40代前半"];
    const purposePrefs = ["気にしない", "友達探し", "暇つぶし", "趣味仲間", "飲み友達", "恋愛"];
    const distanceOptions = [1, 3, 5, 10, null];
    const allInterests = ["スポーツ", "音楽", "映画", "読書", "ゲーム", "旅行", "グルメ", "テクノロジー", "アウトドア", "料理", "フィットネス", "カフェ巡り"];

    const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];
    const pickN = <T,>(arr: T[], n: number): T[] => {
      const shuffled = [...arr].sort(() => Math.random() - 0.5);
      return shuffled.slice(0, n);
    };

    const currentTag = pick(tags);
    const meetingPurpose = pick(purposes);
    const age = pick(ages);
    const preferredGender = pick(genderPrefs);
    const preferredAge = pick(agePrefs);
    const preferredPurpose = pick(purposePrefs);
    const preferredDistance = pick(distanceOptions);
    const interests = pickN(allInterests, 2 + Math.floor(Math.random() * 4));
    const bio = `こんにちは、${name}です。`;
    const id = `demo-${gender}-${Date.now()}`;

    // 最低200m（約0.002度）〜最大1.5km離す
    const angle = Math.random() * 2 * Math.PI;
    const dist = 0.002 + Math.random() * 0.013;
    const coords = {
      lat: currentLocation.lat + Math.sin(angle) * dist,
      lng: currentLocation.lng + Math.cos(angle) * dist,
    };

    const newDemo: Profile = {
      id,
      nickname: name,
      gender,
      age,
      prefecture: "東京都",
      city: "渋谷区",
      occupation: "会社員",
      education: null,
      preferredGender,
      preferredAge,
      preferredPurpose,
      preferredDistance,
      role: "user",
      isDemo: true,
      currentTag,
      meetingPurpose,
      bio,
      interests,
      rating: 5.0,
      coordinates: coords,
      createdAt: new Date(),
    };

    // 楽観的更新: 先にUIに反映
    setDemoUsers((prev) => [...prev, newDemo]);

    // DB保存を待ち、失敗時はUIとカウンターを戻す
    try {
      const res = await fetch("/api/demo-users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id, nickname: name, gender, age, currentTag, meetingPurpose, bio,
          preferredGender, preferredAge, preferredPurpose, preferredDistance, interests,
          lat: coords.lat, lng: coords.lng,
        }),
      });
      if (!res.ok) throw new Error("DB保存失敗");
    } catch (e) {
      console.error("デモユーザーのDB保存に失敗:", e);
      setDemoUsers((prev) => prev.filter((u) => u.id !== id));
      counterRef.current[gender] -= 1;
    }
  };

  const removeDemoUser = async (gender: Gender) => {
    const targets = demoUsers.filter((u) => u.isDemo && u.gender === gender);
    if (targets.length === 0) return;

    const last = targets[targets.length - 1];

    // 楽観的更新
    setDemoUsers((prev) => prev.filter((u) => u.id !== last.id));

    try {
      const res = await fetch("/api/demo-users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: last.id }),
      });
      if (!res.ok) throw new Error("DB削除失敗");
    } catch (e) {
      console.error("デモユーザーのDB削除に失敗:", e);
      // 失敗時はUIに戻す
      setDemoUsers((prev) => [...prev, last]);
    }
  };

  const counts = {
    man: demoUsers.filter((u) => u.isDemo && u.gender === "man").length,
    woman: demoUsers.filter((u) => u.isDemo && u.gender === "woman").length,
  };

  return { demoUsers, addDemoUser, removeDemoUser, counts };
};
