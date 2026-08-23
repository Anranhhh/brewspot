import { useState, useEffect, FormEvent } from 'react';
import { Bookmark, ChevronLeft, Heart, MapPin, MessageCircle, MoreHorizontal, Send, Trash2, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Post } from '../types';
import * as api from '../services/api';

type PostDetailScreenProps = {
    post: Post;
    currentUser?: { id: string; name: string; profile: string | null } | null;
    onBack: () => void;
    onLike: (id: string) => void;
    onSave: (id: string) => void;
    onDeletePost?: (id: string) => void;
};

export default function PostDetail({ post, currentUser, onBack, onLike, onSave, onDeletePost }: PostDetailScreenProps) {
    const [commentText, setCommentText] = useState('');
    const [commentsList, setCommentsList] = useState<any[]>([]);
    const [commentsCount, setCommentsCount] = useState<number>(post.comments || 0);
    const [isLoadingComments, setIsLoadingComments] = useState(true);
    const [isPostingComment, setIsPostingComment] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // Verify if current user is the author of this post
    const isMyPost = Boolean(
        currentUser &&
        post.author &&
        (
            (post.author.id && post.author.id === currentUser.id) ||
            ((post as any).user_id && (post as any).user_id === currentUser.id) ||
            (post.author.name && post.author.name.toLowerCase() === currentUser.name.toLowerCase())
        )
    );

    useEffect(() => {
        setIsLoadingComments(true);
        api.getComments(post.id)
            .then((fetched) => {
                if (fetched) {
                    setCommentsList(fetched);
                    setCommentsCount(fetched.length);
                }
            })
            .catch((err) => console.warn('Failed to load comments:', err))
            .finally(() => setIsLoadingComments(false));
    }, [post.id]);

    const handleAddComment = async (e: FormEvent) => {
        e.preventDefault();
        if (!commentText.trim() || isPostingComment) return;

        const text = commentText.trim();
        setCommentText('');
        setIsPostingComment(true);

        try {
            const newComment = await api.addComment(post.id, text);
            if (newComment) {
                setCommentsList((prev) => [...prev, newComment]);
                setCommentsCount((count) => count + 1);
            }
        } catch (err) {
            console.error('Failed to post comment:', err);
        } finally {
            setIsPostingComment(false);
        }
    };

    const handleDelete = async () => {
        if (!isMyPost || isDeleting) return;
        setIsDeleting(true);

        try {
            await api.deletePost(post.id);
            onDeletePost?.(post.id);
            onBack();
        } catch (err) {
            console.error('Failed to delete post:', err);
            alert('Failed to delete post. Please check permissions.');
        } finally {
            setIsDeleting(false);
            setShowDeleteConfirm(false);
        }
    };

    return (
        <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="absolute inset-0 bg-white z-[60] flex flex-col"
        >
            {/* Header */}
            <header className="sticky top-0 z-10 flex items-center bg-white/80 backdrop-blur-md p-4 justify-between border-b border-primary/10">
                <button onClick={onBack} className="text-slate-900 flex size-10 items-center justify-center rounded-full hover:bg-slate-100 transition-colors">
                    <ChevronLeft className="w-6 h-6" />
                </button>
                <h2 className="text-slate-900 text-lg font-bold">BrewSpot</h2>
                
                <div className="relative">
                    <button
                        onClick={() => setShowMenu(!showMenu)}
                        className="flex size-10 items-center justify-center rounded-full text-slate-900 hover:bg-slate-100 transition-colors"
                    >
                        <MoreHorizontal className="w-6 h-6" />
                    </button>

                    {/* Options Menu Dropdown */}
                    <AnimatePresence>
                        {showMenu && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: -5 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: -5 }}
                                className="absolute right-0 top-12 w-48 bg-white border border-slate-100 rounded-2xl shadow-xl z-50 overflow-hidden py-1"
                            >
                                {isMyPost ? (
                                    <button
                                        onClick={() => {
                                            setShowMenu(false);
                                            setShowDeleteConfirm(true);
                                        }}
                                        className="w-full text-left px-4 py-3 text-sm font-semibold text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4 text-red-500" />
                                        <span>Delete Post</span>
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => setShowMenu(false)}
                                        className="w-full text-left px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                                    >
                                        Share Post
                                    </button>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </header>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto no-scrollbar pb-32">
                <div className="p-4">
                    <div className="relative w-full aspect-[4/5] overflow-hidden rounded-xl shadow-lg bg-slate-100">
                        <img src={post.imageUrl} className="w-full h-full object-cover" alt="Post content" />
                        <div className="absolute top-4 right-4 bg-white/90 backdrop-blur px-3 py-1 rounded-full flex items-center gap-1 shadow-sm">
                            <MapPin className="w-3 h-3 text-primary" />
                            <span className="text-[11px] font-bold text-slate-800">{post.location || 'Unknown Location'}</span>
                        </div>
                    </div>
                </div>

                {/* Actions Bar */}
                <div className="flex items-center justify-between px-6 py-2 border-b border-slate-100">
                    <div className="flex gap-6">
                        <div className="flex flex-col items-center gap-1 cursor-pointer" onClick={() => onLike(post.id)}>
                            <div className={`p-2 rounded-full ${post.isLiked ? 'text-primary' : 'text-slate-600'}`}>
                                <Heart className={`w-6 h-6 ${post.isLiked ? 'fill-primary' : ''}`} />
                            </div>
                            <p className="text-slate-500 text-[12px] font-bold">{post.likes?.toLocaleString()}</p>
                        </div>

                        <div className="flex flex-col items-center gap-1">
                            <div className="p-2 rounded-full text-slate-600">
                                <MessageCircle className="w-6 h-6" />
                            </div>
                            <p className="text-slate-500 text-[12px] font-bold">{commentsCount}</p>
                        </div>

                        <div className="flex flex-col items-center gap-1">
                            <div className="p-2 rounded-full text-slate-600">
                                <Send className="w-6 h-6" />
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col items-center gap-1 cursor-pointer" onClick={() => onSave(post.id)}>
                        <div className={`p-2 rounded-full ${post.isSaved ? 'text-primary' : 'text-slate-600'}`}>
                            <Bookmark className={`w-6 h-6 ${post.isSaved ? 'fill-primary' : ''}`} />
                        </div>
                        <p className="text-slate-500 text-[12px] font-bold">{post.saves}</p>
                    </div>
                </div>

                {/* Caption & Author */}
                <div className="px-6 py-4 border-b border-slate-100">
                    <div className="flex items-center gap-3 mb-3">
                        <img
                            className="size-8 rounded-full object-cover bg-slate-100"
                            src={post.author?.profile || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200'}
                            alt={post.author?.name}
                        />
                        <span className="font-bold text-sm text-slate-900">{post.author?.name || 'Anonymous User'}</span>
                        <span className="text-xs text-slate-400">• {post.timestamp}</span>
                    </div>
                    {post.caption && <p className="text-slate-700 text-sm leading-relaxed">{post.caption}</p>}
                </div>

                {/* Comments Section */}
                <div className="px-6 py-4 space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Comments ({commentsCount})
                    </h3>

                    {isLoadingComments ? (
                        <p className="text-xs text-slate-400 py-4">Loading comments...</p>
                    ) : commentsList.length === 0 ? (
                        <p className="text-xs text-slate-400 py-4 italic">No comments yet. Be the first to share your thoughts!</p>
                    ) : (
                        <div className="space-y-4">
                            {commentsList.map((c) => (
                                <div key={c.id} className="flex gap-3 items-start">
                                    <img
                                        src={c.author?.profile || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150'}
                                        className="w-7 h-7 rounded-full object-cover shrink-0 mt-0.5"
                                        alt={c.author?.name}
                                    />
                                    <div className="flex-1 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-xs font-bold text-slate-900">{c.author?.name || 'User'}</span>
                                            <span className="text-[10px] text-slate-400">{c.timestamp}</span>
                                        </div>
                                        <p className="text-xs text-slate-700 leading-snug">{c.text}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Comment Form Input Bar */}
            <form
                onSubmit={handleAddComment}
                className="absolute bottom-0 left-0 w-full p-4 bg-white/95 backdrop-blur-md border-t border-primary/10 z-20 pb-safe"
            >
                <div className="relative flex items-center gap-3 bg-slate-50 rounded-full px-4 py-2 border border-primary/10">
                    <input
                        className="bg-transparent border-none text-xs text-slate-700 flex-1 placeholder-slate-400 outline-none"
                        placeholder="Add a comment..."
                        type="text"
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                    />
                    <button
                        type="submit"
                        disabled={!commentText.trim() || isPostingComment}
                        className="text-primary font-bold text-xs hover:opacity-80 disabled:opacity-40"
                    >
                        {isPostingComment ? 'Posting...' : 'Post'}
                    </button>
                </div>
            </form>

            {/* Delete Post Confirmation Modal */}
            <AnimatePresence>
                {showDeleteConfirm && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl text-center border border-slate-100"
                        >
                            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
                                <AlertTriangle className="w-6 h-6" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 mb-2">Delete Post?</h3>
                            <p className="text-xs text-slate-500 mb-6 leading-relaxed">
                                Are you sure you want to delete this post? This action will permanently remove it from BrewSpot.
                            </p>
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowDeleteConfirm(false)}
                                    className="flex-1 py-3 bg-slate-100 text-slate-700 font-semibold rounded-full text-xs hover:bg-slate-200 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleDelete}
                                    disabled={isDeleting}
                                    className="flex-1 py-3 bg-red-600 text-white font-semibold rounded-full text-xs hover:bg-red-700 shadow-md shadow-red-500/20 transition-all disabled:opacity-50"
                                >
                                    {isDeleting ? 'Deleting...' : 'Delete'}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}