import { useState, useEffect, useRef } from "react";
import "./App.css";

const API = import.meta.env.VITE_API_URL || "/api";
const MESSAGE_LENGTH_LIMIT = 20_000;

const PERSONAS = [
  { id: "piyush", label: "Piyush" },
  { id: "hitesh", label: "Hitesh" },
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
  const [persona, setPersona] = useState(PERSONAS[0].id);
  const [convId, setConvId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    createConversation(persona)
      .then((id) => {
        setConvId(id);
        setLoading(false);
      })
      .catch(() => setError("Failed to start conversation"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const switchPersona = async (next) => {
    if (next === persona || loading || sending) return;
    setLoading(true);
    setError(null);
    setMessages([]);
    setInput("");
    try {
      const id = await createConversation(next);
      setConvId(id);
      setPersona(next);
    } catch {
      setError("Failed to switch persona");
    } finally {
      setLoading(false);
    }
  };

  const autosize = (el) => {
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  };

  const send = async (e) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending || text.length > MESSAGE_LENGTH_LIMIT) return;

    setInput("");
    autosize(textareaRef.current);
    setMessages((m) => [...m, { role: "user", content: text }]);
    setSending(true);
    setError(null);

    try {
      const r = await fetch(`${API}/conversations/${convId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      setMessages((m) => [...m, { role: "assistant", content: data.reply }]);
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(e);
    }
  };

  const overLimit = input.length > MESSAGE_LENGTH_LIMIT;

  return (
    <div className="chat">
      <header className="header">
        <div className="persona-switch" role="tablist" aria-label="Choose persona">
          {PERSONAS.map((p) => (
            <button
              key={p.id}
              role="tab"
              aria-selected={persona === p.id}
              className={persona === p.id ? "active" : ""}
              onClick={() => switchPersona(p.id)}
              disabled={loading || sending}
            >
              {p.label}
            </button>
          ))}
        </div>
      </header>

      <div className="messages">
        {loading ? (
          <div className="loading">Starting conversation...</div>
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
