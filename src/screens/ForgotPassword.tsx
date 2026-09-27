import { useState } from 'react';
import { ArrowLeft, CheckCircle2, Mail } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '../services/supabaseClient';

type ForgotPasswordProps = {
    onBack: () => void;
};

export default function ForgotPassword({ onBack }: ForgotPasswordProps) {
    const [email, setEmail] = useState('');
    const [state, setState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [error, setError] = useState('');

    const handleSubmit = async () => {
        const normalizedEmail = email.trim();
        if (!normalizedEmail) {
            setError('Please enter your email address.');
            setState('error');
            return;
        }

        setState('loading');
        setError('');
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
            redirectTo: `${window.location.origin}/reset-password`,
        });

        if (resetError) {
            setError(resetError.message);
            setState('error');
            return;
        }

        setState('success');
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full flex flex-col px-8 pb-12 pt-16 relative overflow-y-auto">
            <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
                <img src="https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&q=80&w=800" className="w-full h-full object-cover blur-sm" alt="Coffee background" />
                <div className="absolute inset-0 bg-gradient-to-b from-white via-white/80 to-white" />
            </div>

            <div className="relative z-10 flex flex-col h-full">
                <button type="button" onClick={onBack} className="self-start p-2 -ml-2 text-slate-600 hover:text-primary transition-colors" aria-label="Back to sign in">
                    <ArrowLeft className="w-6 h-6" />
                </button>

                <div className="text-center mt-8">
                    <h1 className="text-5xl text-primary mb-2 font-sans font-extrabold tracking-tight">BrewSpot</h1>
                    <h2 className="text-2xl font-bold text-slate-900 mt-8">Reset your password</h2>
                    <p className="text-slate-600 text-sm mt-3 leading-relaxed">Enter the email address associated with your BrewSpot account.</p>
                </div>

                {state === 'success' ? (
                    <div className="my-auto text-center">
                        <CheckCircle2 className="w-14 h-14 text-emerald-500 mx-auto mb-5" />
                        <h3 className="text-xl font-bold text-slate-900">Check your email</h3>
                        <p className="text-sm text-slate-600 mt-3 leading-relaxed">If an account exists for that email, we sent a password reset link.</p>
                        <button type="button" onClick={onBack} className="w-full h-14 mt-8 bg-primary text-white rounded-full font-bold text-lg shadow-lg shadow-primary/20 hover:opacity-90 transition-all">Back to Sign In</button>
                    </div>
                ) : (
                    <div className="my-auto space-y-4">
                        {state === 'error' && <div className="bg-red-50 text-red-500 text-sm px-4 py-2.5 rounded-xl text-center">{error}</div>}
                        <div className="relative">
                            <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input
                                className="w-full h-14 bg-white/60 backdrop-blur-sm border border-slate-200 rounded-full pl-14 pr-6 text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-primary/30 transition-all outline-none"
                                placeholder="Email Address"
                                type="email"
                                autoComplete="email"
                                value={email}
                                onChange={(event) => setEmail(event.target.value)}
                                onKeyDown={(event) => event.key === 'Enter' && void handleSubmit()}
                                disabled={state === 'loading'}
                            />
                        </div>
                        <button type="button" onClick={() => void handleSubmit()} disabled={state === 'loading'} className="w-full h-14 bg-primary text-white rounded-full font-bold text-lg shadow-lg shadow-primary/20 hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-70">
                            {state === 'loading' ? 'Sending reset link...' : 'Send Reset Email'}
                        </button>
                    </div>
                )}
            </div>
        </motion.div>
    );
}
