import { Bell, MessageSquare, ChevronLeft, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useRef, FormEvent } from 'react';
import * as api from '../services/api';

type MessagesScreenProps = {
    onBack: () => void;
    currentUser: { id: string; name: string; profile: string | null } | null;
    initialRecipient?: { id?: string; name: string; profile?: string | null } | null;
    onChatOpenChange?: (isOpen: boolean) => void;
    onSelectChat?: (user: { id?: string; name: string; profile?: string | null }) => void;
    onSelectNotificationPost?: (postId: string, commentId?: string) => void;
};

export default function Messages({ onBack, currentUser, initialRecipient, onChatOpenChange, onSelectChat, onSelectNotificationPost }: MessagesScreenProps) {
    const [activeTab, setActiveTab] = useState<'chats' | 'notifications'>('chats');
    const [messages, setMessages] = useState<any[]>([]);
    const [notifications, setNotifications] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Active Chat Session state (if user is currently inside a 1-on-1 chat window)
    const [activeChatUser, setActiveChatUser] = useState<{ id?: string; name: string; profile?: string | null } | null>(initialRecipient || null);
    const [conversation, setConversation] = useState<any[]>([]);
    const [newMessageText, setNewMessageText] = useState('');
    const [isSending, setIsSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement | null>(null);

    // Notify parent when active chat session opens or closes
    useEffect(() => {
        onChatOpenChange?.(Boolean(activeChatUser));
    }, [activeChatUser, onChatOpenChange]);

    // Fetch conversations list & notifications
    useEffect(() => {
        async function fetchData() {
            setIsLoading(true);
            try {
                const [msgs, notifs] = await Promise.all([
                    api.getDirectMessages(),
                    api.getNotifications()
                ]);
                setMessages(msgs || []);
                setNotifications(notifs || []);
            } catch (err) {
                console.error("Failed to load messages/notifications:", err);
            } finally {
                setIsLoading(false);
            }
        }
        fetchData();
    }, []);

    // Load active conversation when activeChatUser changes
    useEffect(() => {
        if (!activeChatUser) return;

        const targetId = activeChatUser.id || activeChatUser.name;
        
        // Filter local messages first
        const localConv = messages.filter(
            (m) =>
                (m.sender_id === currentUser?.id && (m.receiver_id === targetId || m.receiver?.name === activeChatUser.name)) ||
                ((m.sender_id === targetId || m.sender?.name === activeChatUser.name) && m.receiver_id === currentUser?.id)
        );
        setConversation(localConv);

        // Fetch backend conversation history if target user ID is available
        if (activeChatUser.id) {
            api.getConversation(activeChatUser.id)
                .then((fetched) => {
                    if (fetched && fetched.length > 0) {
                        setConversation(fetched);
                    }
                })
                .catch((e) => console.warn("Failed to fetch conversation history:", e));
        }
    }, [activeChatUser, currentUser, messages]);

    // Auto-scroll chat to bottom when messages update
    useEffect(() => {
        if (activeChatUser && messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [conversation, activeChatUser]);

    const handleSendMessage = async (e: FormEvent) => {
        e.preventDefault();
        if (!newMessageText.trim() || !activeChatUser) return;

        const text = newMessageText.trim();
        setNewMessageText('');
        setIsSending(true);

        const receiverId = activeChatUser.id || activeChatUser.name;
        const nowIso = new Date().toISOString();

        // Optimistic UI message append
        const optimisticMsg = {
            id: `temp-${Date.now()}`,
            sender_id: currentUser?.id || 'me',
            receiver_id: receiverId,
            text: text,
            created_at: nowIso,
            sender: { name: currentUser?.name || 'You', profile: currentUser?.profile },
            receiver: { name: activeChatUser.name, profile: activeChatUser.profile },
        };

        setConversation((prev) => [...prev, optimisticMsg]);

        try {
            const created = await api.sendDirectMessage(receiverId, text);
            if (created) {
                setConversation((prev) =>
                    prev.map((m) => (m.id === optimisticMsg.id ? created : m))
                );
            }
            // Fetch fresh messages list to update existing chat previews
            const fresh = await api.getDirectMessages();
            if (fresh && fresh.length > 0) {
                setMessages(fresh);
            }
        } catch (err) {
            console.error("Failed to send message:", err);
        } finally {
            setIsSending(false);
        }
    };

    // Helper to group raw messages into unique 1-on-1 conversation previews
    const conversationsList = (() => {
        const map = new Map<string, any>();

        for (const msg of messages) {
            const isMeSender = msg.sender_id === currentUser?.id || msg.sender?.name === currentUser?.name;
            let other = isMeSender ? msg.receiver : msg.sender;

            if (other && currentUser && other.name === currentUser.name) {
                other = isMeSender ? msg.sender : msg.receiver;
            }

            const key = other?.id || other?.name || (isMeSender ? msg.receiver_id : msg.sender_id);
            if (!key) continue;

            if (!map.has(key)) {
                map.set(key, {
                    id: msg.id,
                    key: key,
                    otherUser: other || { name: key, profile: null },
                    lastMessage: msg.text,
                    created_at: msg.created_at,
                    isMeSender: isMeSender,
                });
            }
        }

        return Array.from(map.values());
    })();

    // Format time roughly
    const formatTime = (ts: string) => {
        if (!ts) return 'just now';
        const d = new Date(ts);
        const now = new Date();
        const diff = now.getTime() - d.getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 60) return `${Math.max(1, mins)}m ago`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours}h ago`;
        return `${Math.floor(hours / 24)}d ago`;
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col overflow-hidden bg-white relative h-full"
        >
            <AnimatePresence mode="wait">
                {activeChatUser ? (
                    /* 1-on-1 CHAT WINDOW VIEW */
                    <motion.div
                        key="chat-window"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="flex-1 flex flex-col h-full overflow-hidden"
                    >
                        {/* Chat Window Header */}
                        <header className="sticky top-0 z-50 bg-white border-b border-slate-100 px-4 py-3 flex items-center gap-3">
                            <button
                                onClick={() => setActiveChatUser(null)}
                                className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                            >
                                <ChevronLeft className="w-6 h-6" />
                            </button>
                            <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
                                <img
                                    src={activeChatUser.profile || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200'}
                                    className="w-full h-full object-cover"
                                    alt={activeChatUser.name}
                                />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="font-bold text-slate-900 text-sm truncate">{activeChatUser.name}</h3>
                                <p className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Active Now
                                </p>
                            </div>
                        </header>

                        {/* Chat Messages Body */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50 pb-32">
                            {conversation.length === 0 ? (
                                <div className="py-12 flex flex-col items-center justify-center text-center px-4">
                                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-3">
                                        <MessageSquare className="w-8 h-8" />
                                    </div>
                                    <p className="font-bold text-slate-900 text-base">Start a conversation</p>
                                    <p className="text-xs text-slate-500 mt-1">
                                        This is the beginning of your direct chat history with @{activeChatUser.name.toLowerCase().replace(/\s+/g, '_')}.
                                    </p>
                                </div>
                            ) : null}

                            {conversation.map((msg) => {
                                const isMe = msg.sender_id === currentUser?.id || msg.sender?.name === currentUser?.name;
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

                        {/* Chat Bottom Input Bar */}
                        <form
                            onSubmit={handleSendMessage}
                            className="absolute bottom-0 left-0 right-0 z-[100] bg-white border-t border-slate-200 p-3 px-4 flex items-center gap-3 shadow-2xl safe-bottom-nav"
                        >
                            <input
                                className="flex-1 bg-slate-100 border border-slate-200 rounded-full px-5 py-3 text-sm focus:ring-2 focus:ring-primary/40 outline-none text-slate-800 placeholder:text-slate-500"
                                placeholder={`Message ${activeChatUser.name}...`}
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
                ) : (
                    /* CONVERSATIONS LIST & NOTIFICATIONS VIEW */
                    <motion.div
                        key="conversations-list"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex-1 flex flex-col h-full overflow-hidden"
                    >
                        <header className="sticky top-0 z-50 bg-white backdrop-blur-xl px-4 pt-4 flex flex-col border-b border-primary/10">
                            <div className="flex items-center justify-between mb-2">
                                <h2 className="text-slate-900 text-xl font-bold leading-tight tracking-tight flex-1 text-center">BrewSpot</h2>
                            </div>

                            <div className="flex justify-between">
                                <button
                                    onClick={() => setActiveTab('chats')}
                                    className={`flex-1 flex flex-col items-center justify-center border-b-[3px] pb-3 pt-4 transition-all ${activeTab === 'chats' ? 'border-primary text-primary' : 'border-transparent text-slate-400'
                                        }`}
                                >
                                    <p className="text-sm font-bold tracking-wide">Messages</p>
                                </button>
                                <button
                                    onClick={() => setActiveTab('notifications')}
                                    className={`flex-1 flex flex-col items-center justify-center border-b-[3px] pb-3 pt-4 transition-all ${activeTab === 'notifications' ? 'border-primary text-primary' : 'border-transparent text-slate-400'
                                        }`}
                                >
                                    <p className="text-sm font-bold tracking-wide">Notifications</p>
                                </button>
                            </div>
                        </header>

                        <div className="flex-1 overflow-y-auto no-scrollbar bg-white pb-28">
                            {isLoading ? (
                                <div className="flex justify-center py-10 opacity-50"><p>Loading...</p></div>
                            ) : activeTab === 'chats' ? (
                                <div className="flex flex-col">
                                    {conversationsList.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-14 px-6 text-center opacity-60">
                                            <MessageSquare className="w-12 h-12 mb-4 text-slate-400" />
                                            <p className="text-sm font-medium">No messages yet. Start a conversation!</p>
                                        </div>
                                    ) : null}
                                    {conversationsList.map((item) => {
                                        const otherUser = item.otherUser;
                                        return (
                                            <div
                                                key={item.id}
                                                onClick={() => {
                                                    const target = {
                                                        id: otherUser?.id || item.key,
                                                        name: otherUser?.name || 'User',
                                                        profile: otherUser?.profile || null,
                                                    };
                                                    if (onSelectChat) {
                                                        onSelectChat(target);
                                                    } else {
                                                        setActiveChatUser(target);
                                                    }
                                                }}
                                                className="flex items-center gap-4 px-4 min-h-[84px] py-3 hover:bg-primary/5 cursor-pointer transition-colors border-b border-primary/5"
                                            >
                                                <div className="relative">
                                                    <div className="h-14 w-14 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden border border-slate-100">
                                                        <img
                                                            src={otherUser?.profile || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200'}
                                                            className="w-full h-full object-cover"
                                                            alt="Profile"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="flex flex-col justify-center flex-1 min-w-0">
                                                    <div className="flex justify-between items-baseline mb-0.5">
                                                        <p className="text-slate-900 text-base font-bold truncate">{otherUser?.name || 'User'}</p>
                                                        <p className="text-slate-400 text-xs font-semibold shrink-0 ml-2">{formatTime(item.created_at)}</p>
                                                    </div>
                                                    <p className="text-slate-500 text-sm font-medium line-clamp-1">
                                                        {item.isMeSender && <span className="font-normal opacity-60 mr-1">You:</span>}
                                                        {item.lastMessage}
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="px-6 py-4 space-y-6">
                                    <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Activity & System</h2>
                                    {notifications.length === 0 ? (
                                        <p className="text-sm text-center opacity-60 py-6">No notifications yet.</p>
                                    ) : null}

                                    {notifications.map(notif => {
                                        const hasTarget = Boolean(notif.target);
                                        return (
                                            <div
                                                key={notif.id}
                                                onClick={() => {
                                                    if (hasTarget && onSelectNotificationPost) {
                                                        let postId = notif.target;
                                                        let commentId: string | undefined = undefined;
                                                        if (typeof notif.target === 'string' && notif.target.includes(':')) {
                                                            const parts = notif.target.split(':');
                                                            postId = parts[0];
                                                            commentId = parts[1];
                                                        }
                                                        onSelectNotificationPost(postId, commentId);
                                                    }
                                                }}
                                                className={`flex items-center gap-4 group p-2 rounded-2xl transition-colors ${hasTarget ? 'cursor-pointer hover:bg-slate-50' : ''}`}
                                            >
                                                {notif.system ? (
                                                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                                                        <Bell className="w-5 h-5" />
                                                    </div>
                                                ) : (
                                                    <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center border-2 border-primary/10 overflow-hidden shrink-0">
                                                        <img src={notif.actor?.profile || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150'} className="w-full h-full object-cover" alt="Profile" />
                                                    </div>
                                                )}
                                                <div className="flex-1 border-b border-slate-100 pb-3 group-last:border-none">
                                                    <div className="flex justify-between items-start mb-0.5">
                                                        <div className="text-xs">
                                                            {notif.system ? (
                                                                <p className="text-slate-700 leading-snug">{notif.action || notif.text}</p>
                                                            ) : (
                                                                <div>
                                                                    <p className="text-slate-700 leading-snug">
                                                                        <span className="font-bold text-slate-900">@{notif.actor?.name || 'user'}</span>{' '}
                                                                        <span>{notif.action}</span>
                                                                    </p>
                                                                    {notif.text && (
                                                                        <p className="text-[11px] text-slate-500 italic mt-0.5 font-normal line-clamp-1">
                                                                            "{notif.text}"
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <span className="text-[10px] text-slate-400 whitespace-nowrap ml-2">{formatTime(notif.created_at)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}