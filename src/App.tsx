import { useState, useEffect, type KeyboardEvent } from "react";
const WORKER_URL = import.meta.env.VITE_WORKER_URL;

const HISTORY_KEY = "twitch_checker_history";
const MAX_HISTORY = 5;

interface CheckResult {
  username: string;
  available: boolean;
  checkedAt: string;
}

function loadHistory(): CheckResult[] {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function saveToHistory(entry: CheckResult): CheckResult[] {
  const history = loadHistory();
  const filtered = history.filter(
    (h) => h.username.toLowerCase() !== entry.username.toLowerCase(),
  );
  const updated = [entry, ...filtered].slice(0, MAX_HISTORY);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  return updated;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isValidUsername(name: string): boolean {
  return /^[a-zA-Z0-9_]{4,25}$/.test(name);
}

export default function TwitchChecker() {
  const [username, setUsername] = useState<string>("");
  const [result, setResult] = useState<CheckResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<CheckResult[]>([]);

  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  async function checkUsername(nameOverride?: string): Promise<void> {
    const trimmed = (nameOverride ?? username).trim();
    if (!trimmed) return;

    if (!isValidUsername(trimmed)) {
      setError(
        "Usernames must be 4–25 characters: letters, numbers, and underscores only.",
      );
      setResult(null);
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch(
        `${WORKER_URL}?login=${encodeURIComponent(trimmed)}`,
      );
      if (!res.ok) throw new Error(`API error: ${res.status}`);

      const data = (await res.json()) as { exists: boolean };
      const entry: CheckResult = {
        username: trimmed,
        available: !data.exists,
        checkedAt: new Date().toISOString(),
      };

      setResult(entry);
      setHistory(saveToHistory(entry));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Network error — check your connection and try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>): void {
    if (e.key === "Enter") checkUsername();
  }

  function handleHistoryClick(h: CheckResult): void {
    setUsername(h.username);
    checkUsername(h.username);
  }

  function clearHistory(): void {
    localStorage.removeItem(HISTORY_KEY);
    setHistory([]);
  }

  return (
    <div style={styles.root}>
      <div style={styles.noise} />
      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.logoRow}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="#9147ff">
              <path d="M4.3 3L3 6.6V20h4.5V23h3.5l3-3h4l5-5V3H4.3zm15.2 11.5L17 17h-5l-3 3v-3H5V5h14.5v9.5zM17 7h-2v5h2V7zm-5 0h-2v5h2V7z" />
            </svg>
            <span style={styles.logoText}>twitch</span>
            <span style={styles.logoSub}>username checker</span>
          </div>
          <p style={styles.tagline}>
            See if your dream username is still up for grabs.
          </p>
        </div>

        {/* Search */}
        <div style={styles.card}>
          <label style={styles.label}>TWITCH USERNAME</label>
          <div style={styles.inputRow}>
            <div style={styles.inputWrapper}>
              <span style={styles.atSign}>@</span>
              <input
                style={styles.input}
                type="text"
                placeholder="enter username"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setResult(null);
                  setError(null);
                }}
                onKeyDown={handleKeyDown}
                maxLength={25}
                spellCheck={false}
                autoComplete="off"
              />
            </div>
            <button
              style={{
                ...styles.button,
                ...(loading || !username.trim() ? styles.buttonDisabled : {}),
              }}
              onClick={() => checkUsername()}
              disabled={loading || !username.trim()}
            >
              {loading ? <span style={styles.spinner} /> : "CHECK"}
            </button>
          </div>

          {error && (
            <div style={{ ...styles.banner, ...styles.bannerError }}>
              <span style={styles.bannerIcon}>⚠</span>
              <span>{error}</span>
            </div>
          )}

          {result && !error && (
            <div
              style={{
                ...styles.banner,
                ...(result.available ? styles.bannerAvail : styles.bannerTaken),
              }}
            >
              <span style={styles.bannerIcon}>
                {result.available ? "✓" : "✗"}
              </span>
              <div>
                <div style={styles.bannerTitle}>
                  <strong>@{result.username}</strong> is{" "}
                  {result.available
                    ? "available!"
                    : "already taken. Check back later!"}
                </div>
                <div style={styles.bannerSub}>
                  Checked {formatTime(result.checkedAt)}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* History */}
        {history.length > 0 && (
          <div style={styles.card}>
            <div style={styles.historyHeader}>
              <span style={styles.label}>RECENTLY CHECKED</span>
              <button style={styles.clearBtn} onClick={clearHistory}>
                clear
              </button>
            </div>
            <div style={styles.historyList}>
              {history.map((h) => (
                <button
                  key={`${h.username}-${h.checkedAt}`}
                  style={styles.historyItem}
                  onClick={() => handleHistoryClick(h)}
                >
                  <div style={styles.historyLeft}>
                    <span
                      style={{
                        ...styles.historyDot,
                        background: h.available ? "#00c47a" : "#eb0400",
                      }}
                    />
                    <span style={styles.historyName}>@{h.username}</span>
                  </div>
                  <div style={styles.historyRight}>
                    <span style={styles.historyStatus}>
                      {h.available ? "available" : "taken"}
                    </span>
                    <span style={styles.historyTime}>
                      {formatTime(h.checkedAt)}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        <p style={styles.disclaimer}>
          Uses the official Twitch Helix API.
          <br />
          Results reflect availability at time of check.
          <br />
          History is stored locally on your device (up to 5 entries) and is
          never sent anywhere.
        </p>
      </div>
    </div>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  root: {
    minHeight: "100vh",
    background: "#0e0e10",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
    position: "relative",
    overflow: "hidden",
    padding: "24px 16px",
  },
  noise: {
    position: "fixed",
    inset: 0,
    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E")`,
    pointerEvents: "none",
  },
  container: {
    position: "relative",
    zIndex: 1,
    width: "100%",
    maxWidth: "480px",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  header: {
    textAlign: "center",
    marginBottom: "8px",
  },
  logoRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
    marginBottom: "10px",
  },
  logoText: {
    color: "#9147ff",
    fontSize: "26px",
    fontWeight: 700,
    letterSpacing: "-0.5px",
  },
  logoSub: {
    color: "#6b6b7e",
    fontSize: "13px",
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    paddingTop: "4px",
    borderLeft: "1px solid #3a3a4a",
    paddingLeft: "10px",
  },
  tagline: {
    color: "#8c8c9e",
    fontSize: "13px",
    margin: 0,
  },
  card: {
    background: "#18181b",
    border: "1px solid #2a2a35",
    borderRadius: "8px",
    padding: "24px",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  label: {
    color: "#6b6b7e",
    fontSize: "11px",
    letterSpacing: "0.12em",
    fontWeight: 600,
  },
  inputRow: {
    display: "flex",
    gap: "8px",
  },
  inputWrapper: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    background: "#0e0e10",
    border: "1px solid #3a3a4a",
    borderRadius: "6px",
    padding: "0 12px",
  },
  atSign: {
    color: "#9147ff",
    fontSize: "16px",
    marginRight: "6px",
    userSelect: "none",
  },
  input: {
    flex: 1,
    background: "transparent",
    border: "none",
    outline: "none",
    color: "#efeff1",
    fontSize: "15px",
    padding: "13px 0",
    fontFamily: "inherit",
  },
  button: {
    background: "#9147ff",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    padding: "0 20px",
    fontSize: "12px",
    fontWeight: 700,
    letterSpacing: "0.1em",
    cursor: "pointer",
    fontFamily: "inherit",
    minWidth: "72px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "opacity 0.15s",
  },
  buttonDisabled: {
    opacity: 0.5,
    cursor: "not-allowed",
  },
  spinner: {
    width: "14px",
    height: "14px",
    border: "2px solid rgba(255,255,255,0.3)",
    borderTop: "2px solid #fff",
    borderRadius: "50%",
    animation: "spin 0.6s linear infinite",
    display: "inline-block",
  },
  banner: {
    display: "flex",
    alignItems: "flex-start",
    gap: "12px",
    padding: "14px 16px",
    borderRadius: "6px",
    border: "1px solid transparent",
  },
  bannerAvail: {
    background: "rgba(0,196,122,0.08)",
    borderColor: "rgba(0,196,122,0.25)",
    color: "#00c47a",
  },
  bannerTaken: {
    background: "rgba(235,4,0,0.08)",
    borderColor: "rgba(235,4,0,0.25)",
    color: "#ff6b6b",
  },
  bannerError: {
    background: "rgba(255,160,0,0.08)",
    borderColor: "rgba(255,160,0,0.25)",
    color: "#ffa000",
  },
  bannerIcon: {
    fontSize: "18px",
    lineHeight: 1,
    marginTop: "1px",
    flexShrink: 0,
  },
  bannerTitle: {
    fontSize: "14px",
    lineHeight: 1.4,
  },
  bannerSub: {
    fontSize: "11px",
    opacity: 0.7,
    marginTop: "3px",
    letterSpacing: "0.04em",
  },
  historyHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  historyList: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  historyItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    background: "none",
    border: "none",
    borderRadius: "4px",
    padding: "8px 10px",
    cursor: "pointer",
    width: "100%",
    color: "inherit",
    fontFamily: "inherit",
  },
  historyLeft: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  historyDot: {
    width: "7px",
    height: "7px",
    borderRadius: "50%",
    flexShrink: 0,
  },
  historyName: {
    color: "#efeff1",
    fontSize: "13px",
  },
  historyRight: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    gap: "2px",
  },
  historyStatus: {
    fontSize: "11px",
    color: "#8c8c9e",
  },
  historyTime: {
    fontSize: "10px",
    color: "#5a5a6e",
  },
  clearBtn: {
    background: "none",
    border: "none",
    color: "#6b6b7e",
    fontSize: "11px",
    cursor: "pointer",
    fontFamily: "inherit",
    textDecoration: "underline",
    padding: 0,
  },
  disclaimer: {
    color: "#4a4a5e",
    fontSize: "10px",
    textAlign: "center",
    margin: 0,
    letterSpacing: "0.04em",
    lineHeight: 1.6,
  },
};
