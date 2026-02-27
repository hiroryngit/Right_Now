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
      // 承認 → expiresAtを30秒後にリセットし、PENDING維持（デモ・実ユーザー問わず）
      const updated = await prisma.match.update({
        where: { id: matchId },
        data: { expiresAt: new Date(Date.now() + 30 * 1000) },
      });
      return NextResponse.json({ match: { id: updated.id, status: "WAITING" } });
    }
  }

  const newStatus = action === "accept" ? "ACCEPTED" : "REJECTED";
  const updated = await prisma.match.update({
    where: { id: matchId },
    data: { status: newStatus },
  });

  return NextResponse.json({
    match: {
      id: updated.id,
      status: updated.status,
    },
  });
}
