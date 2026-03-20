import React, { useState, useEffect, useCallback } from "react";
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

type MessageStatus = "idle" | "creating" | "created" | "decrypting" | "viewing" | "viewed" | "error" | "privacy-guide" | "analytics-info" | "about";

export default function App() {
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

  // Handle routing on page load
  useEffect(() => {
    const path = window.location.pathname;
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
    }
  }, []);

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

  // Generate random encryption key in browser
  const generateKey = () => {
    return CryptoJS.lib.WordArray.random(256/8).toString();
  };

  // Derive key from password using PBKDF2
  const deriveKeyFromPassword = (password: string, salt: string) => {
    return CryptoJS.PBKDF2(password, salt, {
      keySize: 256/32,
      iterations: 100000  // Increased from 10000 for better security
    }).toString();
  };

  const createMessage = async () => {
    setStatus("creating");
    setError("");

    try {
      // Generate encryption key and salt in browser
      const salt = generateKey();
      const encryptionKey = password ? deriveKeyFromPassword(password, salt) : generateKey();
      
      // Encrypt content in browser
      const encryptedContent = CryptoJS.AES.encrypt(content, encryptionKey).toString();
      
      // Send already-encrypted content to server (no password hash)
      const createRes = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          encryptedContent, 
          isPasswordProtected: !!password,
          expiresInMinutes: expiresIn, 
          maxViews 
        }),
      });

      if (!createRes.ok) throw new Error("Failed to seal message");

      const data = await createRes.json();
      
      // Include key/salt in URL fragment with prefix (never sent to server)
      const keyFragment = password ? `p:${salt}` : `k:${encryptionKey}`;
      setResultId(`${data.id}#${keyFragment}`);
      setStatus("created");
    } catch (err: any) {
      setError(err.message);
      setStatus("error");
    }
  };

  const fetchMessage = useCallback(async (pass?: string) => {
    setError("");
    setStatus("decrypting");
    try {
      // Extract key from URL fragment
      const fragment = window.location.hash.slice(1);
      if (!fragment) throw new Error("Invalid message link");
      
      let encryptionKey: string;
      
      // Check fragment prefix to determine mode
      if (fragment.startsWith("k:")) {
        // Direct key (no password)
        encryptionKey = fragment.slice(2);
      } else if (fragment.startsWith("p:")) {
        // Password-protected mode
        const salt = fragment.slice(2);
        const inputPassword = pass || password;
        if (!inputPassword) {
          setRequiresPassword(true);
          setStatus("viewing");
          return;
        }
        // Derive key from password and salt
        encryptionKey = deriveKeyFromPassword(inputPassword, salt);
      } else {
        throw new Error("Invalid message link format");
      }
      
      // Fetch encrypted message (read-only - no deletion)
      const res = await fetch(`/api/messages/${viewId}`);

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Failed to retrieve message");

      // Decrypt content in browser
      const bytes = CryptoJS.AES.decrypt(data.encryptedContent, encryptionKey);
      const decryptedContent = bytes.toString(CryptoJS.enc.Utf8);

      if (!decryptedContent) {
        throw new Error("Incorrect password or invalid link");
      }

      setViewedContent(decryptedContent);
      setStatus("viewed");

      // Only after successful decryption, confirm the view
      try {
        const confirmRes = await fetch(`/api/messages/${viewId}/view`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({})
        });

        const confirmData = await confirmRes.json();
        if (confirmRes.ok) {
          setViewConfirmed(confirmData.isLastView);
        } else {
          console.warn("Failed to confirm view, but message was displayed");
        }
      } catch (err) {
        console.warn("Failed to confirm view, but message was displayed");
      }
    } catch (err: any) {
      setError(err.message);
      setStatus("viewing");
    }
  }, [viewId, password]);

  const copyToClipboard = () => {
    const url = `${window.location.origin}/view/${resultId}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
          {["idle", "created", "viewing", "viewed"].includes(status) && (
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
                        duration: 8,
                        repeat: Infinity,
                        ease: "linear"
                      }}
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-red-600 to-transparent opacity-20"
                    />
                    <textarea
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      placeholder="Enter your sensitive data here... it will be destroyed after viewing."
                      className="relative w-full h-64 bg-[#0a0a0a] border border-zinc-800 rounded-xl p-6 focus:outline-none focus:border-red-900/30 transition-all resize-none text-zinc-200 placeholder:text-zinc-700 z-10"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                      <Key className="w-3 h-3" /> Password Access (Optional)
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Secret Key"
                        className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:border-red-900/50 focus:ring-1 focus:ring-red-900/20 transition-all text-zinc-200"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                      <Clock className="w-3 h-3" /> Volatility Duration
                    </label>
                    <select
                      value={expiresIn}
                      onChange={(e) => setExpiresIn(Number(e.target.value))}
                      className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl py-3 px-4 focus:outline-none focus:border-red-900/50 transition-all text-zinc-200 appearance-none cursor-pointer"
                    >
                      <option value={60}>1 Hour</option>
                      <option value={1440}>24 Hours</option>
                      <option value={10080}>7 Days</option>
                    </select>
                  </div>
                </div>

                <button
                  onClick={createMessage}
                  disabled={!content}
                  className="w-full bg-red-950/20 border border-red-900/50 hover:bg-red-900/30 text-red-500 py-4 rounded-xl font-bold uppercase tracking-[0.2em] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 group"
                >
                  <Lock className="w-5 h-5 group-hover:animate-bounce" />
                  Create Encrypted Note
                </button>
              </motion.div>
            )}

            {status === "creating" && (
              <motion.div
                key="creating"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center gap-4"
              >
                <div className="w-12 h-12 border-4 border-red-900/20 border-t-red-600 rounded-full animate-spin" />
                <p className="text-xs uppercase tracking-widest text-zinc-500">Encrypting message...</p>
              </motion.div>
            )}

            {status === "created" && (
              <motion.div
                key="created"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-zinc-900/30 border border-zinc-800 rounded-2xl p-8 space-y-8 text-center"
              >
                <div className="flex justify-center">
                  <div className="w-12 h-12 border-4 border-green-900/20 border-t-green-600 rounded-full animate-spin" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-xl font-bold text-white uppercase tracking-tight">Message Sealed</h2>
                  <p className="text-sm text-zinc-500">The message is now sealed. Share the link below.</p>
                </div>

                <div className="relative group">
                  <input
                    readOnly
                    value={`${window.location.origin}/view/${resultId}`}
                    className="w-full bg-black border border-zinc-800 rounded-xl py-4 pl-4 pr-12 text-sm text-zinc-400 focus:outline-none"
                  />
                  <button
                    onClick={copyToClipboard}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 hover:bg-zinc-800 rounded-lg transition-all"
                  >
                    {copied ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5 text-zinc-500" />}
                  </button>
                </div>

                <div className="flex flex-col gap-3">
                  <button
                    onClick={reset}
                    className="text-xs uppercase tracking-widest text-zinc-600 hover:text-zinc-400 transition-all"
                  >
                    Create Another Secret
                  </button>
                </div>
              </motion.div>
            )}

            {status === "decrypting" && (
              <motion.div
                key="decrypting"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center gap-4"
              >
                <div className="w-12 h-12 border-4 border-red-900/20 border-t-red-600 rounded-full animate-spin" />
                <p className="text-xs uppercase tracking-widest text-zinc-500">Decrypting message...</p>
              </motion.div>
            )}

            {status === "viewing" && (
              <motion.div
                key="viewing"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-zinc-900/30 border border-zinc-800 rounded-2xl p-8 space-y-8 text-center"
              >
                <div className="flex justify-center">
                  <div className="p-4 bg-red-950/20 border border-red-900/50 rounded-full">
                    <Lock className="w-12 h-12 text-red-600" />
                  </div>
                </div>
                <div className="space-y-2">
                  <h2 className="text-xl font-bold text-white uppercase tracking-tight">ENCRYPTED SOVEREIGNTY</h2>
                  <p className="text-sm text-zinc-500">This message will self-destruct immediately after viewing.</p>
                </div>

                {requiresPassword && (
                  <div className="space-y-4">
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter decryption key"
                      className="w-full bg-black border border-zinc-800 rounded-xl py-4 px-4 text-center text-zinc-200 focus:outline-none focus:border-red-900/50"
                    />
                  </div>
                )}

                {error && (
                  <p className="text-red-500 text-xs uppercase tracking-widest">{error}</p>
                )}

                <button
                  onClick={() => fetchMessage()}
                  className="w-full bg-red-950/20 border border-red-900/50 hover:bg-red-900/30 text-red-500 py-4 rounded-xl font-bold uppercase tracking-[0.2em] transition-all"
                >
                  Decrypt Message
                </button>
              </motion.div>
            )}

            {status === "viewed" && (
              <motion.div
                key="viewed"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-red-500 text-xs uppercase tracking-widest">
                  <Trash2 className="w-3 h-3" /> {viewConfirmed ? "Destroyed from Database" : "Message Viewed"}
                </div>
                  <div className="text-zinc-600 text-[10px] uppercase tracking-widest">
                    Viewing message
                  </div>
                </div>
                <div className="w-full min-h-64 bg-zinc-900/50 border border-red-900/20 rounded-xl p-8 text-zinc-200 whitespace-pre-wrap leading-relaxed shadow-[0_0_50px_-12px_rgba(153,27,27,0.2)]">
                  {viewedContent}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button
                    onClick={reset}
                    className="w-full border border-zinc-800 hover:bg-zinc-900 text-zinc-500 py-4 rounded-xl font-bold uppercase tracking-[0.2em] transition-all"
                  >
                    Exit Crypt
                  </button>
                  <button
                    onClick={reset}
                    className="w-full bg-red-950/20 border border-red-900/50 hover:bg-red-900/30 text-red-500 py-4 rounded-xl font-bold uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2"
                  >
                    <Ghost className="w-4 h-4" /> Create Your Own
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
                      Host your own services and stay off the grid.
                    </p>
                  </div>

                  {/* VPN Section */}
                  <div className="p-8 bg-zinc-900/30 border border-zinc-800 rounded-2xl space-y-4">
                    <h3 className="text-xl font-bold text-white uppercase tracking-tight">VPN: Encrypt Your Traffic</h3>
                    <p className="text-sm text-zinc-500 leading-relaxed">
                      A VPN is essential for hiding your IP and encrypting your traffic. Avoid free VPNs—they are the product. 
                      Use <span className="text-zinc-300">Mullvad VPN</span> or <span className="text-zinc-300">IVPN</span>. 
                      They don't require emails and accept crypto/cash.
                    </p>
                  </div>

                  {/* Adblockers Section */}
                  <div className="p-8 bg-zinc-900/30 border border-zinc-800 rounded-2xl space-y-4">
                    <h3 className="text-xl font-bold text-white uppercase tracking-tight">Adblockers: Kill the Trackers</h3>
                    <p className="text-sm text-zinc-500 leading-relaxed">
                      Ads are tracking beacons. Use <span className="text-zinc-300">uBlock Origin</span> on your browser. 
                      For network-wide protection, set up a <span className="text-zinc-300">Pi-hole</span> or <span className="text-zinc-300">AdGuard Home</span> on your VPS.
                    </p>
                  </div>

                  {/* Self-Hosting Section */}
                  <div className="p-8 bg-zinc-900/30 border border-zinc-800 rounded-2xl space-y-4">
                    <h3 className="text-xl font-bold text-white uppercase tracking-tight">Self-Host Everything</h3>
                    <p className="text-sm text-zinc-500 leading-relaxed">
                      Replace cloud services with self-hosted alternatives. Use <span className="text-zinc-300">Nextcloud</span> for files, 
                      <span className="text-zinc-300">Vaultwarden</span> for passwords, and <span className="text-zinc-300">Matrix</span> for chat. 
                      Your data, your rules.
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
                  <h2 className="text-4xl font-bold text-white tracking-tighter uppercase">What We See</h2>
                  <p className="text-zinc-500 max-w-2xl leading-relaxed">
                    Transparency is the foundation of trust. We use minimal, privacy-respecting analytics to understand site traffic without compromising your identity.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="p-8 bg-zinc-900/30 border border-zinc-800 rounded-2xl space-y-4">
                    <h3 className="text-xl font-bold text-white uppercase tracking-tight">Application-Level Privacy</h3>
                    <p className="text-sm text-zinc-500 leading-relaxed">
                      The application does not intentionally log message content or routine request data. Infrastructure outside the app may still log at its own level.
                    </p>
                  </div>

                  <div className="p-8 bg-zinc-900/30 border border-zinc-800 rounded-2xl space-y-4">
                    <h3 className="text-xl font-bold text-white uppercase tracking-tight">Minimal Analytics</h3>
                    <p className="text-sm text-zinc-500 leading-relaxed">
                      We track only essential metrics to improve the service: page visits, browser types, and basic geographic distribution. No personal data is ever collected.
                    </p>
                  </div>
                </div>

                <div className="p-8 bg-zinc-900/30 border border-zinc-800 rounded-2xl space-y-6">
                  <h3 className="text-xl font-bold text-white uppercase tracking-tight">The Data We Monitor</h3>
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
                    Note: Infrastructure (Docker, hosting providers, reverse proxies) may still log at their level. We recommend self-hosting for complete control.
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
                  <p className="text-zinc-400 max-w-2xl mx-auto">
                    Client-side encrypted secret notes with honest privacy protection. Your messages are encrypted before they leave your browser.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-6 bg-zinc-900/30 border border-zinc-800 rounded-2xl space-y-4">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">🔐</span>
                      <h3 className="text-xl font-bold text-white">AES-256 Encryption</h3>
                    </div>
                    <p className="text-zinc-400 text-sm leading-relaxed">
                      Messages are encrypted in your browser before upload, stored encrypted on the server, and protected in transit by HTTPS.
                    </p>
                  </div>

                  <div className="p-6 bg-zinc-900/30 border border-zinc-800 rounded-2xl space-y-4">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">💾</span>
                      <h3 className="text-xl font-bold text-white">Encrypted Database</h3>
                    </div>
                    <p className="text-zinc-400 text-sm leading-relaxed">
                      The entire SQLite database is encrypted with SQLCipher. Even with physical access to the server, stored data remains unreadable.
                    </p>
                  </div>

                  <div className="p-6 bg-zinc-900/30 border border-zinc-800 rounded-2xl space-y-4">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">🗑️</span>
                      <h3 className="text-xl font-bold text-white">Self-Destructing</h3>
                    </div>
                    <p className="text-zinc-400 text-sm leading-relaxed">
                      Messages automatically delete after viewing or expiration. Set custom time limits and view counts for data control.
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
                    Back to Shadows
                  </button>
                </div>
              </motion.div>
            )}

            {status === "error" && (
              <motion.div
                key="error"
                className="text-center space-y-4"
              >
                <ShieldAlert className="w-12 h-12 text-red-600 mx-auto" />
                <p className="text-red-500 uppercase tracking-widest text-sm">{error}</p>
                <button onClick={reset} className="text-zinc-500 hover:text-white transition-all text-xs uppercase tracking-widest">Try Again</button>
              </motion.div>
            )}
          </AnimatePresence>

          {["idle", "created", "viewed"].includes(status) && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-12 p-6 bg-red-950/10 border border-red-900/30 rounded-xl space-y-3 text-left"
            >
              <div className="flex items-center gap-2 text-red-500 text-[10px] uppercase tracking-[0.2em] font-bold">
                <ShieldCheck className="w-3 h-3" /> Privacy Protocol
              </div>
              <p className="text-zinc-400 text-sm italic leading-relaxed">
                "{privacyMantra}"
              </p>
              <div className="pt-2 flex flex-wrap gap-3">
                <span className="px-2 py-1 bg-zinc-900 border border-zinc-800 rounded text-[9px] text-zinc-500 uppercase tracking-widest">Use VPN</span>
                <span className="px-2 py-1 bg-zinc-900 border border-zinc-800 rounded text-[9px] text-zinc-500 uppercase tracking-widest">Self-Host</span>
                <span className="px-2 py-1 bg-zinc-900 border border-zinc-800 rounded text-[9px] text-zinc-500 uppercase tracking-widest">VPS Bunker</span>
              </div>
            </motion.div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-900 p-8 bg-black/80">
        <div className="max-w-[960px] mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
          <div className="text-[10px] text-zinc-600 uppercase tracking-widest text-center md:text-left">
            &copy; 2026 securenotes.me
          </div>
          <div className="flex justify-center gap-6">
            <button 
              onClick={() => {
                window.history.pushState({}, "", "/about");
                setStatus("about");
              }}
              className="text-[10px] text-zinc-600 hover:text-red-500 uppercase tracking-widest transition-colors flex items-center gap-2"
            >
              <ShieldCheck className="w-3 h-3" /> About
            </button>
            <button 
              onClick={() => {
                window.history.pushState({}, "", "/analytics");
                setStatus("analytics-info");
              }}
              className="text-[10px] text-zinc-600 hover:text-red-500 uppercase tracking-widest transition-colors flex items-center gap-2"
            >
              <Eye className="w-3 h-3" /> What we see
            </button>
          </div>
          <div className="text-[10px] text-zinc-600 uppercase tracking-widest text-center md:text-right">
            Client-Side Encrypted Notes
          </div>
        </div>
      </footer>
    </div>
  );
}
