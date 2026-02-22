Claude.md: RightNow (ライトナウ)

#環境再現性のため、dockerを用いること。

0. プロジェクト概要
「選ぶ」を省き、「会う」を加速させるオンデマンド・マッチング PWA。
ユーザーが「オンライン」の間だけ地図上に表示され、半径1km以内の同じ目的を持つユーザーと30秒以内にマッチングを成立させ、即合流することを目的とする。
1. コア・コンセプト
On-Demand: メッセージのやり取りを排除。今、この瞬間の「目的」が一致する人と繋がる。
Real-time Map: Uberのように、相手が近づいてくる様子を可視化。
Ephemeral: チャットは合流まで（最大30分）。データはマッチ終了と共に揮発させる。
2. 技術スタック
Frontend: Next.js 15+ (App Router)
Styling: Sass (SCSS) + CSS Modules
Backend/DB: Supabase (PostgreSQL / PostGIS, Realtime, Auth, Storage)
Map: Mapbox GL JS (マーカー移動のアニメーション重視)
Deployment: Vercel (PWA: next-pwa)
3. コードスタイル & 開発ルール
TypeScript: Strictモード必須。型定義のない any は禁止。
Sass (SCSS):
基本は CSS Modules (*.module.scss) を使用し、スコープを閉じ込める。
styles/variables.scss にブランドカラー、Z-index、ブレークポイントを定義し、各コンポーネントで @use する。
命名規則は BEM を推奨（例: .map-container__marker--active）。
Realtime Logic: 位置情報の更新は supabase_realtime の broadcast を活用。DBへの書き込み頻度を抑える。
Privacy: 地図上の座標は必ず fuzzing（20-30mのランダムなズレ）を適用してレンダリングする。
4. アーキテクチャ
/app: ページ、レイアウト、サーバーアクション
/components: 機能単位のコンポーネント（各フォルダに .tsx と .module.scss を同封）
/styles: グローバル設定、ミックスイン、変数定義
/lib/supabase: クライアント初期化、Realtime 購読ロジック
/hooks: useLocation, useMatch 等のカスタムフック
/prisma: スキーマ定義（PostGIS 拡張を使用）
5. データベース・スキーマ (Prisma 抜粋)
Code snippet
model Profile {
  id           String   @id @default(uuid())
  nickname     String
  isOnline     Boolean  @default(false)
  currentTag   String?  // 'work', 'lunch', 'walk'
  lastLocation Unsupported("geography(Point, 4326)")?
  rating       Float    @default(5.0)
}

model Match {
  id           String   @id @default(uuid())
  requesterId  String
  receiverId   String
  status       MatchStatus @default(PENDING)
  expiresAt    DateTime // created_at + 30sec
}


6. コマンド
pnpm dev: 開発サーバー起動
pnpm build: PWA マニフェストを含むビルド実行
pnpm db:push: Supabase (PostGIS) へのスキーマ反映
pnpm bot:spawn: デモ用仮想ユーザーの生成スクリプト実行
7. 注意事項
Battery: watchPosition はメインマップが表示されている間のみアクティブにすること。
Sass Variables: モバイルの「Safe Area」を考慮した変数を variables.scss に必ず含めること。
UX: 30秒タイマーは視覚的な「緊迫感」を出すため、SCSSの animation を活用したプログレスバーで実装する。
