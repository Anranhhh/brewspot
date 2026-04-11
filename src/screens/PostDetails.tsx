import { useState } from 'react';
import { Bookmark, ChevronLeft, Heart, MapPin, MessageCircle, MoreHorizontal, Send } from 'lucide-react';
import { motion } from 'framer-motion';
import { Post } from '../types';

type PostDetailScreenProps = {
    post: Post;
    onBack: () => void;
    onLike: (id: string) => void;
    onSave: (id: string) => void;
};

export default function PostDetail({ post, onBack, onLike, onSave }: PostDetailScreenProps) {
    const [comment, setComment] = useState('');

    return (
        <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="absolute inset-0 bg-white z-[60] flex flex-col"
        >
            <header className="sticky top-0 z-10 flex items-center bg-white/80 backdrop-blur-md p-4 justify-between border-b border-primary/10">
                <button onClick={onBack} className="text-slate-900 flex size-10 items-center justify-center rounded-full">
                    <ChevronLeft className="w-6 h-6" />
                </button>
                <h2 className="text-slate-900 text-lg font-bold">BrewSpot</h2>
                <button className="flex size-10 items-center justify-center rounded-full bg-transparent text-slate-900">
                    <MoreHorizontal className="w-6 h-6" />
                </button>
            </header>

            <div className="flex-1 overflow-y-auto no-scrollbar pb-32">
                <div className="p-4">
                    <div className="relative w-full aspect-[4/5] overflow-hidden rounded-xl shadow-lg">
                        <img src={post.imageUrl} className="w-full h-full object-cover" alt="Post content" />
                        <div className="absolute top-4 right-4 bg-white/90 backdrop-blur px-3 py-1 rounded-full flex items-center gap-1 shadow-sm">
                            <MapPin className="w-3 h-3 text-primary" />
                            <span className="text-[11px] font-bold text-slate-800">{post.location || 'Unknown Location'}</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-between px-6 py-2">
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
                            <p className="text-slate-500 text-[12px] font-bold">{post.comments}</p>
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

                <div className="px-6 py-4">
                    <div className="flex items-center gap-3 mb-3">
                        <img className="size-8 rounded-full object-cover" src={post.author?.profile} alt={post.author?.name} />
                        <span className="font-bold text-sm text-slate-900">{post.author?.name}</span>
                        <span className="text-xs text-slate-400">• {post.timestamp}</span>
                    </div>
                    <p className="text-slate-700 text-sm leading-relaxed">{post.caption}</p>
                </div>
            </div>

            <div className="absolute bottom-0 left-0 w-full p-4 bg-white/90 backdrop-blur-md border-t border-primary/5">
                <div className="relative flex items-center gap-3 bg-slate-50 rounded-full px-4 py-2 border border-primary/10">
                    <input
                        className="bg-transparent border-none text-xs text-slate-600 flex-1 placeholder-slate-400 outline-none"
                        placeholder="Add a comment..."
                        type="text"
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                    />
                    <button className="text-primary font-bold text-xs">Post</button>
                </div>
            </div>
        </motion.div>
    );
}