import { useState, useEffect, FormEvent } from 'react';
import { Bookmark, ChevronLeft, Heart, MapPin, MessageCircle, MoreHorizontal, Trash2, AlertTriangle, CornerDownRight, X, Reply } from 'lucide-react';
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
    highlightCommentId?: string | null;
};

export default function PostDetail({ post, currentUser, onBack, onLike, onSave, onDeletePost, highlightCommentId }: PostDetailScreenProps) {
    const [commentText, setCommentText] = useState('');
    const [commentsList, setCommentsList] = useState<any[]>([]);
    const [commentsCount, setCommentsCount] = useState<number>(post.comments || 0);
    const [isLoadingComments, setIsLoadingComments] = useState(true);
    const [isPostingComment, setIsPostingComment] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // Comment Action Modal & Reply State
    const [selectedComment, setSelectedComment] = useState<any | null>(null);
    const [replyingTo, setReplyingTo] = useState<{ id: string; name: string } | null>(null);

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

    useEffect(() => {
        if (!isLoadingComments && highlightCommentId) {
            const timer = setTimeout(() => {
                const el = document.getElementById(`comment-${highlightCommentId}`);
                if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [isLoadingComments, highlightCommentId]);

    const handleAddComment = async (e: FormEvent) => {
        e.preventDefault();
        if (!commentText.trim() || isPostingComment) return;

        let text = commentText.trim();
        if (replyingTo && !text.toLowerCase().startsWith(`@${replyingTo.name.toLowerCase()}`)) {
            text = `@${replyingTo.name} ${text}`;
        }

        const parentId = replyingTo ? replyingTo.id : undefined;

        setCommentText('');
        setIsPostingComment(true);

        try {
            const newComment = await api.addComment(post.id, text, parentId);
            if (newComment) {
                setCommentsList((prev) => [...prev, newComment]);
                setCommentsCount((count) => count + 1);
                setReplyingTo(null);
            }
        } catch (err: any) {
            console.error('Failed to post comment:', err);
            alert(err?.message || 'Failed to post comment. Please check your login session.');
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

    const handleDeleteComment = async (commentId: string) => {
        try {
            await api.deleteComment(commentId);
            setCommentsList((prev) => prev.filter((c) => c.id !== commentId && c.parent_id !== commentId && c.parentId !== commentId));
            setCommentsCount((count) => Math.max(0, count - 1));
        } catch (err: any) {
            console.error('Failed to delete comment:', err);
            alert(err?.message || 'Failed to delete comment.');
        }
    };

    // Filter top-level comments (parent_id is null / undefined)
    const topLevelComments = commentsList.filter((c) => !c.parent_id && !c.parentId);

    const renderCommentThread = (comment: any, depth = 0) => {
        const isHighlighted = Boolean(highlightCommentId && comment.id === highlightCommentId);
        const replies = commentsList.filter(
            (item) => (item.parent_id && item.parent_id === comment.id) || (item.parentId && item.parentId === comment.id)
        );

        return (
            <div key={comment.id} id={`comment-${comment.id}`} className={depth > 0 ? "mt-3" : ""}>
                <div
                    onClick={() => setSelectedComment(comment)}
                    className="flex gap-2.5 items-start group cursor-pointer hover:opacity-95 transition-opacity"
                >
                    <img
                        src={comment.author?.profile || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150'}
                        className={`${depth > 0 ? 'w-6 h-6' : 'w-7 h-7'} rounded-full object-cover shrink-0 mt-0.5`}
                        alt={comment.author?.name}
                    />
                    <div className={`flex-1 p-3 rounded-2xl border transition-all ${
                        isHighlighted
                            ? 'bg-amber-50/90 border-amber-400/60 ring-2 ring-amber-400/40 shadow-md scale-[1.01]'
                            : depth > 0
                                ? 'bg-slate-50/70 border-slate-100/90 hover:border-primary/30'
                                : 'bg-slate-50 border-slate-100 group-hover:border-primary/30'
                    }`}>
                        <div className="flex items-center justify-between mb-1">
                            <span className={`font-bold text-slate-900 ${depth > 0 ? 'text-[11px]' : 'text-xs'}`}>
                                {comment.author?.name || 'User'}
                            </span>
                            <span className="text-[10px] text-slate-400">{comment.timestamp}</span>
                        </div>
                        <p className={`text-slate-700 leading-snug ${depth > 0 ? 'text-[11px]' : 'text-xs'}`}>
                            {comment.text}
                        </p>
                    </div>
                </div>

                {/* Render child replies recursively with left indent */}
                {replies.length > 0 && (
                    <div className={`mt-2 ${depth < 3 ? 'ml-5 pl-3 border-l-2 border-slate-100' : 'ml-2 pl-2 border-l border-slate-100'} space-y-2`}>
                        {replies.map((reply) => renderCommentThread(reply, depth + 1))}
                    </div>
                )}
            </div>
        );
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
            <header className="sticky top-0 z-10 flex items-center bg-white/90 backdrop-blur-md px-4 pb-3 pt-safe-top justify-between border-b border-primary/10">
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
            <div className="flex-1 overflow-y-auto pb-32 no-scrollbar">
                {/* Media Image */}
                <div className="relative aspect-square w-full bg-slate-100 overflow-hidden">
                    <img
                        src={post.imageUrl}
                        alt="Post media"
                        className="w-full h-full object-cover"
                    />
                    {post.rating && (
                        <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md text-amber-400 px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1">
                            ★ {post.rating.toFixed(1)}
                        </div>
                    )}
                </div>

                {/* Location Bar */}
                {post.location && (
                    <div className="px-6 py-3 bg-slate-50 flex items-center gap-2 text-xs font-medium text-slate-600 border-b border-slate-100">
                        <MapPin className="w-4 h-4 text-primary shrink-0" />
                        <span className="truncate">{post.location}</span>
                    </div>
                )}

                {/* Action Toolbar */}
                <div className="px-6 py-4 flex items-center justify-around border-b border-slate-100">
                    <div className="flex flex-col items-center gap-1 cursor-pointer" onClick={() => onLike(post.id)}>
                        <div className={`p-2 rounded-full ${post.isLiked ? 'text-red-500 bg-red-50' : 'text-slate-600 hover:bg-slate-50'}`}>
                            <Heart className={`w-6 h-6 ${post.isLiked ? 'fill-red-500' : ''}`} />
                        </div>
                        <p className="text-slate-500 text-[12px] font-bold">{post.likes}</p>
                    </div>

                    <div className="flex flex-col items-center gap-1">
                        <div className="p-2 rounded-full text-slate-600">
                            <MessageCircle className="w-6 h-6" />
                        </div>
                        <p className="text-slate-500 text-[12px] font-bold">{commentsCount}</p>
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
                    ) : topLevelComments.length === 0 ? (
                        <p className="text-xs text-slate-400 py-4 italic">No comments yet. Be the first to share your thoughts!</p>
                    ) : (
                        <div className="space-y-4">
                            {topLevelComments.map((c) => renderCommentThread(c, 0))}
                        </div>
                    )}
                </div>
            </div>

            {/* Comment Form Input Bar */}
            <form
                onSubmit={handleAddComment}
                className="absolute bottom-0 left-0 w-full p-4 bg-white/95 backdrop-blur-md border-t border-primary/10 z-20 pb-safe"
            >
                {/* Replying Banner */}
                {replyingTo && (
                    <div className="flex items-center justify-between bg-primary/10 px-4 py-1.5 rounded-t-xl text-xs font-semibold text-primary mb-2 border border-primary/20">
                        <span className="flex items-center gap-1.5">
                            <Reply className="w-3.5 h-3.5" />
                            <span>Replying to @{replyingTo.name}</span>
                        </span>
                        <button
                            type="button"
                            onClick={() => setReplyingTo(null)}
                            className="p-0.5 hover:bg-primary/20 rounded-full transition-colors"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    </div>
                )}

                <div className="relative flex items-center gap-3 bg-slate-50 rounded-full px-4 py-2 border border-primary/10">
                    <input
                        className="bg-transparent border-none text-xs text-slate-700 flex-1 placeholder-slate-400 outline-none"
                        placeholder={replyingTo ? `Reply to @${replyingTo.name}...` : "Add a comment..."}
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

            {/* Comment Action Modal (Reply & Delete) */}
            <AnimatePresence>
                {selectedComment && (
                    <div
                        className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4"
                        onClick={() => setSelectedComment(null)}
                    >
                        <motion.div
                            initial={{ y: '100%', opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: '100%', opacity: 0 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 250 }}
                            className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-slate-100 overflow-hidden text-center"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-4" />
                            <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl mb-4 border border-slate-100 text-left">
                                <img
                                    src={selectedComment.author?.profile || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150'}
                                    className="w-8 h-8 rounded-full object-cover shrink-0"
                                    alt={selectedComment.author?.name}
                                />
                                <div className="overflow-hidden">
                                    <p className="text-xs font-bold text-slate-900">{selectedComment.author?.name || 'User'}</p>
                                    <p className="text-xs text-slate-500 truncate">{selectedComment.text}</p>
                                </div>
                            </div>

                            <div className="flex flex-col gap-2">
                                {/* Reply Option (Always Available) */}
                                <button
                                    type="button"
                                    onClick={() => {
                                        setReplyingTo({
                                            id: selectedComment.id,
                                            name: selectedComment.author?.name || 'User',
                                        });
                                        setSelectedComment(null);
                                    }}
                                    className="w-full py-3 px-4 bg-primary/10 text-primary font-bold rounded-2xl text-xs flex items-center justify-center gap-2 hover:bg-primary/20 transition-all"
                                >
                                    <CornerDownRight className="w-4 h-4" />
                                    <span>Reply</span>
                                </button>

                                {/* Delete Option (Only if it's user's own comment) */}
                                {Boolean(
                                    currentUser &&
                                    selectedComment.author &&
                                    (
                                        (selectedComment.author.id && selectedComment.author.id === currentUser.id) ||
                                        (selectedComment.author.name && selectedComment.author.name.toLowerCase() === currentUser.name.toLowerCase())
                                    )
                                ) && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const commentId = selectedComment.id;
                                            setSelectedComment(null);
                                            handleDeleteComment(commentId);
                                        }}
                                        className="w-full py-3 px-4 bg-red-50 text-red-600 font-bold rounded-2xl text-xs flex items-center justify-center gap-2 hover:bg-red-100 transition-all"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                        <span>Delete Comment</span>
                                    </button>
                                )}

                                <button
                                    type="button"
                                    onClick={() => setSelectedComment(null)}
                                    className="w-full py-3 px-4 bg-slate-100 text-slate-600 font-semibold rounded-2xl text-xs hover:bg-slate-200 transition-all mt-1"
                                >
                                    Cancel
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

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