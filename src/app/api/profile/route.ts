import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await prisma.profile.findUnique({
    where: { id: user.id },
  });

  return NextResponse.json({ profile });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { nickname, age, prefecture, city, occupation, education, meetingPurpose, bio, interests, preferredGender } = body;

  // Required field validation
  if (!nickname || typeof nickname !== "string" || nickname.trim().length === 0) {
    return NextResponse.json({ error: "ニックネームは必須です" }, { status: 400 });
  }
  if (!age) {
    return NextResponse.json({ error: "年齢は必須です" }, { status: 400 });
  }
  if (!prefecture) {
    return NextResponse.json({ error: "居住地は必須です" }, { status: 400 });
  }
  if (!occupation) {
    return NextResponse.json({ error: "職業は必須です" }, { status: 400 });
  }
  if (!preferredGender) {
    return NextResponse.json({ error: "相手の性別は必須です" }, { status: 400 });
  }

  const profile = await prisma.profile.create({
    data: {
      id: user.id,
      nickname: nickname.trim(),
      age,
      prefecture,
      city: city || null,
      occupation,
      education: education || null,
      meetingPurpose: meetingPurpose || null,
      bio: bio || null,
      interests: Array.isArray(interests) ? interests : [],
      preferredGender,
    },
  });

  return NextResponse.json({ profile });
}
