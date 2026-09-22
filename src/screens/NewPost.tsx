import { useState, useRef, ChangeEvent, FormEvent } from 'react';
import { Plus, Send, Star, X, Camera as CameraIcon, UploadCloud, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import * as api from '../services/api';
import { supabase } from '../services/supabaseClient';
import { Cafe } from '../types';
import CafePicker from '../components/CafePicker';

type NewPostProps = {
    onClose: () => void;
    onPostCreated?: () => void;
    initialCafe?: Cafe | null;
};

export default function NewPost({ onClose, onPostCreated, initialCafe }: NewPostProps) {
    const [photoUrls, setPhotoUrls] = useState<string[]>([]);
    const [selectedCafe, setSelectedCafe] = useState<Cafe | null>(initialCafe || null);
    const [rating, setRating] = useState<number>(initialCafe?.communityRating || 0);
    const [title, setTitle] = useState<string>('');
    const [caption, setCaption] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [uploadingProgress, setUploadingProgress] = useState<string | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);

    const triggerHaptic = async () => {
        try {
            await Haptics.impact({ style: ImpactStyle.Light });
        } catch {
            // Ignore if haptics not available
        }
    };

    const handleSelectPhoto = async () => {
        await triggerHaptic();

        const isNative = Boolean((window as any).Capacitor?.isNativePlatform?.());
        if (!isNative) {
            fileInputRef.current?.click();
            return;
        }

        try {
            const image = await Camera.getPhoto({
                quality: 90,
                allowEditing: true,
                resultType: CameraResultType.Uri,
                source: CameraSource.Prompt,
            });
            if (image.webPath) {
                setPhotoUrls((current) => current.length < 10 ? [...current, image.webPath as string] : current);
                return;
            }
        } catch {
            // Cancellation or denied permission should not open a second
            // picker or force the user to choose a photo.
            return;
        }
    };

    const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (!files.length) return;
        const available = Math.max(0, 10 - photoUrls.length);
        if (files.some((file) => file.size > 10 * 1024 * 1024)) {
            setErrorMsg('Each image must be under 10MB.');
            return;
        }
        files.slice(0, available).forEach((file) => {
            const reader = new FileReader();
            reader.onload = (event) => {
                if (event.target?.result) {
                    setPhotoUrls((current) => [...current, event.target!.result as string].slice(0, 10));
                    setErrorMsg(null);
                }
            };
            reader.readAsDataURL(file);
        });
        e.target.value = '';
    };

    const uploadImageToSupabase = async (imageUriOrData: string): Promise<string> => {
        if (!imageUriOrData.startsWith('data:') && !imageUriOrData.startsWith('blob:')) {
            return imageUriOrData;
        }

        const { data: { session } } = await supabase.auth.getSession();
        const userId = session?.user?.id || 'guest';

        try {
            const response = await fetch(imageUriOrData);
            const blob = await response.blob();

            const ext = blob.type.split('/')[1] || 'jpeg';
            const filePath = `${userId}/${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;

            const { error } = await supabase.storage
                .from('post-images')
                .upload(filePath, blob, {
                    cacheControl: '3600',
                    upsert: true,
                });

            if (error) {
                throw new Error(`Image upload failed: ${error.message}`);
            }

            const { data: publicUrlData } = supabase.storage
                .from('post-images')
                .getPublicUrl(filePath);

            return publicUrlData.publicUrl;
        } catch (err) {
            console.warn('Failed to upload image blob:', err);
            throw err instanceof Error ? err : new Error('Image upload failed.');
        }
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (isSubmitting) return;

        setErrorMsg(null);
        setIsSubmitting(true);
        setUploadingProgress('Compressing & uploading image...');
        await triggerHaptic();

        try {
            if (!photoUrls.length) {
                throw new Error('Please choose at least one photo before publishing.');
            }
            if (!selectedCafe) {
                throw new Error('Please choose an existing BrewSpot café or add one through Google Places.');
            }
            // Cafés opened from Explore may still carry a Google Place ID
            // instead of a BrewSpot UUID. Persist/reuse that Google place
            // before creating the post so posts.cafe_id always references
            // public.cafes.id.
            let postCafe = selectedCafe;
            try {
                postCafe = await api.getCafeById(selectedCafe.id);
            } catch {
                if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(selectedCafe.id) && !selectedCafe.googlePlaceId) {
                    setSelectedCafe(null);
                    throw new Error('That café was removed. Please select an available café before publishing.');
                }
            }
            if (postCafe === selectedCafe && (selectedCafe.googlePlaceId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(selectedCafe.id))) {
                postCafe = await api.createCafeFromGoogle({
                    google_place_id: selectedCafe.googlePlaceId || selectedCafe.id,
                    name: selectedCafe.name,
                    address: selectedCafe.address,
                    latitude: selectedCafe.latitude,
                    longitude: selectedCafe.longitude,
                    google_rating: selectedCafe.googleRating || selectedCafe.rating,
                    google_rating_count: selectedCafe.googleRatingCount || selectedCafe.reviews,
                    price_level: selectedCafe.priceLevel,
                    cafe_type: selectedCafe.type,
                });
                setSelectedCafe(postCafe);
            }
            const finalImageUrls: string[] = [];
            for (let index = 0; index < photoUrls.length; index += 1) {
                setUploadingProgress(`Uploading photo ${index + 1} of ${photoUrls.length}...`);
                finalImageUrls.push(await uploadImageToSupabase(photoUrls[index]));
            }
            setUploadingProgress('Publishing post to feed...');

            await api.createPost({
                image_url: finalImageUrls[0],
                cafe_id: postCafe.id,
                media_urls: finalImageUrls,
                title: title.trim() || undefined,
                location: postCafe.name,
                rating: rating || undefined,
                caption: caption.trim() || undefined,
            });

            onPostCreated?.();
            onClose();
        } catch (err: any) {
            console.error('Failed to create post:', err);
            setErrorMsg(err.message || 'Failed to publish post. Please try again.');
        } finally {
            setIsSubmitting(false);
            setUploadingProgress(null);
        }
    };

    return (
        <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-0 bg-white z-[100] flex flex-col"
        >
            <header className="px-6 pb-4 pt-safe-top flex items-center justify-between sticky top-0 bg-white/80 backdrop-blur-md z-10 border-b border-slate-100">
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
                        multiple
                        className="hidden"
                    />
                    <input
                        type="file"
                        ref={cameraInputRef}
                        onChange={handleFileInputChange}
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                    />

                    {errorMsg && (
                        <div className="mt-4 p-3 bg-red-50 text-red-600 text-xs font-semibold rounded-xl border border-red-100">
                            {errorMsg}
                        </div>
                    )}

                    <div className="mt-4 grid grid-cols-2 gap-3">
                        {photoUrls.map((photo, index) => (
                            <div key={`${photo}-${index}`} className="relative aspect-square rounded-2xl overflow-hidden border border-slate-100 shadow-sm">
                                <img src={photo} className="w-full h-full object-cover" alt={`Selected ${index + 1}`} />
                                <button type="button" onClick={() => setPhotoUrls((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center"><Trash2 className="w-4 h-4" /></button>
                                {index === 0 && <span className="absolute bottom-2 left-2 px-2 py-1 rounded-full bg-black/60 text-white text-[10px] font-bold">Cover</span>}
                            </div>
                        ))}
                        {photoUrls.length < 10 && <button type="button" onClick={handleSelectPhoto} className="aspect-square rounded-2xl border-2 border-dashed border-primary/30 text-primary flex flex-col items-center justify-center gap-2"><CameraIcon className="w-6 h-6" /><span className="text-xs font-bold">Add photo</span></button>}
                    </div>
                    <p className="mt-2 text-xs text-slate-400">Add up to 10 photos. The first photo is the cover.</p>

                    <div className="mt-8 space-y-6">
                        {/* BrewSpot café picker */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-wider text-primary/70 px-1">Café</label>
                            <CafePicker value={selectedCafe} onChange={setSelectedCafe} />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-wider text-primary/70 px-1">Title</label>
                            <input
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                maxLength={120}
                                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary/20 outline-none text-slate-800 text-sm font-semibold"
                                placeholder="Give your inspiration a title"
                            />
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
                        {isSubmitting ? (
                            <>
                                <UploadCloud className="w-4 h-4 animate-bounce" />
                                <span>{uploadingProgress || 'Publishing...'}</span>
                            </>
                        ) : (
                            <>
                                <span>Share Post</span>
                                <Send className="w-4 h-4" />
                            </>
                        )}
                    </button>
                </div>
            </form>
        </motion.div>
    );
}
