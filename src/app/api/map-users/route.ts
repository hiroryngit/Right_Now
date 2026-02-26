import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// マップ表示用：位置情報を持つ全ユーザーを返す
export async function GET() {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT id, nickname, gender, "isDemo" AS is_demo, ST_Y("lastLocation"::geometry) AS lat, ST_X("lastLocation"::geometry) AS lng FROM "Profile" WHERE "lastLocation" IS NOT NULL`
  ) as { id: string; nickname: string; gender: string; is_demo: boolean; lat: number; lng: number }[];

  return NextResponse.json({ users: rows });
}
