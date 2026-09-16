import { Bookmark, ChevronLeft, Grid, Heart, MapPin, Plus, Settings, Star, LogOut, Trash2, ShieldCheck, Edit3 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { Cafe, Post, Screen } from '../types';
import * as api from '../services/api';
import { LegalViewerModal } from '../components/LegalAndModerationModal';

type ProfileScreenProps = {
    currentUser: {
        id: string;
        name: string;
        display_name?: string;
        username?: string;
        profile: string | null;
        avatar_type?: 'default' | 'uploaded';
        avatar_path?: string;
        bio?: string;
    } | null;
    posts: Post[];
    userPosts: Post[];
    cafes: Cafe[];
    activeTab: 'posts' | 'liked' | 'saved' | 'shops';
    setActiveTab: (tab: 'posts' | 'liked' | 'saved' | 'shops') => void;
    onNavigate: (screen: Screen, data?: any, tab?: any) => void;
    onSelectPost: (post: Post) => void;
    onSelectCafe: (cafe: Cafe) => void;
    onLogout: () => void;
    onDeleteAccount?: () => Promise<void>;
};

export default function ProfileScreen({
    currentUser,
    posts,
    userPosts,
    cafes,
    activeTab,
    setActiveTab,
    onNavigate,
    onSelectPost,
    onSelectCafe,
    onLogout,
    onDeleteAccount,
}: ProfileScreenProps) {
    const [showSettings, setShowSettings] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showLegalModal, setShowLegalModal] = useState(false);
    const [legalDoc, setLegalDoc] = useState<'privacy' | 'terms' | 'guidelines' | 'deletion'>('privacy');
    const [followersCount, setFollowersCount] = useState(0);
    const [followingCount, setFollowingCount] = useState(0);
    const [isDeleting, setIsDeleting] = useState(false);

    // Dedicated state for API-loaded collections
    const [apiLikedPosts, setApiLikedPosts] = useState<Post[]>([]);
    const [apiSavedPosts, setApiSavedPosts] = useState<Post[]>([]);
    const [apiSavedCafes, setApiSavedCafes] = useState<Cafe[]>([]);

    useEffect(() => {
        if (!currentUser?.id) return;
        
        // Fetch user profile metrics
        api.getUserProfile(currentUser.id)
            .then((data) => {
                if (data) {
                    setFollowersCount(data.followersCount || 0);
                    setFollowingCount(data.followingCount || 0);
                }
            })
            .catch(() => {});

        // Fetch liked posts, saved posts, and saved cafes from API
        api.getLikedPosts(currentUser.id)
            .then((fetched) => setApiLikedPosts(fetched || []))
            .catch(() => {});

        api.getSavedPosts(currentUser.id)
            .then((fetched) => setApiSavedPosts(fetched || []))
            .catch(() => {});

        api.getSavedCafes(currentUser.id)
            .then((fetched) => setApiSavedCafes(fetched || []))
            .catch(() => {});
    }, [currentUser, activeTab]);

    // Merge in-memory state with API collection results
    const localLiked = posts.filter(p => p.isLiked);
    const likedPosts = apiLikedPosts.length > 0 ? apiLikedPosts : localLiked;

    const localSaved = posts.filter(p => p.isSaved);
    const savedPosts = apiSavedPosts.length > 0 ? apiSavedPosts : localSaved;

    const localSavedCafes = cafes.filter(c => c.isSaved);
    const savedCafes = apiSavedCafes.length > 0 ? apiSavedCafes : localSavedCafes;

    const displayPosts = activeTab === 'posts' ? userPosts : activeTab === 'liked' ? likedPosts : activeTab === 'saved' ? savedPosts : [];

    const avatarUrl = api.getPublicAvatarUrl(currentUser?.avatar_type, currentUser?.avatar_path, currentUser?.profile || undefined);
    const displayName = currentUser?.display_name || currentUser?.name || 'Guest User';
    const usernameHandle = currentUser?.username ? `@${currentUser.username}` : `@${displayName.toLowerCase().replace(/\s+/g, '_')}`;
    const userBio = currentUser?.bio;

    const handleDeleteAccount = async () => {
        if (!onDeleteAccount) return;
        setIsDeleting(true);
        try {
            await onDeleteAccount();
        } catch (err: any) {
            alert(err.message || 'Failed to delete account.');
        } finally {
            setIsDeleting(false);
            setShowDeleteConfirm(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col pb-24 overflow-y-auto no-scrollbar"
        >
            <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md px-6 pb-4 pt-safe-top flex justify-between items-center border-b border-primary/10">
                <h1 className="text-lg font-bold tracking-tight text-slate-900">
                    {usernameHandle}
                </h1>
                <div className="flex gap-4 relative">
                    <button
                        onClick={() => onNavigate('new-post')}
                        className="text-slate-600 hover:text-primary transition-colors"
                        aria-label="New Post"
                    >
                        <Plus className="w-6 h-6" />
                    </button>
                    <button
                        onClick={() => setShowSettings(!showSettings)}
                        className="text-slate-600 hover:text-primary transition-colors"
                        aria-label="Settings"
                    >
                        <Settings className="w-6 h-6" />
                    </button>
                    
                    <AnimatePresence>
                        {showSettings && (
                            <motion.div 
                                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                className="absolute top-10 right-0 bg-white shadow-xl rounded-2xl py-2 w-52 border border-slate-100 z-50 overflow-hidden"
                            >
                                <button
                                    onClick={() => {
                                        setShowSettings(false);
                                        setLegalDoc('privacy');
                                        setShowLegalModal(true);
                                    }}
                                    className="w-full text-left px-5 py-3 text-slate-700 font-semibold hover:bg-slate-50 transition-colors flex items-center gap-3 text-sm border-b border-slate-100"
                                >
                                    <ShieldCheck size={16} className="text-primary" />
                                    <span>Privacy & Legal</span>
                                </button>
                                <button
                                    onClick={() => {
                                        setShowSettings(false);
                                        onLogout();
                                    }}
                                    className="w-full text-left px-5 py-3 text-slate-700 font-semibold hover:bg-slate-50 active:bg-slate-100 transition-colors flex items-center gap-3 text-sm"
                                >
                                    <LogOut size={16} className="text-slate-400" />
                                    <span>Log Out</span>
                                </button>
                                {onDeleteAccount && (
                                    <button
                                        onClick={() => {
                                            setShowSettings(false);
                                            setShowDeleteConfirm(true);
                                        }}
                                        className="w-full text-left px-5 py-3 text-red-500 font-semibold hover:bg-red-50 transition-colors flex items-center gap-3 text-sm border-t border-slate-100"
                                    >
                                        <Trash2 size={16} className="text-red-400" />
                                        <span>Delete Account</span>
                                    </button>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </header>

            {showDeleteConfirm && (
                <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-6">
                    <div className="bg-white rounded-3xl p-6 max-w-sm w-full text-center shadow-2xl">
                        <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Trash2 size={24} />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 mb-2">Delete Account?</h3>
                        <p className="text-sm text-slate-500 mb-6">
                            This action is permanent and will remove your profile, posts, comments, and saved collection.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowDeleteConfirm(false)}
                                disabled={isDeleting}
                                className="flex-1 py-3 bg-slate-100 text-slate-700 font-semibold rounded-full hover:bg-slate-200 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeleteAccount}
                                disabled={isDeleting}
                                className="flex-1 py-3 bg-red-500 text-white font-semibold rounded-full hover:bg-red-600 transition-colors"
                            >
                                {isDeleting ? 'Deleting...' : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="px-6 pt-6 pb-6 flex flex-col items-center">
                <div className="relative mb-3">
                    <div className="w-28 h-28 rounded-full border-4 border-primary/10 p-1 shadow-sm">
                        <img
                            src={avatarUrl}
                            className="w-full h-full object-cover rounded-full bg-slate-100"
                            alt={displayName}
                        />
                    </div>
                </div>

                <div className="text-center max-w-xs">
                    <h2 className="text-2xl font-bold text-slate-900">{displayName}</h2>
                    {userBio ? (
                        <p className="text-slate-600 text-xs mt-1.5 leading-relaxed font-medium">{userBio}</p>
                    ) : (
                        <p className="text-slate-400 text-xs mt-1.5 italic">Tell people a little about yourself...</p>
                    )}

                    <button
                        onClick={() => onNavigate('edit-profile')}
                        className="mt-3.5 px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-full border border-slate-200 transition-all active:scale-95 inline-flex items-center gap-1.5"
                    >
                        <Edit3 className="w-3.5 h-3.5 text-slate-600" />
                        <span>Edit Profile</span>
                    </button>
                </div>

                <div className="flex gap-12 mt-6 py-4 border-y border-slate-100 w-full justify-center">
                    <div className="text-center">
                        <span className="block font-bold text-lg text-slate-900">{userPosts.length}</span>
                        <span className="text-xs text-slate-400 uppercase tracking-wider">Posts</span>
                    </div>
                    <div className="text-center">
                        <span className="block font-bold text-lg text-slate-900">{followersCount}</span>
                        <span className="text-xs text-slate-400 uppercase tracking-wider">Followers</span>
                    </div>
                    <div className="text-center">
                        <span className="block font-bold text-lg text-slate-900">{followingCount}</span>
                        <span className="text-xs text-slate-400 uppercase tracking-wider">Following</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-4 w-full border-b border-slate-100 px-2 bg-white">
                <button
                    onClick={() => setActiveTab('posts')}
                    className={`py-3.5 text-[11px] font-bold border-b-2 flex items-center justify-center gap-1 transition-all ${
                        activeTab === 'posts' ? 'border-primary text-primary' : 'border-transparent text-slate-400'
                    }`}
                >
                    <Grid className="w-3.5 h-3.5 shrink-0" />
                    <span>Posts ({userPosts.length})</span>
                </button>
                <button
                    onClick={() => setActiveTab('liked')}
                    className={`py-3.5 text-[11px] font-bold border-b-2 flex items-center justify-center gap-1 transition-all ${
                        activeTab === 'liked' ? 'border-primary text-primary' : 'border-transparent text-slate-400'
                    }`}
                >
                    <Heart className="w-3.5 h-3.5 shrink-0" />
                    <span>Liked ({likedPosts.length})</span>
                </button>
                <button
                    onClick={() => setActiveTab('saved')}
                    className={`py-3.5 text-[11px] font-bold border-b-2 flex items-center justify-center gap-1 transition-all ${
                        activeTab === 'saved' ? 'border-primary text-primary' : 'border-transparent text-slate-400'
                    }`}
                >
                    <Bookmark className="w-3.5 h-3.5 shrink-0" />
                    <span>Saved ({savedPosts.length})</span>
                </button>
                <button
                    onClick={() => setActiveTab('shops')}
                    className={`py-3.5 text-[11px] font-bold border-b-2 flex items-center justify-center gap-1 transition-all ${
                        activeTab === 'shops' ? 'border-primary text-primary' : 'border-transparent text-slate-400'
                    }`}
                >
                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                    <span>Shops ({savedCafes.length})</span>
                </button>
            </div>

            <div className={activeTab === 'shops' ? 'flex flex-col px-6 gap-4 mt-4' : 'grid grid-cols-3 gap-0.5 mt-0.5'}>
                {activeTab !== 'shops' && displayPosts.map(post => (
                    <div
                        key={post.id}
                        onClick={() => onSelectPost(post)}
                        className="aspect-square relative group cursor-pointer"
                    >
                        <img src={post.imageUrl || undefined} className="w-full h-full object-cover" alt="User post" />
                        <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-colors"></div>
                    </div>
                ))}
                {activeTab === 'shops' && savedCafes.map(cafe => (
                    <div
                        key={cafe.id}
                        onClick={() => onSelectCafe(cafe)}
                        className="flex items-center gap-4 bg-white p-3 rounded-2xl border border-slate-100 shadow-sm cursor-pointer hover:bg-slate-50 transition-colors"
                    >
                        <img src={cafe.heroImage || undefined} className="w-20 h-20 rounded-xl object-cover" alt={cafe.name} />
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

            <LegalViewerModal
                isOpen={showLegalModal}
                initialDoc={legalDoc}
                onClose={() => setShowLegalModal(false)}
            />
        </motion.div>
    );
}
