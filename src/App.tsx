import React, { useState, useEffect, useCallback } from "react";
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { 
  Fingerprint,
  Lock,
  Trash2,
  Eye,
  Copy,
  Check,
  ShieldAlert,
  ShieldCheck,
  Ghost,
  Key,
  Clock,
  MessageCircle
} from "lucide-react";
import CryptoJS from "crypto-js";
import SEOLandingPage from "./components/SEOLandingPage";
import { seoPages, getPageConfig } from "./config/seoPages";

type MessageStatus = "idle" | "creating" | "created" | "decrypting" | "viewing" | "viewed" | "error" | "privacy-guide" | "analytics-info" | "about";

// SEO Page Wrapper Component
const SEOPageWrapper: React.FC<{path: string}> = ({ path }) => {
  const config = getPageConfig(path);
  if (!config) return null;
  return <SEOLandingPage {...config} />;
};

// Main App Component with routing
const AppContent: React.FC = () => {
  const [status, setStatus] = useState<MessageStatus>("idle");
  const [content, setContent] = useState("");
  const [password, setPassword] = useState("");
  const [expiresIn, setExpiresIn] = useState(60); // minutes
  const [maxViews, setMaxViews] = useState(1);
  const [resultId, setResultId] = useState("");
  const [viewId, setViewId] = useState("");
  const [viewedContent, setViewedContent] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [requiresPassword, setRequiresPassword] = useState(false);
  const [viewConfirmed, setViewConfirmed] = useState(false);
  const [privacyMantra, setPrivacyMantra] = useState("");

  const location = useLocation();

  // Handle routing on page load and navigation
  useEffect(() => {
    const path = location.pathname;
    if (path.startsWith("/view/")) {
      const id = path.split("/view/")[1];
      if (id) {
        setViewId(id);
        setStatus("viewing");
      }
    } else if (path === "/about") {
      setStatus("about");
    } else if (path === "/privacy") {
      setStatus("privacy-guide");
    } else if (path === "/analytics") {
      setStatus("analytics-info");
    } else {
      // Check if it's an SEO page
      const seoConfig = getPageConfig(path);
      if (seoConfig) {
        // SEO pages are handled by the router
        return;
      } else {
        setStatus("idle");
      }
    }
  }, [location.pathname]);

  // Rest of the existing app logic remains the same
  const PRIVACY_MANTRAS = [
    "Privacy is not a crime. It is a fundamental human right.",
    "Government overreach starts with 'just one look'. Seal your data.",
    "Self-hosting is the only way to truly own your digital identity.",
    "A VPN is your first line of defense in the digital underworld.",
    "Your data is the new oil. Don't let them drill for free.",
    "Encryption is the math that keeps us free.",
    "VPS: Your own private bunker in the cloud. Choose wisely.",
    "They are watching. Make sure they see nothing.",
    "Decentralize or die. The future is private.",
    "Keep fighting for privacy. The shadows are our sanctuary.",
    "Resist the Digital ID. Do not become a number in their database.",
    "Digital prisons are being built. Encryption is the key to your cell.",
    "Trust no government. Trust only the math."
  ];

  useEffect(() => {
    if (status === "viewed" || status === "idle") {
      setPrivacyMantra(PRIVACY_MANTRAS[Math.floor(Math.random() * PRIVACY_MANTRAS.length)]);
    }
  }, [status]);

  const deriveKeyFromPassword = (password: string, salt: string): string => {
    return CryptoJS.PBKDF2(password, salt, {
      keySize: 256/32,
      iterations: 10000
    }).toString();
  };

  const createMessage = async () => {
    if (!content.trim()) {
      setError("Please enter a message");
      return;
    }

    setStatus("creating");
    setError("");

    try {
      // Encrypt content in browser
      const encryptionKey = CryptoJS.lib.WordArray.random(256/8).toString();
      const encryptedContent = CryptoJS.AES.encrypt(content, encryptionKey).toString();
      const passwordHash = password ? CryptoJS.SHA256(password).toString() : null;
      
      // Send already-encrypted content to server
      const createRes = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          encryptedContent, 
          passwordHash, 
          expiresInMinutes: expiresIn, 
          maxViews 
        }),
      });

      if (!createRes.ok) throw new Error("Failed to seal message");

      const data = await createRes.json();
      
      // Include key/salt in URL fragment (never sent to server)
      const keyFragment = password ? `${data.salt}:${passwordHash}` : encryptionKey;
      const url = `${window.location.origin}/view/${data.id}#${keyFragment}`;
      
      setResultId(url);
      setStatus("created");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create message");
      setStatus("error");
    }
  };

  const fetchMessage = async () => {
    setStatus("decrypting");
    setError("");

    try {
      const fragment = window.location.hash.slice(1);
      if (!fragment) throw new Error("Invalid message link");

      let encryptionKey: string;
      
      if (fragment.includes(':')) {
        // Password-protected message: salt:hash
        const [salt, storedHash] = fragment.split(':');
        const inputPassword = password;
        if (!inputPassword) {
          setRequiresPassword(true);
          setStatus("viewing");
          return;
        }
        // Verify password hash
        const inputPasswordHash = CryptoJS.SHA256(inputPassword).toString();
        if (inputPasswordHash !== storedHash) {
          throw new Error("Incorrect password");
        }
        // Derive key from password
        encryptionKey = deriveKeyFromPassword(inputPassword, salt);
      } else {
        // No password: direct key
        encryptionKey = fragment;
      }
      
      // Fetch encrypted message
      const res = await fetch(`/api/messages/${viewId}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json();

      if (res.status === 401 && data.requiresPassword) {
        setRequiresPassword(true);
        setStatus("viewing");
        return;
      }

      if (!res.ok) throw new Error(data.error || "Failed to fetch message");

      // Decrypt content
      const decryptedBytes = CryptoJS.AES.decrypt(data.encryptedContent, encryptionKey);
      const decryptedContent = decryptedBytes.toString(CryptoJS.enc.Utf8);

      if (!decryptedContent) {
        throw new Error("Decryption failed");
      }

      setViewedContent(decryptedContent);
      setStatus("viewed");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch message");
      setStatus("error");
    }
  };

  const confirmView = async () => {
    if (viewConfirmed) return;
    
    try {
      const res = await fetch(`/api/messages/${viewId}/view`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) throw new Error("Failed to confirm view");
      
      setViewConfirmed(true);
    } catch (err) {
      console.error("Failed to confirm view:", err);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(resultId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      setError("Failed to copy link");
    }
  };

  const reset = () => {
    setStatus("idle");
    setContent("");
    setPassword("");
    setExpiresIn(60);
    setMaxViews(1);
    setResultId("");
    setViewId("");
    setViewedContent("");
    setError("");
    setCopied(false);
    setRequiresPassword(false);
    setViewConfirmed(false);
    window.history.pushState({}, "", "/");
  };

  // If this is an SEO page, let the router handle it
  if (getPageConfig(location.pathname)) {
    return <SEOPageWrapper path={location.pathname} />;
  }

  // Rest of the existing App component JSX
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-300 font-mono flex flex-col selection:bg-red-900 selection:text-white">
      {/* Header */}
      <header className="border-b border-zinc-800 p-6 flex items-center justify-between bg-black/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-[960px] mx-auto w-full flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={reset}>
            <div className="p-2 bg-red-950/30 rounded-lg border border-red-900/50">
              <Fingerprint className="w-8 h-8 text-red-600 animate-pulse" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tighter text-white uppercase">securenotes.me</h1>
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest">Privacy is Resistance</p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-6 text-[10px] uppercase tracking-widest text-zinc-600">
            <div className="flex items-center gap-4">
              <span>Encrypted</span>
              <span className="w-1 h-1 bg-zinc-800 rounded-full" />
              <span>Volatile</span>
            </div>
            <a 
              href="https://chat.securenotes.me/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-zinc-900/30 border border-zinc-800 rounded-full text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-300 transition-all"
            >
              <MessageCircle className="w-3 h-3" /> Matrix Chat
            </a>
            <button 
              onClick={() => {
                window.history.pushState({}, "", "/privacy");
                setStatus("privacy-guide");
              }}
              className="flex items-center gap-2 px-4 py-2 bg-red-950/20 border border-red-900/30 rounded-full text-red-500 hover:bg-red-900/30 transition-all font-bold"
            >
              <ShieldCheck className="w-3 h-3" /> Take Back Your Privacy
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-[960px]">
          {["idle", "creating", "created", "decrypting", "viewing", "viewed", "error"].includes(status) && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-6"
            >
              <div className="mb-12 space-y-4 border-l-2 border-red-900/40 pl-6 py-2">
                <p className="text-zinc-500 text-sm leading-relaxed max-w-2xl italic">
                  "Messages are encrypted in your browser before upload. The server stores only encrypted content, and decryption happens locally in your browser. Messages are deleted after the configured view limit or expiry."
                </p>
                <p className="text-red-500/80 text-xs font-bold uppercase tracking-[0.2em] leading-relaxed max-w-2xl">
                  We are at a point where we cannot trust our governments at all. Resist their push for DIGITAL IDs and DIGITAL prisons. Privacy is your only weapon in the coming age of total surveillance.
                </p>
              </div>
            </motion.div>
          )}

          <AnimatePresence mode="wait">
            {status === "idle" && (
              <motion.div
                key="idle"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                    <Ghost className="w-3 h-3" /> The Secret Message
                  </label>
                  <div className="relative group p-[1px] rounded-xl overflow-hidden">
                    {/* Border Beam Animation */}
                    <motion.div
                      animate={{
                        rotate: [0, 360],
                      }}
                      transition={{
                        duration: 10,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                      className="absolute inset-0 bg-gradient-to-r from-red-600 via-zinc-600 to-red-600 opacity-20"
                    />
                    <textarea
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      placeholder="Type your secret message here..."
                      className="relative w-full h-32 p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-red-900/50 transition-all resize-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                      <Clock className="w-3 h-3" /> Self-Destruct In
                    </label>
                    <select
                      value={expiresIn}
                      onChange={(e) => setExpiresIn(Number(e.target.value))}
                      className="w-full p-3 bg-zinc-900/50 border border-zinc-800 rounded-lg text-zinc-300 focus:outline-none focus:border-red-900/50 transition-all"
                    >
                      <option value={15}>15 minutes</option>
                      <option value={60}>1 hour</option>
                      <option value={360}>6 hours</option>
                      <option value={1440}>24 hours</option>
                      <option value={10080}>7 days</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                      <Eye className="w-3 h-3" /> Max Views
                    </label>
                    <select
                      value={maxViews}
                      onChange={(e) => setMaxViews(Number(e.target.value))}
                      className="w-full p-3 bg-zinc-900/50 border border-zinc-800 rounded-lg text-zinc-300 focus:outline-none focus:border-red-900/50 transition-all"
                    >
                      <option value={1}>1 view</option>
                      <option value={2}>2 views</option>
                      <option value={3}>3 views</option>
                      <option value={5}>5 views</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                      <Lock className="w-3 h-3" /> Password (Optional)
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Extra security"
                      className="w-full p-3 bg-zinc-900/50 border border-zinc-800 rounded-lg text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-red-900/50 transition-all"
                    />
                  </div>
                </div>

                {error && (
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="p-4 bg-red-950/20 border border-red-900/30 rounded-xl text-red-400 text-sm flex items-center gap-3"
                  >
                    <ShieldAlert className="w-5 h-5 flex-shrink-0" />
                    <span>{error}</span>
                  </motion.div>
                )}

                <button
                  onClick={createMessage}
                  disabled={status === "creating" || !content.trim()}
                  className="w-full p-4 bg-red-950/20 border border-red-900/50 hover:bg-red-900/30 text-red-500 rounded-xl font-bold uppercase tracking-[0.2em] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                >
                  {status === "creating" ? (
                    <>
                      <div className="w-5 h-5 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                      Sealing Message...
                    </>
                  ) : (
                    <>
                      <Lock className="w-5 h-5" />
                      Create Secure Message
                    </>
                  )}
                </button>
              </motion.div>
            )}

            {status === "created" && (
              <motion.div
                key="created"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                <div className="p-8 bg-zinc-900/30 border border-zinc-800 rounded-2xl space-y-6">
                  <div className="flex items-center gap-3">
                    <Check className="w-6 h-6 text-green-500" />
                    <h3 className="text-xl font-bold text-white uppercase tracking-tight">Message Sealed</h3>
                  </div>
                  
                  <div className="space-y-4">
                    <p className="text-zinc-400 text-sm">Share this link. Once viewed, it self-destructs:</p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={resultId}
                        readOnly
                        className="flex-1 p-4 bg-black/40 border border-zinc-800 rounded-lg text-zinc-300 font-mono text-sm"
                      />
                      <button
                        onClick={copyToClipboard}
                        className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800/50 transition-all"
                      >
                        {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 p-4 bg-zinc-800/30 rounded-lg">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-xs text-zinc-400 uppercase tracking-widest">
                      Ready to share • Self-destructs after {maxViews} view{maxViews > 1 ? 's' : ''} or {expiresIn} minute{expiresIn > 1 ? 's' : ''}
                    </span>
                  </div>
                </div>

                <button
                  onClick={reset}
                  className="w-full p-4 bg-zinc-900/30 border border-zinc-800 hover:bg-zinc-800/50 text-zinc-400 rounded-xl font-bold uppercase tracking-[0.2em] transition-all"
                >
                  Create Another Message
                </button>
              </motion.div>
            )}

            {status === "viewing" && (
              <motion.div
                key="viewing"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                {requiresPassword ? (
                  <div className="space-y-6">
                    <div className="text-center space-y-4">
                      <Lock className="w-16 h-16 text-red-500 mx-auto" />
                      <h3 className="text-2xl font-bold text-white uppercase tracking-tight">Password Required</h3>
                      <p className="text-zinc-400">This message is protected with a password.</p>
                    </div>

                    <div className="space-y-4">
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter password"
                        className="w-full p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-red-900/50 transition-all"
                        onKeyPress={(e) => e.key === 'Enter' && fetchMessage()}
                      />
                      
                      <button
                        onClick={fetchMessage}
                        disabled={!password.trim() || status === "decrypting"}
                        className="w-full p-4 bg-red-950/20 border border-red-900/50 hover:bg-red-900/30 text-red-500 rounded-xl font-bold uppercase tracking-[0.2em] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {status === "decrypting" ? "Decrypting..." : "Unlock Message"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center space-y-6">
                    <div className="w-16 h-16 border-4 border-red-900/20 border-t-red-600 rounded-full animate-spin mx-auto" />
                    <h3 className="text-xl font-bold text-white uppercase tracking-tight">Decrypting Message</h3>
                    <p className="text-zinc-400">Unlocking your secure message...</p>
                  </div>
                )}
              </motion.div>
            )}

            {status === "viewed" && (
              <motion.div
                key="viewed"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                <div className="p-8 bg-zinc-900/30 border border-zinc-800 rounded-2xl space-y-6">
                  <div className="flex items-center gap-3">
                    <Trash2 className="w-6 h-6 text-red-500" />
                    <h3 className="text-xl font-bold text-white uppercase tracking-tight">Message Destroyed</h3>
                  </div>
                  
                  <div className="space-y-4">
                    <p className="text-zinc-300 leading-relaxed whitespace-pre-wrap">{viewedContent}</p>
                    
                    <div className="flex items-center gap-4 p-4 bg-red-950/20 border border-red-900/30 rounded-lg">
                      <div className="w-2 h-2 bg-red-500 rounded-full" />
                      <span className="text-xs text-red-400 uppercase tracking-widest">
                        This message has been self-destructed
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-center space-y-4">
                  <p className="text-zinc-500 text-sm italic">{privacyMantra}</p>
                  <button
                    onClick={reset}
                    className="p-4 bg-zinc-900/30 border border-zinc-800 hover:bg-zinc-800/50 text-zinc-400 rounded-xl font-bold uppercase tracking-[0.2em] transition-all"
                  >
                    Create Your Own Secure Message
                  </button>
                </div>
              </motion.div>
            )}

            {status === "error" && (
              <motion.div
                key="error"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                <div className="p-8 bg-red-950/20 border border-red-900/30 rounded-2xl text-center space-y-6">
                  <ShieldAlert className="w-16 h-16 text-red-500 mx-auto" />
                  <div className="space-y-4">
                    <h3 className="text-2xl font-bold text-white uppercase tracking-tight">Message Error</h3>
                    <p className="text-red-400">{error}</p>
                  </div>
                  <button
                    onClick={reset}
                    className="p-4 bg-red-950/20 border border-red-900/50 hover:bg-red-900/30 text-red-500 rounded-xl font-bold uppercase tracking-[0.2em] transition-all"
                  >
                    Start Over
                  </button>
                </div>
              </motion.div>
            )}

            {status === "privacy-guide" && (
              <motion.div
                key="privacy-guide"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-12 pb-20"
              >
                <div className="space-y-4">
                  <h2 className="text-4xl font-bold text-white tracking-tighter uppercase">The Privacy Manifesto</h2>
                  <p className="text-zinc-500 max-w-2xl leading-relaxed">
                    In an era of mass surveillance and data harvesting, privacy is your only defense. 
                    Take back control of your digital life with these essential tools and practices.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* VPS Section */}
                  <div className="p-8 bg-zinc-900/30 border border-zinc-800 rounded-2xl space-y-4">
                    <h3 className="text-xl font-bold text-white uppercase tracking-tight">VPS: Your Private Bunker</h3>
                    <p className="text-sm text-zinc-500 leading-relaxed">
                      Don't trust big tech with your data. Rent a Virtual Private Server (VPS) from privacy-respecting providers like 
                      <span className="text-zinc-300"> Hetzner</span>, <span className="text-zinc-300">RackNerd</span>, or <span className="text-zinc-300">OrangeWebsite</span>. 
                      Perfect for: hosting your own VPN, running Matrix chat, private email servers, file storage with Nextcloud, 
                      password managers with Vaultwarden, personal websites, development environments, and escaping cloud surveillance.
                    </p>
                  </div>

                  {/* VPN Section */}
                  <div className="p-8 bg-zinc-900/30 border border-zinc-800 rounded-2xl space-y-4">
                    <h3 className="text-xl font-bold text-white uppercase tracking-tight">VPN: Encrypt Your Traffic</h3>
                    <p className="text-sm text-zinc-500 leading-relaxed">
                      A VPN is essential for hiding your IP and encrypting your traffic. Avoid free VPNs—they are the product. 
                      Use <span className="text-zinc-300">Mullvad VPN</span>, <span className="text-zinc-300">IVPN</span>, <span className="text-zinc-300">Surfshark</span>, or <span className="text-zinc-300">Proton VPN</span>. 
                      They don't require emails and accept crypto/cash.
                    </p>
                    <p className="text-sm text-zinc-500 leading-relaxed italic">
                      Better yet: <span className="text-zinc-300">self-host your own VPN</span> using WireGuard or OpenVPN on your VPS for complete control.
                    </p>
                  </div>

                  {/* Adblockers Section */}
                  <div className="p-8 bg-zinc-900/30 border border-zinc-800 rounded-2xl space-y-4">
                    <h3 className="text-xl font-bold text-white uppercase tracking-tight">Adblockers: Kill the Trackers</h3>
                    <p className="text-sm text-zinc-500 leading-relaxed">
                      Big tech companies take and take and take again - your data, your attention, your privacy. 
                      Fight back by starving them of revenue. Use <span className="text-zinc-300">uBlock Origin</span>, <span className="text-zinc-300">AdGuard</span>, or <span className="text-zinc-300">Privacy Badger</span> on your browser. 
                      For network-wide protection, set up <span className="text-zinc-300">Pi-hole</span>, <span className="text-zinc-300">AdGuard Home</span>, or <span className="text-zinc-300">NextDNS</span> on your VPS.
                    </p>
                    <p className="text-sm text-zinc-500 leading-relaxed italic">
                      Every blocked ad is a victory for privacy. Hurt their revenue and give yourself a better, tracker-free experience.
                    </p>
                  </div>

                  {/* Self-Hosting Section */}
                  <div className="p-8 bg-zinc-900/30 border border-zinc-800 rounded-2xl space-y-4">
                    <h3 className="text-xl font-bold text-white uppercase tracking-tight">Self-Host Everything</h3>
                    <p className="text-sm text-zinc-500 leading-relaxed">
                      Replace cloud services with self-hosted alternatives. Use <span className="text-zinc-300">Nextcloud</span> for files, 
                      <span className="text-zinc-300">Vaultwarden</span> for passwords, <span className="text-zinc-300">Matrix</span> for chat, 
                      <span className="text-zinc-300">Mailcow</span> for email, <span className="text-zinc-300">Gitea</span> for code, 
                      <span className="text-zinc-300">Jellyfin</span> for media, <span className="text-zinc-300">Pi-hole</span> for ad-blocking, 
                      and <span className="text-zinc-300">Docker</span> to manage it all. Your data, your rules.
                    </p>
                  </div>

                  {/* Matrix Recommendation */}
                  <div className="p-8 bg-zinc-900/30 border border-zinc-800 rounded-2xl space-y-4">
                    <h3 className="text-xl font-bold text-white uppercase tracking-tight">Matrix: Secure Chat</h3>
                    <p className="text-sm text-zinc-500 leading-relaxed">
                      I recommend trying <span className="text-zinc-300">Matrix chat</span> to chat with friends - it's much safer than WhatsApp etc. 
                      Fully self-hostable with end-to-end encryption. <a href="https://chat.securenotes.me/" target="_blank" rel="noopener noreferrer" className="text-red-400 hover:text-red-300 underline">View demo here</a>.
                    </p>
                  </div>
                </div>

                <div className="p-8 bg-red-950/10 border border-red-900/30 rounded-2xl text-center space-y-6">
                  <h3 className="text-2xl font-bold text-white uppercase tracking-tighter">Ready to fight back?</h3>
                  <p className="text-zinc-400 max-w-xl mx-auto italic">
                    "The only way to keep a secret is to never tell it. The second best way is to encrypt it and host it yourself."
                  </p>
                  <button 
                    onClick={reset}
                    className="px-8 py-4 bg-red-950/20 border border-red-900/50 hover:bg-red-900/30 text-red-500 rounded-xl font-bold uppercase tracking-[0.2em] transition-all"
                  >
                    Return to the Shadows
                  </button>
                </div>
              </motion.div>
            )}

            {status === "analytics-info" && (
              <motion.div
                key="analytics-info"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-12 pb-20"
              >
                <div className="space-y-4">
                  <h2 className="text-4xl font-bold text-white tracking-tighter uppercase">Technical Details</h2>
                  <p className="text-zinc-500 max-w-2xl leading-relaxed">
                    Learn how Secure Notes protects your privacy with client-side encryption and secure architecture.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="p-8 bg-zinc-900/30 border border-zinc-800 rounded-2xl space-y-4">
                    <h3 className="text-xl font-bold text-white uppercase tracking-tight">How Secure Notes Works</h3>
                    <p className="text-sm text-zinc-500 leading-relaxed">
                      Messages are encrypted in your browser using AES-256 before upload. The server stores only encrypted content and never sees plaintext. 
                      Messages self-destruct after viewing or expiration. Your password is never sent to the server.
                    </p>
                  </div>

                  <div className="p-8 bg-zinc-900/30 border border-zinc-800 rounded-2xl space-y-4">
                    <h3 className="text-xl font-bold text-white uppercase tracking-tight">Technical Architecture</h3>
                    <p className="text-sm text-zinc-500 leading-relaxed">
                      Built with TypeScript, Express, and SQLCipher for encrypted storage. Two-step fetch-then-confirm flow prevents wrong password deletion. 
                      Rate limiting, input validation, and security headers protect against abuse. Open source and self-hostable.
                    </p>
                  </div>
                </div>

                {/* Analytics Data Section */}
                <div className="p-8 bg-zinc-900/30 border border-zinc-800 rounded-2xl space-y-6">
                  <h3 className="text-xl font-bold text-white uppercase tracking-tight">Analytics We Monitor</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {[
                      "Top Referrers",
                      "Browsers",
                      "Country Locations",
                      "Screen Sizes",
                      "Operating Systems",
                      "Visitor Counts"
                    ].map((item) => (
                      <div key={item} className="flex items-center gap-3 p-3 bg-black/40 border border-zinc-800 rounded-lg text-[10px] uppercase tracking-widest text-zinc-400">
                        {item}
                      </div>
                    ))}
                  </div>
                  <p className="text-sm text-zinc-500 leading-relaxed italic">
                    We track only essential metrics to understand site traffic without compromising your identity. No personal data or message content is collected.
                  </p>
                </div>

                {/* Matrix Recommendation */}
                <div className="p-8 bg-zinc-900/30 border border-zinc-800 rounded-2xl space-y-4">
                  <h3 className="text-xl font-bold text-white uppercase tracking-tight">Matrix: Secure Chat</h3>
                  <p className="text-sm text-zinc-500 leading-relaxed">
                    I recommend trying <span className="text-zinc-300">Matrix chat</span> to chat with friends - it's much safer than WhatsApp etc. 
                    Fully self-hostable with end-to-end encryption. <a href="https://chat.securenotes.me/" target="_blank" rel="noopener noreferrer" className="text-red-400 hover:text-red-300 underline">View demo here</a>.
                  </p>
                </div>

                <div className="text-center">
                  <button 
                    onClick={reset}
                    className="px-8 py-4 bg-red-950/20 border border-red-900/50 hover:bg-red-900/30 text-red-500 rounded-xl font-bold uppercase tracking-[0.2em] transition-all"
                  >
                    Back to Shadows
                  </button>
                </div>
              </motion.div>
            )}

            {status === "about" && (
              <motion.div
                key="about"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-8"
              >
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 border-4 border-red-900/20 border-t-red-600 rounded-full animate-spin" />
                  <h2 className="text-3xl font-bold text-white uppercase tracking-tight">About Secure Notes</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="p-6 bg-zinc-900/30 border border-zinc-800 rounded-2xl space-y-4">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">🔐</span>
                      <h3 className="text-xl font-bold text-white">Client-Side Encryption</h3>
                    </div>
                    <p className="text-zinc-400 text-sm leading-relaxed">
                      Messages are encrypted in your browser using AES-256 before being sent to our servers. We never see your plaintext.
                    </p>
                  </div>

                  <div className="p-6 bg-zinc-900/30 border border-zinc-800 rounded-2xl space-y-4">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">⏰</span>
                      <h3 className="text-xl font-bold text-white">Self-Destructing</h3>
                    </div>
                    <p className="text-zinc-400 text-sm leading-relaxed">
                      Messages automatically delete after being viewed or when they expire. No permanent storage, no digital trail.
                    </p>
                  </div>

                  <div className="p-6 bg-zinc-900/30 border border-zinc-800 rounded-2xl space-y-4">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">👁️</span>
                      <h3 className="text-xl font-bold text-white">One-Time Access</h3>
                    </div>
                    <p className="text-zinc-400 text-sm leading-relaxed">
                      Messages can be limited to a single view. Once opened, they're gone forever. Perfect for sensitive information.
                    </p>
                  </div>

                  <div className="p-6 bg-zinc-900/30 border border-zinc-800 rounded-2xl space-y-4">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">🛡️</span>
                      <h3 className="text-xl font-bold text-white">Optional Password</h3>
                    </div>
                    <p className="text-zinc-400 text-sm leading-relaxed">
                      Add an extra layer of security with a password. Keys are derived locally in your browser using PBKDF2.
                    </p>
                  </div>

                  <div className="p-6 bg-zinc-900/30 border border-zinc-800 rounded-2xl space-y-4">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">💬</span>
                      <h3 className="text-xl font-bold text-white">Matrix Chat</h3>
                    </div>
                    <p className="text-zinc-400 text-sm leading-relaxed">
                      I recommend trying <span className="text-zinc-300">Matrix chat</span> to chat with friends - it's much safer than WhatsApp etc. 
                      Fully self-hostable with end-to-end encryption. <a href="https://chat.securenotes.me/" target="_blank" rel="noopener noreferrer" className="text-red-400 hover:text-red-300 underline">View demo here</a>.
                    </p>
                  </div>
                </div>

                <div className="p-8 bg-red-950/10 border border-red-900/30 rounded-2xl text-center space-y-6">
                  <h3 className="text-2xl font-bold text-white uppercase tracking-tighter">How It Works</h3>
                  <p className="text-zinc-400 max-w-2xl mx-auto">
                    Messages are encrypted in your browser before upload. The server stores only encrypted content, and decryption happens locally in your browser using either a link key or a password-derived key.
                  </p>
                  <div className="flex flex-wrap justify-center gap-4">
                    <span className="px-4 py-2 bg-zinc-900 border border-zinc-800 rounded text-xs text-zinc-500 uppercase tracking-widest">Client-Side Keys</span>
                    <span className="px-4 py-2 bg-zinc-900 border border-zinc-800 rounded text-xs text-zinc-500 uppercase tracking-widest">PBKDF2 Key Derivation</span>
                    <span className="px-4 py-2 bg-zinc-900 border border-zinc-800 rounded text-xs text-zinc-500 uppercase tracking-widest">SQLCipher Database</span>
                    <span className="px-4 py-2 bg-zinc-900 border border-zinc-800 rounded text-xs text-zinc-500 uppercase tracking-widest">Open Source</span>
                  </div>
                </div>

                <div className="text-center">
                  <button 
                    onClick={reset}
                    className="px-8 py-4 bg-red-950/20 border border-red-900/50 hover:bg-red-900/30 text-red-500 rounded-xl font-bold uppercase tracking-[0.2em] transition-all"
                  >
                    Create Your First Note
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      <footer className="border-t border-zinc-800 p-6 text-center">
        <div className="max-w-[960px] mx-auto space-y-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-[10px] text-zinc-600 uppercase tracking-widest">
              <span>Encrypted</span>
              <span className="mx-2">•</span>
              <span>Volatile</span>
              <span className="mx-2">•</span>
              <span>Anonymous</span>
            </div>
            <div className="flex items-center gap-6 text-[10px] text-zinc-600 uppercase tracking-widest">
              <button 
                onClick={() => {
                  window.history.pushState({}, "", "/about");
                  setStatus("about");
                }}
                className="hover:text-red-500 transition-colors flex items-center gap-2"
              >
                <Eye className="w-3 h-3" /> What we see
              </button>
              <button 
                onClick={() => {
                  window.history.pushState({}, "", "/analytics");
                  setStatus("analytics-info");
                }}
                className="hover:text-red-500 transition-colors flex items-center gap-2"
              >
                <Eye className="w-3 h-3" /> What we see
              </button>
            </div>
          </div>
          <p className="text-[10px] text-zinc-700 uppercase tracking-widest">
            © 2024 SecureNotes. Privacy is Resistance.
          </p>
        </div>
      </footer>
    </div>
  );
};

// Main App component with Router
export default function App() {
  return (
    <Router>
      <Routes>
        {/* SEO Landing Pages */}
        {seoPages.map((page) => (
          <Route key={page.path} path={page.path} element={<SEOPageWrapper path={page.path} />} />
        ))}
        
        {/* Original App Routes */}
        <Route path="/*" element={<AppContent />} />
      </Routes>
    </Router>
  );
}
