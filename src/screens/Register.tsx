import { useState } from 'react';
import { motion } from 'framer-motion';
import { Rocket } from 'lucide-react';

type RegisterScreenProps = {
    onRegister: (email: string, pass: string, name: string) => Promise<void>;
    onGoToLogin: () => void;
};

export default function Register({ onRegister, onGoToLogin }: RegisterScreenProps) {
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleRegister = async () => {
        if (!fullName || !email || !password || !confirmPassword) {
            setError('Please fill in all fields.');
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
            await onRegister(email, password, fullName);
        } catch (err: any) {
            setError(err.message || 'Registration failed.');
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
                <h1 className="text-6xl text-primary mb-2 font-sans font-extrabold tracking-tight">
                    BrewSpot
                </h1>
                <p className="text-slate-600 font-medium tracking-tight">
                    Join the community and share your favorite aesthetic corners
                </p>
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
                        placeholder="Full Name"
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        disabled={isLoading}
                    />
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
                    />
                    <input
                        className="w-full h-14 bg-white/60 backdrop-blur-sm border border-slate-200 rounded-full px-6 text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-primary/30 transition-all outline-none"
                        placeholder="Confirm Password"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        disabled={isLoading}
                        onKeyDown={(e) => e.key === 'Enter' && handleRegister()}
                    />
                </div>

                <button
                    onClick={handleRegister}
                    disabled={isLoading}
                    className="w-full h-14 bg-primary text-white rounded-full font-bold text-lg shadow-lg shadow-primary/20 hover:opacity-90 active:scale-[0.98] transition-all mt-2 disabled:opacity-70"
                >
                    {isLoading ? 'Creating Account...' : 'Create Account'}
                </button>

                <div className="pt-4 flex flex-col items-center gap-3">
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
                </div>
            </div>
        </motion.div>
    );
}