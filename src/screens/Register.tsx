import { useState } from 'react';
import { motion } from 'framer-motion';
import { Rocket, Eye, EyeOff, MailCheck } from 'lucide-react';

type RegisterScreenProps = {
    onRegister: (email: string, pass: string, name: string, username?: string) => Promise<{ requiresVerification?: boolean }>;
    onGoToLogin: () => void;
    onBrowseAsGuest?: () => void;
};

export default function Register({ onRegister, onGoToLogin, onBrowseAsGuest }: RegisterScreenProps) {
    const [fullName, setFullName] = useState('');
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [verificationSent, setVerificationSent] = useState(false);

    const handleRegister = async () => {
        if (!fullName || !email || !password || !confirmPassword) {
            setError('Please fill in all required fields.');
            return;
        }
        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }
        if (password.length < 6) {
            setError('Password must be at least 6 characters.');
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            const res = await onRegister(email, password, fullName, username || undefined);
            if (res?.requiresVerification) {
                setVerificationSent(true);
            }
        } catch (err: any) {
            setError(err.message || 'Registration failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    if (verificationSent) {
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="h-full flex flex-col items-center justify-center px-8 text-center bg-white"
            >
                <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-3xl flex items-center justify-center mb-6 shadow-xl shadow-emerald-500/10">
                    <MailCheck size={40} />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Check Your Email</h2>
                <p className="text-slate-500 text-sm mb-6 leading-relaxed">
                    We sent a verification link to <span className="font-semibold text-slate-700">{email}</span>.
                    Please verify your email address to activate your BrewSpot account.
                </p>
                <div className="w-full space-y-3">
                    <button
                        onClick={onGoToLogin}
                        className="w-full h-14 bg-primary text-white rounded-full font-bold text-lg shadow-lg shadow-primary/20 hover:opacity-90 transition-all"
                    >
                        Return to Sign In
                    </button>
                    {onBrowseAsGuest && (
                        <button
                            onClick={onBrowseAsGuest}
                            className="w-full py-3 text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors"
                        >
                            Browse as Guest
                        </button>
                    )}
                </div>
            </motion.div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="h-full flex flex-col px-8 pb-12 pt-16 relative overflow-y-auto"
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
                <h1 className="text-5xl text-primary mb-1 font-sans font-extrabold tracking-tight">
                    BrewSpot
                </h1>
                <p className="text-slate-600 text-sm font-medium tracking-tight">
                    Join the community & share your favorite aesthetic spots
                </p>
            </div>

            <div className="relative z-10 flex flex-col items-center space-y-3 w-full my-auto">
                <div className="space-y-3 w-full">
                    {error && (
                        <div className="bg-red-50 text-red-500 text-xs px-4 py-2.5 rounded-xl text-center shadow-sm">
                            {error}
                        </div>
                    )}
                    <input
                        className="w-full h-12 bg-white/60 backdrop-blur-sm border border-slate-200 rounded-full px-6 text-sm text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-primary/30 transition-all outline-none"
                        placeholder="Display Name *"
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        disabled={isLoading}
                    />
                    <input
                        className="w-full h-12 bg-white/60 backdrop-blur-sm border border-slate-200 rounded-full px-6 text-sm text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-primary/30 transition-all outline-none"
                        placeholder="Username (optional)"
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                        disabled={isLoading}
                    />
                    <input
                        className="w-full h-12 bg-white/60 backdrop-blur-sm border border-slate-200 rounded-full px-6 text-sm text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-primary/30 transition-all outline-none"
                        placeholder="Email Address *"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={isLoading}
                    />
                    <div className="relative w-full">
                        <input
                            className="w-full h-12 bg-white/60 backdrop-blur-sm border border-slate-200 rounded-full pl-6 pr-12 text-sm text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-primary/30 transition-all outline-none"
                            placeholder="Password *"
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            disabled={isLoading}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none p-1 transition-colors"
                            aria-label={showPassword ? "Hide password" : "Show password"}
                        >
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>
                    <div className="relative w-full">
                        <input
                            className="w-full h-12 bg-white/60 backdrop-blur-sm border border-slate-200 rounded-full pl-6 pr-12 text-sm text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-primary/30 transition-all outline-none"
                            placeholder="Confirm Password *"
                            type={showConfirmPassword ? 'text' : 'password'}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            disabled={isLoading}
                            onKeyDown={(e) => e.key === 'Enter' && handleRegister()}
                        />
                        <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none p-1 transition-colors"
                            aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                        >
                            {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>
                </div>

                <button
                    onClick={handleRegister}
                    disabled={isLoading}
                    className="w-full h-13 bg-primary text-white rounded-full font-bold text-base shadow-lg shadow-primary/20 hover:opacity-90 active:scale-[0.98] transition-all mt-2 disabled:opacity-70"
                >
                    {isLoading ? 'Creating Account...' : 'Create Account'}
                </button>

                <div className="pt-2 flex flex-col items-center gap-2">
                    <p className="text-sm text-slate-500">
                        Already have an account?{' '}
                        <button
                            type="button"
                            onClick={onGoToLogin}
                            className="text-primary font-bold hover:underline decoration-2 underline-offset-4"
                        >
                            Sign In
                        </button>
                    </p>

                    {onBrowseAsGuest && (
                        <button
                            type="button"
                            onClick={onBrowseAsGuest}
                            className="text-xs text-slate-400 font-semibold hover:text-slate-700 transition-colors pt-1"
                        >
                            Or browse as Guest
                        </button>
                    )}
                </div>
            </div>
        </motion.div>
    );
}