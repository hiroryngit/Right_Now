import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

// 管理者チェック
async function getAdminUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const isAdmin = user.email?.includes("+admin@") ?? false;
  return isAdmin ? user : null;
}

// デモユーザー一覧取得（誰でも取得可能）
export async function GET() {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT id, nickname, gender, ST_Y("lastLocation"::geometry) AS lat, ST_X("lastLocation"::geometry) AS lng FROM "Profile" WHERE "isDemo" = true AND "lastLocation" IS NOT NULL`
  ) as { id: string; nickname: string; gender: string; lat: number; lng: number }[];

  return NextResponse.json({ users: rows });
}

// デモユーザー追加（管理者のみ）
export async function POST(request: Request) {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { id, nickname, gender, currentTag, meetingPurpose, bio, lat, lng } = body;

  // プロフィール作成
  await prisma.profile.create({
    data: {
      id,
      nickname,
      gender,
      age: "20代",
      prefecture: "東京都",
      city: "渋谷区",
      occupation: "会社員",
      interests: ["旅行", "グルメ"],
      preferredGender: "both",
      isDemo: true,
      isOnline: true,
      currentTag: currentTag || null,
      meetingPurpose: meetingPurpose || null,
      bio: bio || null,
    },
  });

  // 座標を保存
  await prisma.$executeRawUnsafe(
    `UPDATE "Profile" SET "lastLocation" = ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography WHERE id = $3`,
    lng, lat, id
  );

  return NextResponse.json({ success: true });
}

// デモユーザー削除（管理者のみ）
export async function DELETE(request: Request) {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await request.json();
  await prisma.profile.deleteMany({ where: { id, isDemo: true } });

  return NextResponse.json({ success: true });
}
