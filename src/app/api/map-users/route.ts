import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

// マップ表示用：位置情報を持つオンラインユーザーを返す（自分自身は除外）
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const myId = user?.id ?? "";

  const rows: { id: string; nickname: string; gender: string; is_demo: boolean; lat: number; lng: number }[] = await prisma.$queryRaw`
    SELECT id, nickname, gender, "isDemo" AS is_demo,
      ST_Y("lastLocation"::geometry) AS lat,
      ST_X("lastLocation"::geometry) AS lng
    FROM "Profile"
    WHERE "lastLocation" IS NOT NULL
      AND "isOnline" = true
      AND id != ${myId}
  `;

  return NextResponse.json({ users: rows });
}
