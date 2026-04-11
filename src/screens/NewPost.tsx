import { MapPin, Plus, Send, Star, X } from 'lucide-react';
import { motion } from 'framer-motion';

type NewPostScreenProps = {
    onClose: () => void;
};

export default function NewPost({ onClose }: { onClose: () => void }) {
    return (
        <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="absolute inset-0 bg-white z-[100] flex flex-col"
        >
            <header className="px-6 py-4 flex items-center justify-between sticky top-0 bg-white/80 backdrop-blur-md z-10">
                <button onClick={onClose} className="w-10 h-10 flex items-center justify-start text-slate-400">
                    <X className="w-6 h-6" />
                </button>
                <h1 className="text-lg font-bold tracking-tight">New Post</h1>
                <div className="w-10"></div>
            </header>

            <main className="flex-1 overflow-y-auto px-6 pb-32 no-scrollbar">
                <div className="mt-4 aspect-square relative rounded-xl overflow-hidden group">
                    <img
                        src="https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&q=80&w=800"
                        className="w-full h-full object-cover"
                        alt="Preview"
                    />
                    <div className="absolute inset-0 bg-black/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="bg-white/20 backdrop-blur-md px-4 py-2 rounded-full text-white text-sm font-medium">
                            Change Photo
                        </div>
                    </div>
                </div>

                <div className="mt-8 space-y-6">
                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-primary/70 px-1">Location</label>
                        <div className="relative">
                            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-primary/40 w-5 h-5" />
                            <select className="w-full bg-primary/5 border-none rounded-full py-4 pl-12 pr-10 appearance-none focus:ring-2 focus:ring-primary/20 text-slate-700 outline-none">
                                <option>Select Coffee Shop</option>
                                <option>The Blanc Atelier</option>
                                <option>Velvet & Vine</option>
                                <option>Bloom & Brew</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex flex-col items-center justify-center py-4 bg-primary/5 rounded-xl border border-primary/10">
                        <p className="text-xs font-bold uppercase tracking-wider text-primary/70 mb-3">Rate the Aesthetic</p>
                        <div className="flex gap-2">
                            {[1, 2, 3, 4].map(i => (
                                <Star key={i} className="w-8 h-8 text-primary fill-primary" />
                            ))}
                            <Star className="w-8 h-8 text-primary/20" />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-primary/70 px-1">Thoughts</label>
                        <textarea
                            className="w-full bg-slate-50 border border-slate-100 rounded-xl p-4 focus:ring-2 focus:ring-primary/20 placeholder:text-slate-400 outline-none"
                            placeholder="Share why this spot is so aesthetic..."
                            rows={3}
                        />
                    </div>

                    <div className="flex flex-wrap gap-2 pt-2">
                        <span className="px-4 py-1.5 bg-slate-50 border border-slate-100 text-xs font-medium rounded-full text-slate-600">#Aesthetic</span>
                        <span className="px-4 py-1.5 bg-slate-50 border border-slate-100 text-xs font-medium rounded-full text-slate-600">#CoffeeLovers</span>
                        <button className="px-3 py-1.5 text-primary text-xs font-bold flex items-center">
                            <Plus className="w-4 h-4 mr-1" /> Add Tags
                        </button>
                    </div>
                </div>
            </main>

            <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-white via-white/90 to-transparent">
                <button
                    onClick={onClose}
                    className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-4 rounded-full shadow-lg shadow-primary/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                >
                    <span>Share Post</span>
                    <Send className="w-4 h-4" />
                </button>
            </div>
        </motion.div>
    );
}