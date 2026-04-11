import { useState } from 'react';
import { motion } from 'motion/react';
import { Search, Bell, SlidersHorizontal, Star, Heart } from 'lucide-react';
import { Screen, Post, Cafe } from '../types';

function formatReviewCount(reviews: number): string {
    if (reviews >= 1000) {
        return `${(reviews / 1000).toFixed(reviews % 1000 === 0 ? 0 : 1)}k`;
    }
    return String(reviews);
}

type DiscoveryScreenProps = {
    posts: Post[];
    cafes: Cafe[];
    onSelectCafe: (cafe: Cafe) => void;
    onSelectPost: (post: Post) => void;
    onNavigate: (s: Screen, data?: any) => void;
    onSaveCafe: (id: string) => void;
    onLikePost: (id: string) => void;
    isLoading?: boolean;
    feedError?: string | null;
    onRetryFeed?: () => void;
};

export default function Discovery({
    posts,
    cafes,
    onSelectCafe,
    onSelectPost,
    onSaveCafe,
    onLikePost,
    isLoading = false,
    feedError = null,
    onRetryFeed,
}: DiscoveryScreenProps) {
    const categories = ['Minimal', 'Cozy', 'Luxury', 'Study-Friendly', 'Outdoor'];
    const [activeCategory, setActiveCategory] = useState('Minimal');

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col pb-24"
        >
            <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl px-6 pt-6 pb-2">
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-2xl font-bold tracking-tight text-[#E14D4D]">BrewSpot</h1>
                    <div className="w-10 h-10 rounded-full bg-[#E14D4D]/10 flex items-center justify-center">
                        <Bell className="w-5 h-5 text-[#E14D4D]" />
                    </div>
                </div>

                <div className="relative flex items-center gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                        <input
                            className="w-full h-12 pl-12 pr-4 bg-[#D9D9D9] border-none rounded-full text-sm focus:ring-2 focus:ring-primary/50 shadow-sm transition-all outline-none"
                            placeholder="Search coffee shops or city"
                            type="text"
                        />
                    </div>
                    <button className="w-12 h-12 rounded-full bg-[#E14D4D] text-white flex items-center justify-center shadow-lg shadow-primary/20">
                        <SlidersHorizontal className="w-5 h-5" />
                    </button>
                </div>
            </header>

            {feedError && (
                <div className="mx-6 mt-2 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-900">
                    <p className="font-medium">Could not load from the server</p>
                    <p className="text-amber-800/90 mt-1 text-xs">{feedError}</p>
                    <p className="text-xs text-amber-800/80 mt-2">
                        Start the API with <code className="bg-amber-100/80 px-1 rounded">npm run dev:api</code> (needs Supabase env in <code className="bg-amber-100/80 px-1 rounded">.env</code>).
                    </p>
                    {onRetryFeed && (
                        <button
                            type="button"
                            onClick={onRetryFeed}
                            className="mt-3 text-xs font-semibold text-[#E14D4D]"
                        >
                            Try again
                        </button>
                    )}
                </div>
            )}

            <div className="overflow-x-auto no-scrollbar py-4 px-6 flex items-center gap-2 whitespace-nowrap">
                {categories.map((cat) => (
                    <button
                        key={cat}
                        onClick={() => setActiveCategory(cat)}
                        className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-all ${activeCategory === cat
                            ? 'bg-[#E14D4D] text-white shadow-md'
                            : 'bg-white text-slate-600 border border-slate-100'
                            }`}
                    >
                        {cat}
                    </button>
                ))}
            </div>

            <main className="flex-1">
                <section className="mt-4">
                    <div className="px-6 flex justify-between items-end mb-4">
                        <h2 className="text-xl font-bold">Trending Now</h2>
                        <button className="text-[#E14D4D] text-sm font-semibold">See All</button>
                    </div>

                    {isLoading && (
                        <div className="px-6 pb-4 flex gap-3 overflow-x-auto no-scrollbar">
                            {[1, 2, 3].map((i) => (
                                <div
                                    key={i}
                                    className="min-w-[280px] h-[360px] rounded-lg bg-slate-200 animate-pulse shrink-0"
                                />
                            ))}
                        </div>
                    )}

                    {!isLoading && !cafes.length && !feedError && (
                        <p className="px-6 text-sm text-slate-500 pb-4">No cafes yet. Add some in Supabase to see them here.</p>
                    )}

                    <div className="overflow-x-auto no-scrollbar flex gap-5 px-6 pb-4">
                        {!isLoading &&
                            cafes.map((cafe) => (
                            <div
                                key={cafe.id}
                                className="min-w-[280px] group cursor-pointer"
                                onClick={() => onSelectCafe(cafe)}
                            >
                                <div className="relative h-[360px] rounded-lg overflow-hidden shadow-xl">
                                    <img src={cafe.heroImage} className="w-full h-full object-cover" alt={cafe.name} />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>

                                    <div className="absolute bottom-5 left-5 right-5 text-white">
                                        <div className="flex items-center gap-1 mb-1">
                                            <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                                            <span className="text-xs font-semibold">
                                                {cafe.rating} ({formatReviewCount(cafe.reviews)} reviews)
                                            </span>
                                        </div>
                                        <h3 className="text-lg font-bold">{cafe.name}</h3>
                                        <p className="text-sm text-white/80">{cafe.address}</p>
                                    </div>

                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onSaveCafe(cafe.id);
                                        }}
                                        className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center"
                                    >
                                        <Heart className={`w-5 h-5 ${cafe.isSaved ? 'text-primary fill-primary' : 'text-white'}`} />
                                    </button>
                                </div>
                            </div>
                            ))}
                    </div>
                </section>

                <section className="mt-8 px-6">
                    <div className="flex items-center justify-between mb-5">
                        <h2 className="text-xl font-bold">Recent Inspiration</h2>
                        <span className="text-slate-400 text-sm">Daily Updates</span>
                    </div>

                    {!isLoading && !posts.length && !feedError && (
                        <p className="text-sm text-slate-500 mb-4">No posts yet.</p>
                    )}

                    <div className="columns-2 gap-4 space-y-4">
                        {!isLoading &&
                            posts.map((post) => (
                            <div
                                key={post.id}
                                onClick={() => onSelectPost(post)}
                                className="break-inside-avoid relative rounded-xl overflow-hidden shadow-sm group cursor-pointer"
                            >
                                <img src={post.imageUrl} className="w-full object-cover" alt="Inspiration" />
                                <div className="p-3 bg-white">
                                    <div className="flex items-center gap-2">
                                        <img src={post.author?.profile} className="w-5 h-5 rounded-full object-cover" alt={post.author?.name} />
                                        <span className="text-[10px] font-medium opacity-70">@{post.author?.name}</span>
                                    </div>
                                </div>

                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onLikePost(post.id);
                                    }}
                                    className="absolute top-2 right-2 p-1.5 rounded-full bg-white/50 backdrop-blur-sm"
                                >
                                    <Heart className={`w-3 h-3 ${post.isLiked ? 'text-primary fill-primary' : 'text-slate-400'}`} />
                                </button>
                            </div>
                            ))}
                    </div>
                </section>
            </main>
        </motion.div>
    );
}