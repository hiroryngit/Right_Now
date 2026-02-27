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

  // 受信者のみ応答可能
  if (match.receiverId !== user.id) {
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
