import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

// POST: 合言葉検証 → 一致でverified=true
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { matchId, passcode } = await request.json();
  if (!matchId || passcode == null) {
    return NextResponse.json({ error: "matchId and passcode are required" }, { status: 400 });
  }

  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match || (match.requesterId !== user.id && match.receiverId !== user.id)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (match.status !== "ACCEPTED") {
    return NextResponse.json({ error: "Match is not accepted" }, { status: 409 });
  }

  if (match.passcode !== Number(passcode)) {
    return NextResponse.json({ error: "合言葉が一致しません", verified: false }, { status: 400 });
  }

  await prisma.match.update({
    where: { id: matchId },
    data: { verified: true },
  });

  return NextResponse.json({ verified: true });
}
