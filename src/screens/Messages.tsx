import { Bell, MessageSquare, Search } from 'lucide-react';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import * as api from '../services/api';

type MessagesScreenProps = {
    onBack: () => void;
    currentUser: { id: string; name: string; profile: string | null } | null;
};

export default function Messages({ onBack, currentUser }: MessagesScreenProps) {
    const [activeTab, setActiveTab] = useState<'chats' | 'notifications'>('chats');
    const [messages, setMessages] = useState<any[]>([]);
    const [notifications, setNotifications] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

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
                console.error("Failed to load logs:", err);
            } finally {
                setIsLoading(false);
            }
        }
        fetchData();
    }, []);

    // Format time roughly
    const formatTime = (ts: string) => {
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
            className="flex-1 flex flex-col pb-24"
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

            <div className="flex-1 overflow-y-auto no-scrollbar bg-white">
                {isLoading ? (
                    <div className="flex justify-center py-10 opacity-50"><p>Loading...</p></div>
                ) : activeTab === 'chats' ? (
                    <div className="flex flex-col">
                        {messages.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-14 px-6 text-center opacity-60">
                                <MessageSquare className="w-12 h-12 mb-4 text-slate-400" />
                                <p className="text-sm font-medium">No messages yet. Start a conversation!</p>
                            </div>
                        ) : null}
                        {messages.map(msg => {
                            const isMeSender = msg.sender_id === currentUser?.id;
                            const otherUser = isMeSender ? msg.receiver : msg.sender;
                            return (
                                <div key={msg.id} className="flex items-center gap-4 px-4 min-h-[84px] py-3 hover:bg-primary/5 cursor-pointer transition-colors border-b border-primary/5">
                                    <div className="relative">
                                        <div className={`h-14 w-14 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden`}>
                                            <img src={otherUser?.profile || 'https://i.pravatar.cc/150'} className="w-full h-full object-cover" alt="Profile" />
                                        </div>
                                    </div>
                                    <div className="flex flex-col justify-center flex-1">
                                        <div className="flex justify-between items-baseline">
                                            <p className="text-slate-900 text-base font-bold">{otherUser?.name || 'User'}</p>
                                            <p className={`text-slate-400 text-xs font-semibold`}>{formatTime(msg.created_at)}</p>
                                        </div>
                                        <p className={`text-slate-500 text-sm font-medium line-clamp-1`}>
                                            {isMeSender && <span className="font-normal opacity-50 mr-1">You:</span>}
                                            {msg.text}
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

                        {notifications.map(notif => (
                            <div key={notif.id} className="flex items-center gap-4 cursor-pointer group">
                                {notif.system ? (
                                    <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                                        <Bell className="w-6 h-6" />
                                    </div>
                                ) : (
                                    <div className={`w-14 h-14 rounded-full bg-slate-200 flex items-center justify-center border-2 border-primary/10 overflow-hidden shrink-0`}>
                                        <img src={notif.actor?.profile || 'https://i.pravatar.cc/150'} className="w-full h-full object-cover" alt="Profile" />
                                    </div>
                                )}
                                <div className="flex-1 border-b border-slate-50 pb-4 group-last:border-none">
                                    <div className="flex justify-between items-start mb-1">
                                        <div className="text-sm">
                                            {notif.system ? (
                                                <p className="text-slate-600 leading-snug">{notif.action || notif.text}</p>
                                            ) : (
                                                <p className="text-slate-600 leading-snug">
                                                    <span className="font-bold text-slate-800">@{notif.actor?.name || 'user'}</span> {notif.action} {notif.target && <span className="font-medium text-primary">"{notif.target}"</span>}
                                                </p>
                                            )}
                                        </div>
                                        <span className="text-[10px] text-slate-400 whitespace-nowrap ml-2">{formatTime(notif.created_at)}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </motion.div>
    );
}