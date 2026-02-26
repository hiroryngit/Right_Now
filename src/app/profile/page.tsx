"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Check, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { LoginModal } from "@/components/LoginModal/LoginModal";
import { createClient } from "@/lib/supabase/client";
import {
  PREFECTURES,
  CITIES,
  OCCUPATIONS,
  EDUCATIONS,
  MATCHING_TAGS,
  MEETING_PURPOSES,
  INTERESTS,
  GENDER_PREFERENCES,
  AGE_PREFERENCES,
  PURPOSE_PREFERENCES,
} from "@/constants/profile";
import styles from "./page.module.scss";

type EditableField =
  | "location"
  | "occupation"
  | "education"
  | "currentTag"
  | "meetingPurpose"
  | "bio"
  | "interests"
  | "preferredGender"
  | "preferredAge"
  | "preferredPurpose"
  | "preferredDistance"
  | null;

export default function ProfilePage() {
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [editingField, setEditingField] = useState<EditableField>(null);
  const [saving, setSaving] = useState(false);

  // 編集用の一時値
  const [editPrefecture, setEditPrefecture] = useState("");
  const [editCity, setEditCity] = useState("");
  const [editOccupation, setEditOccupation] = useState("");
  const [editEducation, setEditEducation] = useState("");
  const [editCurrentTag, setEditCurrentTag] = useState("");
  const [editMeetingPurpose, setEditMeetingPurpose] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editInterests, setEditInterests] = useState<string[]>([]);
  const [editPreferredGender, setEditPreferredGender] = useState("");
  const [editPreferredAge, setEditPreferredAge] = useState("");
  const [editPreferredPurpose, setEditPreferredPurpose] = useState("");
  const [editPreferredDistance, setEditPreferredDistance] = useState("");

  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading, checked, refetch } = useProfile(user);

  const handleLogout = async () => {
    await fetch("/api/logout", { method: "POST" });
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  };

  const startEdit = (field: EditableField) => {
    if (!profile || !field) return;
    switch (field) {
      case "location":
        setEditPrefecture(profile.prefecture);
        setEditCity(profile.city ?? "");
        break;
      case "occupation":
        setEditOccupation(profile.occupation);
        break;
      case "education":
        setEditEducation(profile.education ?? "");
        break;
      case "currentTag":
        setEditCurrentTag(profile.currentTag ?? "");
        break;
      case "meetingPurpose":
        setEditMeetingPurpose(profile.meetingPurpose ?? "");
        break;
      case "bio":
        setEditBio(profile.bio ?? "");
        break;
      case "interests":
        setEditInterests([...(profile.interests ?? [])]);
        break;
      case "preferredGender":
        setEditPreferredGender(profile.preferredGender);
        break;
      case "preferredAge":
        setEditPreferredAge(profile.preferredAge ?? "");
        break;
      case "preferredPurpose":
        setEditPreferredPurpose(profile.preferredPurpose ?? "");
        break;
      case "preferredDistance":
        setEditPreferredDistance(profile.preferredDistance != null ? String(profile.preferredDistance) : "");
        break;
    }
    setEditingField(field);
  };

  const cancelEdit = () => setEditingField(null);

  const saveField = async () => {
    if (!profile) return;
    setSaving(true);

    const updated: Record<string, unknown> = {
      nickname: profile.nickname,
      gender: profile.gender,
      age: profile.age,
      prefecture: profile.prefecture,
      city: profile.city,
      occupation: profile.occupation,
      education: profile.education,
      meetingPurpose: profile.meetingPurpose,
      currentTag: profile.currentTag,
      bio: profile.bio,
      interests: profile.interests,
      preferredGender: profile.preferredGender,
      preferredAge: profile.preferredAge,
      preferredPurpose: profile.preferredPurpose,
      preferredDistance: profile.preferredDistance,
    };

    switch (editingField) {
      case "location":
        updated.prefecture = editPrefecture;
        updated.city = editCity || null;
        break;
      case "occupation":
        updated.occupation = editOccupation;
        break;
      case "education":
        updated.education = editEducation || null;
        break;
      case "currentTag":
        updated.currentTag = editCurrentTag || null;
        break;
      case "meetingPurpose":
        updated.meetingPurpose = editMeetingPurpose || null;
        break;
      case "bio":
        updated.bio = editBio.trim() || null;
        break;
      case "interests":
        updated.interests = editInterests;
        break;
      case "preferredGender":
        updated.preferredGender = editPreferredGender;
        break;
      case "preferredAge":
        updated.preferredAge = editPreferredAge || null;
        break;
      case "preferredPurpose":
        updated.preferredPurpose = editPreferredPurpose || null;
        break;
      case "preferredDistance":
        updated.preferredDistance = editPreferredDistance ? Number(editPreferredDistance) : null;
        break;
    }

    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      });
      if (res.ok) {
        setEditingField(null);
        refetch();
      }
    } finally {
      setSaving(false);
    }
  };

  const toggleEditInterest = (interest: string) => {
    setEditInterests((prev) =>
      prev.includes(interest) ? prev.filter((i) => i !== interest) : [...prev, interest]
    );
  };

  const editCityOptions = editPrefecture ? CITIES[editPrefecture] ?? [] : [];

  if (authLoading || profileLoading || (user && !checked)) {
    return (
      <div className={styles.page}>
        <div className={styles.loading}>読み込み中...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <p className={styles.emptyMessage}>ログインしていません</p>
          <button className={styles.backBtn} onClick={() => setShowLoginModal(true)}>
            ログイン
          </button>
          <button className={styles.logoutBtn} onClick={() => router.push("/")}>
            マップに戻る
          </button>
          <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <p className={styles.emptyMessage}>プロフィールが登録されていません</p>
          <button className={styles.backBtn} onClick={() => router.push("/")}>
            マップに戻る
          </button>
        </div>
      </div>
    );
  }

  const renderValue = (value: string | null | undefined, fallback = "未設定") => {
    if (!value) return <span className={styles.fieldUnset}>{fallback}</span>;
    return <span className={styles.fieldValue}>{value}</span>;
  };

  const isAdmin = profile.role === "admin";

  const renderEditBtn = (field: EditableField) => {
    if (isAdmin) return null;
    return (
      <button className={styles.editBtn} onClick={() => startEdit(field)} type="button">
        <Pencil size={14} />
      </button>
    );
  };

  const renderEditActions = () => (
    <div className={styles.editActions}>
      <button className={styles.saveBtn} onClick={saveField} disabled={saving} type="button">
        <Check size={14} />
        {saving ? "保存中..." : "保存"}
      </button>
      <button className={styles.cancelBtn} onClick={cancelEdit} type="button">
        <X size={14} />
        キャンセル
      </button>
    </div>
  );

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <h1 className={styles.title}>プロフィール</h1>
          {profile.role === "admin" && (
            <span className={styles.adminBadge}>ADMIN</span>
          )}
        </header>

        {/* 基本情報 */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>基本情報</h2>

          <div className={styles.field}>
            <span className={styles.fieldLabel}>ニックネーム</span>
            <span className={styles.fieldValue}>{profile.nickname}</span>
          </div>

          <div className={styles.field}>
            <span className={styles.fieldLabel}>性別</span>
            <span className={styles.fieldValue}>{profile.gender}</span>
          </div>

          <div className={styles.field}>
            <span className={styles.fieldLabel}>年齢</span>
            <span className={styles.fieldValue}>{profile.age}</span>
          </div>

          {/* 居住地 — 編集可能 */}
          <div className={styles.field}>
            <span className={styles.fieldLabel}>居住地</span>
            {editingField === "location" ? (
              <div className={styles.editField}>
                <select value={editPrefecture} onChange={(e) => { setEditPrefecture(e.target.value); setEditCity(""); }}>
                  <option value="">都道府県</option>
                  {PREFECTURES.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
                {editCityOptions.length > 0 && (
                  <select value={editCity} onChange={(e) => setEditCity(e.target.value)}>
                    <option value="">市区町村（任意）</option>
                    {editCityOptions.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                )}
                {renderEditActions()}
              </div>
            ) : (
              <span className={styles.fieldValueWithEdit}>
                {renderValue(profile.prefecture + (profile.city ? ` ${profile.city}` : ""))}
                {renderEditBtn("location")}
              </span>
            )}
          </div>

          {/* 職業 — 編集可能 */}
          <div className={styles.field}>
            <span className={styles.fieldLabel}>職業</span>
            {editingField === "occupation" ? (
              <div className={styles.editField}>
                <select value={editOccupation} onChange={(e) => setEditOccupation(e.target.value)}>
                  {OCCUPATIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
                {renderEditActions()}
              </div>
            ) : (
              <span className={styles.fieldValueWithEdit}>
                {renderValue(profile.occupation)}
                {renderEditBtn("occupation")}
              </span>
            )}
          </div>

          {/* 学歴 — 編集可能 */}
          <div className={styles.field}>
            <span className={styles.fieldLabel}>学歴</span>
            {editingField === "education" ? (
              <div className={styles.editField}>
                <select value={editEducation} onChange={(e) => setEditEducation(e.target.value)}>
                  <option value="">未設定</option>
                  {EDUCATIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
                {renderEditActions()}
              </div>
            ) : (
              <span className={styles.fieldValueWithEdit}>
                {renderValue(profile.education)}
                {renderEditBtn("education")}
              </span>
            )}
          </div>
        </div>

        {/* マッチング */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>マッチング</h2>

          {/* マッチングタグ — 編集可能 */}
          <div className={styles.field}>
            <span className={styles.fieldLabel}>マッチングタグ</span>
            {editingField === "currentTag" ? (
              <div className={styles.editField}>
                <div className={styles.chipGridEdit}>
                  {MATCHING_TAGS.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      className={`${styles.chipEdit} ${editCurrentTag === tag ? styles.chipEditActive : ""}`}
                      onClick={() => setEditCurrentTag(tag)}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
                {renderEditActions()}
              </div>
            ) : (
              <span className={styles.fieldValueWithEdit}>
                {profile.currentTag ? (
                  <span className={styles.tag}>{profile.currentTag}</span>
                ) : (
                  <span className={styles.fieldUnset}>未設定</span>
                )}
                {renderEditBtn("currentTag")}
              </span>
            )}
          </div>

          {/* 出会う目的 — 編集可能 */}
          <div className={styles.field}>
            <span className={styles.fieldLabel}>出会う目的</span>
            {editingField === "meetingPurpose" ? (
              <div className={styles.editField}>
                <select value={editMeetingPurpose} onChange={(e) => setEditMeetingPurpose(e.target.value)}>
                  <option value="">未設定</option>
                  {MEETING_PURPOSES.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
                {renderEditActions()}
              </div>
            ) : (
              <span className={styles.fieldValueWithEdit}>
                {renderValue(profile.meetingPurpose)}
                {renderEditBtn("meetingPurpose")}
              </span>
            )}
          </div>
        </div>

        {/* 自己紹介 — 編集可能 */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>自己紹介</h2>
          {editingField === "bio" ? (
            <div className={styles.editField}>
              <textarea
                className={styles.editTextarea}
                value={editBio}
                onChange={(e) => setEditBio(e.target.value)}
                rows={4}
                placeholder="自己紹介を書いてください"
              />
              {renderEditActions()}
            </div>
          ) : (
            <div className={styles.fieldValueWithEdit}>
              {profile.bio ? (
                <p className={styles.bio}>{profile.bio}</p>
              ) : (
                <span className={styles.fieldUnset}>未設定</span>
              )}
              {renderEditBtn("bio")}
            </div>
          )}
        </div>

        {/* 興味あること — 編集可能 */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>興味あること</h2>
          {editingField === "interests" ? (
            <div className={styles.editField}>
              <div className={styles.chipGridEdit}>
                {INTERESTS.map((interest) => (
                  <button
                    key={interest}
                    type="button"
                    className={`${styles.chipEdit} ${editInterests.includes(interest) ? styles.chipEditActive : ""}`}
                    onClick={() => toggleEditInterest(interest)}
                  >
                    {interest}
                  </button>
                ))}
              </div>
              {renderEditActions()}
            </div>
          ) : (
            <div className={styles.fieldValueWithEdit}>
              {profile.interests && profile.interests.length > 0 ? (
                <div className={styles.chipGrid}>
                  {profile.interests.map((interest: string) => (
                    <span key={interest} className={styles.chip}>{interest}</span>
                  ))}
                </div>
              ) : (
                <span className={styles.fieldUnset}>未設定</span>
              )}
              {renderEditBtn("interests")}
            </div>
          )}
        </div>

        {/* 非公開設定 */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>非公開設定</h2>
          <p className={styles.privateNote}>この情報は他のユーザーには表示されません</p>

          {/* 相手の性別 — 編集可能 */}
          <div className={styles.field}>
            <span className={styles.fieldLabel}>相手の性別</span>
            {editingField === "preferredGender" ? (
              <div className={styles.editField}>
                <select value={editPreferredGender} onChange={(e) => setEditPreferredGender(e.target.value)}>
                  {GENDER_PREFERENCES.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
                {renderEditActions()}
              </div>
            ) : (
              <span className={styles.fieldValueWithEdit}>
                {renderValue(profile.preferredGender)}
                {renderEditBtn("preferredGender")}
              </span>
            )}
          </div>

          {/* 希望年齢 — 編集可能（新規） */}
          <div className={styles.field}>
            <span className={styles.fieldLabel}>希望年齢</span>
            {editingField === "preferredAge" ? (
              <div className={styles.editField}>
                <select value={editPreferredAge} onChange={(e) => setEditPreferredAge(e.target.value)}>
                  {AGE_PREFERENCES.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
                {renderEditActions()}
              </div>
            ) : (
              <span className={styles.fieldValueWithEdit}>
                {renderValue(profile.preferredAge)}
                {renderEditBtn("preferredAge")}
              </span>
            )}
          </div>

          {/* 出会う目的の希望 — 編集可能（新規） */}
          <div className={styles.field}>
            <span className={styles.fieldLabel}>出会う目的の希望</span>
            {editingField === "preferredPurpose" ? (
              <div className={styles.editField}>
                <select value={editPreferredPurpose} onChange={(e) => setEditPreferredPurpose(e.target.value)}>
                  {PURPOSE_PREFERENCES.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
                {renderEditActions()}
              </div>
            ) : (
              <span className={styles.fieldValueWithEdit}>
                {renderValue(profile.preferredPurpose)}
                {renderEditBtn("preferredPurpose")}
              </span>
            )}
          </div>

          {/* 希望距離 — 編集可能 */}
          <div className={styles.field}>
            <span className={styles.fieldLabel}>希望距離</span>
            {editingField === "preferredDistance" ? (
              <div className={styles.editField}>
                <input
                  type="number"
                  value={editPreferredDistance}
                  onChange={(e) => setEditPreferredDistance(e.target.value)}
                  min={1}
                  placeholder="km"
                />
                {renderEditActions()}
              </div>
            ) : (
              <span className={styles.fieldValueWithEdit}>
                {profile.preferredDistance != null ? (
                  <span className={styles.fieldValue}>{profile.preferredDistance}km</span>
                ) : (
                  <span className={styles.fieldUnset}>未設定</span>
                )}
                {renderEditBtn("preferredDistance")}
              </span>
            )}
          </div>
        </div>

        {/* アクション */}
        <div className={styles.actions}>
          <button className={styles.backBtn} onClick={() => router.push("/")}>
            マップに戻る
          </button>
          <button className={styles.logoutBtn} onClick={handleLogout}>
            ログアウト
          </button>
        </div>
      </div>
    </div>
  );
}
