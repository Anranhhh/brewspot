import { Camera, ChevronLeft, Heart, MapPin, Share2, Star } from 'lucide-react';
import { motion } from 'framer-motion';
import { Cafe } from '../types';

type CafeDetailsScreenProps = {
    cafe: Cafe;
    onBack: () => void;
    onSave: () => void;
};

export default function CafeDetails({ cafe, onBack, onSave }: CafeDetailsScreenProps) {
    return (
        <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="absolute inset-0 bg-white z-[60] overflow-y-auto no-scrollbar"
        >
            <header className="absolute top-0 left-0 right-0 z-20 flex justify-between items-center p-6">
                <button onClick={onBack} className="w-10 h-10 flex items-center justify-center rounded-full bg-white/20 backdrop-blur-md text-white">
                    <ChevronLeft className="w-6 h-6" />
                </button>
                <button className="w-10 h-10 flex items-center justify-center rounded-full bg-white/20 backdrop-blur-md text-white">
                    <Share2 className="w-5 h-5" />
                </button>
            </header>

            <div className="relative h-[450px] w-full">
                <img src={cafe.heroImage} className="w-full h-full object-cover" alt={cafe.name} />
                <button
                    onClick={onSave}
                    className="absolute -bottom-7 right-8 w-14 h-14 bg-white rounded-full shadow-xl flex items-center justify-center text-primary z-10"
                >
                    <Heart className={`w-8 h-8 ${cafe.isSaved ? 'fill-primary' : ''}`} />
                </button>
            </div>

            <main className="relative px-6 pt-10 pb-32">
                <h1 className="font-serif text-4xl text-slate-900 mb-3">{cafe.name}</h1>

                <div className="flex items-center gap-4 text-sm mb-8">
                    <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-primary fill-primary" />
                        <span className="font-bold">{cafe.rating}</span>
                        <span className="text-slate-400 font-medium">({cafe.reviews} reviews)</span>
                    </div>
                    <div className="text-slate-500 font-medium">{cafe.priceLevel} • {cafe.type}</div>
                </div>

                <div className="flex items-start justify-between p-4 bg-slate-50 rounded-2xl mb-8">
                    <div className="flex gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                            <MapPin className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-sm font-semibold leading-tight mb-1">{cafe.address}</p>
                            <p className="text-xs text-slate-500">{cafe.status}</p>
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap gap-2 mb-10">
                    {cafe.tags.map((tag) => (
                        <span key={tag} className="px-4 py-2 rounded-full border border-slate-200 text-xs font-medium text-slate-600">
                            {tag}
                        </span>
                    ))}
                </div>

                <div className="columns-2 gap-4 space-y-4">
                    {cafe.inspirationImages.map((img, idx) => (
                        <div key={idx} className="relative overflow-hidden rounded-lg break-inside-avoid">
                            <img src={img} className="w-full h-auto object-cover" alt="Inspiration" />
                        </div>
                    ))}
                </div>
            </main>

            <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] p-6 bg-white/80 backdrop-blur-xl border-t border-slate-100 z-[70]">
                <button className="w-full bg-primary text-white py-4 px-6 rounded-full font-bold flex items-center justify-center gap-2">
                    <Camera className="w-5 h-5" />
                    Add Photo Inspiration
                </button>
            </div>
        </motion.div>
    );
}