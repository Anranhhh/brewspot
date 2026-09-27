import { useState } from 'react';
import { motion } from 'framer-motion';
import { Rocket, Eye, EyeOff } from 'lucide-react';

type LoginScreenProps = {
    onLogin: (email: string, pass: string) => Promise<void>;
    onGoToRegister: () => void;
    onForgotPassword: () => void;
    onBrowseAsGuest?: () => void;
};

export default function Login({ onLogin, onGoToRegister, onForgotPassword, onBrowseAsGuest }: LoginScreenProps) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
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
            setError(err.message || 'Login failed. Please check your credentials.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="h-full flex flex-col px-8 pb-12 pt-20 relative overflow-y-auto"
        >
            <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
                <img
                    src="https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&q=80&w=800"
                    className="w-full h-full object-cover blur-sm"
                    alt="Background"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-white via-white/80 to-white" />
            </div>

            <div className="relative z-10 text-center">
                <h1 className="text-6xl text-primary mb-2 font-sans font-extrabold tracking-tight">BrewSpot</h1>
                <p className="text-slate-600 font-medium tracking-tight">Find your next favorite aesthetic corner</p>
            </div>

            <div className="relative z-10 flex flex-col items-center space-y-3 w-full my-auto">
                <div className="space-y-3 w-full">
                    {error && (
                        <div className="bg-red-50 text-red-500 text-sm px-4 py-2.5 rounded-xl text-center shadow-sm">
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
                    <div className="relative w-full">
                        <input
                            className="w-full h-14 bg-white/60 backdrop-blur-sm border border-slate-200 rounded-full pl-6 pr-12 text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-primary/30 transition-all outline-none"
                            placeholder="Password"
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            disabled={isLoading}
                            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none p-1 transition-colors"
                            aria-label={showPassword ? "Hide password" : "Show password"}
                        >
                            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                    </div>
                </div>

                <button
                    onClick={handleLogin}
                    disabled={isLoading}
                    className="w-full h-14 bg-primary text-white rounded-full font-bold text-lg shadow-lg shadow-primary/20 hover:opacity-90 active:scale-[0.98] transition-all mt-2 disabled:opacity-70"
                >
                    {isLoading ? 'Signing In...' : 'Sign In'}
                </button>

                <div className="pt-4 flex flex-col items-center gap-3">
                    <button
                        type="button"
                        onClick={onForgotPassword}
                        className="text-sm font-medium text-slate-500 hover:text-primary transition-colors disabled:opacity-50"
                    >
                        Forgot Password?
                    </button>
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
                    {onBrowseAsGuest && (
                        <button
                            type="button"
                            onClick={onBrowseAsGuest}
                            className="text-xs text-slate-400 font-semibold hover:text-slate-700 transition-colors pt-2"
                        >
                            Or browse as Guest
                        </button>
                    )}
                </div>
            </div>
        </motion.div>
    );
}
