import { lazy, Suspense, useState, useEffect, useCallback, useRef } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate, NavLink } from 'react-router-dom';
import * as api from './services/api';
import { PASSWORD_RECOVERY_STORAGE_KEY, supabase } from './services/supabaseClient';
import {
  Home,
  Plus,
  User,
  MessageSquare,
  Map,
} from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import { Screen, Post, Cafe } from './types';
const Login = lazy(() => import('./screens/Login'));
const Register = lazy(() => import('./screens/Register'));
const ForgotPassword = lazy(() => import('./screens/ForgotPassword'));
const ResetPassword = lazy(() => import('./screens/ResetPassword'));
const Discovery = lazy(() => import('./screens/Discovery'));
const Explore = lazy(() => import('./screens/Explore'));
const CafeDetails = lazy(() => import('./screens/CafeDetails'));
const PostDetails = lazy(() => import('./screens/PostDetails'));
const Profile = lazy(() => import('./screens/Profile'));
const UserProfile = lazy(() => import('./screens/UserProfile'));
const EditProfileScreen = lazy(() => import('./screens/EditProfile'));
const Messages = lazy(() => import('./screens/Messages'));
const ChatWindow = lazy(() => import('./screens/ChatWindow'));
const NewPost = lazy(() => import('./screens/NewPost'));
const Success = lazy(() => import('./screens/Success'));
import AuthPrompt from './components/AuthPrompt';

function hasPasswordRecoveryLink(): boolean {
  if (typeof window === 'undefined') return false;
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const searchParams = new URLSearchParams(window.location.search);
  return window.location.pathname === '/reset-password'
    || hashParams.get('type') === 'recovery'
    || searchParams.get('type') === 'recovery'
    || window.sessionStorage.getItem(PASSWORD_RECOVERY_STORAGE_KEY) === '1';
}

function screenForPath(pathname: string): Screen {
  if (pathname === '/') return 'discovery';
  if (pathname === '/profile/me') return 'profile';
  if (pathname === '/profile/me/edit') return 'edit-profile';
  if (pathname.startsWith('/profile/')) return 'user-profile';
  if (pathname.startsWith('/post/')) return 'post-details';
  if (pathname.startsWith('/cafe/')) return 'cafe-details';
  if (pathname.startsWith('/messages/')) return 'chat-window';
  if (pathname === '/messages') return 'messages';
  if (pathname === '/new-post') return 'new-post';
  if (pathname === '/explore') return 'explore';
  if (pathname === '/forgot-password') return 'forgot-password';
  if (pathname === '/reset-password') return 'reset-password';
  if (pathname === '/register') return 'register';
  if (pathname === '/login') return 'login';
  if (pathname === '/success') return 'success';
  return 'discovery';
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

function AppContent() {
  const location = useLocation();
  const navigate = useNavigate();
  // The URL is the source of truth for the active page. React state below is
  // reserved for server data and temporary UI state, not page identity.
  const recoveryLinkAtLoad = hasPasswordRecoveryLink();
  const recoveryLinkRef = useRef(recoveryLinkAtLoad);
  const [posts, setPosts] = useState<Post[]>([]);
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [cafes, setCafes] = useState<Cafe[]>([]);
  const [profileTab, setProfileTab] = useState<'posts' | 'liked' | 'saved' | 'shops'>('posts');
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string; profile: string | null } | null>(null);
  const [isAuthResolved, setIsAuthResolved] = useState(false);
  const [highlightCommentId, setHighlightCommentId] = useState<string | null>(null);
  const [isLoadingFeed, setIsLoadingFeed] = useState(false);
  const [feedError, setFeedError] = useState<string | null>(null);
  const feedLoadedRef = useRef(false);

  const activePostId = location.pathname.startsWith('/post/')
    ? decodeURIComponent(location.pathname.slice('/post/'.length))
    : null;
  const activeCafeId = location.pathname.startsWith('/cafe/')
    ? decodeURIComponent(location.pathname.slice('/cafe/'.length))
    : null;
  const activeUserId = location.pathname.startsWith('/profile/') && location.pathname !== '/profile/me' && location.pathname !== '/profile/me/edit'
    ? decodeURIComponent(location.pathname.slice('/profile/'.length))
    : null;
  const activeRecipientId = location.pathname.startsWith('/messages/')
    ? decodeURIComponent(location.pathname.slice('/messages/'.length))
    : null;
  const newPostCafeId = new URLSearchParams(location.search).get('cafeId');
  const activePost = activePostId ? posts.find((post) => post.id === activePostId) || null : null;
  const activeCafe = activeCafeId ? cafes.find((cafe) => cafe.id === activeCafeId) || null : null;
  const currentScreen = screenForPath(location.pathname);
  const selectedPost = activePost;
  const selectedCafe = activeCafe;

  // AuthPrompt Modal State
  const [isAuthPromptOpen, setIsAuthPromptOpen] = useState(false);
  const [authPromptTitle, setAuthPromptTitle] = useState('Join BrewSpot');
  const [authPromptSubtitle, setAuthPromptSubtitle] = useState('Create a BrewSpot account to interact, save cafés, and share your favorite coffee spots.');
  const [pendingAuthAction, setPendingAuthAction] = useState<(() => void) | null>(null);
  const [selectedUser, setSelectedUser] = useState<{ id?: string; name: string; profile?: string | null } | null>(null);
  const [exploreSearchQuery, setExploreSearchQuery] = useState<string>('');
  const [newPostCafe, setNewPostCafe] = useState<Cafe | null>(null);
  const [messageRecipient, setMessageRecipient] = useState<{ id?: string; name: string; profile?: string | null } | null>(null);
  const [chatRecipient, setChatRecipient] = useState<{ id?: string; name: string; profile?: string | null } | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);

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
      feedLoadedRef.current = true;
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
      try {
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
          if (recoveryLinkRef.current && window.location.pathname !== '/reset-password') {
            navigate('/reset-password', { replace: true });
          }
        } else {
          localStorage.removeItem('brewspot_token');
          setCurrentUser(null);
        }
      } finally {
        setIsAuthResolved(true);
      }
    };

    syncUser();

    // 2. Auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY' || recoveryLinkRef.current) {
        // Supabase has established the temporary recovery session. Keep the
        // user on the reset screen until they explicitly choose a new password.
        if (window.location.pathname !== '/reset-password') {
          navigate('/reset-password', { replace: true });
        }
        // Some Supabase redirect configurations emit SIGNED_IN instead of
        // PASSWORD_RECOVERY after consuming the URL hash. Do not treat that
        // session as a normal login while the recovery link is active.
        if (event === 'PASSWORD_RECOVERY' || session?.user) return;
      }

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
  }, [navigate]);

  useEffect(() => {
    const isFeedRoute = location.pathname === '/' || location.pathname === '/explore';
    if (isFeedRoute && !feedLoadedRef.current) {
      void fetchFeedData();
    }
    if (location.pathname === '/profile/me') {
      void fetchUserPosts();
    }
  }, [location.pathname, fetchFeedData, fetchUserPosts]);

  // Deep links can be opened without the feed having been loaded first.
  // Resolve only the entity identified by the URL instead of refetching the
  // entire application dataset.
  useEffect(() => {
    if (!activeCafeId || activeCafe) return;
    api.getCafeById(activeCafeId)
      .then((cafe) => setCafes((previous) => previous.some((item) => item.id === cafe.id) ? previous : [...previous, cafe]))
      .catch((error) => console.error('Failed to load café route:', error));
  }, [activeCafeId, activeCafe]);

  useEffect(() => {
    if (!activePostId || activePost) return;
    api.getPostById(activePostId)
      .then((post) => setPosts((previous) => previous.some((item) => item.id === post.id) ? previous : [...previous, post]))
      .catch((error) => console.error('Failed to load post route:', error));
  }, [activePostId, activePost]);

  useEffect(() => {
    const tab = new URLSearchParams(location.search).get('tab');
    if (tab === 'posts' || tab === 'liked' || tab === 'saved' || tab === 'shops') setProfileTab(tab);
  }, [location.search]);

  useEffect(() => {
    if (!activeUserId) return;
    api.getUserProfile(activeUserId)
      .then((profile) => {
        if (profile) setSelectedUser({
          id: activeUserId,
          name: profile.display_name || profile.name || profile.username || 'Coffee Lover',
          profile: profile.profile || null,
        });
      })
      .catch((error) => console.error('Failed to load profile route:', error));
  }, [activeUserId]);

  useEffect(() => {
    if (!activeRecipientId) return;
    api.getUserProfile(activeRecipientId)
      .then((profile) => {
        if (profile) setChatRecipient({
          id: activeRecipientId,
          name: profile.display_name || profile.name || profile.username || 'Coffee Lover',
          profile: profile.profile || null,
        });
      })
      .catch((error) => console.error('Failed to load conversation route:', error));
  }, [activeRecipientId]);

  useEffect(() => {
    if (!newPostCafeId || newPostCafe) return;
    const cachedCafe = cafes.find((cafe) => cafe.id === newPostCafeId);
    if (cachedCafe) {
      setNewPostCafe(cachedCafe);
      return;
    }
    api.getCafeById(newPostCafeId)
      .then(setNewPostCafe)
      .catch((error) => console.error('Failed to load café for new post:', error));
  }, [newPostCafeId, newPostCafe, cafes]);

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
    if (screen !== 'post-details') setHighlightCommentId(null);
    if (screen !== 'messages') setIsChatOpen(false);

    switch (screen) {
      case 'discovery': navigate('/'); break;
      case 'login': navigate('/login'); break;
      case 'register': navigate('/register'); break;
      case 'forgot-password': navigate('/forgot-password'); break;
      case 'reset-password': navigate('/reset-password'); break;
      case 'success': navigate('/success'); break;
      case 'explore': {
        const query = typeof data === 'string' ? data : data?.query;
        setExploreSearchQuery(query || '');
        navigate(query ? `/explore?q=${encodeURIComponent(query)}` : '/explore');
        break;
      }
      case 'profile':
        if (tab) setProfileTab(tab);
        navigate(tab ? `/profile/me?tab=${encodeURIComponent(tab)}` : '/profile/me');
        break;
      case 'edit-profile': navigate('/profile/me/edit'); break;
      case 'new-post':
        setNewPostCafe(data?.id ? data : null);
        navigate(data?.id ? `/new-post?cafeId=${encodeURIComponent(data.id)}` : '/new-post');
        break;
      case 'cafe-details':
        if (data?.id) {
          setCafes((previous) => previous.some((cafe) => cafe.id === data.id) ? previous : [...previous, data]);
          navigate(`/cafe/${encodeURIComponent(data.id)}`);
        }
        break;
      case 'post-details': if (data?.id) navigate(`/post/${encodeURIComponent(data.id)}`); break;
      case 'user-profile': {
        const userId = data?.id;
        if (data) setSelectedUser(data);
        if (userId && currentUser?.id === userId) navigate('/profile/me');
        else if (userId) navigate(`/profile/${encodeURIComponent(userId)}`);
        break;
      }
      case 'messages': navigate('/messages'); break;
      case 'chat-window': {
        const recipient = data?.recipient || data;
        setChatRecipient(recipient || null);
        if (recipient?.id) navigate(`/messages/${encodeURIComponent(recipient.id)}`);
        else navigate('/messages');
        break;
      }
      default: navigate('/');
    }
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
      setHighlightCommentId(commentId || null);
      navigate(`/post/${encodeURIComponent(targetPost.id)}`);
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
      const previousSelectedPosts = posts;
      const previousUserPostState = userPosts;
      const desiredLiked = !(posts.find(p => p.id === postId)?.isLiked);
      const update = (p: Post) =>
        p.id === postId
          ? { ...p, isLiked: !p.isLiked, likes: (p.likes || 0) + (p.isLiked ? -1 : 1) }
          : p;

      setPosts((prev) => prev.map(update));
      setUserPosts((prev) => prev.map(update));
      try {
        const result = await api.toggleLikePost(postId, desiredLiked);
        const applyServerState = (p: Post) => p.id === postId ? { ...p, isLiked: result.isLiked, likes: result.likes } : p;
        setPosts(prev => prev.map(applyServerState));
        setUserPosts(prev => prev.map(applyServerState));
      } catch (err) {
        setPosts(previousSelectedPosts);
        setUserPosts(previousUserPostState);
        console.error('Failed to persist like:', err);
      }
    }, 'Like this post', 'Sign in to like posts and keep track of your favorite coffee moments.');
  };

  const handleSave = async (postId: string) => {
    requireAuth(async () => {
      const previousSavedPosts = posts;
      const previousSavedUserPosts = userPosts;
      const desiredSaved = !(posts.find(p => p.id === postId)?.isSaved);
      const update = (p: Post) =>
        p.id === postId
          ? { ...p, isSaved: !p.isSaved, saves: (p.saves || 0) + (p.isSaved ? -1 : 1) }
          : p;

      setPosts((prev) => prev.map(update));
      setUserPosts((prev) => prev.map(update));
      try {
        const result = await api.toggleSavePost(postId, desiredSaved);
        const applyServerState = (p: Post) => p.id === postId ? { ...p, isSaved: result.isSaved, saves: result.saves } : p;
        setPosts(prev => prev.map(applyServerState));
        setUserPosts(prev => prev.map(applyServerState));
      } catch (err) {
        setPosts(previousSavedPosts);
        setUserPosts(previousSavedUserPosts);
        console.error('Failed to persist saved post:', err);
      }
    }, 'Save this post', 'Sign in to save posts to your personal collection.');
  };

  const handleSaveCafe = async (cafeId: string, cafeDetails?: Cafe) => {
    requireAuth(async () => {
      const previousCafes = cafes;
      const currentCafe = cafes.find(c => c.id === cafeId) || cafeDetails;
      const desiredSaved = !(currentCafe?.isSaved);
      const exists = cafes.some((c) => c.id === cafeId);
      if (exists) {
        setCafes((prev) =>
          prev.map((c) => (c.id === cafeId ? { ...c, isSaved: !c.isSaved } : c))
        );
      } else if (cafeDetails) {
        setCafes((prev) => [...prev, { ...cafeDetails, isSaved: true }]);
      }

      try {
        const result = await api.toggleSaveCafe(cafeId, cafeDetails, desiredSaved);
        const persistedId = result.cafeId || cafeId;
        setCafes(prev => prev.map(c => c.id === cafeId || c.id === persistedId ? { ...c, id: persistedId, isSaved: result.isSaved } : c));
      } catch (err) {
        setCafes(previousCafes);
        console.error("Failed to toggle save cafe:", err);
      }
    }, 'Save this café', 'Create an account to save cafés and build your favorite coffee spots collection.');
  };

  const handleBack = () => navigate(-1);

  const routeContent = (
    <Suspense fallback={<RouteLoading />}>
      <div className="w-full max-w-[430px] bg-white shadow-2xl relative overflow-hidden flex flex-col h-full">
        <AnimatePresence mode="wait">
          {currentScreen === 'login' && (
            <Login
              onLogin={handleLogin}
              onGoToRegister={() => navigateTo('register')}
              onForgotPassword={() => navigateTo('forgot-password')}
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

          {currentScreen === 'forgot-password' && (
            <ForgotPassword onBack={() => navigateTo('login')} />
          )}

          {currentScreen === 'reset-password' && (
            <ResetPassword onComplete={() => {
              recoveryLinkRef.current = false;
              window.sessionStorage.removeItem(PASSWORD_RECOVERY_STORAGE_KEY);
              navigateTo('login');
            }} />
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

          {currentScreen === 'cafe-details' && (selectedCafe ? (
            <CafeDetails
              cafe={selectedCafe}
              communityPosts={posts.filter((post) => post.cafeId === selectedCafe.id)}
              onBack={handleBack}
              onSave={() => handleSaveCafe(selectedCafe.id, selectedCafe)}
              onAddPhoto={(cafe) => requireAuth(() => navigateTo('new-post', cafe))}
            />
          ) : <RouteLoading />)}

          {currentScreen === 'post-details' && (selectedPost ? (
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
          ) : <RouteLoading />)}

          {currentScreen === 'profile' && (currentUser ? (
            <Profile
              currentUser={currentUser}
              posts={posts}
              userPosts={userPosts}
              cafes={cafes}
              activeTab={profileTab}
              setActiveTab={(tab) => {
                setProfileTab(tab);
                navigate(`/profile/me?tab=${encodeURIComponent(tab)}`);
              }}
              onNavigate={navigateTo}
              onSelectPost={(post) => navigateTo('post-details', post)}
              onSelectCafe={(cafe) => navigateTo('cafe-details', cafe)}
              onLogout={handleLogout}
              onDeleteAccount={handleDeleteAccount}
            />
          ) : isAuthResolved ? <Navigate to="/login" replace /> : <RouteLoading />)}

          {currentScreen === 'messages' && (currentUser ? (
            <Messages
              onBack={() => navigateTo('discovery')}
              currentUser={currentUser}
              initialRecipient={messageRecipient}
              onChatOpenChange={setIsChatOpen}
              onSelectChat={(targetUser) => navigateTo('chat-window', targetUser)}
              onSelectNotificationPost={handleSelectNotificationPost}
            />
          ) : isAuthResolved ? <Navigate to="/login" replace /> : <RouteLoading />)}

          {currentScreen === 'chat-window' && (currentUser ? (
            <ChatWindow
              recipient={chatRecipient}
              currentUser={currentUser}
              onBack={() => navigateTo('messages')}
            />
          ) : isAuthResolved ? <Navigate to="/login" replace /> : <RouteLoading />)}

          {currentScreen === 'explore' && (
            <Explore
              cafes={cafes}
              posts={posts}
              initialQuery={exploreSearchQuery}
              isLoading={isLoadingFeed}
              feedError={feedError}
              onRetryFeed={() => void fetchFeedData()}
              onSelectCafe={(cafe) => navigateTo('cafe-details', cafe)}
              onNavigate={navigateTo}
              onSaveCafe={handleSaveCafe}
            />
          )}

          {currentScreen === 'user-profile' && (selectedUser ? (
            <UserProfile
              user={selectedUser}
              currentUser={currentUser}
              allPosts={posts}
              onNavigate={navigateTo}
              onSelectPost={(post) => navigateTo('post-details', post)}
            />
          ) : <RouteLoading />)}

          {currentScreen === 'edit-profile' && (currentUser ? (
            <EditProfileScreen
              currentUser={currentUser}
              onNavigate={navigateTo}
              onProfileUpdated={(updatedUser) => {
                setCurrentUser(updatedUser);
                void fetchFeedData();
              }}
            />
          ) : isAuthResolved ? <Navigate to="/login" replace /> : <RouteLoading />)}

          {currentScreen === 'new-post' && (currentUser ? (
            <NewPost
              initialCafe={newPostCafe}
              onClose={() => navigateTo('discovery')}
              onPostCreated={() => void fetchFeedData()}
            />
          ) : isAuthResolved ? <Navigate to="/login" replace /> : <RouteLoading />)}
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
          currentScreen !== 'forgot-password' &&
          currentScreen !== 'reset-password' &&
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
    </Suspense>
  );

  return (
    <div className="flex justify-center h-screen h-[100dvh] bg-slate-100 overflow-hidden">
      <Routes>
        <Route path="/" element={routeContent} />
        <Route path="/login" element={routeContent} />
        <Route path="/register" element={routeContent} />
        <Route path="/forgot-password" element={routeContent} />
        <Route path="/reset-password" element={routeContent} />
        <Route path="/success" element={routeContent} />
        <Route path="/explore" element={routeContent} />
        <Route path="/messages" element={routeContent} />
        <Route path="/messages/:recipientId" element={routeContent} />
        <Route path="/new-post" element={routeContent} />
        <Route path="/profile/me" element={routeContent} />
        <Route path="/profile/me/edit" element={routeContent} />
        <Route path="/profile/:userId" element={routeContent} />
        <Route path="/post/:postId" element={routeContent} />
        <Route path="/cafe/:cafeId" element={routeContent} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Analytics />
    </div>
  );
}

// --- Components ---

function RouteLoading() {
  return (
    <div className="flex-1 flex items-center justify-center bg-white text-slate-400">
      <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
    </div>
  );
}

function BottomNav({ currentScreen, onNavigate }: { currentScreen: Screen, onNavigate: (s: Screen, data?: any, tab?: any) => void, profileTab: string }) {
  return (
    <nav className="absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-slate-100 px-8 py-4 flex items-center justify-between z-40">
      <NavLink
        to="/"
        onClick={(event) => { event.preventDefault(); onNavigate('discovery'); }}
        className={`flex flex-col items-center gap-1 ${currentScreen === 'discovery' ? 'text-primary' : 'text-slate-400'}`}
      >
        <Home className="w-6 h-6" />
        <span className="text-[10px] font-bold uppercase tracking-tight">Home</span>
      </NavLink>
      <NavLink
        to="/explore"
        onClick={(event) => { event.preventDefault(); onNavigate('explore'); }}
        className={`flex flex-col items-center gap-1 ${currentScreen === 'explore' ? 'text-primary' : 'text-slate-400'}`}
      >
        <Map className="w-6 h-6" />
        <span className="text-[10px] font-bold uppercase tracking-tight">Map</span>
      </NavLink>
      <NavLink
        to="/new-post"
        onClick={(event) => { event.preventDefault(); onNavigate('new-post'); }}
        className="relative -top-8 w-14 h-14 bg-primary rounded-full flex items-center justify-center text-white shadow-xl shadow-primary/30 border-4 border-white active:scale-95 transition-transform"
      >
        <Plus className="w-8 h-8" />
      </NavLink>
      <NavLink
        to="/messages"
        onClick={(event) => { event.preventDefault(); onNavigate('messages'); }}
        className={`flex flex-col items-center gap-1 ${currentScreen === 'messages' ? 'text-primary' : 'text-slate-400'}`}
      >
        <MessageSquare className="w-6 h-6" />
        <span className="text-[10px] font-bold uppercase tracking-tight">Chat</span>
      </NavLink>
      <NavLink
        to="/profile/me"
        onClick={(event) => { event.preventDefault(); onNavigate('profile'); }}
        className={`flex flex-col items-center gap-1 ${currentScreen === 'profile' ? 'text-primary' : 'text-slate-400'}`}
      >
        <User className="w-6 h-6" />
        <span className="text-[10px] font-bold uppercase tracking-tight">Profile</span>
      </NavLink>
    </nav>
  );
}
