import { useState, useEffect, useRef } from "react";
import "./App.css";
import piyushAvatar from "./assets/personas/piyush.jpg";
import hiteshAvatar from "./assets/personas/hitesh.jpg";

const API = import.meta.env.VITE_API_URL || "/api";
const MESSAGE_LENGTH_LIMIT = 20_000;

const PERSONAS = [
  { id: "piyush", label: "Piyush Garg", avatar: piyushAvatar, tagline: "Full-stack dev & educator" },
  { id: "hitesh", label: "Hitesh Choudhary", avatar: hiteshAvatar, tagline: "Founder, Chai aur Code" },
];

async function createConversation(persona) {
  const r = await fetch(`${API}/conversations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ persona }),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || "Failed to start conversation");
  return data.id;
}

function App() {
  const [activePersona, setActivePersona] = useState(PERSONAS[0].id);
  const [conversations, setConversations] = useState({});
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [sendingMap, setSendingMap] = useState({});
  const [errorMap, setErrorMap] = useState({});
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    Promise.all(
      PERSONAS.map((p) =>
        createConversation(p.id).then((id) => [p.id, { id, messages: [] }]),
      ),
    )
      .then((entries) => {
        setConversations(Object.fromEntries(entries));
        setLoading(false);
      })
      .catch(() => setLoadError("Failed to start conversations"));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversations, activePersona]);

  const switchPersona = (next) => {
    setActivePersona(next);
  };

  const autosize = (el) => {
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  };

  const send = async (e) => {
    e.preventDefault();
    const persona = activePersona;
    const text = input.trim();
    if (!text || sendingMap[persona] || text.length > MESSAGE_LENGTH_LIMIT) return;

    const convId = conversations[persona].id;

    setInput("");
    autosize(textareaRef.current);
    setConversations((c) => ({
      ...c,
      [persona]: {
        ...c[persona],
        messages: [...c[persona].messages, { role: "user", content: text }],
      },
    }));
    setSendingMap((s) => ({ ...s, [persona]: true }));
    setErrorMap((e) => ({ ...e, [persona]: null }));

    try {
      const r = await fetch(`${API}/conversations/${convId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      setConversations((c) => ({
        ...c,
        [persona]: {
          ...c[persona],
          messages: [...c[persona].messages, { role: "assistant", content: data.reply }],
        },
      }));
    } catch (err) {
      setErrorMap((e) => ({ ...e, [persona]: err.message }));
    } finally {
      setSendingMap((s) => ({ ...s, [persona]: false }));
    }
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(e);
    }
  };

  const overLimit = input.length > MESSAGE_LENGTH_LIMIT;
  const messages = conversations[activePersona]?.messages ?? [];
  const sending = sendingMap[activePersona] ?? false;
  const error = loadError ?? errorMap[activePersona];
  const currentPersona = PERSONAS.find((p) => p.id === activePersona);

  return (
    <div className="chat">
      <header className="header">
        <div className="brand">
          <span className="brand-title">Learn Tech</span>
          <span className="brand-sub">from Piyush Garg &amp; Hitesh Choudhary</span>
        </div>
        <div className="persona-switch" role="tablist" aria-label="Choose persona">
          {PERSONAS.map((p) => (
            <button
              key={p.id}
              role="tab"
              aria-selected={activePersona === p.id}
              className={activePersona === p.id ? "active" : ""}
              onClick={() => switchPersona(p.id)}
              disabled={loading}
            >
              <img src={p.avatar} alt="" className="avatar" />
              <span>{p.label}</span>
            </button>
          ))}
        </div>
      </header>

      <div className="messages">
        {loading ? (
          <div className="loading">Starting conversations...</div>
        ) : messages.length === 0 ? (
          <div className="empty-state">
            <img src={currentPersona.avatar} alt="" className="empty-avatar" />
            <h2>{currentPersona.label}</h2>
            <p>{currentPersona.tagline}</p>
            <p className="empty-hint">Say hi to start the conversation.</p>
          </div>
        ) : (
          <>
            {messages.map((m, i) => (
              <div key={i} className={`msg ${m.role}`}>
                {m.content}
              </div>
            ))}
            {sending && <div className="msg assistant thinking">...</div>}
          </>
        )}
        {error && <div className="error">{error}</div>}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={send} className="input-bar">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            autosize(e.target);
          }}
          onKeyDown={onKeyDown}
          placeholder="Say something..."
          maxLength={MESSAGE_LENGTH_LIMIT}
          rows={1}
          autoFocus
          disabled={loading}
        />
        <button type="submit" disabled={sending || loading || !input.trim() || overLimit}>
          Send
        </button>
      </form>
      {input.length > MESSAGE_LENGTH_LIMIT * 0.9 && (
        <div className={`char-count ${overLimit ? "over" : ""}`}>
          {input.length} / {MESSAGE_LENGTH_LIMIT}
        </div>
      )}
    </div>
  );
}

export default App;
