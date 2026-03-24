import React, { useState, useEffect, useCallback } from "react";
import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate } from "react-router-dom";
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
  MessageCircle,
  FileText,
  Github
} from "lucide-react";
import CryptoJS from "crypto-js";
import SEOLandingPage from "./components/SEOLandingPage";
import { NoteForm } from "./components/NoteForm";
import { seoPages, getPageConfig } from "./config/seoPages";

type MessageStatus = "idle" | "creating" | "created" | "decrypting" | "viewing" | "viewed" | "error" | "privacy-guide" | "analytics-info" | "about" | "terms";

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
  const [maxViews, setMaxViews] = useState(1); // default to 1 view
  const [resultId, setResultId] = useState("");
  const [viewId, setViewId] = useState("");
  const [viewedContent, setViewedContent] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [requiresPassword, setRequiresPassword] = useState(false);
  const [viewConfirmed, setViewConfirmed] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();

  // Scroll to top when route changes
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  // Handle routing on page load
  useEffect(() => {
    const path = location.pathname;
    
    // Manage canonical URLs
    const canonicalUrl = `${window.location.origin}${path}`;
    let canonicalLink = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
    if (canonicalLink) {
      canonicalLink.href = canonicalUrl;
    } else {
      canonicalLink = document.createElement('link');
      canonicalLink.rel = 'canonical';
      canonicalLink.href = canonicalUrl;
      document.head.appendChild(canonicalLink);
    }
    
    // Add robots meta tag
    let robotsTag = document.querySelector('meta[name="robots"]') as HTMLMetaElement;
    if (robotsTag) {
      robotsTag.content = 'index, follow';
    } else {
      robotsTag = document.createElement('meta');
      robotsTag.name = 'robots';
      robotsTag.content = 'index, follow';
      document.head.appendChild(robotsTag);
    }
    
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
    } else if (path === "/terms") {
      setStatus("terms");
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
          maxViews: maxViews
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
    setResultId("");
    setViewId("");
    setViewedContent("");
    setError("");
    setCopied(false);
    setRequiresPassword(false);
    setViewConfirmed(false);
    navigate("/");
  };

  // If this is an SEO page, let the router handle it
  if (getPageConfig(location.pathname)) {
    return <SEOPageWrapper path={location.pathname} />;
  }

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
                navigate("/privacy");
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

          {/* Note Form - idle/creating/error states */}
          {["idle", "creating", "error"].includes(status) && (
            <NoteForm
              content={content}
              setContent={setContent}
              password={password}
              setPassword={setPassword}
              expiresIn={expiresIn}
              setExpiresIn={setExpiresIn}
              maxViews={maxViews}
              setMaxViews={setMaxViews}
              onSubmit={createMessage}
              isLoading={status === "creating"}
              error={status === "error" ? error : ""}
            />
          )}

          {/* Created state - show result */}
          {status === "created" && (
            <motion.div
              key="created"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-zinc-900/30 border border-zinc-800 rounded-2xl p-8 space-y-8 text-center"
            >
              <div className="flex justify-center">
                <div className="p-4 bg-green-950/20 border border-green-900/50 rounded-full">
                  <Check className="w-12 h-12 text-green-500" />
                </div>
              </div>

              <div className="space-y-2">
                <h2 className="text-xl font-bold text-white uppercase tracking-tight">
                  Note Sealed
                </h2>
                <p className="text-sm text-zinc-500">
                  Share this link. Once it's opened, it's gone.
                </p>
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
                  {copied ? (
                    <Check className="w-5 h-5 text-green-500" />
                  ) : (
                    <Copy className="w-5 h-5 text-zinc-500" />
                  )}
                </button>
              </div>

              <button
                onClick={reset}
                className="text-xs uppercase tracking-widest text-zinc-600 hover:text-zinc-400 transition-all"
              >
                Create Another Secret
              </button>
            </motion.div>
          )}

          {/* Viewing/Decrypting states - route specific */}
          <AnimatePresence mode="wait">
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

                {/* VPS Plans Section */}
                <div className="p-8 bg-red-950/10 border border-red-900/30 rounded-2xl space-y-6">
                  <h3 className="text-2xl font-bold text-white uppercase tracking-tighter">Self-Hosting VPS Options</h3>
                  <p className="text-zinc-400 leading-relaxed">
                    Don't trust big tech with your data. Rent a Virtual Private Server (VPS) from privacy-respecting providers like 
                    <span className="text-zinc-300"> Hetzner</span>, <span className="text-zinc-300">RackNerd</span>, or <span className="text-zinc-300">OrangeWebsite</span>. 
                    Perfect for: hosting your own VPN, running Matrix chat, private email servers, file storage with Nextcloud, 
                    password managers with Vaultwarden, personal websites, development environments, and escaping cloud surveillance.
                  </p>
                  <p className="text-zinc-500 text-sm italic mt-2">
                    My preferred supplier is RackNerd due to their great prices and I've had zero issues.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
                    <a href="https://my.racknerd.com/aff.php?aff=18943&pid=903" target="_blank" rel="noopener noreferrer" className="p-6 bg-zinc-900/50 border border-zinc-800 rounded-xl hover:border-red-900/50 transition-all">
                      <div className="text-red-400 font-bold text-lg">1 GB RAM KVM VPS</div>
                      <div className="text-zinc-500 text-sm">1x vCPU Core • 1 GB RAM • 24 GB SSD</div>
                      <div className="text-zinc-400 text-xs mt-2">$11.29/year</div>
                      <div className="text-zinc-500 text-xs mt-1">2 TB Bandwidth</div>
                      <div className="text-zinc-500 text-xs">KVM Virtualization</div>
                      <button className="mt-4 w-full bg-red-950/20 border border-red-900/50 hover:bg-red-900/30 text-red-500 py-2 rounded text-sm font-bold transition-all">
                        GO →
                      </button>
                    </a>
                    <a href="https://my.racknerd.com/aff.php?aff=18943&pid=904" target="_blank" rel="noopener noreferrer" className="p-6 bg-zinc-900/50 border border-zinc-800 rounded-xl hover:border-red-900/50 transition-all">
                      <div className="text-red-400 font-bold text-lg">2 GB RAM KVM VPS</div>
                      <div className="text-zinc-500 text-sm">1x vCPU Core • 2 GB RAM • 40 GB SSD</div>
                      <div className="text-zinc-400 text-xs mt-2">$18.29/year</div>
                      <div className="text-zinc-500 text-xs mt-1">3.5 TB Bandwidth</div>
                      <div className="text-zinc-500 text-xs">KVM Virtualization</div>
                      <button className="mt-4 w-full bg-red-950/20 border border-red-900/50 hover:bg-red-900/30 text-red-500 py-2 rounded text-sm font-bold transition-all">
                        GO →
                      </button>
                    </a>
                    <a href="https://my.racknerd.com/aff.php?aff=18943&pid=905" target="_blank" rel="noopener noreferrer" className="p-6 bg-zinc-900/50 border border-zinc-800 rounded-xl hover:border-red-900/50 transition-all">
                      <div className="text-red-400 font-bold text-lg">3.5 GB RAM KVM VPS</div>
                      <div className="text-zinc-500 text-sm">2x vCPU Cores • 3.5 GB RAM • 65 GB SSD</div>
                      <div className="text-zinc-400 text-xs mt-2">$32.49/year</div>
                      <div className="text-zinc-500 text-xs mt-1">7 TB Bandwidth</div>
                      <div className="text-zinc-500 text-xs">KVM Virtualization</div>
                      <button className="mt-4 w-full bg-red-950/20 border border-red-900/50 hover:bg-red-900/30 text-red-500 py-2 rounded text-sm font-bold transition-all">
                        GO →
                      </button>
                    </a>
                    <a href="https://my.racknerd.com/aff.php?aff=18943&pid=906" target="_blank" rel="noopener noreferrer" className="p-6 bg-zinc-900/50 border border-zinc-800 rounded-xl hover:border-red-900/50 transition-all">
                      <div className="text-red-400 font-bold text-lg">4 GB RAM KVM VPS</div>
                      <div className="text-zinc-500 text-sm">3x vCPU Cores • 4 GB RAM • 105 GB SSD</div>
                      <div className="text-zinc-400 text-xs mt-2">$43.88/year</div>
                      <div className="text-zinc-500 text-xs mt-1">9 TB Bandwidth</div>
                      <div className="text-zinc-500 text-xs">KVM Virtualization</div>
                      <button className="mt-4 w-full bg-red-950/20 border border-red-900/50 hover:bg-red-900/30 text-red-500 py-2 rounded text-sm font-bold transition-all">
                        GO →
                      </button>
                    </a>
                    <a href="https://my.racknerd.com/aff.php?aff=18943&pid=907" target="_blank" rel="noopener noreferrer" className="p-6 bg-zinc-900/50 border border-zinc-800 rounded-xl hover:border-red-900/50 transition-all">
                      <div className="text-red-400 font-bold text-lg">6 GB RAM KVM VPS</div>
                      <div className="text-zinc-500 text-sm">4x vCPU Cores • 6 GB RAM • 140 GB SSD</div>
                      <div className="text-zinc-400 text-xs mt-2">$59.99/year</div>
                      <div className="text-zinc-500 text-xs mt-1">12 TB Bandwidth</div>
                      <div className="text-zinc-500 text-xs">KVM Virtualization</div>
                      <button className="mt-4 w-full bg-red-950/20 border border-red-900/50 hover:bg-red-900/30 text-red-500 py-2 rounded text-sm font-bold transition-all">
                        GO →
                      </button>
                    </a>
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

            {status === "terms" && (
              <motion.div
                key="terms"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-8"
              >
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 border-4 border-red-900/20 border-t-red-600 rounded-full animate-spin" />
                  <h2 className="text-3xl font-bold text-white uppercase tracking-tight">Terms of Service</h2>
                  <p className="text-zinc-400 max-w-2xl mx-auto">
                    Simple terms for a simple service. Use responsibly.
                  </p>
                </div>

                <div className="space-y-6 max-w-4xl mx-auto">
                  <div className="p-6 bg-zinc-900/30 border border-zinc-800 rounded-2xl space-y-4">
                    <h3 className="text-xl font-bold text-white">1. Service Description</h3>
                    <p className="text-zinc-400 text-sm leading-relaxed">
                      SecureNotes provides client-side encrypted, self-destructing messaging services. Messages are encrypted in your browser before transmission and automatically delete after viewing or expiration.
                    </p>
                  </div>

                  <div className="p-6 bg-zinc-900/30 border border-zinc-800 rounded-2xl space-y-4">
                    <h3 className="text-xl font-bold text-white">2. Acceptable Use</h3>
                    <p className="text-zinc-400 text-sm leading-relaxed">
                      You agree to use this service legally and responsibly. Prohibited content includes: illegal activities, threats, harassment, child exploitation, malware, spam, and violations of applicable laws or regulations.
                    </p>
                  </div>

                  <div className="p-6 bg-zinc-900/30 border border-zinc-800 rounded-2xl space-y-4">
                    <h3 className="text-xl font-bold text-white">3. Privacy & Data</h3>
                    <p className="text-zinc-400 text-sm leading-relaxed">
                      We don't track, log, or store personal information. Messages are encrypted client-side and stored temporarily until self-destruction. We cannot access message content. See our Privacy Policy for details.
                    </p>
                  </div>

                  <div className="p-6 bg-zinc-900/30 border border-zinc-800 rounded-2xl space-y-4">
                    <h3 className="text-xl font-bold text-white">4. No Guarantees</h3>
                    <p className="text-zinc-400 text-sm leading-relaxed">
                      This service is provided "as is" without warranties. We are not liable for data loss, service interruptions, or damages arising from service use. Messages may be inaccessible if lost before viewing.
                    </p>
                  </div>

                  <div className="p-6 bg-zinc-900/30 border border-zinc-800 rounded-2xl space-y-4">
                    <h3 className="text-xl font-bold text-white">5. Service Limitations</h3>
                    <p className="text-zinc-400 text-sm leading-relaxed">
                      Messages have maximum size limits and expiration periods. We may rate-limit or block abuse. Service availability is not guaranteed. We reserve the right to modify or discontinue the service.
                    </p>
                  </div>

                  <div className="p-6 bg-zinc-900/30 border border-zinc-800 rounded-2xl space-y-4">
                    <h3 className="text-xl font-bold text-white">6. User Responsibility</h3>
                    <p className="text-zinc-400 text-sm leading-relaxed">
                      You are responsible for securing your passwords and links. We cannot recover lost messages or passwords. Share links carefully - once viewed, messages are permanently deleted.
                    </p>
                  </div>

                  <div className="p-6 bg-zinc-900/30 border border-zinc-800 rounded-2xl space-y-4">
                    <h3 className="text-xl font-bold text-white">7. Legal Compliance</h3>
                    <p className="text-zinc-400 text-sm leading-relaxed">
                      You must comply with all applicable laws. We may cooperate with legal authorities when required by law. Illegal use may result in service termination and reporting to authorities.
                    </p>
                  </div>

                  <div className="p-6 bg-zinc-900/30 border border-zinc-800 rounded-2xl space-y-4">
                    <h3 className="text-xl font-bold text-white">8. Changes to Terms</h3>
                    <p className="text-zinc-400 text-sm leading-relaxed">
                      These terms may change periodically. Continued use constitutes acceptance of updated terms. Significant changes will be announced through the service.
                    </p>
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
                Take back control of your digital life. Self-host, encrypt, and disappear.
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
        <div className="max-w-[960px] mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
          <div className="text-[10px] text-zinc-600 uppercase tracking-widest text-center lg:text-left">
            &copy; 2026 securenotes.me
          </div>
          <div className="flex flex-wrap justify-center gap-4 md:gap-6">
            <button 
              onClick={() => {
                navigate("/about");
                setStatus("about");
              }}
              className="text-[10px] text-zinc-600 hover:text-red-500 uppercase tracking-widest transition-colors flex items-center gap-2"
            >
              <ShieldCheck className="w-3 h-3" /> About
            </button>
            <button 
              onClick={() => {
                navigate("/analytics");
                setStatus("analytics-info");
              }}
              className="text-[10px] text-zinc-600 hover:text-red-500 uppercase tracking-widest transition-colors flex items-center gap-2"
            >
              <Eye className="w-3 h-3" /> What we see
            </button>
            <button 
              onClick={() => {
                navigate("/terms");
                setStatus("terms");
              }}
              className="text-[10px] text-zinc-600 hover:text-red-500 uppercase tracking-widest transition-colors flex items-center gap-2"
            >
              <FileText className="w-3 h-3" /> Terms
            </button>
            <a 
              href="https://github.com/pk1888/securenotes.me"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-zinc-600 hover:text-red-500 uppercase tracking-widest transition-colors flex items-center gap-2"
            >
              <Github className="w-3 h-3" /> GitHub
            </a>
          </div>
          <div className="text-[10px] text-zinc-600 uppercase tracking-widest text-center lg:text-right">
            Client-Side Encrypted Notes
          </div>
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
