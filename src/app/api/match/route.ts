import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

interface UserRow {
  id: string;
  nickname: string;
  gender: string;
  age: string;
  meeting_purpose: string | null;
  preferred_gender: string;
  preferred_age: string | null;
  preferred_purpose: string | null;
  preferred_distance: number | null;
  rating: number;
  is_demo: boolean;
  lat: number;
  lng: number;
}

// 2点間の距離をkm単位で算出（Haversine公式）
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function checkGender(iPrefGender: string, iGender: string, jGender: string): boolean {
  if (iPrefGender === "気にしない" || iPrefGender === "both") return true;
  if (iPrefGender === "同性のみ") return iGender === jGender;
  if (iPrefGender === "異性のみ") return iGender !== jGender;
  return true;
}

function checkAge(iPrefAge: string | null, jAge: string): boolean {
  if (!iPrefAge || iPrefAge === "気にしない") return true;
  return iPrefAge === jAge;
}

function howMatched(i: UserRow, j: UserRow, distKm: number): number {
  if (!checkGender(i.preferred_gender, i.gender, j.gender)) return 0;
  if (!checkAge(i.preferred_age, j.age)) return 0;

  let score = 0;
  if (!i.preferred_distance || distKm <= i.preferred_distance + 1) {
    score += 0.5;
  }
  if (
    !i.preferred_purpose ||
    i.preferred_purpose === "気にしない" ||
    i.preferred_purpose === j.meeting_purpose
  ) {
    score += 0.5;
  }
  return score;
}

// ratingからkを算出（最低3、最大8）: rating5→k=3、rating1→k=8
function ratingToK(rating: number): number {
  const clamped = Math.max(1, Math.min(5, rating));
  return Math.round(3 + (5 - clamped) * 1.25);
}

// 相互マッチ候補を計算して返す（最大3人）
function computeMutualMatches(rows: UserRow[], myIdx: number): UserRow[] {
  const N = rows.length;
  const myK = ratingToK(rows[myIdx].rating);

  // 距離キャッシュ（対称）
  const dist: number[][] = Array.from({ length: N }, () => new Array(N).fill(0));
  for (let i = 0; i < N; i++) {
    for (let j = i + 1; j < N; j++) {
      const d = haversineKm(rows[i].lat, rows[i].lng, rows[j].lat, rows[j].lng);
      dist[i][j] = d;
      dist[j][i] = d;
    }
  }

  // random(t)を事前計算（各方向ペアごとに1つ）
  const rand: number[][] = Array.from({ length: N }, () =>
    Array.from({ length: N }, () => (Math.random() < 0.5 ? 0 : 1))
  );

  // M行列を上三角のみ計算してキャッシュ（m[i][j] = m[j][i] なので O((N^2-N)/2)）
  const M: number[][] = Array.from({ length: N }, () => new Array(N).fill(0));
  for (let i = 0; i < N; i++) {
    for (let j = i + 1; j < N; j++) {
      const ri = rows[i].rating / 5.0;
      const rj = rows[j].rating / 5.0;
      const cij = howMatched(rows[i], rows[j], dist[i][j]) * rand[i][j];
      const cji = howMatched(rows[j], rows[i], dist[j][i]) * rand[j][i];
      const val = (ri * cij) * (rj * cji);
      M[i][j] = val;
      M[j][i] = val;
    }
  }

  // 自分の行で上位k個を取得
  const myTopK = M[myIdx]
    .map((val, idx) => ({ idx, val }))
    .filter((e) => e.val > 0)
    .sort((a, b) => b.val - a.val)
    .slice(0, myK);

  // 各候補jについて、jの行でも自分が上位k以内かチェック
  const mutualMatches: { user: UserRow; score: number }[] = [];

  for (const candidate of myTopK) {
    const j = candidate.idx;
    const jK = ratingToK(rows[j].rating);

    // jの行はM[j]をそのまま参照（対称なので再計算不要）
    const jTopK = M[j]
      .map((val, idx) => ({ idx, val }))
      .filter((e) => e.val > 0)
      .sort((a, b) => b.val - a.val)
      .slice(0, jK);

    if (jTopK.some((e) => e.idx === myIdx)) {
      mutualMatches.push({ user: rows[j], score: candidate.val });
    }
  }

  mutualMatches.sort((a, b) => b.score - a.score);
  return mutualMatches.slice(0, 3).map((m) => m.user);
}

// GET: 現在のアクティブなマッチ状態を取得
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // PENDINGのマッチを探す（期限切れチェック付き）
  const pending = await prisma.match.findFirst({
    where: {
      status: "PENDING",
      OR: [{ requesterId: user.id }, { receiverId: user.id }],
    },
  });

  if (pending) {
    if (new Date(pending.expiresAt) < new Date()) {
      await prisma.match.update({
        where: { id: pending.id },
        data: { status: "EXPIRED" },
      });
      return NextResponse.json({ match: null });
    }

    const otherId = pending.requesterId === user.id ? pending.receiverId : pending.requesterId;
    const other = await prisma.profile.findUnique({
      where: { id: otherId },
      select: { id: true, nickname: true, gender: true, age: true, isDemo: true },
    });

    return NextResponse.json({
      match: {
        id: pending.id,
        status: pending.status,
        role: pending.requesterId === user.id ? "requester" : "receiver",
        expiresAt: pending.expiresAt.toISOString(),
        other,
      },
    });
  }

  // ACCEPTEDのマッチも返す（直近1件）
  const accepted = await prisma.match.findFirst({
    where: {
      status: "ACCEPTED",
      OR: [{ requesterId: user.id }, { receiverId: user.id }],
    },
    orderBy: { createdAt: "desc" },
  });

  if (accepted) {
    const otherId = accepted.requesterId === user.id ? accepted.receiverId : accepted.requesterId;
    const other = await prisma.profile.findUnique({
      where: { id: otherId },
      select: { id: true, nickname: true, gender: true, age: true, isDemo: true },
    });

    return NextResponse.json({
      match: {
        id: accepted.id,
        status: accepted.status,
        role: accepted.requesterId === user.id ? "requester" : "receiver",
        expiresAt: accepted.expiresAt.toISOString(),
        other,
      },
    });
  }

  return NextResponse.json({ match: null });
}

// POST: マッチングを開始（候補最大3人からランダムに1人選択）
export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // PENDING中のマッチがあれば開始不可
  const existing = await prisma.match.findFirst({
    where: {
      status: "PENDING",
      OR: [{ requesterId: user.id }, { receiverId: user.id }],
    },
  });
  if (existing) {
    return NextResponse.json({ error: "既にPENDINGのマッチがあります" }, { status: 409 });
  }

  // オンラインで位置情報を持つ全ユーザーを取得
  const rows: UserRow[] = await prisma.$queryRaw`
    SELECT id, nickname, gender, age,
      "meetingPurpose" AS meeting_purpose,
      "preferredGender" AS preferred_gender,
      "preferredAge" AS preferred_age,
      "preferredPurpose" AS preferred_purpose,
      "preferredDistance" AS preferred_distance,
      rating, "isDemo" AS is_demo,
      ST_Y("lastLocation"::geometry) AS lat,
      ST_X("lastLocation"::geometry) AS lng
    FROM "Profile"
    WHERE "lastLocation" IS NOT NULL AND "isOnline" = true
  `;

  const myIdx = rows.findIndex((r) => r.id === user.id);
  if (myIdx === -1) {
    return NextResponse.json({ match: null });
  }

  // PENDINGのマッチを持つユーザーを除外
  const pendingMatches = await prisma.match.findMany({
    where: { status: "PENDING" },
    select: { requesterId: true, receiverId: true },
  });
  const busyIds = new Set<string>();
  for (const m of pendingMatches) {
    busyIds.add(m.requesterId);
    busyIds.add(m.receiverId);
  }

  // busyなユーザーを除外した候補リスト
  const available = rows.filter((r, i) => i !== myIdx && !busyIds.has(r.id));
  if (available.length === 0) {
    return NextResponse.json({ match: null });
  }

  // 除外後のリストで再計算（自分のインデックスを先頭に調整）
  const computeRows = [rows[myIdx], ...available];
  const candidates = computeMutualMatches(computeRows, 0);

  if (candidates.length === 0) {
    return NextResponse.json({ match: null });
  }

  // 最大3人からランダムに1人選択
  const picked = candidates[Math.floor(Math.random() * candidates.length)];

  // Matchレコード作成（30秒で期限切れ）
  const match = await prisma.match.create({
    data: {
      requesterId: user.id,
      receiverId: picked.id,
      status: "PENDING",
      expiresAt: new Date(Date.now() + 30 * 1000),
    },
  });

  return NextResponse.json({
    match: {
      id: match.id,
      status: match.status,
      role: "requester",
      expiresAt: match.expiresAt.toISOString(),
      other: {
        id: picked.id,
        nickname: picked.nickname,
        gender: picked.gender,
        age: picked.age,
        isDemo: picked.is_demo,
      },
    },
  });
}
