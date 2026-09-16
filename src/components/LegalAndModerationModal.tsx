import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flag, Ban, ShieldCheck, FileText, HelpCircle, X, CheckCircle2 } from 'lucide-react';

interface ReportModalProps {
  isOpen: boolean;
  targetType: 'post' | 'user';
  targetName?: string;
  onClose: () => void;
  onSubmitReport: (reason: string, details?: string) => Promise<void>;
}

export function ReportModal({ isOpen, targetType, targetName, onClose, onSubmitReport }: ReportModalProps) {
  const [selectedReason, setSelectedReason] = useState('Inappropriate Content');
  const [details, setDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const reasons = [
    'Inappropriate Content',
    'Spam or Commercial Promo',
    'Harassment or Bullying',
    'False Information',
    'Intellectual Property Violation',
  ];

  if (!isOpen) return null;

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onSubmitReport(selectedReason, details);
      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        onClose();
      }, 1800);
    } catch {
      alert('Could not submit report. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 overflow-hidden"
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
          >
            <X size={20} />
          </button>

          {isSuccess ? (
            <div className="py-8 text-center flex flex-col items-center">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4">
                <CheckCircle2 size={36} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-1">Report Submitted</h3>
              <p className="text-xs text-slate-500">Thank you for helping keep the BrewSpot community safe.</p>
            </div>
          ) : (
            <>
              <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mb-4">
                <Flag size={24} />
              </div>

              <h3 className="text-lg font-bold text-slate-900 mb-1">
                Report {targetType === 'user' ? `@${targetName || 'User'}` : 'Post'}
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                Please select the primary reason for reporting this {targetType}:
              </p>

              <div className="space-y-2 mb-4">
                {reasons.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setSelectedReason(r)}
                    className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-semibold border transition-all ${
                      selectedReason === r
                        ? 'bg-amber-50 border-amber-300 text-amber-900 shadow-sm'
                        : 'bg-slate-50 border-slate-100 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>

              <textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Additional details (optional)..."
                rows={2}
                className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs outline-none focus:ring-2 focus:ring-amber-400/30 text-slate-800 placeholder-slate-400 mb-4"
              />

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3 bg-slate-100 text-slate-700 font-semibold rounded-full text-xs hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="flex-1 py-3 bg-amber-600 text-white font-bold rounded-full text-xs hover:bg-amber-700 shadow-md shadow-amber-600/20 transition-all disabled:opacity-50"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Report'}
                </button>
              </div>
            </>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

interface BlockModalProps {
  isOpen: boolean;
  targetName: string;
  onClose: () => void;
  onConfirmBlock: () => Promise<void>;
}

export function BlockModal({ isOpen, targetName, onClose, onConfirmBlock }: BlockModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleBlock = async () => {
    setIsSubmitting(true);
    try {
      await onConfirmBlock();
      onClose();
    } catch {
      alert('Could not block user. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 overflow-hidden text-center"
        >
          <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Ban size={24} />
          </div>

          <h3 className="text-lg font-bold text-slate-900 mb-2">Block @{targetName}?</h3>
          <p className="text-xs text-slate-500 mb-6 leading-relaxed">
            They will no longer be able to message you or view your posts on BrewSpot. You can unblock them at any time in settings.
          </p>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 py-3 bg-slate-100 text-slate-700 font-semibold rounded-full text-xs hover:bg-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleBlock}
              disabled={isSubmitting}
              className="flex-1 py-3 bg-red-600 text-white font-bold rounded-full text-xs hover:bg-red-700 shadow-md shadow-red-600/20 transition-all disabled:opacity-50"
            >
              {isSubmitting ? 'Blocking...' : 'Block User'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

interface LegalViewerProps {
  isOpen: boolean;
  initialDoc?: 'privacy' | 'terms' | 'guidelines' | 'deletion';
  onClose: () => void;
}

export function LegalViewerModal({ isOpen, initialDoc = 'privacy', onClose }: LegalViewerProps) {
  const [activeTab, setActiveTab] = useState<'privacy' | 'terms' | 'guidelines' | 'deletion'>(initialDoc);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 30 }}
          className="relative w-full max-w-lg bg-white rounded-3xl h-[80vh] shadow-2xl border border-slate-100 flex flex-col overflow-hidden"
        >
          <header className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" />
              <h2 className="font-bold text-slate-900 text-base">BrewSpot Trust & Legal</h2>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
            >
              <X size={20} />
            </button>
          </header>

          <div className="flex border-b border-slate-100 bg-slate-50 px-2 overflow-x-auto no-scrollbar shrink-0">
            <button
              onClick={() => setActiveTab('privacy')}
              className={`py-3 px-4 text-xs font-bold border-b-2 whitespace-nowrap transition-colors ${
                activeTab === 'privacy' ? 'border-primary text-primary' : 'border-transparent text-slate-400'
              }`}
            >
              Privacy Policy
            </button>
            <button
              onClick={() => setActiveTab('terms')}
              className={`py-3 px-4 text-xs font-bold border-b-2 whitespace-nowrap transition-colors ${
                activeTab === 'terms' ? 'border-primary text-primary' : 'border-transparent text-slate-400'
              }`}
            >
              Terms of Service
            </button>
            <button
              onClick={() => setActiveTab('guidelines')}
              className={`py-3 px-4 text-xs font-bold border-b-2 whitespace-nowrap transition-colors ${
                activeTab === 'guidelines' ? 'border-primary text-primary' : 'border-transparent text-slate-400'
              }`}
            >
              Community Guidelines
            </button>
            <button
              onClick={() => setActiveTab('deletion')}
              className={`py-3 px-4 text-xs font-bold border-b-2 whitespace-nowrap transition-colors ${
                activeTab === 'deletion' ? 'border-primary text-primary' : 'border-transparent text-slate-400'
              }`}
            >
              Account Deletion Policy
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 text-xs text-slate-600 leading-relaxed space-y-4">
            {activeTab === 'privacy' && (
              <>
                <h3 className="text-sm font-bold text-slate-900">Privacy Policy</h3>
                <p>
                  BrewSpot collects user-provided information including email address, username, profile name, uploaded photos, ratings, captions, and saved coffee shop collections to deliver social discovery features.
                </p>
                <h4 className="font-bold text-slate-800">1. Data Usage</h4>
                <p>We use your information to operate the application, populate public social feeds, personalize recommended cafés, and enable direct communication between users.</p>
                <h4 className="font-bold text-slate-800">2. Third-Party Services</h4>
                <p>BrewSpot uses Google Places API for venue discovery and Supabase for cloud database and media storage services. No personal data is sold to third parties.</p>
                <h4 className="font-bold text-slate-800">3. Contact</h4>
                <p>For privacy inquiries or support, contact support@brewspot.app.</p>
              </>
            )}

            {activeTab === 'terms' && (
              <>
                <h3 className="text-sm font-bold text-slate-900">Terms of Service</h3>
                <p>
                  By accessing or using BrewSpot, you agree to comply with these terms and applicable laws.
                </p>
                <h4 className="font-bold text-slate-800">1. User Conduct</h4>
                <p>You agree not to post objectionable, defamatory, illegal, or infringing content. We reserve the right to remove content or suspend accounts violating these standards.</p>
                <h4 className="font-bold text-slate-800">2. Ownership</h4>
                <p>Users retain ownership of photos they publish while granting BrewSpot a license to display them across application feeds.</p>
              </>
            )}

            {activeTab === 'guidelines' && (
              <>
                <h3 className="text-sm font-bold text-slate-900">Community Guidelines</h3>
                <p>
                  BrewSpot is built for coffee lovers to discover and share aesthetic café experiences in a respectful environment.
                </p>
                <ul className="list-disc pl-4 space-y-1">
                  <li>Be respectful in comments and direct messages.</li>
                  <li>Share authentic coffee shop photos and genuine ratings.</li>
                  <li>No spam, commercial solicitation, or harassment.</li>
                </ul>
              </>
            )}

            {activeTab === 'deletion' && (
              <>
                <h3 className="text-sm font-bold text-slate-900">Account Deletion Policy</h3>
                <p>
                  You have the right to request full account deletion at any time directly in your profile settings (**Profile -&gt; Settings -&gt; Delete Account**).
                </p>
                <p>
                  Deleting your account permanently removes your identity from Supabase Auth, erases your public profile, posts, comments, likes, follow relationships, and saved café collections from our active database.
                </p>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
