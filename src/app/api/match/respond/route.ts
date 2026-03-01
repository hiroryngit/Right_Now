import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

// POST: マッチに対して承認/拒否
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { matchId, action } = await request.json();

  if (!matchId || !["accept", "reject"].includes(action)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match) {
    return NextResponse.json({ error: "Match not found" }, { status: 404 });
  }

  // requester または receiver のみ応答可能
  const isRequester = match.requesterId === user.id;
  const isReceiver = match.receiverId === user.id;
  if (!isRequester && !isReceiver) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (match.status !== "PENDING") {
    return NextResponse.json({ error: "Match is no longer PENDING" }, { status: 409 });
  }

  // 期限切れチェック
  if (new Date(match.expiresAt) < new Date()) {
    await prisma.match.update({
      where: { id: matchId },
      data: { status: "EXPIRED" },
    });
    return NextResponse.json({ error: "Match has expired" }, { status: 410 });
  }

  // requester が拒否 → REJECTED
  // requester が承認 → PENDING のまま（expiresAtを30秒リセット、相手の応答待ち）
  // receiver が承認/拒否 → 従来通り
  if (isRequester) {
    if (action === "reject") {
      const updated = await prisma.match.update({
        where: { id: matchId },
        data: { status: "REJECTED" },
      });
      return NextResponse.json({ match: { id: updated.id, status: updated.status } });
    } else {
      // 承認 → 相手がデモユーザーか確認
      const receiver = await prisma.profile.findUnique({
        where: { id: match.receiverId },
        select: { isDemo: true },
      });

      if (receiver?.isDemo) {
        // デモユーザー: ランダムなタイミング(3〜20秒後)で承認or拒否を決定
        const delay = 3 + Math.floor(Math.random() * 18);
        const willAccept = Math.random() < 0.5;
        // expiresAtに応答予定時刻、statusでACCEPTED/REJECTEDを予約的に記録
        // → GETポーリングで時刻を過ぎたら結果を返す
        const respondAt = new Date(Date.now() + delay * 1000);
        const demoDecision = willAccept ? "DEMO_ACCEPT" as const : "DEMO_REJECT" as const;
        const updated = await prisma.match.update({
          where: { id: matchId },
          data: { status: demoDecision, expiresAt: respondAt },
        });
        // クライアントにはWAITINGとして返す（30秒のタイマー表示用）
        return NextResponse.json({
          match: {
            id: updated.id,
            status: "WAITING",
            expiresAt: new Date(Date.now() + 30 * 1000).toISOString(),
          },
        });
      } else {
        // 実ユーザー: expiresAtを30秒後にリセットし、PENDING維持
        const updated = await prisma.match.update({
          where: { id: matchId },
          data: { expiresAt: new Date(Date.now() + 30 * 1000) },
        });
        return NextResponse.json({ match: { id: updated.id, status: "WAITING" } });
      }
    }
  }

  const newStatus = action === "accept" ? "ACCEPTED" : "REJECTED";
  const updateData: Record<string, unknown> = { status: newStatus };
  if (newStatus === "ACCEPTED") {
    updateData.passcode = Math.floor(1000 + Math.random() * 9000);
    updateData.chatExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
  }
  const updated = await prisma.match.update({
    where: { id: matchId },
    data: updateData,
  });

  return NextResponse.json({
    match: {
      id: updated.id,
      status: updated.status,
    },
  });
}
