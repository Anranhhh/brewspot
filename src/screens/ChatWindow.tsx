import { useState, useEffect, useRef, FormEvent } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, Send, MessageSquare } from 'lucide-react';
import * as api from '../services/api';

type ChatWindowProps = {
    recipient: { id?: string; name: string; profile?: string | null } | null;
    currentUser: { id: string; name: string; profile: string | null } | null;
    onBack: () => void;
};

export default function ChatWindow({ recipient, currentUser, onBack }: ChatWindowProps) {
    const targetName = recipient?.name || 'User';
    const targetAvatar = recipient?.profile || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200';
    const targetIdentifier = recipient?.id || recipient?.name || targetName;

    const [conversation, setConversation] = useState<any[]>([]);
    const [newMessageText, setNewMessageText] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement | null>(null);

    // Fetch conversation history from API
    useEffect(() => {
        if (!targetIdentifier) return;

        setIsLoading(true);
        api.getConversation(targetIdentifier)
            .then((msgs) => {
                setConversation(msgs || []);
            })
            .catch((err) => {
                console.warn('Failed to load conversation:', err);
                setConversation([]);
            })
            .finally(() => setIsLoading(false));
    }, [targetIdentifier]);

    // Auto scroll to bottom on new messages
    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [conversation]);

    const handleSendMessage = async (e: FormEvent) => {
        e.preventDefault();
        if (!newMessageText.trim() || isSending) return;

        const text = newMessageText.trim();
        setNewMessageText('');
        setIsSending(true);

        const nowIso = new Date().toISOString();
        const optimisticMsg = {
            id: `temp-${Date.now()}`,
            sender_id: currentUser?.id || 'me',
            receiver_id: targetIdentifier,
            text: text,
            created_at: nowIso,
            sender: { id: currentUser?.id, name: currentUser?.name || 'You', profile: currentUser?.profile },
            receiver: { id: recipient?.id, name: targetName, profile: targetAvatar },
        };

        setConversation((prev) => [...prev, optimisticMsg]);

        try {
            const created = await api.sendDirectMessage(targetIdentifier, text);
            if (created) {
                setConversation((prev) =>
                    prev.map((m) => (m.id === optimisticMsg.id ? created : m))
                );
            }
        } catch (err) {
            console.error('Failed to send message:', err);
        } finally {
            setIsSending(false);
        }
    };

    const formatTime = (ts: string) => {
        if (!ts) return 'just now';
        try {
            const d = new Date(ts);
            return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } catch {
            return 'just now';
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex-1 flex flex-col h-full bg-white relative overflow-hidden"
        >
            {/* Top Header */}
            <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-100 px-4 py-3 flex items-center gap-3">
                <button
                    onClick={onBack}
                    className="p-1.5 -ml-1 text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
                >
                    <ChevronLeft className="w-6 h-6" />
                </button>

                <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
                    <img src={targetAvatar} className="w-full h-full object-cover" alt={targetName} />
                </div>

                <div className="flex-1 min-w-0">
                    <h2 className="font-bold text-slate-900 text-sm truncate">{targetName}</h2>
                    <p className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Active Now
                    </p>
                </div>
            </header>

            {/* Chat Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50 pb-28">
                {isLoading ? (
                    <div className="py-12 text-center text-slate-400 text-sm">Loading chat history...</div>
                ) : conversation.length === 0 ? (
                    <div className="py-16 flex flex-col items-center justify-center text-center px-4">
                        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-3">
                            <MessageSquare className="w-8 h-8" />
                        </div>
                        <p className="font-bold text-slate-900 text-base">Start a conversation</p>
                        <p className="text-xs text-slate-500 mt-1">
                            Say hi to @{targetName.toLowerCase().replace(/\s+/g, '_')}!
                        </p>
                    </div>
                ) : null}

                {conversation.map((msg) => {
                    const isMe =
                        msg.sender_id === currentUser?.id ||
                        msg.sender?.id === currentUser?.id ||
                        msg.sender?.name === currentUser?.name;

                    return (
                        <div
                            key={msg.id}
                            className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                        >
                            <div
                                className={`max-w-[78%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm ${
                                    isMe
                                        ? 'bg-[#E14D4D] text-white rounded-br-none'
                                        : 'bg-white text-slate-800 border border-slate-200/80 rounded-bl-none'
                                }`}
                            >
                                <p>{msg.text}</p>
                            </div>
                            <span className="text-[10px] text-slate-400 mt-1 px-1">
                                {formatTime(msg.created_at)}
                            </span>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* Fixed Input Bar */}
            <form
                onSubmit={handleSendMessage}
                className="absolute bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 p-3 px-4 flex items-center gap-3 shadow-lg safe-bottom-nav"
            >
                <input
                    className="flex-1 bg-slate-100 border border-slate-200 rounded-full px-5 py-3 text-sm focus:ring-2 focus:ring-primary/40 outline-none text-slate-800 placeholder:text-slate-400"
                    placeholder={`Message ${targetName}...`}
                    type="text"
                    value={newMessageText}
                    onChange={(e) => setNewMessageText(e.target.value)}
                />
                <button
                    type="submit"
                    disabled={!newMessageText.trim() || isSending}
                    className="w-11 h-11 rounded-full bg-[#E14D4D] text-white flex items-center justify-center shadow-md shadow-primary/20 hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 shrink-0"
                >
                    <Send className="w-5 h-5" />
                </button>
            </form>
        </motion.div>
    );
}
