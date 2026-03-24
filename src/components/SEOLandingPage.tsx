import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Fingerprint,
  ShieldCheck,
  Eye,
  MessageCircle
} from 'lucide-react';

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
  useEffect(() => {
    document.title = title;
    const metaDescriptionTag = document.querySelector('meta[name="description"]');
    if (metaDescriptionTag) {
      metaDescriptionTag.setAttribute('content', metaDescription);
    }
    
    // Add canonical URL
    const canonicalUrl = `${window.location.origin}${window.location.pathname}`;
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
  }, [title, metaDescription]);

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
      <header className="border-b border-zinc-800 p-6 flex items-center justify-between bg-black/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-[960px] mx-auto w-full flex items-center justify-between">
          <a href="/" className="flex items-center gap-3 cursor-pointer">
            <div className="p-2 bg-red-950/30 rounded-lg border border-red-900/50">
              <Fingerprint className="w-8 h-8 text-red-600 animate-pulse" />
            </div>
            <div>
              <div className="text-xl font-bold tracking-tighter text-white uppercase">securenotes.me</div>
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest">Private Notes That Self-Destruct</p>
            </div>
          </a>

          <div className="hidden md:flex items-center gap-6 text-[10px] uppercase tracking-widest text-zinc-600">
            <div className="flex items-center gap-4">
              <span>Encrypted</span>
              <span className="w-1 h-1 bg-zinc-800 rounded-full" />
              <span>One-Time</span>
            </div>

            <a
              href="https://chat.securenotes.me/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-zinc-900/30 border border-zinc-800 rounded-full text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-300 transition-all"
            >
              <MessageCircle className="w-3 h-3" /> Matrix Chat
            </a>

            <a
              href="/privacy"
              className="flex items-center gap-2 px-4 py-2 bg-red-950/20 border border-red-900/30 rounded-full text-red-500 hover:bg-red-900/30 transition-all font-bold"
            >
              <ShieldCheck className="w-3 h-3" /> Privacy
            </a>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-[960px] space-y-12">
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

          {/* HOTFIX: CTA back to the real tool, not another broken form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-8 bg-zinc-900/30 border border-zinc-800 rounded-2xl space-y-6 text-center"
          >
            <h2 className="text-2xl font-bold text-white uppercase tracking-tight">
              Create a Private Note
            </h2>
            <p className="text-zinc-500 max-w-2xl mx-auto leading-relaxed">
              Write your note, generate a link, and once it's opened, it's gone.
              No accounts. No tracking. No permanent history.
            </p>
            <a
              href="/"
              className="inline-flex items-center justify-center px-8 py-4 bg-red-950/20 border border-red-900/50 hover:bg-red-900/30 text-red-500 rounded-xl font-bold uppercase tracking-[0.2em] transition-all"
            >
              Open the Tool
            </a>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            {renderSupportSection()}
          </motion.div>

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

      <footer className="border-t border-zinc-900 p-8 bg-black/80">
        <div className="max-w-[960px] mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
          <div className="text-[10px] text-zinc-600 uppercase tracking-widest text-center md:text-left">
            &copy; 2026 securenotes.me
          </div>
          <div className="flex justify-center gap-6">
            <a
              href="/about"
              className="text-[10px] text-zinc-600 hover:text-red-500 uppercase tracking-widest transition-colors flex items-center gap-2"
            >
              <ShieldCheck className="w-3 h-3" /> About
            </a>
            <a
              href="/analytics"
              className="text-[10px] text-zinc-600 hover:text-red-500 uppercase tracking-widest transition-colors flex items-center gap-2"
            >
              <Eye className="w-3 h-3" /> What we see
            </a>
          </div>
          <div className="text-[10px] text-zinc-600 uppercase tracking-widest text-center md:text-right">
            Client-Side Encrypted Notes
          </div>
        </div>
      </footer>
    </div>
  );
};

export default SEOLandingPage;
