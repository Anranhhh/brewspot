import { useState, useEffect, useCallback } from 'react';
import * as api from './services/api';
import {
  Home,
  Plus,
  User,
  MessageSquare,
  Map,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Screen, Post, Cafe } from './types';
import Login from './screens/Login';
import Register from './screens/Register';
import Discovery from './screens/Discovery';
import Explore from './screens/Explore';
import CafeDetails from './screens/CafeDetails';
import PostDetails from './screens/PostDetails';
import Profile from './screens/Profile';
import UserProfile from './screens/UserProfile';
import Messages from './screens/Messages';
import ChatWindow from './screens/ChatWindow';
import NewPost from './screens/NewPost';
import Success from './screens/Success';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('login');
  const [selectedCafe, setSelectedCafe] = useState<Cafe | null>(null);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [cafes, setCafes] = useState<Cafe[]>([]);
  const [previousScreen, setPreviousScreen] = useState<Screen | null>(null);
  const [profileTab, setProfileTab] = useState<'posts' | 'liked' | 'saved' | 'shops'>('posts');
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string; profile: string | null } | null>(null);
  const [isLoadingFeed, setIsLoadingFeed] = useState(false);
  const [feedError, setFeedError] = useState<string | null>(null);

  const fetchFeedData = useCallback(async () => {
    setIsLoadingFeed(true);
    setFeedError(null);
    try {
      const [fetchedCafes, fetchedPosts] = await Promise.all([
        api.getCafes(),
        api.getPosts(),
      ]);
      setCafes(fetchedCafes);
      setPosts(fetchedPosts);
    } catch (err) {
      console.error('Failed to fetch feed data:', err);
      const message = err instanceof Error ? err.message : 'Could not load discovery feed.';
      setFeedError(message);
      setCafes([]);
      setPosts([]);
    } finally {
      setIsLoadingFeed(false);
    }
  }, []);

  const fetchUserPosts = useCallback(async () => {
    if (!currentUser) return;
    try {
      const fetchedPosts = await api.getUserPosts(currentUser.id);
      setUserPosts(fetchedPosts);
    } catch (err) {
      console.error('Failed to fetch user posts:', err);
    }
  }, [currentUser]);

  useEffect(() => {
    api.getMe().then((res) => {
      if (res && res.user) {
        setCurrentUser(res.user);
        if (currentScreen === 'login' || currentScreen === 'register') {
          setCurrentScreen('discovery');
        }
      }
    });
  }, []);

  useEffect(() => {
    if (currentScreen === 'discovery' || currentScreen === 'explore') {
      fetchFeedData();
    } else if (currentScreen === 'profile') {
      fetchUserPosts();
    }
  }, [currentScreen, fetchFeedData, fetchUserPosts]);

  const [selectedUser, setSelectedUser] = useState<{ id?: string; name: string; profile?: string | null } | null>(null);
  const [exploreSearchQuery, setExploreSearchQuery] = useState<string>('');
  const [messageRecipient, setMessageRecipient] = useState<{ id?: string; name: string; profile?: string | null } | null>(null);
  const [chatRecipient, setChatRecipient] = useState<{ id?: string; name: string; profile?: string | null } | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);

  const navigateTo = (screen: Screen, data: any = null, tab?: any) => {
    if (screen !== 'messages') {
      setIsChatOpen(false);
    }

    if (screen === 'cafe-details') setSelectedCafe(data as Cafe);
    if (screen === 'post-details') setSelectedPost(data as Post);
    if (screen === 'profile' && tab) setProfileTab(tab);
    if (screen === 'user-profile') {
      if (data && currentUser && (data.id === currentUser.id || data.name === currentUser.name)) {
        setCurrentScreen('profile');
        return;
      }
      setSelectedUser(data);
    }
    if (screen === 'chat-window') {
      if (data && typeof data === 'object') {
        setChatRecipient(data.recipient || data);
      }
    }
    if (screen === 'messages') {
      if (data && typeof data === 'object' && 'recipient' in data) {
        setMessageRecipient(data.recipient);
      } else if (data && typeof data === 'object' && 'name' in data) {
        setMessageRecipient(data);
      } else {
        setMessageRecipient(null);
      }
    }
    if (screen === 'explore') {
      if (data && typeof data === 'object' && 'query' in data) {
        setExploreSearchQuery(data.query);
      } else if (typeof data === 'string') {
        setExploreSearchQuery(data);
      } else {
        setExploreSearchQuery('');
      }
    }

    if (screen === 'post-details' || screen === 'cafe-details') {
      setPreviousScreen(currentScreen);
    }

    setCurrentScreen(screen);
  };

  const handleLogin = async (email: string, password: string) => {
    const res = await api.login(email, password);
    setCurrentUser(res.user);
    navigateTo('discovery');
    void fetchFeedData();
  };

  const handleRegister = async (email: string, password: string, name: string) => {
    const res = await api.register(email, password, name);
    setCurrentUser(res.user);
    navigateTo('success');
    void fetchFeedData();
  };

  const handleLogout = () => {
    api.logout();
    setCurrentUser(null);
    navigateTo('login');
  };

  const handleLike = async (postId: string) => {
    const update = (p: Post) =>
      p.id === postId
        ? { ...p, isLiked: !p.isLiked, likes: (p.likes || 0) + (p.isLiked ? -1 : 1) }
        : p;

    setPosts((prev) => prev.map(update));
    setUserPosts((prev) => prev.map(update));
    if (selectedPost?.id === postId) {
      setSelectedPost((prev) => (prev ? update(prev) : null));
    }

    try {
      await api.toggleLikePost(postId);
    } catch { }
  };

  const handleSave = async (postId: string) => {
    const update = (p: Post) =>
      p.id === postId
        ? { ...p, isSaved: !p.isSaved, saves: (p.saves || 0) + (p.isSaved ? -1 : 1) }
        : p;

    setPosts((prev) => prev.map(update));
    setUserPosts((prev) => prev.map(update));
    if (selectedPost?.id === postId) {
      setSelectedPost((prev) => (prev ? update(prev) : null));
    }

    try {
      await api.toggleSavePost(postId);
    } catch { }
  };

  const handleSaveCafe = async (cafeId: string, cafeDetails?: Cafe) => {
    const exists = cafes.some((c) => c.id === cafeId);
    if (exists) {
      setCafes((prev) =>
        prev.map((c) => (c.id === cafeId ? { ...c, isSaved: !c.isSaved } : c))
      );
    } else if (cafeDetails) {
      setCafes((prev) => [...prev, { ...cafeDetails, isSaved: true }]);
    }

    if (selectedCafe?.id === cafeId) {
      setSelectedCafe((prev) => (prev ? { ...prev, isSaved: !prev.isSaved } : null));
    }

    try {
      await api.toggleSaveCafe(cafeId, cafeDetails);
    } catch (err) {
      console.error("Failed to toggle save cafe:", err);
    }
  };

  const handleBack = () => {
    if (previousScreen) {
      setCurrentScreen(previousScreen);
      setPreviousScreen(null);
    } else {
      setCurrentScreen('discovery');
    }
  };

  return (
    <div className="flex justify-center h-screen h-[100dvh] bg-slate-100 overflow-hidden">
      <div className="w-full max-w-[430px] bg-white shadow-2xl relative overflow-hidden flex flex-col h-full">
        <AnimatePresence mode="wait">
          {currentScreen === 'login' && (
            <Login
              onLogin={handleLogin}
              onGoToRegister={() => navigateTo('register')}
            />
          )}

          {currentScreen === 'register' && (
            <Register
              onRegister={handleRegister}
              onGoToLogin={() => navigateTo('login')}
            />
          )}

          {currentScreen === 'success' && (
            <Success onContinue={() => navigateTo('discovery')} />
          )}

          {currentScreen === 'discovery' && (
            <Discovery
              posts={posts}
              cafes={cafes}
              isLoading={isLoadingFeed}
              feedError={feedError}
              onRetryFeed={() => void fetchFeedData()}
              onSelectCafe={(cafe) => navigateTo('cafe-details', cafe)}
              onSelectPost={(post) => navigateTo('post-details', post)}
              onNavigate={navigateTo}
              onSaveCafe={handleSaveCafe}
              onLikePost={handleLike}
            />
          )}

          {currentScreen === 'cafe-details' && selectedCafe && (
            <CafeDetails
              cafe={selectedCafe}
              onBack={handleBack}
              onSave={() => handleSaveCafe(selectedCafe.id, selectedCafe)}
            />
          )}

          {currentScreen === 'post-details' && selectedPost && (
            <PostDetails
              post={selectedPost}
              currentUser={currentUser}
              onBack={handleBack}
              onLike={handleLike}
              onSave={handleSave}
              onDeletePost={(deletedPostId) => {
                setPosts((prev) => prev.filter((p) => p.id !== deletedPostId));
                setUserPosts((prev) => prev.filter((p) => p.id !== deletedPostId));
                void fetchFeedData();
              }}
            />
          )}

          {currentScreen === 'profile' && (
            <Profile
              currentUser={currentUser}
              posts={posts}
              userPosts={userPosts}
              cafes={cafes}
              activeTab={profileTab}
              setActiveTab={setProfileTab}
              onNavigate={navigateTo}
              onSelectPost={(post) => navigateTo('post-details', post)}
              onSelectCafe={(cafe) => navigateTo('cafe-details', cafe)}
              onLogout={handleLogout}
            />
          )}

          {currentScreen === 'messages' && (
            <Messages
              onBack={() => navigateTo('discovery')}
              currentUser={currentUser}
              initialRecipient={messageRecipient}
              onChatOpenChange={setIsChatOpen}
              onSelectChat={(targetUser) => navigateTo('chat-window', targetUser)}
            />
          )}

          {currentScreen === 'chat-window' && (
            <ChatWindow
              recipient={chatRecipient}
              currentUser={currentUser}
              onBack={() => navigateTo('messages')}
            />
          )}

          {currentScreen === 'explore' && (
            <Explore
              cafes={cafes}
              initialQuery={exploreSearchQuery}
              isLoading={isLoadingFeed}
              feedError={feedError}
              onRetryFeed={() => void fetchFeedData()}
              onSelectCafe={(cafe) => navigateTo('cafe-details', cafe)}
              onNavigate={navigateTo}
              onSaveCafe={handleSaveCafe}
            />
          )}

          {currentScreen === 'user-profile' && (
            <UserProfile
              user={selectedUser}
              currentUser={currentUser}
              allPosts={posts}
              onNavigate={navigateTo}
              onSelectPost={(post) => navigateTo('post-details', post)}
            />
          )}

          {currentScreen === 'new-post' && (
            <NewPost
              onClose={() => navigateTo('discovery')}
              onPostCreated={() => void fetchFeedData()}
            />
          )}
        </AnimatePresence>

        {currentScreen !== 'login' &&
          currentScreen !== 'register' &&
          currentScreen !== 'success' &&
          currentScreen !== 'new-post' &&
          currentScreen !== 'user-profile' &&
          currentScreen !== 'chat-window' &&
          !(currentScreen === 'messages' && isChatOpen) && (
            <BottomNav
              currentScreen={currentScreen}
              onNavigate={navigateTo}
              profileTab={profileTab}
            />
          )}
      </div>
    </div>
  );
}

// --- Components ---

function BottomNav({ currentScreen, onNavigate, profileTab }: { currentScreen: Screen, onNavigate: (s: Screen, data?: any, tab?: any) => void, profileTab: string }) {
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
