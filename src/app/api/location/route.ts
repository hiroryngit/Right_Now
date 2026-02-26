import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

// ログインユーザーの位置情報を保存
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { lat, lng } = await request.json();

  if (typeof lat !== "number" || typeof lng !== "number") {
    return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });
  }

  await prisma.$executeRaw`
    UPDATE "Profile"
    SET "lastLocation" = ST_SetSRID(ST_MakePoint(${lng}::float, ${lat}::float), 4326)::geography,
        "isOnline" = true
    WHERE id = ${user.id}
  `;

  return NextResponse.json({ success: true });
}
