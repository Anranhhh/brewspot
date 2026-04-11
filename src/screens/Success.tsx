import { motion } from 'framer-motion';
import { CheckCircle } from 'lucide-react';

export default function Success({ onContinue }: { onContinue: () => void }) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="h-full flex flex-col items-center justify-center px-8 relative overflow-hidden text-center bg-white"
        >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-white pointer-events-none" />
            
            <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", bounce: 0.5, delay: 0.2 }}
                className="relative z-10 w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mb-8"
            >
                <CheckCircle className="w-12 h-12 text-primary" />
            </motion.div>

            <h1 className="relative z-10 text-4xl font-extrabold text-slate-900 mb-4 tracking-tight">
                Welcome Aboard!
            </h1>
            <p className="relative z-10 text-slate-600 font-medium mb-12 text-lg">
                Your account was registered successfully.
            </p>

            <button
                onClick={onContinue}
                className="relative z-10 w-full h-14 bg-primary text-white rounded-full font-bold text-lg shadow-lg shadow-primary/20 hover:opacity-90 active:scale-[0.98] transition-all"
            >
                Start Exploring
            </button>
        </motion.div>
    );
}
