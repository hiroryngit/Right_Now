"use client";

import { useState } from "react";
import { Gender, Profile } from "@/types/user";

/**
 * デモユーザーを管理・生成するためのカスタムフック
 * @param currentLocation 管理者の現在地（nullを許容することで初期ロード時のエラーを回避）
 */
export const useDemoUsers = (currentLocation: { lat: number; lng: number } | null) => {
  // マップに表示するためのデモユーザーリスト
  const [demoUsers, setDemoUsers] = useState<Profile[]>([]);

  /**
   * 新しいデモユーザーを追加する
   * @param gender 性別 ('man' | 'woman')
   */
  const addDemoUser = async (gender: Gender) => {
    // 1. 座標がまだ取得できていない場合は処理を中断
    if (!currentLocation) {
      console.warn("現在地が取得できていないため、デモユーザーを追加できません。");
      return;
    }

    // 2. 現在の同じ性別のユーザー数を数えて、次の連番を決定
    const sameGenderCount = demoUsers.filter((u) => u.gender === gender).length;
    const nextNum = sameGenderCount + 1;
    const name = `${gender}${nextNum}`;

    // 3. プロフィールのランダム生成
    const purposes = ["友達作り", "飲みに行きたい", "趣味友募集", "暇つぶし"];
    const tags = ["募集中", "暇してます", "オンライン", "カフェにいます"];

    // src/hooks/useDemoUsers.ts 内の newDemo 作成部分

    const newDemo: Profile = {
      id: `demo-${gender}-${Date.now()}`,
      nickname: name,
      gender: gender,
      age: "20代",
      prefecture: "東京都",
      city: "渋谷区",
      occupation: "会社員",
      role: "user",
      isDemo: true,
      currentTag: tags[Math.floor(Math.random() * tags.length)],
      meetingPurpose: purposes[Math.floor(Math.random() * purposes.length)],
      bio: `こんにちは、${name}です。よろしくお願いします！`,
      interests: ["旅行", "グルメ"],
      rating: 4.5, // ★ 追加：これがないと Profile 型と一致しなくて赤文字になります
      coordinates: {
        lat: currentLocation.lat + (Math.random() - 0.5) * 0.03,
        lng: currentLocation.lng + (Math.random() - 0.5) * 0.03,
      },
      createdAt: new Date(),
    };

    // 4. リストを更新
    setDemoUsers((prev) => [...prev, newDemo]);
    console.log(`✅ デモユーザーを追加しました: ${name}`);
  };

  /**
   * 指定した性別の最新デモユーザーを1人削除する
   * @param gender 性別 ('man' | 'woman')
   */
  const removeDemoUser = async (gender: Gender) => {
    setDemoUsers((prev) => {
      // 指定された性別のユーザーを抽出
      const targets = prev.filter((u) => u.gender === gender);
      if (targets.length === 0) return prev;

      // 最後に追加されたユーザーのIDを取得
      const lastId = targets[targets.length - 1].id;
      return prev.filter((u) => u.id !== lastId);
    });
  };

  // 管理パネルに表示するためのカウント
  const counts = {
    man: demoUsers.filter((u) => u.gender === "man").length,
    woman: demoUsers.filter((u) => u.gender === "woman").length,
  };

  return {
    demoUsers,    // マップ表示用のリスト
    addDemoUser,   // 追加関数
    removeDemoUser, // 削除関数
    counts         // 現在の数
  };
};