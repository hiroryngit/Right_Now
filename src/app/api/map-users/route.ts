import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// マップ表示用：位置情報を持つ全ユーザーを返す
export async function GET() {
  const rows: { id: string; nickname: string; gender: string; is_demo: boolean; lat: number; lng: number }[] = await prisma.$queryRaw`
    SELECT id, nickname, gender, "isDemo" AS is_demo,
      ST_Y("lastLocation"::geometry) AS lat,
      ST_X("lastLocation"::geometry) AS lng
    FROM "Profile"
    WHERE "lastLocation" IS NOT NULL
  `;

  return NextResponse.json({ users: rows });
}
