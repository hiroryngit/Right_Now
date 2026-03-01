import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { generateDemoReply } from "@/lib/gemini";

// GET: メッセージ一覧取得
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const matchId = request.nextUrl.searchParams.get("matchId");
  if (!matchId) {
    return NextResponse.json({ error: "matchId is required" }, { status: 400 });
  }

  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match || (match.requesterId !== user.id && match.receiverId !== user.id)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // 相手からの未読メッセージを既読に更新
  await prisma.message.updateMany({
    where: {
      matchId,
      senderId: { not: user.id },
      readAt: null,
    },
    data: { readAt: new Date() },
  });

  const messages = await prisma.message.findMany({
    where: { matchId },
    orderBy: { createdAt: "asc" },
  });

  // typingAtが3秒以内のもののみ有効
  const typingUserId =
    match.typingUserId &&
    match.typingAt &&
    Date.now() - new Date(match.typingAt).getTime() < 3000 &&
    match.typingUserId !== user.id
      ? match.typingUserId
      : null;

  return NextResponse.json({
    messages,
    chatExpiresAt: match.chatExpiresAt?.toISOString() ?? null,
    passcode: match.passcode,
    verified: match.verified,
    typingUserId,
  });
}

// POST: メッセージ送信
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { matchId, text } = await request.json();
  if (!matchId || !text?.trim()) {
    return NextResponse.json({ error: "matchId and text are required" }, { status: 400 });
  }

  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match || (match.requesterId !== user.id && match.receiverId !== user.id)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (match.chatExpiresAt && new Date(match.chatExpiresAt) < new Date()) {
    return NextResponse.json({ error: "送信期限が切れました" }, { status: 410 });
  }

  const message = await prisma.message.create({
    data: {
      matchId,
      senderId: user.id,
      text: text.trim(),
    },
  });

  // デモユーザー相手の場合、Gemini APIで返信を非同期生成
  const otherUserId = match.requesterId === user.id ? match.receiverId : match.requesterId;
  const otherProfile = await prisma.profile.findUnique({ where: { id: otherUserId } });

  if (otherProfile?.isDemo) {
    const allMessages = await prisma.message.findMany({
      where: { matchId },
      orderBy: { createdAt: "asc" },
      select: { senderId: true, text: true },
    });

    // 両者の位置情報を取得
    const locRows: { lat: number; lng: number; other_lat: number; other_lng: number }[] = await prisma.$queryRaw`
      SELECT
        ST_Y((SELECT "lastLocation"::geometry FROM "Profile" WHERE id = ${user.id})) AS lat,
        ST_X((SELECT "lastLocation"::geometry FROM "Profile" WHERE id = ${user.id})) AS lng,
        ST_Y((SELECT "lastLocation"::geometry FROM "Profile" WHERE id = ${otherUserId})) AS other_lat,
        ST_X((SELECT "lastLocation"::geometry FROM "Profile" WHERE id = ${otherUserId})) AS other_lng
    `;

    let locationContext: { areaName: string; distanceKm: number } | null = null;
    if (locRows[0]?.lat != null && locRows[0]?.lng != null) {
      const { lat, lng, other_lat, other_lng } = locRows[0];
      // 中間地点で逆ジオコーディング
      const midLat = (lat + other_lat) / 2;
      const midLng = (lng + other_lng) / 2;
      // 距離計算 (haversine)
      const R = 6371;
      const dLat = ((other_lat - lat) * Math.PI) / 180;
      const dLng = ((other_lng - lng) * Math.PI) / 180;
      const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat * Math.PI) / 180) * Math.cos((other_lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
      const distKm = Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 10) / 10;

      try {
        const geoRes = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${midLat}&lon=${midLng}&format=json&accept-language=ja&zoom=14`, {
          headers: { "User-Agent": "RightNow-App/1.0" },
        });
        if (geoRes.ok) {
          const geoData = await geoRes.json();
          const addr = geoData.address;
          const areaName = [addr?.city || addr?.town || addr?.village, addr?.state || addr?.province]
            .filter(Boolean).join("、") || geoData.display_name?.split(",").slice(0, 2).join("") || "不明";
          locationContext = { areaName, distanceKm: distKm };
        }
      } catch {
        // 逆ジオコーディング失敗時はnullのまま
      }
    }

    // 入力中ステータスをセット
    await prisma.match.update({
      where: { id: matchId },
      data: { typingUserId: otherUserId, typingAt: new Date() },
    });

    generateDemoReply(
      {
        nickname: otherProfile.nickname,
        gender: otherProfile.gender,
        age: otherProfile.age,
        occupation: otherProfile.occupation,
        interests: otherProfile.interests,
        bio: otherProfile.bio,
        meetingPurpose: otherProfile.meetingPurpose,
        currentTag: otherProfile.currentTag,
      },
      allMessages,
      otherUserId,
      locationContext,
    )
      .then(async (replyText) => {
        await prisma.message.create({
          data: {
            matchId,
            senderId: otherUserId,
            text: replyText,
          },
        });
        // 入力中ステータスをクリア
        await prisma.match.update({
          where: { id: matchId },
          data: { typingUserId: null, typingAt: null },
        });
      })
      .catch((err) => {
        console.error("Gemini reply error:", err);
        // エラー時もtypingをクリア
        prisma.match.update({
          where: { id: matchId },
          data: { typingUserId: null, typingAt: null },
        }).catch(() => {});
      });
  }

  return NextResponse.json({ message });
}
