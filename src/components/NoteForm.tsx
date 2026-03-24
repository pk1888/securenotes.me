import React from "react";
import { motion } from "motion/react";
import { Ghost, Key, Clock, Lock } from "lucide-react";

export interface NoteFormProps {
  content: string;
  setContent: React.Dispatch<React.SetStateAction<string>>;
  password: string;
  setPassword: React.Dispatch<React.SetStateAction<string>>;
  expiresIn: number;
  setExpiresIn: React.Dispatch<React.SetStateAction<number>>;
  maxViews: number;
  setMaxViews: React.Dispatch<React.SetStateAction<number>>;
  onSubmit: () => void;
  isLoading: boolean;
  error?: string;
}

export const NoteForm: React.FC<NoteFormProps> = ({
  content,
  setContent,
  password,
  setPassword,
  expiresIn,
  setExpiresIn,
  maxViews,
  setMaxViews,
  onSubmit,
  isLoading,
  error,
}) => {
  return (
    <motion.div
      key="note-form"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="space-y-2">
        <label className="text-xs uppercase tracking-widest text-zinc-500 flex items-center gap-2">
          <Ghost className="w-3 h-3" /> The Secret Message
        </label>
        <div className="relative group p-[1px] rounded-xl overflow-hidden">
          <motion.div
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 bg-gradient-to-r from-transparent via-red-600 to-transparent opacity-20"
          />
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write your private note here. Once it's opened, it's gone."
            maxLength={50000}
            className="relative w-full h-64 bg-[#0a0a0a] border border-zinc-800 rounded-xl p-6 focus:outline-none focus:border-red-900/30 transition-all resize-none text-zinc-200 placeholder:text-zinc-700 z-10"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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

        <div className="space-y-2">
          <label className="text-xs uppercase tracking-widest text-zinc-500 flex items-center gap-2">
            <Ghost className="w-3 h-3" /> Max Views
          </label>
          <select
            value={maxViews}
            onChange={(e) => setMaxViews(Number(e.target.value))}
            className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl py-3 px-4 focus:outline-none focus:border-red-900/50 transition-all text-zinc-200 appearance-none cursor-pointer"
          >
            <option value={1}>1 View</option>
            <option value={3}>3 Views</option>
            <option value={5}>5 Views</option>
            <option value={10}>10 Views</option>
            <option value={0}>Unlimited</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="text-red-500 text-xs uppercase tracking-widest">
          {error}
        </div>
      )}

      <button
        type="button"
        onClick={onSubmit}
        disabled={!content.trim() || isLoading}
        className="w-full bg-red-950/20 border border-red-900/50 hover:bg-red-900/30 text-red-500 py-4 rounded-xl font-bold uppercase tracking-[0.2em] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 group"
      >
        <Lock className={`w-5 h-5 ${isLoading ? "animate-spin" : "group-hover:animate-bounce"}`} />
        {isLoading ? "Sealing Note..." : "Create Self-Destructing Note"}
      </button>
    </motion.div>
  );
};

export default NoteForm;
