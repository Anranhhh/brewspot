import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, Grid, MessageSquare, UserCheck, UserPlus } from 'lucide-react';
import { Post, Screen } from '../types';
import { toggleFollowUser, getUserPosts, getUserProfile } from '../services/api';

type UserProfileScreenProps = {
    user: { id?: string; name: string; profile?: string | null } | null;
    currentUser: { id: string; name: string; profile: string | null } | null;
    allPosts: Post[];
    onNavigate: (s: Screen, data?: any) => void;
    onSelectPost: (post: Post) => void;
};

export default function UserProfileScreen({
    user,
    currentUser,
    allPosts,
    onNavigate,
    onSelectPost,
}: UserProfileScreenProps) {
    const targetName = user?.name || 'Coffee Lover';
    const targetHandle = `@${targetName.toLowerCase().replace(/\s+/g, '_')}`;
    const targetAvatar = user?.profile || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300';

    const [isFollowing, setIsFollowing] = useState(false);
    const [followersCount, setFollowersCount] = useState(0);
    const [followingCount, setFollowingCount] = useState(0);
    const [userPosts, setUserPosts] = useState<Post[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // Fetch real profile stats from API
    useEffect(() => {
        const targetId = user?.id || user?.name || targetName;
        getUserProfile(targetId)
            .then((data) => {
                if (data) {
                    setIsFollowing(Boolean(data.isFollowing));
                    setFollowersCount(data.followersCount || 0);
                    setFollowingCount(data.followingCount || 0);
                }
            })
            .catch(() => {});
    }, [user, targetName]);

    // Fetch or filter posts created by this specific target user
    useEffect(() => {
        if (!user) return;
        const matched = allPosts.filter((p) => {
            if (!p.author) return false;
            if (user.id && (p as any).userId) return (p as any).userId === user.id;
            return p.author.name.toLowerCase() === targetName.toLowerCase();
        });

        setUserPosts(matched);

        // Fetch from API if user ID is available
        if (user.id) {
            setIsLoading(true);
            getUserPosts(user.id)
                .then((fetched) => {
                    if (fetched && fetched.length > 0) {
                        setUserPosts(fetched);
                    }
                })
                .catch(() => {})
                .finally(() => setIsLoading(false));
        }
    }, [user, allPosts, targetName]);

    const handleToggleFollow = async () => {
        const targetId = user?.id || user?.name || targetName;
        // Optimistic UI update for instant click feedback
        setIsFollowing((prev) => {
            const next = !prev;
            setFollowersCount((count) => (next ? count + 1 : Math.max(0, count - 1)));
            return next;
        });

        try {
            const res = await toggleFollowUser(targetId);
            if (res) {
                setIsFollowing(Boolean(res.isFollowing));
                setFollowersCount(res.followersCount ?? 0);
            }
        } catch (err) {
            console.warn('Follow API error:', err);
            // Revert state on error
            setIsFollowing((prev) => !prev);
        }
    };

    const handleOpenMessage = () => {
        onNavigate('chat-window', user);
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col pb-24 overflow-y-auto no-scrollbar bg-white"
        >
            {/* Header with Back Button */}
            <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md px-6 py-4 flex items-center justify-between border-b border-slate-100">
                <button
                    onClick={() => onNavigate('discovery')}
                    className="p-2 -ml-2 text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
                >
                    <ChevronLeft className="w-6 h-6" />
                </button>
                <h1 className="text-base font-bold text-slate-900 tracking-tight">{targetHandle}</h1>
                <div className="w-8" />
            </header>

            {/* Profile Header Info */}
            <div className="px-6 pt-6 pb-6 flex flex-col items-center">
                <div className="w-24 h-24 rounded-full border-4 border-primary/10 p-1 mb-4 shadow-sm">
                    <img
                        src={targetAvatar}
                        className="w-full h-full object-cover rounded-full bg-slate-100"
                        alt={targetName}
                    />
                </div>

                <div className="text-center mb-6">
                    <h2 className="text-2xl font-bold text-slate-900">{targetName}</h2>
                    <p className="text-primary font-medium text-sm mt-0.5">Coffee Enthusiast & Spot Finder</p>
                </div>

                {/* Stats Counter Bar */}
                <div className="flex gap-12 py-4 border-y border-slate-100 w-full justify-center">
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

                {/* Action Buttons: Follow / Message */}
                <div className="flex gap-3 mt-6 w-full max-w-sm">
                    <button
                        onClick={handleToggleFollow}
                        className={`flex-1 py-3 font-semibold rounded-full shadow-md flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${
                            isFollowing
                                ? 'bg-slate-100 text-slate-800 border border-slate-200 hover:bg-slate-200'
                                : 'bg-[#E14D4D] text-white shadow-primary/20 hover:opacity-90'
                        }`}
                    >
                        {isFollowing ? (
                            <>
                                <UserCheck className="w-4 h-4 text-slate-600" />
                                <span>Following</span>
                            </>
                        ) : (
                            <>
                                <UserPlus className="w-4 h-4 text-white" />
                                <span>Follow</span>
                            </>
                        )}
                    </button>

                    <button
                        onClick={handleOpenMessage}
                        className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded-full border border-slate-200 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                    >
                        <MessageSquare className="w-4 h-4 text-slate-600" />
                        <span>Message</span>
                    </button>
                </div>
            </div>

            {/* Content Tab Header (Only Posts tab for public view) */}
            <div className="flex border-b border-slate-100 px-6 bg-white">
                <div className="py-3 text-xs font-bold text-primary border-b-2 border-primary flex items-center gap-1.5">
                    <Grid className="w-4 h-4" />
                    <span>Posts ({userPosts.length})</span>
                </div>
            </div>

            {/* Grid of Public Posts Only */}
            <div className="grid grid-cols-3 gap-0.5 mt-0.5 flex-1">
                {userPosts.map((post) => (
                    <div
                        key={post.id}
                        onClick={() => onSelectPost(post)}
                        className="aspect-square relative group cursor-pointer overflow-hidden bg-slate-100"
                    >
                        <img src={post.imageUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform" alt="Post" />
                        <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-colors" />
                    </div>
                ))}

                {!isLoading && userPosts.length === 0 && (
                    <div className="col-span-3 py-16 text-center text-slate-400 text-sm">
                        No posts shared by {targetName} yet
                    </div>
                )}
            </div>
        </motion.div>
    );
}
