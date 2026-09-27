import { useState } from 'react';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '../services/supabaseClient';

type ResetPasswordProps = {
    onComplete: () => void;
};

export default function ResetPassword({ onComplete }: ResetPasswordProps) {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [state, setState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [error, setError] = useState('');

    const handleSubmit = async () => {
        if (password.length < 8) {
            setError('Password must be at least 8 characters.');
            setState('error');
            return;
        }
        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            setState('error');
            return;
        }

        setState('loading');
        setError('');
        const { error: updateError } = await supabase.auth.updateUser({ password });
        if (updateError) {
            setError(updateError.message);
            setState('error');
            return;
        }

        setState('success');
        // End the recovery session so the user explicitly signs in with the
        // new password from the login screen.
        await supabase.auth.signOut();
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full flex flex-col px-8 pb-12 pt-16 relative overflow-y-auto">
            <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
                <img src="https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&q=80&w=800" className="w-full h-full object-cover blur-sm" alt="Coffee background" />
                <div className="absolute inset-0 bg-gradient-to-b from-white via-white/80 to-white" />
            </div>

            <div className="relative z-10 flex flex-col h-full">
                <button type="button" onClick={onComplete} className="self-start p-2 -ml-2 text-slate-600 hover:text-primary transition-colors" aria-label="Back to sign in">
                    <ArrowLeft className="w-6 h-6" />
                </button>
                <div className="text-center mt-8">
                    <h1 className="text-5xl text-primary mb-2 font-sans font-extrabold tracking-tight">BrewSpot</h1>
                    <h2 className="text-2xl font-bold text-slate-900 mt-8">Create New Password</h2>
                    <p className="text-slate-600 text-sm mt-3">Choose a new password for your account.</p>
                </div>

                {state === 'success' ? (
                    <div className="my-auto text-center">
                        <h3 className="text-xl font-bold text-slate-900">Password updated successfully</h3>
                        <p className="text-sm text-slate-600 mt-3">Please sign in with your new password.</p>
                        <button type="button" onClick={onComplete} className="w-full h-14 mt-8 bg-primary text-white rounded-full font-bold text-lg shadow-lg shadow-primary/20 hover:opacity-90 transition-all">Back to Sign In</button>
                    </div>
                ) : (
                    <div className="my-auto space-y-4">
                        {state === 'error' && <div className="bg-red-50 text-red-500 text-sm px-4 py-2.5 rounded-xl text-center">{error}</div>}
                        <PasswordInput label="New Password" value={password} onChange={setPassword} visible={showPassword} onToggle={() => setShowPassword((visible) => !visible)} />
                        <PasswordInput label="Confirm New Password" value={confirmPassword} onChange={setConfirmPassword} visible={showConfirmPassword} onToggle={() => setShowConfirmPassword((visible) => !visible)} />
                        <button type="button" onClick={() => void handleSubmit()} disabled={state === 'loading'} className="w-full h-14 bg-primary text-white rounded-full font-bold text-lg shadow-lg shadow-primary/20 hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-70">
                            {state === 'loading' ? 'Updating password...' : 'Update Password'}
                        </button>
                    </div>
                )}
            </div>
        </motion.div>
    );
}

function PasswordInput({ label, value, onChange, visible, onToggle }: { label: string; value: string; onChange: (value: string) => void; visible: boolean; onToggle: () => void }) {
    return (
        <div className="relative">
            <input className="w-full h-14 bg-white/60 backdrop-blur-sm border border-slate-200 rounded-full pl-6 pr-12 text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-primary/30 transition-all outline-none" placeholder={label} type={visible ? 'text' : 'password'} autoComplete="new-password" value={value} onChange={(event) => onChange(event.target.value)} />
            <button type="button" onClick={onToggle} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1" aria-label={visible ? `Hide ${label}` : `Show ${label}`}>
                {visible ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
        </div>
    );
}
