import { useState, useEffect, useCallback } from 'react';
import { Analytics } from '@vercel/analytics/react';
import * as api from './services/api';
import { supabase } from './services/supabaseClient';
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
import EditProfileScreen from './screens/EditProfile';
import Messages from './screens/Messages';
import ChatWindow from './screens/ChatWindow';
import NewPost from './screens/NewPost';
import Success from './screens/Success';
import AuthPrompt from './components/AuthPrompt';

export default function App() {
  // App opens to Discovery screen by default (Guest Mode supported)
  const [currentScreen, setCurrentScreen] = useState<Screen>('discovery');
  const [selectedCafe, setSelectedCafe] = useState<Cafe | null>(null);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [cafes, setCafes] = useState<Cafe[]>([]);
  const [previousScreen, setPreviousScreen] = useState<Screen | null>(null);
  const [profileTab, setProfileTab] = useState<'posts' | 'liked' | 'saved' | 'shops'>('posts');
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string; profile: string | null } | null>(null);
  const [highlightCommentId, setHighlightCommentId] = useState<string | null>(null);
  const [isLoadingFeed, setIsLoadingFeed] = useState(false);
  const [feedError, setFeedError] = useState<string | null>(null);

  // AuthPrompt Modal State
  const [isAuthPromptOpen, setIsAuthPromptOpen] = useState(false);
  const [authPromptTitle, setAuthPromptTitle] = useState('Join BrewSpot');
  const [authPromptSubtitle, setAuthPromptSubtitle] = useState('Create a BrewSpot account to interact, save cafés, and share your favorite coffee spots.');
  const [pendingAuthAction, setPendingAuthAction] = useState<(() => void) | null>(null);

  const fetchFeedData = useCallback(async () => {
    setIsLoadingFeed(true);
    setFeedError(null);
    try {
      const [fetchedCafes, fetchedPosts, trendingCafes] = await Promise.all([
        api.getCafes(),
        api.getPosts(),
        api.getTrendingCafes().catch(() => [] as Cafe[]),
      ]);
      setCafes(trendingCafes.length ? trendingCafes : fetchedCafes);
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

  // Sync session state using Supabase Auth listener
  useEffect(() => {
    // 1. Initial user check
    const syncUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        if (session.access_token) {
          localStorage.setItem('brewspot_token', session.access_token);
        }
        const profile = await api.getMe();
        if (profile?.user) {
          setCurrentUser(profile.user);
        } else {
          setCurrentUser({
            id: session.user.id,
            name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User',
            profile: session.user.user_metadata?.avatar_url || null,
          });
        }
      } else {
        localStorage.removeItem('brewspot_token');
        setCurrentUser(null);
      }
    };

    syncUser();

    // 2. Auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        if (session.access_token) {
          localStorage.setItem('brewspot_token', session.access_token);
        }
        const profile = await api.getMe();
        if (profile?.user) {
          setCurrentUser(profile.user);
        } else {
          setCurrentUser({
            id: session.user.id,
            name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User',
            profile: session.user.user_metadata?.avatar_url || null,
          });
        }
      } else {
        localStorage.removeItem('brewspot_token');
        setCurrentUser(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
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
  const [newPostCafe, setNewPostCafe] = useState<Cafe | null>(null);
  const [messageRecipient, setMessageRecipient] = useState<{ id?: string; name: string; profile?: string | null } | null>(null);
  const [chatRecipient, setChatRecipient] = useState<{ id?: string; name: string; profile?: string | null } | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);

  // Helper to require authentication for protected actions
  const requireAuth = (
    action: () => void,
    title = 'Join BrewSpot',
    subtitle = 'Create a BrewSpot account to save cafés, follow users, and build your coffee collection.'
  ) => {
    if (currentUser) {
      action();
    } else {
      setAuthPromptTitle(title);
      setAuthPromptSubtitle(subtitle);
      setPendingAuthAction(() => action);
      setIsAuthPromptOpen(true);
    }
  };

  const navigateTo = (screen: Screen, data: any = null, tab?: any) => {
    if (screen !== 'messages') {
      setIsChatOpen(false);
    }
    if (screen !== 'post-details') {
      setHighlightCommentId(null);
    }

    if (screen === 'new-post') setNewPostCafe(data as Cafe);
    if (screen === 'cafe-details') {
      setSelectedCafe(data as Cafe);
      if (data?.id) {
        void api.getCafeById(data.id)
          .then((freshCafe) => setSelectedCafe(freshCafe))
          .catch((err) => console.error('Failed to refresh café details:', err));
      }
    }
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

  const handleSelectNotificationPost = async (postId: string, commentId?: string) => {
    let targetPost = posts.find((p) => p.id === postId) || userPosts.find((p) => p.id === postId);
    if (!targetPost) {
      try {
        targetPost = await api.getPostById(postId);
      } catch (err) {
        console.error('Failed to fetch notification post:', err);
      }
    }
    if (targetPost) {
      setSelectedPost(targetPost);
      setHighlightCommentId(commentId || null);
      setPreviousScreen(currentScreen);
      setCurrentScreen('post-details');
    }
  };

  // Real Supabase Auth Login
  const handleLogin = async (email: string, pass: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: pass,
    });

    if (error) {
      throw new Error(error.message);
    }

    if (data.session) {
      localStorage.setItem('brewspot_token', data.session.access_token);
    }

    const profile = await api.getMe();
    if (profile?.user) {
      setCurrentUser(profile.user);
    } else if (data.user) {
      setCurrentUser({
        id: data.user.id,
        name: data.user.user_metadata?.name || email.split('@')[0],
        profile: data.user.user_metadata?.avatar_url || null,
      });
    }

    // Execute pending auth action if available
    if (pendingAuthAction) {
      const act = pendingAuthAction;
      setPendingAuthAction(null);
      act();
    } else {
      navigateTo('discovery');
    }
    void fetchFeedData();
  };

  // Real Supabase Auth Registration
  const handleRegister = async (email: string, pass: string, name: string, username?: string) => {
    const cleanUsername = username || `${name.toLowerCase().replace(/\s+/g, '_')}_${Math.floor(Math.random() * 1000)}`;

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password: pass,
        options: {
          data: {
            name,
            display_name: name,
            username: cleanUsername,
          },
        },
      });

      if (error) {
        if (error.message.toLowerCase().includes('rate limit') || error.message.toLowerCase().includes('api key')) {
          // Fallback to backend admin creation if email rate limit is hit
          const backendRes = await api.register(email, pass, name);
          if (backendRes?.access_token) {
            localStorage.setItem('brewspot_token', backendRes.access_token);
          }
          if (backendRes?.user) {
            setCurrentUser(backendRes.user);
            navigateTo('success');
            void fetchFeedData();
            return { requiresVerification: false };
          }
        }
        throw new Error(error.message);
      }

      if (data.session) {
        localStorage.setItem('brewspot_token', data.session.access_token);
        const profile = await api.getMe();
        setCurrentUser(profile?.user || {
          id: data.user!.id,
          name,
          display_name: name,
          username: cleanUsername,
          profile: null,
        });
        navigateTo('success');
        void fetchFeedData();
        return { requiresVerification: false };
      }

      // Otherwise email verification is required
      return { requiresVerification: true };
    } catch (err: any) {
      if (err.message?.toLowerCase().includes('rate limit')) {
        const backendRes = await api.register(email, pass, name);
        if (backendRes?.access_token) {
          localStorage.setItem('brewspot_token', backendRes.access_token);
        }
        if (backendRes?.user) {
          setCurrentUser(backendRes.user);
          navigateTo('success');
          void fetchFeedData();
          return { requiresVerification: false };
        }
      }
      throw err;
    }
  };

  // Real Password Reset Flow
  const handleResetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/`,
    });
    if (error) {
      throw new Error(error.message);
    }
  };

  // Real Logout Flow
  const handleLogout = async () => {
    await supabase.auth.signOut();
    api.logout();
    setCurrentUser(null);
    navigateTo('discovery');
  };

  // Real Account Deletion Flow
  const handleDeleteAccount = async () => {
    if (!currentUser) return;
    await supabase.auth.signOut();
    api.logout();
    setCurrentUser(null);
    navigateTo('discovery');
  };

  const handleLike = async (postId: string) => {
    requireAuth(async () => {
      const previousPosts = posts;
      const previousUserPosts = userPosts;
      const previousSelectedPost = selectedPost;
      const desiredLiked = !(posts.find(p => p.id === postId)?.isLiked);
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
        const result = await api.toggleLikePost(postId, desiredLiked);
        const applyServerState = (p: Post) => p.id === postId ? { ...p, isLiked: result.isLiked, likes: result.likes } : p;
        setPosts(prev => prev.map(applyServerState));
        setUserPosts(prev => prev.map(applyServerState));
        setSelectedPost(prev => prev?.id === postId ? applyServerState(prev) : prev);
      } catch (err) {
        setPosts(previousPosts);
        setUserPosts(previousUserPosts);
        setSelectedPost(previousSelectedPost);
        console.error('Failed to persist like:', err);
      }
    }, 'Like this post', 'Sign in to like posts and keep track of your favorite coffee moments.');
  };

  const handleSave = async (postId: string) => {
    requireAuth(async () => {
      const previousPosts = posts;
      const previousUserPosts = userPosts;
      const previousSelectedPost = selectedPost;
      const desiredSaved = !(posts.find(p => p.id === postId)?.isSaved);
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
        const result = await api.toggleSavePost(postId, desiredSaved);
        const applyServerState = (p: Post) => p.id === postId ? { ...p, isSaved: result.isSaved, saves: result.saves } : p;
        setPosts(prev => prev.map(applyServerState));
        setUserPosts(prev => prev.map(applyServerState));
        setSelectedPost(prev => prev?.id === postId ? applyServerState(prev) : prev);
      } catch (err) {
        setPosts(previousPosts);
        setUserPosts(previousUserPosts);
        setSelectedPost(previousSelectedPost);
        console.error('Failed to persist saved post:', err);
      }
    }, 'Save this post', 'Sign in to save posts to your personal collection.');
  };

  const handleSaveCafe = async (cafeId: string, cafeDetails?: Cafe) => {
    requireAuth(async () => {
      const previousCafes = cafes;
      const previousSelectedCafe = selectedCafe;
      const currentCafe = cafes.find(c => c.id === cafeId) || selectedCafe;
      const desiredSaved = !(currentCafe?.isSaved);
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
        const result = await api.toggleSaveCafe(cafeId, cafeDetails, desiredSaved);
        const persistedId = result.cafeId || cafeId;
        setCafes(prev => prev.map(c => c.id === cafeId || c.id === persistedId ? { ...c, id: persistedId, isSaved: result.isSaved } : c));
        setSelectedCafe(prev => prev?.id === cafeId || prev?.id === persistedId ? { ...prev, id: persistedId, isSaved: result.isSaved } : prev);
      } catch (err) {
        setCafes(previousCafes);
        setSelectedCafe(previousSelectedCafe);
        console.error("Failed to toggle save cafe:", err);
      }
    }, 'Save this café', 'Create an account to save cafés and build your favorite coffee spots collection.');
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
              onResetPassword={handleResetPassword}
              onBrowseAsGuest={() => navigateTo('discovery')}
            />
          )}

          {currentScreen === 'register' && (
            <Register
              onRegister={handleRegister}
              onGoToLogin={() => navigateTo('login')}
              onBrowseAsGuest={() => navigateTo('discovery')}
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
              onNavigate={(s, d) => {
                if (s === 'new-post' || s === 'messages') {
                  requireAuth(() => navigateTo(s, d));
                } else if (s === 'profile' && !currentUser) {
                  requireAuth(() => navigateTo('profile'), 'View Profile', 'Sign in to manage your profile and view saved spots.');
                } else {
                  navigateTo(s, d);
                }
              }}
              onSaveCafe={handleSaveCafe}
              onLikePost={handleLike}
            />
          )}

          {currentScreen === 'cafe-details' && selectedCafe && (
            <CafeDetails
              cafe={selectedCafe}
              communityPosts={posts.filter((post) => post.cafeId === selectedCafe.id)}
              onBack={handleBack}
              onSave={() => handleSaveCafe(selectedCafe.id, selectedCafe)}
              onAddPhoto={(cafe) => requireAuth(() => navigateTo('new-post', cafe))}
            />
          )}

          {currentScreen === 'post-details' && selectedPost && (
            <PostDetails
              post={selectedPost}
              currentUser={currentUser}
              highlightCommentId={highlightCommentId}
              onBack={handleBack}
              onLike={handleLike}
              onSave={handleSave}
              onNavigate={(screen, data) => navigateTo(screen, data)}
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
              onDeleteAccount={handleDeleteAccount}
            />
          )}

          {currentScreen === 'messages' && (
            <Messages
              onBack={() => navigateTo('discovery')}
              currentUser={currentUser}
              initialRecipient={messageRecipient}
              onChatOpenChange={setIsChatOpen}
              onSelectChat={(targetUser) => navigateTo('chat-window', targetUser)}
              onSelectNotificationPost={handleSelectNotificationPost}
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

          {currentScreen === 'edit-profile' && (
            <EditProfileScreen
              currentUser={currentUser}
              onNavigate={navigateTo}
              onProfileUpdated={(updatedUser) => {
                setCurrentUser(updatedUser);
                void fetchFeedData();
              }}
            />
          )}

          {currentScreen === 'new-post' && (
            <NewPost
              initialCafe={newPostCafe}
              onClose={() => navigateTo('discovery')}
              onPostCreated={() => void fetchFeedData()}
            />
          )}
        </AnimatePresence>

        {/* Reusable Guest Auth Prompt Modal */}
        <AuthPrompt
          isOpen={isAuthPromptOpen}
          title={authPromptTitle}
          subtitle={authPromptSubtitle}
          onClose={() => setIsAuthPromptOpen(false)}
          onGoToRegister={() => navigateTo('register')}
          onGoToLogin={() => navigateTo('login')}
        />

        {/* Navigation Bar */}
        {currentScreen !== 'login' &&
          currentScreen !== 'register' &&
          currentScreen !== 'success' &&
          currentScreen !== 'new-post' &&
          currentScreen !== 'user-profile' &&
          currentScreen !== 'edit-profile' &&
          currentScreen !== 'chat-window' &&
          !(currentScreen === 'messages' && isChatOpen) && (
            <BottomNav
              currentScreen={currentScreen}
              onNavigate={(s, d, t) => {
                if (s === 'new-post' || s === 'messages') {
                  requireAuth(() => navigateTo(s, d, t));
                } else if (s === 'profile' && !currentUser) {
                  requireAuth(() => navigateTo('profile'), 'View Profile', 'Sign in to access your profile, saved cafés, and posts.');
                } else {
                  navigateTo(s, d, t);
                }
              }}
              profileTab={profileTab}
            />
          )}
      </div>
      <Analytics />
    </div>
  );
}

// --- Components ---

function BottomNav({ currentScreen, onNavigate }: { currentScreen: Screen, onNavigate: (s: Screen, data?: any, tab?: any) => void, profileTab: string }) {
  return (
    <nav className="absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-slate-100 px-8 py-4 flex items-center justify-between z-40">
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
        className="relative -top-8 w-14 h-14 bg-primary rounded-full flex items-center justify-center text-white shadow-xl shadow-primary/30 border-4 border-white active:scale-95 transition-transform"
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
