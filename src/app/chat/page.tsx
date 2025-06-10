"use client";

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";

export default function Chat() {
  const [history, setHistory] = useState([
    { role: "system", content: "你可以开始和我对话啦！" },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 滚动到底部
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history, response, isLoading]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    setIsLoading(true);
    setResponse("");
    setHistory((prev) => [...prev, { role: "user", content: input }]);
    setInput("");

    // Allow chat backend URL to be configured via environment variable or fallback to default
    const chatUrl =
      process.env.NEXT_PUBLIC_CHAT_API_URL ||
      "http://localhost:8000/api/v1/rag/chat";

    const res = await fetch(chatUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: input }),
    });

    if (!res.body) {
      setIsLoading(false);
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let done = false;
    let streamed = "";
    while (!done) {
      const { value, done: doneReading } = await reader.read();
      done = doneReading;
      if (value) {
        const chunk = decoder.decode(value, { stream: !done });
        console.log("[SSE chunk received]", chunk); // 日志：收到的原始 chunk
        buffer += chunk;
        let lines = buffer.split("\n\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (line.startsWith("data:")) {
            const data = line.replace(/^data:\s*/, "");
            console.log("[SSE data line]", data); // 日志：每条 data 消息
            streamed += data;
            requestAnimationFrame(() => {
              setResponse(streamed);
              document.body.offsetHeight; // 强制 reflow，提升渲染即时性
            });
          } else {
            console.log("[SSE non-data line]", line); // 日志：非 data 行
          }
        }
      }
    }
    if (buffer && buffer.startsWith("data:")) {
      const data = buffer.replace(/^data:\s*/, "");
      streamed += data;
      requestAnimationFrame(() => {
        setResponse(streamed);
        document.body.offsetHeight;
      });
    }
    setIsLoading(false);
    setHistory((prev) => [...prev, { role: "assistant", content: streamed }]);
  }

  return (
    <div
      style={{
        maxWidth: 600,
        margin: "2rem auto",
        padding: 24,
        background: "#f7f7f8",
        borderRadius: 12,
        boxShadow: "0 2px 8px #0001",
      }}
    >
      <h2 style={{ textAlign: "center", marginBottom: 16 }}>Chat Demo</h2>
      <div
        style={{
          background: "#fff",
          borderRadius: 8,
          padding: 16,
          minHeight: 320,
          maxHeight: 480,
          overflowY: "auto",
          marginBottom: 16,
          boxShadow: "0 1px 4px #0001",
        }}
      >
        {history.map((msg, idx) => (
          <div
            key={idx}
            style={{
              display: "flex",
              flexDirection: msg.role === "user" ? "row-reverse" : "row",
              alignItems: "flex-start",
              marginBottom: 12,
            }}
          >
            <div
              style={{
                background: msg.role === "user" ? "#007aff" : "#ececec",
                color: msg.role === "user" ? "#fff" : "#222",
                borderRadius: 16,
                padding: "10px 16px",
                maxWidth: "75%",
                wordBreak: "break-word",
                fontSize: 16,
                boxShadow:
                  msg.role === "user"
                    ? "0 1px 4px #007aff22"
                    : "0 1px 4px #0001",
              }}
            >
              {msg.role === "assistant" ? (
                <ReactMarkdown>{msg.content}</ReactMarkdown>
              ) : (
                msg.content
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div
            style={{
              background: "#ececec",
              color: "#222",
              borderRadius: 16,
              padding: "10px 16px",
              maxWidth: "75%",
              wordBreak: "break-word",
              fontSize: 16,
              fontStyle: "italic",
              boxShadow: "0 1px 4px #0001",
            }}
          >
            <ReactMarkdown>{response || "AI 正在输入..."}</ReactMarkdown>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleSubmit} style={{ display: "flex", gap: 8 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="请输入你的问题..."
          style={{
            flex: 1,
            padding: 12,
            borderRadius: 8,
            border: "1px solid #ddd",
            fontSize: 16,
          }}
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          style={{
            padding: "0 20px",
            borderRadius: 8,
            background: "#007aff",
            color: "#fff",
            border: "none",
            fontSize: 16,
            fontWeight: 500,
          }}
        >
          发送
        </button>
      </form>
    </div>
  );
}
