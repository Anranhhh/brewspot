import { Bookmark, ChevronLeft, Grid, Heart, MapPin, Plus, Settings, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { Cafe, Post, ProfileTab, Screen } from '../types';

type ProfileScreenProps = {
    currentUser: { id: string; name: string; profile: string | null } | null;
    posts: Post[];
    userPosts: Post[];
    cafes: Cafe[];
    activeTab: 'posts' | 'liked' | 'saved' | 'shops';
    setActiveTab: (tab: 'posts' | 'liked' | 'saved' | 'shops') => void;
    onNavigate: (screen: Screen, data?: any, tab?: any) => void;
    onSelectPost: (post: Post) => void;
    onSelectCafe: (cafe: Cafe) => void;
    onLogout: () => void;
};

export default function ProfileScreen({ currentUser, posts, userPosts, cafes, activeTab, setActiveTab, onNavigate, onSelectPost, onSelectCafe, onLogout }: ProfileScreenProps) {
    const [showSettings, setShowSettings] = useState(false);
    const likedPosts = posts.filter(p => p.isLiked);
    const savedPosts = posts.filter(p => p.isSaved);
    const savedCafes = cafes.filter(c => c.isSaved);

    const displayPosts = activeTab === 'posts' ? userPosts : activeTab === 'liked' ? likedPosts : activeTab === 'saved' ? savedPosts : [];

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col pb-24 overflow-y-auto no-scrollbar"
        >
            <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md px-6 py-4 flex justify-between items-center border-b border-primary/10">
                <h1 className="text-lg font-bold tracking-tight">@{currentUser ? currentUser.name.toLowerCase().replace(/\s+/g, '_') : 'guest'}</h1>
                <div className="flex gap-4 relative">
                    <button className="text-slate-600"><Plus className="w-6 h-6" /></button>
                    <button onClick={() => setShowSettings(!showSettings)} className="text-slate-600"><Settings className="w-6 h-6" /></button>
                    
                    <AnimatePresence>
                        {showSettings && (
                            <motion.div 
                                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                className="absolute top-10 right-0 bg-white shadow-xl rounded-2xl py-2 w-48 border border-slate-100 z-50 overflow-hidden"
                            >
                                <button
                                    onClick={() => {
                                        setShowSettings(false);
                                        onLogout();
                                    }}
                                    className="w-full text-left px-5 py-3 text-red-500 font-semibold hover:bg-red-50/80 active:bg-red-50 transition-colors flex items-center gap-3"
                                >
                                    Log out
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </header>

            <div className="px-6 pt-8 pb-6 flex flex-col items-center">
                <div className="relative mb-4">
                    <div className="w-28 h-28 rounded-full border-4 border-primary/10 p-1">
                        <img
                            src={currentUser?.profile || "https://i.pravatar.cc/300?u=default"}
                            className="w-full h-full object-cover rounded-full bg-slate-100"
                            alt={currentUser?.name || 'User'}
                        />
                    </div>
                    <div className="absolute bottom-1 right-1 bg-primary text-white p-1.5 rounded-full border-2 border-white shadow-sm">
                        <Plus className="w-3 h-3" />
                    </div>
                </div>

                <div className="text-center">
                    <h2 className="text-2xl font-bold">{currentUser?.name || 'Guest User'}</h2>
                    <p className="text-primary font-medium text-sm mt-0.5">Coffee Enthusiast</p>
                </div>

                <div className="flex gap-12 mt-8 py-4 border-y border-slate-100 w-full justify-center">
                    <div className="text-center">
                        <span className="block font-bold text-lg">{userPosts.length}</span>
                        <span className="text-xs text-slate-400 uppercase tracking-wider">Posts</span>
                    </div>
                    <div className="text-center">
                        <span className="block font-bold text-lg">0</span>
                        <span className="text-xs text-slate-400 uppercase tracking-wider">Followers</span>
                    </div>
                    <div className="text-center">
                        <span className="block font-bold text-lg">{userPosts.reduce((sum, post) => sum + (post.likes || 0), 0)}</span>
                        <span className="text-xs text-slate-400 uppercase tracking-wider">Likes</span>
                    </div>
                </div>

                <button className="mt-6 w-full py-3 bg-primary text-white font-semibold rounded-full shadow-lg shadow-primary/20 hover:opacity-90 transition-opacity">
                    Edit Profile
                </button>
            </div>

            <div className="flex px-4 border-b border-slate-100 overflow-x-auto no-scrollbar">
                <button
                    onClick={() => setActiveTab('posts')}
                    className={`flex-1 min-w-fit px-4 py-4 text-[11px] font-bold border-b-2 flex items-center justify-center gap-1.5 transition-all whitespace-nowrap ${activeTab === 'posts' ? 'border-primary text-primary' : 'border-transparent text-slate-400'
                        }`}
                >
                    <Grid className="w-3.5 h-3.5" />
                    My Posts
                </button>
                <button
                    onClick={() => setActiveTab('liked')}
                    className={`flex-1 min-w-fit px-4 py-4 text-[11px] font-bold border-b-2 flex items-center justify-center gap-1.5 transition-all whitespace-nowrap ${activeTab === 'liked' ? 'border-primary text-primary' : 'border-transparent text-slate-400'
                        }`}
                >
                    <Heart className="w-3.5 h-3.5" />
                    Liked
                </button>
                <button
                    onClick={() => setActiveTab('saved')}
                    className={`flex-1 min-w-fit px-4 py-4 text-[11px] font-bold border-b-2 flex items-center justify-center gap-1.5 transition-all whitespace-nowrap ${activeTab === 'saved' ? 'border-primary text-primary' : 'border-transparent text-slate-400'
                        }`}
                >
                    <Bookmark className="w-3.5 h-3.5" />
                    Saved
                </button>
                <button
                    onClick={() => setActiveTab('shops')}
                    className={`flex-1 min-w-fit px-4 py-4 text-[11px] font-bold border-b-2 flex items-center justify-center gap-1.5 transition-all whitespace-nowrap ${activeTab === 'shops' ? 'border-primary text-primary' : 'border-transparent text-slate-400'
                        }`}
                >
                    <MapPin className="w-3.5 h-3.5" />
                    Shops
                </button>
            </div>

            <div className={activeTab === 'shops' ? 'flex flex-col px-6 gap-4 mt-4' : 'grid grid-cols-3 gap-0.5 mt-0.5'}>
                {activeTab !== 'shops' && displayPosts.map(post => (
                    <div
                        key={post.id}
                        onClick={() => onSelectPost(post)}
                        className="aspect-square relative group cursor-pointer"
                    >
                        <img src={post.imageUrl} className="w-full h-full object-cover" alt="User post" />
                        <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-colors"></div>
                    </div>
                ))}
                {activeTab === 'shops' && savedCafes.map(cafe => (
                    <div
                        key={cafe.id}
                        onClick={() => onSelectCafe(cafe)}
                        className="flex items-center gap-4 bg-white p-3 rounded-2xl border border-slate-100 shadow-sm cursor-pointer hover:bg-slate-50 transition-colors"
                    >
                        <img src={cafe.heroImage} className="w-20 h-20 rounded-xl object-cover" alt={cafe.name} />
                        <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-slate-900 truncate">{cafe.name}</h3>
                            <p className="text-xs text-slate-500 truncate mb-1">{cafe.address}</p>
                            <div className="flex items-center gap-1">
                                <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                                <span className="text-[10px] font-bold text-slate-700">{cafe.rating}</span>
                                <span className="text-[10px] text-slate-400">({cafe.reviews} reviews)</span>
                            </div>
                        </div>
                        <ChevronLeft className="w-5 h-5 text-slate-300 rotate-180" />
                    </div>
                ))}
                {activeTab === 'shops' && savedCafes.length === 0 && (
                    <div className="col-span-3 p-12 text-center text-slate-400 text-sm">
                        No saved shops yet
                    </div>
                )}
                {activeTab !== 'shops' && displayPosts.length === 0 && (
                    <div className="col-span-3 p-12 text-center text-slate-400 text-sm">
                        No posts here yet
                    </div>
                )}
            </div>
        </motion.div>
    );
}