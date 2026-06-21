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
import Messages from './screens/Messages';
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

  const navigateTo = (screen: Screen, data: Cafe | Post | null = null, tab?: any) => {
    if (screen === 'cafe-details') setSelectedCafe(data as Cafe);
    if (screen === 'post-details') setSelectedPost(data as Post);
    if (screen === 'profile' && tab) setProfileTab(tab);

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
    <div className="flex justify-center min-h-screen bg-slate-100">
      <div className="w-full max-w-[430px] bg-white shadow-2xl relative overflow-hidden flex flex-col min-h-screen">
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
              onBack={handleBack}
              onLike={handleLike}
              onSave={handleSave}
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
            <Messages onBack={() => navigateTo('discovery')} currentUser={currentUser} />
          )}

          {currentScreen === 'explore' && (
            <Explore
              cafes={cafes}
              isLoading={isLoadingFeed}
              feedError={feedError}
              onRetryFeed={() => void fetchFeedData()}
              onSelectCafe={(cafe) => navigateTo('cafe-details', cafe)}
              onNavigate={navigateTo}
              onSaveCafe={handleSaveCafe}
            />
          )}

          {currentScreen === 'new-post' && (
            <NewPost onClose={() => navigateTo('discovery')} />
          )}
        </AnimatePresence>

        {currentScreen !== 'login' &&
          currentScreen !== 'register' &&
          currentScreen !== 'success' &&
          currentScreen !== 'new-post' && (
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

// --- Screens ---
/*
function CafeDetailsScreen({ cafe, onBack, onSave }: { cafe: Cafe, onBack: () => void, onSave: () => void }) {
  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="absolute inset-0 bg-white z-[60] overflow-y-auto no-scrollbar"
    >
      <header className="absolute top-0 left-0 right-0 z-20 flex justify-between items-center p-6">
        <button
          onClick={onBack}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-white/20 backdrop-blur-md text-white"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <button className="w-10 h-10 flex items-center justify-center rounded-full bg-white/20 backdrop-blur-md text-white">
          <Share2 className="w-5 h-5" />
        </button>
      </header>

      <div className="relative h-[450px] w-full">
        <img src={cafe.heroImage} className="w-full h-full object-cover" alt={cafe.name} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent"></div>
        <button
          onClick={onSave}
          className="absolute -bottom-7 right-8 w-14 h-14 bg-white rounded-full shadow-xl flex items-center justify-center text-primary transform transition-transform active:scale-90 z-10"
        >
          <Heart className={`w-8 h-8 ${cafe.isSaved ? 'fill-primary' : ''}`} />
        </button>
      </div>

      <main className="relative px-6 pt-10 pb-32">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full">Most Instagrammable</span>
          </div>
          <h1 className="font-serif text-4xl text-slate-900 mb-3">{cafe.name}</h1>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 text-primary fill-primary" />
              <span className="font-bold">{cafe.rating}</span>
              <span className="text-slate-400 font-medium">({cafe.reviews} reviews)</span>
            </div>
            <div className="h-1 w-1 rounded-full bg-slate-300"></div>
            <div className="text-slate-500 font-medium">{cafe.priceLevel} • {cafe.type}</div>
          </div>
        </div>

        <div className="flex items-start justify-between p-4 bg-slate-50 rounded-2xl mb-8">
          <div className="flex gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-semibold leading-tight mb-1">{cafe.address}</p>
              <p className="text-xs text-slate-500">{cafe.status}</p>
            </div>
          </div>
          <button className="text-primary text-xs font-bold uppercase tracking-wider">Map</button>
        </div>

        <div className="flex flex-wrap gap-2 mb-10">
          {cafe.tags.map(tag => (
            <span key={tag} className="px-4 py-2 rounded-full border border-slate-200 text-xs font-medium text-slate-600">
              {tag}
            </span>
          ))}
        </div>

        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold tracking-tight">Photo Inspiration</h2>
            <span className="text-sm font-medium text-primary">View All</span>
          </div>
          <div className="columns-2 gap-4 space-y-4">
            {cafe.inspirationImages.map((img, idx) => (
              <div key={idx} className="relative overflow-hidden rounded-lg break-inside-avoid">
                <img src={img} className="w-full h-auto object-cover hover:scale-105 transition-transform duration-500" alt="Inspiration" />
              </div>
            ))}
          </div>
        </div>
      </main>

      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] p-6 bg-white/80 backdrop-blur-xl border-t border-slate-100 z-[70]">
        <button className="w-full bg-primary text-white py-4 px-6 rounded-full font-bold shadow-lg shadow-primary/30 flex items-center justify-center gap-2 transform transition-transform active:scale-[0.98]">
          <Camera className="w-5 h-5" />
          Add Photo Inspiration
        </button>
      </div>
    </motion.div>
  );
}

function PostDetailScreen({ post, onBack, onLike, onSave }: { post: Post, onBack: () => void, onLike: (id: string) => void, onSave: (id: string) => void }) {
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
        <button onClick={onBack} className="text-slate-900 flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-primary/10 transition-colors">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <div className="flex flex-col items-center">
          <h2 className="text-slate-900 text-lg font-bold leading-tight tracking-tight">BrewSpot</h2>
          <p className="text-[10px] uppercase tracking-widest text-primary font-semibold">Discovery</p>
        </div>
        <div className="flex w-10 items-center justify-end">
          <button className="flex size-10 items-center justify-center rounded-full bg-transparent text-slate-900 hover:bg-primary/10 transition-colors">
            <MoreHorizontal className="w-6 h-6" />
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto no-scrollbar pb-32">
        <div className="p-4">
          <div className="relative w-full aspect-[4/5] overflow-hidden rounded-xl shadow-lg">
            <img src={post.imageUrl} className="w-full h-full object-cover" alt="Post content" />
            <div className="absolute top-4 right-4">
              <div className="bg-white/90 backdrop-blur px-3 py-1 rounded-full flex items-center gap-1 shadow-sm">
                <MapPin className="w-3 h-3 text-primary" />
                <span className="text-[11px] font-bold text-slate-800">{post.location || 'Unknown Location'}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between px-6 py-2">
          <div className="flex gap-6">
            <div className="flex flex-col items-center gap-1 group cursor-pointer" onClick={() => onLike(post.id)}>
              <div className={`p-2 rounded-full group-hover:bg-primary/10 transition-colors ${post.isLiked ? 'text-primary' : 'text-slate-600'}`}>
                <Heart className={`w-6 h-6 ${post.isLiked ? 'fill-primary' : ''}`} />
              </div>
              <p className="text-slate-500 text-[12px] font-bold">{post.likes?.toLocaleString()}</p>
            </div>
            <div className="flex flex-col items-center gap-1 group cursor-pointer">
              <div className="p-2 rounded-full group-hover:bg-primary/10 transition-colors text-slate-600">
                <MessageCircle className="w-6 h-6" />
              </div>
              <p className="text-slate-500 text-[12px] font-bold">{post.comments}</p>
            </div>
            <div className="flex flex-col items-center gap-1 group cursor-pointer">
              <div className="p-2 rounded-full group-hover:bg-primary/10 transition-colors text-slate-600">
                <Send className="w-6 h-6" />
              </div>
            </div>
          </div>
          <div className="flex flex-col items-center gap-1 group cursor-pointer" onClick={() => onSave(post.id)}>
            <div className={`p-2 rounded-full group-hover:bg-primary/10 transition-colors ${post.isSaved ? 'text-primary' : 'text-slate-600'}`}>
              <Bookmark className={`w-6 h-6 ${post.isSaved ? 'fill-primary' : ''}`} />
            </div>
            <p className="text-slate-500 text-[12px] font-bold">{post.saves}</p>
          </div>
        </div>

        <div className="px-6 py-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="size-8 rounded-full bg-primary/20 overflow-hidden">
              <img className="w-full h-full object-cover" src={post.author?.profile} alt={post.author?.name} />
            </div>
            <span className="font-bold text-sm text-slate-900">{post.author?.name}</span>
            <span className="text-xs text-slate-400">• {post.timestamp}</span>
          </div>
          <p className="text-slate-700 text-sm leading-relaxed">
            {post.caption}
          </p>
        </div>

        <div className="px-6 pb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-sm text-slate-900">Comments</h3>
            <button className="text-xs text-primary font-bold">View all</button>
          </div>

          <div className="flex gap-3 mb-4">
            <div className="size-8 rounded-full bg-slate-200 shrink-0 overflow-hidden">
              <img src="https://i.pravatar.cc/150?u=james" className="w-full h-full object-cover" alt="User" />
            </div>
            <div className="bg-primary/5 p-3 rounded-xl flex-1">
              <div className="flex justify-between items-start mb-1">
                <span className="font-bold text-xs text-slate-900">james_roast</span>
                <Heart className="w-3 h-3 text-slate-400" />
              </div>
              <p className="text-xs text-slate-600">Need to visit this place! The lighting is incredible.</p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="size-8 rounded-full bg-slate-200 shrink-0 overflow-hidden">
              <img src="https://i.pravatar.cc/150?u=sophia_l" className="w-full h-full object-cover" alt="User" />
            </div>
            <div className="bg-primary/5 p-3 rounded-xl flex-1">
              <div className="flex justify-between items-start mb-1">
                <span className="font-bold text-xs text-slate-900">sophia.latte</span>
                <Heart className="w-3 h-3 text-slate-400" />
              </div>
              <p className="text-xs text-slate-600">Their oat milk is actually homemade, it's so creamy! ☕️</p>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 w-full p-4 bg-white/90 backdrop-blur-md border-t border-primary/5">
        <div className="relative flex items-center gap-3 bg-slate-50 rounded-full px-4 py-2 border border-primary/10">
          <div className="size-6 rounded-full bg-primary/20 overflow-hidden shrink-0">
            <img className="w-full h-full object-cover" src="https://i.pravatar.cc/150?u=sophia" alt="User" />
          </div>
          <input
            className="bg-transparent border-none focus:ring-0 text-xs text-slate-600 flex-1 placeholder-slate-400 outline-none"
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
}*/

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
