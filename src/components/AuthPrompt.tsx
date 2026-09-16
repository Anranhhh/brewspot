import { motion, AnimatePresence } from 'framer-motion';
import { Coffee, X } from 'lucide-react';

interface AuthPromptProps {
  isOpen: boolean;
  title?: string;
  subtitle?: string;
  onClose: () => void;
  onGoToRegister: () => void;
  onGoToLogin: () => void;
}

export default function AuthPrompt({
  isOpen,
  title = "Join BrewSpot",
  subtitle = "Create a BrewSpot account to save cafés, share posts, follow users, and build your coffee collection.",
  onClose,
  onGoToRegister,
  onGoToLogin,
}: AuthPromptProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 40, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 overflow-hidden text-center"
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
            aria-label="Close auth prompt"
          >
            <X size={20} />
          </button>

          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4 text-primary">
            <Coffee size={32} />
          </div>

          <h3 className="text-xl font-bold text-slate-900 mb-2">{title}</h3>
          <p className="text-sm text-slate-500 mb-6 leading-relaxed px-2">{subtitle}</p>

          <div className="flex flex-col gap-3">
            <button
              onClick={() => {
                onClose();
                onGoToRegister();
              }}
              className="w-full h-12 bg-primary text-white font-bold rounded-full shadow-lg shadow-primary/20 hover:opacity-90 active:scale-[0.98] transition-all"
            >
              Create Account
            </button>

            <button
              onClick={() => {
                onClose();
                onGoToLogin();
              }}
              className="w-full h-12 bg-slate-100 text-slate-700 font-semibold rounded-full hover:bg-slate-200 active:scale-[0.98] transition-all"
            >
              Sign In
            </button>

            <button
              onClick={onClose}
              className="w-full py-2 text-xs font-semibold text-slate-400 hover:text-slate-600 transition-colors"
            >
              Not Now
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
