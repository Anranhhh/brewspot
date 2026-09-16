import { useState, useRef, FormEvent, ChangeEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Camera, Image as ImageIcon, X, Check, Coffee, Sparkles, Building2, Leaf } from 'lucide-react';
import { Camera as CapacitorCamera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Screen } from '../types';
import * as api from '../services/api';
import { supabase } from '../services/supabaseClient';

type EditProfileProps = {
  currentUser: {
    id: string;
    name: string;
    display_name?: string;
    username?: string;
    profile: string;
    avatar_type?: 'default' | 'uploaded';
    avatar_path?: string;
    bio?: string;
  } | null;
  onNavigate: (s: Screen, data?: any) => void;
  onProfileUpdated: (updatedUser: any) => void;
};

// Application-owned default avatar items
const DEFAULT_AVATARS = [
  { path: 'coffee-beans.png', name: 'Coffee Beans', icon: Coffee, desc: 'Classic roasted beans' },
  { path: 'coffee-cup.png', name: 'Iced Coffee', icon: Sparkles, desc: 'Aesthetic espresso cup' },
  { path: 'offee-plant.png', name: 'Coffee Plant', icon: Leaf, desc: 'Fresh coffee leaves' },
  { path: 'cafe-storefront.png', name: 'Café Store', icon: Building2, desc: 'Cozy neighborhood café' },
  { path: 'abstract-coffee.png', name: 'Coffee Latte', icon: Sparkles, desc: 'Modern latte art' },
];

export default function EditProfileScreen({ currentUser, onNavigate, onProfileUpdated }: EditProfileProps) {
  const initialDisplayName = currentUser?.display_name || currentUser?.name || '';
  const initialUsername = currentUser?.username || currentUser?.name?.toLowerCase().replace(/\s+/g, '_') || '';
  const initialBio = currentUser?.bio || '';
  const initialAvatarType = currentUser?.avatar_type || 'default';
  const initialAvatarPath = currentUser?.avatar_path || 'coffee-beans.png';
  const initialAvatarUrl = currentUser?.profile || api.getPublicAvatarUrl(initialAvatarType, initialAvatarPath);

  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [username, setUsername] = useState(initialUsername);
  const [bio, setBio] = useState(initialBio);
  const [avatarType, setAvatarType] = useState<'default' | 'uploaded'>(initialAvatarType);
  const [avatarPath, setAvatarPath] = useState(initialAvatarPath);
  const [previewAvatarUrl, setPreviewAvatarUrl] = useState(initialAvatarUrl);

  const [selectedFile, setSelectedFile] = useState<File | Blob | null>(null);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Helper to validate username format: 3-30 chars, lowercase, numbers, underscores
  const validateUsername = (val: string): boolean => {
    return /^[a-z0-9_]{3,30}$/.test(val);
  };

  const handlePickFile = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        setErrorMsg('Image size must be under 5MB.');
        return;
      }
      setSelectedFile(file);
      setAvatarType('uploaded');
      setPreviewAvatarUrl(URL.createObjectURL(file));
      setShowPhotoModal(false);
      setErrorMsg(null);
    }
  };

  const handleNativeCamera = async () => {
    setShowPhotoModal(false);

    // The Capacitor camera prompt is only available on native platforms.
    // On the web, open the browser picker directly so cancelling it leaves
    // the user on this screen instead of opening another picker.
    const isNative = Boolean((window as any).Capacitor?.isNativePlatform?.());
    if (!isNative) {
      fileInputRef.current?.click();
      return;
    }

    try {
      const photo = await CapacitorCamera.getPhoto({
        quality: 85,
        allowEditing: true,
        resultType: CameraResultType.Uri,
        source: CameraSource.Prompt,
      });

      if (photo && photo.webPath) {
        const response = await fetch(photo.webPath);
        const blob = await response.blob();
        setSelectedFile(blob);
        setAvatarType('uploaded');
        setPreviewAvatarUrl(photo.webPath);
        setErrorMsg(null);
      }
    } catch {
      // Cancellation or denied permission is a normal outcome. Keep the
      // current avatar and let the user try again from the action sheet.
      setErrorMsg(null);
    }
  };

  const handleSelectDefaultAvatar = (defaultPath: string) => {
    setSelectedFile(null);
    setAvatarType('default');
    setAvatarPath(defaultPath);
    setPreviewAvatarUrl(api.getPublicAvatarUrl('default', defaultPath));
    setShowPhotoModal(false);
    setErrorMsg(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!currentUser?.id) {
      setErrorMsg('You must be logged in to edit your profile.');
      return;
    }

    const cleanUsername = username.toLowerCase().trim();

    if (!cleanUsername) {
      setErrorMsg('Username is required.');
      return;
    }

    if (!validateUsername(cleanUsername)) {
      setErrorMsg('Username must be 3-30 characters long and contain only lowercase letters, numbers, and underscores.');
      return;
    }

    if (bio.length > 500) {
      setErrorMsg('Bio cannot exceed 500 characters.');
      return;
    }

    setIsSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    let newlyUploadedPath: string | null = null;
    let targetAvatarType = avatarType;
    let targetAvatarPath = avatarPath;

    try {
      // Step A: Upload new custom avatar file if picked
      if (selectedFile) {
        newlyUploadedPath = await api.uploadProfileAvatar(selectedFile, currentUser.id);
        targetAvatarType = 'uploaded';
        targetAvatarPath = newlyUploadedPath;
      }

      // Step B: Attempt database profile update
      const updatedUserRes = await api.updateUserProfile({
        display_name: displayName.trim() || cleanUsername,
        username: cleanUsername,
        bio: bio.trim(),
        avatar_type: targetAvatarType,
        avatar_path: targetAvatarPath,
      });

      const updatedProfile = updatedUserRes.user || updatedUserRes;

      // Keep the Auth user metadata aligned with the public profile record.
      // The profile table remains the source of truth for app display.
      const { error: authMetadataError } = await supabase.auth.updateUser({
        data: {
          name: updatedProfile.display_name,
          display_name: updatedProfile.display_name,
          username: updatedProfile.username,
        },
      });
      if (authMetadataError) {
        console.warn('Profile saved, but Auth metadata sync failed:', authMetadataError.message);
      }

      // Step C (Success Cleanup): Delete old custom avatar if replacing with a new avatar
      const previousWasUploaded = initialAvatarType === 'uploaded' && initialAvatarPath && initialAvatarPath.includes('/');
      const avatarChanged = targetAvatarPath !== initialAvatarPath;

      if (previousWasUploaded && avatarChanged) {
        void api.deleteProfileAvatar(initialAvatarPath);
      }

      setSuccessMsg('Profile updated successfully!');
      onProfileUpdated(updatedProfile);

      setTimeout(() => {
        onNavigate('profile');
      }, 1000);
    } catch (err: any) {
      console.error('Profile update failed:', err);

      // Step D (Rollback on failure): Delete newly uploaded image if database update failed
      if (newlyUploadedPath) {
        void api.deleteProfileAvatar(newlyUploadedPath);
      }

      const message = err.message || err.error || "We couldn't update your profile. Please try again.";
      setErrorMsg(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 15 }}
      className="flex-1 flex flex-col bg-slate-50 min-h-screen pb-24 overflow-y-auto no-scrollbar"
    >
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md px-6 pb-4 pt-safe-top flex items-center justify-between border-b border-slate-100 shadow-sm">
        <button
          onClick={() => onNavigate('profile')}
          className="p-2 -ml-2 text-slate-700 hover:bg-slate-100 rounded-full transition-colors flex items-center gap-1"
        >
          <ChevronLeft className="w-6 h-6 text-slate-700" />
        </button>
        <h1 className="text-base font-bold text-slate-900 tracking-tight">Edit Profile</h1>
        <div className="w-8" />
      </header>

      {/* Hidden Web File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handlePickFile}
        className="hidden"
      />

      <form onSubmit={handleSubmit} className="px-6 py-6 max-w-md mx-auto w-full space-y-6">
        {/* Alerts */}
        {errorMsg && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-xs px-4 py-3 rounded-2xl shadow-sm">
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs px-4 py-3 rounded-2xl shadow-sm flex items-center gap-2 font-semibold">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Profile Avatar Header */}
        <div className="flex flex-col items-center">
          <div className="relative group">
            <div className="w-28 h-28 rounded-full border-4 border-primary/20 p-1 bg-white shadow-md overflow-hidden relative">
              <img
                src={previewAvatarUrl}
                alt="Profile avatar"
                className="w-full h-full object-cover rounded-full bg-slate-100"
              />
            </div>

            <button
              type="button"
              onClick={() => setShowPhotoModal(true)}
              className="absolute bottom-0 right-0 bg-primary text-white p-2.5 rounded-full shadow-lg hover:bg-primary/90 transition-all active:scale-95 border-2 border-white"
              aria-label="Change photo"
            >
              <Camera className="w-4 h-4 text-white" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowPhotoModal(true)}
            className="mt-3 text-xs font-bold text-primary hover:underline cursor-pointer"
          >
            Change Profile Photo
          </button>
        </div>

        {/* Form Fields Container */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-5">
          {/* Display Name */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Display Name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Sophia Miller"
              className="w-full h-12 bg-slate-50 border border-slate-200 rounded-2xl px-4 text-sm text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all"
            />
          </div>

          {/* Username */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Username
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">@</span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                placeholder="sophia_brews"
                maxLength={30}
                className="w-full h-12 bg-slate-50 border border-slate-200 rounded-2xl pl-9 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all font-medium"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5 leading-tight">
              3–30 characters. Lowercase letters, numbers, and underscores only.
            </p>
          </div>

          {/* Bio */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Bio / Introduction
              </label>
              <span className={`text-[11px] font-semibold ${bio.length > 500 ? 'text-red-500' : 'text-slate-400'}`}>
                {bio.length} / 500
              </span>
            </div>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value.slice(0, 500))}
              placeholder="Tell people a little about yourself... ☕"
              rows={3}
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all resize-none leading-relaxed"
            />
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSaving}
          className="w-full h-14 bg-primary text-white font-bold text-base rounded-full shadow-lg shadow-primary/25 hover:bg-primary/90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isSaving ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Saving Changes…</span>
            </>
          ) : (
            <span>Save Changes</span>
          )}
        </button>
      </form>

      {/* Photo Options Modal / Action Sheet */}
      <AnimatePresence>
        {showPhotoModal && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl border border-slate-100 flex flex-col max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
                <h3 className="text-base font-bold text-slate-900">Change Profile Picture</h3>
                <button
                  onClick={() => setShowPhotoModal(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Native / Device Upload */}
              <button
                type="button"
                onClick={handleNativeCamera}
                className="w-full py-3.5 px-4 bg-primary/10 text-primary font-bold rounded-2xl text-sm flex items-center justify-center gap-2 hover:bg-primary/20 transition-all mb-4"
              >
                <ImageIcon className="w-5 h-5 text-primary" />
                <span>Choose From Device</span>
              </button>

              <div className="relative flex py-2 items-center mb-4">
                <div className="flex-grow border-t border-slate-100"></div>
                <span className="flex-shrink mx-3 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Or Select BrewSpot Avatar
                </span>
                <div className="flex-grow border-t border-slate-100"></div>
              </div>

              {/* Default Avatars Grid */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                {DEFAULT_AVATARS.map((item) => {
                  const IconComp = item.icon;
                  const isSelected = avatarType === 'default' && avatarPath === item.path;
                  const avatarUrl = api.getPublicAvatarUrl('default', item.path);

                  return (
                    <button
                      key={item.path}
                      type="button"
                      onClick={() => handleSelectDefaultAvatar(item.path)}
                      className={`p-3 rounded-2xl border flex flex-col items-center gap-2 transition-all ${isSelected
                        ? 'bg-primary/5 border-primary ring-2 ring-primary/30 shadow-sm'
                        : 'bg-slate-50 border-slate-100 hover:border-slate-300'
                        }`}
                    >
                      <div className="w-12 h-12 rounded-full overflow-hidden border border-slate-200 bg-white p-0.5 relative">
                        <img src={avatarUrl} alt={item.name} className="w-full h-full object-cover rounded-full bg-slate-50" />
                        {isSelected && (
                          <div className="absolute inset-0 bg-primary/20 flex items-center justify-center rounded-full">
                            <Check className="w-5 h-5 text-primary stroke-[3]" />
                          </div>
                        )}
                      </div>
                      <div className="text-center">
                        <p className="text-xs font-bold text-slate-900">{item.name}</p>
                        <p className="text-[10px] text-slate-400">{item.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => setShowPhotoModal(false)}
                className="w-full py-3 bg-slate-100 text-slate-700 font-semibold rounded-2xl text-xs hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
