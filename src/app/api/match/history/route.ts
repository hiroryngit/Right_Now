import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

// GET: 自分のACCEPTED済みマッチ一覧（相手プロフィール付き）
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const matches = await prisma.match.findMany({
    where: {
      status: "ACCEPTED",
      OR: [{ requesterId: user.id }, { receiverId: user.id }],
    },
    orderBy: { createdAt: "desc" },
  });

  // 8時間ペナルティチェック: verified=false & 8時間経過 → 両者rating -1（最低1.0）
  const now = new Date();
  const eightHours = 8 * 60 * 60 * 1000;

  for (const match of matches) {
    if (!match.verified && match.chatExpiresAt) {
      const chatExpiredAt = new Date(match.chatExpiresAt);
      const penaltyDeadline = new Date(chatExpiredAt.getTime() + eightHours);
      if (now > penaltyDeadline) {
        // ペナルティ適用（verified=trueにして重複防止）
        await prisma.match.update({
          where: { id: match.id },
          data: { verified: true },
        });
        // 両者のratingを-1（最低1.0）
        for (const uid of [match.requesterId, match.receiverId]) {
          const profile = await prisma.profile.findUnique({
            where: { id: uid },
            select: { rating: true },
          });
          if (profile) {
            await prisma.profile.update({
              where: { id: uid },
              data: { rating: Math.max(1.0, profile.rating - 1) },
            });
          }
        }
      }
    }
  }

  // 最新データを再取得
  const updatedMatches = await prisma.match.findMany({
    where: {
      status: "ACCEPTED",
      OR: [{ requesterId: user.id }, { receiverId: user.id }],
    },
    orderBy: { createdAt: "desc" },
  });

  // 相手プロフィールを付与
  const result = await Promise.all(
    updatedMatches.map(async (match) => {
      const otherId = match.requesterId === user.id ? match.receiverId : match.requesterId;
      const other = await prisma.profile.findUnique({
        where: { id: otherId },
        select: {
          id: true,
          nickname: true,
          gender: true,
          age: true,
        },
      });
      return {
        id: match.id,
        verified: match.verified,
        chatExpiresAt: match.chatExpiresAt?.toISOString() ?? null,
        createdAt: match.createdAt.toISOString(),
        other,
      };
    })
  );

  return NextResponse.json({ matches: result });
}
