import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isAdmin = user.email?.includes("+admin@") ?? false;

  let profile = await prisma.profile.findUnique({
    where: { id: user.id },
  });

  // 管理者アカウントでプロフィールがない場合は自動作成
  if (!profile && isAdmin) {
    try {
      profile = await prisma.profile.create({
        data: {
          id: user.id,
          nickname: "Admin",
          gender: "man",
          age: "20代",
          prefecture: "東京都",
          city: null,
          occupation: "エンジニア",
          interests: [],
          preferredGender: "both",
          preferredAge: "気にしない",
          preferredPurpose: "気にしない",
          currentTag: "管理者",
          meetingPurpose: "管理",
          bio: "管理者アカウントです",
        },
      });
    } catch (e) {
      console.error("管理者プロフィール自動作成に失敗:", e);
    }
  }

  return NextResponse.json({
    profile: profile ? { ...profile, role: isAdmin ? "admin" : "user", isDemo: false } : null,
  });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { nickname, gender, age, prefecture, city, occupation, education, meetingPurpose, currentTag, bio, interests, preferredGender, preferredAge, preferredPurpose } = body;

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
  if (!preferredAge) {
    return NextResponse.json({ error: "希望年齢は必須です" }, { status: 400 });
  }
  if (!preferredPurpose) {
    return NextResponse.json({ error: "出会う目的の希望は必須です" }, { status: 400 });
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
    preferredAge,
    preferredPurpose,
  };

  const profile = await prisma.profile.upsert({
    where: { id: user.id },
    create: { id: user.id, ...data },
    update: data,
  });

  const isAdmin = user.email?.includes("+admin@") ?? false;

  return NextResponse.json({
    profile: { ...profile, role: isAdmin ? "admin" : "user", isDemo: false },
  });
}
