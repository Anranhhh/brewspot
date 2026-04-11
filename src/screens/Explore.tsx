import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Search, SlidersHorizontal, Navigation, Heart, MapPin, Star, ChevronLeft } from 'lucide-react';
import { Cafe, Screen } from '../types';

type ExploreScreenProps = {
    cafes: Cafe[];
    onSelectCafe: (cafe: Cafe) => void;
    onNavigate: (s: Screen, data?: any) => void;
    isLoading?: boolean;
    feedError?: string | null;
    onRetryFeed?: () => void;
};

export default function Explore({
    cafes,
    onSelectCafe,
    isLoading = false,
    feedError = null,
    onRetryFeed,
}: ExploreScreenProps) {
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const categories = ['Top Rated', 'Open Now', 'Wi-Fi', 'Outdoor'];
    const [activeCategory, setActiveCategory] = useState('Top Rated');

    useEffect(() => {
        if (!cafes.length) return;
        const stillValid = selectedId != null && cafes.some((c) => c.id === selectedId);
        if (!stillValid) {
            setSelectedId(cafes[0].id);
        }
    }, [cafes, selectedId]);

    if (isLoading && !cafes.length) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 px-8 text-slate-500">
                <div className="h-12 w-12 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                <p className="text-sm">Loading map…</p>
            </div>
        );
    }

    if (feedError && !cafes.length) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 px-8 text-center">
                <p className="text-sm text-slate-700 font-medium">Could not load cafes</p>
                <p className="text-xs text-slate-500">{feedError}</p>
                {onRetryFeed && (
                    <button
                        type="button"
                        onClick={onRetryFeed}
                        className="text-sm font-semibold text-primary"
                    >
                        Try again
                    </button>
                )}
            </div>
        );
    }

    if (!cafes.length) {
        return <div className="flex-1 flex items-center justify-center text-slate-400">No cafes found</div>;
    }

    const selectedCafe = cafes.find((c) => c.id === selectedId) ?? cafes[0];

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col relative h-full"
        >
            <div className="absolute top-0 left-0 w-full z-10 p-4 pt-6">
                <div className="flex items-center gap-3">
                    <div className="flex-1 flex items-center bg-white/90 backdrop-blur-md rounded-full shadow-lg border border-primary/10 px-4 py-2">
                        <Search className="w-5 h-5 text-primary mr-2" />
                        <input
                            className="bg-transparent border-none focus:ring-0 text-sm w-full outline-none"
                            placeholder="Find a Brew..."
                            type="text"
                            defaultValue={selectedCafe.name}
                        />
                        <SlidersHorizontal className="w-5 h-5 text-slate-400" />
                    </div>

                    <button className="bg-white/90 backdrop-blur-md p-3 rounded-full shadow-lg text-primary border border-primary/10">
                        <Navigation className="w-5 h-5 fill-primary" />
                    </button>
                </div>

                <div className="flex gap-2 mt-4 overflow-x-auto pb-2 no-scrollbar">
                    {categories.map((cat) => (
                        <button
                            key={cat}
                            onClick={() => setActiveCategory(cat)}
                            className={`whitespace-nowrap px-4 py-2 rounded-full text-xs font-semibold shadow-sm flex items-center gap-1 transition-all ${activeCategory === cat
                                ? 'bg-primary text-white'
                                : 'bg-white/90 text-slate-700 border border-primary/5'
                                }`}
                        >
                            {cat === 'Top Rated' && <Heart className="w-3 h-3 fill-white" />}
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex-1 relative bg-[#f2ede4]">
                <div
                    className="absolute inset-0 opacity-40 pointer-events-none"
                    style={{
                        backgroundImage:
                            "url('https://lh3.googleusercontent.com/aida-public/AB6AXuDfbcbSFCFagedkkU8icZGq92M-l3HOCTCsAxlF__mHfx5mWUhIxt9gFgcESx0_Gc5nWg4qZUp7WePMMdWYRdT7EuSk-shyGHXynuHfhHTo-eIl8C_oTlgsnvH7Y3mNI1dHCwxHT5g61YCbfunaaeuKn9OVSC5tRTMItWzg5KqVMakeHnN5diXknnRvJ_A8oF7YWRjDX71PLa0hgt0QipC-LEfMhMb2vvIqhAMdAZRXwKOO0VFE3eC2Y02HFppccmRbRBTpjcpTXDw')",
                        backgroundSize: 'cover',
                    }}
                ></div>

                {cafes.map((cafe, idx) => (
                    <div
                        key={cafe.id}
                        onClick={() => setSelectedId(cafe.id)}
                        className={`absolute flex flex-col items-center cursor-pointer transition-all duration-300 ${idx === 0 ? 'top-[45%] left-[40%]' :
                            idx === 1 ? 'top-[30%] left-[70%]' :
                                idx === 2 ? 'top-[60%] left-[20%]' : 'top-[20%] left-[30%]'
                            }`}
                    >
                        <div
                            className={`p-2 rounded-full shadow-xl transition-all ${selectedCafe.id === cafe.id
                                ? 'bg-primary text-white ring-4 ring-primary/20 scale-110 animate-bounce'
                                : 'bg-white text-primary border border-primary/20 opacity-80'
                                }`}
                        >
                            {idx === 1 ? <Heart className="w-5 h-5 fill-primary" /> : <MapPin className="w-5 h-5 fill-current" />}
                        </div>

                        {selectedCafe.id === cafe.id && (
                            <div className="bg-primary text-white text-[10px] font-bold px-2 py-0.5 rounded-full mt-1 shadow-md">
                                {cafe.name.split(' ')[0]}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <div className="absolute bottom-[88px] left-0 w-full px-4">
                <div className="bg-white rounded-xl shadow-2xl p-4 flex gap-4 items-center border border-primary/5">
                    <div className="w-24 h-24 rounded-lg overflow-hidden shrink-0">
                        <img
                            src={selectedCafe.heroImage}
                            className="w-full h-full object-cover"
                            alt={selectedCafe.name}
                            referrerPolicy="no-referrer"
                        />
                    </div>

                    <div className="flex-1 flex flex-col justify-between h-24 py-1">
                        <div>
                            <div className="flex justify-between items-start">
                                <h3 className="font-bold text-lg leading-tight">{selectedCafe.name}</h3>
                                <Heart className={`w-5 h-5 ${selectedCafe.isSaved ? 'text-primary fill-primary' : 'text-slate-300'}`} />
                            </div>

                            <div className="flex items-center gap-1 mt-0.5">
                                <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                                <span className="text-xs font-bold">{selectedCafe.rating}</span>
                                <span className="text-xs text-slate-400 ml-1">• 0.4 miles away</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => onSelectCafe(selectedCafe)}
                                className="bg-primary text-white text-xs font-bold px-4 py-2 rounded-full flex-1 flex items-center justify-center gap-1 shadow-md shadow-primary/20"
                            >
                                View Details
                                <ChevronLeft className="w-4 h-4 rotate-180" />
                            </button>

                            <button className="bg-primary/10 text-primary p-2 rounded-full">
                                <Navigation className="w-4 h-4 fill-primary" />
                            </button>
                        </div>
                    </div>
                </div>

                <div className="flex justify-center mt-2">
                    <div className="w-12 h-1.5 bg-slate-300 rounded-full opacity-50"></div>
                </div>
            </div>
        </motion.div>
    );
}