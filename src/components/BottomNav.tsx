import { Home, Map, Plus, MessageSquare, User } from 'lucide-react';
import { ProfileTab, Screen } from '../types';

type BottomNavProps = {
    currentScreen: Screen;
    onNavigate: (screen: Screen, data?: any, tab?: ProfileTab) => void;
    profileTab: ProfileTab;
};

export default function BottomNav({ currentScreen, onNavigate }: BottomNavProps) {
    return (
        <nav className="absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-slate-100 px-8 py-4 flex items-center justify-between z-50">
            <button
                onClick={() => onNavigate('discovery')}
                className={`flex flex-col items-center gap-1 ${currentScreen === 'discovery' ? 'text-primary' : 'text-slate-400'}`}
            >
                <Home className="w-6 h-6" />
                <span className="text-[10px] font-bold uppercase tracking-tight">Home</span>
            </button>

            <button
                onClick={() => onNavigate('explore')}
                className={`flex flex-col items-center gap-1 ${currentScreen === 'explore' ? 'text-primary' : 'text-slate-400'}`}
            >
                <Map className="w-6 h-6" />
                <span className="text-[10px] font-bold uppercase tracking-tight">Map</span>
            </button>

            <button
                onClick={() => onNavigate('new-post')}
                className="relative -top-8 w-14 h-14 bg-primary rounded-full flex items-center justify-center text-white shadow-xl shadow-primary/30 border-4 border-white"
            >
                <Plus className="w-8 h-8" />
            </button>

            <button
                onClick={() => onNavigate('messages')}
                className={`flex flex-col items-center gap-1 ${currentScreen === 'messages' ? 'text-primary' : 'text-slate-400'}`}
            >
                <MessageSquare className="w-6 h-6" />
                <span className="text-[10px] font-bold uppercase tracking-tight">Chat</span>
            </button>

            <button
                onClick={() => onNavigate('profile')}
                className={`flex flex-col items-center gap-1 ${currentScreen === 'profile' ? 'text-primary' : 'text-slate-400'}`}
            >
                <User className="w-6 h-6" />
                <span className="text-[10px] font-bold uppercase tracking-tight">Profile</span>
            </button>
        </nav>
    );
}