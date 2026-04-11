import { useState } from 'react';
import { motion } from 'framer-motion';

import {
    Rocket,
} from "lucide-react";

type LoginScreenProps = {
    onLogin: (email: string, pass: string) => Promise<void>;
    onGoToRegister: () => void;
};

export default function Login({ onLogin, onGoToRegister }: LoginScreenProps) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleLogin = async () => {
        if (!email || !password) {
            setError('Please enter both email and password.');
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            await onLogin(email, password);
        } catch (err: any) {
            setError(err.message || 'Login failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="h-full flex flex-col px-8 pb-12 pt-24 relative overflow-hidden"
        >
            <div className="absolute inset-0 z-0 opacity-20">
                <img
                    src="https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&q=80&w=800"
                    className="w-full h-full object-cover blur-sm"
                    alt="Background"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-white via-white/80 to-white" />
            </div>

            <div className="relative z-10 text-center mb-12">
                <h1 className="text-6xl text-primary mb-2 font-sans font-extrabold tracking-tight">BrewSpot</h1>
                <p className="text-slate-600 font-medium tracking-tight">Find your next favorite aesthetic corner</p>
            </div>

            <div className="relative z-10 flex flex-col items-center space-y-3 w-full">
                <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl">
                    <Rocket className="text-slate-700" size={32} />
                </div>
                <div className="space-y-3 w-full">
                    {error && (
                        <div className="bg-red-50 text-red-500 text-sm px-4 py-2 rounded-xl text-center shadow-sm">
                            {error}
                        </div>
                    )}
                    <input
                        className="w-full h-14 bg-white/60 backdrop-blur-sm border border-slate-200 rounded-full px-6 text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-primary/30 transition-all outline-none"
                        placeholder="Email Address"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={isLoading}
                    />
                    <input
                        className="w-full h-14 bg-white/60 backdrop-blur-sm border border-slate-200 rounded-full px-6 text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-primary/30 transition-all outline-none"
                        placeholder="Password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={isLoading}
                        onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                    />
                </div>

                <button
                    onClick={handleLogin}
                    disabled={isLoading}
                    className="w-full h-14 bg-primary text-white rounded-full font-bold text-lg shadow-lg shadow-primary/20 hover:opacity-90 active:scale-[0.98] transition-all mt-2 disabled:opacity-70"
                >
                    {isLoading ? 'Signing In...' : 'Sign In'}
                </button>

                <div className="pt-4 flex flex-col items-center gap-3">
                    <a className="text-sm font-medium text-slate-500 hover:text-primary transition-colors" href="#">Forgot Password?</a>
                    <p className="text-sm text-slate-500">
                        New here? {' '}
                        <button
                            type="button"
                            onClick={onGoToRegister}
                            className="text-primary font-bold hover:underline decoration-2 underline-offset-4"
                        >
                            Join the Community
                        </button>

                    </p>
                </div>
            </div>
        </motion.div>
    );
}