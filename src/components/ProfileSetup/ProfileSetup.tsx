"use client";

import { useState } from "react";
import {
  GENDERS,
  AGE_OPTIONS,
  PREFECTURES,
  CITIES,
  OCCUPATIONS,
  EDUCATIONS,
  MEETING_PURPOSES,
  MATCHING_TAGS,
  INTERESTS,
  GENDER_PREFERENCES,
  AGE_PREFERENCES,
  PURPOSE_PREFERENCES,
} from "@/constants/profile";
import styles from "./ProfileSetup.module.scss";

interface ProfileSetupProps {
  isOpen: boolean;
  onComplete: () => void;
}

export function ProfileSetup({ isOpen, onComplete }: ProfileSetupProps) {
  const [nickname, setNickname] = useState("");
  const [gender, setGender] = useState("");
  const [age, setAge] = useState("");
  const [prefecture, setPrefecture] = useState("");
  const [city, setCity] = useState("");
  const [occupation, setOccupation] = useState("");
  const [education, setEducation] = useState("");
  const [meetingPurpose, setMeetingPurpose] = useState("");
  const [bio, setBio] = useState("");
  const [currentTag, setCurrentTag] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [preferredGender, setPreferredGender] = useState("");
  const [preferredAge, setPreferredAge] = useState("");
  const [preferredPurpose, setPreferredPurpose] = useState("");
  const [preferredDistance, setPreferredDistance] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const isValid =
    nickname.trim().length > 0 &&
    gender !== "" &&
    age !== "" &&
    prefecture !== "" &&
    occupation !== "" &&
    currentTag !== "" &&
    preferredGender !== "" &&
    preferredAge !== "" &&
    preferredPurpose !== "" &&
    preferredDistance !== "" &&
    Number.isInteger(Number(preferredDistance)) &&
    Number(preferredDistance) >= 1;

  const toggleInterest = (interest: string) => {
    setInterests((prev) =>
      prev.includes(interest)
        ? prev.filter((i) => i !== interest)
        : [...prev, interest]
    );
  };

  const handlePrefectureChange = (value: string) => {
    setPrefecture(value);
    setCity("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nickname: nickname.trim(),
          gender,
          age,
          prefecture,
          city: city || null,
          occupation,
          education: education || null,
          meetingPurpose: meetingPurpose || null,
          bio: bio.trim() || null,
          currentTag,
          interests,
          preferredGender,
          preferredAge,
          preferredPurpose,
          preferredDistance: Number(preferredDistance),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "プロフィールの作成に失敗しました");
      } else {
        onComplete();
      }
    } catch {
      setError("通信エラーが発生しました");
    } finally {
      setSubmitting(false);
    }
  };

  const cityOptions = prefecture ? CITIES[prefecture] ?? [] : [];

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <h2 className={styles.title}>プロフィール登録</h2>
        <p className={styles.subtitle}>マッチングに必要な情報を入力してください</p>

        <form className={styles.form} onSubmit={handleSubmit}>
          {/* ── セクション1: 基本情報 ── */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>基本情報</h3>

            <label className={styles.label}>
              ニックネーム <span className={styles.required}>*</span>
            </label>
            <input
              className={styles.input}
              type="text"
              placeholder="ニックネーム"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              maxLength={20}
            />

            <label className={styles.label}>
              性別 <span className={styles.required}>*</span>
            </label>
            <div className={styles.radioGroup}>
              {GENDERS.map((g) => (
                <label key={g} className={`${styles.radioLabel} ${gender === g ? styles.radioActive : ""}`}>
                  <input
                    type="radio"
                    name="gender"
                    value={g}
                    checked={gender === g}
                    onChange={(e) => setGender(e.target.value)}
                    className={styles.radioInput}
                  />
                  {g}
                </label>
              ))}
            </div>

            <label className={styles.label}>
              年齢 <span className={styles.required}>*</span>
            </label>
            <select className={styles.select} value={age} onChange={(e) => setAge(e.target.value)}>
              <option value="">選択してください</option>
              {AGE_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>

            <label className={styles.label}>
              居住地 <span className={styles.required}>*</span>
            </label>
            <select className={styles.select} value={prefecture} onChange={(e) => handlePrefectureChange(e.target.value)}>
              <option value="">都道府県を選択</option>
              {PREFECTURES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>

            {cityOptions.length > 0 && (
              <>
                <label className={styles.label}>詳細な地域</label>
                <select className={styles.select} value={city} onChange={(e) => setCity(e.target.value)}>
                  <option value="">市区町村を選択（任意）</option>
                  {cityOptions.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </>
            )}
          </div>

          {/* ── セクション2: あなたについて ── */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>あなたについて</h3>

            <label className={styles.label}>
              職業 <span className={styles.required}>*</span>
            </label>
            <select className={styles.select} value={occupation} onChange={(e) => setOccupation(e.target.value)}>
              <option value="">選択してください</option>
              {OCCUPATIONS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>

            <label className={styles.label}>学歴</label>
            <select className={styles.select} value={education} onChange={(e) => setEducation(e.target.value)}>
              <option value="">選択してください（任意）</option>
              {EDUCATIONS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>

            <label className={styles.label}>出会う目的</label>
            <select className={styles.select} value={meetingPurpose} onChange={(e) => setMeetingPurpose(e.target.value)}>
              <option value="">選択してください（任意）</option>
              {MEETING_PURPOSES.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>

            <label className={styles.label}>自己紹介文</label>
            <textarea
              className={styles.textarea}
              placeholder="自己紹介を書いてください（任意）"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
            />
          </div>

          {/* ── セクション3: マッチングタグ ── */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>マッチングタグ</h3>
            <p className={styles.sectionNote}>どんな目的で会いたいですか？</p>
            <label className={styles.label}>
              タグ <span className={styles.required}>*</span>
            </label>
            <div className={styles.chipGrid}>
              {MATCHING_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  className={`${styles.chip} ${currentTag === tag ? styles.chipActive : ""}`}
                  onClick={() => setCurrentTag(tag)}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* ── セクション4: 興味・趣味 ── */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>興味あること</h3>
            <div className={styles.chipGrid}>
              {INTERESTS.map((interest) => (
                <button
                  key={interest}
                  type="button"
                  className={`${styles.chip} ${interests.includes(interest) ? styles.chipActive : ""}`}
                  onClick={() => toggleInterest(interest)}
                >
                  {interest}
                </button>
              ))}
            </div>
          </div>

          {/* ── セクション4: 非公開設定 ── */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>非公開設定</h3>
            <p className={styles.sectionNote}>この情報は他のユーザーには表示されません</p>

            <label className={styles.label}>
              相手の性別 <span className={styles.required}>*</span>
            </label>
            <div className={styles.radioGroup}>
              {GENDER_PREFERENCES.map((g) => (
                <label key={g} className={`${styles.radioLabel} ${preferredGender === g ? styles.radioActive : ""}`}>
                  <input
                    type="radio"
                    name="preferredGender"
                    value={g}
                    checked={preferredGender === g}
                    onChange={(e) => setPreferredGender(e.target.value)}
                    className={styles.radioInput}
                  />
                  {g}
                </label>
              ))}
            </div>

            <label className={styles.label}>
              希望年齢 <span className={styles.required}>*</span>
            </label>
            <select className={styles.select} value={preferredAge} onChange={(e) => setPreferredAge(e.target.value)}>
              <option value="">選択してください</option>
              {AGE_PREFERENCES.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>

            <label className={styles.label}>
              出会う目的の希望 <span className={styles.required}>*</span>
            </label>
            <select className={styles.select} value={preferredPurpose} onChange={(e) => setPreferredPurpose(e.target.value)}>
              <option value="">選択してください</option>
              {PURPOSE_PREFERENCES.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>

            <label className={styles.label}>
              希望距離（km） <span className={styles.required}>*</span>
            </label>
            <input
              className={styles.input}
              type="number"
              placeholder="例: 10"
              value={preferredDistance}
              onChange={(e) => setPreferredDistance(e.target.value)}
              min={1}
            />
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <button className={styles.submitBtn} type="submit" disabled={!isValid || submitting}>
            {submitting ? "登録中..." : "はじめる"}
          </button>
        </form>
      </div>
    </div>
  );
}
