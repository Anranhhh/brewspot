import { useState, useRef, ChangeEvent, FormEvent } from 'react';
import { MapPin, Plus, Send, Star, X, Camera as CameraIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import * as api from '../services/api';

type NewPostProps = {
    onClose: () => void;
    onPostCreated?: () => void;
};

export default function NewPost({ onClose, onPostCreated }: NewPostProps) {
    const [photoUrl, setPhotoUrl] = useState<string>(
        'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&q=80&w=800'
    );
    const [location, setLocation] = useState<string>('The Blanc Atelier');
    const [rating, setRating] = useState<number>(4.5);
    const [caption, setCaption] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const triggerHaptic = async () => {
        try {
            await Haptics.impact({ style: ImpactStyle.Light });
        } catch {
            // Ignore in web browser if haptics unavailable
        }
    };

    const handleSelectPhoto = async () => {
        await triggerHaptic();
        try {
            const image = await Camera.getPhoto({
                quality: 90,
                allowEditing: true,
                resultType: CameraResultType.Uri,
                source: CameraSource.Prompt,
            });
            if (image.webPath) {
                setPhotoUrl(image.webPath);
            }
        } catch {
            fileInputRef.current?.click();
        }
    };

    const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                if (event.target?.result) {
                    setPhotoUrl(event.target.result as string);
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (isSubmitting) return;

        setErrorMsg(null);
        setIsSubmitting(true);
        await triggerHaptic();

        try {
            await api.createPost({
                image_url: photoUrl,
                location: location.trim() || undefined,
                rating: rating,
                caption: caption.trim() || undefined,
            });

            onPostCreated?.();
            onClose();
        } catch (err: any) {
            console.error('Failed to create post:', err);
            setErrorMsg(err.message || 'Failed to publish post. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-0 bg-white z-[100] flex flex-col pt-safe"
        >
            <header className="px-6 py-4 flex items-center justify-between sticky top-0 bg-white/80 backdrop-blur-md z-10 border-b border-slate-100">
                <button onClick={onClose} className="w-10 h-10 flex items-center justify-start text-slate-400">
                    <X className="w-6 h-6" />
                </button>
                <h1 className="text-lg font-bold tracking-tight">New Post</h1>
                <div className="w-10"></div>
            </header>

            <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
                <main className="flex-1 overflow-y-auto px-6 pb-32 no-scrollbar">
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileInputChange}
                        accept="image/*"
                        className="hidden"
                    />

                    {errorMsg && (
                        <div className="mt-4 p-3 bg-red-50 text-red-600 text-xs font-semibold rounded-xl border border-red-100">
                            {errorMsg}
                        </div>
                    )}

                    <div
                        onClick={handleSelectPhoto}
                        className="mt-4 aspect-square relative rounded-2xl overflow-hidden group cursor-pointer border border-slate-100 shadow-sm"
                    >
                        <img
                            src={photoUrl}
                            className="w-full h-full object-cover"
                            alt="Preview"
                        />
                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-90 group-hover:opacity-100 transition-opacity">
                            <div className="bg-white/90 backdrop-blur-md px-5 py-2.5 rounded-full text-slate-900 text-sm font-semibold flex items-center gap-2 shadow-lg">
                                <CameraIcon className="w-4 h-4 text-primary" />
                                <span>Take or Choose Photo</span>
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 space-y-6">
                        {/* Location / Cafe input */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-wider text-primary/70 px-1">Location / Café Name</label>
                            <div className="relative">
                                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-primary/40 w-5 h-5" />
                                <input
                                    type="text"
                                    value={location}
                                    onChange={(e) => setLocation(e.target.value)}
                                    placeholder="Enter café or location name..."
                                    className="w-full bg-primary/5 border-none rounded-full py-3.5 pl-12 pr-6 focus:ring-2 focus:ring-primary/20 text-slate-800 text-sm outline-none font-medium"
                                />
                            </div>
                        </div>

                        {/* Aesthetic Rating */}
                        <div className="flex flex-col items-center justify-center py-4 bg-primary/5 rounded-xl border border-primary/10">
                            <p className="text-xs font-bold uppercase tracking-wider text-primary/70 mb-3">Rate the Aesthetic ({rating} / 5)</p>
                            <div className="flex gap-2">
                                {[1, 2, 3, 4, 5].map((starIndex) => (
                                    <button
                                        type="button"
                                        key={starIndex}
                                        onClick={() => setRating(starIndex)}
                                        className="focus:outline-none transition-transform active:scale-125"
                                    >
                                        <Star
                                            className={`w-8 h-8 ${
                                                starIndex <= Math.floor(rating)
                                                    ? 'text-primary fill-primary'
                                                    : 'text-primary/20'
                                            }`}
                                        />
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Caption / Thoughts */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-wider text-primary/70 px-1">Thoughts</label>
                            <textarea
                                value={caption}
                                onChange={(e) => setCaption(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-100 rounded-xl p-4 focus:ring-2 focus:ring-primary/20 placeholder:text-slate-400 outline-none text-slate-800 text-sm"
                                placeholder="Share why this spot is so aesthetic..."
                                rows={3}
                            />
                        </div>

                        <div className="flex flex-wrap gap-2 pt-2">
                            <span className="px-4 py-1.5 bg-slate-50 border border-slate-100 text-xs font-medium rounded-full text-slate-600">#Aesthetic</span>
                            <span className="px-4 py-1.5 bg-slate-50 border border-slate-100 text-xs font-medium rounded-full text-slate-600">#CoffeeLovers</span>
                            <button type="button" className="px-3 py-1.5 text-primary text-xs font-bold flex items-center">
                                <Plus className="w-4 h-4 mr-1" /> Add Tags
                            </button>
                        </div>
                    </div>
                </main>

                <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-white via-white/90 to-transparent pb-safe z-20">
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-4 rounded-full shadow-lg shadow-primary/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-60"
                    >
                        <span>{isSubmitting ? 'Publishing...' : 'Share Post'}</span>
                        <Send className="w-4 h-4" />
                    </button>
                </div>
            </form>
        </motion.div>
    );
}