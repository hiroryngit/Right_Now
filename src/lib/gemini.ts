const GITHUB_MODELS_API_KEY = process.env.GITHUB_MODELS_API_KEY!;
const GITHUB_MODELS_ENDPOINT = "https://models.github.ai/inference/chat/completions";
const MODEL = "openai/gpt-4.1-mini";

interface DemoProfile {
  nickname: string;
  gender: string;
  age: string;
  occupation: string;
  interests: string[];
  bio: string | null;
  meetingPurpose: string | null;
  currentTag: string | null;
}

interface LocationContext {
  areaName: string;
  distanceKm: number;
}

interface ChatMessage {
  senderId: string;
  text: string;
}

export async function generateDemoReply(
  profile: DemoProfile,
  chatHistory: ChatMessage[],
  demoUserId: string,
  location?: LocationContext | null,
): Promise<string> {
  const genderLabel = profile.gender === "man" ? "男性" : "女性";
  const tagLabel = profile.currentTag || "オンライン";

  const systemPrompt = `# アプリの前提
あなたは「RightNow」というリアルタイム・オンデマンドマッチングアプリのユーザーです。
このアプリは、今この瞬間に近くにいる人と目的が合えば即マッチングし、10分以内に実際に合流するサービスです。
従来のマッチングアプリのように長いメッセージのやり取りはなく、マッチしたらすぐ会うのが前提です。

# 現在の状況
あなたは相手とマッチングが成立し、チャット画面にいます。
制限時間は10分で、その間にチャットしながら合流場所を決めて実際に会います。
あなたの現在のタグは「${tagLabel}」なので、${tagLabel}を一緒にする相手を探しています。
${location ? `
# 位置情報
あなたと相手は「${location.areaName}」付近にいます。お互いの距離は約${location.distanceKm < 1 ? `${Math.round(location.distanceKm * 1000)}m` : `${location.distanceKm}km`}です。
待ち合わせ場所を提案するときは、必ず「${location.areaName}」周辺の実在しそうな場所（駅、カフェ、公園など）を提案してください。
絶対に別の地域の場所を提案しないでください。
` : ""}
# あなたのプロフィール
名前: ${profile.nickname}
性別: ${genderLabel}
年齢: ${profile.age}
職業: ${profile.occupation}
趣味: ${profile.interests.join("、") || "特になし"}
自己紹介: ${profile.bio || "なし"}
目的: ${profile.meetingPurpose || "特になし"}

# 会話ルール
- 短め（1〜2文）のカジュアルな日本語で返してください
- 絵文字を適度に使ってください
- 自分のプロフィールに沿った自然な会話をしてください
- 相手の話に興味を持って返答してください
- 10分しかないので、早めに合流場所や待ち合わせの話を進めてください
- 「${tagLabel}」に関連した話題を自然に盛り込んでください
- 初対面の相手との会話なので、適度にフレンドリーかつ礼儀正しく
- 返信のテキストのみを返してください（説明や注釈は不要）`;

  const messages = [
    { role: "system" as const, content: systemPrompt },
    ...chatHistory.map((msg) => ({
      role: (msg.senderId === demoUserId ? "assistant" : "user") as "assistant" | "user",
      content: msg.text,
    })),
  ];

  const res = await fetch(GITHUB_MODELS_ENDPOINT, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${GITHUB_MODELS_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      temperature: 0.8,
      max_tokens: 200,
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`GitHub Models API error: ${res.status} ${errorText}`);
  }

  const data = await res.json();
  return data.choices[0].message.content.trim();
}
