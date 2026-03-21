import React from 'react';
import { motion } from 'motion/react';
import { Lock, Trash2, Eye, Copy, Check, ShieldAlert, Clock } from 'lucide-react';
import CryptoJS from 'crypto-js';

interface SEOLandingPageProps {
  title: string;
  metaDescription: string;
  h1Text: string;
  introParagraphs: string[];
  supportSection: 'why-use' | 'when-to-use' | 'why-safer';
  faqs: Array<{ question: string; answer: string }>;
  ctaText: string;
}

const SEOLandingPage: React.FC<SEOLandingPageProps> = ({
  title,
  metaDescription,
  h1Text,
  introParagraphs,
  supportSection,
  faqs,
  ctaText
}) => {
  // Note creation state (reuse from main app)
  const [content, setContent] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [expiresIn, setExpiresIn] = React.useState(60);
  const [maxViews, setMaxViews] = React.useState(1);
  const [isCreating, setIsCreating] = React.useState(false);
  const [created, setCreated] = React.useState(false);
  const [resultId, setResultId] = React.useState("");
  const [copied, setCopied] = React.useState(false);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    document.title = title;
    const metaDescriptionTag = document.querySelector('meta[name="description"]');
    if (metaDescriptionTag) {
      metaDescriptionTag.setAttribute('content', metaDescription);
    }
  }, [title, metaDescription]);

  const createNote = async () => {
    if (!content.trim()) {
      setError("Please enter a message");
      return;
    }

    setIsCreating(true);
    setError("");

    try {
      // Generate encryption key
      const encryptionKey = CryptoJS.lib.WordArray.random(256/8).toString();
      
      // Encrypt content
      const encryptedContent = CryptoJS.AES.encrypt(content, encryptionKey).toString();
      const passwordHash = password ? CryptoJS.SHA256(password).toString() : null;
      
      // Create note
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

      if (!createRes.ok) throw new Error("Failed to create note");

      const data = await createRes.json();
      const keyFragment = password ? `${data.salt}:${passwordHash}` : encryptionKey;
      const fullUrl = `${window.location.origin}/view/${data.id}#${keyFragment}`;
      
      setResultId(fullUrl);
      setCreated(true);
      setContent("");
      setPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create note");
    } finally {
      setIsCreating(false);
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
    setCreated(false);
    setResultId("");
    setContent("");
    setPassword("");
    setExpiresIn(60);
    setMaxViews(1);
    setError("");
  };

  const renderSupportSection = () => {
    switch (supportSection) {
      case 'why-use':
        return (
          <div className="p-8 bg-zinc-900/30 border border-zinc-800 rounded-2xl space-y-4">
            <h3 className="text-xl font-bold text-white uppercase tracking-tight">Why Use Self-Destructing Notes</h3>
            <div className="space-y-3 text-sm text-zinc-500 leading-relaxed">
              <p>• Send sensitive information without leaving a digital trail</p>
              <p>• Share passwords and API keys securely</p>
              <p>• Send confidential business information</p>
              <p>• Protect privacy with automatic deletion</p>
            </div>
          </div>
        );
      case 'when-to-use':
        return (
          <div className="p-8 bg-zinc-900/30 border border-zinc-800 rounded-2xl space-y-4">
            <h3 className="text-xl font-bold text-white uppercase tracking-tight">When to Use This</h3>
            <div className="space-y-3 text-sm text-zinc-500 leading-relaxed">
              <p>• Sharing passwords with team members</p>
              <p>• Sending confidential client information</p>
              <p>• Transmitting sensitive personal data</p>
              <p>• Any time you need temporary, secure communication</p>
            </div>
          </div>
        );
      case 'why-safer':
        return (
          <div className="p-8 bg-zinc-900/30 border border-zinc-800 rounded-2xl space-y-4">
            <h3 className="text-xl font-bold text-white uppercase tracking-tight">Why This Is Safer Than Email</h3>
            <div className="space-y-3 text-sm text-zinc-500 leading-relaxed">
              <p>• Messages self-destruct after reading</p>
              <p>• No email trail or permanent records</p>
              <p>• End-to-end encryption</p>
              <p>• No account required or tracking</p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-300 font-mono flex flex-col selection:bg-red-900 selection:text-white">
      {/* Header */}
      <header className="border-b border-zinc-800 p-6 flex items-center justify-between bg-black/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-[960px] mx-auto w-full flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={reset}>
            <div className="p-2 bg-red-950/30 rounded-lg border border-red-900/50">
              <Lock className="w-8 h-8 text-red-600 animate-pulse" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tighter text-white uppercase">SecureNotes</h1>
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest">Private Notes</p>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-[960px] space-y-12">
          {/* SEO Content */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            <div className="space-y-4">
              <h1 className="text-4xl font-bold text-white tracking-tighter uppercase">{h1Text}</h1>
              {introParagraphs.map((paragraph, index) => (
                <p key={index} className="text-zinc-500 max-w-2xl leading-relaxed">
                  {paragraph}
                </p>
              ))}
            </div>
          </motion.div>

          {/* Note Creation Tool */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {!created ? (
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                    <Lock className="w-3 h-3" /> Your Private Note
                  </label>
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Type your private message here..."
                    className="w-full h-32 p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-red-900/50 transition-all resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                      <Clock className="w-3 h-3" /> Expires In
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
                      <ShieldAlert className="w-3 h-3" /> Password (Optional)
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
                  <div className="p-3 bg-red-950/20 border border-red-900/30 rounded-lg text-red-400 text-sm">
                    {error}
                  </div>
                )}

                <button
                  onClick={createNote}
                  disabled={isCreating || !content.trim()}
                  className="w-full p-4 bg-red-950/20 border border-red-900/50 hover:bg-red-900/30 text-red-500 rounded-xl font-bold uppercase tracking-[0.2em] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCreating ? "Creating..." : "Create Private Note"}
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="p-6 bg-zinc-900/30 border border-zinc-800 rounded-2xl space-y-4">
                  <div className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-green-500" />
                    <h3 className="text-lg font-bold text-white uppercase tracking-tight">Note Created</h3>
                  </div>
                  <div className="space-y-3">
                    <p className="text-sm text-zinc-500">Share this link - it will self-destruct after opening:</p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={resultId}
                        readOnly
                        className="flex-1 p-3 bg-black/40 border border-zinc-800 rounded-lg text-zinc-300 text-xs font-mono"
                      />
                      <button
                        onClick={copyToClipboard}
                        className="p-3 bg-zinc-900/50 border border-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800/50 transition-all"
                      >
                        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  onClick={reset}
                  className="w-full p-4 bg-zinc-900/30 border border-zinc-800 hover:bg-zinc-800/50 text-zinc-400 rounded-xl font-bold uppercase tracking-[0.2em] transition-all"
                >
                  Create Another Note
                </button>
              </div>
            )}
          </motion.div>

          {/* Support Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            {renderSupportSection()}
          </motion.div>

          {/* FAQ */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="space-y-6"
          >
            <h3 className="text-2xl font-bold text-white uppercase tracking-tight">Frequently Asked Questions</h3>
            <div className="space-y-4">
              {faqs.map((faq, index) => (
                <div key={index} className="p-6 bg-zinc-900/30 border border-zinc-800 rounded-2xl space-y-3">
                  <h4 className="text-lg font-bold text-white">{faq.question}</h4>
                  <p className="text-sm text-zinc-500 leading-relaxed">{faq.answer}</p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-center space-y-4"
          >
            <p className="text-xl text-zinc-400 font-bold">
              {ctaText}
            </p>
          </motion.div>
        </div>
      </main>
    </div>
  );
};

export default SEOLandingPage;
