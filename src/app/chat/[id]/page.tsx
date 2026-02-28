"use client";

import { useState, useEffect, useRef } from "react"; // useRefを追加
import { useRouter, useParams } from "next/navigation";
import { QRCodeSVG } from "qrcode.react"; // QRコードライブラリをインポート
import styles from "./page.module.scss";

// メッセージの型を定義
interface Message {
  id: string;
  senderId: string;
  text: string;
  timestamp: Date;
}

export default function ChatPage() {
  const router = useRouter();
  const params = useParams();
  const matchId = params.id as string;

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [timeLeft, setTimeLeft] = useState(600);
  const [passcode] = useState(Math.floor(1000 + Math.random() * 9000));

  // タイマー処理（既存通り）
  useEffect(() => {
    if (timeLeft <= 0) {
      router.push("/");
      return;
    }
    const timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft, router]);

  // メッセージ送信関数
  const handleSendMessage = () => {
    if (!inputText.trim()) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      senderId: "me", // 実際はAuthのユーザーID
      text: inputText,
      timestamp: new Date(),
    };

    setMessages([...messages, newMessage]);
    setInputText("");
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className={styles.chatRoot}>
      <header className={styles.chatHeader}>
        <div className={styles.timerBox}>
          <span className={styles.timerLabel}>合流まであと</span>
          <span className={styles.time}>{formatTime(timeLeft)}</span>
        </div>
      </header>

      <main className={styles.messageArea}>
        <div className={styles.systemInfo}>
          <p>マッチング成立！10分以内に合流してください。</p>
        </div>

        {/* ── 追記：メッセージリストの表示 ── */}
        <div className={styles.messageList}>
          {messages.map((msg) => (
            <div key={msg.id} className={styles.myMessageBubble}>
              {msg.text}
            </div>
          ))}
        </div>
      </main>

      <footer className={styles.chatFooter}>
        <div className={styles.authCard}>
          <p className={styles.authTitle}>合流認証システム</p>
          <div className={styles.qrSection}>
            {/* ── 修正：本物のQRコードを表示 ── */}
            <div className={styles.qrCodeWrapper}>
              <QRCodeSVG 
                value={`https://your-app.com/verify/${matchId}`} // 会った時に読み取るURL
                size={120}
                bgColor={"#ffffff"}
                fgColor={"#000000"}
                level={"L"}
                includeMargin={true}
              />
            </div>
          </div>
          <div className={styles.passSection}>
            <span className={styles.passLabel}>合言葉</span>
            <span className={styles.passValue}>{passcode}</span>
          </div>
        </div>

        <div className={styles.inputWrapper}>
          <input 
            type="text" 
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
            placeholder="メッセージを入力..." 
            className={styles.chatInput} 
          />
          <button onClick={handleSendMessage} className={styles.sendBtn}>送信</button>
        </div>
      </footer>
    </div>
  );
}