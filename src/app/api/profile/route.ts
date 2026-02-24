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
  const { nickname, gender, age, prefecture, city, occupation, education, meetingPurpose, currentTag, bio, interests, preferredGender } = body;

  // Required field validation
  if (!nickname || typeof nickname !== "string" || nickname.trim().length === 0) {
    return NextResponse.json({ error: "ニックネームは必須です" }, { status: 400 });
  }
  if (!gender) {
    return NextResponse.json({ error: "性別は必須です" }, { status: 400 });
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
  if (!currentTag) {
    return NextResponse.json({ error: "マッチングタグは必須です" }, { status: 400 });
  }
  if (!preferredGender) {
    return NextResponse.json({ error: "相手の性別は必須です" }, { status: 400 });
  }

  const data = {
    nickname: nickname.trim(),
    gender,
    age,
    prefecture,
    city: city || null,
    occupation,
    education: education || null,
    meetingPurpose: meetingPurpose || null,
    currentTag: currentTag || null,
    bio: bio || null,
    interests: Array.isArray(interests) ? interests : [],
    preferredGender,
  };

  const profile = await prisma.profile.upsert({
    where: { id: user.id },
    create: { id: user.id, ...data },
    update: data,
  });

  return NextResponse.json({ profile });
}
