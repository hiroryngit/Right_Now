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
  filled_count: number;
}

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

// gender表記を正規化（"男性"→"man", "女性"→"woman"）
function normalizeGender(g: string): string {
  if (g === "男性") return "man";
  if (g === "女性") return "woman";
  return g;
}

function checkGender(iPrefGender: string, iGender: string, jGender: string): boolean {
  if (iPrefGender === "気にしない" || iPrefGender === "both") return true;
  const iNorm = normalizeGender(iGender);
  const jNorm = normalizeGender(jGender);
  if (iPrefGender === "同性のみ") return iNorm === jNorm;
  if (iPrefGender === "異性のみ") return iNorm !== jNorm;
  return true;
}

function checkAge(iPrefAge: string | null, jAge: string): boolean {
  if (!iPrefAge || iPrefAge === "気にしない") return true;
  return iPrefAge === jAge;
}

// HowMatched算出: 性別・年齢が絶対条件、距離+0.5、目的+0.5、プロフィール完成ボーナス
function howMatched(i: UserRow, j: UserRow, distKm: number): number {
  if (!checkGender(i.preferred_gender, i.gender, j.gender)) return 0;
  if (!checkAge(i.preferred_age, j.age)) return 0;

  let score = 0;

  // 距離条件 (+0.3)
  if (!i.preferred_distance || distKm <= i.preferred_distance + 1) {
    score += 0.3;
  }

  // 目的条件 (+0.3)
  if (
    !i.preferred_purpose ||
    i.preferred_purpose === "気にしない" ||
    i.preferred_purpose === j.meeting_purpose
  ) {
    score += 0.3;
  }

  // プロフィール完成ボーナス: 任意項目1つにつき +0.05（最大8項目 = +0.4）
  // 合計上限: 0.3 + 0.3 + 0.4 = 1.0
  score += i.filled_count * 0.05;

  return score;
}

// ratingからkを算出（最低3、最大8）
function ratingToK(rating: number): number {
  const clamped = Math.max(1, Math.min(5, rating));
  return Math.round(3 + (5 - clamped) * 1.25);
}

// M行列の対称性を利用したキャッシュ: (N^2-N)/2 個の成分のみ保持
class SymmetricMatrix {
  private cache = new Map<string, number>();

  private key(i: number, j: number): string {
    return i < j ? `${i},${j}` : `${j},${i}`;
  }

  set(i: number, j: number, val: number): void {
    this.cache.set(this.key(i, j), val);
  }

  get(i: number, j: number): number {
    if (i === j) return 0;
    return this.cache.get(this.key(i, j)) ?? 0;
  }

  has(i: number, j: number): boolean {
    if (i === j) return true;
    return this.cache.has(this.key(i, j));
  }
}

interface DebugEntry {
  idx: number;
  val: number;
  howMatched_ij: number;
  rand_ij: number;
  howMatched_ji: number;
  rand_ji: number;
}

interface SampleCheck {
  genderOK: boolean;
  ageOK: boolean;
  howMatched: number;
  rand: number;
}

interface MatchResult {
  candidates: UserRow[];
  debug: {
    k: number;
    myRow: DebugEntry[];
    sampleChecks: Record<number, SampleCheck>;
  };
}

// 相互マッチ候補を計算して返す（最大3人）
function computeMutualMatches(rows: UserRow[], myIdx: number): MatchResult {
  const N = rows.length;
  const myK = ratingToK(rows[myIdx].rating);

  // 距離キャッシュ（対称なので SymmetricMatrix を利用）
  const distCache = new SymmetricMatrix();

  function getDist(i: number, j: number): number {
    if (distCache.has(i, j)) return distCache.get(i, j);
    const d = haversineKm(rows[i].lat, rows[i].lng, rows[j].lat, rows[j].lng);
    distCache.set(i, j, d);
    return d;
  }

  // random(t) を事前計算（各方向ペアごとに1つ: rand[i][j] は i→j 方向）
  const rand: number[][] = Array.from({ length: N }, () =>
    Array.from({ length: N }, () => (Math.random() < 0.5 ? 0 : 1))
  );

  // M行列: 必要な成分のみ遅延計算 + 対称キャッシュ
  const M = new SymmetricMatrix();

  function computeM(i: number, j: number): number {
    if (i === j) return 0;
    if (M.has(i, j)) return M.get(i, j);

    const d = getDist(i, j);
    const ri = rows[i].rating / 5.0;
    const rj = rows[j].rating / 5.0;
    const cij = howMatched(rows[i], rows[j], d) * rand[i][j];
    const cji = howMatched(rows[j], rows[i], d) * rand[j][i];
    const val = (ri * cij) * (rj * cji);
    M.set(i, j, val);
    return val;
  }

  // Step 1: 自分の行を計算（N-1 個の成分）
  const debugRow: DebugEntry[] = [];
  const sampleChecks: Record<number, SampleCheck> = {};

  for (let j = 0; j < N; j++) {
    if (j === myIdx) continue;
    const d = getDist(myIdx, j);
    const hm_ij = howMatched(rows[myIdx], rows[j], d);
    const hm_ji = howMatched(rows[j], rows[myIdx], d);
    const val = computeM(myIdx, j);

    if (val > 0) {
      debugRow.push({
        idx: j, val,
        howMatched_ij: hm_ij, rand_ij: rand[myIdx][j],
        howMatched_ji: hm_ji, rand_ji: rand[j][myIdx],
      });
    }

    // all-zero時の診断用: 最初の5人のサンプルチェック
    if (j >= 1 && j <= 5) {
      sampleChecks[j] = {
        genderOK: checkGender(rows[myIdx].preferred_gender, rows[myIdx].gender, rows[j].gender),
        ageOK: checkAge(rows[myIdx].preferred_age, rows[j].age),
        howMatched: hm_ij,
        rand: rand[myIdx][j],
      };
    }
  }

  debugRow.sort((a, b) => b.val - a.val);
  const myTopK = debugRow.slice(0, myK);

  // Step 2: 各候補jの行を計算して相互チェック（キャッシュ済みの成分は再計算しない）
  const mutualMatches: { user: UserRow; score: number }[] = [];

  for (const candidate of myTopK) {
    const j = candidate.idx;
    const jK = ratingToK(rows[j].rating);

    const jRow: { idx: number; val: number }[] = [];
    for (let i = 0; i < N; i++) {
      if (i === j) continue;
      const val = computeM(j, i); // M[j][i] = M[i][j] なのでキャッシュヒットする場合あり
      if (val > 0) jRow.push({ idx: i, val });
    }

    jRow.sort((a, b) => b.val - a.val);
    const jTopK = jRow.slice(0, jK);

    if (jTopK.some((e) => e.idx === myIdx)) {
      mutualMatches.push({ user: rows[j], score: candidate.val });
    }
  }

  mutualMatches.sort((a, b) => b.score - a.score);
  return {
    candidates: mutualMatches.slice(0, 3).map((m) => m.user),
    debug: { k: myK, myRow: debugRow, sampleChecks },
  };
}

// オンラインユーザーをDBから取得するクエリ（プロフィール完成度付き）
async function fetchOnlineUsers(): Promise<UserRow[]> {
  return prisma.$queryRaw`
    SELECT id, nickname, gender, age,
      "meetingPurpose" AS meeting_purpose,
      "preferredGender" AS preferred_gender,
      "preferredAge" AS preferred_age,
      "preferredPurpose" AS preferred_purpose,
      "preferredDistance" AS preferred_distance,
      rating, "isDemo" AS is_demo,
      ST_Y("lastLocation"::geometry) AS lat,
      ST_X("lastLocation"::geometry) AS lng,
      (
        CASE WHEN education IS NOT NULL THEN 1 ELSE 0 END +
        CASE WHEN bio IS NOT NULL THEN 1 ELSE 0 END +
        CASE WHEN city IS NOT NULL THEN 1 ELSE 0 END +
        CASE WHEN COALESCE(array_length(interests, 1), 0) > 0 THEN 1 ELSE 0 END +
        CASE WHEN "meetingPurpose" IS NOT NULL THEN 1 ELSE 0 END +
        CASE WHEN "preferredAge" IS NOT NULL THEN 1 ELSE 0 END +
        CASE WHEN "preferredPurpose" IS NOT NULL THEN 1 ELSE 0 END +
        CASE WHEN "preferredDistance" IS NOT NULL THEN 1 ELSE 0 END
      ) AS filled_count
    FROM "Profile"
    WHERE "lastLocation" IS NOT NULL AND "isOnline" = true
  `;
}

// match IDから決定論的な擬似乱数を生成
function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

// GET: 現在のアクティブなマッチ状態を取得
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
      select: {
        id: true, nickname: true, gender: true, age: true, isDemo: true,
        prefecture: true, occupation: true, meetingPurpose: true,
        currentTag: true, bio: true, interests: true,
      },
    });

    // デモユーザーがreceiverの場合、ランダムなタイミングで自動応答
    if (other?.isDemo && pending.requesterId === user.id) {
      const startTime = pending.expiresAt.getTime() - 30 * 1000;
      const elapsed = (Date.now() - startTime) / 1000;
      // match IDから決定論的にdelay(5〜25秒)と承認/拒否を決める
      const delay = 5 + (hashCode(pending.id) % 21);
      const willAccept = (hashCode(pending.id + "decision") % 100) < 70;

      if (elapsed >= delay) {
        const newStatus = willAccept ? "ACCEPTED" : "REJECTED";
        await prisma.match.update({
          where: { id: pending.id },
          data: { status: newStatus },
        });
        if (willAccept) {
          return NextResponse.json({
            match: {
              id: pending.id,
              status: "ACCEPTED",
              role: "requester",
              expiresAt: pending.expiresAt.toISOString(),
              other,
            },
          });
        } else {
          return NextResponse.json({ match: null });
        }
      }
    }

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
      select: {
        id: true, nickname: true, gender: true, age: true, isDemo: true,
        prefecture: true, occupation: true, meetingPurpose: true,
        currentTag: true, bio: true, interests: true,
      },
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

  const existing = await prisma.match.findFirst({
    where: {
      status: "PENDING",
      OR: [{ requesterId: user.id }, { receiverId: user.id }],
    },
  });
  if (existing) {
    return NextResponse.json({ error: "既にPENDINGのマッチがあります" }, { status: 409 });
  }

  const rows = await fetchOnlineUsers();

  const myIdx = rows.findIndex((r) => r.id === user.id);
  if (myIdx === -1) {
    return NextResponse.json({ match: null });
  }

  const pendingMatches = await prisma.match.findMany({
    where: { status: "PENDING" },
    select: { requesterId: true, receiverId: true },
  });
  const busyIds = new Set<string>();
  for (const m of pendingMatches) {
    busyIds.add(m.requesterId);
    busyIds.add(m.receiverId);
  }

  const available = rows.filter((r, i) => i !== myIdx && !busyIds.has(r.id));
  if (available.length === 0) {
    return NextResponse.json({ match: null });
  }

  const computeRows = [rows[myIdx], ...available];
  const { candidates, debug } = computeMutualMatches(computeRows, 0);

  console.log("=== MATCH DEBUG ===");
  console.log(`User: ${rows[myIdx].nickname} (idx=0), N=${computeRows.length}, k=${debug.k}`);
  console.log(`filled_count=${rows[myIdx].filled_count}, rating=${rows[myIdx].rating}`);
  console.log(`My row (M[0][j]) - non-zero entries:`);
  for (const e of debug.myRow) {
    const u = computeRows[e.idx];
    console.log(`  j=${e.idx} ${u.nickname} val=${e.val.toFixed(6)} | howMatched_ij=${e.howMatched_ij.toFixed(3)} rand_ij=${e.rand_ij} howMatched_ji=${e.howMatched_ji.toFixed(3)} rand_ji=${e.rand_ji}`);
  }
  if (debug.myRow.length === 0) {
    console.log("  (all zero)");
    console.log("  Sample checks (first 5 users):");
    for (let j = 1; j < Math.min(6, computeRows.length); j++) {
      const u = computeRows[j];
      const d = debug.sampleChecks[j] ?? {};
      console.log(`  j=${j} ${u.nickname} gender=${u.gender} age=${u.age} | genderOK=${d.genderOK} ageOK=${d.ageOK} howMatched=${d.howMatched?.toFixed(3)} rand=${d.rand}`);
    }
  }
  console.log(`Mutual matches: ${candidates.length}`);
  console.log("===================");

  if (candidates.length === 0) {
    return NextResponse.json({ match: null });
  }

  const picked = candidates[Math.floor(Math.random() * candidates.length)];

  const match = await prisma.match.create({
    data: {
      requesterId: user.id,
      receiverId: picked.id,
      status: "PENDING",
      expiresAt: new Date(Date.now() + 30 * 1000),
    },
  });

  const pickedProfile = await prisma.profile.findUnique({
    where: { id: picked.id },
    select: {
      id: true, nickname: true, gender: true, age: true, isDemo: true,
      prefecture: true, occupation: true, meetingPurpose: true,
      currentTag: true, bio: true, interests: true,
    },
  });

  return NextResponse.json({
    match: {
      id: match.id,
      status: match.status,
      role: "requester",
      expiresAt: match.expiresAt.toISOString(),
      other: pickedProfile,
    },
  });
}
