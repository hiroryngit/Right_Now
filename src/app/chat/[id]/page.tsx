"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { ArrowLeft, Camera, X, ShieldCheck } from "lucide-react";
import styles from "./page.module.scss";

interface Message {
  id: string;
  senderId: string;
  text: string;
  createdAt: string;
  readAt: string | null;
}

export default function ChatPage() {
  const router = useRouter();
  const params = useParams();
  const matchId = params.id as string;

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [passcode, setPasscode] = useState<number | null>(null);
  const [chatExpiresAt, setChatExpiresAt] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);
  const [expired, setExpired] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [verifyInput, setVerifyInput] = useState("");
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [verifySuccess, setVerifySuccess] = useState(false);
  const [showAuthCard, setShowAuthCard] = useState(false);
  const [typingUserId, setTypingUserId] = useState<string | null>(null);
  const messageEndRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastTypingSentRef = useRef<number>(0);

  // ユーザーID取得
  useEffect(() => {
    fetch("/api/profile").then(res => res.json()).then(data => {
      if (data.profile?.id) setUserId(data.profile.id);
    }).catch(() => {});
  }, []);

  // メッセージ取得（初回＋ポーリング）
  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch(`/api/chat?matchId=${matchId}`);
      if (!res.ok) return;
      const data = await res.json();
      setMessages(data.messages ?? []);
      if (data.passcode != null) setPasscode(data.passcode);
      if (data.chatExpiresAt) setChatExpiresAt(data.chatExpiresAt);
      if (data.verified) {
        setVerified(true);
        setVerifySuccess(true);
      }
      setTypingUserId(data.typingUserId ?? null);
    } catch { /* ignore */ }
  }, [matchId]);

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 2000);
    return () => clearInterval(interval);
  }, [fetchMessages]);

  // タイマー処理
  useEffect(() => {
    if (!chatExpiresAt) return;

    const update = () => {
      const remaining = Math.floor((new Date(chatExpiresAt).getTime() - Date.now()) / 1000);
      if (remaining <= 0) {
        setExpired(true);
        setTimeLeft(0);
      } else {
        setTimeLeft(remaining);
      }
    };

    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [chatExpiresAt]);

  // 自動スクロール
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typingUserId]);

  // 入力中通知の送信
  const sendTypingNotification = useCallback(() => {
    const now = Date.now();
    if (now - lastTypingSentRef.current < 2000) return;
    lastTypingSentRef.current = now;
    fetch("/api/chat/typing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matchId }),
    }).catch(() => {});
  }, [matchId]);

  // メッセージ送信
  const handleSendMessage = async () => {
    if (!inputText.trim() || expired) return;
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId, text: inputText.trim() }),
      });
      if (res.ok) {
        setInputText("");
        fetchMessages();
      }
    } catch { /* ignore */ }
  };

  // 合言葉検証
  const handleVerify = async (code: string) => {
    try {
      const res = await fetch("/api/match/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId, passcode: Number(code) }),
      });
      const data = await res.json();
      if (data.verified) {
        setVerified(true);
        setVerifySuccess(true);
        setVerifyError(null);
        setShowCamera(false);
        stopCamera();
      } else {
        setVerifyError(data.error || "合言葉が一致しません");
      }
    } catch {
      setVerifyError("エラーが発生しました");
    }
  };

  // カメラ起動
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setShowCamera(true);

      // QRスキャン開始
      scanIntervalRef.current = setInterval(async () => {
        if (!videoRef.current || !canvasRef.current) return;
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (video.readyState !== video.HAVE_ENOUGH_DATA) return;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        // dynamic import of jsQR
        const jsQR = (await import("jsqr")).default;
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        if (code?.data) {
          // QRデータからpasscodeを抽出
          const match = code.data.match(/passcode=(\d+)/);
          if (match) {
            handleVerify(match[1]);
          }
        }
      }, 500);
    } catch {
      setVerifyError("カメラを起動できませんでした");
    }
  };

  // カメラ停止
  const stopCamera = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setShowCamera(false);
  };

  // クリーンアップ
  useEffect(() => {
    return () => {
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const isFromHistory = expired && !chatExpiresAt;

  // 既読表示すべきメッセージIDを算出（連続する自分のメッセージの最後の既読のみ）
  const lastReadMessageId = (() => {
    if (!userId) return null;
    let lastReadId: string | null = null;
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      if (msg.senderId !== userId) break;
      if (msg.readAt && !lastReadId) {
        lastReadId = msg.id;
      }
    }
    return lastReadId;
  })();

  return (
    <div className={styles.chatRoot}>
      <header className={styles.chatHeader}>
        <button className={styles.backBtn} onClick={() => router.push("/")} aria-label="戻る">
          <ArrowLeft size={20} />
        </button>
        <div className={styles.timerBox}>
          {expired ? (
            <span className={styles.timerLabel}>送信期限切れ</span>
          ) : timeLeft != null ? (
            <>
              <span className={styles.timerLabel}>合流まであと</span>
              <span className={styles.time}>{formatTime(timeLeft)}</span>
            </>
          ) : (
            <span className={styles.timerLabel}>読み込み中...</span>
          )}
        </div>
        {!expired && !verified && passcode != null ? (
          <button
            className={`${styles.backBtn} ${showAuthCard ? styles.authBtnActive : ""}`}
            onClick={() => setShowAuthCard((v) => !v)}
            aria-label="合流認証"
          >
            <ShieldCheck size={20} />
          </button>
        ) : (
          <div className={styles.headerSpacer} />
        )}
      </header>

      <main className={styles.messageArea}>
        <div className={styles.systemInfo}>
          <p>マッチング成立！{expired ? "送信期限が切れました。閲覧のみ可能です。" : "10分以内に合流してください。"}</p>
        </div>

        {verifySuccess && (
          <div className={styles.verifySuccessBanner}>合流確認が完了しました！</div>
        )}

        <div className={styles.messageList}>
          {messages.map((msg) => (
            <div key={msg.id}>
              <div
                className={msg.senderId === userId ? styles.myMessageBubble : styles.otherMessageBubble}
              >
                {msg.text}
              </div>
              {msg.id === lastReadMessageId && (
                <div className={styles.readLabel}>既読</div>
              )}
            </div>
          ))}
          {typingUserId && (
            <div className={styles.typingIndicator}>
              <div className={styles.typingDots}>
                <span />
                <span />
                <span />
              </div>
            </div>
          )}
          <div ref={messageEndRef} />
        </div>
      </main>

      <footer className={styles.chatFooter}>
        {/* 合流認証（期限内 & 未検証 & トグル表示時のみ） */}
        {!expired && !verified && passcode != null && showAuthCard && (
          <div className={styles.authCard}>
            <p className={styles.authTitle}>合流認証システム</p>

            {showCamera ? (
              <div className={styles.cameraSection}>
                <video ref={videoRef} className={styles.cameraVideo} playsInline muted />
                <canvas ref={canvasRef} style={{ display: "none" }} />
                <button className={styles.closeCameraBtn} onClick={stopCamera}>
                  <X size={20} />
                </button>
              </div>
            ) : (
              <>
                <div className={styles.qrSection}>
                  <div className={styles.qrCodeWrapper}>
                    <QRCodeSVG
                      value={`passcode=${passcode}`}
                      size={120}
                      bgColor="#ffffff"
                      fgColor="#000000"
                      level="L"
                      includeMargin={true}
                    />
                  </div>
                </div>
                <button className={styles.cameraBtn} onClick={startCamera}>
                  <Camera size={18} />
                  <span>相手のQRを読み取る</span>
                </button>
              </>
            )}

            <div className={styles.passSection}>
              <span className={styles.passLabel}>合言葉</span>
              <span className={styles.passValue}>{passcode}</span>
            </div>

            <div className={styles.verifyInputSection}>
              <input
                type="number"
                value={verifyInput}
                onChange={(e) => setVerifyInput(e.target.value)}
                placeholder="相手の合言葉を入力"
                className={styles.verifyInput}
              />
              <button
                className={styles.verifyBtn}
                onClick={() => handleVerify(verifyInput)}
                disabled={!verifyInput.trim()}
              >
                確認
              </button>
            </div>
            {verifyError && <p className={styles.verifyError}>{verifyError}</p>}
          </div>
        )}

        {/* メッセージ入力（期限内のみ） */}
        {!expired ? (
          <div className={styles.inputWrapper}>
            <input
              type="text"
              value={inputText}
              onChange={(e) => {
                setInputText(e.target.value);
                if (e.target.value.trim()) {
                  sendTypingNotification();
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="メッセージを入力..."
              className={styles.chatInput}
            />
            <button onClick={handleSendMessage} className={styles.sendBtn}>送信</button>
          </div>
        ) : (
          <div className={styles.expiredNotice}>
            <p>送信期限が切れました</p>
          </div>
        )}
      </footer>
    </div>
  );
}
