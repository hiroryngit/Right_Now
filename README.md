# RightNow（ライトナウ）

> 「選ぶ」を省き、「会う」を加速させる **オンデマンド・マッチング PWA**

RightNow は、メッセージのやり取りで時間をかける従来のマッチングアプリとは異なり、**「今、この瞬間」会いたい目的が一致する近くの人と、最短数十秒でマッチングして即合流する**ことに特化したリアルタイム位置情報マッチングサービスです。

地図上には自分の周囲でオンラインになっているユーザーが表示され、ワンタップで「マッチング開始」すると、独自のアルゴリズムが**双方向の相性（相互マッチ）**を計算して相手を提示します。マッチが成立するとその場限りの一時チャットが開き、**QR コード／合言葉による「合流認証」**で実際に会えたことを確認します。チャットは最大 10 分で揮発します。

---

## 目次

- [コア・コンセプト](#コアコンセプト)
- [主な機能](#主な機能)
- [技術スタック](#技術スタック)
- [ディレクトリ構成](#ディレクトリ構成)
- [データモデル](#データモデル)
- [マッチングアルゴリズム（詳細）](#マッチングアルゴリズム詳細)
- [アプリケーションの状態遷移](#アプリケーションの状態遷移)
- [API リファレンス](#api-リファレンス)
- [位置情報とリアルタイム](#位置情報とリアルタイム)
- [AI デモユーザー](#ai-デモユーザー)
- [合流認証（QR / 合言葉）](#合流認証qr--合言葉)
- [認証とセッション](#認証とセッション)
- [セットアップ](#セットアップ)
- [環境変数](#環境変数)
- [コマンド一覧](#コマンド一覧)
- [Docker](#docker)
- [設計上の注意・制約](#設計上の注意制約)

---

## コア・コンセプト

| コンセプト | 内容 |
| --- | --- |
| **On-Demand** | 事前のメッセージ往復を排除。今この瞬間の「目的」が一致する人と直接つながる。 |
| **Real-time Map** | 自分の周囲のオンラインユーザーを地図上に可視化。相手が近づいてくる様子が見える。 |
| **Ephemeral（揮発性）** | マッチ後のチャットは合流まで（最大 10 分）。会えたら役目を終える一時的な接点。 |
| **Mutual Match（相互マッチ）** | 「自分が会いたい」だけでなく「相手も自分に会いたい」が両立した時だけマッチ成立。 |

---

## 主な機能

- 🗺️ **リアルタイム地図表示** — Mapbox GL JS によるダークテーマの地図。自分の現在地と周囲のオンラインユーザーをマーカー表示。
- 🎯 **オンデマンド・マッチング** — ワンタップでオンライン化し、相互マッチ判定アルゴリズムが相手を提示。
- ⏱️ **30 秒マッチタイマー** — マッチ提示から承認まで 30 秒の制限時間。緊迫感のあるプログレスバー表示。
- 🤝 **承認 / 拒否フロー** — 双方が承認して初めて成立。受信側が承認すると即成立、送信側は相手の応答を待つ。
- 💬 **一時チャット** — 成立後に最大 10 分間のチャットが開放。タイピングインジケータ・既読表示つき。
- 🔐 **合流認証** — マッチ相手と実際に会えたことを QR コードまたは 4 桁の合言葉で相互確認。
- 🧑‍💻 **プロフィール設定** — 性別・年齢・居住地・職業・学歴・目的・興味・自己紹介、および希望条件（性別 / 年齢 / 目的 / 距離）。
- ⭐ **5 段階レーティング** — ユーザー評価がマッチング確率と候補数に影響する。
- 🤖 **AI デモユーザー** — 管理者が地図上に仮想ユーザーを生成。Gemini によりチャットで自然な自動返信を行う。
- 🛠️ **管理者パネル** — `app_metadata.role = admin` のユーザーにのみ表示。デモユーザーの追加・削除。
- 📱 **PWA 対応** — `manifest.json` によりホーム画面へインストール可能。モバイルファースト UI（Safe Area 対応）。

---

## 技術スタック

| レイヤー | 採用技術 |
| --- | --- |
| フレームワーク | **Next.js 16**（App Router / React 19 / React Compiler 有効） |
| 言語 | **TypeScript**（strict） |
| スタイリング | **Sass (SCSS) + CSS Modules**（`*.module.scss`、変数 / ミックスインを `@use`） |
| 地図 | **Mapbox GL JS** v3 |
| 認証 / DB / リアルタイム | **Supabase**（Auth, PostgreSQL + **PostGIS**, Realtime） |
| ORM | **Prisma** 6（`postgis` 拡張、`Unsupported("geography(Point, 4326)")`） |
| AI | **Google Generative AI**（`gemini-2.0-flash`） |
| QR | `qrcode.react`（生成）/ `jsqr`（カメラ読み取り） |
| アイコン | `lucide-react` |
| デプロイ | Vercel 想定 / Docker 同梱 |

主要な依存（`package.json` 抜粋）:

```jsonc
"next": "16.1.6",
"react": "19.2.3",
"@prisma/client": "^6.4.1",
"@supabase/ssr": "^0.8.0",
"@supabase/supabase-js": "^2.49.1",
"mapbox-gl": "^3.9.4",
"@google/generative-ai": "^0.24.1",
"qrcode.react": "^4.2.0",
"jsqr": "^1.4.0",
"lucide-react": "^0.575.0"
```

---

## ディレクトリ構成

```
right_now/
├─ prisma/
│  └─ schema.prisma            # Profile / Match / Message モデル（PostGIS 拡張）
├─ public/
│  ├─ manifest.json            # PWA マニフェスト
│  └─ icon-192.png / icon-512.png
├─ src/
│  ├─ app/                     # App Router（ページ・レイアウト・API ルート）
│  │  ├─ layout.tsx            # ルートレイアウト（メタ情報・ビューポート・テーマカラー）
│  │  ├─ page.tsx              # メイン画面（地図 + マッチングフロー）
│  │  ├─ login/                # ログイン
│  │  ├─ profile/              # プロフィール表示・編集
│  │  ├─ history/              # マッチ履歴
│  │  ├─ map/                  # 地図ページ
│  │  ├─ chat/[id]/            # 一時チャット（QR/合言葉認証つき）
│  │  ├─ auth/callback/        # OAuth / Magic Link コールバック
│  │  └─ api/                  # ルートハンドラ（後述の API リファレンス参照）
│  │     ├─ profile/           # GET/POST プロフィール upsert
│  │     ├─ location/          # POST 位置情報更新
│  │     ├─ map-users/         # GET 地図表示用オンラインユーザー
│  │     ├─ match/             # GET 現在のマッチ / POST マッチング実行
│  │     │  ├─ respond/        # POST 承認・拒否
│  │     │  ├─ verify/         # POST 合言葉検証
│  │     │  └─ history/        # GET マッチ履歴
│  │     ├─ chat/              # GET/POST メッセージ
│  │     │  └─ typing/         # POST タイピング通知
│  │     ├─ demo-users/        # POST/DELETE デモユーザー（管理者）
│  │     └─ logout/            # ログアウト
│  ├─ components/              # 機能単位コンポーネント（.tsx + .module.scss を同梱）
│  │  ├─ Map/                  # Mapbox ラッパー
│  │  ├─ MatchTimer/           # 30 秒カウントダウン
│  │  ├─ ProfileSetup/         # プロフィール初期設定モーダル
│  │  ├─ TagSelector/          # 目的タグ選択
│  │  ├─ LoginModal/           # ログインモーダル
│  │  └─ Admin/                # AdminPanel / AdminToast
│  ├─ hooks/                   # useAuth / useProfile / useLocation / useMatch / useDemoUsers
│  ├─ lib/
│  │  ├─ prisma.ts             # Prisma クライアント（シングルトン）
│  │  ├─ gemini.ts             # Gemini によるデモ返信生成
│  │  └─ supabase/             # client / server / realtime
│  ├─ constants/profile.ts     # 都道府県・市区町村・職業・興味・タグ等の選択肢
│  ├─ types/                   # 共通型（Coordinates, Profile, Gender 等）
│  ├─ styles/                  # globals / variables / mixins（SCSS）
│  └─ proxy.ts                 # Supabase セッションを更新する Middleware
├─ Dockerfile
├─ docker-compose.yml
└─ next.config.ts
```

> 設計ルール（`claude.md`）: TypeScript は strict、`any` 禁止。スタイルは CSS Modules でスコープを閉じ込め、BEM 命名を推奨。`styles/variables.scss` にブランドカラー・Z-index・ブレークポイント・Safe Area を定義し各所で `@use`。

---

## データモデル

Prisma スキーマ（`prisma/schema.prisma`）。PostgreSQL の **PostGIS 拡張**を有効化し、位置情報は `geography(Point, 4326)` 型で保持します（緯度経度 WGS84）。

### `Profile`

| フィールド | 型 | 説明 |
| --- | --- | --- |
| `id` | `String @id` | Supabase Auth のユーザー ID と一致 |
| `nickname` | `String` | 表示名 |
| `gender` | `String` | 性別（`男性`/`女性` または `man`/`woman`） |
| `age` | `String` | 年齢帯（例: `20代前半`） |
| `prefecture` | `String` | 都道府県 |
| `city` | `String?` | 市区町村（任意） |
| `occupation` | `String` | 職業 |
| `education` | `String?` | 学歴（任意） |
| `meetingPurpose` | `String?` | 会う目的（任意） |
| `bio` | `String?` | 自己紹介（任意） |
| `interests` | `String[]` | 興味タグ（任意） |
| `preferredGender` | `String` | 希望する相手の性別（`同性のみ`/`異性のみ`/`気にしない`） |
| `preferredAge` | `String?` | 希望年齢帯（任意） |
| `preferredPurpose` | `String?` | 希望する目的（任意） |
| `preferredDistance` | `Int?` | 希望距離 km（任意） |
| `isDemo` | `Boolean` | AI デモユーザーフラグ |
| `isOnline` | `Boolean` | オンライン状態 |
| `currentTag` | `String?` | 現在の募集タグ |
| `lastLocation` | `geography(Point, 4326)?` | 最終位置（PostGIS） |
| `rating` | `Float @default(5.0)` | 5 段階評価 |
| `createdAt` / `updatedAt` | `DateTime` | タイムスタンプ |

### `Match`

| フィールド | 型 | 説明 |
| --- | --- | --- |
| `id` | `String @id` | マッチ ID |
| `requesterId` / `receiverId` | `String` | リクエスト送信者 / 受信者 |
| `status` | `MatchStatus` | 後述の列挙型 |
| `expiresAt` | `DateTime` | マッチ提示の有効期限（生成 + 30 秒） |
| `passcode` | `Int?` | 合流認証用の 4 桁合言葉（成立時に生成） |
| `verified` | `Boolean` | 合流認証済みフラグ |
| `chatExpiresAt` | `DateTime?` | チャット有効期限（成立 + 10 分） |
| `typingUserId` / `typingAt` | `String?` / `DateTime?` | タイピング中ユーザーと時刻 |
| `messages` | `Message[]` | 関連メッセージ |

### `Message`

`id` / `matchId` / `senderId` / `text` / `readAt`（既読時刻）/ `createdAt`。`match` リレーションで `Match` に紐づく。

### `enum MatchStatus`

```
PENDING       提示中（応答待ち）
ACCEPTED      成立
REJECTED      拒否
EXPIRED       期限切れ
DEMO_ACCEPT   デモユーザーが「承認予定」（expiresAt 到達時に ACCEPTED へ）
DEMO_REJECT   デモユーザーが「拒否予定」（expiresAt 到達時に REJECTED へ）
```

---

## マッチングアルゴリズム（詳細）

RightNow の中核は、ユーザー同士の**双方向の会いやすさを表す確率行列**から**相互の最適ペア**を選び出すアルゴリズムです。実装は `src/app/api/match/route.ts`、理論は `logic.txt` に対応します。

### 1. 会える確率行列 P

ユーザー総数を N とし、行列 P の (i, j) 成分 `p[i][j]` を「ユーザー i にとってユーザー j に会える確率」と定義します。

```
p[i][j] = r[i] · c[i][j] · δ[i][j]
```

- `δ[i][j]` … クロネッカーのデルタ（`i = j` のとき 0、それ以外 1。＝自分自身は対象外）
- `r[i]` … ユーザー i のレーティングを正規化した値 `rating / 5.0`（0〜1.0）
- `c[i][j] = HowMatched(i, j) · random(t)` … i が求める条件を j がどれだけ満たすか × タイミングの乱数

`random(t)` は **0 か 1** をとる乱数（実装では `Math.random() < 0.5 ? 0 : 1`）。「ちょうど良いタイミングか」を確率的に表現します。

### 2. HowMatched（条件適合度）

`HowMatched(i, j)` は **絶対条件**と**加点条件**で構成され、最大 **1.0**。

**絶対条件（満たさなければ即 0）:**
- 性別: i の `preferredGender`（`同性のみ`/`異性のみ`/`気にしない`）を j が満たすか
- 年齢: i の `preferredAge` を j の `age` が満たすか（`気にしない`/未設定なら常に通過）

**加点条件（合計上限 1.0）:**

| 条件 | 加点 | 内容 |
| --- | --- | --- |
| 距離 | **+0.3** | j が i の `preferredDistance + 1km` 以内（未設定なら常に加点） |
| 目的 | **+0.3** | j の `meetingPurpose` が i の `preferredPurpose` と一致（未設定/気にしないなら常に加点） |
| プロフィール完成ボーナス | **最大 +0.4** | i の任意入力項目の入力数 × 0.05（最大 8 項目） |

ボーナス対象の任意 8 項目: `education`, `bio`, `city`, `interests`（1 つ以上）, `meetingPurpose`, `preferredAge`, `preferredPurpose`, `preferredDistance`。

> 配分は **距離(0.3) + 目的(0.3) + ボーナス(最大0.4) = 1.0**。ボーナスは基礎スコアと独立に加算されるため、条件が合わなくてもプロフィールを充実させればマッチ確率は上がる。ただしボーナスのみだと最大 0.4 にとどまり、条件が合う相手より優先されることはない。距離計算は Haversine 公式（`haversineKm`）。

### 3. 相互マッチ行列 M

P は非対称ですが、両者の積をとった行列 M は対称になります。

```
m[i][j] = p[i][j] · p[j][i]
```

ユーザー i₀ と j₀ がマッチする条件は、`m[i₀][j₀] ≠ 0` かつ **互いに相手が自分の行（列）の最大値**であること:

```
m[i₀][j₀] = max_j m[i₀][j] = max_i m[i][j₀]
```

つまり「i にとって最良の相手が j で、j にとっても最良の相手が i」という**相互最適**を満たすペアのみが候補になります。

### 4. 計算量の最適化（SymmetricMatrix）

M は対称行列なので、計算量は **O((N² − N) / 2)**。実装では `SymmetricMatrix` クラスが `(i, j)` と `(j, i)` を同一キー（`i < j ? "i,j" : "j,i"`）で管理し、必要な成分のみ**遅延計算してキャッシュ**します。距離も同様にキャッシュ。全成分を事前計算しません。

### 5. 候補数 k の決定（レーティング連動）

各ユーザーは「上位 k 人の相互マッチ」から候補を選びます。k はレーティングに反比例します:

```
k = round(3 + (5 − rating) · 1.25)
```

| rating | k |
| --- | --- |
| 5.0 | 3 |
| 4.0 | 4 |
| 3.0 | 6 |
| 1.0 | 8 |

評価が低いほど k が大きくなり、より多くの候補からマッチされやすくなります（救済的バランス調整）。

### 6. 最終選出

1. 自分の行 `M[me][*]` を計算し、非ゼロ成分を降順ソートして上位 `k(me)` を取得。
2. 各候補 j について j の行を計算し、`k(j)` 件の上位に自分が含まれていれば**相互マッチ成立**。
3. 成立した相互マッチをスコア降順で最大 **3 人**に絞り込み、その中から**システムがランダムに 1 人**を選択。
4. その相手と `Match`（`PENDING`, `expiresAt = now + 30 秒`）を生成。

> POST `/api/match` 実行時、`PENDING` 中の他ユーザー（busy）は候補から除外され、二重マッチを防ぎます。サーバーログに `=== MATCH DEBUG ===` として k・各成分・相互マッチ数を出力します。

---

## アプリケーションの状態遷移

メイン画面（`src/app/page.tsx`）は次の `AppStatus` を持ちます。

```
idle ──[マッチング開始]──▶ searching
                              │  5 秒間隔で GET（受信確認）→ POST（マッチ試行）
                              ▼
                          matched（相手プロフィールカード + 30 秒タイマー）
                          │           │
                    [承認]│           │[拒否] → searching
                          ▼
            ┌─ 受信側承認 → ACCEPTED（即成立）
            └─ 送信側承認 → waiting（2 秒間隔でポーリング）
                              │
              相手 ACCEPTED → accepted → /chat/[id] へ遷移
              相手 REJECTED/EXPIRED → 通知後 searching へ
```

- **searching**: まず GET `/api/match` で自分宛の `PENDING` を確認。無ければ POST `/api/match` で自分からマッチ試行。ラベルは「マッチングを探しています」「オンラインです」を 3 秒ごとに切替。
- **matched**: 相手のニックネーム・性別・年齢・距離・居住地・職業・タグ・目的・興味・bio をカード表示。`MatchTimer` が `expiresAt` までをカウントダウンし、期限切れで `searching` に戻る。
- **承認ロジック**: 受信者（receiver）が承認すると即 `ACCEPTED`。送信者（requester）が承認した場合は新たに 30 秒の待機に入り、相手の応答をポーリング。
- **accepted**: 成立後 `/chat/[id]` へ自動遷移。

---

## API リファレンス

すべて Next.js Route Handler（`src/app/api/**/route.ts`）。各エンドポイントは Supabase セッションでユーザーを検証し、未認証は `401` を返します。

### プロフィール `/api/profile`
- `GET` — 自分のプロフィールを返す。`app_metadata.role` から `admin`/`user` を判定して付与。
- `POST` — プロフィールを **upsert**（作成 or 更新）。

### 位置情報 `/api/location`
- `POST` `{ latitude, longitude }` — `lastLocation` を `ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography` で更新。

### 地図ユーザー `/api/map-users`
- `GET` — `isOnline = true` かつ位置を持つ**自分以外**のユーザーを `ST_X/ST_Y` で緯度経度に展開して返す。

### マッチ `/api/match`
- `GET` — 現在のアクティブなマッチ状態を返す。
  - `PENDING` / `DEMO_ACCEPT` / `DEMO_REJECT` を検索。デモ応答は `expiresAt` 到達で `ACCEPTED`/`REJECTED` に確定（成立時に `passcode` と `chatExpiresAt` を採番）。
  - 実ユーザーの `PENDING` が期限切れなら `EXPIRED` に更新。
  - 相手との距離は PostGIS `ST_Distance(...)/1000` で km 算出。
- `POST` — 前述のアルゴリズムでマッチング実行。候補から 1 人選び `PENDING`（`expiresAt = now + 30 秒`）を生成。既に `PENDING` があれば `409`。

### マッチ応答 `/api/match/respond`
- `POST` `{ matchId, action: "accept" | "reject" }` — **受信者のみ**応答可（それ以外 `403`）。
  - `accept`: `status = ACCEPTED`、4 桁 `passcode` 生成、`chatExpiresAt = now + 10 分`。
  - `reject`: `status = REJECTED`。

### 合言葉検証 `/api/match/verify`
- `POST` `{ matchId, passcode }` — `passcode` 一致で `verified = true`。不一致は `400`。

### マッチ履歴 `/api/match/history`
- `GET` — `ACCEPTED` / `EXPIRED` / `REJECTED` を最新 50 件、相手プロフィール付きで返す。

### チャット `/api/chat`
- `GET` `?matchId=` — メッセージ一覧を取得し、自分宛の未読を既読化（`readAt` 更新）。
- `POST` `{ matchId, text }` — メッセージ送信。**相手がデモユーザーなら Gemini が自動返信**を生成・保存。

### タイピング通知 `/api/chat/typing`
- `POST` `{ matchId }` — `typingUserId` / `typingAt` を更新（チャットのタイピングインジケータ用）。

### デモユーザー `/api/demo-users`（管理者用）
- `POST` `{ gender, lat, lng }` — 現在地周辺にランダムなデモプロフィールを生成（位置を fuzzing して INSERT）。
- `DELETE` `{ gender }` — 指定性別のオンラインデモユーザーを 1 人削除。

### 認証 `/api/logout`, `/auth/callback`
- `/auth/callback` `GET` — OAuth / Magic Link の `code` を `exchangeCodeForSession` でセッション化し `next` へリダイレクト。

---

## 位置情報とリアルタイム

- **取得**: `useLocation` フックが `navigator.geolocation.watchPosition`（`enableHighAccuracy: true`）で現在地を追跡。メインマップ表示中のみアクティブにし、バッテリー消費を抑制。
- **保存**: `useDemoUsers` 内で現在地を `POST /api/location` に送信し、`Profile.lastLocation`（PostGIS）を更新。
- **地図描画**: `Map`（Mapbox GL JS, `dark-v11` スタイル, zoom 15）。自分の現在地はパルスマーカー、他ユーザー / デモは性別色（女性 `#ff4d6d` / 男性 `#4d9fff`）のドット。直近位置は `localStorage` にキャッシュし、初回描画を高速化。
- **Realtime ブロードキャスト**: `lib/supabase/realtime.ts` に `subscribeToLocationBroadcast` / `broadcastLocation` / `unsubscribe` を用意。Supabase Realtime の `broadcast` を使い、DB 書き込み頻度を抑えながら位置を共有する設計。
- **プライバシー**: デモ生成・配置時に座標を fuzzing（数百 m 〜 1.5km のランダムオフセット）し、正確な座標を露出させない方針。

---

## AI デモユーザー

開発・デモ用に、地図上で動作する仮想ユーザーを生成できます（管理者のみ）。

- **生成**: `AdminPanel` から性別を指定して追加。`POST /api/demo-users` が現在地を fuzzing した座標で `Profile`（`isDemo = true`, `isOnline = true`）を INSERT。`useDemoUsers` がランダムな目的・興味・希望条件を割り当て、地図上で 2 秒ごとに**ランダムウォーク**させる。
- **マッチング**: デモユーザーも通常のアルゴリズムの対象。`DEMO_ACCEPT` / `DEMO_REJECT` 状態を使い、`expiresAt` 到達時に自動で承認/拒否を確定する仕組み。
- **AI チャット**: マッチ相手がデモの場合、`POST /api/chat` がこれまでの会話履歴を Gemini（`gemini-2.0-flash`、`src/lib/gemini.ts`）に渡し、ニックネームと bio を人格に持たせた**カジュアルな自動返信**を生成・保存します。

---

## 合流認証（QR / 合言葉）

マッチ成立後、実際に会えたかをアプリ内で相互確認できます（`src/app/chat/[id]/page.tsx`）。

1. 成立時に 4 桁の `passcode`（合言葉）が採番される。
2. チャット画面の認証カードで、自分の合言葉を **QR コード**（`passcode=XXXX`）として表示。
3. `jsqr` を使い**カメラで相手の QR を読み取る**か、合言葉を手入力して `POST /api/match/verify` で検証。
4. 一致すれば `verified = true` となり「合流確認が完了しました」を表示。
5. チャットは `chatExpiresAt`（成立 + 10 分）でカウントダウンし、期限切れ後は閲覧のみ（送信不可）。

その他、チャットは 2 秒間隔のポーリングでメッセージ・タイピング状態・既読を同期します。

---

## 認証とセッション

- **Auth**: Supabase Auth（`@supabase/ssr`）。ブラウザ側 `lib/supabase/client.ts`、サーバー側 `lib/supabase/server.ts`（Cookie ベース）。
- **セッション維持**: `src/proxy.ts` が Next.js Middleware として全リクエストで Supabase セッションをリフレッシュ（静的アセットや画像は `matcher` で除外）。
- **権限**: `app_metadata.role === "admin"` のユーザーのみ管理者パネルとデモ操作が有効。

---

## セットアップ

### 前提
- Node.js 20+ / pnpm
- Supabase プロジェクト（PostgreSQL + PostGIS 拡張を有効化）
- Mapbox アクセストークン
- Google Generative AI（Gemini）API キー

### 手順

```bash
# 1. 依存をインストール（postinstall で prisma generate が走る）
pnpm install

# 2. 環境変数を設定（下記参照）
cp .env_example .env
# .env を編集

# 3. PostGIS を含むスキーマを Supabase へ反映
pnpm db:push

# 4. 開発サーバー起動
pnpm dev
# http://localhost:3000
```

> Supabase 側で PostGIS 拡張（`create extension if not exists postgis;`）を有効にしておく必要があります。Prisma スキーマは `extensions = [postgis]` を宣言しています。

---

## 環境変数

`.env`（`.env_example` をベースに作成）。

| 変数 | 用途 |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase プロジェクト URL（クライアント/サーバー両用） |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 匿名キー |
| `SUPABASE_SERVICE_ROLE_KEY` | サーバー側の特権操作用サービスロールキー |
| `DATABASE_URL` | Prisma 用接続文字列（プール経由） |
| `DIRECT_URL` | Prisma マイグレーション用の直接接続 |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | Mapbox GL JS のアクセストークン |
| `GEMINI_API_KEY` | Google Generative AI（Gemini）API キー |

> `.env_example` には Supabase / DB 系のみ記載されています。地図と AI を動かすには `NEXT_PUBLIC_MAPBOX_TOKEN` と `GEMINI_API_KEY` の追加が必要です。

---

## コマンド一覧

| コマンド | 内容 |
| --- | --- |
| `pnpm dev` | 開発サーバー起動 |
| `pnpm build` | `prisma generate` 後に本番ビルド |
| `pnpm start` | 本番サーバー起動 |
| `pnpm lint` | ESLint |
| `pnpm db:push` | Prisma スキーマを DB へ反映 |
| `pnpm db:generate` | Prisma クライアント生成 |

---

## Docker

リポジトリ直下に `Dockerfile` と `docker-compose.yml` を同梱しています（環境再現性のため Docker 利用を推奨）。

```bash
docker compose up --build
```

---

## 設計上の注意・制約

- **バッテリー**: `watchPosition` はメインマップ表示中のみアクティブにする方針。
- **Safe Area**: モバイルのセーフエリアを考慮した変数を `styles/variables.scss` に定義。
- **タイマー UX**: 30 秒タイマーは緊迫感を出すため SCSS アニメーションのプログレスバーで実装。
- **同期方式**: マッチ確認・チャットは現状ポーリング（マッチ確認 5 秒 / チャット 2 秒）。`lib/supabase/realtime.ts` に Realtime broadcast の土台があり、低レイテンシ化の発展余地あり。
- **データの揮発性**: チャットは合流まで（最大 10 分）という一時的接点として設計。
- **性別表記の正規化**: `男性/女性` と `man/woman` が混在しうるため、マッチング側で `normalizeGender` により吸収しています。

---

<sub>RightNow — 「会う」までの距離を、最短に。</sub>
