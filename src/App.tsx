import React, { useState, useEffect, Component, ReactNode, useRef } from 'react';
import { 
  auth, db, googleProvider, signInWithPopup, signOut, onAuthStateChanged, 
  collection, doc, addDoc, updateDoc, deleteDoc, deleteField, onSnapshot, query, orderBy, where, Timestamp, 
  handleFirestoreError, OperationType, FirebaseUser, getDoc, setDoc
} from './firebase';
import { Player, Practice, Match, League, Drill, DrillLibraryItem, UserProfile, Team, MatchGoal, MatchStats, MatchCard, MatchAssist } from './types';
import { 
  Users, Calendar, Trophy, Plus, Trash2, Phone, MapPin, 
  Camera, CheckCircle2, ChevronRight, LogOut, LogIn, 
  Dumbbell, X, Download, Shield, UserPlus, ClipboardList, Loader2, Edit, PenTool,
  Settings, LayoutGrid, Building2, Upload, Image as ImageIcon, Eye, Maximize2,
  BarChart2, Award, Activity, FileText, Layers, Clock, AlertTriangle, TrendingUp, RefreshCw, Search,
  Sparkles, ArrowRight, Play, Zap, Flame, Briefcase, Ruler, Scale, User, MessageSquareQuote, ShieldAlert,
  SlidersHorizontal, ChevronDown, Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { PWAInstallButton } from './components/PWAInstallButton';
import { OfflineIndicator } from './components/OfflineIndicator';

// --- Preset Drill Images & SVG Fallback ---
const DEFAULT_DRILL_SVG = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><rect width="400" height="300" fill="%23065f46"/><rect x="20" y="20" width="360" height="260" fill="none" stroke="%2334d399" stroke-width="2" opacity="0.6"/><line x1="200" y1="20" x2="200" y2="280" stroke="%2334d399" stroke-width="2" opacity="0.6"/><circle cx="200" cy="150" r="40" fill="none" stroke="%2334d399" stroke-width="2" opacity="0.6"/><circle cx="200" cy="150" r="4" fill="%2334d399" opacity="0.8"/><rect x="20" y="80" width="60" height="140" fill="none" stroke="%2334d399" stroke-width="2" opacity="0.6"/><rect x="320" y="80" width="60" height="140" fill="none" stroke="%2334d399" stroke-width="2" opacity="0.6"/><text x="200" y="260" font-family="sans-serif" font-size="14" font-weight="bold" fill="%23a7f3d0" text-anchor="middle">SOCCER TACTICAL DRILL</text></svg>`;

const PRESET_DRILL_IMAGES = [
  { name: 'Tactical Pitch', url: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=600&q=80' },
  { name: 'Passing Rondo', url: 'https://images.unsplash.com/photo-1526232761682-d26e03ac148e?auto=format&fit=crop&w=600&q=80' },
  { name: 'Shooting & Finishing', url: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&w=600&q=80' },
  { name: 'Fitness & Agility', url: 'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?auto=format&fit=crop&w=600&q=80' },
  { name: 'Goalkeeping Drill', url: 'https://images.unsplash.com/photo-1551958219-acbc608c6377?auto=format&fit=crop&w=600&q=80' }
];

// --- Safe Image Component ---
function SafeImage({ 
  src, 
  alt, 
  className = '', 
  containerClassName = '',
  fallbackIcon,
  onClick
}: { 
  src?: string; 
  alt?: string; 
  className?: string; 
  containerClassName?: string;
  fallbackIcon?: React.ReactNode;
  onClick?: () => void;
}) {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [src]);

  if (!src || hasError) {
    return (
      <div 
        onClick={onClick}
        className={`bg-stone-100 flex items-center justify-center text-stone-400 select-none ${containerClassName || className} ${onClick ? 'cursor-pointer' : ''}`}
      >
        {fallbackIcon || <Dumbbell size={24} className="opacity-40" />}
      </div>
    );
  }

  return (
    <div 
      onClick={onClick} 
      className={`relative overflow-hidden group/img ${containerClassName} ${onClick ? 'cursor-pointer' : ''}`}
    >
      <img
        src={src}
        alt={alt || 'Image'}
        className={`${className} transition-transform duration-300 ${onClick ? 'group-hover/img:scale-105' : ''}`}
        referrerPolicy="no-referrer"
        onError={() => setHasError(true)}
      />
      {onClick && (
        <div className="absolute inset-0 bg-stone-900/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center text-white">
          <Maximize2 size={18} />
        </div>
      )}
    </div>
  );
}

// --- Image Lightbox Modal ---
function ImageModal({ src, title, onClose }: { src: string | null; title?: string; onClose: () => void }) {
  if (!src) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-md flex items-center justify-center p-4" 
        onClick={onClose}
      >
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="relative max-w-4xl max-h-[90vh] w-full bg-stone-900 rounded-3xl overflow-hidden border border-stone-800 shadow-2xl flex flex-col" 
          onClick={e => e.stopPropagation()}
        >
          <div className="flex justify-between items-center p-4 border-b border-stone-800 text-white">
            <h3 className="font-bold text-lg italic tracking-tight uppercase">{title || 'Image Viewer'}</h3>
            <button 
              onClick={onClose} 
              className="p-2 text-stone-400 hover:text-white rounded-xl bg-stone-800 hover:bg-stone-700 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
          <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-stone-950/50">
            <img 
              src={src} 
              alt={title || 'Preview'} 
              className="max-w-full max-h-[75vh] object-contain rounded-xl shadow-2xl" 
              referrerPolicy="no-referrer" 
            />
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// --- Error Boundary ---
interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: any;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      let errorMessage = "Something went wrong.";
      try {
        const parsed = JSON.parse(this.state.error.message);
        errorMessage = `Firestore Error: ${parsed.error} during ${parsed.operationType} at ${parsed.path}`;
      } catch (e) {
        errorMessage = this.state.error.message || errorMessage;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-stone-50 p-4">
          <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full border border-red-100">
            <h2 className="text-2xl font-bold text-red-600 mb-4">Application Error</h2>
            <p className="text-stone-600 mb-6">{errorMessage}</p>
            <button 
              onClick={() => window.location.reload()}
              className="w-full py-3 bg-stone-900 text-white rounded-xl font-medium hover:bg-stone-800 transition-colors"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// --- Main App ---
export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [activeTeamId, setActiveTeamId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'squad' | 'practices' | 'matches' | 'drills' | 'admin'>('squad');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        
        // Fetch or create user profile
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        try {
          const userDoc = await getDoc(userDocRef);
          let userProfile: UserProfile;
          
          if (!userDoc.exists()) {
            userProfile = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || `${firebaseUser.uid}@app.local`,
              displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Coach',
              role: firebaseUser.email === 'kabesimadoshi5@gmail.com' ? 'admin' : 'coach',
              teamIds: []
            };
            try {
              await setDoc(userDocRef, userProfile);
            } catch (createErr) {
              handleFirestoreError(createErr, OperationType.CREATE, `users/${firebaseUser.uid}`);
            }
          } else {
            userProfile = { uid: firebaseUser.uid, ...userDoc.data() } as UserProfile;
          }
          setProfile(userProfile);
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `users/${firebaseUser.uid}`);
        }
      } else {
        setUser(null);
        setProfile(null);
        setTeams([]);
        setActiveTeamId(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Fetch teams based on profile
  useEffect(() => {
    if (!profile) return;

    let q;
    if (profile.role === 'admin' || profile.role === 'data_user') {
      q = query(collection(db, 'teams'), orderBy('name'));
    } else {
      if (profile.teamIds && profile.teamIds.length > 0) {
        q = query(collection(db, 'teams'), where('__name__', 'in', profile.teamIds));
      } else {
        setTeams([]);
        setActiveTeamId(null);
        return;
      }
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedTeams = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Team));
      setTeams(fetchedTeams);
      if (fetchedTeams.length > 0 && !activeTeamId) {
        setActiveTeamId(fetchedTeams[0].id);
      }
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'teams'));

    return () => unsubscribe();
  }, [profile]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-stone-900"></div>
      </div>
    );
  }

  if (!user) {
    return <LoginView />;
  }

  return (
    <ErrorBoundary>
      <div className="min-h-[100dvh] bg-stone-50 text-stone-900 font-sans flex flex-col antialiased">
        {/* Network Offline Indicator */}
        <OfflineIndicator />

        {/* Mobile Top Header (Sticky / Fixed) */}
        <header className="md:hidden fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-md border-b border-stone-200 z-40 px-3 py-2.5 pt-safe flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex items-center gap-1.5 shrink-0">
              <Trophy className="text-emerald-600 w-5 h-5" />
              <span className="font-black text-sm italic tracking-tight uppercase">Kocha</span>
            </div>

            {teams.length > 0 && (
              <div className="relative flex items-center bg-stone-100 hover:bg-stone-200/80 px-2 py-1 rounded-xl text-xs font-bold text-stone-800 transition-colors max-w-[130px] sm:max-w-[180px]">
                <Building2 size={13} className="text-stone-400 shrink-0 mr-1" />
                <select 
                  value={activeTeamId || ''} 
                  onChange={(e) => setActiveTeamId(e.target.value)}
                  className="bg-transparent text-xs font-bold focus:outline-none cursor-pointer truncate w-full appearance-none pr-3"
                  title="Switch Active Team"
                >
                  {teams.map(team => (
                    <option key={team.id} value={team.id}>{team.name}</option>
                  ))}
                </select>
                <ChevronDown size={11} className="text-stone-400 pointer-events-none absolute right-1.5" />
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <PWAInstallButton variant="compact" />

            <div className="flex items-center gap-1 pl-1 border-l border-stone-200">
              <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 font-black text-xs flex items-center justify-center uppercase" title={`${profile?.displayName} (${profile?.role})`}>
                {profile?.displayName?.charAt(0) || 'C'}
              </div>
              <button 
                onClick={() => signOut(auth)}
                className="p-1.5 text-stone-400 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors"
                title="Sign Out"
              >
                <LogOut size={15} />
              </button>
            </div>
          </div>
        </header>

        {/* Desktop Navigation (Top Bar) */}
        <nav className="hidden md:block fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-md border-b border-stone-200 px-6 py-3.5 z-50">
          <div className="max-w-5xl mx-auto flex justify-between items-center">
            <div className="flex items-center gap-4 font-bold text-xl tracking-tight">
              <div className="flex items-center gap-2">
                <Trophy className="text-emerald-600" />
                <span>KochaMsaidizi</span>
              </div>
              
              {teams.length > 0 && (
                <div className="flex items-center gap-2 pl-4 border-l border-stone-200">
                  <Building2 size={18} className="text-stone-400" />
                  <select 
                    value={activeTeamId || ''} 
                    onChange={(e) => setActiveTeamId(e.target.value)}
                    className="bg-transparent text-sm font-semibold focus:outline-none cursor-pointer hover:text-emerald-600 transition-colors"
                  >
                    {teams.map(team => (
                      <option key={team.id} value={team.id}>{team.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            
            <div className="flex gap-8">
              <NavButton 
                active={activeTab === 'squad'} 
                onClick={() => setActiveTab('squad')}
                icon={<Users size={18} />}
                label="Squad"
              />
              <NavButton 
                active={activeTab === 'practices'} 
                onClick={() => setActiveTab('practices')}
                icon={<Dumbbell size={18} />}
                label="Practices"
              />
              <NavButton 
                active={activeTab === 'drills'} 
                onClick={() => setActiveTab('drills')}
                icon={<ClipboardList size={18} />}
                label="Drills"
              />
              <NavButton 
                active={activeTab === 'matches'} 
                onClick={() => setActiveTab('matches')}
                icon={<Trophy size={18} />}
                label="Matches"
              />
              {profile?.role === 'admin' && (
                <NavButton 
                  active={activeTab === 'admin'} 
                  onClick={() => setActiveTab('admin')}
                  icon={<Shield size={18} />}
                  label="Admin"
                />
              )}
            </div>

            <div className="flex items-center gap-3">
              <PWAInstallButton variant="compact" />
              
              <div className="text-right pl-2 border-l border-stone-200">
                <p className="text-xs font-bold text-stone-900 truncate max-w-[120px]">{profile?.displayName}</p>
                <p className="text-[10px] text-stone-400 uppercase tracking-widest font-black">{profile?.role}</p>
              </div>
              <button 
                onClick={() => signOut(auth)}
                className="p-2 text-stone-400 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-all cursor-pointer"
                title="Sign Out"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </nav>

        {/* Mobile Dock Navigation (Bottom) */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-stone-200 px-1 pt-1.5 pb-safe z-50 shadow-lg">
          <div className={`grid ${profile?.role === 'admin' ? 'grid-cols-5' : 'grid-cols-4'} gap-0.5 max-w-md mx-auto items-center`}>
            <NavButton 
              active={activeTab === 'squad'} 
              onClick={() => setActiveTab('squad')}
              icon={<Users size={18} />}
              label="Squad"
            />
            <NavButton 
              active={activeTab === 'practices'} 
              onClick={() => setActiveTab('practices')}
              icon={<Dumbbell size={18} />}
              label="Practices"
            />
            <NavButton 
              active={activeTab === 'drills'} 
              onClick={() => setActiveTab('drills')}
              icon={<ClipboardList size={18} />}
              label="Drills"
            />
            <NavButton 
              active={activeTab === 'matches'} 
              onClick={() => setActiveTab('matches')}
              icon={<Trophy size={18} />}
              label="Matches"
            />
            {profile?.role === 'admin' && (
              <NavButton 
                active={activeTab === 'admin'} 
                onClick={() => setActiveTab('admin')}
                icon={<Shield size={18} />}
                label="Admin"
              />
            )}
          </div>
        </nav>

        {/* Content */}
        <main className="flex-1 w-full max-w-5xl mx-auto px-3.5 sm:px-6 pt-16 pb-28 md:pt-24 md:pb-12">
          {!activeTeamId && profile?.role !== 'admin' ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-4">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-stone-100 rounded-full flex items-center justify-center mb-5">
                <Building2 size={36} className="text-stone-300" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-stone-900 mb-2">No Team Assigned</h2>
              <p className="text-stone-500 text-xs sm:text-sm max-w-sm">
                You haven't been assigned to any teams yet. Please contact an administrator to get started.
              </p>
            </div>
          ) : !activeTeamId && profile?.role === 'admin' && activeTab !== 'admin' ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-4">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mb-5">
                <Building2 size={36} />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-stone-900 mb-2">No Teams Created Yet</h2>
              <p className="text-stone-500 text-xs sm:text-sm max-w-sm mb-6">
                Welcome to KochaMsaidizi! As an administrator, navigate to the Admin panel to create your first team and squad.
              </p>
              <button
                onClick={() => setActiveTab('admin')}
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-md transition-all flex items-center gap-2 cursor-pointer text-sm"
              >
                <Shield size={18} />
                <span>Open Admin Panel</span>
              </button>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              {activeTab === 'squad' && <SquadView key="squad" teamId={activeTeamId!} role={profile?.role!} />}
              {activeTab === 'practices' && <PracticesView key="practices" teamId={activeTeamId!} role={profile?.role!} />}
              {activeTab === 'drills' && <DrillLibraryView key="drills" teamId={activeTeamId!} role={profile?.role!} />}
              {activeTab === 'matches' && <MatchesView key="matches" teamId={activeTeamId!} role={profile?.role!} />}
              {activeTab === 'admin' && profile?.role === 'admin' && <AdminView key="admin" />}
            </AnimatePresence>
          )}
        </main>
      </div>
    </ErrorBoundary>
  );
}

function NavButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={`relative flex flex-col md:flex-row items-center justify-center gap-0.5 md:gap-2 py-1.5 px-1 md:py-1 rounded-xl transition-all cursor-pointer min-h-[44px] ${
        active 
          ? 'text-emerald-700 font-bold bg-emerald-50/70 md:bg-transparent' 
          : 'text-stone-400 hover:text-stone-700 hover:bg-stone-50 md:hover:bg-transparent'
      }`}
    >
      <div className={`transition-transform ${active ? 'scale-110' : ''}`}>
        {icon}
      </div>
      <span className="text-[10px] md:text-sm uppercase tracking-wider font-extrabold truncate max-w-full">
        {label}
      </span>
      {active && (
        <motion.div 
          layoutId="nav-underline" 
          className="hidden md:block absolute -bottom-3.5 left-0 right-0 h-0.5 bg-emerald-600 rounded-full" 
        />
      )}
    </button>
  );
}

function LoginView() {
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    if (isLoggingIn) return;
    
    setIsLoggingIn(true);
    setError(null);
    
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      // Ignore common popup cancellation errors
      if (err.code === 'auth/cancelled-popup-request' || err.code === 'auth/popup-closed-by-user') {
        setIsLoggingIn(false);
        return;
      }
      
      console.error("Login failed", err);
      setError(err.message || "An unexpected error occurred during login.");
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-stone-900 text-white p-4 sm:p-6 overflow-hidden relative">
      {/* Offline Alert */}
      <OfflineIndicator />

      {/* Top right Install prompt */}
      <div className="absolute top-4 right-4 z-20">
        <PWAInstallButton variant="compact" />
      </div>

      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500 rounded-full blur-[120px]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 text-center max-w-md w-full px-2"
      >
        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-emerald-500 rounded-3xl flex items-center justify-center mx-auto mb-6 sm:mb-8 shadow-2xl shadow-emerald-500/20 rotate-12">
          <Trophy size={36} className="text-white -rotate-12" />
        </div>
        <h1 className="text-3xl sm:text-5xl font-black tracking-tighter mb-3 uppercase italic">KochaMsaidizi</h1>
        <p className="text-stone-400 text-sm sm:text-lg mb-8 sm:mb-12 leading-relaxed max-w-sm mx-auto">
          The ultimate command center for your soccer team. Manage players, drills, and match day glory.
        </p>
        
        <div className="space-y-4 w-full">
          <button 
            onClick={handleLogin}
            disabled={isLoggingIn}
            className="group w-full flex items-center justify-center gap-3 bg-white text-stone-900 px-6 py-3.5 sm:py-4 rounded-2xl font-bold text-base sm:text-lg hover:bg-emerald-50 transition-all active:scale-95 shadow-xl disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
          >
            {isLoggingIn ? (
              <Loader2 size={20} className="animate-spin text-emerald-600" />
            ) : (
              <LogIn size={20} />
            )}
            <span>{isLoggingIn ? 'Connecting...' : 'Continue with Google'}</span>
            {!isLoggingIn && <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />}
          </button>

          <AnimatePresence>
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs sm:text-sm font-medium"
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}

// Helper to compress uploaded player photos to compact JPEG Data URLs
const compressPlayerPhoto = (file: File, maxWidth = 360, maxHeight = 360, quality = 0.82): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new window.Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => resolve(e.target?.result as string);
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

function PlayerPhotoUpload({
  photoUrl,
  onChange,
  onRemove,
  playerName
}: {
  photoUrl?: string;
  onChange: (url: string) => void;
  onRemove: () => void;
  playerName?: string;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = async (file: File) => {
    if (!file || !file.type.startsWith('image/')) return;
    setIsCompressing(true);
    try {
      const compressed = await compressPlayerPhoto(file);
      onChange(compressed);
    } catch (err) {
      console.error("Failed to process player photo:", err);
    } finally {
      setIsCompressing(false);
    }
  };

  const AVATAR_PRESETS = [
    { label: 'Pro Striker', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80' },
    { label: 'Midfield Playmaker', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80' },
    { label: 'Solid Defender', url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80' },
    { label: 'Goalkeeper', url: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=300&q=80' }
  ];

  return (
    <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-black uppercase tracking-widest text-emerald-700 flex items-center gap-1.5">
          <Camera size={14} /> Player Photo
        </label>
        <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">
          Syncs with Squad Roster & Match Lineups
        </span>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-4">
        {/* Photo Preview Box */}
        <div className="relative group shrink-0">
          <div className="w-20 h-20 rounded-2xl overflow-hidden bg-stone-200 border-2 border-stone-300 flex items-center justify-center relative shadow-xs">
            {photoUrl ? (
              <>
                <img 
                  src={photoUrl} 
                  alt={playerName || 'Player'} 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                  crossOrigin="anonymous"
                />
                <button
                  type="button"
                  onClick={onRemove}
                  className="absolute top-1 right-1 p-1 bg-stone-900/80 hover:bg-red-600 text-white rounded-full transition-colors shadow-xs"
                  title="Remove Photo"
                >
                  <X size={12} />
                </button>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center text-stone-400 p-2 text-center">
                <Camera size={22} className="mb-0.5 text-stone-400" />
                <span className="text-[9px] font-black uppercase tracking-wider">No Photo</span>
              </div>
            )}
            {isCompressing && (
              <div className="absolute inset-0 bg-stone-900/60 flex items-center justify-center text-white">
                <Loader2 size={18} className="animate-spin" />
              </div>
            )}
          </div>
        </div>

        {/* Upload Dropzone & Controls */}
        <div className="flex-1 w-full space-y-2">
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              const file = e.dataTransfer.files?.[0];
              if (file) processFile(file);
            }}
            className={`border-2 border-dashed rounded-xl p-3 transition-all flex flex-col sm:flex-row items-center justify-between gap-3 ${
              isDragging ? 'border-emerald-500 bg-emerald-50/80' : 'border-stone-300 hover:border-emerald-500 bg-white'
            }`}
          >
            <div className="text-left text-xs text-stone-600">
              <span className="font-bold text-stone-900">Drag & drop player photo here</span> or choose file
              <div className="text-[10px] text-stone-400 mt-0.5">JPG, PNG, WebP supported • Auto-optimized</div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3.5 py-1.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider inline-flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
              >
                <Upload size={13} />
                <span>Upload</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) processFile(file);
                  e.target.value = '';
                }}
              />
            </div>
          </div>

          {/* Quick presets & URL toggle */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-0.5">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Presets:</span>
              <div className="flex items-center gap-1">
                {AVATAR_PRESETS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => onChange(preset.url)}
                    className="w-6 h-6 rounded-full overflow-hidden border border-stone-200 hover:border-emerald-500 hover:scale-110 transition-all cursor-pointer"
                    title={`Use ${preset.label}`}
                  >
                    <img src={preset.url} alt={preset.label} className="w-full h-full object-cover" crossOrigin="anonymous" referrerPolicy="no-referrer" />
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowUrlInput(!showUrlInput)}
              className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 underline uppercase tracking-wider"
            >
              {showUrlInput ? 'Hide URL field' : 'Paste Image URL'}
            </button>
          </div>

          {showUrlInput && (
            <div className="flex items-center gap-2 pt-1">
              <input
                type="url"
                placeholder="https://images.example.com/player.jpg"
                value={photoUrl || ''}
                onChange={(e) => onChange(e.target.value)}
                className="flex-1 px-3 py-1.5 rounded-lg bg-white border border-stone-200 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              {photoUrl && (
                <button
                  type="button"
                  onClick={onRemove}
                  className="px-2.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-600 text-xs font-bold rounded-lg transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// --- Squad View ---
function SquadView({ teamId, role }: { teamId: string, role: string }) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [selectedPlayerProfile, setSelectedPlayerProfile] = useState<Player | null>(null);
  const [profileCategory, setProfileCategory] = useState<'stats' | 'bio' | 'coach'>('stats');
  const [searchQuery, setSearchQuery] = useState('');
  const [positionFilter, setPositionFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState<'number' | 'name' | 'goals' | 'assists' | 'appearances'>('number');

  const [newPlayer, setNewPlayer] = useState<Partial<Player>>({ 
    name: '', 
    phone: '', 
    position: '', 
    number: undefined,
    age: undefined,
    preferredFoot: 'Right',
    weight: '',
    height: '',
    occupation: '',
    coachInsights: '',
    photoUrl: ''
  });

  const canEdit = role === 'admin' || role === 'coach';

  useEffect(() => {
    if (!teamId) return;
    const q = query(collection(db, 'players'), where('teamId', '==', teamId), orderBy('name'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPlayers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Player)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'players'));
    return () => unsubscribe();
  }, [teamId]);

  useEffect(() => {
    if (!teamId) return;
    const mQ = query(collection(db, 'matches'), where('teamId', '==', teamId));
    const unsubscribe = onSnapshot(mQ, (snapshot) => {
      setMatches(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Match)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'matches'));
    return () => unsubscribe();
  }, [teamId]);

  // Compute live match statistics and event highlights for a player
  const computePlayerStats = (player: Player) => {
    let appearances = 0;
    let goals = 0;
    let assists = 0;
    let yellowCards = 0;
    let redCards = 0;
    let motmCount = 0;
    const eventLogs: {
      matchId: string;
      opponent: string;
      date: any;
      score?: string;
      type: 'goal' | 'assist' | 'yellow' | 'red' | 'motm' | 'appearance';
      minute?: number;
      label: string;
      details?: string;
    }[] = [];

    matches.forEach(m => {
      let playedThisMatch = false;

      // Lineup participation
      if (m.lineup?.startingXI?.some(s => s.playerId === player.id)) {
        playedThisMatch = true;
      } else if (m.lineup?.substitutes?.includes(player.id)) {
        playedThisMatch = true;
      } else if (m.attendees?.includes(player.id)) {
        playedThisMatch = true;
      }

      // Goals
      const pGoals = (m.stats?.goals || []).filter(g => 
        g.playerId === player.id || (g.playerName && g.playerName.trim().toLowerCase() === player.name.trim().toLowerCase())
      );
      pGoals.forEach(g => {
        goals++;
        playedThisMatch = true;
        eventLogs.push({
          matchId: m.id,
          opponent: m.opponent,
          date: m.date,
          score: m.score,
          type: 'goal',
          minute: g.minute,
          label: `⚽ Goal (${g.minute}')`,
          details: g.assistPlayerName ? `Assist: ${g.assistPlayerName}` : (g.goalType ? `Type: ${g.goalType.replace('_', ' ')}` : undefined)
        });
      });

      // Assists from goals
      const pAssistsFromGoals = (m.stats?.goals || []).filter(g =>
        g.assistPlayerId === player.id || (g.assistPlayerName && g.assistPlayerName.trim().toLowerCase() === player.name.trim().toLowerCase())
      );
      pAssistsFromGoals.forEach(g => {
        assists++;
        playedThisMatch = true;
        eventLogs.push({
          matchId: m.id,
          opponent: m.opponent,
          date: m.date,
          score: m.score,
          type: 'assist',
          minute: g.minute,
          label: `👟 Assist (${g.minute}')`,
          details: `Goal scored by ${g.playerName}`
        });
      });

      // Assists from dedicated assists array
      const pDedicatedAssists = (m.stats?.assists || []).filter(a =>
        a.playerId === player.id || (a.playerName && a.playerName.trim().toLowerCase() === player.name.trim().toLowerCase())
      );
      pDedicatedAssists.forEach(a => {
        assists++;
        playedThisMatch = true;
        eventLogs.push({
          matchId: m.id,
          opponent: m.opponent,
          date: m.date,
          score: m.score,
          type: 'assist',
          minute: a.minute,
          label: `👟 Assist (${a.minute ? `${a.minute}'` : 'Match'})`,
          details: a.notes || undefined
        });
      });

      // Cards
      const pCards = (m.stats?.cards || []).filter(c =>
        c.playerId === player.id || (c.playerName && c.playerName.trim().toLowerCase() === player.name.trim().toLowerCase())
      );
      pCards.forEach(c => {
        playedThisMatch = true;
        if (c.cardType === 'yellow') {
          yellowCards++;
          eventLogs.push({
            matchId: m.id,
            opponent: m.opponent,
            date: m.date,
            score: m.score,
            type: 'yellow',
            minute: c.minute,
            label: `🟨 Yellow Card (${c.minute}')`,
            details: c.reason || 'Tactical Caution'
          });
        } else if (c.cardType === 'red') {
          redCards++;
          eventLogs.push({
            matchId: m.id,
            opponent: m.opponent,
            date: m.date,
            score: m.score,
            type: 'red',
            minute: c.minute,
            label: `🟥 Red Card (${c.minute}')`,
            details: c.reason || 'Dismissal'
          });
        }
      });

      // Player of the Match
      if (
        m.stats?.playerOfTheMatchId === player.id ||
        (m.stats?.playerOfTheMatch && m.stats.playerOfTheMatch.trim().toLowerCase() === player.name.trim().toLowerCase())
      ) {
        motmCount++;
        playedThisMatch = true;
        eventLogs.push({
          matchId: m.id,
          opponent: m.opponent,
          date: m.date,
          score: m.score,
          type: 'motm',
          label: '🏆 Player of the Match',
          details: `Outstanding performance vs ${m.opponent}`
        });
      }

      if (playedThisMatch) {
        appearances++;
      }
    });

    return {
      appearances,
      goals,
      assists,
      yellowCards,
      redCards,
      motmCount,
      goalContributions: goals + assists,
      eventLogs: eventLogs.sort((a, b) => (b.minute || 0) - (a.minute || 0))
    };
  };

  const handleAddPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlayer.name || !newPlayer.phone || !teamId) return;
    try {
      await addDoc(collection(db, 'players'), { 
        ...newPlayer, 
        teamId,
        age: newPlayer.age ? Number(newPlayer.age) : undefined,
        number: newPlayer.number ? Number(newPlayer.number) : undefined,
        photoUrl: newPlayer.photoUrl || ''
      });
      setNewPlayer({ 
        name: '', 
        phone: '', 
        position: '', 
        number: undefined,
        age: undefined,
        preferredFoot: 'Right',
        weight: '',
        height: '',
        occupation: '',
        coachInsights: '',
        photoUrl: ''
      });
      setIsAdding(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'players');
    }
  };

  const handleUpdatePlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlayer || !editingPlayer.name || !editingPlayer.phone) return;
    try {
      const { id, ...data } = editingPlayer;
      await updateDoc(doc(db, 'players', id), {
        ...data,
        age: data.age ? Number(data.age) : undefined,
        number: data.number ? Number(data.number) : undefined,
        photoUrl: data.photoUrl || ''
      });
      // Also update selected modal if open
      if (selectedPlayerProfile?.id === id) {
        setSelectedPlayerProfile({ ...editingPlayer, photoUrl: editingPlayer.photoUrl || '' });
      }
      setEditingPlayer(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `players/${editingPlayer.id}`);
    }
  };

  const handleDeletePlayer = async (id: string) => {
    if (!confirm("Remove this player from the squad?")) return;
    try {
      await deleteDoc(doc(db, 'players', id));
      if (selectedPlayerProfile?.id === id) setSelectedPlayerProfile(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `players/${id}`);
    }
  };

  // Filter and Sort players
  const filteredPlayers = players
    .filter(p => {
      const matchesSearch = 
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.position && p.position.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (p.occupation && p.occupation.toLowerCase().includes(searchQuery.toLowerCase()));
      
      if (!matchesSearch) return false;
      if (positionFilter === 'ALL') return true;
      if (positionFilter === 'GK') return p.position?.toLowerCase().includes('goal') || p.position?.toLowerCase().includes('keeper') || p.position === 'GK';
      if (positionFilter === 'DEF') return p.position?.toLowerCase().includes('back') || p.position?.toLowerCase().includes('defen') || p.position?.toLowerCase().includes('cb') || p.position?.toLowerCase().includes('lb') || p.position?.toLowerCase().includes('rb');
      if (positionFilter === 'MID') return p.position?.toLowerCase().includes('mid') || p.position?.toLowerCase().includes('cm') || p.position?.toLowerCase().includes('dm') || p.position?.toLowerCase().includes('am') || p.position?.toLowerCase().includes('wing');
      if (positionFilter === 'FWD') return p.position?.toLowerCase().includes('strik') || p.position?.toLowerCase().includes('forw') || p.position?.toLowerCase().includes('att') || p.position?.toLowerCase().includes('st') || p.position?.toLowerCase().includes('cf');
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'number') {
        const numA = a.number ?? 999;
        const numB = b.number ?? 999;
        return numA - numB;
      }
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      }
      const statsA = computePlayerStats(a);
      const statsB = computePlayerStats(b);
      if (sortBy === 'goals') return statsB.goals - statsA.goals;
      if (sortBy === 'assists') return statsB.assists - statsA.assists;
      if (sortBy === 'appearances') return statsB.appearances - statsA.appearances;
      return 0;
    });

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }}
      className="space-y-8"
    >
      {/* Header & Quick Action */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-4xl font-black tracking-tight uppercase italic mb-1">Squad</h2>
          <p className="text-stone-500 font-medium">
            {players.length} Players Registered • Dynamic Match Performance Tracking
          </p>
        </div>
        {canEdit && (
          <button 
            onClick={() => { setIsAdding(true); setEditingPlayer(null); }}
            className="flex items-center gap-2 bg-emerald-600 text-white px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition-all hover:scale-105"
          >
            <Plus size={18} />
            <span>Register Player</span>
          </button>
        )}
      </div>

      {/* Search, Filter & Sort Bar */}
      <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            placeholder="Search by name, position, occupation..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl bg-stone-50 border border-stone-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Position Filter Chips */}
          <div className="flex items-center bg-stone-100 p-1 rounded-xl gap-1 text-[11px] font-bold">
            {(['ALL', 'GK', 'DEF', 'MID', 'FWD'] as const).map(pos => (
              <button
                key={pos}
                type="button"
                onClick={() => setPositionFilter(pos)}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  positionFilter === pos
                    ? 'bg-white text-emerald-800 shadow-xs'
                    : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                {pos}
              </button>
            ))}
          </div>

          {/* Sort By Dropdown */}
          <div className="flex items-center gap-1.5 bg-stone-50 border border-stone-200 px-3 py-1.5 rounded-xl text-xs font-bold text-stone-600">
            <SlidersHorizontal size={14} className="text-stone-400" />
            <span className="text-stone-400 uppercase tracking-widest text-[10px]">Sort:</span>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="bg-transparent border-none text-stone-800 focus:outline-none cursor-pointer"
            >
              <option value="number">Jersey #</option>
              <option value="name">Name (A-Z)</option>
              <option value="goals">Most Goals</option>
              <option value="assists">Most Assists</option>
              <option value="appearances">Most Matches</option>
            </select>
          </div>
        </div>
      </div>

      {/* Add / Edit Player Modal / Drawer */}
      <AnimatePresence>
        {(isAdding || editingPlayer) && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <form onSubmit={editingPlayer ? handleUpdatePlayer : handleAddPlayer} className="bg-white p-6 md:p-8 rounded-3xl border border-stone-200 shadow-lg space-y-6">
              <div className="flex items-center justify-between border-b border-stone-100 pb-4">
                <div>
                  <h3 className="font-black text-xl text-stone-900 tracking-tight">
                    {editingPlayer ? `Edit Player: ${editingPlayer.name}` : 'Register New Player'}
                  </h3>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Provide complete personal, physical, professional, and tactical insights.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => { setIsAdding(false); setEditingPlayer(null); }}
                  className="p-2 rounded-xl text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Photo Upload & Preview Section */}
              <PlayerPhotoUpload
                photoUrl={editingPlayer ? editingPlayer.photoUrl : newPlayer.photoUrl}
                onChange={(url) => {
                  if (editingPlayer) {
                    setEditingPlayer({ ...editingPlayer, photoUrl: url });
                  } else {
                    setNewPlayer({ ...newPlayer, photoUrl: url });
                  }
                }}
                onRemove={() => {
                  if (editingPlayer) {
                    setEditingPlayer({ ...editingPlayer, photoUrl: '' });
                  } else {
                    setNewPlayer({ ...newPlayer, photoUrl: '' });
                  }
                }}
                playerName={editingPlayer ? editingPlayer.name : newPlayer.name}
              />

              {/* Section 1: Basic Identity */}
              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase tracking-widest text-emerald-700 flex items-center gap-1.5">
                  <User size={14} /> Basic Identity & Contact
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-[11px] font-bold uppercase text-stone-500">Full Name *</label>
                    <input 
                      placeholder="e.g. Marcus Rashford"
                      className="w-full px-4 py-2.5 rounded-xl bg-stone-50 border border-stone-200 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      value={editingPlayer ? editingPlayer.name : newPlayer.name}
                      onChange={e => editingPlayer ? setEditingPlayer({...editingPlayer, name: e.target.value}) : setNewPlayer({...newPlayer, name: e.target.value})}
                      required
                    />
                  </div>

                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-[11px] font-bold uppercase text-stone-500">Phone Number *</label>
                    <input 
                      placeholder="e.g. +254 700 123 456"
                      className="w-full px-4 py-2.5 rounded-xl bg-stone-50 border border-stone-200 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      value={editingPlayer ? editingPlayer.phone : newPlayer.phone}
                      onChange={e => editingPlayer ? setEditingPlayer({...editingPlayer, phone: e.target.value}) : setNewPlayer({...newPlayer, phone: e.target.value})}
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold uppercase text-stone-500">Position</label>
                    <input 
                      placeholder="e.g. Striker, CB, GK"
                      className="w-full px-4 py-2.5 rounded-xl bg-stone-50 border border-stone-200 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      value={editingPlayer ? editingPlayer.position || '' : newPlayer.position}
                      onChange={e => editingPlayer ? setEditingPlayer({...editingPlayer, position: e.target.value}) : setNewPlayer({...newPlayer, position: e.target.value})}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold uppercase text-stone-500">Jersey Number</label>
                    <input 
                      type="number"
                      placeholder="e.g. 10"
                      className="w-full px-4 py-2.5 rounded-xl bg-stone-50 border border-stone-200 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      value={editingPlayer ? editingPlayer.number ?? '' : newPlayer.number ?? ''}
                      onChange={e => {
                        const val = parseInt(e.target.value);
                        editingPlayer ? setEditingPlayer({...editingPlayer, number: isNaN(val) ? undefined : val}) : setNewPlayer({...newPlayer, number: isNaN(val) ? undefined : val});
                      }}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold uppercase text-stone-500">Age</label>
                    <input 
                      type="number"
                      min="5"
                      max="65"
                      placeholder="e.g. 24"
                      className="w-full px-4 py-2.5 rounded-xl bg-stone-50 border border-stone-200 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      value={editingPlayer ? editingPlayer.age ?? '' : newPlayer.age ?? ''}
                      onChange={e => {
                        const val = parseInt(e.target.value);
                        editingPlayer ? setEditingPlayer({...editingPlayer, age: isNaN(val) ? undefined : val}) : setNewPlayer({...newPlayer, age: isNaN(val) ? undefined : val});
                      }}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold uppercase text-stone-500">Preferred Foot</label>
                    <select
                      className="w-full px-4 py-2.5 rounded-xl bg-stone-50 border border-stone-200 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      value={editingPlayer ? editingPlayer.preferredFoot || 'Right' : newPlayer.preferredFoot || 'Right'}
                      onChange={e => editingPlayer ? setEditingPlayer({...editingPlayer, preferredFoot: e.target.value as any}) : setNewPlayer({...newPlayer, preferredFoot: e.target.value as any})}
                    >
                      <option value="Right">Right Foot</option>
                      <option value="Left">Left Foot</option>
                      <option value="Both">Both / Ambidextrous</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Section 2: Physical & Background */}
              <div className="space-y-3 pt-4 border-t border-stone-100">
                <h4 className="text-xs font-black uppercase tracking-widest text-emerald-700 flex items-center gap-1.5">
                  <Ruler size={14} /> Physical Attributes & Background
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold uppercase text-stone-500">Height</label>
                    <input 
                      placeholder="e.g. 182 cm / 6'0''"
                      className="w-full px-4 py-2.5 rounded-xl bg-stone-50 border border-stone-200 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      value={editingPlayer ? editingPlayer.height || '' : newPlayer.height}
                      onChange={e => editingPlayer ? setEditingPlayer({...editingPlayer, height: e.target.value}) : setNewPlayer({...newPlayer, height: e.target.value})}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold uppercase text-stone-500">Weight</label>
                    <input 
                      placeholder="e.g. 76 kg / 168 lbs"
                      className="w-full px-4 py-2.5 rounded-xl bg-stone-50 border border-stone-200 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      value={editingPlayer ? editingPlayer.weight || '' : newPlayer.weight}
                      onChange={e => editingPlayer ? setEditingPlayer({...editingPlayer, weight: e.target.value}) : setNewPlayer({...newPlayer, weight: e.target.value})}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold uppercase text-stone-500">Occupation</label>
                    <input 
                      placeholder="e.g. Software Engineer / Student"
                      className="w-full px-4 py-2.5 rounded-xl bg-stone-50 border border-stone-200 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      value={editingPlayer ? editingPlayer.occupation || '' : newPlayer.occupation}
                      onChange={e => editingPlayer ? setEditingPlayer({...editingPlayer, occupation: e.target.value}) : setNewPlayer({...newPlayer, occupation: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: Coach Insights & Tactical Notes */}
              <div className="space-y-2 pt-4 border-t border-stone-100">
                <label className="text-xs font-black uppercase tracking-widest text-emerald-700 flex items-center gap-1.5">
                  <MessageSquareQuote size={14} /> Coach Insights & Tactical Assessment
                </label>
                <textarea 
                  rows={3}
                  placeholder="Record tactical strengths, technical development areas, work ethic, leadership qualities, set-piece roles..."
                  className="w-full px-4 py-3 rounded-2xl bg-stone-50 border border-stone-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 leading-relaxed"
                  value={editingPlayer ? editingPlayer.coachInsights || '' : newPlayer.coachInsights}
                  onChange={e => editingPlayer ? setEditingPlayer({...editingPlayer, coachInsights: e.target.value}) : setNewPlayer({...newPlayer, coachInsights: e.target.value})}
                />
              </div>

              <div className="flex gap-3 justify-end pt-2 border-t border-stone-100">
                <button 
                  type="button" 
                  onClick={() => { setIsAdding(false); setEditingPlayer(null); }} 
                  className="px-6 py-2.5 text-stone-500 hover:text-stone-800 font-bold uppercase text-xs tracking-widest transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-8 py-2.5 bg-stone-900 text-white rounded-xl font-bold uppercase text-xs tracking-widest hover:bg-stone-800 transition-all shadow-md"
                >
                  {editingPlayer ? 'Save Changes' : 'Register Player'}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Players Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredPlayers.map(player => {
          const stats = computePlayerStats(player);
          return (
            <motion.div 
              layout
              key={player.id}
              className="bg-white p-6 rounded-3xl border border-stone-200 hover:border-emerald-300 hover:shadow-md transition-all flex flex-col justify-between group"
            >
              <div>
                {/* Card Top: Number/Photo, Name, Position, Edit/Delete */}
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    {player.photoUrl ? (
                      <div 
                        onClick={() => setSelectedPlayerProfile(player)}
                        className="relative w-13 h-13 shrink-0 rounded-2xl overflow-hidden border-2 border-stone-200 group-hover:border-emerald-500 shadow-xs transition-colors cursor-pointer"
                        title="View Full Profile"
                      >
                        <img 
                          src={player.photoUrl} 
                          alt={player.name} 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                          crossOrigin="anonymous" 
                        />
                        {player.number !== undefined && (
                          <span className="absolute -bottom-0.5 -right-0.5 bg-stone-900 text-white font-black text-[9px] px-1.5 py-0.2 rounded-tl-md border-t border-l border-white/40 shadow-xs">
                            #{player.number}
                          </span>
                        )}
                      </div>
                    ) : (
                      <div 
                        onClick={() => setSelectedPlayerProfile(player)}
                        className="w-13 h-13 shrink-0 bg-stone-100 rounded-2xl flex items-center justify-center font-black text-base text-stone-700 group-hover:bg-emerald-50 group-hover:text-emerald-700 transition-colors shadow-xs cursor-pointer"
                        title="View Full Profile"
                      >
                        {player.number !== undefined ? `#${player.number}` : '#'}
                      </div>
                    )}
                    <div>
                      <h3 
                        onClick={() => setSelectedPlayerProfile(player)}
                        className="font-black text-lg text-stone-900 leading-tight group-hover:text-emerald-950 transition-colors cursor-pointer"
                      >
                        {player.name}
                      </h3>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="px-2 py-0.5 bg-stone-100 text-stone-600 rounded-md text-[10px] font-black uppercase tracking-wider">
                          {player.position || 'Unassigned'}
                        </span>
                        {player.preferredFoot && (
                          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-md text-[10px] font-bold">
                            {player.preferredFoot} Foot
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    {canEdit && (
                      <>
                        <button 
                          onClick={() => { setEditingPlayer(player); setIsAdding(false); }}
                          className="p-1.5 text-stone-300 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                          title="Edit Player Details"
                        >
                          <Edit size={16} />
                        </button>
                        <button 
                          onClick={() => handleDeletePlayer(player.id)}
                          className="p-1.5 text-stone-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete Player"
                        >
                          <Trash2 size={16} />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Physical & Occupation Chips */}
                <div className="flex flex-wrap gap-2 text-xs text-stone-600 mb-4 font-medium">
                  {player.age && (
                    <span className="flex items-center gap-1 bg-stone-50 px-2.5 py-1 rounded-lg border border-stone-100 text-[11px]">
                      <span className="font-bold text-stone-400">Age:</span> {player.age} yrs
                    </span>
                  )}
                  {player.height && (
                    <span className="flex items-center gap-1 bg-stone-50 px-2.5 py-1 rounded-lg border border-stone-100 text-[11px]">
                      <Ruler size={12} className="text-stone-400" /> {player.height}
                    </span>
                  )}
                  {player.weight && (
                    <span className="flex items-center gap-1 bg-stone-50 px-2.5 py-1 rounded-lg border border-stone-100 text-[11px]">
                      <Scale size={12} className="text-stone-400" /> {player.weight}
                    </span>
                  )}
                  {player.occupation && (
                    <span className="flex items-center gap-1 bg-stone-50 px-2.5 py-1 rounded-lg border border-stone-100 text-[11px]">
                      <Briefcase size={12} className="text-stone-400" /> {player.occupation}
                    </span>
                  )}
                </div>

                {/* Match Statistics Bar (Live from Matches) */}
                <div className="bg-stone-50/80 p-3 rounded-2xl border border-stone-100 mb-4">
                  <div className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-2 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <BarChart2 size={12} className="text-emerald-600" /> Match Statistics
                    </span>
                    <span className="text-emerald-700 font-bold">{stats.appearances} Apps</span>
                  </div>
                  <div className="grid grid-cols-5 gap-1 text-center">
                    <div className="bg-white py-1.5 px-1 rounded-xl border border-stone-100 shadow-2xs">
                      <div className="text-[10px] text-stone-400 font-bold">⚽ G</div>
                      <div className="font-black text-sm text-stone-800">{stats.goals}</div>
                    </div>
                    <div className="bg-white py-1.5 px-1 rounded-xl border border-stone-100 shadow-2xs">
                      <div className="text-[10px] text-stone-400 font-bold">👟 A</div>
                      <div className="font-black text-sm text-stone-800">{stats.assists}</div>
                    </div>
                    <div className="bg-white py-1.5 px-1 rounded-xl border border-stone-100 shadow-2xs">
                      <div className="text-[10px] text-stone-400 font-bold">🟨 Y</div>
                      <div className="font-black text-sm text-amber-600">{stats.yellowCards}</div>
                    </div>
                    <div className="bg-white py-1.5 px-1 rounded-xl border border-stone-100 shadow-2xs">
                      <div className="text-[10px] text-stone-400 font-bold">🟥 R</div>
                      <div className="font-black text-sm text-red-600">{stats.redCards}</div>
                    </div>
                    <div className="bg-white py-1.5 px-1 rounded-xl border border-stone-100 shadow-2xs">
                      <div className="text-[10px] text-stone-400 font-bold">🏆 M</div>
                      <div className="font-black text-sm text-amber-700">{stats.motmCount}</div>
                    </div>
                  </div>
                </div>

                {/* Coach Insight Preview */}
                {player.coachInsights && (
                  <div className="mb-4 bg-emerald-50/60 p-3 rounded-2xl border border-emerald-100 text-xs text-emerald-950 font-medium line-clamp-2">
                    <span className="font-bold text-emerald-800 uppercase tracking-widest text-[9px] block mb-0.5">Coach Note:</span>
                    "{player.coachInsights}"
                  </div>
                )}
              </div>

              {/* Card Footer: Phone and View Full Profile Button */}
              <div className="pt-3 border-t border-stone-100 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-stone-500 text-xs font-semibold">
                  <Phone size={13} className="text-stone-400" />
                  <a href={`tel:${player.phone}`} className="hover:text-emerald-600 transition-colors">
                    {player.phone}
                  </a>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedPlayerProfile(player);
                    setProfileCategory('stats');
                  }}
                  className="flex items-center gap-1 text-xs font-black uppercase tracking-wider text-emerald-700 hover:text-emerald-800 px-3 py-1.5 rounded-xl hover:bg-emerald-50 transition-colors"
                >
                  <span>Full Profile</span>
                  <ChevronRight size={14} />
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>

      {filteredPlayers.length === 0 && (
        <div className="text-center py-16 bg-stone-50 rounded-3xl border border-stone-200">
          <Users size={40} className="mx-auto text-stone-300 mb-3" />
          <h4 className="font-black text-stone-700 text-base">No Players Found</h4>
          <p className="text-xs text-stone-400 mt-1 max-w-sm mx-auto">
            {searchQuery || positionFilter !== 'ALL' ? 'No players match your search filters.' : 'Register squad members to track personal info, physical attributes, and match performance.'}
          </p>
        </div>
      )}

      {/* Comprehensive Categorized Player Profile Modal */}
      <AnimatePresence>
        {selectedPlayerProfile && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-3xl max-h-[90vh] rounded-3xl border border-stone-200 shadow-2xl overflow-hidden flex flex-col"
            >
              {/* Profile Modal Header */}
              <div className="bg-stone-900 text-white p-6 relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  {selectedPlayerProfile.photoUrl ? (
                    <div className="relative w-18 h-18 shrink-0 rounded-2xl overflow-hidden border-2 border-emerald-500 shadow-lg shadow-emerald-950/40">
                      <img 
                        src={selectedPlayerProfile.photoUrl} 
                        alt={selectedPlayerProfile.name} 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                        crossOrigin="anonymous" 
                      />
                      {selectedPlayerProfile.number !== undefined && (
                        <span className="absolute -bottom-0.5 -right-0.5 bg-emerald-600 text-white font-black text-xs px-2 py-0.5 rounded-tl-lg border-t border-l border-emerald-400/50 shadow-xs">
                          #{selectedPlayerProfile.number}
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="w-18 h-18 shrink-0 bg-emerald-600 rounded-2xl flex items-center justify-center text-2xl font-black text-white shadow-lg shadow-emerald-600/30">
                      {selectedPlayerProfile.number !== undefined ? `#${selectedPlayerProfile.number}` : '#'}
                    </div>
                  )}
                  <div>
                    <h3 className="text-2xl font-black italic uppercase tracking-tight">{selectedPlayerProfile.name}</h3>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <span className="px-2.5 py-0.5 bg-white/10 rounded-md text-xs font-bold uppercase tracking-wider text-stone-300">
                        {selectedPlayerProfile.position || 'Player'}
                      </span>
                      {selectedPlayerProfile.preferredFoot && (
                        <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 rounded-md text-xs font-bold">
                          {selectedPlayerProfile.preferredFoot} Foot
                        </span>
                      )}
                      {selectedPlayerProfile.age && (
                        <span className="text-xs text-stone-400 font-medium">
                          • {selectedPlayerProfile.age} years old
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  {canEdit && (
                    <button
                      onClick={() => {
                        setEditingPlayer(selectedPlayerProfile);
                        setSelectedPlayerProfile(null);
                      }}
                      className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5"
                    >
                      <Edit size={14} />
                      <span>Edit & Photo</span>
                    </button>
                  )}
                  <button
                    onClick={() => setSelectedPlayerProfile(null)}
                    className="p-2 bg-white/10 hover:bg-white/20 rounded-xl text-stone-300 hover:text-white transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Information Category Navigation Tabs */}
              <div className="flex border-b border-stone-200 bg-stone-50 px-6 pt-3 gap-2 overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setProfileCategory('stats')}
                  className={`px-4 py-2.5 font-black text-xs uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
                    profileCategory === 'stats'
                      ? 'border-emerald-600 text-emerald-800 bg-white rounded-t-xl'
                      : 'border-transparent text-stone-500 hover:text-stone-800'
                  }`}
                >
                  <BarChart2 size={16} />
                  <span>Match Statistics & Highlights</span>
                </button>

                <button
                  type="button"
                  onClick={() => setProfileCategory('bio')}
                  className={`px-4 py-2.5 font-black text-xs uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
                    profileCategory === 'bio'
                      ? 'border-emerald-600 text-emerald-800 bg-white rounded-t-xl'
                      : 'border-transparent text-stone-500 hover:text-stone-800'
                  }`}
                >
                  <User size={16} />
                  <span>Bio & Physical Profile</span>
                </button>

                <button
                  type="button"
                  onClick={() => setProfileCategory('coach')}
                  className={`px-4 py-2.5 font-black text-xs uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
                    profileCategory === 'coach'
                      ? 'border-emerald-600 text-emerald-800 bg-white rounded-t-xl'
                      : 'border-transparent text-stone-500 hover:text-stone-800'
                  }`}
                >
                  <MessageSquareQuote size={16} />
                  <span>Coach Insights & Notes</span>
                </button>
              </div>

              {/* Modal Category Content Body */}
              <div className="p-6 overflow-y-auto flex-1 space-y-6">
                {/* CATEGORY 1: MATCH STATISTICS & HIGHLIGHTS */}
                {profileCategory === 'stats' && (() => {
                  const stats = computePlayerStats(selectedPlayerProfile);
                  return (
                    <div className="space-y-6">
                      {/* Overall Stats Numbers */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                        <div className="bg-stone-50 p-3.5 rounded-2xl border border-stone-100 text-center">
                          <p className="text-[10px] font-black uppercase tracking-widest text-stone-400">Matches</p>
                          <p className="text-2xl font-black text-stone-900 mt-0.5">{stats.appearances}</p>
                        </div>
                        <div className="bg-emerald-50 p-3.5 rounded-2xl border border-emerald-100 text-center">
                          <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Goals</p>
                          <p className="text-2xl font-black text-emerald-900 mt-0.5">{stats.goals}</p>
                        </div>
                        <div className="bg-sky-50 p-3.5 rounded-2xl border border-sky-100 text-center">
                          <p className="text-[10px] font-black uppercase tracking-widest text-sky-700">Assists</p>
                          <p className="text-2xl font-black text-sky-900 mt-0.5">{stats.assists}</p>
                        </div>
                        <div className="bg-amber-50 p-3.5 rounded-2xl border border-amber-100 text-center">
                          <p className="text-[10px] font-black uppercase tracking-widest text-amber-700">Yellows</p>
                          <p className="text-2xl font-black text-amber-900 mt-0.5">{stats.yellowCards}</p>
                        </div>
                        <div className="bg-red-50 p-3.5 rounded-2xl border border-red-100 text-center">
                          <p className="text-[10px] font-black uppercase tracking-widest text-red-700">Reds</p>
                          <p className="text-2xl font-black text-red-900 mt-0.5">{stats.redCards}</p>
                        </div>
                        <div className="bg-amber-50 p-3.5 rounded-2xl border border-amber-200 text-center">
                          <p className="text-[10px] font-black uppercase tracking-widest text-amber-700">MOTM</p>
                          <p className="text-2xl font-black text-amber-900 mt-0.5">{stats.motmCount}</p>
                        </div>
                      </div>

                      {/* Goal Contributions Summary */}
                      <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100 flex items-center justify-between">
                        <div>
                          <p className="text-xs font-black uppercase tracking-widest text-emerald-800">Total Goal Contributions (G + A)</p>
                          <p className="text-xs text-stone-500 mt-0.5">Direct goals created or converted across matches</p>
                        </div>
                        <span className="text-2xl font-black text-emerald-800">{stats.goalContributions}</span>
                      </div>

                      {/* Match Highlights Log */}
                      <div className="space-y-3">
                        <h4 className="text-xs font-black uppercase tracking-widest text-stone-700 flex items-center gap-2">
                          <Activity size={16} className="text-emerald-600" />
                          <span>Match Events & Highlights History</span>
                        </h4>

                        {stats.eventLogs.length > 0 ? (
                          <div className="space-y-2">
                            {stats.eventLogs.map((ev, idx) => (
                              <div 
                                key={`${ev.matchId}-${idx}`} 
                                className="flex items-center justify-between p-3 rounded-2xl bg-stone-50 border border-stone-200 hover:border-emerald-200 transition-colors"
                              >
                                <div className="flex items-center gap-3">
                                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
                                    ev.type === 'goal' ? 'bg-emerald-100 text-emerald-800' :
                                    ev.type === 'assist' ? 'bg-sky-100 text-sky-800' :
                                    ev.type === 'yellow' ? 'bg-amber-100 text-amber-800' :
                                    ev.type === 'red' ? 'bg-red-100 text-red-800' :
                                    'bg-amber-100 text-amber-800'
                                  }`}>
                                    {ev.type === 'goal' ? '⚽' : ev.type === 'assist' ? '👟' : ev.type === 'yellow' ? '🟨' : ev.type === 'red' ? '🟥' : '🏆'}
                                  </div>
                                  <div>
                                    <p className="font-bold text-sm text-stone-900">{ev.label}</p>
                                    <p className="text-xs text-stone-500 font-medium">
                                      vs {ev.opponent} {ev.score ? `(${ev.score})` : ''} {ev.details ? `• ${ev.details}` : ''}
                                    </p>
                                  </div>
                                </div>
                                {ev.minute && (
                                  <span className="text-xs font-black text-stone-400 bg-white px-2.5 py-1 rounded-lg border border-stone-200">
                                    {ev.minute}'
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="p-8 text-center bg-stone-50 rounded-2xl border border-dashed border-stone-200 text-stone-400 text-xs">
                            No match events recorded yet for this player. Log goals, assists, or cards in Match Statistics & Highlights.
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* CATEGORY 2: BIO & PHYSICAL PROFILE */}
                {profileCategory === 'bio' && (
                  <div className="space-y-6">
                    {selectedPlayerProfile.photoUrl && (
                      <div className="flex items-center gap-4 p-4 bg-emerald-50/60 rounded-2xl border border-emerald-200">
                        <img 
                          src={selectedPlayerProfile.photoUrl} 
                          alt={selectedPlayerProfile.name}
                          className="w-16 h-16 rounded-xl object-cover border-2 border-emerald-500 shadow-sm shrink-0"
                          referrerPolicy="no-referrer"
                          crossOrigin="anonymous"
                        />
                        <div>
                          <p className="text-xs font-black uppercase tracking-widest text-emerald-800">Squad Profile Photo</p>
                          <p className="text-xs text-stone-600 font-medium mt-0.5">
                            Official player picture synced across match lineups and tactical sheets.
                          </p>
                        </div>
                      </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="bg-stone-50 p-4 rounded-2xl border border-stone-100 space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-widest text-stone-400">Position</p>
                        <p className="font-bold text-stone-900 text-base">{selectedPlayerProfile.position || 'Not specified'}</p>
                      </div>

                      <div className="bg-stone-50 p-4 rounded-2xl border border-stone-100 space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-widest text-stone-400">Jersey Number</p>
                        <p className="font-bold text-stone-900 text-base">
                          {selectedPlayerProfile.number !== undefined ? `#${selectedPlayerProfile.number}` : 'Unassigned'}
                        </p>
                      </div>

                      <div className="bg-stone-50 p-4 rounded-2xl border border-stone-100 space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-widest text-stone-400">Age</p>
                        <p className="font-bold text-stone-900 text-base">
                          {selectedPlayerProfile.age ? `${selectedPlayerProfile.age} years old` : 'Not specified'}
                        </p>
                      </div>

                      <div className="bg-stone-50 p-4 rounded-2xl border border-stone-100 space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-widest text-stone-400">Preferred Foot</p>
                        <p className="font-bold text-stone-900 text-base">{selectedPlayerProfile.preferredFoot || 'Right'}</p>
                      </div>

                      <div className="bg-stone-50 p-4 rounded-2xl border border-stone-100 space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-widest text-stone-400">Height</p>
                        <p className="font-bold text-stone-900 text-base">{selectedPlayerProfile.height || 'Not specified'}</p>
                      </div>

                      <div className="bg-stone-50 p-4 rounded-2xl border border-stone-100 space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-widest text-stone-400">Weight</p>
                        <p className="font-bold text-stone-900 text-base">{selectedPlayerProfile.weight || 'Not specified'}</p>
                      </div>

                      <div className="bg-stone-50 p-4 rounded-2xl border border-stone-100 space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-widest text-stone-400">Occupation / Career</p>
                        <p className="font-bold text-stone-900 text-base">{selectedPlayerProfile.occupation || 'Not specified'}</p>
                      </div>

                      <div className="bg-stone-50 p-4 rounded-2xl border border-stone-100 space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-widest text-stone-400">Contact Phone</p>
                        <a href={`tel:${selectedPlayerProfile.phone}`} className="font-bold text-emerald-600 hover:underline text-base block">
                          {selectedPlayerProfile.phone}
                        </a>
                      </div>
                    </div>
                  </div>
                )}

                {/* CATEGORY 3: COACH INSIGHTS & TACTICAL NOTES */}
                {profileCategory === 'coach' && (
                  <div className="space-y-4">
                    <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-200">
                      <div className="flex items-center gap-2 mb-3">
                        <MessageSquareQuote size={20} className="text-emerald-700" />
                        <h4 className="font-black text-emerald-950 uppercase tracking-wider text-sm">
                          Coach Evaluation & Tactical Directives
                        </h4>
                      </div>
                      {selectedPlayerProfile.coachInsights ? (
                        <p className="text-emerald-950 text-sm leading-relaxed whitespace-pre-wrap font-medium">
                          {selectedPlayerProfile.coachInsights}
                        </p>
                      ) : (
                        <p className="text-emerald-800/70 text-xs italic">
                          No specific coach insights recorded yet for this player. Coaches and admins can add tactical notes, set-piece roles, and improvement focus areas by clicking Edit.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// --- Practices View ---
function PracticesView({ teamId, role }: { teamId: string, role: string }) {
  const [practices, setPractices] = useState<Practice[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [drillLibrary, setDrillLibrary] = useState<DrillLibraryItem[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingPractice, setEditingPractice] = useState<Practice | null>(null);
  const [newPractice, setNewPractice] = useState<Partial<Practice>>({ 
    title: '', 
    description: '', 
    date: '',
    warmup: [],
    mainBody: [],
    finalGame: [],
    coolDown: [],
    attendees: []
  });

  const canEdit = role === 'admin' || role === 'coach';
  const practiceRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    if (!teamId) return;
    const q = query(collection(db, 'practices'), where('teamId', '==', teamId), orderBy('date', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPractices(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Practice)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'practices'));

    const pQ = query(collection(db, 'players'), where('teamId', '==', teamId), orderBy('name'));
    const pUnsubscribe = onSnapshot(pQ, (snapshot) => {
      setPlayers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Player)));
    });

    const dQ = query(collection(db, 'drills'), orderBy('title'));
    const dUnsubscribe = onSnapshot(dQ, (snapshot) => {
      setDrillLibrary(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DrillLibraryItem)));
    });

    return () => { unsubscribe(); pUnsubscribe(); dUnsubscribe(); };
  }, [teamId]);

  const handleAddPractice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPractice.title || !newPractice.date || !teamId) return;
    try {
      const practiceData = {
        ...newPractice,
        teamId,
        date: Timestamp.fromDate(new Date(newPractice.date as string)),
        attendees: []
      };
      await addDoc(collection(db, 'practices'), practiceData);
      setNewPractice({ title: '', description: '', date: '', warmup: [], mainBody: [], finalGame: [], coolDown: [], attendees: [] });
      setIsAdding(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'practices');
    }
  };

  const handleUpdatePractice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPractice || !editingPractice.title || !editingPractice.date) return;
    try {
      const { id, ...data } = editingPractice;
      const practiceData = {
        ...data,
        date: typeof data.date === 'string' ? Timestamp.fromDate(new Date(data.date)) : data.date
      };
      await updateDoc(doc(db, 'practices', id), practiceData);
      setEditingPractice(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `practices/${editingPractice.id}`);
    }
  };

  const handleDeletePractice = async (id: string) => {
    if (!confirm("Delete this practice session?")) return;
    try {
      await deleteDoc(doc(db, 'practices', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `practices/${id}`);
    }
  };

  const togglePracticeAttendance = async (practiceId: string, playerId: string, currentAttendees: string[]) => {
    const newAttendees = (currentAttendees || []).includes(playerId)
      ? currentAttendees.filter(id => id !== playerId)
      : [...(currentAttendees || []), playerId];
    
    try {
      await updateDoc(doc(db, 'practices', practiceId), { attendees: newAttendees });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `practices/${practiceId}`);
    }
  };

  const updatePracticePhoto = async (practiceId: string, url: string) => {
    try {
      await updateDoc(doc(db, 'practices', practiceId), { squadPhotoUrl: url });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `practices/${practiceId}`);
    }
  };

  const addDrill = (phase: 'warmup' | 'mainBody' | 'finalGame' | 'coolDown') => {
    const target = editingPractice || newPractice;
    const setter = editingPractice ? setEditingPractice : setNewPractice;
    setter({
      ...target,
      [phase]: [...(target[phase] as Drill[] || []), { title: '', description: '', imageUrl: '' }]
    } as any);
  };

  const addDrillFromLibrary = (phase: 'warmup' | 'mainBody' | 'finalGame' | 'coolDown', drill: DrillLibraryItem) => {
    const target = editingPractice || newPractice;
    const setter = editingPractice ? setEditingPractice : setNewPractice;
    setter({
      ...target,
      [phase]: [...(target[phase] as Drill[] || []), { title: drill.title, description: drill.description, imageUrl: drill.imageUrl }]
    } as any);
  };

  const updateDrill = (phase: 'warmup' | 'mainBody' | 'finalGame' | 'coolDown', index: number, field: keyof Drill, value: string) => {
    const target = editingPractice || newPractice;
    const setter = editingPractice ? setEditingPractice : setNewPractice;
    const updatedDrills = [...(target[phase] as Drill[] || [])];
    updatedDrills[index] = { ...updatedDrills[index], [field]: value };
    setter({ ...target, [phase]: updatedDrills } as any);
  };

  const removeDrill = (phase: 'warmup' | 'mainBody' | 'finalGame' | 'coolDown', index: number) => {
    const target = editingPractice || newPractice;
    const setter = editingPractice ? setEditingPractice : setNewPractice;
    setter({
      ...target,
      [phase]: (target[phase] as Drill[] || []).filter((_, i) => i !== index)
    } as any);
  };

  const [isDownloading, setIsDownloading] = useState<string | null>(null);
  const [activeModalImage, setActiveModalImage] = useState<{ src: string; title?: string } | null>(null);

  const downloadPracticePDF = async (practice: Practice) => {
    if (isDownloading) return;
    setIsDownloading(practice.id);

    const pdfContainer = document.createElement('div');
    Object.assign(pdfContainer.style, {
      position: 'absolute',
      left: '-9999px',
      top: '0',
      width: '800px',
      backgroundColor: '#ffffff',
      color: '#1c1917',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      padding: '40px',
      boxSizing: 'border-box'
    });

    const getImageDataUrl = async (url: string): Promise<string | null> => {
      if (!url) return null;
      if (url.startsWith('data:')) return url;

      const fetchPromise = async (): Promise<string | null> => {
        try {
          const res = await fetch(url, { mode: 'cors' });
          if (!res.ok) throw new Error();
          const blob = await res.blob();
          return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(blob);
          });
        } catch (e) {
          try {
            const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
            const res = await fetch(proxyUrl);
            if (!res.ok) throw new Error();
            const blob = await res.blob();
            return new Promise((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.onerror = () => resolve(null);
              reader.readAsDataURL(blob);
            });
          } catch (err) {
            return null;
          }
        }
      };

      const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 2500));
      return Promise.race([fetchPromise(), timeoutPromise]);
    };

    const processDrills = async (drills: Drill[] = []) => {
      const results = [];
      for (const d of drills) {
        let dataUrl = null;
        if (d.imageUrl) {
          dataUrl = await getImageDataUrl(d.imageUrl);
        }
        results.push({
          ...d,
          imageDataUrl: dataUrl || (d.imageUrl ? DEFAULT_DRILL_SVG : null)
        });
      }
      return results;
    };

    try {
      const warmup = await processDrills(practice.warmup);
      const mainBody = await processDrills(practice.mainBody);
      const finalGame = await processDrills(practice.finalGame);
      const coolDown = await processDrills(practice.coolDown);
      const squadPhotoDataUrl = practice.squadPhotoUrl ? await getImageDataUrl(practice.squadPhotoUrl) : null;

      let dateStr = '';
      if (practice.date) {
        try {
          dateStr = (practice.date as Timestamp).toDate
            ? (practice.date as Timestamp).toDate().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })
            : String(practice.date);
        } catch (e) {
          dateStr = String(practice.date);
        }
      }

      pdfContainer.innerHTML = `
        <div style="border-bottom: 4px solid #059669; padding-bottom: 20px; margin-bottom: 24px;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div>
              <span style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; color: #059669; display: block; margin-bottom: 6px;">PRACTICE SESSION PLAN</span>
              <h1 style="font-size: 30px; font-weight: 900; text-transform: uppercase; font-style: italic; margin: 0; color: #1c1917;">${practice.title || 'Training Session'}</h1>
              <p style="font-size: 13px; font-weight: 600; color: #78716c; margin: 6px 0 0 0;">📅 ${dateStr}</p>
            </div>
            <div style="background-color: #ecfdf5; border: 1px solid #a7f3d0; padding: 10px 16px; border-radius: 12px; text-align: right;">
              <span style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: #047857; display: block;">Squad Goals</span>
              <span style="font-size: 12px; font-weight: 700; color: #065f46;">Official Session</span>
            </div>
          </div>
          ${practice.description ? `
            <div style="margin-top: 16px; padding: 14px; background-color: #f5f5f4; border-radius: 12px; border-left: 4px solid #059669;">
              <h4 style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: #78716c; margin: 0 0 4px 0;">Session Overview</h4>
              <p style="font-size: 13px; color: #44403c; margin: 0; line-height: 1.4;">${practice.description}</p>
            </div>
          ` : ''}
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px;">
          <div style="background: #ffffff; border: 1px solid #e7e5e4; border-radius: 16px; padding: 16px;">
            <h3 style="font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 1.5px; color: #059669; margin: 0 0 12px 0; border-bottom: 2px solid #ecfdf5; padding-bottom: 6px;">1. WARMUP</h3>
            ${warmup.length === 0 ? '<p style="font-size: 11px; color: #a8a29e; font-style: italic;">No drills assigned</p>' : ''}
            ${warmup.map(d => `
              <div style="margin-bottom: 12px; padding: 10px; background-color: #f5f5f4; border-radius: 10px; display: flex; gap: 10px; align-items: flex-start;">
                ${d.imageDataUrl ? `<img src="${d.imageDataUrl}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 8px; flex-shrink: 0;" />` : ''}
                <div>
                  <h4 style="font-size: 13px; font-weight: 800; margin: 0 0 3px 0; color: #1c1917;">${d.title}</h4>
                  <p style="font-size: 11px; color: #57534e; margin: 0; line-height: 1.3;">${d.description || ''}</p>
                </div>
              </div>
            `).join('')}
          </div>

          <div style="background: #ffffff; border: 1px solid #e7e5e4; border-radius: 16px; padding: 16px;">
            <h3 style="font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 1.5px; color: #059669; margin: 0 0 12px 0; border-bottom: 2px solid #ecfdf5; padding-bottom: 6px;">2. MAIN BODY</h3>
            ${mainBody.length === 0 ? '<p style="font-size: 11px; color: #a8a29e; font-style: italic;">No drills assigned</p>' : ''}
            ${mainBody.map(d => `
              <div style="margin-bottom: 12px; padding: 10px; background-color: #f5f5f4; border-radius: 10px; display: flex; gap: 10px; align-items: flex-start;">
                ${d.imageDataUrl ? `<img src="${d.imageDataUrl}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 8px; flex-shrink: 0;" />` : ''}
                <div>
                  <h4 style="font-size: 13px; font-weight: 800; margin: 0 0 3px 0; color: #1c1917;">${d.title}</h4>
                  <p style="font-size: 11px; color: #57534e; margin: 0; line-height: 1.3;">${d.description || ''}</p>
                </div>
              </div>
            `).join('')}
          </div>

          <div style="background: #ffffff; border: 1px solid #e7e5e4; border-radius: 16px; padding: 16px;">
            <h3 style="font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 1.5px; color: #059669; margin: 0 0 12px 0; border-bottom: 2px solid #ecfdf5; padding-bottom: 6px;">3. FINAL GAME</h3>
            ${finalGame.length === 0 ? '<p style="font-size: 11px; color: #a8a29e; font-style: italic;">No drills assigned</p>' : ''}
            ${finalGame.map(d => `
              <div style="margin-bottom: 12px; padding: 10px; background-color: #f5f5f4; border-radius: 10px; display: flex; gap: 10px; align-items: flex-start;">
                ${d.imageDataUrl ? `<img src="${d.imageDataUrl}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 8px; flex-shrink: 0;" />` : ''}
                <div>
                  <h4 style="font-size: 13px; font-weight: 800; margin: 0 0 3px 0; color: #1c1917;">${d.title}</h4>
                  <p style="font-size: 11px; color: #57534e; margin: 0; line-height: 1.3;">${d.description || ''}</p>
                </div>
              </div>
            `).join('')}
          </div>

          <div style="background: #ffffff; border: 1px solid #e7e5e4; border-radius: 16px; padding: 16px;">
            <h3 style="font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 1.5px; color: #059669; margin: 0 0 12px 0; border-bottom: 2px solid #ecfdf5; padding-bottom: 6px;">4. COOL DOWN</h3>
            ${coolDown.length === 0 ? '<p style="font-size: 11px; color: #a8a29e; font-style: italic;">No drills assigned</p>' : ''}
            ${coolDown.map(d => `
              <div style="margin-bottom: 12px; padding: 10px; background-color: #f5f5f4; border-radius: 10px; display: flex; gap: 10px; align-items: flex-start;">
                ${d.imageDataUrl ? `<img src="${d.imageDataUrl}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 8px; flex-shrink: 0;" />` : ''}
                <div>
                  <h4 style="font-size: 13px; font-weight: 800; margin: 0 0 3px 0; color: #1c1917;">${d.title}</h4>
                  <p style="font-size: 11px; color: #57534e; margin: 0; line-height: 1.3;">${d.description || ''}</p>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <div style="background-color: #f5f5f4; border: 1px solid #e7e5e4; border-radius: 16px; padding: 16px;">
          <h3 style="font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 1.5px; color: #78716c; margin: 0 0 10px 0;">SQUAD ATTENDANCE (${practice.attendees?.length || 0}/${players.length} PLAYERS)</h3>
          <div style="display: flex; flex-wrap: wrap; gap: 6px;">
            ${players.map(p => {
              const isAttending = (practice.attendees || []).includes(p.id);
              return `
                <span style="font-size: 10px; font-weight: 700; padding: 4px 10px; border-radius: 6px; ${isAttending ? 'background-color: #059669; color: #ffffff;' : 'background-color: #e7e5e4; color: #a8a29e;'}">
                  ${isAttending ? '✓ ' : ''}${p.name}
                </span>
              `;
            }).join('')}
          </div>
          ${squadPhotoDataUrl ? `
            <div style="margin-top: 14px; text-align: center;">
              <h4 style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: #78716c; margin-bottom: 6px;">Matchday Squad Photo</h4>
              <img src="${squadPhotoDataUrl}" style="max-width: 100%; max-height: 220px; border-radius: 10px; border: 2px solid #e7e5e4;" />
            </div>
          ` : ''}
        </div>
      `;

      document.body.appendChild(pdfContainer);

      const canvas = await html2canvas(pdfContainer, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      let heightLeft = pdfHeight;
      let position = 0;
      const pageHeight = pdf.internal.pageSize.getHeight();

      pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, pdfHeight);
        heightLeft -= pageHeight;
      }

      const cleanTitle = (practice.title || 'Session').replace(/[^a-zA-Z0-9_-]/g, '_');
      pdf.save(`Practice_${cleanTitle}.pdf`);
    } catch (err) {
      console.error('PDF Generation failed:', err);
      alert('Failed to generate session PDF. Please try again.');
    } finally {
      if (document.body.contains(pdfContainer)) {
        document.body.removeChild(pdfContainer);
      }
      setIsDownloading(null);
    }
  };

  const DrillSection = ({ phase, title }: { phase: 'warmup' | 'mainBody' | 'finalGame' | 'coolDown', title: string }) => {
    const target = editingPractice || newPractice;
    const drills = target[phase] as Drill[] || [];

    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h4 className="font-bold text-xs uppercase tracking-widest text-stone-400">{title}</h4>
          <div className="flex gap-2">
            <select 
              className="text-[10px] px-2 py-1 rounded border border-stone-200 bg-white font-bold uppercase tracking-widest text-emerald-600 cursor-pointer"
              onChange={(e) => {
                const drill = drillLibrary.find(d => d.id === e.target.value);
                if (drill) addDrillFromLibrary(phase, drill);
                e.target.value = '';
              }}
            >
              <option value="">Library...</option>
              {drillLibrary.map(d => (
                <option key={d.id} value={d.id}>{d.title}</option>
              ))}
            </select>
            <button type="button" onClick={() => addDrill(phase)} className="text-emerald-600 font-bold text-xs uppercase tracking-widest flex items-center gap-1 hover:text-emerald-700">
              <Plus size={14} /> New
            </button>
          </div>
        </div>
        <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
          {drills.map((drill, index) => (
            <div key={index} className="p-4 bg-stone-50 rounded-xl border border-stone-200 space-y-3 relative group/item">
              <button 
                type="button" 
                onClick={() => removeDrill(phase, index)}
                className="absolute top-2 right-2 text-stone-300 hover:text-red-500 transition-colors p-1"
                title="Remove drill"
              >
                <X size={16} />
              </button>
              <input 
                placeholder="Drill Title"
                className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-bold"
                value={drill.title}
                onChange={e => updateDrill(phase, index, 'title', e.target.value)}
              />
              <textarea 
                placeholder="Drill Description"
                rows={2}
                className="w-full px-3 py-2 text-xs rounded-lg border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                value={drill.description}
                onChange={e => updateDrill(phase, index, 'description', e.target.value)}
              />
              
              {/* Image Options */}
              <div className="space-y-2">
                <div className="flex gap-2 items-center">
                  <input 
                    placeholder="Image URL (optional)"
                    className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    value={drill.imageUrl || ''}
                    onChange={e => updateDrill(phase, index, 'imageUrl', e.target.value)}
                  />
                  <label className="cursor-pointer bg-stone-200 hover:bg-stone-300 text-stone-700 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors">
                    <Upload size={12} />
                    <span>Upload</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = ev => updateDrill(phase, index, 'imageUrl', ev.target?.result as string);
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Preset:</span>
                  <select 
                    className="flex-1 text-[11px] px-2 py-1 rounded border border-stone-200 bg-white font-medium"
                    value=""
                    onChange={e => {
                      if (e.target.value) updateDrill(phase, index, 'imageUrl', e.target.value);
                    }}
                  >
                    <option value="">Select a preset diagram...</option>
                    {PRESET_DRILL_IMAGES.map((p, i) => (
                      <option key={i} value={p.url}>{p.name}</option>
                    ))}
                  </select>
                </div>

                {drill.imageUrl && (
                  <div className="relative mt-2 rounded-lg overflow-hidden border border-stone-200 bg-stone-200">
                    <SafeImage 
                      src={drill.imageUrl} 
                      alt={drill.title} 
                      className="w-full h-24 object-cover" 
                      onClick={() => setActiveModalImage({ src: drill.imageUrl!, title: drill.title })}
                    />
                  </div>
                )}
              </div>
            </div>
          ))}
          {drills.length === 0 && (
            <p className="text-stone-400 text-xs italic text-center py-4 bg-stone-50 rounded-xl border border-dashed border-stone-200">No drills added to this phase yet</p>
          )}
        </div>
      </div>
    );
  };

  const PracticePhase = ({ title, drills }: { title: string, drills: Drill[] }) => (
    <div className="space-y-4">
      <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400">{title}</h4>
      <div className="space-y-3">
        {drills?.map((drill, idx) => (
          <div key={idx} className="flex gap-4 p-4 bg-stone-50 rounded-2xl border border-stone-100 group/drill transition-all hover:bg-white hover:shadow-md">
            <SafeImage 
              src={drill.imageUrl} 
              alt={drill.title} 
              containerClassName="w-20 h-20 flex-shrink-0 rounded-xl shadow-sm bg-stone-200 overflow-hidden border border-stone-200"
              className="w-full h-full object-cover"
              onClick={drill.imageUrl ? () => setActiveModalImage({ src: drill.imageUrl!, title: drill.title }) : undefined}
            />
            <div className="flex-1">
              <h5 className="font-bold text-stone-900 mb-1">{drill.title || 'Untitled Drill'}</h5>
              <p className="text-stone-500 text-xs leading-relaxed">{drill.description || 'No description provided.'}</p>
            </div>
          </div>
        ))}
        {(!drills || drills.length === 0) && (
          <p className="text-stone-400 text-[10px] italic py-2">No drills scheduled for this phase</p>
        )}
      </div>
    </div>
  );

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }}
      className="space-y-8"
    >
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-black tracking-tight uppercase italic mb-1">Practices</h2>
          <p className="text-stone-500 font-medium">Training Sessions & Drills</p>
        </div>
        {canEdit && (
          <button 
            onClick={() => { setIsAdding(true); setEditingPractice(null); }}
            className="bg-emerald-600 text-white p-3 rounded-xl shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition-colors"
          >
            <Plus size={24} />
          </button>
        )}
      </div>

      <AnimatePresence>
        {(isAdding || editingPractice) && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <form onSubmit={editingPractice ? handleUpdatePractice : handleAddPractice} className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-6">
              <h3 className="font-bold text-lg">{editingPractice ? 'Edit Practice Session' : 'Add New Practice Session'}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="space-y-4">
                    <input 
                      placeholder="Session Title"
                      className="w-full px-4 py-3 rounded-xl bg-stone-50 border border-stone-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-bold"
                      value={editingPractice ? editingPractice.title : newPractice.title}
                      onChange={e => editingPractice ? setEditingPractice({...editingPractice, title: e.target.value}) : setNewPractice({...newPractice, title: e.target.value})}
                      required
                    />
                    <input 
                      type="datetime-local"
                      className="w-full px-4 py-3 rounded-xl bg-stone-50 border border-stone-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      value={editingPractice ? (typeof editingPractice.date === 'string' ? editingPractice.date : (editingPractice.date as Timestamp).toDate().toISOString().slice(0, 16)) : newPractice.date as string}
                      onChange={e => editingPractice ? setEditingPractice({...editingPractice, date: e.target.value}) : setNewPractice({...newPractice, date: e.target.value})}
                      required
                    />
                    <textarea 
                      placeholder="General Description"
                      rows={3}
                      className="w-full px-4 py-3 rounded-xl bg-stone-50 border border-stone-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      value={editingPractice ? editingPractice.description : newPractice.description}
                      onChange={e => editingPractice ? setEditingPractice({...editingPractice, description: e.target.value}) : setNewPractice({...newPractice, description: e.target.value})}
                    />
                  </div>
                  
                  <DrillSection phase="warmup" title="1. Warmup" />
                  <DrillSection phase="coolDown" title="4. Cool Down" />
                </div>

                <div className="space-y-6">
                  <DrillSection phase="mainBody" title="2. Main Body" />
                  <DrillSection phase="finalGame" title="3. Final Game" />
                </div>
              </div>
              <div className="flex gap-3 justify-end pt-4 border-t border-stone-100">
                <button type="button" onClick={() => { setIsAdding(false); setEditingPractice(null); }} className="px-6 py-2 text-stone-500 font-bold uppercase text-xs tracking-widest">Cancel</button>
                <button type="submit" className="px-6 py-2 bg-stone-900 text-white rounded-lg font-bold uppercase text-xs tracking-widest hover:bg-stone-800 transition-colors">
                  {editingPractice ? 'Update Session' : 'Add Session'}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-12">
        {practices.map(practice => (
          <div key={practice.id} className="relative group">
            <div className="absolute -left-4 top-0 bottom-0 w-1 bg-stone-200 group-hover:bg-emerald-500 transition-colors rounded-full" />
            
            <div className="flex justify-between items-start mb-6">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <Calendar size={18} className="text-emerald-600" />
                  <span className="text-stone-400 font-bold text-xs uppercase tracking-widest">
                    {(practice.date as Timestamp).toDate().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <h3 className="text-3xl font-black italic uppercase tracking-tight">{practice.title}</h3>
              </div>
              <div className="flex gap-2">
                {canEdit && (
                  <>
                    <button 
                      onClick={() => downloadPracticePDF(practice)}
                      disabled={!!isDownloading}
                      className={`p-2.5 bg-white border border-stone-200 rounded-xl transition-all shadow-sm ${isDownloading === practice.id ? 'text-emerald-600 bg-emerald-50 border-emerald-300' : 'text-stone-500 hover:text-emerald-600 hover:border-emerald-200'}`}
                      title="Download Session PDF"
                    >
                      {isDownloading === practice.id ? <Loader2 size={20} className="animate-spin" /> : <Download size={20} />}
                    </button>
                    <button 
                      onClick={() => setEditingPractice(practice)}
                      className="p-2.5 bg-white border border-stone-200 rounded-xl text-stone-500 hover:text-emerald-600 hover:border-emerald-200 transition-all shadow-sm"
                      title="Edit Practice"
                    >
                      <Edit size={20} />
                    </button>
                    <button 
                      onClick={() => handleDeletePractice(practice.id)}
                      className="p-2.5 bg-white border border-stone-200 rounded-xl text-stone-500 hover:text-red-600 hover:border-red-200 transition-all shadow-sm"
                      title="Delete Practice"
                    >
                      <Trash2 size={20} />
                    </button>
                  </>
                )}
              </div>
            </div>

            <div ref={el => { practiceRefs.current[practice.id] = el; }} className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden p-8 space-y-8">
              {practice.description && (
                <div className="pb-8 border-b border-stone-100">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 mb-3">Session Overview</h4>
                  <p className="text-stone-600 leading-relaxed">{practice.description}</p>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                <div className="space-y-12">
                  <PracticePhase title="1. Warmup" drills={practice.warmup} />
                  <PracticePhase title="3. Final Game" drills={practice.finalGame} />
                </div>
                <div className="space-y-12">
                  <PracticePhase title="2. Main Body" drills={practice.mainBody} />
                  <PracticePhase title="4. Cool Down" drills={practice.coolDown} />
                </div>
              </div>

              <div className="pt-8 border-t border-stone-100">
                <div className="flex justify-between items-center mb-6">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400">Attendance ({practice.attendees?.length || 0}/{players.length})</h4>
                  <div className="flex gap-2">
                    <label className="cursor-pointer bg-stone-100 hover:bg-stone-200 text-stone-600 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-colors flex items-center gap-1.5">
                      <Camera size={14} />
                      <input 
                        type="file" 
                        className="hidden" 
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (ev) => updatePracticePhoto(practice.id, ev.target?.result as string);
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                      <span>Upload Squad Photo</span>
                    </label>
                  </div>
                </div>

                {practice.squadPhotoUrl && (
                  <div className="mb-6 rounded-2xl overflow-hidden border-4 border-stone-50 shadow-inner bg-stone-100 max-h-80">
                    <SafeImage 
                      src={practice.squadPhotoUrl} 
                      alt="Squad Photo" 
                      className="w-full h-64 object-cover"
                      onClick={() => setActiveModalImage({ src: practice.squadPhotoUrl!, title: `${practice.title} - Squad Photo` })}
                    />
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  {players.map(player => {
                    const isPresent = (practice.attendees || []).includes(player.id);
                    return (
                      <button
                        key={player.id}
                        onClick={() => togglePracticeAttendance(practice.id, player.id, practice.attendees)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border-2 ${
                          isPresent 
                            ? 'bg-emerald-50 border-emerald-500 text-emerald-700' 
                            : 'bg-stone-50 border-stone-100 text-stone-400 hover:border-stone-200'
                        }`}
                      >
                        {player.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <ImageModal 
        src={activeModalImage?.src || null} 
        title={activeModalImage?.title} 
        onClose={() => setActiveModalImage(null)} 
      />
    </motion.div>
  );
}

// --- Formations ---
const FORMATIONS: Record<string, { position: string; x: number; y: number }[]> = {
  '4-4-2': [
    { position: 'GK', x: 50, y: 90 },
    { position: 'RB', x: 85, y: 75 },
    { position: 'CB', x: 65, y: 80 },
    { position: 'CB', x: 35, y: 80 },
    { position: 'LB', x: 15, y: 75 },
    { position: 'RM', x: 85, y: 45 },
    { position: 'CM', x: 60, y: 50 },
    { position: 'CM', x: 40, y: 50 },
    { position: 'LM', x: 15, y: 45 },
    { position: 'ST', x: 60, y: 20 },
    { position: 'ST', x: 40, y: 20 },
  ],
  '4-3-3': [
    { position: 'GK', x: 50, y: 90 },
    { position: 'RB', x: 85, y: 75 },
    { position: 'CB', x: 65, y: 80 },
    { position: 'CB', x: 35, y: 80 },
    { position: 'LB', x: 15, y: 75 },
    { position: 'CM', x: 70, y: 50 },
    { position: 'CDM', x: 50, y: 55 },
    { position: 'CM', x: 30, y: 50 },
    { position: 'RW', x: 80, y: 25 },
    { position: 'ST', x: 50, y: 15 },
    { position: 'LW', x: 20, y: 25 },
  ],
  '3-5-2': [
    { position: 'GK', x: 50, y: 90 },
    { position: 'CB', x: 75, y: 80 },
    { position: 'CB', x: 50, y: 80 },
    { position: 'CB', x: 25, y: 80 },
    { position: 'RM', x: 90, y: 50 },
    { position: 'CM', x: 65, y: 55 },
    { position: 'CDM', x: 50, y: 60 },
    { position: 'CM', x: 35, y: 55 },
    { position: 'LM', x: 10, y: 50 },
    { position: 'ST', x: 60, y: 20 },
    { position: 'ST', x: 40, y: 20 },
  ],
  '4-2-3-1': [
    { position: 'GK', x: 50, y: 90 },
    { position: 'RB', x: 85, y: 75 },
    { position: 'CB', x: 65, y: 80 },
    { position: 'CB', x: 35, y: 80 },
    { position: 'LB', x: 15, y: 75 },
    { position: 'CDM', x: 60, y: 60 },
    { position: 'CDM', x: 40, y: 60 },
    { position: 'RW', x: 85, y: 35 },
    { position: 'CAM', x: 50, y: 35 },
    { position: 'LW', x: 15, y: 35 },
    { position: 'ST', x: 50, y: 15 },
  ]
};

// --- Lineup Section ---
function LineupSection({ match, players }: { match: Match; players: Player[] }) {
  const [isEditing, setIsEditing] = useState(false);
  const pitchRef = useRef<HTMLDivElement>(null);

  const handleUpdateLineup = async (lineup: Match['lineup']) => {
    try {
      await updateDoc(doc(db, 'matches', match.id), { lineup });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `matches/${match.id}`);
    }
  };

  const downloadPDF = async () => {
    if (!pitchRef.current) return;
    
    // Create a temporary container for the PDF content to ensure it's styled correctly
    const pdfContainer = document.createElement('div');
    pdfContainer.style.width = '800px';
    pdfContainer.style.padding = '40px';
    pdfContainer.style.backgroundColor = '#f5f5f4'; // stone-100
    pdfContainer.style.fontFamily = 'Inter, sans-serif';
    
    const header = `
      <div style="margin-bottom: 30px; border-bottom: 4px solid #1c1917; padding-bottom: 20px;">
        <h1 style="font-size: 32px; font-weight: 900; font-style: italic; text-transform: uppercase; margin: 0;">MATCH LINEUP</h1>
        <p style="font-size: 18px; font-weight: 700; color: #78716c; margin: 5px 0 0 0;">vs ${match.opponent} | ${match.date?.toDate().toLocaleDateString()}</p>
      </div>
    `;
    
    const pitchClone = pitchRef.current.cloneNode(true) as HTMLDivElement;
    pitchClone.style.width = '100%';
    pitchClone.style.height = '500px';
    pitchClone.style.marginBottom = '40px';
    pitchClone.style.borderRadius = '24px';
    pitchClone.style.backgroundColor = '#065f46'; // emerald-800
    
    // Ensure all text in the clone is visible
    pitchClone.querySelectorAll('span').forEach(span => {
      span.style.color = 'white';
      span.style.fontWeight = 'bold';
    });

    const subsList = `
      <div style="margin-top: 30px;">
        <h2 style="font-size: 16px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em; color: #a8a29e; margin-bottom: 15px;">Substitutes</h2>
        <div style="display: grid; grid-template-cols: repeat(2, 1fr); gap: 10px;">
          ${(match.lineup?.substitutes || []).map(id => {
            const player = players.find(p => p.id === id);
            return `<div style="padding: 10px; background: white; border-radius: 12px; border: 1px solid #e7e5e4; font-size: 14px; font-weight: 700;">${player?.name || 'Unknown'}</div>`;
          }).join('')}
        </div>
      </div>
    `;

    pdfContainer.innerHTML = header;
    pdfContainer.appendChild(pitchClone);
    pdfContainer.innerHTML += subsList;
    
    document.body.appendChild(pdfContainer);
    
    try {
      const canvas = await html2canvas(pdfContainer, {
        backgroundColor: '#f5f5f4',
        scale: 2,
        useCORS: true
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`lineup-vs-${match.opponent}.pdf`);
    } catch (error) {
      console.error("PDF Generation failed:", error);
    } finally {
      document.body.removeChild(pdfContainer);
    }
  };

  if (!match.lineup && !isEditing) {
    return (
      <div className="bg-stone-50 rounded-2xl p-8 border-2 border-dashed border-stone-200 flex flex-col items-center justify-center gap-4">
        <Shield size={48} className="text-stone-300" />
        <div className="text-center">
          <h5 className="font-bold text-stone-900">No Lineup Set</h5>
          <p className="text-stone-500 text-xs">Plan your formation and starting XI</p>
        </div>
        <button 
          onClick={() => setIsEditing(true)}
          className="bg-stone-900 text-white px-6 py-2 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-stone-800 transition-colors"
        >
          Create Lineup
        </button>
      </div>
    );
  }

  const currentLineup = match.lineup || { formation: '4-4-2', startingXI: FORMATIONS['4-4-2'].map(f => ({ ...f, playerId: '' })), substitutes: [] };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h4 className="font-bold text-xs uppercase tracking-widest text-stone-400">Match Lineup</h4>
        <div className="flex gap-2">
          {match.lineup && (
            <button 
              onClick={downloadPDF}
              className="flex items-center gap-2 text-emerald-600 font-bold text-xs uppercase tracking-widest hover:text-emerald-700"
            >
              <Download size={14} /> PDF
            </button>
          )}
          <button 
            onClick={() => setIsEditing(!isEditing)}
            className="text-stone-400 font-bold text-xs uppercase tracking-widest hover:text-stone-600"
          >
            {isEditing ? 'Close Editor' : 'Edit Lineup'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div 
            ref={pitchRef}
            className="relative aspect-[4/5] bg-emerald-800 rounded-[2rem] overflow-hidden border-4 border-emerald-900 shadow-inner"
          >
            {/* Pitch Markings */}
            <div className="absolute inset-4 border-2 border-emerald-700/50 rounded-xl pointer-events-none">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-24 border-b-2 border-x-2 border-emerald-700/50" />
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-24 border-t-2 border-x-2 border-emerald-700/50" />
              <div className="absolute top-1/2 left-0 w-full h-px bg-emerald-700/50" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 border-2 border-emerald-700/50 rounded-full" />
            </div>

            {/* Players */}
            {currentLineup.startingXI.map((pos, idx) => {
              const player = players.find(p => p.id === pos.playerId);
              return (
                <div 
                  key={idx}
                  className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1 group/pitchplayer"
                  style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                >
                  <div className={`w-11 h-11 rounded-full border-2 flex items-center justify-center shadow-lg transition-all relative overflow-hidden ${player ? 'bg-white border-emerald-400 scale-110' : 'bg-emerald-900/50 border-emerald-700'}`}>
                    {player ? (
                      player.photoUrl ? (
                        <>
                          <img 
                            src={player.photoUrl} 
                            alt={player.name}
                            className="w-full h-full object-cover rounded-full"
                            referrerPolicy="no-referrer"
                            crossOrigin="anonymous"
                          />
                          {player.number !== undefined && (
                            <span className="absolute bottom-0 right-0 bg-stone-900/90 text-white font-black text-[8px] px-1 py-0.2 rounded-tl border-t border-l border-white/40 leading-none">
                              #{player.number}
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-emerald-900 font-black text-xs">
                          {player.number !== undefined ? player.number : idx + 1}
                        </span>
                      )
                    ) : (
                      <span className="text-emerald-300 font-bold text-[10px]">{pos.position}</span>
                    )}
                  </div>
                  <div className="bg-emerald-950/85 backdrop-blur-sm px-2 py-0.5 rounded-md border border-emerald-700/50 min-w-[62px] text-center shadow-sm">
                    <span className="text-white font-bold text-[9px] uppercase tracking-tighter truncate block">
                      {player ? player.name.split(' ')[0] : 'Empty'}
                    </span>
                  </div>
                  
                  {isEditing && (
                    <select 
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      value={pos.playerId}
                      onChange={(e) => {
                        const newXI = [...currentLineup.startingXI];
                        newXI[idx] = { ...newXI[idx], playerId: e.target.value };
                        handleUpdateLineup({ ...currentLineup, startingXI: newXI });
                      }}
                    >
                      <option value="">Select Player</option>
                      {players.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-6">
          {isEditing && (
            <div className="space-y-4">
              <h5 className="font-bold text-xs uppercase tracking-widest text-stone-400">Formation</h5>
              <div className="grid grid-cols-2 gap-2">
                {Object.keys(FORMATIONS).map(f => (
                  <button 
                    key={f}
                    onClick={() => {
                      const newXI = FORMATIONS[f].map((pos, idx) => ({
                        ...pos,
                        playerId: currentLineup.startingXI[idx]?.playerId || ''
                      }));
                      handleUpdateLineup({ ...currentLineup, formation: f, startingXI: newXI });
                    }}
                    className={`px-4 py-2 rounded-xl font-bold text-xs border transition-all ${currentLineup.formation === f ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white border-stone-200 text-stone-600 hover:border-emerald-600'}`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-4">
            <h5 className="font-bold text-xs uppercase tracking-widest text-stone-400">Substitutes</h5>
            <div className="bg-stone-50 rounded-2xl p-4 border border-stone-100 space-y-2">
              {currentLineup.substitutes.map((subId, idx) => {
                const player = players.find(p => p.id === subId);
                return (
                  <div key={idx} className="flex items-center justify-between bg-white p-2 rounded-xl border border-stone-200 gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {player?.photoUrl ? (
                        <img 
                          src={player.photoUrl} 
                          alt={player.name}
                          className="w-7 h-7 rounded-lg object-cover border border-stone-200 shrink-0"
                          referrerPolicy="no-referrer"
                          crossOrigin="anonymous"
                        />
                      ) : (
                        <div className="w-7 h-7 rounded-lg bg-stone-100 flex items-center justify-center text-[10px] font-bold text-stone-600 shrink-0">
                          {player?.number !== undefined ? `#${player.number}` : '#'}
                        </div>
                      )}
                      <span className="text-xs font-bold text-stone-900 truncate">{player?.name || 'Unknown'}</span>
                    </div>
                    {isEditing && (
                      <button 
                        onClick={() => {
                          const newSubs = currentLineup.substitutes.filter((_, i) => i !== idx);
                          handleUpdateLineup({ ...currentLineup, substitutes: newSubs });
                        }}
                        className="text-stone-300 hover:text-red-500 shrink-0 p-1"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                );
              })}
              {isEditing && (
                <select 
                  className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 bg-white"
                  onChange={(e) => {
                    if (!e.target.value) return;
                    const newSubs = [...currentLineup.substitutes, e.target.value];
                    handleUpdateLineup({ ...currentLineup, substitutes: newSubs });
                    e.target.value = '';
                  }}
                >
                  <option value="">Add Substitute...</option>
                  {players.filter(p => !currentLineup.startingXI.some(s => s.playerId === p.id) && !currentLineup.substitutes.includes(p.id)).map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              )}
              {!isEditing && currentLineup.substitutes.length === 0 && (
                <p className="text-stone-400 text-[10px] italic text-center py-2">No substitutes listed</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Match Statistics Section ---
function MatchStatsSection({ match, players, canEdit }: { match: Match; players: Player[]; canEdit: boolean }) {
  const [isEditingStats, setIsEditingStats] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const statsReportRef = useRef<HTMLDivElement>(null);

  const [stats, setStats] = useState<MatchStats>(match.stats || {
    possessionHome: 50,
    possessionAway: 50,
    shotsHome: 0,
    shotsAway: 0,
    shotsOnTargetHome: 0,
    shotsOnTargetAway: 0,
    cornersHome: 0,
    cornersAway: 0,
    foulsHome: 0,
    foulsAway: 0,
    goals: [],
    assists: [],
    cards: [],
    playerOfTheMatch: '',
    notes: ''
  });

  // Goal scorer input state
  const [goalPlayerName, setGoalPlayerName] = useState('');
  const [goalPlayerId, setGoalPlayerId] = useState('');
  const [goalAssistPlayerName, setGoalAssistPlayerName] = useState('');
  const [goalAssistPlayerId, setGoalAssistPlayerId] = useState('');
  const [goalMinute, setGoalMinute] = useState<number>(1);
  const [goalTeam, setGoalTeam] = useState<'home' | 'away'>('home');
  const [goalType, setGoalType] = useState<MatchGoal['goalType']>('open_play');

  // Individual Assist input state
  const [assistPlayerName, setAssistPlayerName] = useState('');
  const [assistPlayerId, setAssistPlayerId] = useState('');
  const [assistMinute, setAssistMinute] = useState<number>(1);
  const [assistTeam, setAssistTeam] = useState<'home' | 'away'>('home');
  const [assistNotes, setAssistNotes] = useState('');

  // Individual Card input state (Yellow / Red)
  const [cardPlayerName, setCardPlayerName] = useState('');
  const [cardPlayerId, setCardPlayerId] = useState('');
  const [cardType, setCardType] = useState<'yellow' | 'red'>('yellow');
  const [cardMinute, setCardMinute] = useState<number>(1);
  const [cardTeam, setCardTeam] = useState<'home' | 'away'>('home');
  const [cardReason, setCardReason] = useState('Tactical Foul');

  useEffect(() => {
    if (match.stats) setStats(match.stats);
  }, [match.stats]);

  const handleSaveStats = async () => {
    try {
      await updateDoc(doc(db, 'matches', match.id), { stats });
      setIsEditingStats(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `matches/${match.id}`);
    }
  };

  const handleAddGoal = () => {
    if (!goalPlayerName.trim()) return;
    const newGoal: MatchGoal = {
      id: Date.now().toString(),
      playerId: goalPlayerId || undefined,
      playerName: goalPlayerName.trim(),
      minute: Number(goalMinute) || 1,
      team: goalTeam,
      assistPlayerId: goalAssistPlayerId || undefined,
      assistPlayerName: goalAssistPlayerName.trim() || undefined,
      goalType: goalType || 'open_play'
    };
    setStats(prev => ({
      ...prev,
      goals: [...(prev.goals || []), newGoal]
    }));
    setGoalPlayerName('');
    setGoalPlayerId('');
    setGoalAssistPlayerName('');
    setGoalAssistPlayerId('');
    setGoalMinute(1);
    setGoalType('open_play');
  };

  const handleRemoveGoal = (goalId: string) => {
    setStats(prev => ({
      ...prev,
      goals: (prev.goals || []).filter(g => g.id !== goalId)
    }));
  };

  const handleAddAssist = () => {
    if (!assistPlayerName.trim()) return;
    const newAssist: MatchAssist = {
      id: Date.now().toString(),
      playerId: assistPlayerId || undefined,
      playerName: assistPlayerName.trim(),
      minute: Number(assistMinute) || 1,
      team: assistTeam,
      notes: assistNotes.trim() || undefined
    };
    setStats(prev => ({
      ...prev,
      assists: [...(prev.assists || []), newAssist]
    }));
    setAssistPlayerName('');
    setAssistPlayerId('');
    setAssistMinute(1);
    setAssistNotes('');
  };

  const handleRemoveAssist = (assistId: string) => {
    setStats(prev => ({
      ...prev,
      assists: (prev.assists || []).filter(a => a.id !== assistId)
    }));
  };

  const handleAddCard = () => {
    if (!cardPlayerName.trim()) return;
    const newCard: MatchCard = {
      id: Date.now().toString(),
      playerId: cardPlayerId || undefined,
      playerName: cardPlayerName.trim(),
      minute: Number(cardMinute) || 1,
      cardType: cardType,
      team: cardTeam,
      reason: cardReason.trim() || (cardType === 'yellow' ? 'Caution' : 'Dismissal')
    };
    setStats(prev => ({
      ...prev,
      cards: [...(prev.cards || []), newCard]
    }));
    setCardPlayerName('');
    setCardPlayerId('');
    setCardMinute(1);
    setCardReason('Tactical Foul');
  };

  const handleRemoveCard = (cardId: string) => {
    setStats(prev => ({
      ...prev,
      cards: (prev.cards || []).filter(c => c.id !== cardId)
    }));
  };

  const downloadStatsPDF = async () => {
    if (!statsReportRef.current) return;
    setIsDownloading(true);

    try {
      const canvas = await html2canvas(statsReportRef.current, {
        backgroundColor: '#ffffff',
        scale: 2
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const imgProps = pdf.getImageProperties(imgData);
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`match-stats-${match.opponent.toLowerCase().replace(/\s+/g, '-')}.pdf`);
    } catch (error) {
      console.error("Stats PDF generation failed:", error);
    } finally {
      setIsDownloading(false);
    }
  };

  const possessionHome = stats.possessionHome ?? 50;
  const possessionAway = stats.possessionAway ?? 50;

  // Derived individual card counts
  const homeYellowCards = (stats.cards || []).filter(c => c.team === 'home' && c.cardType === 'yellow').length;
  const homeRedCards = (stats.cards || []).filter(c => c.team === 'home' && c.cardType === 'red').length;
  const awayYellowCards = (stats.cards || []).filter(c => c.team === 'away' && c.cardType === 'yellow').length;
  const awayRedCards = (stats.cards || []).filter(c => c.team === 'away' && c.cardType === 'red').length;

  return (
    <div className="space-y-6 bg-stone-50/80 p-6 rounded-3xl border border-stone-200">
      <div className="flex flex-wrap justify-between items-center gap-2">
        <div className="flex items-center gap-2">
          <BarChart2 size={18} className="text-emerald-600" />
          <h4 className="font-black text-sm uppercase tracking-widest text-stone-800">Match Statistics & Highlights</h4>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={downloadStatsPDF}
            disabled={isDownloading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-stone-200 rounded-xl font-bold text-xs text-stone-700 hover:text-emerald-600 hover:border-emerald-300 transition-all shadow-sm"
            title="Download Stats & Match Summary PDF"
          >
            {isDownloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            <span>Export Stats PDF</span>
          </button>
          {canEdit && (
            <button 
              onClick={() => setIsEditingStats(!isEditingStats)}
              className="px-3 py-1.5 bg-stone-900 text-white rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-stone-800 transition-colors"
            >
              {isEditingStats ? 'Close Editor' : 'Edit Stats'}
            </button>
          )}
        </div>
      </div>

      {isEditingStats ? (
        <div className="bg-white p-6 rounded-2xl border border-stone-200 space-y-6">
          <div className="flex items-center justify-between">
            <h5 className="font-bold text-sm text-stone-900 uppercase tracking-wider">Update Match Statistics & Individual Events</h5>
            <span className="text-xs text-stone-400 font-medium">Player cards and assists are logged individually</span>
          </div>
          
          {/* General Team Match Stats (Excluding Player-Specific Cards/Assists) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Possession */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-stone-500">Possession % (Home vs Away)</label>
              <div className="flex gap-2 items-center">
                <input 
                  type="number" 
                  min="0" 
                  max="100" 
                  className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-stone-200 text-sm font-bold"
                  value={stats.possessionHome ?? 50}
                  onChange={e => {
                    const h = Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
                    setStats({...stats, possessionHome: h, possessionAway: 100 - h});
                  }}
                  placeholder="Home %"
                />
                <span className="font-bold text-stone-400">:</span>
                <input 
                  type="number" 
                  min="0" 
                  max="100" 
                  className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-stone-200 text-sm font-bold"
                  value={stats.possessionAway ?? 50}
                  onChange={e => {
                    const a = Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
                    setStats({...stats, possessionAway: a, possessionHome: 100 - a});
                  }}
                  placeholder="Away %"
                />
              </div>
            </div>

            {/* Total Shots */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-stone-500">Total Shots (Home vs Away)</label>
              <div className="flex gap-2 items-center">
                <input 
                  type="number" min="0" 
                  className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-stone-200 text-sm font-bold"
                  value={stats.shotsHome ?? 0}
                  onChange={e => setStats({...stats, shotsHome: parseInt(e.target.value) || 0})}
                />
                <span className="font-bold text-stone-400">:</span>
                <input 
                  type="number" min="0" 
                  className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-stone-200 text-sm font-bold"
                  value={stats.shotsAway ?? 0}
                  onChange={e => setStats({...stats, shotsAway: parseInt(e.target.value) || 0})}
                />
              </div>
            </div>

            {/* Shots on Target */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-stone-500">Shots on Target (Home vs Away)</label>
              <div className="flex gap-2 items-center">
                <input 
                  type="number" min="0" 
                  className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-stone-200 text-sm font-bold"
                  value={stats.shotsOnTargetHome ?? 0}
                  onChange={e => setStats({...stats, shotsOnTargetHome: parseInt(e.target.value) || 0})}
                />
                <span className="font-bold text-stone-400">:</span>
                <input 
                  type="number" min="0" 
                  className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-stone-200 text-sm font-bold"
                  value={stats.shotsOnTargetAway ?? 0}
                  onChange={e => setStats({...stats, shotsOnTargetAway: parseInt(e.target.value) || 0})}
                />
              </div>
            </div>

            {/* Corners */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-stone-500">Corners (Home vs Away)</label>
              <div className="flex gap-2 items-center">
                <input 
                  type="number" min="0" 
                  className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-stone-200 text-sm font-bold"
                  value={stats.cornersHome ?? 0}
                  onChange={e => setStats({...stats, cornersHome: parseInt(e.target.value) || 0})}
                />
                <span className="font-bold text-stone-400">:</span>
                <input 
                  type="number" min="0" 
                  className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-stone-200 text-sm font-bold"
                  value={stats.cornersAway ?? 0}
                  onChange={e => setStats({...stats, cornersAway: parseInt(e.target.value) || 0})}
                />
              </div>
            </div>

            {/* Fouls */}
            <div className="space-y-2 md:col-span-2">
              <label className="text-xs font-bold uppercase text-stone-500">Fouls (Home vs Away)</label>
              <div className="flex gap-2 items-center">
                <input 
                  type="number" min="0" 
                  className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-stone-200 text-sm font-bold"
                  value={stats.foulsHome ?? 0}
                  onChange={e => setStats({...stats, foulsHome: parseInt(e.target.value) || 0})}
                />
                <span className="font-bold text-stone-400">:</span>
                <input 
                  type="number" min="0" 
                  className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-stone-200 text-sm font-bold"
                  value={stats.foulsAway ?? 0}
                  onChange={e => setStats({...stats, foulsAway: parseInt(e.target.value) || 0})}
                />
              </div>
            </div>
          </div>

          {/* 1. INDIVIDUAL GOAL SCORERS & ASSISTS INPUT */}
          <div className="pt-4 border-t border-stone-100 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
                <span>⚽</span> Goal Events & Scorers
              </label>
              <span className="text-[11px] text-stone-400">Add player goals and who assisted</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-2 items-center bg-stone-50 p-3 rounded-2xl border border-stone-200">
              <select
                className="px-3 py-2 rounded-xl bg-white border border-stone-200 text-xs font-bold md:col-span-1"
                value={goalTeam}
                onChange={e => setGoalTeam(e.target.value as 'home' | 'away')}
              >
                <option value="home">My Team</option>
                <option value="away">Opponent</option>
              </select>

              <div className="md:col-span-2">
                <select
                  className="w-full px-3 py-2 rounded-xl bg-white border border-stone-200 text-xs font-bold"
                  value={goalPlayerId || (goalPlayerName && !players.some(p => p.id === goalPlayerId) ? `custom:${goalPlayerName}` : '')}
                  onChange={e => {
                    const val = e.target.value;
                    if (val.startsWith('custom:')) {
                      setGoalPlayerId('');
                      setGoalPlayerName(val.replace('custom:', ''));
                    } else if (val) {
                      const matched = players.find(p => p.id === val);
                      setGoalPlayerId(val);
                      setGoalPlayerName(matched ? matched.name : '');
                    } else {
                      setGoalPlayerId('');
                      setGoalPlayerName('');
                    }
                  }}
                >
                  <option value="">-- Select Goal Scorer --</option>
                  {players.map(p => (
                    <option key={p.id} value={p.id}>{p.name} {p.number !== undefined ? `(#${p.number})` : ''}</option>
                  ))}
                  {goalTeam === 'away' && <option value={`custom:${match.opponent} Player`}>Opponent Player</option>}
                </select>
                {!goalPlayerId && (
                  <input
                    placeholder="Or type custom scorer name"
                    className="w-full mt-1.5 px-3 py-1.5 rounded-xl bg-white border border-stone-200 text-xs"
                    value={goalPlayerName}
                    onChange={e => {
                      setGoalPlayerName(e.target.value);
                      setGoalPlayerId('');
                    }}
                  />
                )}
              </div>

              <div className="md:col-span-2">
                <select
                  className="w-full px-3 py-2 rounded-xl bg-white border border-stone-200 text-xs"
                  value={goalAssistPlayerId || (goalAssistPlayerName ? `custom:${goalAssistPlayerName}` : '')}
                  onChange={e => {
                    const val = e.target.value;
                    if (val.startsWith('custom:')) {
                      setGoalAssistPlayerId('');
                      setGoalAssistPlayerName(val.replace('custom:', ''));
                    } else if (val) {
                      const matched = players.find(p => p.id === val);
                      setGoalAssistPlayerId(val);
                      setGoalAssistPlayerName(matched ? matched.name : '');
                    } else {
                      setGoalAssistPlayerId('');
                      setGoalAssistPlayerName('');
                    }
                  }}
                >
                  <option value="">-- Assist By (Optional) --</option>
                  {players.map(p => (
                    <option key={p.id} value={p.id}>{p.name} {p.number !== undefined ? `(#${p.number})` : ''}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2 items-center md:col-span-1">
                <input 
                  type="number"
                  placeholder="Min '"
                  className="w-16 px-2.5 py-2 rounded-xl bg-white border border-stone-200 text-xs font-bold"
                  value={goalMinute}
                  onChange={e => setGoalMinute(parseInt(e.target.value) || 1)}
                  title="Minute"
                />
                <button 
                  type="button"
                  onClick={handleAddGoal}
                  className="flex-1 px-3 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 whitespace-nowrap shadow-xs"
                >
                  Add
                </button>
              </div>
            </div>

            {stats.goals && stats.goals.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {stats.goals.map((g) => (
                  <div key={g.id} className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-2 ${g.team === 'home' ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-stone-100 border-stone-200 text-stone-700'}`}>
                    <span>⚽ {g.playerName} ({g.minute}'){g.assistPlayerName ? ` (Assist: ${g.assistPlayerName})` : ''} - {g.team === 'home' ? 'My Team' : match.opponent}</span>
                    <button type="button" onClick={() => handleRemoveGoal(g.id)} className="text-stone-400 hover:text-red-500">
                      <X size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 2. INDIVIDUAL PLAYER ASSISTS INPUT */}
          <div className="pt-4 border-t border-stone-100 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase tracking-wider text-sky-800 flex items-center gap-1.5">
                <span>👟</span> Individual Player Assists
              </label>
              <span className="text-[11px] text-stone-400">Log key chances created and assists by squad members</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-2 items-center bg-sky-50/50 p-3 rounded-2xl border border-sky-100">
              <select
                className="px-3 py-2 rounded-xl bg-white border border-sky-200 text-xs font-bold md:col-span-1"
                value={assistTeam}
                onChange={e => setAssistTeam(e.target.value as 'home' | 'away')}
              >
                <option value="home">My Team</option>
                <option value="away">Opponent</option>
              </select>

              <div className="md:col-span-2">
                <select
                  className="w-full px-3 py-2 rounded-xl bg-white border border-sky-200 text-xs font-bold"
                  value={assistPlayerId || (assistPlayerName && !players.some(p => p.id === assistPlayerId) ? `custom:${assistPlayerName}` : '')}
                  onChange={e => {
                    const val = e.target.value;
                    if (val.startsWith('custom:')) {
                      setAssistPlayerId('');
                      setAssistPlayerName(val.replace('custom:', ''));
                    } else if (val) {
                      const matched = players.find(p => p.id === val);
                      setAssistPlayerId(val);
                      setAssistPlayerName(matched ? matched.name : '');
                    } else {
                      setAssistPlayerId('');
                      setAssistPlayerName('');
                    }
                  }}
                >
                  <option value="">-- Select Player with Assist --</option>
                  {players.map(p => (
                    <option key={p.id} value={p.id}>{p.name} {p.number !== undefined ? `(#${p.number})` : ''}</option>
                  ))}
                  {assistTeam === 'away' && <option value={`custom:${match.opponent} Player`}>Opponent Player</option>}
                </select>
                {!assistPlayerId && (
                  <input
                    placeholder="Or type custom player name"
                    className="w-full mt-1.5 px-3 py-1.5 rounded-xl bg-white border border-sky-200 text-xs"
                    value={assistPlayerName}
                    onChange={e => {
                      setAssistPlayerName(e.target.value);
                      setAssistPlayerId('');
                    }}
                  />
                )}
              </div>

              <div className="md:col-span-2">
                <input 
                  placeholder="Notes (e.g. Through-ball, Corner cross, Cutback)"
                  className="w-full px-3 py-2 rounded-xl bg-white border border-sky-200 text-xs"
                  value={assistNotes}
                  onChange={e => setAssistNotes(e.target.value)}
                />
              </div>

              <div className="flex gap-2 items-center md:col-span-1">
                <input 
                  type="number"
                  placeholder="Min '"
                  className="w-16 px-2.5 py-2 rounded-xl bg-white border border-sky-200 text-xs font-bold"
                  value={assistMinute}
                  onChange={e => setAssistMinute(parseInt(e.target.value) || 1)}
                  title="Minute"
                />
                <button 
                  type="button"
                  onClick={handleAddAssist}
                  className="flex-1 px-3 py-2 bg-sky-600 text-white rounded-xl text-xs font-bold hover:bg-sky-700 whitespace-nowrap shadow-xs"
                >
                  Add Assist
                </button>
              </div>
            </div>

            {stats.assists && stats.assists.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {stats.assists.map((a) => (
                  <div key={a.id} className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-2 ${a.team === 'home' ? 'bg-sky-50 border-sky-200 text-sky-900' : 'bg-stone-100 border-stone-200 text-stone-700'}`}>
                    <span>👟 {a.playerName} ({a.minute}') {a.notes ? `• ${a.notes}` : ''} - {a.team === 'home' ? 'My Team' : match.opponent}</span>
                    <button type="button" onClick={() => handleRemoveAssist(a.id)} className="text-stone-400 hover:text-red-500">
                      <X size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 3. INDIVIDUAL DISCIPLINARY CARDS INPUT (YELLOW & RED CARDS) */}
          <div className="pt-4 border-t border-stone-100 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase tracking-wider text-amber-800 flex items-center gap-1.5">
                <span>🟨 🟥</span> Individual Player Cards (Disciplinary)
              </label>
              <span className="text-[11px] text-stone-400">Assigned specifically to players with match minute and reason</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-2 items-center bg-amber-50/40 p-3 rounded-2xl border border-amber-200">
              <div className="flex gap-1 md:col-span-1">
                <button
                  type="button"
                  onClick={() => setCardType('yellow')}
                  className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-black transition-all ${cardType === 'yellow' ? 'bg-amber-400 text-amber-950 shadow-xs border border-amber-500' : 'bg-white text-stone-500 border border-stone-200'}`}
                >
                  🟨 Yellow
                </button>
                <button
                  type="button"
                  onClick={() => setCardType('red')}
                  className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-black transition-all ${cardType === 'red' ? 'bg-red-500 text-white shadow-xs border border-red-600' : 'bg-white text-stone-500 border border-stone-200'}`}
                >
                  🟥 Red
                </button>
              </div>

              <select
                className="px-3 py-2 rounded-xl bg-white border border-amber-200 text-xs font-bold md:col-span-1"
                value={cardTeam}
                onChange={e => setCardTeam(e.target.value as 'home' | 'away')}
              >
                <option value="home">My Team</option>
                <option value="away">Opponent</option>
              </select>

              <div className="md:col-span-2">
                <select
                  className="w-full px-3 py-2 rounded-xl bg-white border border-amber-200 text-xs font-bold"
                  value={cardPlayerId || (cardPlayerName && !players.some(p => p.id === cardPlayerId) ? `custom:${cardPlayerName}` : '')}
                  onChange={e => {
                    const val = e.target.value;
                    if (val.startsWith('custom:')) {
                      setCardPlayerId('');
                      setCardPlayerName(val.replace('custom:', ''));
                    } else if (val) {
                      const matched = players.find(p => p.id === val);
                      setCardPlayerId(val);
                      setCardPlayerName(matched ? matched.name : '');
                    } else {
                      setCardPlayerId('');
                      setCardPlayerName('');
                    }
                  }}
                >
                  <option value="">-- Select Player Penalized --</option>
                  {players.map(p => (
                    <option key={p.id} value={p.id}>{p.name} {p.number !== undefined ? `(#${p.number})` : ''}</option>
                  ))}
                  {cardTeam === 'away' && <option value={`custom:${match.opponent} Player`}>Opponent Player</option>}
                </select>
                {!cardPlayerId && (
                  <input
                    placeholder="Or type custom player name"
                    className="w-full mt-1.5 px-3 py-1.5 rounded-xl bg-white border border-amber-200 text-xs"
                    value={cardPlayerName}
                    onChange={e => {
                      setCardPlayerName(e.target.value);
                      setCardPlayerId('');
                    }}
                  />
                )}
              </div>

              <div className="md:col-span-1">
                <input 
                  placeholder="Reason / Foul"
                  className="w-full px-3 py-2 rounded-xl bg-white border border-amber-200 text-xs"
                  value={cardReason}
                  onChange={e => setCardReason(e.target.value)}
                />
              </div>

              <div className="flex gap-2 items-center md:col-span-1">
                <input 
                  type="number"
                  placeholder="Min '"
                  className="w-14 px-2 py-2 rounded-xl bg-white border border-amber-200 text-xs font-bold"
                  value={cardMinute}
                  onChange={e => setCardMinute(parseInt(e.target.value) || 1)}
                  title="Minute"
                />
                <button 
                  type="button"
                  onClick={handleAddCard}
                  className="flex-1 px-2.5 py-2 bg-stone-900 text-white rounded-xl text-xs font-bold hover:bg-stone-800 whitespace-nowrap shadow-xs"
                >
                  Add Card
                </button>
              </div>
            </div>

            {stats.cards && stats.cards.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {stats.cards.map((c) => (
                  <div key={c.id} className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-2 ${
                    c.cardType === 'yellow' ? 'bg-amber-50 border-amber-300 text-amber-900' : 'bg-red-50 border-red-300 text-red-900'
                  }`}>
                    <span>
                      {c.cardType === 'yellow' ? '🟨 Yellow' : '🟥 Red'}: {c.playerName} ({c.minute}'){c.reason ? ` - ${c.reason}` : ''} ({c.team === 'home' ? 'My Team' : match.opponent})
                    </span>
                    <button type="button" onClick={() => handleRemoveCard(c.id)} className="text-stone-400 hover:text-red-500">
                      <X size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Player of the Match & Notes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-stone-100">
            <div>
              <label className="text-xs font-bold uppercase text-stone-500 block mb-1">Player of the Match (MOTM)</label>
              <select 
                className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-stone-200 text-xs font-bold"
                value={stats.playerOfTheMatch || ''}
                onChange={e => {
                  const val = e.target.value;
                  const matched = players.find(p => p.name === val);
                  setStats({
                    ...stats, 
                    playerOfTheMatch: val,
                    playerOfTheMatchId: matched ? matched.id : undefined
                  });
                }}
              >
                <option value="">-- None Selected --</option>
                {players.map(p => (
                  <option key={p.id} value={p.name}>{p.name} {p.number !== undefined ? `(#${p.number})` : ''}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold uppercase text-stone-500 block mb-1">Coach Match Analysis Notes</label>
              <input 
                placeholder="Key tactical takeaways, performance critique, or team directives..."
                className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-stone-200 text-xs font-medium"
                value={stats.notes || ''}
                onChange={e => setStats({...stats, notes: e.target.value})}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <button 
              type="button" 
              onClick={() => setIsEditingStats(false)} 
              className="px-4 py-2 text-stone-500 text-xs font-bold uppercase"
            >
              Cancel
            </button>
            <button 
              type="button" 
              onClick={handleSaveStats} 
              className="px-6 py-2 bg-stone-900 text-white rounded-xl text-xs font-bold uppercase hover:bg-stone-800"
            >
              Save Statistics
            </button>
          </div>
        </div>
      ) : (
        /* Render Match Stats View & PDF Printable Element */
        <div ref={statsReportRef} className="bg-white p-6 rounded-2xl border border-stone-200 space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-center border-b border-stone-100 pb-4 gap-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md">
                  {match.leagueName || 'Match'}
                </span>
                {match.matchNumber && (
                  <span className="text-[10px] font-black uppercase tracking-widest text-stone-400">
                    {match.matchNumber}
                  </span>
                )}
                {match.fixtureRound && (
                  <span className="text-[10px] font-bold uppercase tracking-widest text-stone-400">
                    • {match.fixtureRound}
                  </span>
                )}
              </div>
              <h3 className="text-xl font-black italic uppercase tracking-tight mt-1">vs {match.opponent}</h3>
            </div>
            <div className="text-right">
              <span className="text-3xl font-black italic text-stone-900 tracking-tight">{match.score || 'VS'}</span>
            </div>
          </div>

          {/* Possession Bar */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-bold uppercase text-stone-600">
              <span>My Team ({possessionHome}%)</span>
              <span>Possession</span>
              <span>{match.opponent} ({possessionAway}%)</span>
            </div>
            <div className="w-full h-3 bg-stone-100 rounded-full overflow-hidden flex">
              <div className="bg-emerald-600 h-full transition-all" style={{ width: `${possessionHome}%` }} />
              <div className="bg-stone-800 h-full transition-all" style={{ width: `${possessionAway}%` }} />
            </div>
          </div>

          {/* Comparative Stats Grid (Cards derived from individual card events) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-stone-50 p-4 rounded-xl border border-stone-100 text-center">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-stone-400">Shots (Target)</p>
              <p className="text-base font-black text-stone-800">
                {stats.shotsHome ?? 0} ({stats.shotsOnTargetHome ?? 0}) - {stats.shotsAway ?? 0} ({stats.shotsOnTargetAway ?? 0})
              </p>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-stone-400">Corners</p>
              <p className="text-base font-black text-stone-800">{stats.cornersHome ?? 0} - {stats.cornersAway ?? 0}</p>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-stone-400">Fouls</p>
              <p className="text-base font-black text-stone-800">{stats.foulsHome ?? 0} - {stats.foulsAway ?? 0}</p>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-stone-400">Cards (Player Events)</p>
              <p className="text-base font-black text-stone-800">
                🟨{homeYellowCards} 🟥{homeRedCards} - 🟨{awayYellowCards} 🟥{awayRedCards}
              </p>
            </div>
          </div>

          {/* Individual Player Highlights: Goals, Assists, and Disciplinary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
            {/* 1. Goal Events */}
            <div className="space-y-3">
              <h5 className="text-xs font-black uppercase tracking-widest text-stone-500 flex items-center gap-1.5">
                <Activity size={14} className="text-emerald-600" /> Goals Log
              </h5>
              {stats.goals && stats.goals.length > 0 ? (
                <div className="space-y-2">
                  {stats.goals.slice().sort((a,b) => a.minute - b.minute).map((g) => (
                    <div key={g.id} className="p-2.5 rounded-xl bg-stone-50 border border-stone-100 text-xs">
                      <div className="flex items-center justify-between font-bold">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-black text-[10px]">
                            {g.minute}'
                          </span>
                          <span className="text-stone-900 font-bold">{g.playerName}</span>
                        </div>
                        <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${g.team === 'home' ? 'bg-emerald-600 text-white' : 'bg-stone-300 text-stone-800'}`}>
                          {g.team === 'home' ? 'My Team' : match.opponent}
                        </span>
                      </div>
                      {g.assistPlayerName && (
                        <p className="text-[11px] text-stone-500 font-medium mt-1 pl-8">
                          Assist: <span className="font-bold text-sky-700">{g.assistPlayerName}</span>
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-stone-400 italic">No goal events logged</p>
              )}
            </div>

            {/* 2. Individual Assists */}
            <div className="space-y-3">
              <h5 className="text-xs font-black uppercase tracking-widest text-stone-500 flex items-center gap-1.5">
                <Zap size={14} className="text-sky-600" /> Player Assists
              </h5>
              {stats.assists && stats.assists.length > 0 ? (
                <div className="space-y-2">
                  {stats.assists.slice().sort((a,b) => (a.minute || 0) - (b.minute || 0)).map((a) => (
                    <div key={a.id} className="p-2.5 rounded-xl bg-sky-50/60 border border-sky-100 text-xs">
                      <div className="flex items-center justify-between font-bold">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-sky-100 text-sky-800 flex items-center justify-center font-black text-[10px]">
                            {a.minute ? `${a.minute}'` : '👟'}
                          </span>
                          <span className="text-stone-900 font-bold">{a.playerName}</span>
                        </div>
                        <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${a.team === 'home' ? 'bg-sky-600 text-white' : 'bg-stone-300 text-stone-800'}`}>
                          {a.team === 'home' ? 'My Team' : match.opponent}
                        </span>
                      </div>
                      {a.notes && (
                        <p className="text-[11px] text-stone-500 font-medium mt-1 pl-8">
                          {a.notes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-stone-400 italic">No player assists logged</p>
              )}
            </div>

            {/* 3. Individual Disciplinary Cards */}
            <div className="space-y-3">
              <h5 className="text-xs font-black uppercase tracking-widest text-stone-500 flex items-center gap-1.5">
                <ShieldAlert size={14} className="text-amber-600" /> Disciplinary Cards
              </h5>
              {stats.cards && stats.cards.length > 0 ? (
                <div className="space-y-2">
                  {stats.cards.slice().sort((a,b) => a.minute - b.minute).map((c) => (
                    <div key={c.id} className={`p-2.5 rounded-xl border text-xs ${
                      c.cardType === 'yellow' ? 'bg-amber-50/70 border-amber-200' : 'bg-red-50/70 border-red-200'
                    }`}>
                      <div className="flex items-center justify-between font-bold">
                        <div className="flex items-center gap-2">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center font-black text-[10px] ${
                            c.cardType === 'yellow' ? 'bg-amber-400 text-amber-950' : 'bg-red-600 text-white'
                          }`}>
                            {c.minute}'
                          </span>
                          <span className="text-stone-900 font-bold">{c.playerName}</span>
                          <span className="text-[10px]">{c.cardType === 'yellow' ? '🟨' : '🟥'}</span>
                        </div>
                        <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${c.team === 'home' ? 'bg-stone-800 text-white' : 'bg-stone-300 text-stone-800'}`}>
                          {c.team === 'home' ? 'My Team' : match.opponent}
                        </span>
                      </div>
                      {c.reason && (
                        <p className="text-[11px] text-stone-600 font-medium mt-1 pl-8">
                          {c.reason}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-stone-400 italic">No player cautions or send-offs logged</p>
              )}
            </div>
          </div>

          {/* MOTM & Analysis Notes Footer */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-stone-100">
            {stats.playerOfTheMatch ? (
              <div className="bg-amber-50 p-4 rounded-2xl border border-amber-200 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold shadow-xs">
                  <Award size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-amber-700">Player of the Match</p>
                  <p className="font-black text-amber-950 text-base">{stats.playerOfTheMatch}</p>
                </div>
              </div>
            ) : (
              <div className="bg-stone-50 p-4 rounded-2xl border border-stone-100 flex items-center gap-3 text-stone-400 text-xs">
                <Award size={18} className="opacity-40" />
                <span>No Player of the Match awarded yet</span>
              </div>
            )}

            {stats.notes ? (
              <div className="bg-stone-50 p-4 rounded-2xl border border-stone-100">
                <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-1">Match Analysis & Tactical Notes</p>
                <p className="text-xs text-stone-700 leading-relaxed font-medium">{stats.notes}</p>
              </div>
            ) : (
              <div className="bg-stone-50 p-4 rounded-2xl border border-stone-100 flex items-center text-stone-400 text-xs">
                <span>No coach tactical analysis notes recorded</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Standings computation helper - includes all teams in the league and calculates results for completed games
function computeStandings(matchesList: Match[], myTeamName: string, explicitTeams: string[] = []) {
  const standingsMap: Record<string, {
    teamName: string;
    isMyTeam: boolean;
    P: number;
    W: number;
    D: number;
    L: number;
    GF: number;
    GA: number;
    GD: number;
    PTS: number;
    form: ('W' | 'D' | 'L')[];
  }> = {};

  const getOrCreateTeamStats = (name: string, isMyTeam = false) => {
    const trimmed = name?.trim();
    if (!trimmed || trimmed === 'BYE') return null;
    if (!standingsMap[trimmed]) {
      const isMine = isMyTeam || (myTeamName && trimmed.toLowerCase() === myTeamName.trim().toLowerCase());
      standingsMap[trimmed] = {
        teamName: trimmed,
        isMyTeam: !!isMine,
        P: 0,
        W: 0,
        D: 0,
        L: 0,
        GF: 0,
        GA: 0,
        GD: 0,
        PTS: 0,
        form: []
      };
    }
    return standingsMap[trimmed];
  };

  // 1. Initialize all explicit teams in the league
  explicitTeams.forEach(tName => {
    if (tName) getOrCreateTeamStats(tName);
  });

  // 2. Discover all teams present in ANY fixture (scheduled, completed, live, postponed)
  matchesList.forEach(match => {
    const homeName = match.homeTeamName || myTeamName;
    const awayName = match.awayTeamName || match.opponent;
    if (homeName) getOrCreateTeamStats(homeName);
    if (awayName) getOrCreateTeamStats(awayName);
  });

  // 3. Process completed/scored matches in chronological order for accurate form guide
  const scoredMatches = matchesList
    .filter(match => match.score && match.score.includes('-') && match.status !== 'postponed')
    .sort((a, b) => {
      const timeA = a.date ? (typeof a.date === 'string' ? new Date(a.date).getTime() : a.date.toMillis?.() || 0) : 0;
      const timeB = b.date ? (typeof b.date === 'string' ? new Date(b.date).getTime() : b.date.toMillis?.() || 0) : 0;
      return timeA - timeB;
    });

  scoredMatches.forEach(match => {
    const parts = match.score.split('-').map(s => parseInt(s.trim()));
    if (parts.length !== 2 || isNaN(parts[0]) || isNaN(parts[1])) return;

    const homeGoals = parts[0];
    const awayGoals = parts[1];

    const homeName = match.homeTeamName || myTeamName;
    const awayName = match.awayTeamName || match.opponent;

    const homeTeam = getOrCreateTeamStats(homeName);
    const awayTeam = getOrCreateTeamStats(awayName);

    if (!homeTeam || !awayTeam) return;

    homeTeam.P += 1;
    homeTeam.GF += homeGoals;
    homeTeam.GA += awayGoals;
    homeTeam.GD = homeTeam.GF - homeTeam.GA;

    awayTeam.P += 1;
    awayTeam.GF += awayGoals;
    awayTeam.GA += homeGoals;
    awayTeam.GD = awayTeam.GF - awayTeam.GA;

    if (homeGoals > awayGoals) {
      homeTeam.W += 1;
      homeTeam.PTS += 3;
      homeTeam.form.push('W');

      awayTeam.L += 1;
      awayTeam.form.push('L');
    } else if (homeGoals < awayGoals) {
      awayTeam.W += 1;
      awayTeam.PTS += 3;
      awayTeam.form.push('W');

      homeTeam.L += 1;
      homeTeam.form.push('L');
    } else {
      homeTeam.D += 1;
      homeTeam.PTS += 1;
      homeTeam.form.push('D');

      awayTeam.D += 1;
      awayTeam.PTS += 1;
      awayTeam.form.push('D');
    }
  });

  return Object.values(standingsMap).sort((a, b) => {
    if (b.PTS !== a.PTS) return b.PTS - a.PTS;
    if (b.GD !== a.GD) return b.GD - a.GD;
    if (b.GF !== a.GF) return b.GF - a.GF;
    return a.teamName.localeCompare(b.teamName);
  });
}

// Polygon Rotation Round Robin Fixture Generator Helper
function generateRoundRobinFixtures({
  teams,
  leagueId,
  leagueName,
  groupName,
  isDoubleRoundRobin,
  startDate,
  intervalDays,
  matchesPerDay = 2,
  restDaysBetweenRounds = 2,
  matchTimeGapHours = 2,
  matchNumberStart,
  location,
  roundPrefix
}: {
  teams: string[];
  leagueId: string;
  leagueName: string;
  groupName?: string;
  isDoubleRoundRobin: boolean;
  startDate: string;
  intervalDays?: number;
  matchesPerDay?: number;
  restDaysBetweenRounds?: number;
  matchTimeGapHours?: number;
  matchNumberStart: number;
  location: string;
  roundPrefix: string;
}) {
  let teamList = [...teams];
  if (teamList.length % 2 !== 0) {
    teamList.push("BYE");
  }

  const n = teamList.length;
  const numRounds = n - 1;
  const half = n / 2;

  const firstLegRounds: { roundNum: number; home: string; away: string }[][] = [];

  for (let r = 0; r < numRounds; r++) {
    const roundMatches: { roundNum: number; home: string; away: string }[] = [];
    for (let i = 0; i < half; i++) {
      const home = teamList[i];
      const away = teamList[n - 1 - i];

      if (home !== "BYE" && away !== "BYE") {
        if (i === 0 && r % 2 === 1) {
          roundMatches.push({ roundNum: r + 1, home: away, away: home });
        } else {
          roundMatches.push({ roundNum: r + 1, home, away });
        }
      }
    }
    firstLegRounds.push(roundMatches);

    // Polygon rotation
    teamList = [
      teamList[0],
      teamList[n - 1],
      ...teamList.slice(1, n - 1)
    ];
  }

  const allLegsRounds = [...firstLegRounds];

  if (isDoubleRoundRobin) {
    firstLegRounds.forEach((rMatches, idx) => {
      const secondLeg = rMatches.map(m => ({
        roundNum: numRounds + idx + 1,
        home: m.away,
        away: m.home
      }));
      allLegsRounds.push(secondLeg);
    });
  }

  const generatedMatches: any[] = [];
  let currentMatchNum = matchNumberStart;

  // Flexible Scheduling: matches per day + rest days between rounds
  const effectiveMatchesPerDay = Math.max(1, matchesPerDay || 2);
  const effectiveRestDays = Math.max(0, restDaysBetweenRounds !== undefined ? restDaysBetweenRounds : (intervalDays ? Math.max(0, intervalDays - 1) : 2));
  const timeGapHours = typeof matchTimeGapHours === 'number' ? matchTimeGapHours : 2;

  const startDt = new Date(startDate);
  const baseHours = isNaN(startDt.getHours()) ? 14 : startDt.getHours();
  const baseMinutes = isNaN(startDt.getMinutes()) ? 0 : startDt.getMinutes();
  let dayOffset = 0;

  allLegsRounds.forEach((roundMatches, roundIndex) => {
    const prefix = roundPrefix ? roundPrefix : 'Round';
    const roundLabel = groupName ? `${groupName} - ${prefix} ${roundIndex + 1}` : `${prefix} ${roundIndex + 1}`;
    const roundDaysCount = Math.ceil(roundMatches.length / effectiveMatchesPerDay);

    roundMatches.forEach((m, mIdx) => {
      const dayInRound = Math.floor(mIdx / effectiveMatchesPerDay);
      const matchInDay = mIdx % effectiveMatchesPerDay;

      const matchDate = new Date(startDt.getTime());
      matchDate.setDate(matchDate.getDate() + dayOffset + dayInRound);
      matchDate.setHours(baseHours + matchInDay * timeGapHours, baseMinutes, 0, 0);

      generatedMatches.push({
        leagueId,
        leagueName,
        groupName: groupName || '',
        homeTeamName: m.home,
        awayTeamName: m.away,
        opponent: m.away,
        matchNumber: `Match #${currentMatchNum}`,
        fixtureRound: roundLabel,
        location: location || 'Main Stadium',
        status: 'scheduled',
        date: matchDate,
        matchType: 'league'
      });
      currentMatchNum++;
    });

    dayOffset += roundDaysCount + effectiveRestDays;
  });

  return { generatedMatches, nextMatchNumberStart: currentMatchNum, totalDaysNeeded: dayOffset };
}

// Knockout Stage Fixture Generator Helpers
// Calculate cross-group rankings for any placement (e.g. 3rd-place teams / Best Losers, 2nd-place teams / Best Runners-up)
function computeCrossGroupRankings(
  groupStandingsMap: Record<string, { standings: any[]; isCompleted: boolean; totalMatches: number; completedMatches: number }>,
  positionIndex: number = 2 // 0 = 1st place, 1 = 2nd place, 2 = 3rd place, 3 = 4th place
): {
  rankings: Array<{
    teamName: string;
    groupName: string;
    PTS: number;
    GD: number;
    GF: number;
    GA: number;
    W: number;
    D: number;
    L: number;
    P: number;
    isGroupCompleted: boolean;
    crossRank: number;
  }>;
  allGroupsCompleted: boolean;
} {
  const gathered: Array<{
    teamName: string;
    groupName: string;
    PTS: number;
    GD: number;
    GF: number;
    GA: number;
    W: number;
    D: number;
    L: number;
    P: number;
    isGroupCompleted: boolean;
    crossRank: number;
  }> = [];

  Object.entries(groupStandingsMap).forEach(([groupName, info]) => {
    if (info.standings && info.standings.length > positionIndex) {
      const row = info.standings[positionIndex];
      if (row && row.teamName) {
        gathered.push({
          teamName: row.teamName,
          groupName,
          PTS: row.PTS || 0,
          GD: row.GD || 0,
          GF: row.GF || 0,
          GA: row.GA || 0,
          W: row.W || 0,
          D: row.D || 0,
          L: row.L || 0,
          P: row.P || 0,
          isGroupCompleted: info.isCompleted,
          crossRank: 0
        });
      }
    }
  });

  // Standard tournament tiebreaker sorting: PTS desc, GD desc, GF desc, W desc, GA asc
  gathered.sort((a, b) => {
    if (b.PTS !== a.PTS) return b.PTS - a.PTS;
    if (b.GD !== a.GD) return b.GD - a.GD;
    if (b.GF !== a.GF) return b.GF - a.GF;
    if (b.W !== a.W) return b.W - a.W;
    return a.GA - b.GA;
  });

  gathered.forEach((item, idx) => {
    item.crossRank = idx + 1;
  });

  const allGroupsCompleted = gathered.length > 0 && gathered.every(g => g.isGroupCompleted);

  return {
    rankings: gathered,
    allGroupsCompleted
  };
}

// Generates next round and knockout stage bracket matches dynamically starting from Round of 32, 16, QF, SF, or Final
function generateKnockoutFixtures({
  groupsList,
  leagueId,
  leagueName,
  startDate,
  intervalDays = 7,
  matchesPerDay = 2,
  restDaysBetweenRounds = 2,
  matchTimeGapHours = 2,
  matchNumberStart = 201,
  location = 'Main Stadium',
  advancementFormat = 'top_2',
  qualifiersPerGroup = 2,
  customRuleText = '',
  customAdvancingTotal,
  wildcardCount = 0
}: {
  groupsList: string[];
  leagueId: string;
  leagueName: string;
  startDate: string;
  intervalDays?: number;
  matchesPerDay?: number;
  restDaysBetweenRounds?: number;
  matchTimeGapHours?: number;
  matchNumberStart?: number;
  location?: string;
  advancementFormat?: 'top_2' | 'top_1' | 'top_3' | 'top_2_plus_best_3rd' | 'top_4' | 'custom';
  qualifiersPerGroup?: number;
  customRuleText?: string;
  customAdvancingTotal?: number;
  wildcardCount?: number;
}) {
  let curMatchNum = matchNumberStart;

  const gList = groupsList.filter(Boolean);
  const G = gList.length > 0 ? gList.length : 2;

  // Determine effective qualifiers per group (K)
  let K = 2;
  if (advancementFormat === 'top_1') K = 1;
  else if (advancementFormat === 'top_2') K = 2;
  else if (advancementFormat === 'top_3') K = 3;
  else if (advancementFormat === 'top_4') K = 4;
  else if (advancementFormat === 'custom') K = Math.max(1, qualifiersPerGroup || 2);
  else if (advancementFormat === 'top_2_plus_best_3rd') K = Math.max(1, qualifiersPerGroup || 2);

  // Determine effective wildcard count W
  const isWildcardRule = advancementFormat === 'top_2_plus_best_3rd';
  let W = 0;
  if (isWildcardRule) {
    if (typeof wildcardCount === 'number' && wildcardCount > 0) {
      W = wildcardCount;
    } else if (typeof customAdvancingTotal === 'number' && customAdvancingTotal > G * K) {
      W = customAdvancingTotal - (G * K);
    } else {
      // Default smart wildcard count: 12 groups (World Cup format) = 8 wildcards; Euro 6 groups = 4 wildcards; 3 groups = 2; 4 groups = 4; 2 groups = 2; else 4
      W = G === 12 ? 8 : (G === 6 ? 4 : (G === 3 ? 2 : (G === 4 ? 4 : 2)));
    }
  } else if (typeof wildcardCount === 'number' && wildcardCount > 0) {
    W = wildcardCount;
  }

  // Calculate total advancing teams
  let totalAdvancing = typeof customAdvancingTotal === 'number' && customAdvancingTotal > 0
    ? customAdvancingTotal
    : (G * K + W);

  // If 12 groups (A-L) are present and total advancing would be 24 (just top 2), standard tournament format (World Cup) advances to Round of 32 (32 teams) with 8 wildcards
  if (G === 12 && totalAdvancing <= 24) {
    W = 8;
    totalAdvancing = 32;
  }

  // Build wildcard team placeholders
  const wildcardSlots: string[] = [];
  for (let w = 1; w <= W; w++) {
    wildcardSlots.push(`Best 3rd Place #${w} (Wildcard)`);
  }

  const getOrdinal = (n: number) => {
    if (n === 1) return '1st Place';
    if (n === 2) return '2nd Place';
    if (n === 3) return '3rd Place';
    return `${n}th Place`;
  };

  // Helper to accumulate bracket matchups
  const rawMatches: {
    stage: 'round_of_32' | 'round_of_16' | 'quarter_final' | 'semi_final' | 'final' | 'third_place' | 'playoff' | 'preliminary';
    fixtureRound: string;
    homePlaceholder: string;
    awayPlaceholder: string;
    roundIndex: number;
  }[] = [];

  const addMatch = (opts: {
    stage: 'round_of_32' | 'round_of_16' | 'quarter_final' | 'semi_final' | 'final' | 'third_place' | 'playoff' | 'preliminary';
    fixtureRound: string;
    homePlaceholder: string;
    awayPlaceholder: string;
    roundIndex: number;
  }) => {
    rawMatches.push(opts);
  };

  // --- 1. Round of 32 (32 Teams -> 16 matches in R32 -> 8 in R16 -> 4 QF -> 2 SF -> Final) ---
  if (totalAdvancing >= 32) {
    if (G === 12 || (gList.length >= 12 && totalAdvancing >= 32)) {
      // 12 Groups Format (Groups A through L - World Cup / 48-team Championship Bracket)
      // Requirements:
      // 1. ALL Winners of Groups A through L MUST be in the Round of 32 (all 12 winners).
      // 2. ALL 2nd Place teams of Groups A through L are present with NO repetitions across round fixtures.
      // 3. 8 Best 3rd Place / Wildcards are placed without conflict.
      // 4. Balanced bracket: Winners and 2nd Place teams from the same group are on opposite halves of the bracket.
      const g = (idx: number) => gList[idx] || `Group ${String.fromCharCode(65 + idx)}`;

      const r32Pairings: [string, string][] = [
        // Top Half (Matches 1 to 8): Group A, B, C, D, E, F winners; G, H, I, J, K, L runners-up; Wildcards 5-8
        [`Winner ${g(0)}`, wildcardSlots[7] || 'Best 3rd Place #8 (Wildcard)'], // Match 1: Winner A vs WC 8
        [`2nd Place ${g(8)}`, `2nd Place ${g(9)}`],                              // Match 2: 2nd I vs 2nd J
        [`Winner ${g(1)}`, wildcardSlots[6] || 'Best 3rd Place #7 (Wildcard)'], // Match 3: Winner B vs WC 7
        [`Winner ${g(4)}`, `2nd Place ${g(6)}`],                              // Match 4: Winner E vs 2nd G
        [`Winner ${g(2)}`, wildcardSlots[5] || 'Best 3rd Place #6 (Wildcard)'], // Match 5: Winner C vs WC 6
        [`2nd Place ${g(10)}`, `2nd Place ${g(11)}`],                            // Match 6: 2nd K vs 2nd L
        [`Winner ${g(3)}`, wildcardSlots[4] || 'Best 3rd Place #5 (Wildcard)'], // Match 7: Winner D vs WC 5
        [`Winner ${g(5)}`, `2nd Place ${g(7)}`],                              // Match 8: Winner F vs 2nd H

        // Bottom Half (Matches 9 to 16): Group G, H, I, J, K, L winners; A, B, C, D, E, F runners-up; Wildcards 1-4
        [`Winner ${g(6)}`, wildcardSlots[3] || 'Best 3rd Place #4 (Wildcard)'], // Match 9: Winner G vs WC 4
        [`2nd Place ${g(2)}`, `2nd Place ${g(3)}`],                              // Match 10: 2nd C vs 2nd D
        [`Winner ${g(7)}`, wildcardSlots[2] || 'Best 3rd Place #3 (Wildcard)'], // Match 11: Winner H vs WC 3
        [`Winner ${g(10)}`, `2nd Place ${g(0)}`],                             // Match 12: Winner K vs 2nd A
        [`Winner ${g(8)}`, wildcardSlots[1] || 'Best 3rd Place #2 (Wildcard)'], // Match 13: Winner I vs WC 2
        [`2nd Place ${g(4)}`, `2nd Place ${g(5)}`],                              // Match 14: 2nd E vs 2nd F
        [`Winner ${g(9)}`, wildcardSlots[0] || 'Best 3rd Place #1 (Wildcard)'], // Match 15: Winner J vs WC 1
        [`Winner ${g(11)}`, `2nd Place ${g(1)}`],                             // Match 16: Winner L vs 2nd B
      ];

      r32Pairings.forEach(([h, a], idx) => {
        addMatch({
          stage: 'round_of_32',
          fixtureRound: `Round of 32 Match ${idx + 1}`,
          homePlaceholder: h,
          awayPlaceholder: a,
          roundIndex: 0
        });
      });
    } else if (W > 0) {
      // General Wildcard rules with 32 advancing teams:
      // Include all group winners, then fill with wildcards and disjoint pairs of 2nd place teams (no repeats)
      const winnerList: string[] = [];
      const runnerUpList: string[] = [];
      for (let i = 0; i < G; i++) {
        winnerList.push(gList[i] || `Group ${String.fromCharCode(65 + i)}`);
        runnerUpList.push(gList[i] || `Group ${String.fromCharCode(65 + i)}`);
      }

      const Mw = Math.min(W, G, 16);
      for (let i = 0; i < Mw; i++) {
        addMatch({
          stage: 'round_of_32',
          fixtureRound: `Round of 32 Match ${i + 1}`,
          homePlaceholder: `Winner ${winnerList[i]}`,
          awayPlaceholder: wildcardSlots[Mw - 1 - i] || `Best 3rd Place #${Mw - i} (Wildcard)`,
          roundIndex: 0
        });
      }

      let matchIdx = Mw;
      let usedRunnerUpIdx = 0;
      // Remaining winners play 2nd place teams
      for (let i = Mw; i < G && matchIdx < 16; i++) {
        const homeWinnerGrp = winnerList[i];
        const awayRunnerGrp = runnerUpList[usedRunnerUpIdx % runnerUpList.length];
        usedRunnerUpIdx++;
        addMatch({
          stage: 'round_of_32',
          fixtureRound: `Round of 32 Match ${matchIdx + 1}`,
          homePlaceholder: `Winner ${homeWinnerGrp}`,
          awayPlaceholder: `2nd Place ${awayRunnerGrp}`,
          roundIndex: 0
        });
        matchIdx++;
      }

      // Remaining matches: pair remaining 2nd place teams stepping by 2 to prevent any repeats
      while (matchIdx < 16 && usedRunnerUpIdx < runnerUpList.length) {
        const homeGrp = runnerUpList[usedRunnerUpIdx % runnerUpList.length];
        const awayGrp = runnerUpList[(usedRunnerUpIdx + 1) % runnerUpList.length];
        usedRunnerUpIdx += 2;
        addMatch({
          stage: 'round_of_32',
          fixtureRound: `Round of 32 Match ${matchIdx + 1}`,
          homePlaceholder: `2nd Place ${homeGrp}`,
          awayPlaceholder: `2nd Place ${awayGrp}`,
          roundIndex: 0
        });
        matchIdx++;
      }
    } else if (G === 8 && K >= 4) {
      // 8 groups (A-H), 4 advancing each
      const g = gList;
      const r32Pairings = [
        [`Winner ${g[0]}`, `4th Place ${g[1]}`],
        [`2nd Place ${g[2]}`, `3rd Place ${g[3]}`],
        [`Winner ${g[4]}`, `4th Place ${g[5]}`],
        [`2nd Place ${g[6]}`, `3rd Place ${g[7]}`],
        [`Winner ${g[1]}`, `4th Place ${g[0]}`],
        [`2nd Place ${g[3]}`, `3rd Place ${g[2]}`],
        [`Winner ${g[5]}`, `4th Place ${g[4]}`],
        [`2nd Place ${g[7]}`, `3rd Place ${g[6]}`],
        [`Winner ${g[2]}`, `4th Place ${g[3]}`],
        [`2nd Place ${g[0]}`, `3rd Place ${g[1]}`],
        [`Winner ${g[6]}`, `4th Place ${g[7]}`],
        [`2nd Place ${g[4]}`, `3rd Place ${g[5]}`],
        [`Winner ${g[3]}`, `4th Place ${g[2]}`],
        [`2nd Place ${g[1]}`, `3rd Place ${g[0]}`],
        [`Winner ${g[7]}`, `4th Place ${g[6]}`],
        [`2nd Place ${g[5]}`, `3rd Place ${g[4]}`]
      ];
      r32Pairings.forEach(([h, a], idx) => {
        addMatch({
          stage: 'round_of_32',
          fixtureRound: `Round of 32 Match ${idx + 1}`,
          homePlaceholder: h,
          awayPlaceholder: a,
          roundIndex: 0
        });
      });
    } else {
      // Generic Round of 32 generation for any G / K
      for (let i = 0; i < 16; i++) {
        const homeGrp = gList[i % G] || `Group ${String.fromCharCode(65 + (i % 8))}`;
        const awayGrp = gList[(i + Math.floor(G / 2) || 1) % G] || `Group ${String.fromCharCode(65 + ((i + 4) % 8))}`;
        const homePos = (Math.floor(i / G) % K) + 1;
        const awayPos = (K - ((Math.floor(i / G) % K))) || 2;
        addMatch({
          stage: 'round_of_32',
          fixtureRound: `Round of 32 Match ${i + 1}`,
          homePlaceholder: homePos === 1 ? `Winner ${homeGrp}` : `${getOrdinal(homePos)} ${homeGrp}`,
          awayPlaceholder: `${getOrdinal(awayPos)} ${awayGrp}`,
          roundIndex: 0
        });
      }
    }

    // Round of 16 (8 matches from R32 winners)
    for (let i = 1; i <= 8; i++) {
      addMatch({
        stage: 'round_of_16',
        fixtureRound: `Round of 16 Match ${i}`,
        homePlaceholder: `Winner Round of 32 Match ${2 * i - 1}`,
        awayPlaceholder: `Winner Round of 32 Match ${2 * i}`,
        roundIndex: 1
      });
    }

    // Quarter-Finals (4 matches from R16 winners)
    for (let i = 1; i <= 4; i++) {
      addMatch({
        stage: 'quarter_final',
        fixtureRound: `Quarter-Final ${i}`,
        homePlaceholder: `Winner Round of 16 Match ${2 * i - 1}`,
        awayPlaceholder: `Winner Round of 16 Match ${2 * i}`,
        roundIndex: 2
      });
    }

    // Semi-Finals (2 matches)
    addMatch({
      stage: 'semi_final',
      fixtureRound: 'Semi-Final 1',
      homePlaceholder: 'Winner Quarter-Final 1',
      awayPlaceholder: 'Winner Quarter-Final 2',
      roundIndex: 3
    });
    addMatch({
      stage: 'semi_final',
      fixtureRound: 'Semi-Final 2',
      homePlaceholder: 'Winner Quarter-Final 3',
      awayPlaceholder: 'Winner Quarter-Final 4',
      roundIndex: 3
    });

    // 3rd Place Playoff
    addMatch({
      stage: 'third_place',
      fixtureRound: '3rd Place Playoff',
      homePlaceholder: 'Loser Semi-Final 1',
      awayPlaceholder: 'Loser Semi-Final 2',
      roundIndex: 4
    });

    // Grand Final
    addMatch({
      stage: 'final',
      fixtureRound: 'Grand Final',
      homePlaceholder: 'Winner Semi-Final 1',
      awayPlaceholder: 'Winner Semi-Final 2',
      roundIndex: 4
    });
  }

  // --- 2. Round of 16 (16 Teams -> 8 in R16 -> 4 QF -> 2 SF -> Final) ---
  else if (totalAdvancing >= 16) {
    if (G === 6 && W === 4) {
      // Euro Format (6 groups, 12 direct + 4 best 3rd)
      const g = gList;
      const r16Pairs = [
        [`Winner ${g[0]}`, wildcardSlots[3] || 'Best 3rd Place #4 (Wildcard)'],
        [`Winner ${g[1]}`, wildcardSlots[2] || 'Best 3rd Place #3 (Wildcard)'],
        [`Winner ${g[2]}`, wildcardSlots[1] || 'Best 3rd Place #2 (Wildcard)'],
        [`Winner ${g[3]}`, wildcardSlots[0] || 'Best 3rd Place #1 (Wildcard)'],
        [`Winner ${g[4]}`, `2nd Place ${g[5]}`],
        [`Winner ${g[5]}`, `2nd Place ${g[4]}`],
        [`2nd Place ${g[0]}`, `2nd Place ${g[2]}`],
        [`2nd Place ${g[1]}`, `2nd Place ${g[3]}`]
      ];
      r16Pairs.forEach(([h, a], idx) => {
        addMatch({
          stage: 'round_of_16',
          fixtureRound: `Round of 16 Match ${idx + 1}`,
          homePlaceholder: h,
          awayPlaceholder: a,
          roundIndex: 0
        });
      });
    } else if (W > 0) {
      // General Wildcard Round of 16 (any group count with wildcard teams)
      const Mw = Math.min(W, 8);
      for (let i = 0; i < Mw; i++) {
        const homeGrp = gList[i % G] || `Group ${String.fromCharCode(65 + (i % 4))}`;
        addMatch({
          stage: 'round_of_16',
          fixtureRound: `Round of 16 Match ${i + 1}`,
          homePlaceholder: `Winner ${homeGrp}`,
          awayPlaceholder: wildcardSlots[Mw - 1 - i] || `Best 3rd Place #${Mw - i} (Wildcard)`,
          roundIndex: 0
        });
      }
      for (let i = Mw; i < 8; i++) {
        const homeGrp = (i < G) ? `Winner ${gList[i]}` : `2nd Place ${gList[(i - Mw) % G]}`;
        const awayGrp = `2nd Place ${gList[(i + 1) % G] || gList[0]}`;
        addMatch({
          stage: 'round_of_16',
          fixtureRound: `Round of 16 Match ${i + 1}`,
          homePlaceholder: homeGrp,
          awayPlaceholder: awayGrp,
          roundIndex: 0
        });
      }
    } else if (G === 8 && K >= 2) {
      // 8 groups (A-H), top 2 each
      const g = gList;
      const r16Pairs = [
        [`Winner ${g[0]}`, `2nd Place ${g[1]}`],
        [`Winner ${g[2]}`, `2nd Place ${g[3]}`],
        [`Winner ${g[4]}`, `2nd Place ${g[5]}`],
        [`Winner ${g[6]}`, `2nd Place ${g[7]}`],
        [`Winner ${g[1]}`, `2nd Place ${g[0]}`],
        [`Winner ${g[3]}`, `2nd Place ${g[2]}`],
        [`Winner ${g[5]}`, `2nd Place ${g[4]}`],
        [`Winner ${g[7]}`, `2nd Place ${g[6]}`]
      ];
      r16Pairs.forEach(([h, a], idx) => {
        addMatch({
          stage: 'round_of_16',
          fixtureRound: `Round of 16 Match ${idx + 1}`,
          homePlaceholder: h,
          awayPlaceholder: a,
          roundIndex: 0
        });
      });
    } else if (G === 4 && K >= 4) {
      // 4 groups (A-D), 4 advancing each
      const g = gList;
      const r16Pairs = [
        [`Winner ${g[0]}`, `4th Place ${g[1]}`],
        [`2nd Place ${g[2]}`, `3rd Place ${g[3]}`],
        [`Winner ${g[2]}`, `4th Place ${g[3]}`],
        [`2nd Place ${g[0]}`, `3rd Place ${g[1]}`],
        [`Winner ${g[1]}`, `4th Place ${g[0]}`],
        [`2nd Place ${g[3]}`, `3rd Place ${g[2]}`],
        [`Winner ${g[3]}`, `4th Place ${g[2]}`],
        [`2nd Place ${g[1]}`, `3rd Place ${g[0]}`]
      ];
      r16Pairs.forEach(([h, a], idx) => {
        addMatch({
          stage: 'round_of_16',
          fixtureRound: `Round of 16 Match ${idx + 1}`,
          homePlaceholder: h,
          awayPlaceholder: a,
          roundIndex: 0
        });
      });
    } else {
      // Generic 16 teams
      for (let i = 0; i < 8; i++) {
        const homeGrp = gList[i % G] || `Group ${String.fromCharCode(65 + (i % 4))}`;
        const awayGrp = gList[(i + 1) % G] || `Group ${String.fromCharCode(65 + ((i + 1) % 4))}`;
        const homePos = (Math.floor(i / G) % K) + 1;
        const awayPos = Math.min(K, (homePos === 1 ? 2 : 1));
        addMatch({
          stage: 'round_of_16',
          fixtureRound: `Round of 16 Match ${i + 1}`,
          homePlaceholder: homePos === 1 ? `Winner ${homeGrp}` : `${getOrdinal(homePos)} ${homeGrp}`,
          awayPlaceholder: `${getOrdinal(awayPos)} ${awayGrp}`,
          roundIndex: 0
        });
      }
    }

    // Quarter-Finals (4 matches from R16 winners)
    for (let i = 1; i <= 4; i++) {
      addMatch({
        stage: 'quarter_final',
        fixtureRound: `Quarter-Final ${i}`,
        homePlaceholder: `Winner Round of 16 Match ${2 * i - 1}`,
        awayPlaceholder: `Winner Round of 16 Match ${2 * i}`,
        roundIndex: 1
      });
    }

    // Semi-Finals (2 matches)
    addMatch({
      stage: 'semi_final',
      fixtureRound: 'Semi-Final 1',
      homePlaceholder: 'Winner Quarter-Final 1',
      awayPlaceholder: 'Winner Quarter-Final 2',
      roundIndex: 2
    });
    addMatch({
      stage: 'semi_final',
      fixtureRound: 'Semi-Final 2',
      homePlaceholder: 'Winner Quarter-Final 3',
      awayPlaceholder: 'Winner Quarter-Final 4',
      roundIndex: 2
    });

    // 3rd Place Playoff
    addMatch({
      stage: 'third_place',
      fixtureRound: '3rd Place Playoff',
      homePlaceholder: 'Loser Semi-Final 1',
      awayPlaceholder: 'Loser Semi-Final 2',
      roundIndex: 3
    });

    // Grand Final
    addMatch({
      stage: 'final',
      fixtureRound: 'Grand Final',
      homePlaceholder: 'Winner Semi-Final 1',
      awayPlaceholder: 'Winner Semi-Final 2',
      roundIndex: 3
    });
  }

  // --- 3. Quarter-Finals (8 Teams -> 4 QF -> 2 SF -> Final) ---
  else if (totalAdvancing >= 8) {
    if (G === 4 && K >= 2) {
      // 4 groups (A-D), top 2 each
      const g = gList;
      addMatch({
        stage: 'quarter_final',
        fixtureRound: 'Quarter-Final 1',
        homePlaceholder: `Winner ${g[0]}`,
        awayPlaceholder: `2nd Place ${g[1]}`,
        roundIndex: 0
      });
      addMatch({
        stage: 'quarter_final',
        fixtureRound: 'Quarter-Final 2',
        homePlaceholder: `Winner ${g[2]}`,
        awayPlaceholder: `2nd Place ${g[3]}`,
        roundIndex: 0
      });
      addMatch({
        stage: 'quarter_final',
        fixtureRound: 'Quarter-Final 3',
        homePlaceholder: `Winner ${g[1]}`,
        awayPlaceholder: `2nd Place ${g[0]}`,
        roundIndex: 0
      });
      addMatch({
        stage: 'quarter_final',
        fixtureRound: 'Quarter-Final 4',
        homePlaceholder: `Winner ${g[3]}`,
        awayPlaceholder: `2nd Place ${g[2]}`,
        roundIndex: 0
      });
    } else if (G === 2 && K >= 4) {
      // 2 groups (A & B), top 4 each
      const g = gList;
      addMatch({
        stage: 'quarter_final',
        fixtureRound: 'Quarter-Final 1',
        homePlaceholder: `Winner ${g[0]}`,
        awayPlaceholder: `4th Place ${g[1]}`,
        roundIndex: 0
      });
      addMatch({
        stage: 'quarter_final',
        fixtureRound: 'Quarter-Final 2',
        homePlaceholder: `2nd Place ${g[0]}`,
        awayPlaceholder: `3rd Place ${g[1]}`,
        roundIndex: 0
      });
      addMatch({
        stage: 'quarter_final',
        fixtureRound: 'Quarter-Final 3',
        homePlaceholder: `Winner ${g[1]}`,
        awayPlaceholder: `4th Place ${g[0]}`,
        roundIndex: 0
      });
      addMatch({
        stage: 'quarter_final',
        fixtureRound: 'Quarter-Final 4',
        homePlaceholder: `2nd Place ${g[1]}`,
        awayPlaceholder: `3rd Place ${g[0]}`,
        roundIndex: 0
      });
    } else if (G === 3 && W === 2) {
      // 3 groups, top 2 + 2 best 3rds
      const g = gList;
      addMatch({
        stage: 'quarter_final',
        fixtureRound: 'Quarter-Final 1',
        homePlaceholder: `Winner ${g[0]}`,
        awayPlaceholder: wildcardSlots[1] || 'Best 3rd Place #2 (Wildcard)',
        roundIndex: 0
      });
      addMatch({
        stage: 'quarter_final',
        fixtureRound: 'Quarter-Final 2',
        homePlaceholder: `Winner ${g[1]}`,
        awayPlaceholder: wildcardSlots[0] || 'Best 3rd Place #1 (Wildcard)',
        roundIndex: 0
      });
      addMatch({
        stage: 'quarter_final',
        fixtureRound: 'Quarter-Final 3',
        homePlaceholder: `Winner ${g[2]}`,
        awayPlaceholder: `2nd Place ${g[0]}`,
        roundIndex: 0
      });
      addMatch({
        stage: 'quarter_final',
        fixtureRound: 'Quarter-Final 4',
        homePlaceholder: `2nd Place ${g[1]}`,
        awayPlaceholder: `2nd Place ${g[2]}`,
        roundIndex: 0
      });
    } else if (W > 0) {
      // General Wildcard Quarter-Finals (pair group winners with wildcards)
      const Mw = Math.min(W, 4);
      for (let i = 0; i < Mw; i++) {
        const homeGrp = gList[i % G] || `Group ${String.fromCharCode(65 + i)}`;
        addMatch({
          stage: 'quarter_final',
          fixtureRound: `Quarter-Final ${i + 1}`,
          homePlaceholder: `Winner ${homeGrp}`,
          awayPlaceholder: wildcardSlots[Mw - 1 - i] || `Best 3rd Place #${Mw - i} (Wildcard)`,
          roundIndex: 0
        });
      }
      for (let i = Mw; i < 4; i++) {
        const homeGrp = (i < G) ? `Winner ${gList[i]}` : `2nd Place ${gList[i % G]}`;
        const awayGrp = `2nd Place ${gList[(i + 1) % G] || gList[0]}`;
        addMatch({
          stage: 'quarter_final',
          fixtureRound: `Quarter-Final ${i + 1}`,
          homePlaceholder: homeGrp,
          awayPlaceholder: awayGrp,
          roundIndex: 0
        });
      }
    } else if (G === 8 && K === 1) {
      // 8 groups, winners only
      const g = gList;
      for (let i = 0; i < 4; i++) {
        addMatch({
          stage: 'quarter_final',
          fixtureRound: `Quarter-Final ${i + 1}`,
          homePlaceholder: `Winner ${g[2 * i]}`,
          awayPlaceholder: `Winner ${g[2 * i + 1]}`,
          roundIndex: 0
        });
      }
    } else {
      // Generic 8 teams
      for (let i = 0; i < 4; i++) {
        const hG = gList[i % G] || `Group ${String.fromCharCode(65 + i)}`;
        const aG = gList[(i + 1) % G] || `Group ${String.fromCharCode(65 + ((i + 1) % 4))}`;
        addMatch({
          stage: 'quarter_final',
          fixtureRound: `Quarter-Final ${i + 1}`,
          homePlaceholder: `Winner ${hG}`,
          awayPlaceholder: `2nd Place ${aG}`,
          roundIndex: 0
        });
      }
    }

    // Semi-Finals (2 matches)
    addMatch({
      stage: 'semi_final',
      fixtureRound: 'Semi-Final 1',
      homePlaceholder: 'Winner Quarter-Final 1',
      awayPlaceholder: 'Winner Quarter-Final 2',
      roundIndex: 1
    });
    addMatch({
      stage: 'semi_final',
      fixtureRound: 'Semi-Final 2',
      homePlaceholder: 'Winner Quarter-Final 3',
      awayPlaceholder: 'Winner Quarter-Final 4',
      roundIndex: 1
    });

    // 3rd Place Playoff
    addMatch({
      stage: 'third_place',
      fixtureRound: '3rd Place Playoff',
      homePlaceholder: 'Loser Semi-Final 1',
      awayPlaceholder: 'Loser Semi-Final 2',
      roundIndex: 2
    });

    // Grand Final
    addMatch({
      stage: 'final',
      fixtureRound: 'Grand Final',
      homePlaceholder: 'Winner Semi-Final 1',
      awayPlaceholder: 'Winner Semi-Final 2',
      roundIndex: 2
    });
  }

  // --- 4. Special 6 Teams Format (Playoff Round into Semi-Finals) ---
  else if (totalAdvancing === 6) {
    const g = gList;
    if (W > 0) {
      addMatch({
        stage: 'playoff',
        fixtureRound: 'Playoff 1',
        homePlaceholder: `2nd Place ${g[0] || 'Group A'}`,
        awayPlaceholder: wildcardSlots[W > 1 ? 1 : 0] || 'Best 3rd Place #2 (Wildcard)',
        roundIndex: 0
      });
      addMatch({
        stage: 'playoff',
        fixtureRound: 'Playoff 2',
        homePlaceholder: `2nd Place ${g[1 % G] || 'Group B'}`,
        awayPlaceholder: wildcardSlots[0] || 'Best 3rd Place #1 (Wildcard)',
        roundIndex: 0
      });
    } else {
      addMatch({
        stage: 'playoff',
        fixtureRound: 'Playoff 1',
        homePlaceholder: `2nd Place ${g[0] || 'Group A'}`,
        awayPlaceholder: `3rd Place ${g[1 % G] || 'Group B'}`,
        roundIndex: 0
      });
      addMatch({
        stage: 'playoff',
        fixtureRound: 'Playoff 2',
        homePlaceholder: `2nd Place ${g[1 % G] || 'Group B'}`,
        awayPlaceholder: `3rd Place ${g[0] || 'Group A'}`,
        roundIndex: 0
      });
    }

    // Semi-Finals (Group winners receive Byes)
    addMatch({
      stage: 'semi_final',
      fixtureRound: 'Semi-Final 1',
      homePlaceholder: `Winner ${g[0] || 'Group A'}`,
      awayPlaceholder: 'Winner Playoff 2',
      roundIndex: 1
    });
    addMatch({
      stage: 'semi_final',
      fixtureRound: 'Semi-Final 2',
      homePlaceholder: `Winner ${g[1 % G] || 'Group B'}`,
      awayPlaceholder: 'Winner Playoff 1',
      roundIndex: 1
    });

    // 3rd Place Playoff
    addMatch({
      stage: 'third_place',
      fixtureRound: '3rd Place Playoff',
      homePlaceholder: 'Loser Semi-Final 1',
      awayPlaceholder: 'Loser Semi-Final 2',
      roundIndex: 2
    });

    // Grand Final
    addMatch({
      stage: 'final',
      fixtureRound: 'Grand Final',
      homePlaceholder: 'Winner Semi-Final 1',
      awayPlaceholder: 'Winner Semi-Final 2',
      roundIndex: 2
    });
  }

  // --- 5. Semi-Finals (4 Teams -> 2 SF -> Final) ---
  else if (totalAdvancing >= 4) {
    if (W > 0) {
      addMatch({
        stage: 'semi_final',
        fixtureRound: 'Semi-Final 1',
        homePlaceholder: `Winner ${gList[0] || 'Group A'}`,
        awayPlaceholder: wildcardSlots[W > 1 ? 1 : 0] || 'Best 3rd Place #1 (Wildcard)',
        roundIndex: 0
      });
      addMatch({
        stage: 'semi_final',
        fixtureRound: 'Semi-Final 2',
        homePlaceholder: `Winner ${gList[1 % G] || 'Group B'}`,
        awayPlaceholder: W >= 2 ? (wildcardSlots[0] || 'Best 3rd Place #2 (Wildcard)') : `2nd Place ${gList[0] || 'Group A'}`,
        roundIndex: 0
      });
    } else if (G === 2 && K >= 2) {
      const g = gList;
      addMatch({
        stage: 'semi_final',
        fixtureRound: 'Semi-Final 1',
        homePlaceholder: `Winner ${g[0]}`,
        awayPlaceholder: `2nd Place ${g[1]}`,
        roundIndex: 0
      });
      addMatch({
        stage: 'semi_final',
        fixtureRound: 'Semi-Final 2',
        homePlaceholder: `Winner ${g[1]}`,
        awayPlaceholder: `2nd Place ${g[0]}`,
        roundIndex: 0
      });
    } else if (G === 4 && K === 1) {
      const g = gList;
      addMatch({
        stage: 'semi_final',
        fixtureRound: 'Semi-Final 1',
        homePlaceholder: `Winner ${g[0]}`,
        awayPlaceholder: `Winner ${g[1]}`,
        roundIndex: 0
      });
      addMatch({
        stage: 'semi_final',
        fixtureRound: 'Semi-Final 2',
        homePlaceholder: `Winner ${g[2]}`,
        awayPlaceholder: `Winner ${g[3]}`,
        roundIndex: 0
      });
    } else if (G === 1) {
      const g = gList[0] || 'Group A';
      addMatch({
        stage: 'semi_final',
        fixtureRound: 'Semi-Final 1',
        homePlaceholder: `1st Place ${g}`,
        awayPlaceholder: `4th Place ${g}`,
        roundIndex: 0
      });
      addMatch({
        stage: 'semi_final',
        fixtureRound: 'Semi-Final 2',
        homePlaceholder: `2nd Place ${g}`,
        awayPlaceholder: `3rd Place ${g}`,
        roundIndex: 0
      });
    } else {
      for (let i = 0; i < 2; i++) {
        addMatch({
          stage: 'semi_final',
          fixtureRound: `Semi-Final ${i + 1}`,
          homePlaceholder: `Winner ${gList[i * 2] || 'Group A'}`,
          awayPlaceholder: `Winner ${gList[i * 2 + 1] || 'Group B'}`,
          roundIndex: 0
        });
      }
    }

    // 3rd Place Playoff
    addMatch({
      stage: 'third_place',
      fixtureRound: '3rd Place Playoff',
      homePlaceholder: 'Loser Semi-Final 1',
      awayPlaceholder: 'Loser Semi-Final 2',
      roundIndex: 1
    });

    // Grand Final
    addMatch({
      stage: 'final',
      fixtureRound: 'Grand Final',
      homePlaceholder: 'Winner Semi-Final 1',
      awayPlaceholder: 'Winner Semi-Final 2',
      roundIndex: 1
    });
  }

  // --- 6. Direct Grand Final (2 Teams) ---
  else {
    const g = gList;
    if (G >= 2) {
      addMatch({
        stage: 'final',
        fixtureRound: 'Grand Final',
        homePlaceholder: `Winner ${g[0]}`,
        awayPlaceholder: `Winner ${g[1]}`,
        roundIndex: 0
      });
    } else {
      const grp = g[0] || 'Group A';
      addMatch({
        stage: 'final',
        fixtureRound: 'Grand Final',
        homePlaceholder: `1st Place ${grp}`,
        awayPlaceholder: `2nd Place ${grp}`,
        roundIndex: 0
      });
    }
  }

  // Flexible Scheduling: matches per day + rest days between rounds
  const effectiveMatchesPerDay = Math.max(1, matchesPerDay || 2);
  const effectiveRestDays = Math.max(0, restDaysBetweenRounds !== undefined ? restDaysBetweenRounds : (intervalDays ? Math.max(0, intervalDays - 1) : 2));
  const timeGapHours = typeof matchTimeGapHours === 'number' ? matchTimeGapHours : 2;

  const startDt = new Date(startDate);
  const baseHours = isNaN(startDt.getHours()) ? 16 : startDt.getHours();
  const baseMinutes = isNaN(startDt.getMinutes()) ? 0 : startDt.getMinutes();
  let dayOffset = 0;

  // Group raw matches by roundIndex (in ascending order)
  const roundIndices = Array.from(new Set(rawMatches.map(m => m.roundIndex))).sort((a, b) => a - b);
  const generatedMatches: any[] = [];

  roundIndices.forEach(rIdx => {
    const stageMatches = rawMatches.filter(m => m.roundIndex === rIdx);
    const totalDaysForStage = Math.ceil(stageMatches.length / effectiveMatchesPerDay);

    stageMatches.forEach((opts, mIdx) => {
      const dayInStage = Math.floor(mIdx / effectiveMatchesPerDay);
      const slotInDay = mIdx % effectiveMatchesPerDay;

      const matchDate = new Date(startDt.getTime());
      matchDate.setDate(matchDate.getDate() + dayOffset + dayInStage);
      matchDate.setHours(baseHours + slotInDay * timeGapHours, baseMinutes, 0, 0);

      generatedMatches.push({
        leagueId,
        leagueName,
        groupName: 'Knockout Stage',
        stage: opts.stage,
        homePlaceholder: opts.homePlaceholder,
        awayPlaceholder: opts.awayPlaceholder,
        homeTeamName: opts.homePlaceholder,
        awayTeamName: opts.awayPlaceholder,
        opponent: opts.awayPlaceholder,
        matchNumber: `Match #${curMatchNum++}`,
        fixtureRound: opts.fixtureRound,
        location,
        status: 'scheduled',
        date: matchDate,
        matchType: 'league'
      });
    });

    dayOffset += totalDaysForStage + effectiveRestDays;
  });

  return { 
    generatedMatches, 
    nextMatchNumberStart: curMatchNum,
    totalAdvancingTeams: totalAdvancing,
    wildcardCount: W,
    totalDaysNeeded: dayOffset
  };
}

// Helper to parse regular score and penalty shootout results, determining winner and loser
function resolveMatchWinnerAndLoser(match: Match): {
  isCompleted: boolean;
  winnerName: string | null;
  loserName: string | null;
  homeScore: number | null;
  awayScore: number | null;
  wentToPenalties: boolean;
  homePens: number | null;
  awayPens: number | null;
  winnerSide: 'home' | 'away' | null;
} {
  const homeName = match.homeResolvedTeam || match.homeTeamName || 'Home Team';
  const awayName = match.awayResolvedTeam || match.awayTeamName || match.opponent || 'Away Team';
  
  if (!match.score || !match.score.includes('-')) {
    return {
      isCompleted: false,
      winnerName: null,
      loserName: null,
      homeScore: null,
      awayScore: null,
      wentToPenalties: false,
      homePens: null,
      awayPens: null,
      winnerSide: null
    };
  }

  const raw = match.score.trim();
  let homeReg: number | null = null;
  let awayReg: number | null = null;
  let wentToPenalties = false;
  let homePens: number | null = null;
  let awayPens: number | null = null;

  // Check for parenthetical penalty score format: e.g. "1-1 (4-3 pens)" or "2 - 2 (5 - 4 p)" or "0-0 (3-2)"
  const parenMatch = raw.match(/^(\d+)\s*-\s*(\d+)\s*\((?:pens?\s*)?(\d+)\s*-\s*(\d+)(?:\s*pens?|\s*p)?\)/i);
  if (parenMatch) {
    homeReg = parseInt(parenMatch[1]);
    awayReg = parseInt(parenMatch[2]);
    wentToPenalties = true;
    homePens = parseInt(parenMatch[3]);
    awayPens = parseInt(parenMatch[4]);
  } else {
    const simple = raw.match(/^(\d+)\s*-\s*(\d+)/);
    if (!simple) {
      return { isCompleted: false, winnerName: null, loserName: null, homeScore: null, awayScore: null, wentToPenalties: false, homePens: null, awayPens: null, winnerSide: null };
    }
    homeReg = parseInt(simple[1]);
    awayReg = parseInt(simple[2]);

    if (match.penaltyScore && match.penaltyScore.includes('-')) {
      const pParts = match.penaltyScore.split('-').map(s => parseInt(s.trim()));
      if (pParts.length === 2 && !isNaN(pParts[0]) && !isNaN(pParts[1])) {
        wentToPenalties = true;
        homePens = pParts[0];
        awayPens = pParts[1];
      }
    }
  }

  let winnerSide: 'home' | 'away' | null = null;
  if (homeReg !== null && awayReg !== null) {
    if (homeReg > awayReg) {
      winnerSide = 'home';
    } else if (awayReg > homeReg) {
      winnerSide = 'away';
    } else if (wentToPenalties && homePens !== null && awayPens !== null) {
      if (homePens > awayPens) winnerSide = 'home';
      else if (awayPens > homePens) winnerSide = 'away';
    }
  }

  return {
    isCompleted: true,
    winnerName: winnerSide === 'home' ? homeName : winnerSide === 'away' ? awayName : null,
    loserName: winnerSide === 'home' ? awayName : winnerSide === 'away' ? homeName : null,
    homeScore: homeReg,
    awayScore: awayReg,
    wentToPenalties,
    homePens,
    awayPens,
    winnerSide
  };
}

// Helper to resolve knockout bracket placeholders dynamically from group standings, cross-group rankings, or previous rounds
function parseAndResolvePlaceholder(
  placeholder: string | undefined, 
  groupStandings: Record<string, { standings: any[]; isCompleted: boolean; totalMatches: number; completedMatches: number }>,
  allMatches: Match[]
): {
  resolvedName: string | null;
  status: 'confirmed' | 'provisional' | 'unresolved';
  label: string;
  sourceText: string;
} {
  if (!placeholder) return { resolvedName: null, status: 'unresolved', label: '', sourceText: '' };
  
  const text = placeholder.trim();

  // 1. Cross-Group "Best 3rd Place" / "Best Loser" / "Wildcard" (e.g. "Best 3rd Place #1 (Wildcard)", "Best 3rd Place #1", "Wildcard #1", "Best Loser #2")
  const wildcardDirectMatch = text.match(/^Wildcard\s*(?:Team\s*)?#?(\d+)/i);
  const best3rdMatch = text.match(/^(?:(?:(1st|2nd|3rd|4th)\s+)?Best\s+(3rd(?: Place)?|Third(?: Place)?|Loser)(?:\s+#?(\d+))?)/i);
  if (wildcardDirectMatch || best3rdMatch) {
    let rankIdx = 1;
    if (wildcardDirectMatch && wildcardDirectMatch[1]) {
      rankIdx = parseInt(wildcardDirectMatch[1]) || 1;
    } else if (best3rdMatch) {
      if (best3rdMatch[3]) rankIdx = parseInt(best3rdMatch[3]) || 1;
      else if (best3rdMatch[1]) {
        const ord = best3rdMatch[1].toLowerCase();
        rankIdx = ord === '1st' ? 1 : ord === '2nd' ? 2 : ord === '3rd' ? 3 : 4;
      }
    }

    const { rankings, allGroupsCompleted } = computeCrossGroupRankings(groupStandings, 2);
    if (rankings.length >= rankIdx) {
      const target = rankings[rankIdx - 1];
      return {
        resolvedName: target.teamName,
        status: allGroupsCompleted ? 'confirmed' : 'provisional',
        label: allGroupsCompleted ? `Best 3rd #${rankIdx} (${target.groupName})` : `Current Best 3rd #${rankIdx} (${target.groupName})`,
        sourceText: placeholder
      };
    }
  }

  // Cross-Group Best Runner-up / Best 2nd Place
  const bestRunnerUpMatch = text.match(/^Best\s+(?:Runner-?up|2nd(?: Place)?)(?:\s+#?(\d+))?/i);
  if (bestRunnerUpMatch) {
    const rankIdx = bestRunnerUpMatch[1] ? (parseInt(bestRunnerUpMatch[1]) || 1) : 1;
    const { rankings, allGroupsCompleted } = computeCrossGroupRankings(groupStandings, 1);
    if (rankings.length >= rankIdx) {
      const target = rankings[rankIdx - 1];
      return {
        resolvedName: target.teamName,
        status: allGroupsCompleted ? 'confirmed' : 'provisional',
        label: allGroupsCompleted ? `Best Runner-up #${rankIdx} (${target.groupName})` : `Current Best 2nd #${rankIdx} (${target.groupName})`,
        sourceText: placeholder
      };
    }
  }

  // 2. Specific Group Positional Match (1st, 2nd, 3rd, 4th, 5th place in a group)
  const posRegexes = [
    { regex: /^(?:Winner|1st(?: Place)?|First(?: Place)?)\s+(?:of\s+)?(Group\s+[A-Za-z0-9]+|[A-Za-z0-9 ]+)/i, pos: 0, title: 'Winner' },
    { regex: /^(?:2nd(?: Place)?|Second(?: Place)?|Runner-?up)\s+(?:of\s+)?(Group\s+[A-Za-z0-9]+|[A-Za-z0-9 ]+)/i, pos: 1, title: '2nd Place' },
    { regex: /^(?:3rd(?: Place)?|Third(?: Place)?)\s+(?:of\s+)?(Group\s+[A-Za-z0-9]+|[A-Za-z0-9 ]+)/i, pos: 2, title: '3rd Place' },
    { regex: /^(?:4th(?: Place)?|Fourth(?: Place)?)\s+(?:of\s+)?(Group\s+[A-Za-z0-9]+|[A-Za-z0-9 ]+)/i, pos: 3, title: '4th Place' },
    { regex: /^(?:5th(?: Place)?|Fifth(?: Place)?)\s+(?:of\s+)?(Group\s+[A-Za-z0-9]+|[A-Za-z0-9 ]+)/i, pos: 4, title: '5th Place' }
  ];

  for (const { regex, pos, title } of posRegexes) {
    const match = text.match(regex);
    if (match) {
      const grp = match[1].trim();
      const foundGrpKey = Object.keys(groupStandings).find(k => 
        k.toLowerCase() === grp.toLowerCase() || 
        grp.toLowerCase().includes(k.toLowerCase()) || 
        k.toLowerCase().includes(grp.toLowerCase())
      );
      if (foundGrpKey && groupStandings[foundGrpKey]?.standings.length > pos) {
        const targetTeam = groupStandings[foundGrpKey].standings[pos];
        const isComplete = groupStandings[foundGrpKey].isCompleted;
        return {
          resolvedName: targetTeam.teamName,
          status: isComplete ? 'confirmed' : 'provisional',
          label: isComplete ? `${title} ${foundGrpKey}` : `Current ${title} ${foundGrpKey}`,
          sourceText: placeholder
        };
      }
    }
  }

  // 3. Match Number Winner / Loser Reference (e.g. "Winner Match #201", "Winner Match 201", "Loser Match #202")
  const matchNumWinnerRegex = /^(Winner|Loser)\s+(?:of\s+)?(?:Match\s*#?\s*(\d+|[A-Za-z0-9-_]+))/i;
  const matchNumMatch = text.match(matchNumWinnerRegex);
  if (matchNumMatch) {
    const isWinner = matchNumMatch[1].toLowerCase() === 'winner';
    const matchIdOrNum = matchNumMatch[2].trim().toLowerCase();

    const foundMatch = allMatches.find(m => {
      if (m.id && m.id.toLowerCase() === matchIdOrNum) return true;
      if (m.matchNumber) {
        const cleanMNum = m.matchNumber.toLowerCase().replace(/[\s#]+/g, '');
        const cleanQuery = matchIdOrNum.replace(/[\s#]+/g, '');
        return cleanMNum === cleanQuery || cleanMNum.includes(cleanQuery) || cleanMNum === `match${cleanQuery}`;
      }
      return false;
    });

    if (foundMatch) {
      const outcome = resolveMatchWinnerAndLoser(foundMatch);
      if (outcome.isCompleted) {
        const resolvedName = isWinner ? outcome.winnerName : outcome.loserName;
        if (resolvedName) {
          const penSuffix = outcome.wentToPenalties ? ` (${outcome.homePens}-${outcome.awayPens} pens)` : '';
          return {
            resolvedName,
            status: 'confirmed',
            label: `${isWinner ? 'Winner' : 'Loser'} ${foundMatch.matchNumber || foundMatch.fixtureRound}${penSuffix}`,
            sourceText: placeholder
          };
        }
      }
    }
  }

  // 4. Previous Round Winner by Stage/Round Name (e.g. Winner Round of 32 Match 1, Winner Quarter-Final 1, Winner Semi-Final 1, Winner Playoff 1, Winner Round of 16 Match 1)
  const prevWinnerMatch = text.match(/^Winner\s+(?:of\s+)?(Round\s*of\s*32\s*(?:Match\s*)?\d+|R32\s*\d+|Round\s*of\s*16\s*(?:Match\s*)?\d+|R16\s*\d+|Quarter-Final\s*\d+|QF\s*\d+|Semi-Final\s*\d+|SF\s*\d+|Playoff\s*\d+|Preliminary\s*\d+)/i);
  if (prevWinnerMatch) {
    const roundQuery = prevWinnerMatch[1].toLowerCase().replace(/[\s-_]+/g, '');
    const foundMatch = allMatches.find(m => {
      const mRound = (m.fixtureRound || '').toLowerCase().replace(/[\s-_]+/g, '');
      return mRound === roundQuery || mRound.includes(roundQuery);
    });

    if (foundMatch) {
      const outcome = resolveMatchWinnerAndLoser(foundMatch);
      if (outcome.isCompleted && outcome.winnerName) {
        const penSuffix = outcome.wentToPenalties ? ` (${outcome.homePens}-${outcome.awayPens} pens)` : '';
        return {
          resolvedName: outcome.winnerName,
          status: 'confirmed',
          label: `Winner of ${foundMatch.fixtureRound || 'Match'}${penSuffix}`,
          sourceText: placeholder
        };
      }
    }
  }

  // 5. Previous Round Loser by Stage/Round Name (e.g. Loser Semi-Final 1, Loser Playoff 1, Loser Round of 32 Match 1)
  const prevLoserMatch = text.match(/^Loser\s+(?:of\s+)?(Round\s*of\s*32\s*(?:Match\s*)?\d+|R32\s*\d+|Round\s*of\s*16\s*(?:Match\s*)?\d+|R16\s*\d+|Quarter-Final\s*\d+|QF\s*\d+|Semi-Final\s*\d+|SF\s*\d+|Playoff\s*\d+|Preliminary\s*\d+)/i);
  if (prevLoserMatch) {
    const roundQuery = prevLoserMatch[1].toLowerCase().replace(/[\s-_]+/g, '');
    const foundMatch = allMatches.find(m => (m.fixtureRound || '').toLowerCase().replace(/[\s-_]+/g, '') === roundQuery);
    if (foundMatch) {
      const outcome = resolveMatchWinnerAndLoser(foundMatch);
      if (outcome.isCompleted && outcome.loserName) {
        const penSuffix = outcome.wentToPenalties ? ` (${outcome.homePens}-${outcome.awayPens} pens)` : '';
        return {
          resolvedName: outcome.loserName,
          status: 'confirmed',
          label: `Loser of ${foundMatch.fixtureRound || 'Match'}${penSuffix}`,
          sourceText: placeholder
        };
      }
    }
  }

  return { resolvedName: null, status: 'unresolved', label: text, sourceText: placeholder };
}

// --- League Standings / Table Section ---
function LeagueTableSection({ 
  matches, 
  leagues, 
  activeTeamId, 
  teams,
  role 
}: { 
  matches: Match[]; 
  leagues: League[]; 
  activeTeamId?: string | null; 
  teams: Team[];
  role?: string;
}) {
  const [selectedLeagueId, setSelectedLeagueId] = useState<string>('all');
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'standings' | 'knockouts'>('standings');
  const [isGeneratingKnockouts, setIsGeneratingKnockouts] = useState(false);
  const [isGenKnockoutModalOpen, setIsGenKnockoutModalOpen] = useState(false);
  const [advancementFormatForModal, setAdvancementFormatForModal] = useState<'top_1' | 'top_2' | 'top_3' | 'top_2_plus_best_3rd' | 'top_4' | 'custom'>('top_2');
  const [modalQualifiersPerGroup, setModalQualifiersPerGroup] = useState<number>(2);
  const [modalWildcardCount, setModalWildcardCount] = useState<number>(4);
  const [modalCustomAdvancingTotal, setModalCustomAdvancingTotal] = useState<string>('');
  const [modalCustomRuleText, setModalCustomRuleText] = useState<string>('');
  const [isSyncingKnockouts, setIsSyncingKnockouts] = useState(false);

  // Knockout scheduling configuration state
  const [modalStartDate, setModalStartDate] = useState(() => {
    const d = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    d.setHours(16, 0, 0, 0);
    return d.toISOString().slice(0, 16);
  });
  const [modalMatchesPerDay, setModalMatchesPerDay] = useState<number>(2);
  const [modalRestDaysBetweenRounds, setModalRestDaysBetweenRounds] = useState<number>(2);
  const [modalMatchTimeGapHours, setModalMatchTimeGapHours] = useState<number>(2);
  const [modalLocation, setModalLocation] = useState<string>('Main Stadium');

  // Quick Knockout Schedule & Stadium Editor State
  const [editingKnockoutSchedule, setEditingKnockoutSchedule] = useState<Match | null>(null);
  const [editKnockoutDate, setEditKnockoutDate] = useState<string>('');
  const [editKnockoutStadium, setEditKnockoutStadium] = useState<string>('');
  const [isSavingKnockoutSchedule, setIsSavingKnockoutSchedule] = useState(false);

  // Sync league-saved advancement settings when selectedLeagueId changes
  useEffect(() => {
    if (selectedLeagueId && selectedLeagueId !== 'all') {
      const curLeague = leagues.find(l => l.id === selectedLeagueId);
      if (curLeague) {
        if (curLeague.advancementFormat) {
          setAdvancementFormatForModal(curLeague.advancementFormat as any);
        }
        if (curLeague.wildcardCount !== undefined) {
          setModalWildcardCount(curLeague.wildcardCount);
        }
        if (curLeague.totalAdvancing !== undefined) {
          setModalCustomAdvancingTotal(String(curLeague.totalAdvancing));
        }
      }
    }
  }, [selectedLeagueId, leagues]);

  // Score & Penalty Shootout State
  const [scoreEditMatch, setScoreEditMatch] = useState<Match | null>(null);
  const [scoreHomeFT, setScoreHomeFT] = useState('');
  const [scoreAwayFT, setScoreAwayFT] = useState('');
  const [hasPenalties, setHasPenalties] = useState(false);
  const [scoreHomePens, setScoreHomePens] = useState('');
  const [scoreAwayPens, setScoreAwayPens] = useState('');
  const [isUpdatingScore, setIsUpdatingScore] = useState(false);
  const [isDeletingFixtureId, setIsDeletingFixtureId] = useState<string | null>(null);

  // Manual Bracket Slot Override State
  const [slotEditState, setSlotEditState] = useState<{
    match: Match;
    slot: 'home' | 'away';
    currentName: string;
    placeholder?: string | null;
  } | null>(null);
  const [selectedSlotTeam, setSelectedSlotTeam] = useState('');
  const [customSlotName, setCustomSlotName] = useState('');
  const [isSavingSlot, setIsSavingSlot] = useState(false);

  // Add Custom Knockout Fixture State
  const [isAddKnockoutModalOpen, setIsAddKnockoutModalOpen] = useState(false);
  const [newFixtureStage, setNewFixtureStage] = useState<string>('playoff');
  const [newFixtureCustomStage, setNewFixtureCustomStage] = useState('');
  const [newFixtureMatchNum, setNewFixtureMatchNum] = useState('');
  const [newFixtureHomeType, setNewFixtureHomeType] = useState<'team' | 'rule' | 'custom'>('rule');
  const [newFixtureHomeTeam, setNewFixtureHomeTeam] = useState('');
  const [newFixtureHomeRule, setNewFixtureHomeRule] = useState('');
  const [newFixtureHomeCustom, setNewFixtureHomeCustom] = useState('');
  const [newFixtureAwayType, setNewFixtureAwayType] = useState<'team' | 'rule' | 'custom'>('rule');
  const [newFixtureAwayTeam, setNewFixtureAwayTeam] = useState('');
  const [newFixtureAwayRule, setNewFixtureAwayRule] = useState('');
  const [newFixtureAwayCustom, setNewFixtureAwayCustom] = useState('');
  const [newFixtureDate, setNewFixtureDate] = useState(() => {
    const d = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    return d.toISOString().split('T')[0];
  });
  const [newFixtureTime, setNewFixtureTime] = useState('18:00');
  const [newFixtureLocation, setNewFixtureLocation] = useState('Main Stadium');
  const [isCreatingCustomFixture, setIsCreatingCustomFixture] = useState(false);

  const tableRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isDeletingLeague, setIsDeletingLeague] = useState(false);

  const activeTeam = teams.find(t => t.id === activeTeamId);
  const myTeamName = activeTeam ? activeTeam.name : 'My Squad';

  // Filter matches by league if selected
  const relevantMatches = matches.filter(m => {
    if (m.matchType === 'friendly') return false;
    if (selectedLeagueId !== 'all') {
      return m.leagueId === selectedLeagueId || m.leagueName === selectedLeagueId;
    }
    return true;
  });

  // Separate group stage matches vs knockout matches
  const groupStageMatches = relevantMatches.filter(m => {
    return m.stage !== 'round_of_32' &&
      m.stage !== 'round_of_16' &&
      m.stage !== 'quarter_final' && 
      m.stage !== 'semi_final' && 
      m.stage !== 'final' && 
      m.stage !== 'third_place' && 
      m.stage !== 'playoff' &&
      m.stage !== 'preliminary' &&
      m.groupName !== 'Knockout Stage';
  });

  const knockoutMatches = relevantMatches.filter(m => {
    return m.stage === 'round_of_32' ||
      m.stage === 'round_of_16' ||
      m.stage === 'quarter_final' || 
      m.stage === 'semi_final' || 
      m.stage === 'final' || 
      m.stage === 'third_place' || 
      m.stage === 'playoff' ||
      m.stage === 'preliminary' ||
      m.groupName === 'Knockout Stage' ||
      Boolean(m.homePlaceholder || m.awayPlaceholder);
  });

  // Extract unique groups in this league
  const groupsInLeague = (Array.from(
    new Set(groupStageMatches.map(m => m.groupName).filter(Boolean))
  ) as string[]).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

  // Compute standings per group
  const groupStandingsMap: Record<string, { standings: any[]; isCompleted: boolean; totalMatches: number; completedMatches: number }> = {};
  
  groupsInLeague.forEach(grp => {
    const grpMatches = groupStageMatches.filter(m => m.groupName === grp);
    const grpTeams = Array.from(new Set(grpMatches.flatMap(m => [m.homeTeamName, m.awayTeamName, m.opponent]).filter(Boolean))) as string[];
    const standings = computeStandings(grpMatches, myTeamName, grpTeams);
    const completedCount = grpMatches.filter(m => m.score && m.score.includes('-') && m.status !== 'postponed').length;
    const isCompleted = grpMatches.length > 0 && completedCount === grpMatches.length;

    groupStandingsMap[grp] = {
      standings,
      isCompleted,
      totalMatches: grpMatches.length,
      completedMatches: completedCount
    };
  });

  // Compute Cross-Group Rankings (Best 3rd-Place / Best Losers and Best 2nd-Place)
  const bestThirdResult = groupsInLeague.length >= 2 ? computeCrossGroupRankings(groupStandingsMap, 2) : { rankings: [], allGroupsCompleted: false };
  const bestThirdRankings = bestThirdResult.rankings;
  const bestRunnerUpRankings = groupsInLeague.length >= 2 ? computeCrossGroupRankings(groupStandingsMap, 1).rankings : [];

  // 3rd Place Match in current league if exists
  const thirdPlaceMatch = knockoutMatches.find(m => 
    m.stage === 'third_place' || 
    (m.fixtureRound && /3rd|third/i.test(m.fixtureRound))
  );

  // Filter for standard table view
  const filteredForTable = selectedGroup === 'all' 
    ? groupStageMatches 
    : groupStageMatches.filter(m => m.groupName === selectedGroup);

  const explicitTeamsInView = Array.from(new Set([
    ...filteredForTable.flatMap(m => [m.homeTeamName, m.awayTeamName, m.opponent]).filter(Boolean),
    ...(selectedLeagueId === 'all' ? teams.map(t => t.name) : [])
  ])) as string[];

  const tableData = computeStandings(filteredForTable, myTeamName, explicitTeamsInView);
  const completedMatchesCount = filteredForTable.filter(m => m.score && m.score.includes('-')).length;
  const scheduledMatchesCount = filteredForTable.length - completedMatchesCount;

  // Handle generating knockout fixtures for this league
  const handleQuickGenerateKnockouts = async (chosenFormat?: 'top_1' | 'top_2' | 'top_3' | 'top_2_plus_best_3rd' | 'top_4' | 'custom') => {
    if (selectedLeagueId === 'all') {
      alert("Please select a specific competition from the dropdown first to generate its knockout stage.");
      return;
    }
    const currentLeague = leagues.find(l => l.id === selectedLeagueId);
    const leagueName = currentLeague ? currentLeague.name : 'League';
    const gList = groupsInLeague.length > 0 ? groupsInLeague : ['Group A', 'Group B'];

    if (gList.length < 1) {
      alert("Need at least 1 or 2 groups to generate next round knockout matches.");
      return;
    }

    const formatToUse = chosenFormat || advancementFormatForModal || 'top_2';
    const parsedCustomTotal = modalCustomAdvancingTotal ? parseInt(modalCustomAdvancingTotal) : undefined;
    const effectiveWildcards = formatToUse === 'top_2_plus_best_3rd' 
      ? (modalWildcardCount || (gList.length === 12 ? 8 : (gList.length === 3 ? 2 : 4))) 
      : (gList.length === 12 ? 8 : 0);

    setIsGeneratingKnockouts(true);
    try {
      const res = generateKnockoutFixtures({
        groupsList: gList,
        leagueId: selectedLeagueId,
        leagueName,
        startDate: modalStartDate ? new Date(modalStartDate).toISOString() : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        matchesPerDay: modalMatchesPerDay,
        restDaysBetweenRounds: modalRestDaysBetweenRounds,
        matchTimeGapHours: modalMatchTimeGapHours,
        matchNumberStart: 201,
        location: modalLocation || 'Main Stadium',
        advancementFormat: formatToUse,
        qualifiersPerGroup: modalQualifiersPerGroup || 2,
        wildcardCount: effectiveWildcards,
        customRuleText: modalCustomRuleText.trim(),
        customAdvancingTotal: parsedCustomTotal
      });

      for (const m of res.generatedMatches) {
        const homeMatchTeam = teams.find(t => t.name.toLowerCase() === m.homeTeamName.toLowerCase());
        const matchTeamId = homeMatchTeam ? homeMatchTeam.id : (teams[0]?.id || 'league_match');

        await addDoc(collection(db, 'matches'), {
          teamId: matchTeamId,
          matchType: 'league',
          leagueId: m.leagueId,
          leagueName: m.leagueName,
          groupName: m.groupName,
          stage: m.stage,
          homePlaceholder: m.homePlaceholder,
          awayPlaceholder: m.awayPlaceholder,
          homeTeamName: m.homeTeamName,
          awayTeamName: m.awayTeamName,
          opponent: m.awayTeamName,
          location: m.location,
          matchNumber: m.matchNumber,
          fixtureRound: m.fixtureRound,
          status: 'scheduled',
          date: Timestamp.fromDate(m.date),
          attendees: []
        });
      }

      // Persist advancement settings to league
      try {
        const leagueUpdates: any = {
          advancementFormat: formatToUse,
        };
        if (formatToUse === 'top_2_plus_best_3rd') {
          leagueUpdates.wildcardCount = effectiveWildcards;
        }
        if (res.totalAdvancingTeams) {
          leagueUpdates.totalAdvancing = res.totalAdvancingTeams;
        }
        await updateDoc(doc(db, 'leagues', selectedLeagueId), leagueUpdates);
      } catch (e) {
        console.warn('Could not save advancement format to league doc:', e);
      }

      alert(`Successfully generated ${res.generatedMatches.length} Next Round / Knockout fixtures (${formatToUse.replace(/_/g, ' ').toUpperCase()}) starting from ${res.generatedMatches[0]?.fixtureRound || 'Knockouts'}!`);
      setIsGenKnockoutModalOpen(false);
      setActiveTab('knockouts');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'matches');
    } finally {
      setIsGeneratingKnockouts(false);
    }
  };

  // Handle saving date and stadium changes for a knockout match
  const handleSaveKnockoutSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingKnockoutSchedule) return;
    setIsSavingKnockoutSchedule(true);
    try {
      const updates: any = {};
      if (editKnockoutDate) {
        updates.date = Timestamp.fromDate(new Date(editKnockoutDate));
      }
      if (editKnockoutStadium) {
        updates.location = editKnockoutStadium.trim();
      }
      await updateDoc(doc(db, 'matches', editingKnockoutSchedule.id), updates);
      setEditingKnockoutSchedule(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `matches/${editingKnockoutSchedule.id}`);
    } finally {
      setIsSavingKnockoutSchedule(false);
    }
  };

  // Handle Deleting a single knockout fixture
  const handleDeleteKnockoutFixture = async (matchId: string, matchTitle: string) => {
    if (window.confirm(`Are you sure you want to remove knockout fixture "${matchTitle}"?`)) {
      setIsDeletingFixtureId(matchId);
      try {
        await deleteDoc(doc(db, 'matches', matchId));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `matches/${matchId}`);
      } finally {
        setIsDeletingFixtureId(null);
      }
    }
  };

  // Handle Removing 3rd Place Match
  const handleRemoveThirdPlaceFixture = async () => {
    if (!thirdPlaceMatch) {
      alert("No 3rd Place fixture found in this competition.");
      return;
    }
    const title = thirdPlaceMatch.fixtureRound || thirdPlaceMatch.matchNumber || '3rd Place Playoff';
    if (window.confirm(`Remove the "${title}" fixture from this tournament?`)) {
      try {
        await deleteDoc(doc(db, 'matches', thirdPlaceMatch.id));
        alert("3rd Place fixture removed.");
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `matches/${thirdPlaceMatch.id}`);
      }
    }
  };

  // Handle Adding a Custom Knockout Fixture (e.g. for unique group rules, late entering seeded teams, wildcard playoffs)
  const handleAddCustomKnockoutFixture = async () => {
    if (selectedLeagueId === 'all') {
      alert("Please select a specific competition from the dropdown before adding a fixture.");
      return;
    }
    const currentLeague = leagues.find(l => l.id === selectedLeagueId);
    const leagueName = currentLeague ? currentLeague.name : 'League';

    // Determine Home Team / Placeholder
    let homeName = '';
    let homePlaceholder = '';
    if (newFixtureHomeType === 'team') {
      homeName = newFixtureHomeTeam;
    } else if (newFixtureHomeType === 'rule') {
      homePlaceholder = newFixtureHomeRule.trim();
    } else {
      homeName = newFixtureHomeCustom.trim();
    }

    // Determine Away Team / Placeholder
    let awayName = '';
    let awayPlaceholder = '';
    if (newFixtureAwayType === 'team') {
      awayName = newFixtureAwayTeam;
    } else if (newFixtureAwayType === 'rule') {
      awayPlaceholder = newFixtureAwayRule.trim();
    } else {
      awayName = newFixtureAwayCustom.trim();
    }

    if (!homeName && !homePlaceholder) {
      alert("Please select or enter the Home Team (or a qualification placeholder rule like 'Winner Group A' or 'Winner Match #201').");
      return;
    }
    if (!awayName && !awayPlaceholder) {
      alert("Please select or enter the Away Team (or a qualification placeholder rule like '3rd Place Group C' or 'Best 3rd Place #1').");
      return;
    }

    const stageTitle = newFixtureStage === 'custom' 
      ? (newFixtureCustomStage.trim() || 'Knockout Playoff') 
      : newFixtureStage === 'round_of_32' ? 'Round of 32'
      : newFixtureStage === 'playoff' ? 'Playoff Round'
      : newFixtureStage === 'preliminary' ? 'Preliminary Round'
      : newFixtureStage === 'round_of_16' ? 'Round of 16'
      : newFixtureStage === 'quarter_final' ? 'Quarter-Final'
      : newFixtureStage === 'semi_final' ? 'Semi-Final'
      : newFixtureStage === 'third_place' ? '3rd Place Playoff'
      : 'Grand Final';

    setIsCreatingCustomFixture(true);
    try {
      const homeMatchTeam = teams.find(t => t.name.toLowerCase() === homeName.toLowerCase());
      const matchTeamId = homeMatchTeam ? homeMatchTeam.id : (teams[0]?.id || 'league_match');

      const matchDateObj = newFixtureDate 
        ? new Date(`${newFixtureDate}T${newFixtureTime || '18:00'}:00`) 
        : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      await addDoc(collection(db, 'matches'), {
        teamId: matchTeamId,
        matchType: 'league',
        leagueId: selectedLeagueId,
        leagueName,
        groupName: 'Knockout Stage',
        stage: newFixtureStage,
        fixtureRound: stageTitle,
        matchNumber: newFixtureMatchNum.trim() || undefined,
        homePlaceholder: homePlaceholder || undefined,
        awayPlaceholder: awayPlaceholder || undefined,
        homeTeamName: homeName || (homePlaceholder ? undefined : 'TBD Home'),
        awayTeamName: awayName || (awayPlaceholder ? undefined : 'TBD Away'),
        opponent: awayName || awayPlaceholder || 'TBD Away',
        location: newFixtureLocation.trim() || 'Main Stadium',
        status: 'scheduled',
        date: Timestamp.fromDate(matchDateObj),
        attendees: []
      });

      setIsAddKnockoutModalOpen(false);
      setNewFixtureHomeTeam('');
      setNewFixtureHomeRule('');
      setNewFixtureHomeCustom('');
      setNewFixtureAwayTeam('');
      setNewFixtureAwayRule('');
      setNewFixtureAwayCustom('');
      setNewFixtureCustomStage('');
      setNewFixtureMatchNum('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'matches');
    } finally {
      setIsCreatingCustomFixture(false);
    }
  };

  // Open Score Modal with full penalty shootout support
  const handleOpenScoreModal = (match: Match) => {
    setScoreEditMatch(match);
    const parsed = resolveMatchWinnerAndLoser(match);
    if (parsed.isCompleted) {
      setScoreHomeFT(parsed.homeScore !== null ? String(parsed.homeScore) : '');
      setScoreAwayFT(parsed.awayScore !== null ? String(parsed.awayScore) : '');
      setHasPenalties(parsed.wentToPenalties);
      setScoreHomePens(parsed.homePens !== null ? String(parsed.homePens) : '');
      setScoreAwayPens(parsed.awayPens !== null ? String(parsed.awayPens) : '');
    } else {
      setScoreHomeFT('');
      setScoreAwayFT('');
      setHasPenalties(false);
      setScoreHomePens('');
      setScoreAwayPens('');
    }
  };

  // Handle Manual Bracket Slot Override
  const handleSaveSlotOverride = async () => {
    if (!slotEditState) return;
    const finalName = selectedSlotTeam === '__custom__' 
      ? customSlotName.trim() 
      : (selectedSlotTeam || customSlotName.trim());

    if (!finalName) {
      alert("Please select or enter a team name.");
      return;
    }

    setIsSavingSlot(true);
    try {
      const updates: any = {};
      if (slotEditState.slot === 'home') {
        updates.homeResolvedTeam = finalName;
        updates.homeTeamName = finalName;
      } else {
        updates.awayResolvedTeam = finalName;
        updates.awayTeamName = finalName;
        updates.opponent = finalName;
      }

      await updateDoc(doc(db, 'matches', slotEditState.match.id), updates);
      setSlotEditState(null);
      setSelectedSlotTeam('');
      setCustomSlotName('');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `matches/${slotEditState.match.id}`);
    } finally {
      setIsSavingSlot(false);
    }
  };

  // Sync resolved names into firestore documents
  const handleSyncResolvedTeams = async () => {
    setIsSyncingKnockouts(true);
    try {
      let syncCount = 0;
      for (const m of knockoutMatches) {
        const homeRes = parseAndResolvePlaceholder(m.homePlaceholder, groupStandingsMap, relevantMatches);
        const awayRes = parseAndResolvePlaceholder(m.awayPlaceholder, groupStandingsMap, relevantMatches);

        const updates: any = {};
        if (homeRes.resolvedName && homeRes.status === 'confirmed' && homeRes.resolvedName !== m.homeResolvedTeam) {
          updates.homeResolvedTeam = homeRes.resolvedName;
          updates.homeTeamName = homeRes.resolvedName;
        }
        if (awayRes.resolvedName && awayRes.status === 'confirmed' && awayRes.resolvedName !== m.awayResolvedTeam) {
          updates.awayResolvedTeam = awayRes.resolvedName;
          updates.awayTeamName = awayRes.resolvedName;
          updates.opponent = awayRes.resolvedName;
        }

        if (Object.keys(updates).length > 0) {
          await updateDoc(doc(db, 'matches', m.id), updates);
          syncCount++;
        }
      }
      alert(`Synchronized qualified team names for ${syncCount} knockout fixture(s)!`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'matches');
    } finally {
      setIsSyncingKnockouts(false);
    }
  };

  // Save score with regular score & penalty shootout support
  const handleSaveScoreModal = async () => {
    if (!scoreEditMatch) return;
    const hFT = parseInt(scoreHomeFT.trim());
    const aFT = parseInt(scoreAwayFT.trim());

    if (isNaN(hFT) || isNaN(aFT)) {
      if (!scoreHomeFT.trim() && !scoreAwayFT.trim()) {
        setIsUpdatingScore(true);
        try {
          await updateDoc(doc(db, 'matches', scoreEditMatch.id), {
            score: deleteField(),
            penaltyScore: deleteField(),
            penaltyWinner: deleteField(),
            status: 'scheduled'
          });
          setScoreEditMatch(null);
        } catch (error) {
          handleFirestoreError(error, OperationType.UPDATE, `matches/${scoreEditMatch.id}`);
        } finally {
          setIsUpdatingScore(false);
        }
        return;
      }
      alert("Please enter valid full-time goal numbers for both teams (e.g. 2 and 1).");
      return;
    }

    let formattedScore = `${hFT} - ${aFT}`;
    const updates: any = {
      status: 'completed'
    };

    if (hasPenalties) {
      const hPens = parseInt(scoreHomePens.trim());
      const aPens = parseInt(scoreAwayPens.trim());
      if (isNaN(hPens) || isNaN(aPens)) {
        alert("Please enter the penalty shootout score for both teams (e.g. 5 and 4).");
        return;
      }
      if (hPens === aPens) {
        alert("Penalty shootouts cannot end in a tie. One team must win the shootout.");
        return;
      }
      formattedScore = `${hFT} - ${aFT} (${hPens}-${aPens} pens)`;
      updates.score = formattedScore;
      updates.penaltyScore = `${hPens} - ${aPens}`;
      updates.penaltyWinner = hPens > aPens ? 'home' : 'away';
    } else {
      updates.score = formattedScore;
      updates.penaltyScore = deleteField();
      updates.penaltyWinner = deleteField();
    }

    setIsUpdatingScore(true);
    try {
      await updateDoc(doc(db, 'matches', scoreEditMatch.id), updates);
      setScoreEditMatch(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `matches/${scoreEditMatch.id}`);
    } finally {
      setIsUpdatingScore(false);
    }
  };

  const exportTablePDF = async () => {
    if (!tableRef.current) return;
    setIsExporting(true);

    try {
      const canvas = await html2canvas(tableRef.current, { backgroundColor: '#ffffff', scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const imgProps = pdf.getImageProperties(imgData);
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`league-table-standings.pdf`);
    } catch (error) {
      console.error("League table export failed:", error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteSelectedLeague = async () => {
    const leagueToDelete = leagues.find(l => l.id === selectedLeagueId);
    if (!leagueToDelete) return;

    const count = matches.filter(m => m.leagueId === leagueToDelete.id || m.leagueName === leagueToDelete.name).length;
    const confirmMsg = count > 0 
      ? `Delete league "${leagueToDelete.name}"? Note: ${count} match fixture(s) are linked to this league.`
      : `Delete league "${leagueToDelete.name}"?`;

    if (window.confirm(confirmMsg)) {
      setIsDeletingLeague(true);
      try {
        await deleteDoc(doc(db, 'leagues', leagueToDelete.id));
        setSelectedLeagueId('all');
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `leagues/${leagueToDelete.id}`);
      } finally {
        setIsDeletingLeague(false);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Competition Selector */}
      <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Trophy size={22} className="text-amber-500" />
            <h3 className="text-2xl font-black uppercase italic tracking-tight">Competition & Standings Hub</h3>
          </div>
          <p className="text-stone-500 text-xs font-medium">
            Full group stage tables, real-time qualification tracking & dynamic next-round knockout brackets
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {leagues.length > 0 && (
            <select
              value={selectedLeagueId}
              onChange={e => {
                setSelectedLeagueId(e.target.value);
                setSelectedGroup('all');
              }}
              className="px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="all">All Competitions ({leagues.length})</option>
              {leagues.map(l => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          )}

          {role === 'admin' && selectedLeagueId !== 'all' && (
            <button
              onClick={handleDeleteSelectedLeague}
              disabled={isDeletingLeague}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-red-50 text-red-600 border border-red-200 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-red-100 transition-colors shadow-sm"
              title="Delete this league"
            >
              {isDeletingLeague ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
              <span>Delete League</span>
            </button>
          )}

          <button
            onClick={exportTablePDF}
            disabled={isExporting}
            className="flex items-center gap-2 px-4 py-2 bg-stone-900 text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-stone-800 transition-colors shadow-sm"
          >
            {isExporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            <span>Export Table PDF</span>
          </button>
        </div>
      </div>

      {/* Main Navigation Tabs: Standings vs Knockout Stage */}
      <div className="bg-white p-2 rounded-2xl border border-stone-200 shadow-sm flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('standings')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all ${
              activeTab === 'standings'
                ? 'bg-stone-900 text-white shadow-sm'
                : 'text-stone-600 hover:bg-stone-100'
            }`}
          >
            <BarChart2 size={16} />
            <span>Group & League Tables</span>
            {groupsInLeague.length > 0 && (
              <span className="px-1.5 py-0.5 bg-emerald-500 text-white rounded text-[10px] font-black">
                {groupsInLeague.length} Groups
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('knockouts')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all ${
              activeTab === 'knockouts'
                ? 'bg-amber-500 text-stone-950 shadow-sm'
                : 'text-stone-600 hover:bg-stone-100'
            }`}
          >
            <Award size={16} />
            <span>Next Round & Knockouts</span>
            {knockoutMatches.length > 0 && (
              <span className="px-1.5 py-0.5 bg-stone-900 text-amber-400 rounded text-[10px] font-black">
                {knockoutMatches.length} Matches
              </span>
            )}
          </button>
        </div>

        {/* Quick action buttons on right */}
        {activeTab === 'knockouts' && (
          <div className="flex items-center gap-2">
            {role === 'admin' && knockoutMatches.length > 0 && (
              <button
                onClick={handleSyncResolvedTeams}
                disabled={isSyncingKnockouts}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold hover:bg-emerald-100 transition-colors shadow-sm"
                title="Permanently lock in qualified team names from group standings to match documents"
              >
                {isSyncingKnockouts ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} className="text-emerald-600" />}
                <span>Sync Qualified Names</span>
              </button>
            )}

            {role === 'admin' && knockoutMatches.length === 0 && selectedLeagueId !== 'all' && (
              <button
                onClick={() => setIsGenKnockoutModalOpen(true)}
                disabled={isGeneratingKnockouts}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-amber-500 text-stone-950 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-amber-400 transition-colors shadow-sm"
              >
                {isGeneratingKnockouts ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                <span>Generate Knockout Stage</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* TAB 1: GROUP STANDINGS & LEAGUE TABLES */}
      {activeTab === 'standings' && (
        <div className="space-y-6">
          {/* Completed Group Summaries Banners */}
          {groupsInLeague.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {groupsInLeague.map(grp => {
                const info = groupStandingsMap[grp];
                if (!info) return null;
                const winner = info.standings[0];
                const runnerUp = info.standings[1];

                return (
                  <div 
                    key={grp} 
                    className={`p-4 rounded-2xl border transition-all ${
                      info.isCompleted 
                        ? 'bg-emerald-950 text-emerald-100 border-emerald-800 shadow-sm' 
                        : 'bg-white text-stone-800 border-stone-200'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-black text-xs uppercase tracking-wider flex items-center gap-1.5">
                        <Trophy size={14} className={info.isCompleted ? 'text-amber-400' : 'text-emerald-500'} />
                        {grp}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                        info.isCompleted 
                          ? 'bg-amber-400 text-amber-950' 
                          : 'bg-stone-100 text-stone-600'
                      }`}>
                        {info.isCompleted ? 'Completed' : `${info.completedMatches}/${info.totalMatches} Played`}
                      </span>
                    </div>

                    {info.isCompleted ? (
                      <div className="space-y-1.5 text-xs">
                        <div className="flex items-center justify-between bg-emerald-900/60 px-2.5 py-1.5 rounded-lg">
                          <span className="text-amber-300 font-bold flex items-center gap-1">
                            🥇 1st Place (Winner):
                          </span>
                          <span className="font-black text-white">{winner?.teamName || 'TBD'}</span>
                        </div>
                        {runnerUp && (
                          <div className="flex items-center justify-between bg-emerald-900/40 px-2.5 py-1.5 rounded-lg">
                            <span className="text-stone-300 font-bold flex items-center gap-1">
                              🥈 2nd Place:
                            </span>
                            <span className="font-bold text-white">{runnerUp?.teamName || 'TBD'}</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-xs text-stone-500 space-y-1">
                        <div className="flex justify-between">
                          <span>Current Leader:</span>
                          <span className="font-bold text-stone-800">{winner?.teamName || 'None'} ({winner?.PTS || 0} pts)</span>
                        </div>
                        <p className="text-[11px] text-stone-400 italic">
                          Matches in progress. Top 2 teams will advance to knockout bracket.
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Group Filter Bar if groups exist */}
          {groupsInLeague.length > 0 && (
            <div className="bg-white px-6 py-3 rounded-2xl border border-stone-200 shadow-sm flex items-center gap-2 flex-wrap">
              <span className="text-xs font-black uppercase tracking-wider text-stone-400 mr-2 flex items-center gap-1">
                <Layers size={14} className="text-emerald-500" /> Filter Table:
              </span>
              <button
                onClick={() => setSelectedGroup('all')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                  selectedGroup === 'all' ? 'bg-stone-900 text-white shadow-sm' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                All Groups
              </button>
              {groupsInLeague.map(grp => (
                <button
                  key={grp}
                  onClick={() => setSelectedGroup(grp)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                    selectedGroup === grp ? 'bg-emerald-600 text-white shadow-sm' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  {grp} {groupStandingsMap[grp]?.isCompleted ? '✓' : ''}
                </button>
              ))}
            </div>
          )}

          {/* Standings Table Card */}
          <div ref={tableRef} className="bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-sm p-6 space-y-4">
            <div className="flex flex-wrap justify-between items-center border-b border-stone-100 pb-3 gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-widest text-stone-900">
                  {selectedLeagueId === 'all' ? 'Overall Competition Standings' : (leagues.find(l => l.id === selectedLeagueId)?.name || 'League Table')}
                  {selectedGroup !== 'all' ? ` — ${selectedGroup}` : ''}
                </span>
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md text-[10px] font-black uppercase tracking-wider">
                  {tableData.length} Teams
                </span>
              </div>
              <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">
                {completedMatchesCount} completed • {scheduledMatchesCount} scheduled ({filteredForTable.length} total fixtures)
              </span>
            </div>

            {tableData.length === 0 ? (
              <div className="p-12 text-center text-stone-400 space-y-2">
                <Trophy size={40} className="mx-auto text-stone-300" />
                <p className="text-sm font-bold text-stone-700">No teams or fixtures registered in this competition</p>
                <p className="text-xs">Schedule matches or use the Admin Batch Fixture Generator to automatically populate all teams and league tables.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-stone-200 bg-stone-50 text-[10px] font-black uppercase tracking-widest text-stone-400">
                      <th className="p-3 w-12 text-center">Pos</th>
                      <th className="p-3">Team</th>
                      <th className="p-3 text-center">P</th>
                      <th className="p-3 text-center">W</th>
                      <th className="p-3 text-center">D</th>
                      <th className="p-3 text-center">L</th>
                      <th className="p-3 text-center">GF</th>
                      <th className="p-3 text-center">GA</th>
                      <th className="p-3 text-center">GD</th>
                      <th className="p-3 text-center font-black text-stone-900">PTS</th>
                      <th className="p-3 text-center hidden md:table-cell">Recent Form</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 text-xs font-bold text-stone-800">
                    {tableData.map((row, idx) => {
                      const rank = idx + 1;
                      const isQualifying = rank <= 2 && groupsInLeague.length > 0;

                      return (
                        <tr 
                          key={row.teamName} 
                          className={`hover:bg-stone-50 transition-colors ${row.isMyTeam ? 'bg-emerald-50/60 font-extrabold text-emerald-950' : ''}`}
                        >
                          <td className="p-3 text-center">
                            <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-black ${
                              rank === 1 ? 'bg-amber-400 text-amber-950 shadow-sm' :
                              rank === 2 ? 'bg-slate-300 text-slate-900' :
                              rank === 3 ? 'bg-amber-700/20 text-amber-900' : 'text-stone-500'
                            }`}>
                              {rank}
                            </span>
                          </td>
                          <td className="p-3 flex items-center gap-2">
                            <span>{row.teamName}</span>
                            {row.isMyTeam && (
                              <span className="px-2 py-0.5 bg-emerald-600 text-white rounded text-[9px] font-black uppercase tracking-wider">
                                My Squad
                              </span>
                            )}
                            {isQualifying && (
                              <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                                rank === 1 ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                              }`}>
                                {rank === 1 ? 'Qualifies (1st)' : 'Qualifies (2nd)'}
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-center text-stone-500">{row.P}</td>
                          <td className="p-3 text-center text-emerald-700">{row.W}</td>
                          <td className="p-3 text-center text-stone-500">{row.D}</td>
                          <td className="p-3 text-center text-red-600">{row.L}</td>
                          <td className="p-3 text-center text-stone-500">{row.GF}</td>
                          <td className="p-3 text-center text-stone-500">{row.GA}</td>
                          <td className="p-3 text-center font-bold">
                            <span className={row.GD > 0 ? 'text-emerald-600' : row.GD < 0 ? 'text-red-500' : 'text-stone-400'}>
                              {row.GD > 0 ? `+${row.GD}` : row.GD}
                            </span>
                          </td>
                          <td className="p-3 text-center font-black text-sm text-stone-900">{row.PTS}</td>
                          <td className="p-3 text-center hidden md:table-cell">
                            <div className="flex justify-center gap-1">
                              {row.form.slice(-5).map((res, fIdx) => (
                                <span 
                                  key={fIdx} 
                                  className={`w-5 h-5 rounded-md flex items-center justify-center text-[9px] font-black text-white ${
                                    res === 'W' ? 'bg-emerald-600' : res === 'D' ? 'bg-stone-400' : 'bg-red-500'
                                  }`}
                                >
                                  {res}
                                </span>
                              ))}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Cross-Group Rankings / Best Losers (Best 3rd-Place Teams) Table */}
          {groupsInLeague.length >= 2 && bestThirdRankings.length > 0 && (
            <div className="bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-sm p-6 space-y-4">
              <div className="flex flex-wrap justify-between items-center border-b border-stone-100 pb-3 gap-2">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Award size={16} className="text-amber-500" />
                    <span className="text-xs font-black uppercase tracking-widest text-stone-900">
                      Cross-Group Wildcard & Best 3rd-Place Rankings (Best Losers)
                    </span>
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-900 rounded-md text-[10px] font-black uppercase tracking-wider">
                      Tournament Exception Rules
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-500">
                    {(() => {
                      const curLeague = leagues.find(l => l.id === selectedLeagueId);
                      const curWildcards = curLeague?.wildcardCount ?? (groupsInLeague.length === 12 ? 8 : (groupsInLeague.length === 3 ? 2 : 4));
                      return `Used to determine advancing wildcard teams across groups (Top ${curWildcards} qualify for knockout bracket). Ranked strictly by Points → Goal Difference → Goals For → Wins.`;
                    })()}
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-stone-200 bg-stone-50 text-[10px] font-black uppercase tracking-widest text-stone-400">
                      <th className="p-3 w-12 text-center">Rank</th>
                      <th className="p-3">Team</th>
                      <th className="p-3 text-center">Group</th>
                      <th className="p-3 text-center">P</th>
                      <th className="p-3 text-center">W</th>
                      <th className="p-3 text-center">D</th>
                      <th className="p-3 text-center">L</th>
                      <th className="p-3 text-center">GF</th>
                      <th className="p-3 text-center">GA</th>
                      <th className="p-3 text-center">GD</th>
                      <th className="p-3 text-center font-black text-stone-900">PTS</th>
                      <th className="p-3 text-center">Advancement Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 text-xs font-bold text-stone-800">
                    {bestThirdRankings.map((row, idx) => {
                      const rank = idx + 1;
                      const curLeague = leagues.find(l => l.id === selectedLeagueId);
                      const curWildcards = curLeague?.wildcardCount ?? (groupsInLeague.length === 12 ? 8 : (groupsInLeague.length === 3 ? 2 : 4));
                      const isTopWildcard = rank <= curWildcards;

                      return (
                        <tr key={row.teamName} className="hover:bg-stone-50 transition-colors">
                          <td className="p-3 text-center">
                            <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-black ${
                              isTopWildcard ? 'bg-amber-400 text-amber-950 shadow-sm' : 'bg-stone-100 text-stone-600'
                            }`}>
                              #{rank}
                            </span>
                          </td>
                          <td className="p-3">
                            <span className="font-extrabold text-stone-900">{row.teamName}</span>
                          </td>
                          <td className="p-3 text-center">
                            <span className="px-2 py-0.5 bg-stone-100 text-stone-700 rounded text-[10px] font-bold">
                              {row.groupName}
                            </span>
                          </td>
                          <td className="p-3 text-center text-stone-500">{row.P}</td>
                          <td className="p-3 text-center text-emerald-700">{row.W}</td>
                          <td className="p-3 text-center text-stone-500">{row.D}</td>
                          <td className="p-3 text-center text-red-600">{row.L}</td>
                          <td className="p-3 text-center text-stone-500">{row.GF}</td>
                          <td className="p-3 text-center text-stone-500">{row.GA}</td>
                          <td className="p-3 text-center font-bold">
                            <span className={row.GD > 0 ? 'text-emerald-600' : row.GD < 0 ? 'text-red-500' : 'text-stone-400'}>
                              {row.GD > 0 ? `+${row.GD}` : row.GD}
                            </span>
                          </td>
                          <td className="p-3 text-center font-black text-sm text-stone-900">{row.PTS}</td>
                          <td className="p-3 text-center">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                              isTopWildcard 
                                ? (row.isGroupCompleted ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800')
                                : 'bg-stone-100 text-stone-500'
                            }`}>
                              {isTopWildcard 
                                ? (row.isGroupCompleted ? `✓ Qualified (Wildcard #${rank})` : `In Cut (Wildcard #${rank})`)
                                : `Below Cut (Rank #${rank})`}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: NEXT ROUND & KNOCKOUT STAGE (PLAYOFFS) */}
      {activeTab === 'knockouts' && (
        <div className="space-y-6">
          {/* Explanation Banner & Management Toolbar */}
          <div className="bg-stone-900 text-stone-100 p-6 rounded-3xl border border-stone-800 shadow-md">
            <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Sparkles size={18} className="text-amber-400" />
                  <h4 className="text-lg font-black uppercase italic tracking-tight text-white">
                    Next Round & Knockout Stage Brackets
                  </h4>
                </div>
                <p className="text-xs text-stone-400 leading-relaxed max-w-2xl">
                  Match pairings link dynamically to previous rounds and group standings (e.g. <span className="text-emerald-400 font-bold">Winner Group A vs 2nd Place Group B</span> or <span className="text-amber-400 font-bold">Best 3rd Place #1</span>). Penalty shootouts, manual slot overrides, custom fixtures, and removing 3rd-place matches are fully supported.
                </p>
              </div>

              {(role === 'admin' || role === 'coach') && selectedLeagueId !== 'all' && (
                <div className="flex flex-wrap items-center gap-2">
                  {/* Add Custom Knockout Fixture */}
                  <button
                    onClick={() => setIsAddKnockoutModalOpen(true)}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all flex items-center gap-1.5 shadow-sm"
                  >
                    <Plus size={14} />
                    <span>+ Add Custom Fixture</span>
                  </button>

                  {/* Remove 3rd Place Playoff button if present */}
                  {thirdPlaceMatch && (
                    <button
                      onClick={handleRemoveThirdPlaceFixture}
                      className="px-3.5 py-2 bg-stone-800 hover:bg-red-950/60 text-stone-300 hover:text-red-300 border border-stone-700 hover:border-red-500/40 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 shadow-sm"
                      title="Remove the 3rd place playoff match from this competition"
                    >
                      <Trash2 size={13} className="text-red-400" />
                      <span>Remove 3rd Place Match</span>
                    </button>
                  )}

                  {/* Sync bracket names */}
                  {knockoutMatches.length > 0 && (
                    <button
                      onClick={handleSyncResolvedTeams}
                      disabled={isSyncingKnockouts}
                      className="px-3.5 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 border border-stone-700"
                      title="Synchronize confirmed qualified team names into bracket records"
                    >
                      <RefreshCw size={13} className={isSyncingKnockouts ? 'animate-spin' : ''} />
                      <span>Sync Names</span>
                    </button>
                  )}

                  {/* Generate Knockout Bracket */}
                  <button
                    onClick={() => setIsGenKnockoutModalOpen(true)}
                    disabled={isGeneratingKnockouts}
                    className="px-4 py-2 bg-amber-500 text-stone-950 font-black text-xs uppercase tracking-wider rounded-xl hover:bg-amber-400 transition-all flex items-center gap-1.5 shadow-md"
                  >
                    {isGeneratingKnockouts ? <Loader2 size={14} className="animate-spin" /> : <Award size={14} />}
                    <span>{knockoutMatches.length > 0 ? 'Generate More' : 'Generate Bracket'}</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {knockoutMatches.length === 0 ? (
            <div className="bg-white p-12 rounded-3xl border border-stone-200 text-center space-y-4 shadow-sm">
              <Award size={48} className="mx-auto text-amber-500/40" />
              <div className="space-y-1">
                <h4 className="text-base font-black uppercase text-stone-800">No Knockout Fixtures Scheduled Yet</h4>
                <p className="text-xs text-stone-500 max-w-md mx-auto">
                  {selectedLeagueId === 'all' 
                    ? "Select a specific competition from the dropdown above to view, generate, or customize its knockout bracket fixtures."
                    : "Generate standard semi-finals, finals, playoffs, or best 3rd-place wildcard brackets, or click '+ Add Custom Fixture' for unique tournament structures."}
                </p>
              </div>
              {selectedLeagueId !== 'all' && (role === 'admin' || role === 'coach') && (
                <div className="flex flex-wrap justify-center gap-3 pt-2">
                  <button
                    onClick={() => setIsGenKnockoutModalOpen(true)}
                    disabled={isGeneratingKnockouts}
                    className="px-6 py-3 bg-emerald-600 text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-emerald-700 transition-all shadow-md inline-flex items-center gap-2"
                  >
                    {isGeneratingKnockouts ? <Loader2 size={16} className="animate-spin" /> : <Award size={16} />}
                    <span>Generate Knockout Matches (Choose Format)</span>
                  </button>
                  <button
                    onClick={() => setIsAddKnockoutModalOpen(true)}
                    className="px-5 py-3 bg-stone-900 text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-stone-800 transition-all shadow-md inline-flex items-center gap-2"
                  >
                    <Plus size={16} />
                    <span>+ Add Custom Knockout Fixture</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {knockoutMatches.map(m => {
                const homeRes = parseAndResolvePlaceholder(m.homePlaceholder, groupStandingsMap, relevantMatches);
                const awayRes = parseAndResolvePlaceholder(m.awayPlaceholder, groupStandingsMap, relevantMatches);

                const displayHomeName = m.homeResolvedTeam || homeRes.resolvedName || m.homeTeamName || m.homePlaceholder || 'TBD Home';
                const displayAwayName = m.awayResolvedTeam || awayRes.resolvedName || m.awayTeamName || m.awayPlaceholder || m.opponent || 'TBD Away';

                const isHomeConfirmed = Boolean(m.homeResolvedTeam || homeRes.status === 'confirmed');
                const isAwayConfirmed = Boolean(m.awayResolvedTeam || awayRes.status === 'confirmed');

                const matchResult = resolveMatchWinnerAndLoser(m);
                const isCompleted = matchResult.isCompleted;

                return (
                  <div key={m.id} className="bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-sm p-6 space-y-4 hover:border-emerald-500/40 transition-all flex flex-col justify-between">
                    <div className="space-y-3">
                      {/* Card Header */}
                      <div className="flex justify-between items-center border-b border-stone-100 pb-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2.5 py-1 bg-amber-100 text-amber-900 rounded-lg text-[10px] font-black uppercase tracking-wider">
                            {m.fixtureRound || m.stage || 'Knockout'}
                          </span>
                          {m.matchNumber && (
                            <span className="px-2 py-0.5 bg-stone-100 text-stone-600 rounded text-[10px] font-bold">
                              {m.matchNumber}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            isCompleted ? 'bg-stone-900 text-white' :
                            (isHomeConfirmed && isAwayConfirmed) ? 'bg-emerald-100 text-emerald-800' :
                            'bg-amber-50 text-amber-800 border border-amber-200'
                          }`}>
                            {isCompleted ? 'Completed' : (isHomeConfirmed && isAwayConfirmed) ? 'Matchup Confirmed' : 'Pending Results'}
                          </span>

                          {(role === 'admin' || role === 'coach') && (
                            <button
                              onClick={() => handleDeleteKnockoutFixture(m.id, `${m.fixtureRound || 'Knockout'}: ${displayHomeName} vs ${displayAwayName}`)}
                              disabled={isDeletingFixtureId === m.id}
                              className="p-1 text-stone-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete this knockout fixture"
                            >
                              {isDeletingFixtureId === m.id ? <Loader2 size={13} className="animate-spin text-red-500" /> : <Trash2 size={13} />}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Teams Matchup Box */}
                      <div className="bg-stone-50 p-4 rounded-2xl border border-stone-100 space-y-3">
                        {/* Home Team */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="space-y-0.5 flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className={`font-black text-sm uppercase truncate ${
                                isCompleted && matchResult.winnerName?.toLowerCase() === displayHomeName.toLowerCase() 
                                  ? 'text-emerald-700' 
                                  : 'text-stone-900'
                              }`}>
                                {displayHomeName}
                              </span>
                              {m.homePlaceholder && (
                                <span className="text-[10px] text-stone-400 font-mono">
                                  ({m.homePlaceholder})
                                </span>
                              )}
                              {isCompleted && matchResult.winnerName?.toLowerCase() === displayHomeName.toLowerCase() && (
                                <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 text-[9px] font-black rounded uppercase">
                                  Winner {matchResult.wentToPenalties ? '(Pens)' : ''}
                                </span>
                              )}
                              {(role === 'admin' || role === 'coach') && (
                                <button
                                  onClick={() => {
                                    setSlotEditState({
                                      match: m,
                                      slot: 'home',
                                      currentName: displayHomeName,
                                      placeholder: m.homePlaceholder
                                    });
                                    setSelectedSlotTeam(displayHomeName);
                                    setCustomSlotName('');
                                  }}
                                  className="p-1 text-stone-400 hover:text-emerald-600 rounded hover:bg-stone-200 transition-colors"
                                  title="Manually assign or override this team slot"
                                >
                                  <Edit size={10} />
                                </button>
                              )}
                            </div>
                            <div className="flex items-center gap-1 text-[10px]">
                              {isHomeConfirmed ? (
                                <span className="text-emerald-700 font-bold flex items-center gap-0.5">
                                  <CheckCircle2 size={11} /> Qualified
                                </span>
                              ) : homeRes.status === 'provisional' ? (
                                <span className="text-amber-600 font-bold flex items-center gap-0.5">
                                  <Clock size={11} /> Current 1st (In Progress)
                                </span>
                              ) : (
                                <span className="text-stone-400 font-medium italic">
                                  Awaiting previous round completion
                                </span>
                              )}
                            </div>
                          </div>
                          {isCompleted && (
                            <div className="text-right">
                              <span className="text-xl font-black text-stone-900">
                                {matchResult.homeScore}
                              </span>
                              {matchResult.wentToPenalties && matchResult.homePens !== null && (
                                <span className="block text-[10px] font-black text-amber-700">
                                  ({matchResult.homePens} pens)
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="border-t border-stone-200 my-1 flex justify-between items-center text-[10px] text-stone-400 font-bold uppercase tracking-widest px-1">
                          <span>VS</span>
                          {m.location && <span className="flex items-center gap-1"><MapPin size={10} /> {m.location}</span>}
                        </div>

                        {/* Away Team */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="space-y-0.5 flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className={`font-black text-sm uppercase truncate ${
                                isCompleted && matchResult.winnerName?.toLowerCase() === displayAwayName.toLowerCase() 
                                  ? 'text-emerald-700' 
                                  : 'text-stone-900'
                              }`}>
                                {displayAwayName}
                              </span>
                              {m.awayPlaceholder && (
                                <span className="text-[10px] text-stone-400 font-mono">
                                  ({m.awayPlaceholder})
                                </span>
                              )}
                              {isCompleted && matchResult.winnerName?.toLowerCase() === displayAwayName.toLowerCase() && (
                                <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 text-[9px] font-black rounded uppercase">
                                  Winner {matchResult.wentToPenalties ? '(Pens)' : ''}
                                </span>
                              )}
                              {(role === 'admin' || role === 'coach') && (
                                <button
                                  onClick={() => {
                                    setSlotEditState({
                                      match: m,
                                      slot: 'away',
                                      currentName: displayAwayName,
                                      placeholder: m.awayPlaceholder
                                    });
                                    setSelectedSlotTeam(displayAwayName);
                                    setCustomSlotName('');
                                  }}
                                  className="p-1 text-stone-400 hover:text-emerald-600 rounded hover:bg-stone-200 transition-colors"
                                  title="Manually assign or override this team slot"
                                >
                                  <Edit size={10} />
                                </button>
                              )}
                            </div>
                            <div className="flex items-center gap-1 text-[10px]">
                              {isAwayConfirmed ? (
                                <span className="text-emerald-700 font-bold flex items-center gap-0.5">
                                  <CheckCircle2 size={11} /> Qualified
                                </span>
                              ) : awayRes.status === 'provisional' ? (
                                <span className="text-amber-600 font-bold flex items-center gap-0.5">
                                  <Clock size={11} /> Current 2nd (In Progress)
                                </span>
                              ) : (
                                <span className="text-stone-400 font-medium italic">
                                  Awaiting previous round completion
                                </span>
                              )}
                            </div>
                          </div>
                          {isCompleted && (
                            <div className="text-right">
                              <span className="text-xl font-black text-stone-900">
                                {matchResult.awayScore}
                              </span>
                              {matchResult.wentToPenalties && matchResult.awayPens !== null && (
                                <span className="block text-[10px] font-black text-amber-700">
                                  ({matchResult.awayPens} pens)
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Shootout Badge Notice if applicable */}
                      {isCompleted && matchResult.wentToPenalties && (
                        <div className="px-3 py-1.5 bg-amber-50 border border-amber-200/80 rounded-xl flex items-center justify-between text-xs">
                          <span className="font-bold text-amber-900 flex items-center gap-1">
                            <Award size={12} className="text-amber-600" />
                            Decided by Penalty Shootout:
                          </span>
                          <span className="font-mono font-black text-amber-950">
                            {matchResult.homePens} - {matchResult.awayPens} pens ({matchResult.winnerName} advanced)
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Actions & Score Update */}
                    <div className="flex flex-wrap justify-between items-center gap-2 pt-2 border-t border-stone-100">
                      <div className="text-[11px] text-stone-500 font-bold flex items-center gap-2">
                        {m.date ? (
                          <span>📅 {new Date(typeof m.date === 'string' ? m.date : m.date.toDate?.() || 0).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                        ) : 'Date TBD'}
                        {m.location && (
                          <span className="text-stone-400 font-normal">| 🏟️ {m.location}</span>
                        )}
                      </div>

                      {(role === 'admin' || role === 'coach') && (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingKnockoutSchedule(m);
                              const dt = m.date ? (typeof m.date === 'string' ? new Date(m.date) : m.date.toDate?.() || new Date()) : new Date();
                              setEditKnockoutDate(dt.toISOString().slice(0, 16));
                              setEditKnockoutStadium(m.location || 'Main Stadium');
                            }}
                            className="px-2.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold rounded-xl transition-colors flex items-center gap-1 border border-stone-200"
                            title="Change date, kickoff time, or stadium"
                          >
                            <Calendar size={12} />
                            <span>Date & Venue</span>
                          </button>
                          <button
                            onClick={() => handleOpenScoreModal(m)}
                            className="px-3 py-1.5 bg-stone-900 text-white hover:bg-stone-800 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 shadow-sm"
                          >
                            <Edit size={12} />
                            <span>{m.score ? `Result (${m.score})` : 'Result'}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Generate Knockouts Configuration Modal */}
      {isGenKnockoutModalOpen && (
        <div className="fixed inset-0 bg-stone-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full border border-stone-200 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Award size={20} className="text-amber-500" />
                <h4 className="text-base font-black uppercase text-stone-900">Generate Knockout Stage</h4>
              </div>
              <button onClick={() => setIsGenKnockoutModalOpen(false)} className="p-1 text-stone-400 hover:text-stone-600">
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-stone-500 leading-relaxed">
              Select the tournament qualification and advancement format for this competition. The generator will calculate the starting knockout round (Round of 32, Round of 16, Quarter-Finals, Semi-Finals, or Final) based on the number of advancing teams.
            </p>

            <div className="space-y-3">
              <label className="text-xs font-bold text-stone-400 uppercase tracking-wider block">
                Advancement / Qualification Rule
              </label>
              
              <div className="space-y-2">
                <label className={`flex items-start gap-3 p-3 rounded-2xl border cursor-pointer transition-all ${
                  advancementFormatForModal === 'top_2' ? 'bg-emerald-50 border-emerald-500 text-emerald-950 shadow-xs' : 'bg-stone-50 border-stone-200 text-stone-700'
                }`}>
                  <input
                    type="radio"
                    name="advancementFormat"
                    value="top_2"
                    checked={advancementFormatForModal === 'top_2'}
                    onChange={() => {
                      setAdvancementFormatForModal('top_2');
                      setModalQualifiersPerGroup(2);
                    }}
                    className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                  />
                  <div className="text-xs">
                    <span className="font-extrabold block">Top 2 Teams per Group (Standard)</span>
                    <span className="text-[11px] text-stone-500">Group winners & 2nd-place teams advance ({groupsInLeague.length * 2 || 4} total teams).</span>
                  </div>
                </label>

                <label className={`flex items-start gap-3 p-3 rounded-2xl border cursor-pointer transition-all ${
                  advancementFormatForModal === 'top_2_plus_best_3rd' ? 'bg-emerald-50 border-emerald-500 text-emerald-950 shadow-xs' : 'bg-stone-50 border-stone-200 text-stone-700'
                }`}>
                  <input
                    type="radio"
                    name="advancementFormat"
                    value="top_2_plus_best_3rd"
                    checked={advancementFormatForModal === 'top_2_plus_best_3rd'}
                    onChange={() => {
                      setAdvancementFormatForModal('top_2_plus_best_3rd');
                      setModalQualifiersPerGroup(2);
                    }}
                    className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                  />
                  <div className="text-xs">
                    <span className="font-extrabold block">Top 2 + Best 3rd Place Teams / Best Losers (Euro / Wildcard Format)</span>
                    <span className="text-[11px] text-stone-500">Top 2 from each group + highest-ranked 3rd-place teams via cross-group points tiebreaker.</span>
                  </div>
                </label>

                <label className={`flex items-start gap-3 p-3 rounded-2xl border cursor-pointer transition-all ${
                  advancementFormatForModal === 'top_1' ? 'bg-emerald-50 border-emerald-500 text-emerald-950 shadow-xs' : 'bg-stone-50 border-stone-200 text-stone-700'
                }`}>
                  <input
                    type="radio"
                    name="advancementFormat"
                    value="top_1"
                    checked={advancementFormatForModal === 'top_1'}
                    onChange={() => {
                      setAdvancementFormatForModal('top_1');
                      setModalQualifiersPerGroup(1);
                    }}
                    className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                  />
                  <div className="text-xs">
                    <span className="font-extrabold block">Top 1 Group Winners Only</span>
                    <span className="text-[11px] text-stone-500">Only group winners advance ({groupsInLeague.length || 2} teams).</span>
                  </div>
                </label>

                <label className={`flex items-start gap-3 p-3 rounded-2xl border cursor-pointer transition-all ${
                  advancementFormatForModal === 'top_3' ? 'bg-emerald-50 border-emerald-500 text-emerald-950 shadow-xs' : 'bg-stone-50 border-stone-200 text-stone-700'
                }`}>
                  <input
                    type="radio"
                    name="advancementFormat"
                    value="top_3"
                    checked={advancementFormatForModal === 'top_3'}
                    onChange={() => {
                      setAdvancementFormatForModal('top_3');
                      setModalQualifiersPerGroup(3);
                    }}
                    className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                  />
                  <div className="text-xs">
                    <span className="font-extrabold block">Top 3 Teams per Group (Playoff Bracket)</span>
                    <span className="text-[11px] text-stone-500">Top 3 advance from each group ({groupsInLeague.length * 3 || 6} teams total).</span>
                  </div>
                </label>

                <label className={`flex items-start gap-3 p-3 rounded-2xl border cursor-pointer transition-all ${
                  advancementFormatForModal === 'top_4' ? 'bg-emerald-50 border-emerald-500 text-emerald-950 shadow-xs' : 'bg-stone-50 border-stone-200 text-stone-700'
                }`}>
                  <input
                    type="radio"
                    name="advancementFormat"
                    value="top_4"
                    checked={advancementFormatForModal === 'top_4'}
                    onChange={() => {
                      setAdvancementFormatForModal('top_4');
                      setModalQualifiersPerGroup(4);
                    }}
                    className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                  />
                  <div className="text-xs">
                    <span className="font-extrabold block">Top 4 Teams per Group</span>
                    <span className="text-[11px] text-stone-500">Top 4 teams advance ({groupsInLeague.length * 4 || 8} teams total).</span>
                  </div>
                </label>

                <label className={`flex items-start gap-3 p-3 rounded-2xl border cursor-pointer transition-all ${
                  advancementFormatForModal === 'custom' ? 'bg-emerald-50 border-emerald-500 text-emerald-950 shadow-xs' : 'bg-stone-50 border-stone-200 text-stone-700'
                }`}>
                  <input
                    type="radio"
                    name="advancementFormat"
                    value="custom"
                    checked={advancementFormatForModal === 'custom'}
                    onChange={() => setAdvancementFormatForModal('custom')}
                    className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                  />
                  <div className="text-xs flex-1">
                    <span className="font-extrabold block">Custom Advancement Rule (Admin Specified)</span>
                    <span className="text-[11px] text-stone-500">For special tournament rules (e.g. varying advancing teams per group, seeded entries, etc.).</span>
                  </div>
                </label>
              </div>

              {/* Wildcard Rule Details */}
              {advancementFormatForModal === 'top_2_plus_best_3rd' && (
                <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                      <Award size={14} className="text-amber-600" />
                      <span>Wildcard Advancement Configuration</span>
                    </div>
                    <span className="text-[10px] text-amber-800 font-extrabold uppercase">
                      Euro Tournament Style
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-amber-900 block mb-1">
                        Wildcard Team Count
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="16"
                        value={modalWildcardCount}
                        onChange={e => setModalWildcardCount(Math.max(1, parseInt(e.target.value) || 0))}
                        className="w-full px-3 py-2 rounded-xl bg-white border border-amber-300 text-xs font-bold text-stone-900 focus:ring-2 focus:ring-amber-500/20"
                      />
                      <span className="text-[10px] text-amber-700/80 block mt-1">
                        Best 3rd-place teams (e.g. 8 for 12 groups, 4 for 6 groups, 2 for 3 groups)
                      </span>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-stone-700 block mb-1">
                        Total Advancing Teams
                      </label>
                      <input
                        type="number"
                        min="2"
                        max="64"
                        placeholder={`Auto: ${((groupsInLeague.length || 2) * 2) + modalWildcardCount}`}
                        value={modalCustomAdvancingTotal}
                        onChange={e => setModalCustomAdvancingTotal(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-white border border-stone-300 text-xs font-bold text-stone-900"
                      />
                      <span className="text-[10px] text-stone-500 block mt-1">
                        {((groupsInLeague.length || 2) * 2)} Direct + {modalWildcardCount} Wildcards = {((groupsInLeague.length || 2) * 2) + modalWildcardCount} Total
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Custom Rule Details */}
              {advancementFormatForModal === 'custom' && (
                <div className="p-4 bg-stone-100 rounded-2xl border border-stone-200 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-stone-600 block mb-1">
                        Qualifiers Per Group
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="8"
                        value={modalQualifiersPerGroup}
                        onChange={e => setModalQualifiersPerGroup(parseInt(e.target.value) || 2)}
                        className="w-full px-3 py-2 rounded-xl bg-white border border-stone-300 text-xs font-bold text-stone-900"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-stone-600 block mb-1">
                        Total Advancing Teams (Optional)
                      </label>
                      <input
                        type="number"
                        min="2"
                        max="64"
                        placeholder="e.g. 16, 24, 32"
                        value={modalCustomAdvancingTotal}
                        onChange={e => setModalCustomAdvancingTotal(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-white border border-stone-300 text-xs font-bold text-stone-900"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-stone-600 block mb-1">
                      Custom Rule Description / Notes
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Group A/B top 2 advance, plus 4 seeded playoff entries"
                      value={modalCustomRuleText}
                      onChange={e => setModalCustomRuleText(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-stone-300 text-xs text-stone-900"
                    />
                  </div>
                </div>
              )}

              {/* Flexible Scheduling Rules for Knockout Stage */}
              <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-stone-700">
                  <Calendar size={14} className="text-emerald-600" />
                  <span>Knockout Scheduling & Venue Configuration</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-stone-600 block mb-1">
                      Knockout Stage Start Date & Time
                    </label>
                    <input
                      type="datetime-local"
                      value={modalStartDate}
                      onChange={e => setModalStartDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-stone-300 text-xs font-bold text-stone-900"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-stone-600 block mb-1">
                      Stadium / Venue
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. National Stadium"
                      value={modalLocation}
                      onChange={e => setModalLocation(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-stone-300 text-xs font-bold text-stone-900"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-stone-600 block mb-1">
                      Matches per Day
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={modalMatchesPerDay}
                      onChange={e => setModalMatchesPerDay(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-stone-300 text-xs font-bold text-stone-900"
                    />
                    <span className="text-[10px] text-stone-500 block mt-0.5">Games played per day</span>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-stone-600 block mb-1">
                      Rest Days Between Rounds
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="30"
                      value={modalRestDaysBetweenRounds}
                      onChange={e => setModalRestDaysBetweenRounds(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-stone-300 text-xs font-bold text-stone-900"
                    />
                    <span className="text-[10px] text-stone-500 block mt-0.5">Days off before next stage</span>
                  </div>
                </div>
              </div>

              {/* Dynamic Knockout Stage Calculated Preview */}
              {(() => {
                const gCount = groupsInLeague.length || 2;
                const directQualifiers = gCount * modalQualifiersPerGroup;
                const wildcards = advancementFormatForModal === 'top_2_plus_best_3rd' 
                  ? (modalWildcardCount || (gCount === 12 ? 8 : (gCount === 3 ? 2 : 4)))
                  : (gCount === 12 ? 8 : 0);

                let totalTeams = directQualifiers + wildcards;
                if (advancementFormatForModal === 'custom' && modalCustomAdvancingTotal) {
                  totalTeams = parseInt(modalCustomAdvancingTotal) || totalTeams;
                } else if (advancementFormatForModal === 'top_2_plus_best_3rd' && modalCustomAdvancingTotal) {
                  totalTeams = parseInt(modalCustomAdvancingTotal) || totalTeams;
                }

                let startingStageName = 'Semi-Finals';
                if (totalTeams >= 32) startingStageName = 'Round of 32 (16 matches)';
                else if (totalTeams >= 16) startingStageName = 'Round of 16 (8 matches)';
                else if (totalTeams >= 8) startingStageName = 'Quarter-Finals (4 matches)';
                else if (totalTeams >= 4) startingStageName = 'Semi-Finals (2 matches)';
                else startingStageName = 'Grand Final (1 match)';

                return (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-amber-900 block">Starting Knockout Round:</span>
                      <span className="font-extrabold text-amber-800 text-sm">{startingStageName}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold text-amber-700 block">Total Advancing</span>
                      <span className="px-2 py-0.5 bg-amber-200/80 text-amber-950 font-black rounded-lg text-xs">
                        {totalTeams} Teams {wildcards > 0 && `(${directQualifiers} Direct + ${wildcards} Wildcards)`}
                      </span>
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsGenKnockoutModalOpen(false)}
                className="flex-1 py-2.5 bg-stone-100 text-stone-700 text-xs font-bold rounded-xl hover:bg-stone-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleQuickGenerateKnockouts(advancementFormatForModal)}
                disabled={isGeneratingKnockouts}
                className="flex-1 py-2.5 bg-amber-500 text-stone-950 text-xs font-black uppercase tracking-wider rounded-xl hover:bg-amber-400 flex items-center justify-center gap-1.5 shadow-md"
              >
                {isGeneratingKnockouts ? <Loader2 size={14} className="animate-spin" /> : <Award size={14} />}
                <span>Generate Bracket</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Custom Knockout Fixture Modal (Admin Exception Management) */}
      {isAddKnockoutModalOpen && (
        <div className="fixed inset-0 bg-stone-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full border border-stone-200 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <Plus size={20} className="text-emerald-600" />
                <h4 className="text-base font-black uppercase text-stone-900">Add Custom Knockout Fixture</h4>
              </div>
              <button onClick={() => setIsAddKnockoutModalOpen(false)} className="p-1 text-stone-400 hover:text-stone-600">
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-stone-500 leading-relaxed">
              Create a custom knockout pairing for exceptional tournament structures — such as wildcard playoffs, seeded teams entering at later rounds, or groups advancing 3 teams.
            </p>

            <div className="space-y-4">
              {/* Stage Selection */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-stone-400 uppercase tracking-wider block mb-1">
                    Stage / Round
                  </label>
                  <select
                    value={newFixtureStage}
                    onChange={e => setNewFixtureStage(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  >
                    <option value="playoff">Playoff Round</option>
                    <option value="preliminary">Preliminary Round</option>
                    <option value="round_of_16">Round of 16</option>
                    <option value="quarter_final">Quarter-Final</option>
                    <option value="semi_final">Semi-Final</option>
                    <option value="third_place">3rd Place Playoff</option>
                    <option value="final">Grand Final</option>
                    <option value="custom">+ Custom Round Name</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-stone-400 uppercase tracking-wider block mb-1">
                    Match # (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Match #205"
                    value={newFixtureMatchNum}
                    onChange={e => setNewFixtureMatchNum(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
              </div>

              {newFixtureStage === 'custom' && (
                <div>
                  <label className="text-xs font-bold text-stone-400 uppercase tracking-wider block mb-1">
                    Custom Stage Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Wildcard Qualifier or Plate Semi-Final"
                    value={newFixtureCustomStage}
                    onChange={e => setNewFixtureCustomStage(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
              )}

              {/* HOME TEAM SETUP */}
              <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200 space-y-2.5">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-black uppercase text-stone-800">Home Slot Definition</span>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => setNewFixtureHomeType('rule')}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        newFixtureHomeType === 'rule' ? 'bg-stone-900 text-white' : 'bg-stone-200 text-stone-600'
                      }`}
                    >
                      Rule Placeholder
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewFixtureHomeType('team')}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        newFixtureHomeType === 'team' ? 'bg-stone-900 text-white' : 'bg-stone-200 text-stone-600'
                      }`}
                    >
                      Direct Team
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewFixtureHomeType('custom')}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        newFixtureHomeType === 'custom' ? 'bg-stone-900 text-white' : 'bg-stone-200 text-stone-600'
                      }`}
                    >
                      Custom Text
                    </button>
                  </div>
                </div>

                {newFixtureHomeType === 'rule' && (
                  <div>
                    <input
                      type="text"
                      placeholder="e.g. Winner Group A, 3rd Place Group C, or Winner Match #201"
                      value={newFixtureHomeRule}
                      onChange={e => setNewFixtureHomeRule(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {groupsInLeague.slice(0, 4).map(g => (
                        <button
                          key={`h-${g}`}
                          type="button"
                          onClick={() => setNewFixtureHomeRule(`Winner ${g}`)}
                          className="px-1.5 py-0.5 bg-stone-200 hover:bg-stone-300 text-stone-700 rounded text-[9px] font-bold"
                        >
                          Winner {g}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setNewFixtureHomeRule('Best 3rd Place #1')}
                        className="px-1.5 py-0.5 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded text-[9px] font-bold"
                      >
                        Best 3rd #1
                      </button>
                    </div>
                  </div>
                )}

                {newFixtureHomeType === 'team' && (
                  <select
                    value={newFixtureHomeTeam}
                    onChange={e => setNewFixtureHomeTeam(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  >
                    <option value="">Select registered team (e.g. Seeded late-entry team)...</option>
                    {teams.map(t => (
                      <option key={t.id} value={t.name}>{t.name}</option>
                    ))}
                  </select>
                )}

                {newFixtureHomeType === 'custom' && (
                  <input
                    type="text"
                    placeholder="e.g. Invited Seed 1 or Wildcard Guest"
                    value={newFixtureHomeCustom}
                    onChange={e => setNewFixtureHomeCustom(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                )}
              </div>

              {/* AWAY TEAM SETUP */}
              <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200 space-y-2.5">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-black uppercase text-stone-800">Away Slot Definition</span>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => setNewFixtureAwayType('rule')}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        newFixtureAwayType === 'rule' ? 'bg-stone-900 text-white' : 'bg-stone-200 text-stone-600'
                      }`}
                    >
                      Rule Placeholder
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewFixtureAwayType('team')}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        newFixtureAwayType === 'team' ? 'bg-stone-900 text-white' : 'bg-stone-200 text-stone-600'
                      }`}
                    >
                      Direct Team
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewFixtureAwayType('custom')}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        newFixtureAwayType === 'custom' ? 'bg-stone-900 text-white' : 'bg-stone-200 text-stone-600'
                      }`}
                    >
                      Custom Text
                    </button>
                  </div>
                </div>

                {newFixtureAwayType === 'rule' && (
                  <div>
                    <input
                      type="text"
                      placeholder="e.g. 2nd Place Group B, 3rd Place Group A, or Winner Match #202"
                      value={newFixtureAwayRule}
                      onChange={e => setNewFixtureAwayRule(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {groupsInLeague.slice(0, 4).map(g => (
                        <button
                          key={`a-${g}`}
                          type="button"
                          onClick={() => setNewFixtureAwayRule(`2nd Place ${g}`)}
                          className="px-1.5 py-0.5 bg-stone-200 hover:bg-stone-300 text-stone-700 rounded text-[9px] font-bold"
                        >
                          2nd {g}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setNewFixtureAwayRule('Best 3rd Place #2')}
                        className="px-1.5 py-0.5 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded text-[9px] font-bold"
                      >
                        Best 3rd #2
                      </button>
                    </div>
                  </div>
                )}

                {newFixtureAwayType === 'team' && (
                  <select
                    value={newFixtureAwayTeam}
                    onChange={e => setNewFixtureAwayTeam(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  >
                    <option value="">Select registered team...</option>
                    {teams.map(t => (
                      <option key={t.id} value={t.name}>{t.name}</option>
                    ))}
                  </select>
                )}

                {newFixtureAwayType === 'custom' && (
                  <input
                    type="text"
                    placeholder="e.g. Wildcard Challenger"
                    value={newFixtureAwayCustom}
                    onChange={e => setNewFixtureAwayCustom(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                )}
              </div>

              {/* Date, Time, Venue */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block mb-1">Date</label>
                  <input
                    type="date"
                    value={newFixtureDate}
                    onChange={e => setNewFixtureDate(e.target.value)}
                    className="w-full px-2.5 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block mb-1">Time</label>
                  <input
                    type="time"
                    value={newFixtureTime}
                    onChange={e => setNewFixtureTime(e.target.value)}
                    className="w-full px-2.5 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block mb-1">Venue</label>
                  <input
                    type="text"
                    value={newFixtureLocation}
                    onChange={e => setNewFixtureLocation(e.target.value)}
                    placeholder="Stadium"
                    className="w-full px-2.5 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setIsAddKnockoutModalOpen(false)}
                className="flex-1 py-2.5 bg-stone-100 text-stone-700 text-xs font-bold rounded-xl hover:bg-stone-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddCustomKnockoutFixture}
                disabled={isCreatingCustomFixture}
                className="flex-1 py-2.5 bg-emerald-600 text-white text-xs font-black uppercase tracking-wider rounded-xl hover:bg-emerald-700 flex items-center justify-center gap-1.5 shadow-md"
              >
                {isCreatingCustomFixture ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                <span>Add Knockout Match</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Bracket Slot Assignment / Override Modal */}
      {slotEditState && (
        <div className="fixed inset-0 bg-stone-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full border border-stone-200 shadow-2xl space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="text-base font-black uppercase text-stone-900">
                Override {slotEditState.slot === 'home' ? 'Home' : 'Away'} Bracket Slot
              </h4>
              <button onClick={() => setSlotEditState(null)} className="p-1 text-stone-400 hover:text-stone-600">
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-stone-500 font-medium">
              Match: <span className="font-bold text-stone-800">{slotEditState.match.fixtureRound || 'Knockout Match'}</span>
              {slotEditState.placeholder && ` (Rule: ${slotEditState.placeholder})`}
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-stone-400 uppercase tracking-wider block mb-1">
                  Choose Registered Team
                </label>
                <select
                  value={selectedSlotTeam}
                  onChange={e => setSelectedSlotTeam(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                >
                  <option value="">Select a team...</option>
                  {teams.map(t => (
                    <option key={t.id} value={t.name}>{t.name}</option>
                  ))}
                  <option value="__custom__">+ Enter Custom Team Name</option>
                </select>
              </div>

              {selectedSlotTeam === '__custom__' && (
                <div>
                  <label className="text-xs font-bold text-stone-400 uppercase tracking-wider block mb-1">
                    Custom Team Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Wildcard Winner"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-stone-50 border border-stone-200 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    value={customSlotName}
                    onChange={e => setCustomSlotName(e.target.value)}
                    autoFocus
                  />
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSlotEditState(null)}
                className="flex-1 py-2.5 bg-stone-100 text-stone-700 text-xs font-bold rounded-xl hover:bg-stone-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveSlotOverride}
                disabled={isSavingSlot}
                className="flex-1 py-2.5 bg-emerald-600 text-white text-xs font-black uppercase tracking-wider rounded-xl hover:bg-emerald-700 flex items-center justify-center gap-1.5 shadow-md"
              >
                {isSavingSlot ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                <span>Assign Slot</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Enter Match Result & Penalty Shootout Modal */}
      {scoreEditMatch && (
        <div className="fixed inset-0 bg-stone-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-stone-200 shadow-2xl space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Award size={20} className="text-amber-500" />
                <h4 className="text-base font-black uppercase text-stone-900">Enter Match Result</h4>
              </div>
              <button onClick={() => setScoreEditMatch(null)} className="p-1 text-stone-400 hover:text-stone-600">
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-stone-500 font-medium">
              <span className="font-extrabold text-stone-900">{scoreEditMatch.homeResolvedTeam || scoreEditMatch.homeTeamName || scoreEditMatch.homePlaceholder || 'Home Team'}</span>
              <span className="mx-2 text-stone-400 font-bold">vs</span>
              <span className="font-extrabold text-stone-900">{scoreEditMatch.awayResolvedTeam || scoreEditMatch.awayTeamName || scoreEditMatch.awayPlaceholder || 'Away Team'}</span>
            </p>

            <div className="space-y-4">
              {/* Full Time Score Inputs */}
              <div>
                <label className="text-xs font-bold text-stone-400 uppercase tracking-wider block mb-1">
                  Full Time Score (Goals)
                </label>
                <div className="flex items-center gap-3">
                  <div className="flex-1 space-y-1">
                    <span className="text-[11px] font-bold text-stone-600 block truncate">
                      {scoreEditMatch.homeResolvedTeam || scoreEditMatch.homeTeamName || 'Home'}
                    </span>
                    <input
                      type="number"
                      min="0"
                      placeholder="0"
                      className="w-full px-3 py-2.5 text-center text-xl font-mono font-black rounded-xl bg-stone-50 border border-stone-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      value={scoreHomeFT}
                      onChange={e => {
                        setScoreHomeFT(e.target.value);
                        // Auto check shootout if tied
                        if (e.target.value && scoreAwayFT && e.target.value === scoreAwayFT) {
                          setHasPenalties(true);
                        }
                      }}
                      autoFocus
                    />
                  </div>

                  <span className="text-xl font-black text-stone-400 pt-5">-</span>

                  <div className="flex-1 space-y-1">
                    <span className="text-[11px] font-bold text-stone-600 block truncate">
                      {scoreEditMatch.awayResolvedTeam || scoreEditMatch.awayTeamName || 'Away'}
                    </span>
                    <input
                      type="number"
                      min="0"
                      placeholder="0"
                      className="w-full px-3 py-2.5 text-center text-xl font-mono font-black rounded-xl bg-stone-50 border border-stone-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      value={scoreAwayFT}
                      onChange={e => {
                        setScoreAwayFT(e.target.value);
                        // Auto check shootout if tied
                        if (scoreHomeFT && e.target.value && scoreHomeFT === e.target.value) {
                          setHasPenalties(true);
                        }
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Penalty Shootout Toggle */}
              <div className="pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={hasPenalties}
                    onChange={e => setHasPenalties(e.target.checked)}
                    className="rounded text-amber-600 focus:ring-amber-500 h-4 w-4"
                  />
                  <span className="text-xs font-bold text-stone-800">
                    Match decided by Penalty Shootout
                  </span>
                </label>
              </div>

              {/* Penalty Shootout Inputs */}
              {hasPenalties && (
                <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase text-amber-950">Penalty Shootout Score</span>
                    <span className="text-[10px] font-bold text-amber-800">Must have a winner</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex-1 space-y-1">
                      <span className="text-[10px] font-bold text-amber-900 block truncate">
                        {scoreEditMatch.homeResolvedTeam || scoreEditMatch.homeTeamName || 'Home'} Pens
                      </span>
                      <input
                        type="number"
                        min="0"
                        placeholder="5"
                        className="w-full px-3 py-2 text-center text-lg font-mono font-black rounded-xl bg-white border border-amber-300 text-amber-950 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                        value={scoreHomePens}
                        onChange={e => setScoreHomePens(e.target.value)}
                      />
                    </div>

                    <span className="text-lg font-black text-amber-600 pt-4">-</span>

                    <div className="flex-1 space-y-1">
                      <span className="text-[10px] font-bold text-amber-900 block truncate">
                        {scoreEditMatch.awayResolvedTeam || scoreEditMatch.awayTeamName || 'Away'} Pens
                      </span>
                      <input
                        type="number"
                        min="0"
                        placeholder="4"
                        className="w-full px-3 py-2 text-center text-lg font-mono font-black rounded-xl bg-white border border-amber-300 text-amber-950 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                        value={scoreAwayPens}
                        onChange={e => setScoreAwayPens(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setScoreEditMatch(null)}
                className="flex-1 py-2.5 bg-stone-100 text-stone-700 text-xs font-bold rounded-xl hover:bg-stone-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveScoreModal}
                disabled={isUpdatingScore}
                className="flex-1 py-2.5 bg-emerald-600 text-white text-xs font-black uppercase tracking-wider rounded-xl hover:bg-emerald-700 flex items-center justify-center gap-1.5 shadow-md"
              >
                {isUpdatingScore ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                <span>Save Result</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Knockout Match Date & Stadium Editor Modal */}
      {editingKnockoutSchedule && (
        <div className="fixed inset-0 bg-stone-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-stone-200 shadow-2xl space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Calendar size={20} className="text-emerald-600" />
                <h4 className="text-base font-black uppercase text-stone-900">Change Date & Stadium</h4>
              </div>
              <button onClick={() => setEditingKnockoutSchedule(null)} className="p-1 text-stone-400 hover:text-stone-600">
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-stone-500">
              Update scheduled kickoff date, time, and stadium for{' '}
              <span className="font-bold text-stone-800">
                {editingKnockoutSchedule.homeResolvedTeam || editingKnockoutSchedule.homePlaceholder || editingKnockoutSchedule.homeTeamName || 'TBD'} vs{' '}
                {editingKnockoutSchedule.awayResolvedTeam || editingKnockoutSchedule.awayPlaceholder || editingKnockoutSchedule.awayTeamName || 'TBD'}
              </span>{' '}
              ({editingKnockoutSchedule.fixtureRound || editingKnockoutSchedule.stage}).
            </p>

            <form onSubmit={handleSaveKnockoutSchedule} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500 block mb-1">
                  Kickoff Date & Time
                </label>
                <input
                  type="datetime-local"
                  required
                  value={editKnockoutDate}
                  onChange={e => setEditKnockoutDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-stone-50 border border-stone-200 text-xs font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500 block mb-1">
                  Stadium / Venue
                </label>
                <input
                  type="text"
                  placeholder="e.g. City Arena, Pitch 1"
                  required
                  value={editKnockoutStadium}
                  onChange={e => setEditKnockoutStadium(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-stone-50 border border-stone-200 text-xs font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div className="flex gap-2 pt-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setEditingKnockoutSchedule(null)}
                  className="flex-1 py-2.5 bg-stone-100 text-stone-700 text-xs font-bold rounded-xl hover:bg-stone-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingKnockoutSchedule}
                  className="flex-1 py-2.5 bg-emerald-600 text-white text-xs font-black uppercase tracking-wider rounded-xl hover:bg-emerald-700 flex items-center justify-center gap-1.5 shadow-md"
                >
                  {isSavingKnockoutSchedule ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                  <span>Save Schedule</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
// --- Drill Library View ---
function DrillLibraryView({ teamId, role }: { teamId: string, role: string }) {
  const [drills, setDrills] = useState<DrillLibraryItem[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingDrill, setEditingDrill] = useState<DrillLibraryItem | null>(null);
  const [activeModalImage, setActiveModalImage] = useState<{ src: string; title?: string } | null>(null);

  const [newDrill, setNewDrill] = useState<Partial<DrillLibraryItem>>({ 
    title: '', 
    description: '', 
    imageUrl: '',
    category: 'General'
  });

  const canEdit = role === 'admin' || role === 'coach';

  useEffect(() => {
    // Drills can be global (no teamId) or team-specific
    const q = query(collection(db, 'drills'), orderBy('title'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setDrills(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DrillLibraryItem)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'drills'));
    return () => unsubscribe();
  }, []);

  const handleAddDrill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDrill.title || !newDrill.description) return;
    try {
      await addDoc(collection(db, 'drills'), { ...newDrill, teamId: teamId || null });
      setNewDrill({ title: '', description: '', imageUrl: '', category: 'General' });
      setIsAdding(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'drills');
    }
  };

  const handleUpdateDrill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDrill || !editingDrill.title || !editingDrill.description) return;
    try {
      const { id, ...data } = editingDrill;
      await updateDoc(doc(db, 'drills', id), data);
      setEditingDrill(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `drills/${editingDrill.id}`);
    }
  };

  const currentImageUrl = editingDrill ? editingDrill.imageUrl : newDrill.imageUrl;

  const updateCurrentImageUrl = (url: string) => {
    if (editingDrill) {
      setEditingDrill({ ...editingDrill, imageUrl: url });
    } else {
      setNewDrill({ ...newDrill, imageUrl: url });
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }}
      className="space-y-8"
    >
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-black tracking-tight uppercase italic mb-1">Drill Library</h2>
          <p className="text-stone-500 font-medium">Reusable training exercises</p>
        </div>
        {canEdit && (
          <button 
            onClick={() => { setIsAdding(true); setEditingDrill(null); }}
            className="bg-emerald-600 text-white p-3 rounded-xl shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition-colors"
          >
            <Plus size={24} />
          </button>
        )}
      </div>

      <AnimatePresence>
        {(isAdding || editingDrill) && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <form onSubmit={editingDrill ? handleUpdateDrill : handleAddDrill} className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-4">
              <h3 className="font-bold text-lg">{editingDrill ? 'Edit Drill' : 'Add New Drill'}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input 
                  placeholder="Drill Title"
                  className="w-full px-4 py-3 rounded-xl bg-stone-50 border border-stone-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-bold"
                  value={editingDrill ? editingDrill.title : newDrill.title}
                  onChange={e => editingDrill ? setEditingDrill({...editingDrill, title: e.target.value}) : setNewDrill({...newDrill, title: e.target.value})}
                  required
                />
                <select 
                  className="w-full px-4 py-3 rounded-xl bg-stone-50 border border-stone-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-bold"
                  value={editingDrill ? editingDrill.category : newDrill.category}
                  onChange={e => editingDrill ? setEditingDrill({...editingDrill, category: e.target.value}) : setNewDrill({...newDrill, category: e.target.value})}
                >
                  <option value="General">General</option>
                  <option value="Technical">Technical</option>
                  <option value="Tactical">Tactical</option>
                  <option value="Physical">Physical</option>
                  <option value="Goalkeeping">Goalkeeping</option>
                </select>
              </div>
              <textarea 
                placeholder="Drill Description"
                rows={3}
                className="w-full px-4 py-3 rounded-xl bg-stone-50 border border-stone-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                value={editingDrill ? editingDrill.description : newDrill.description}
                onChange={e => editingDrill ? setEditingDrill({...editingDrill, description: e.target.value}) : setNewDrill({...newDrill, description: e.target.value})}
                required
              />

              <div className="space-y-3 bg-stone-50 p-4 rounded-xl border border-stone-200">
                <label className="text-xs font-bold text-stone-500 uppercase tracking-wider block">Drill Diagram / Image</label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input 
                    placeholder="Image URL (http://...)"
                    className="flex-1 px-4 py-2.5 rounded-xl bg-white border border-stone-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm"
                    value={currentImageUrl || ''}
                    onChange={e => updateCurrentImageUrl(e.target.value)}
                  />
                  <label className="cursor-pointer bg-stone-900 hover:bg-stone-800 text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors">
                    <Upload size={14} />
                    <span>Upload File</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = ev => updateCurrentImageUrl(ev.target?.result as string);
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">Presets:</span>
                  <select 
                    className="flex-1 text-xs px-3 py-2 rounded-xl border border-stone-200 bg-white font-medium"
                    value=""
                    onChange={e => {
                      if (e.target.value) updateCurrentImageUrl(e.target.value);
                    }}
                  >
                    <option value="">Select a preset diagram template...</option>
                    {PRESET_DRILL_IMAGES.map((p, i) => (
                      <option key={i} value={p.url}>{p.name}</option>
                    ))}
                  </select>
                </div>

                {currentImageUrl && (
                  <div className="mt-2 rounded-xl overflow-hidden border border-stone-200 max-h-48 bg-stone-200">
                    <SafeImage 
                      src={currentImageUrl} 
                      alt="Drill Preview" 
                      className="w-full h-48 object-cover"
                      onClick={() => setActiveModalImage({ src: currentImageUrl, title: 'Diagram Preview' })}
                    />
                  </div>
                )}
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-stone-100">
                <button type="button" onClick={() => { setIsAdding(false); setEditingDrill(null); }} className="px-6 py-2 text-stone-500 font-bold uppercase text-xs tracking-widest">Cancel</button>
                <button type="submit" className="px-6 py-2 bg-stone-900 text-white rounded-lg font-bold uppercase text-xs tracking-widest hover:bg-stone-800 transition-colors">
                  {editingDrill ? 'Update Drill' : 'Save Drill'}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {drills.map(drill => (
          <div key={drill.id} className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow group flex flex-col">
            <SafeImage 
              src={drill.imageUrl} 
              alt={drill.title} 
              containerClassName="w-full h-48 bg-stone-100 overflow-hidden"
              className="w-full h-48 object-cover"
              onClick={drill.imageUrl ? () => setActiveModalImage({ src: drill.imageUrl!, title: drill.title }) : undefined}
            />
            <div className="p-6 flex-1 flex flex-col">
              <div className="flex justify-between items-start mb-2">
                <span className="px-2 py-1 bg-stone-100 text-stone-500 text-[10px] font-bold uppercase tracking-widest rounded-md">
                  {drill.category}
                </span>
                <div className="flex gap-2">
                  {canEdit && (
                    <>
                      <button 
                        onClick={() => { setEditingDrill(drill); setIsAdding(false); }}
                        className="text-stone-300 hover:text-emerald-600 transition-colors"
                      >
                        <Edit size={16} />
                      </button>
                      <button 
                        onClick={async () => {
                          if (confirm("Delete this drill from library?")) {
                            await deleteDoc(doc(db, 'drills', drill.id));
                          }
                        }}
                        className="text-stone-300 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </>
                  )}
                </div>
              </div>
              <h3 className="text-xl font-bold mb-2">{drill.title}</h3>
              <p className="text-stone-500 text-sm line-clamp-3 leading-relaxed flex-1">{drill.description}</p>
            </div>
          </div>
        ))}
      </div>

      <ImageModal 
        src={activeModalImage?.src || null} 
        title={activeModalImage?.title} 
        onClose={() => setActiveModalImage(null)} 
      />
    </motion.div>
  );
}

// Safe Date Formatter for Matches
function formatMatchDateTime(dateVal: any): string {
  if (!dateVal) return 'TBD';
  try {
    const d = typeof dateVal === 'string' 
      ? new Date(dateVal) 
      : (dateVal?.toDate ? dateVal.toDate() : new Date(dateVal));
    if (isNaN(d.getTime())) return 'TBD';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  } catch {
    return 'TBD';
  }
}

function MatchesView({ teamId, role }: { teamId: string, role: string }) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [leagues, setLeagues] = useState<League[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingMatch, setEditingMatch] = useState<Match | null>(null);

  // Sub-tabs
  const [activeSubTab, setActiveSubTab] = useState<'fixtures' | 'table'>('fixtures');
  
  // League creation state
  const [isAddingLeague, setIsAddingLeague] = useState(false);
  const [newLeagueName, setNewLeagueName] = useState('');

  // Filtering
  const [filterType, setFilterType] = useState<'all' | 'league' | 'knockout' | 'friendly'>('all');
  const [filterLeagueId, setFilterLeagueId] = useState<string>('all');
  const [teamFilter, setTeamFilter] = useState<string>(role === 'admin' ? 'all' : (teamId || 'all'));
  const [statusFilter, setStatusFilter] = useState<'all' | 'scheduled' | 'completed' | 'postponed' | 'live'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [newMatch, setNewMatch] = useState<Partial<Match>>({ 
    opponent: '', 
    location: '', 
    date: '',
    matchType: 'league',
    leagueId: '',
    leagueName: '',
    matchNumber: '',
    fixtureRound: '',
    status: 'scheduled',
    attendees: [] 
  });

  const canEdit = role === 'admin' || role === 'coach';

  useEffect(() => {
    // Listen to ALL matches unconditionally so admins and coaches can view all fixtures across all leagues and stages
    const unsubscribe = onSnapshot(collection(db, 'matches'), (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Match));
      // Sort chronologically (latest / upcoming first)
      list.sort((a, b) => {
        const timeA = a.date ? (typeof a.date === 'string' ? new Date(a.date).getTime() : a.date?.toMillis?.() || 0) : 0;
        const timeB = b.date ? (typeof b.date === 'string' ? new Date(b.date).getTime() : b.date?.toMillis?.() || 0) : 0;
        return timeB - timeA;
      });
      setMatches(list);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'matches'));
    
    let pQ = collection(db, 'players');
    if (teamId) {
      pQ = query(collection(db, 'players'), where('teamId', '==', teamId), orderBy('name')) as any;
    }
    const pUnsubscribe = onSnapshot(pQ, (snapshot) => {
      setPlayers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Player)));
    });

    const lQ = query(collection(db, 'leagues'), orderBy('name'));
    const lUnsubscribe = onSnapshot(lQ, (snapshot) => {
      setLeagues(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as League)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'leagues'));

    const tQ = query(collection(db, 'teams'), orderBy('name'));
    const tUnsubscribe = onSnapshot(tQ, (snapshot) => {
      setTeams(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Team)));
    });

    return () => { unsubscribe(); pUnsubscribe(); lUnsubscribe(); tUnsubscribe(); };
  }, [teamId]);

  const handleCreateLeague = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLeagueName.trim()) return;
    try {
      const docRef = await addDoc(collection(db, 'leagues'), {
        name: newLeagueName.trim(),
        teamId: teamId || null
      });
      const createdName = newLeagueName.trim();
      if (editingMatch) {
        setEditingMatch({
          ...editingMatch,
          matchType: 'league',
          leagueId: docRef.id,
          leagueName: createdName
        });
      } else {
        setNewMatch({
          ...newMatch,
          matchType: 'league',
          leagueId: docRef.id,
          leagueName: createdName
        });
      }
      setNewLeagueName('');
      setIsAddingLeague(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'leagues');
    }
  };

  const handleAddMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMatch.opponent || !newMatch.date) return;
    try {
      const matchType = newMatch.matchType || 'league';
      let leagueId = matchType === 'league' ? (newMatch.leagueId || '') : '';
      let leagueName = matchType === 'league' ? (newMatch.leagueName || '') : '';

      if (matchType === 'league' && leagueId && !leagueName) {
        const found = leagues.find(l => l.id === leagueId);
        if (found) leagueName = found.name;
      }

      const matchTeamId = newMatch.teamId || teamId || (teams[0]?.id || 'global');
      const homeTeam = teams.find(t => t.id === matchTeamId);

      const matchData = {
        ...newMatch,
        teamId: matchTeamId,
        homeTeamName: newMatch.homeTeamName || (homeTeam ? homeTeam.name : 'Home Team'),
        awayTeamName: newMatch.awayTeamName || newMatch.opponent,
        matchType,
        leagueId,
        leagueName,
        status: newMatch.status || 'scheduled',
        matchNumber: newMatch.matchNumber || '',
        fixtureRound: newMatch.fixtureRound || '',
        date: Timestamp.fromDate(new Date(newMatch.date as string)),
        attendees: []
      };
      await addDoc(collection(db, 'matches'), matchData);
      setNewMatch({ 
        opponent: '', 
        location: '', 
        date: '', 
        matchType: 'league',
        leagueId: '',
        leagueName: '',
        matchNumber: '',
        fixtureRound: '',
        status: 'scheduled',
        attendees: [] 
      });
      setIsAdding(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'matches');
    }
  };

  const handleUpdateMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMatch || !editingMatch.opponent || !editingMatch.date) return;
    try {
      const { id, ...data } = editingMatch;
      const matchType = data.matchType || 'league';
      let leagueId = matchType === 'league' ? (data.leagueId || '') : '';
      let leagueName = matchType === 'league' ? (data.leagueName || '') : '';

      if (matchType === 'league' && leagueId && !leagueName) {
        const found = leagues.find(l => l.id === leagueId);
        if (found) leagueName = found.name;
      }

      const matchData = {
        ...data,
        matchType,
        leagueId,
        leagueName,
        date: typeof data.date === 'string' ? Timestamp.fromDate(new Date(data.date)) : data.date
      };
      await updateDoc(doc(db, 'matches', id), matchData);
      setEditingMatch(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `matches/${editingMatch.id}`);
    }
  };

  const handleScheduleReplacementFixture = (oldMatch: Match) => {
    setNewMatch({
      teamId: oldMatch.teamId || teamId,
      homeTeamName: oldMatch.homeTeamName || '',
      awayTeamName: oldMatch.awayTeamName || '',
      opponent: oldMatch.opponent,
      location: oldMatch.location || '',
      date: '',
      matchType: oldMatch.matchType || 'league',
      leagueId: oldMatch.leagueId || '',
      leagueName: oldMatch.leagueName || '',
      matchNumber: oldMatch.matchNumber ? `${oldMatch.matchNumber} (Rescheduled)` : 'Rescheduled Match',
      fixtureRound: oldMatch.fixtureRound ? `Rescheduled - ${oldMatch.fixtureRound}` : 'Postponed Fixture',
      status: 'scheduled'
    });
    setIsAdding(true);
    setEditingMatch(null);
  };

  const toggleAttendance = async (matchId: string, playerId: string, currentAttendees: string[]) => {
    const newAttendees = currentAttendees.includes(playerId)
      ? currentAttendees.filter(id => id !== playerId)
      : [...currentAttendees, playerId];
    
    try {
      await updateDoc(doc(db, 'matches', matchId), { attendees: newAttendees });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `matches/${matchId}`);
    }
  };

  const updatePhoto = async (matchId: string, url: string) => {
    try {
      await updateDoc(doc(db, 'matches', matchId), { teamPhotoUrl: url });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `matches/${matchId}`);
    }
  };

  const updateScore = async (matchId: string, score: string) => {
    try {
      const matchDoc = matches.find(m => m.id === matchId);
      const updates: Partial<Match> = { score };
      if (score.trim() !== '' && (!matchDoc?.status || matchDoc?.status === 'scheduled')) {
        updates.status = 'completed';
      }
      await updateDoc(doc(db, 'matches', matchId), updates);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `matches/${matchId}`);
    }
  };

  const updateStatus = async (matchId: string, status: Match['status']) => {
    try {
      await updateDoc(doc(db, 'matches', matchId), { status });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `matches/${matchId}`);
    }
  };

  const activeTeam = teams.find(t => t.id === teamId);
  const myTeamName = activeTeam ? activeTeam.name : '';

  const filteredMatches = matches.filter(m => {
    const mType = m.matchType || 'league';
    const isKnockout = m.stage === 'quarter_final' || 
      m.stage === 'semi_final' || 
      m.stage === 'final' || 
      m.stage === 'third_place' || 
      m.groupName === 'Knockout Stage' ||
      Boolean(m.homePlaceholder || m.awayPlaceholder);

    if (filterType === 'knockout') {
      if (!isKnockout) return false;
    } else if (filterType === 'league') {
      if (mType !== 'league' || isKnockout) return false;
    } else if (filterType === 'friendly') {
      if (mType !== 'friendly') return false;
    }
    
    if (filterLeagueId !== 'all') {
      if (m.leagueId !== filterLeagueId && m.leagueName !== filterLeagueId) return false;
    }

    if (statusFilter !== 'all') {
      const isCompleted = m.status === 'completed' || Boolean(m.score && m.score.includes('-'));
      const isScheduled = (!m.status || m.status === 'scheduled') && !m.score;
      const isPostponed = m.status === 'postponed';
      const isLive = m.status === 'live';

      if (statusFilter === 'scheduled' && !isScheduled) return false;
      if (statusFilter === 'completed' && !isCompleted) return false;
      if (statusFilter === 'postponed' && !isPostponed) return false;
      if (statusFilter === 'live' && !isLive) return false;
    }

    if (teamFilter !== 'all') {
      const selectedTeam = teams.find(t => t.id === teamFilter);
      const selectedTeamName = selectedTeam ? selectedTeam.name.toLowerCase() : '';
      const matchHome = (m.homeTeamName || '').toLowerCase();
      const matchAway = (m.awayTeamName || m.opponent || '').toLowerCase();
      const isTeamMatch = m.teamId === teamFilter || 
        (selectedTeamName && (matchHome === selectedTeamName || matchAway === selectedTeamName));
      if (!isTeamMatch) return false;
    }

    if (searchQuery.trim()) {
      const qLower = searchQuery.toLowerCase().trim();
      const home = (m.homeTeamName || '').toLowerCase();
      const away = (m.awayTeamName || m.opponent || '').toLowerCase();
      const loc = (m.location || '').toLowerCase();
      const matchNum = (m.matchNumber || '').toLowerCase();
      const round = (m.fixtureRound || '').toLowerCase();
      const lName = (m.leagueName || '').toLowerCase();
      const stage = (m.stage || '').toLowerCase();
      const homePh = (m.homePlaceholder || '').toLowerCase();
      const awayPh = (m.awayPlaceholder || '').toLowerCase();

      if (!home.includes(qLower) && !away.includes(qLower) && !loc.includes(qLower) && !matchNum.includes(qLower) && !round.includes(qLower) && !lName.includes(qLower) && !stage.includes(qLower) && !homePh.includes(qLower) && !awayPh.includes(qLower)) {
        return false;
      }
    }

    return true;
  });

  const totalScheduled = matches.filter(m => (!m.status || m.status === 'scheduled') && !m.score).length;
  const totalCompleted = matches.filter(m => m.status === 'completed' || (m.score && m.score.includes('-'))).length;
  const totalPostponed = matches.filter(m => m.status === 'postponed').length;
  const totalLive = matches.filter(m => m.status === 'live').length;
  const totalKnockouts = matches.filter(m => m.stage || m.groupName === 'Knockout Stage' || m.homePlaceholder || m.awayPlaceholder).length;

  const activeFormMatch = editingMatch || newMatch;

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }}
      className="space-y-8"
    >
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
        <div>
          <h2 className="text-4xl font-black tracking-tight uppercase italic mb-1">Matches & Competition</h2>
          <p className="text-stone-500 font-medium">
            {role === 'admin' ? 'Master Fixture Calendar & Multi-League Standings' : 'League Fixtures, Standings Table & Statistics'}
          </p>
        </div>

        <div className="flex items-center gap-2 bg-stone-100 p-1.5 rounded-2xl">
          <button
            onClick={() => setActiveSubTab('fixtures')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
              activeSubTab === 'fixtures' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-900'
            }`}
          >
            <Calendar size={14} /> Fixtures & Results ({matches.length})
          </button>
          <button
            onClick={() => setActiveSubTab('table')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
              activeSubTab === 'table' ? 'bg-white text-emerald-800 shadow-sm' : 'text-stone-500 hover:text-stone-900'
            }`}
          >
            <Trophy size={14} /> League Standings
          </button>
        </div>

        {canEdit && activeSubTab === 'fixtures' && (
          <button 
            onClick={() => { setIsAdding(true); setEditingMatch(null); }}
            className="bg-emerald-600 text-white px-4 py-3 rounded-xl shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition-colors flex items-center gap-2 font-bold text-sm"
          >
            <Plus size={20} />
            <span>Schedule Match</span>
          </button>
        )}
      </div>

      {activeSubTab === 'table' ? (
        <LeagueTableSection 
          matches={matches} 
          leagues={leagues} 
          activeTeamId={teamId} 
          teams={teams}
          role={role} 
        />
      ) : (
        <>
          {/* Enhanced Filter Toolbar */}
          <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Category Filters */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-black uppercase tracking-widest text-stone-400 mr-2">Category:</span>
                <button
                  onClick={() => setFilterType('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${filterType === 'all' ? 'bg-stone-900 text-white shadow-sm' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}
                >
                  All Matches ({matches.length})
                </button>
                <button
                  onClick={() => setFilterType('league')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${filterType === 'league' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}
                >
                  Group / League
                </button>
                <button
                  onClick={() => setFilterType('knockout')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${filterType === 'knockout' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}
                >
                  Knockout Stage ({totalKnockouts})
                </button>
                <button
                  onClick={() => setFilterType('friendly')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${filterType === 'friendly' ? 'bg-amber-600 text-white shadow-sm' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}
                >
                  Friendly ({matches.filter(m => m.matchType === 'friendly').length})
                </button>
              </div>

              {/* Status Pills */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-black uppercase tracking-widest text-stone-400 mr-2">Status:</span>
                <button
                  onClick={() => setStatusFilter('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${statusFilter === 'all' ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}
                >
                  All
                </button>
                <button
                  onClick={() => setStatusFilter('scheduled')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${statusFilter === 'scheduled' ? 'bg-blue-600 text-white shadow-sm' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}
                >
                  Scheduled ({totalScheduled})
                </button>
                <button
                  onClick={() => setStatusFilter('completed')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${statusFilter === 'completed' ? 'bg-emerald-700 text-white shadow-sm' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}
                >
                  Completed ({totalCompleted})
                </button>
                {totalPostponed > 0 && (
                  <button
                    onClick={() => setStatusFilter('postponed')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${statusFilter === 'postponed' ? 'bg-amber-600 text-white shadow-sm' : 'bg-amber-50 text-amber-800 hover:bg-amber-100'}`}
                  >
                    Postponed ({totalPostponed})
                  </button>
                )}
                {totalLive > 0 && (
                  <button
                    onClick={() => setStatusFilter('live')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${statusFilter === 'live' ? 'bg-red-600 text-white shadow-sm' : 'bg-red-50 text-red-700 hover:bg-red-100'}`}
                  >
                    Live ({totalLive})
                  </button>
                )}
              </div>
            </div>

            {/* Dropdowns & Search */}
            <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-stone-100">
              {/* Squad / Team selector */}
              <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                <Users size={16} className="text-stone-400 flex-shrink-0" />
                <select
                  value={teamFilter}
                  onChange={(e) => setTeamFilter(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                >
                  <option value="all">All Squads & Teams ({teams.length})</option>
                  {teams.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name} {t.id === teamId ? '(My Squad)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Competition selector */}
              {leagues.length > 0 && (
                <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                  <Trophy size={16} className="text-stone-400 flex-shrink-0" />
                  <select
                    value={filterLeagueId}
                    onChange={(e) => setFilterLeagueId(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  >
                    <option value="all">All Competitions ({leagues.length})</option>
                    {leagues.map(l => (
                      <option key={l.id} value={l.id}>{l.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Search Bar */}
              <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                <Search size={16} className="text-stone-400 flex-shrink-0" />
                <input
                  type="text"
                  placeholder="Search team, venue, match #, round..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="text-stone-400 hover:text-stone-600">
                    <X size={16} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Add / Edit Form */}
          <AnimatePresence>
            {(isAdding || editingMatch) && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <form onSubmit={editingMatch ? handleUpdateMatch : handleAddMatch} className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-6">
                  <h3 className="font-bold text-lg">{editingMatch ? 'Edit Match Details' : 'Schedule New Match / Fixture'}</h3>
                  
                  {/* Match Category */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-stone-400">Match Category</label>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          if (editingMatch) setEditingMatch({ ...editingMatch, matchType: 'league' });
                          else setNewMatch({ ...newMatch, matchType: 'league' });
                        }}
                        className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm border flex items-center justify-center gap-2 transition-all ${
                          (activeFormMatch.matchType || 'league') === 'league' 
                            ? 'bg-emerald-50 border-emerald-500 text-emerald-800 shadow-sm' 
                            : 'bg-stone-50 border-stone-200 text-stone-500 hover:bg-stone-100'
                        }`}
                      >
                        <Trophy size={18} />
                        <span>League Competition</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (editingMatch) setEditingMatch({ ...editingMatch, matchType: 'friendly', leagueId: '', leagueName: '' });
                          else setNewMatch({ ...newMatch, matchType: 'friendly', leagueId: '', leagueName: '' });
                        }}
                        className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm border flex items-center justify-center gap-2 transition-all ${
                          activeFormMatch.matchType === 'friendly' 
                            ? 'bg-amber-50 border-amber-500 text-amber-800 shadow-sm' 
                            : 'bg-stone-50 border-stone-200 text-stone-500 hover:bg-stone-100'
                        }`}
                      >
                        <Shield size={18} />
                        <span>Friendly Match</span>
                      </button>
                    </div>
                  </div>

                  {/* League Selector if League Match */}
                  {(activeFormMatch.matchType || 'league') === 'league' && (
                    <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-100 space-y-3">
                      <div className="flex justify-between items-center">
                        <label className="text-xs font-bold uppercase tracking-widest text-emerald-800 flex items-center gap-1.5">
                          <Trophy size={14} />
                          Select Competition
                        </label>
                        {!isAddingLeague && (
                          <button
                            type="button"
                            onClick={() => setIsAddingLeague(true)}
                            className="text-xs font-bold text-emerald-700 hover:text-emerald-900 flex items-center gap-1"
                          >
                            <Plus size={14} /> Add New League
                          </button>
                        )}
                      </div>

                      {isAddingLeague ? (
                        <div className="flex gap-2 items-center">
                          <input
                            placeholder="League Name (e.g., Premier Division)"
                            className="flex-1 px-3 py-2 text-sm rounded-lg bg-white border border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                            value={newLeagueName}
                            onChange={e => setNewLeagueName(e.target.value)}
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={handleCreateLeague}
                            className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-bold text-xs uppercase tracking-wider hover:bg-emerald-700"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => { setIsAddingLeague(false); setNewLeagueName(''); }}
                            className="p-2 text-stone-400 hover:text-stone-600"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <select
                            className="w-full px-4 py-2.5 rounded-xl bg-white border border-emerald-200 text-stone-800 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                            value={activeFormMatch.leagueId || ''}
                            onChange={e => {
                              const selected = leagues.find(l => l.id === e.target.value);
                              if (editingMatch) {
                                setEditingMatch({
                                  ...editingMatch,
                                  leagueId: e.target.value,
                                  leagueName: selected ? selected.name : ''
                                });
                              } else {
                                setNewMatch({
                                  ...newMatch,
                                  leagueId: e.target.value,
                                  leagueName: selected ? selected.name : ''
                                });
                              }
                            }}
                          >
                            <option value="">-- Choose a League --</option>
                            {leagues.map(l => (
                              <option key={l.id} value={l.id}>{l.name}</option>
                            ))}
                          </select>

                          <input
                            placeholder="Or type League name manually"
                            className="w-full px-4 py-2.5 rounded-xl bg-white border border-emerald-200 text-stone-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                            value={activeFormMatch.leagueName || ''}
                            onChange={e => {
                              if (editingMatch) {
                                setEditingMatch({ ...editingMatch, leagueName: e.target.value });
                              } else {
                                setNewMatch({ ...newMatch, leagueName: e.target.value });
                              }
                            }}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Fixture Details (Match Number, Round, Status) */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-stone-50 rounded-xl border border-stone-200">
                    <div>
                      <label className="text-xs font-bold uppercase text-stone-500 block mb-1">Match Number</label>
                      <input 
                        placeholder="e.g. Match #101"
                        className="w-full px-3 py-2 rounded-xl bg-white border border-stone-200 text-xs font-bold"
                        value={editingMatch ? (editingMatch.matchNumber || '') : (newMatch.matchNumber || '')}
                        onChange={e => editingMatch ? setEditingMatch({...editingMatch, matchNumber: e.target.value}) : setNewMatch({...newMatch, matchNumber: e.target.value})}
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold uppercase text-stone-500 block mb-1">Fixture Round / Day</label>
                      <input 
                        placeholder="e.g. Round 1 / Matchday 4"
                        className="w-full px-3 py-2 rounded-xl bg-white border border-stone-200 text-xs font-bold"
                        value={editingMatch ? (editingMatch.fixtureRound || '') : (newMatch.fixtureRound || '')}
                        onChange={e => editingMatch ? setEditingMatch({...editingMatch, fixtureRound: e.target.value}) : setNewMatch({...newMatch, fixtureRound: e.target.value})}
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold uppercase text-stone-500 block mb-1">Match Status</label>
                      <select 
                        className="w-full px-3 py-2 rounded-xl bg-white border border-stone-200 text-xs font-bold"
                        value={editingMatch ? (editingMatch.status || 'scheduled') : (newMatch.status || 'scheduled')}
                        onChange={e => {
                          const st = e.target.value as Match['status'];
                          if (editingMatch) setEditingMatch({...editingMatch, status: st});
                          else setNewMatch({...newMatch, status: st});
                        }}
                      >
                        <option value="scheduled">Scheduled</option>
                        <option value="postponed">Postponed</option>
                        <option value="completed">Completed</option>
                        <option value="live">Live / In Progress</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold uppercase text-stone-500 block mb-1">Home Team</label>
                      <div className="flex gap-2">
                        {teams.length > 0 && (
                          <select
                            className="w-1/2 px-3 py-2.5 rounded-xl bg-stone-50 border border-stone-200 text-xs font-bold"
                            value={activeFormMatch.teamId || teamId || ''}
                            onChange={e => {
                              const t = teams.find(team => team.id === e.target.value);
                              if (editingMatch) {
                                setEditingMatch({ ...editingMatch, teamId: e.target.value, homeTeamName: t ? t.name : editingMatch.homeTeamName });
                              } else {
                                setNewMatch({ ...newMatch, teamId: e.target.value, homeTeamName: t ? t.name : newMatch.homeTeamName });
                              }
                            }}
                          >
                            <option value="">Select Squad...</option>
                            {teams.map(t => (
                              <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                          </select>
                        )}
                        <input 
                          placeholder="Home Team Name"
                          className="flex-1 px-4 py-2.5 rounded-xl bg-stone-50 border border-stone-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-bold text-sm"
                          value={editingMatch ? (editingMatch.homeTeamName || '') : (newMatch.homeTeamName || '')}
                          onChange={e => editingMatch ? setEditingMatch({...editingMatch, homeTeamName: e.target.value}) : setNewMatch({...newMatch, homeTeamName: e.target.value})}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-bold uppercase text-stone-500 block mb-1">Away Team / Opponent</label>
                      <input 
                        placeholder="Away Team / Opponent Name"
                        className="w-full px-4 py-2.5 rounded-xl bg-stone-50 border border-stone-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-bold text-sm"
                        value={editingMatch ? (editingMatch.awayTeamName || editingMatch.opponent || '') : (newMatch.awayTeamName || newMatch.opponent || '')}
                        onChange={e => {
                          if (editingMatch) {
                            setEditingMatch({...editingMatch, awayTeamName: e.target.value, opponent: e.target.value});
                          } else {
                            setNewMatch({...newMatch, awayTeamName: e.target.value, opponent: e.target.value});
                          }
                        }}
                        required
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold uppercase text-stone-500 block mb-1">Date & Time</label>
                      <input 
                        type="datetime-local"
                        className="w-full px-4 py-2.5 rounded-xl bg-stone-50 border border-stone-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-bold text-sm"
                        value={editingMatch ? (typeof editingMatch.date === 'string' ? editingMatch.date : (editingMatch.date as Timestamp).toDate().toISOString().slice(0, 16)) : newMatch.date as string}
                        onChange={e => editingMatch ? setEditingMatch({...editingMatch, date: e.target.value}) : setNewMatch({...newMatch, date: e.target.value})}
                        required
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold uppercase text-stone-500 block mb-1">Location / Venue</label>
                      <input 
                        placeholder="Location / Stadium / Pitch"
                        className="w-full px-4 py-2.5 rounded-xl bg-stone-50 border border-stone-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm font-bold"
                        value={editingMatch ? editingMatch.location : newMatch.location}
                        onChange={e => editingMatch ? setEditingMatch({...editingMatch, location: e.target.value}) : setNewMatch({...newMatch, location: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 justify-end pt-4 border-t border-stone-100">
                    <button type="button" onClick={() => { setIsAdding(false); setEditingMatch(null); }} className="px-6 py-2 text-stone-500 font-bold uppercase text-xs tracking-widest">Cancel</button>
                    <button type="submit" className="px-6 py-2 bg-stone-900 text-white rounded-lg font-bold uppercase text-xs tracking-widest hover:bg-stone-800 transition-colors">
                      {editingMatch ? 'Update Match' : 'Schedule Match'}
                    </button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Matches List */}
          <div className="space-y-8">
            {filteredMatches.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-stone-200 space-y-3">
                <Trophy size={48} className="text-stone-300 mx-auto" />
                <h3 className="text-xl font-bold text-stone-800">No matches found</h3>
                <p className="text-stone-500 text-sm max-w-md mx-auto">
                  {filterType !== 'all' || filterLeagueId !== 'all' 
                    ? 'Try adjusting your filters or schedule a new match.' 
                    : 'Click "Schedule Match" to add your first fixture or friendly match.'}
                </p>
              </div>
            ) : (
              filteredMatches.map(match => (
                <div key={match.id} className="bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-sm space-y-2">
                  
                  {/* Postponed Warning Banner */}
                  {match.status === 'postponed' && (
                    <div className="bg-amber-500 text-stone-950 p-4 font-black flex flex-wrap justify-between items-center gap-2 border-b border-amber-600">
                      <div className="flex items-center gap-2">
                        <AlertTriangle size={20} />
                        <span className="text-sm uppercase tracking-wider">MATCH POSTPONED</span>
                      </div>
                      {canEdit && (
                        <button
                          onClick={() => handleScheduleReplacementFixture(match)}
                          className="px-3 py-1 bg-stone-950 text-white rounded-xl text-xs font-bold uppercase hover:bg-stone-800 transition-all flex items-center gap-1.5"
                        >
                          <RefreshCw size={12} /> Schedule Rescheduled Fixture
                        </button>
                      )}
                    </div>
                  )}

                  <div className="p-6 md:p-8 border-b border-stone-100">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-stone-900 rounded-2xl flex items-center justify-center text-white font-black text-2xl italic flex-shrink-0">
                          {match.score || 'VS'}
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2 mb-1.5">
                            <span className="flex items-center gap-1 text-stone-400 font-bold text-xs uppercase tracking-widest">
                              <Calendar size={13} />
                              {formatMatchDateTime(match.date)}
                            </span>

                            {/* Match Type / League Badge */}
                            {match.matchType === 'friendly' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-amber-100 text-amber-800 rounded-full text-[10px] font-black uppercase tracking-wider">
                                <Shield size={10} />
                                Friendly
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-black uppercase tracking-wider">
                                <Trophy size={10} />
                                {match.leagueName || 'League'}
                              </span>
                            )}

                            {/* Knockout Stage Badge */}
                            {match.stage && (
                              <span className="px-2.5 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 rounded-md text-[10px] font-black uppercase tracking-wider">
                                {match.fixtureRound || match.stage}
                              </span>
                            )}

                            {/* Group Name Badge */}
                            {match.groupName && (
                              <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded-md text-[10px] font-black uppercase tracking-wider">
                                {match.groupName}
                              </span>
                            )}

                            {/* Match Number */}
                            {match.matchNumber && (
                              <span className="px-2 py-0.5 bg-stone-100 text-stone-700 rounded-md text-[10px] font-black uppercase tracking-wider">
                                {match.matchNumber}
                              </span>
                            )}

                            {/* Fixture Round */}
                            {match.fixtureRound && (
                              <span className="px-2 py-0.5 bg-stone-100 text-stone-600 rounded-md text-[10px] font-bold uppercase tracking-wider">
                                {match.fixtureRound}
                              </span>
                            )}

                            {/* Status Badge */}
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                              match.status === 'completed' ? 'bg-stone-900 text-white' :
                              match.status === 'postponed' ? 'bg-red-100 text-red-800' :
                              match.status === 'live' ? 'bg-red-600 text-white animate-pulse' :
                              'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}>
                              {match.status || 'scheduled'}
                            </span>
                          </div>

                          <h3 className="text-2xl font-black tracking-tight italic uppercase">
                            {match.homeTeamName && match.awayTeamName ? (
                              <span>{match.homeTeamName} <span className="text-stone-400 not-italic font-normal">vs</span> {match.awayTeamName}</span>
                            ) : (
                              <span>vs {match.opponent}</span>
                            )}
                          </h3>
                          
                          <div className="flex items-center gap-1 text-stone-400 text-xs font-bold uppercase tracking-widest mt-1">
                            <MapPin size={12} />
                            {match.location || 'TBD'}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex gap-2 w-full md:w-auto items-center">
                        {canEdit && (
                          <>
                            <input 
                              placeholder="Score (e.g. 2-1)"
                              className="flex-1 md:w-32 px-4 py-2 text-sm rounded-xl bg-stone-50 border border-stone-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-bold"
                              value={match.score || ''}
                              onChange={e => updateScore(match.id, e.target.value)}
                            />

                            <select
                              value={match.status || 'scheduled'}
                              onChange={e => updateStatus(match.id, e.target.value as Match['status'])}
                              className="px-2.5 py-2 text-xs rounded-xl bg-stone-50 border border-stone-200 font-bold"
                            >
                              <option value="scheduled">Scheduled</option>
                              <option value="completed">Completed</option>
                              <option value="postponed">Postponed</option>
                              <option value="live">Live</option>
                            </select>

                            <button 
                              onClick={() => { setEditingMatch(match); setIsAdding(false); }}
                              className="p-2 text-stone-300 hover:text-emerald-600 transition-colors"
                              title="Edit Match"
                            >
                              <Edit size={20} />
                            </button>
                            <button 
                              onClick={async () => {
                                if (confirm("Delete this match?")) {
                                  await deleteDoc(doc(db, 'matches', match.id));
                                }
                              }}
                              className="p-2 text-stone-300 hover:text-red-500 transition-colors"
                            >
                              <Trash2 size={20} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="p-6 md:p-8 space-y-8">
                    {/* Lineup Section */}
                    <LineupSection match={match} players={players} />

                    {/* Match Statistics & Highlights */}
                    <MatchStatsSection match={match} players={players} canEdit={canEdit} />

                    {/* Attendance & Team Photo */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t border-stone-100">
                      <div>
                        <h4 className="font-bold text-xs uppercase tracking-widest text-stone-400 mb-4 flex items-center justify-between">
                          <span>Attendance List ({match.attendees.length})</span>
                        </h4>
                        <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                          {players.map(player => {
                            const isAttending = match.attendees.includes(player.id);
                            return (
                              <button 
                                key={player.id}
                                onClick={() => toggleAttendance(match.id, player.id, match.attendees)}
                                className={`flex items-center gap-2 p-3 rounded-xl border transition-all text-left ${isAttending ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-stone-50 border-stone-100 text-stone-400'}`}
                              >
                                <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${isAttending ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-stone-300'}`}>
                                  {isAttending && <CheckCircle2 size={12} />}
                                </div>
                                <span className="text-xs font-bold truncate">{player.name}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h4 className="font-bold text-xs uppercase tracking-widest text-stone-400 mb-4">Team Photo</h4>
                        <div className="relative aspect-video bg-stone-100 rounded-2xl overflow-hidden border-2 border-dashed border-stone-200 flex items-center justify-center group">
                          {match.teamPhotoUrl ? (
                            <>
                              <img 
                                src={match.teamPhotoUrl} 
                                alt="Team Photo" 
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <button 
                                  onClick={() => {
                                    const url = prompt("Enter new photo URL:");
                                    if (url) updatePhoto(match.id, url);
                                  }}
                                  className="bg-white text-stone-900 px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-widest"
                                >
                                  Change Photo
                                </button>
                              </div>
                            </>
                          ) : (
                            <button 
                              onClick={() => {
                                const url = prompt("Enter team photo URL:");
                                if (url) updatePhoto(match.id, url);
                              }}
                              className="flex flex-col items-center gap-2 text-stone-400 hover:text-stone-600 transition-colors"
                            >
                              <Camera size={32} />
                              <span className="text-xs font-bold uppercase tracking-widest">Add Match Day Photo</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </motion.div>
  );
}

// --- Admin View ---
function AdminView() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [leagues, setLeagues] = useState<League[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [isAddingTeam, setIsAddingTeam] = useState(false);
  const [newTeam, setNewTeam] = useState<Partial<Team>>({ name: '', description: '', coachIds: [] });

  const [isAddingLeague, setIsAddingLeague] = useState(false);
  const [newLeague, setNewLeague] = useState<{ name: string; description?: string }>({ name: '', description: '' });

  const [deletingLeague, setDeletingLeague] = useState<League | null>(null);
  const [deleteLeagueMatches, setDeleteLeagueMatches] = useState(false);
  const [isDeletingLeague, setIsDeletingLeague] = useState(false);

  useEffect(() => {
    const unsubscribeTeams = onSnapshot(query(collection(db, 'teams'), orderBy('name')), (snapshot) => {
      setTeams(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Team)));
    });

    const unsubscribeUsers = onSnapshot(query(collection(db, 'users'), orderBy('email')), (snapshot) => {
      setUsers(snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile)));
    });

    const unsubscribeLeagues = onSnapshot(query(collection(db, 'leagues'), orderBy('name')), (snapshot) => {
      setLeagues(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as League)));
    });

    const unsubscribeMatches = onSnapshot(collection(db, 'matches'), (snapshot) => {
      setMatches(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Match)));
    });

    return () => { 
      unsubscribeTeams(); 
      unsubscribeUsers(); 
      unsubscribeLeagues(); 
      unsubscribeMatches();
    };
  }, []);

  const handleAddTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeam.name) return;
    try {
      await addDoc(collection(db, 'teams'), { ...newTeam, coachIds: [] });
      setNewTeam({ name: '', description: '', coachIds: [] });
      setIsAddingTeam(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'teams');
    }
  };

  const handleAddLeague = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLeague.name.trim()) return;
    try {
      await addDoc(collection(db, 'leagues'), {
        name: newLeague.name.trim(),
        description: newLeague.description?.trim() || ''
      });
      setNewLeague({ name: '', description: '' });
      setIsAddingLeague(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'leagues');
    }
  };

  const confirmDeleteLeague = async () => {
    if (!deletingLeague) return;
    setIsDeletingLeague(true);
    try {
      if (deleteLeagueMatches) {
        const associatedMatches = matches.filter(
          m => m.leagueId === deletingLeague.id || m.leagueName === deletingLeague.name
        );
        for (const m of associatedMatches) {
          await deleteDoc(doc(db, 'matches', m.id));
        }
      }
      await deleteDoc(doc(db, 'leagues', deletingLeague.id));
      setDeletingLeague(null);
      setDeleteLeagueMatches(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `leagues/${deletingLeague.id}`);
    } finally {
      setIsDeletingLeague(false);
    }
  };

  const handleUpdateUserRole = async (uid: string, role: UserProfile['role']) => {
    try {
      await updateDoc(doc(db, 'users', uid), { role });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${uid}`);
    }
  };

  const handleToggleTeamForUser = async (uid: string, teamId: string, currentTeamIds: string[]) => {
    const newTeamIds = (currentTeamIds || []).includes(teamId)
      ? currentTeamIds.filter(id => id !== teamId)
      : [...(currentTeamIds || []), teamId];
    
    try {
      await updateDoc(doc(db, 'users', uid), { teamIds: newTeamIds });
      
      // Also update the team's coachIds if the user is a coach
      const team = teams.find(t => t.id === teamId);
      if (team) {
        const newCoachIds = (team.coachIds || []).includes(uid)
          ? team.coachIds.filter(id => id !== uid)
          : [...(team.coachIds || []), uid];
        await updateDoc(doc(db, 'teams', teamId), { coachIds: newCoachIds });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${uid}`);
    }
  };

  // Batch Fixture Generator state
  const [isGeneratingFixtures, setIsGeneratingFixtures] = useState(false);
  const [fixtureGen, setFixtureGen] = useState<{
    leagueId: string;
    leagueType: 'point_based' | 'group_stage';
    teamsText: string;
    numGroups: number;
    groupsText: string;
    isDoubleRoundRobin: boolean;
    includeKnockoutStage: boolean;
    advancementFormat: 'top_1' | 'top_2' | 'top_3' | 'top_4' | 'top_2_plus_best_3rd' | 'custom';
    qualifiersPerGroup: number;
    wildcardCount: number;
    customRuleText: string;
    customAdvancingTotal: string;
    startDate: string;
    intervalDays: number;
    matchesPerDay: number;
    restDaysBetweenRounds: number;
    matchTimeGapHours: number;
    matchNumberStart: number;
    location: string;
    roundPrefix: string;
  }>({
    leagueId: '',
    leagueType: 'point_based',
    teamsText: '',
    numGroups: 2,
    groupsText: 'Group A, Group B',
    isDoubleRoundRobin: false,
    includeKnockoutStage: true,
    advancementFormat: 'top_2',
    qualifiersPerGroup: 2,
    wildcardCount: 4,
    customRuleText: '',
    customAdvancingTotal: '',
    startDate: new Date().toISOString().slice(0, 16),
    intervalDays: 7,
    matchesPerDay: 2,
    restDaysBetweenRounds: 2,
    matchTimeGapHours: 2,
    matchNumberStart: 101,
    location: 'Main Stadium',
    roundPrefix: 'Round'
  });

  const [previewMatches, setPreviewMatches] = useState<any[] | null>(null);
  const [isSavingBatch, setIsSavingBatch] = useState(false);

  // Preview manual manipulation states (add, edit, delete, bulk stadium, bulk shift)
  const [editingPreviewIdx, setEditingPreviewIdx] = useState<number | null>(null);
  const [previewEditForm, setPreviewEditForm] = useState<any>(null);
  const [isAddingPreviewMatch, setIsAddingPreviewMatch] = useState(false);
  const [newPreviewItem, setNewPreviewItem] = useState({
    homeTeamName: '',
    awayTeamName: '',
    date: new Date().toISOString().slice(0, 16),
    location: 'Main Stadium',
    matchNumber: '',
    fixtureRound: 'Round 1',
    groupName: ''
  });
  const [isBulkPreviewStadiumModal, setIsBulkPreviewStadiumModal] = useState(false);
  const [bulkPreviewStadiumVal, setBulkPreviewStadiumVal] = useState('');
  const [isBulkPreviewShiftModal, setIsBulkPreviewShiftModal] = useState(false);
  const [bulkPreviewShiftDaysVal, setBulkPreviewShiftDaysVal] = useState(1);

  // Master Admin Fixtures & Venues Hub States
  const [adminFixtureLeagueFilter, setAdminFixtureLeagueFilter] = useState<string>('all');
  const [adminFixtureStageFilter, setAdminFixtureStageFilter] = useState<string>('all');
  const [adminFixtureSearch, setAdminFixtureSearch] = useState<string>('');

  // Quick Date/Time Edit Modal
  const [quickDateMatch, setQuickDateMatch] = useState<Match | null>(null);
  const [quickDateVal, setQuickDateVal] = useState<string>('');
  const [isSavingQuickDate, setIsSavingQuickDate] = useState(false);

  // Quick Stadium/Venue Edit Modal
  const [quickStadiumMatch, setQuickStadiumMatch] = useState<Match | null>(null);
  const [quickStadiumVal, setQuickStadiumVal] = useState<string>('');
  const [isSavingQuickStadium, setIsSavingQuickStadium] = useState(false);

  // Full Edit Match Modal
  const [adminEditingMatch, setAdminEditingMatch] = useState<Match | null>(null);
  const [adminEditFormData, setAdminEditFormData] = useState<any>(null);
  const [isSavingAdminEdit, setIsSavingAdminEdit] = useState(false);

  // Add Single Custom Fixture Modal
  const [isAddingAdminFixture, setIsAddingAdminFixture] = useState(false);
  const [newAdminFixture, setNewAdminFixture] = useState<any>({
    leagueId: '',
    groupName: '',
    homeTeamName: '',
    awayTeamName: '',
    date: new Date().toISOString().slice(0, 16),
    location: 'Main Stadium',
    matchNumber: '',
    fixtureRound: 'Round 1',
    stage: 'group',
    status: 'scheduled'
  });
  const [isSavingNewAdminFixture, setIsSavingNewAdminFixture] = useState(false);

  // Bulk Stadium Modal for saved fixtures
  const [bulkSavedStadiumModal, setBulkSavedStadiumModal] = useState(false);
  const [bulkSavedStadiumLeagueId, setBulkSavedStadiumLeagueId] = useState<string>('all');
  const [bulkSavedStadiumVal, setBulkSavedStadiumVal] = useState<string>('');
  const [isApplyingBulkStadium, setIsApplyingBulkStadium] = useState(false);

  // Bulk Shift Dates Modal for saved fixtures
  const [bulkSavedShiftModal, setBulkSavedShiftModal] = useState(false);
  const [bulkSavedShiftLeagueId, setBulkSavedShiftLeagueId] = useState<string>('all');
  const [bulkSavedShiftDays, setBulkSavedShiftDays] = useState<number>(1);
  const [isApplyingBulkShift, setIsApplyingBulkShift] = useState(false);

  // Delete Confirmation Modal
  const [adminDeletingMatch, setAdminDeletingMatch] = useState<Match | null>(null);
  const [isDeletingAdminMatch, setIsDeletingAdminMatch] = useState(false);

  const handleImportClubTeams = () => {
    if (teams.length === 0) {
      alert("No registered club teams found in the database. Please create teams first or enter custom team names.");
      return;
    }
    const names = teams.map(t => t.name).join('\n');
    setFixtureGen(prev => ({ ...prev, teamsText: names }));
  };

  const handleGeneratePreview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fixtureGen.leagueId) {
      alert("Please select a target league.");
      return;
    }

    const selectedLeague = leagues.find(l => l.id === fixtureGen.leagueId);
    const leagueName = selectedLeague ? selectedLeague.name : 'League';

    const rawTeams = fixtureGen.teamsText
      .split(/[\n,]+/)
      .map(t => t.trim())
      .filter(t => t.length > 0);

    if (rawTeams.length < 2) {
      alert("Please enter or import at least 2 teams to generate fixtures.");
      return;
    }

    const allMatches: any[] = [];
    let currentMatchNum = fixtureGen.matchNumberStart || 101;

    if (fixtureGen.leagueType === 'point_based') {
      const res = generateRoundRobinFixtures({
        teams: rawTeams,
        leagueId: fixtureGen.leagueId,
        leagueName,
        isDoubleRoundRobin: fixtureGen.isDoubleRoundRobin,
        startDate: fixtureGen.startDate,
        intervalDays: fixtureGen.intervalDays,
        matchesPerDay: fixtureGen.matchesPerDay || 2,
        restDaysBetweenRounds: fixtureGen.restDaysBetweenRounds !== undefined ? fixtureGen.restDaysBetweenRounds : 2,
        matchTimeGapHours: fixtureGen.matchTimeGapHours || 2,
        matchNumberStart: currentMatchNum,
        location: fixtureGen.location,
        roundPrefix: fixtureGen.roundPrefix
      });
      allMatches.push(...res.generatedMatches);
    } else {
      // Group Stage League with synchronized matchdays across groups
      let groupsList = fixtureGen.groupsText
        .split(/[\n,]+/)
        .map(g => g.trim())
        .filter(g => g.length > 0);

      if (groupsList.length === 0) {
        groupsList = Array.from({ length: fixtureGen.numGroups }, (_, i) => `Group ${String.fromCharCode(65 + i)}`);
      }

      // Distribute teams among groups
      const groupBuckets: Record<string, string[]> = {};
      groupsList.forEach(g => { groupBuckets[g] = []; });

      rawTeams.forEach((teamName, idx) => {
        const groupIndex = idx % groupsList.length;
        groupBuckets[groupsList[groupIndex]].push(teamName);
      });

      // Calculate round-robin matchups for each group
      const groupRoundsMap: Record<string, { roundNum: number; home: string; away: string }[][]> = {};
      let maxGroupRounds = 0;

      groupsList.forEach(gName => {
        const gTeams = groupBuckets[gName];
        if (gTeams && gTeams.length >= 2) {
          let teamList = [...gTeams];
          if (teamList.length % 2 !== 0) teamList.push("BYE");
          const n = teamList.length;
          const numRounds = n - 1;
          const half = n / 2;
          const legs: { roundNum: number; home: string; away: string }[][] = [];

          for (let r = 0; r < numRounds; r++) {
            const rMatches: { roundNum: number; home: string; away: string }[] = [];
            for (let i = 0; i < half; i++) {
              const home = teamList[i];
              const away = teamList[n - 1 - i];
              if (home !== "BYE" && away !== "BYE") {
                if (i === 0 && r % 2 === 1) rMatches.push({ roundNum: r + 1, home: away, away: home });
                else rMatches.push({ roundNum: r + 1, home, away });
              }
            }
            legs.push(rMatches);
            teamList = [teamList[0], teamList[n - 1], ...teamList.slice(1, n - 1)];
          }

          if (fixtureGen.isDoubleRoundRobin) {
            const firstLegsCopy = [...legs];
            firstLegsCopy.forEach((rMatches, idx) => {
              legs.push(rMatches.map(m => ({ roundNum: numRounds + idx + 1, home: m.away, away: m.home })));
            });
          }

          groupRoundsMap[gName] = legs;
          if (legs.length > maxGroupRounds) maxGroupRounds = legs.length;
        }
      });

      const effectiveMatchesPerDay = Math.max(1, fixtureGen.matchesPerDay || 2);
      const effectiveRestDays = Math.max(0, fixtureGen.restDaysBetweenRounds !== undefined ? fixtureGen.restDaysBetweenRounds : 2);
      const timeGapHours = fixtureGen.matchTimeGapHours || 2;
      const startDt = new Date(fixtureGen.startDate);
      const baseHours = isNaN(startDt.getHours()) ? 14 : startDt.getHours();
      const baseMinutes = isNaN(startDt.getMinutes()) ? 0 : startDt.getMinutes();
      let dayOffset = 0;

      for (let r = 0; r < maxGroupRounds; r++) {
        const roundAllMatches: { groupName: string; home: string; away: string }[] = [];
        groupsList.forEach(gName => {
          const gRound = groupRoundsMap[gName]?.[r];
          if (gRound) {
            gRound.forEach(m => roundAllMatches.push({ groupName: gName, home: m.home, away: m.away }));
          }
        });

        const roundDaysCount = Math.ceil(roundAllMatches.length / effectiveMatchesPerDay);

        roundAllMatches.forEach((m, mIdx) => {
          const dayInRound = Math.floor(mIdx / effectiveMatchesPerDay);
          const matchInDay = mIdx % effectiveMatchesPerDay;

          const matchDate = new Date(startDt.getTime());
          matchDate.setDate(matchDate.getDate() + dayOffset + dayInRound);
          matchDate.setHours(baseHours + matchInDay * timeGapHours, baseMinutes, 0, 0);

          allMatches.push({
            leagueId: fixtureGen.leagueId,
            leagueName,
            groupName: m.groupName,
            homeTeamName: m.home,
            awayTeamName: m.away,
            opponent: m.away,
            matchNumber: `Match #${currentMatchNum}`,
            fixtureRound: `${m.groupName} - Round ${r + 1}`,
            location: fixtureGen.location || 'Main Stadium',
            status: 'scheduled',
            date: matchDate,
            matchType: 'league'
          });
          currentMatchNum++;
        });

        dayOffset += roundDaysCount + effectiveRestDays;
      }

      // Optionally auto-generate Knockout Stage fixtures (Semi-Finals, Finals, etc.)
      if (fixtureGen.includeKnockoutStage && groupsList.length >= 1) {
        const knockoutStartDate = new Date(startDt.getTime());
        knockoutStartDate.setDate(knockoutStartDate.getDate() + dayOffset);
        knockoutStartDate.setHours(baseHours, baseMinutes, 0, 0);

        const customAdvancingNum = fixtureGen.customAdvancingTotal ? parseInt(fixtureGen.customAdvancingTotal) : undefined;

        const koRes = generateKnockoutFixtures({
          groupsList,
          leagueId: fixtureGen.leagueId,
          leagueName,
          startDate: knockoutStartDate.toISOString(),
          matchesPerDay: fixtureGen.matchesPerDay || 2,
          restDaysBetweenRounds: fixtureGen.restDaysBetweenRounds || 2,
          matchTimeGapHours: fixtureGen.matchTimeGapHours || 2,
          matchNumberStart: currentMatchNum,
          location: fixtureGen.location,
          advancementFormat: fixtureGen.advancementFormat || 'top_2',
          qualifiersPerGroup: fixtureGen.qualifiersPerGroup || 2,
          wildcardCount: fixtureGen.advancementFormat === 'top_2_plus_best_3rd' ? (fixtureGen.wildcardCount ?? 4) : 0,
          customRuleText: fixtureGen.customRuleText?.trim(),
          customAdvancingTotal: customAdvancingNum
        });

        allMatches.push(...koRes.generatedMatches);
      }
    }

    if (allMatches.length === 0) {
      alert("Could not generate fixtures. Make sure groups have at least 2 teams each.");
      return;
    }

    setPreviewMatches(allMatches);
  };

  // Preview manual manipulation handlers
  const handleDeletePreviewMatch = (index: number) => {
    if (!previewMatches) return;
    setPreviewMatches(previewMatches.filter((_, idx) => idx !== index));
    if (editingPreviewIdx === index) {
      setEditingPreviewIdx(null);
      setPreviewEditForm(null);
    }
  };

  const handleStartEditPreview = (index: number) => {
    if (!previewMatches) return;
    const m = previewMatches[index];
    const dt = m.date instanceof Date ? m.date : new Date(m.date);
    setEditingPreviewIdx(index);
    setPreviewEditForm({
      ...m,
      dateStr: isNaN(dt.getTime()) ? '' : dt.toISOString().slice(0, 16)
    });
  };

  const handleSavePreviewEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!previewMatches || editingPreviewIdx === null || !previewEditForm) return;
    const updated = [...previewMatches];
    const newDate = previewEditForm.dateStr ? new Date(previewEditForm.dateStr) : updated[editingPreviewIdx].date;
    updated[editingPreviewIdx] = {
      ...updated[editingPreviewIdx],
      homeTeamName: previewEditForm.homeTeamName,
      awayTeamName: previewEditForm.awayTeamName,
      opponent: previewEditForm.awayTeamName,
      location: previewEditForm.location,
      matchNumber: previewEditForm.matchNumber,
      fixtureRound: previewEditForm.fixtureRound,
      groupName: previewEditForm.groupName,
      date: newDate
    };
    setPreviewMatches(updated);
    setEditingPreviewIdx(null);
    setPreviewEditForm(null);
  };

  const handleAddMatchToPreview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!previewMatches) return;
    if (!newPreviewItem.homeTeamName || !newPreviewItem.awayTeamName) {
      alert("Please specify home and away team names.");
      return;
    }
    const selectedLeague = leagues.find(l => l.id === fixtureGen.leagueId);
    const addedMatch = {
      leagueId: fixtureGen.leagueId,
      leagueName: selectedLeague ? selectedLeague.name : 'League',
      homeTeamName: newPreviewItem.homeTeamName,
      awayTeamName: newPreviewItem.awayTeamName,
      opponent: newPreviewItem.awayTeamName,
      location: newPreviewItem.location || fixtureGen.location || 'Main Stadium',
      matchNumber: newPreviewItem.matchNumber || `Match #${previewMatches.length + 101}`,
      fixtureRound: newPreviewItem.fixtureRound || 'Matchday',
      groupName: newPreviewItem.groupName || '',
      status: 'scheduled',
      date: newPreviewItem.date ? new Date(newPreviewItem.date) : new Date(),
      matchType: 'league'
    };
    setPreviewMatches([...previewMatches, addedMatch]);
    setIsAddingPreviewMatch(false);
    setNewPreviewItem({
      homeTeamName: '',
      awayTeamName: '',
      date: new Date().toISOString().slice(0, 16),
      location: fixtureGen.location || 'Main Stadium',
      matchNumber: '',
      fixtureRound: 'Round 1',
      groupName: ''
    });
  };

  const handleApplyBulkPreviewStadium = () => {
    if (!previewMatches || !bulkPreviewStadiumVal.trim()) return;
    const stadium = bulkPreviewStadiumVal.trim();
    setPreviewMatches(previewMatches.map(m => ({ ...m, location: stadium })));
    setIsBulkPreviewStadiumModal(false);
    setBulkPreviewStadiumVal('');
  };

  const handleApplyBulkPreviewShift = () => {
    if (!previewMatches || !bulkPreviewShiftDaysVal) return;
    const days = Number(bulkPreviewShiftDaysVal);
    const updated = previewMatches.map(m => {
      const dt = m.date instanceof Date ? new Date(m.date) : new Date(m.date);
      if (!isNaN(dt.getTime())) {
        dt.setDate(dt.getDate() + days);
      }
      return { ...m, date: dt };
    });
    setPreviewMatches(updated);
    setIsBulkPreviewShiftModal(false);
  };

  // Master Admin Fixture & Venue Management Handlers
  const handleSaveQuickDate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickDateMatch || !quickDateVal) return;
    setIsSavingQuickDate(true);
    try {
      await updateDoc(doc(db, 'matches', quickDateMatch.id), {
        date: Timestamp.fromDate(new Date(quickDateVal))
      });
      setQuickDateMatch(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `matches/${quickDateMatch.id}`);
    } finally {
      setIsSavingQuickDate(false);
    }
  };

  const handleSaveQuickStadium = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickStadiumMatch || !quickStadiumVal.trim()) return;
    setIsSavingQuickStadium(true);
    try {
      await updateDoc(doc(db, 'matches', quickStadiumMatch.id), {
        location: quickStadiumVal.trim()
      });
      setQuickStadiumMatch(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `matches/${quickStadiumMatch.id}`);
    } finally {
      setIsSavingQuickStadium(false);
    }
  };

  const handleSaveAdminEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminEditingMatch || !adminEditFormData) return;
    setIsSavingAdminEdit(true);
    try {
      const updates: any = {
        homeTeamName: adminEditFormData.homeTeamName,
        awayTeamName: adminEditFormData.awayTeamName,
        opponent: adminEditFormData.awayTeamName,
        location: adminEditFormData.location,
        matchNumber: adminEditFormData.matchNumber,
        fixtureRound: adminEditFormData.fixtureRound,
        groupName: adminEditFormData.groupName || '',
        status: adminEditFormData.status || 'scheduled',
        leagueId: adminEditFormData.leagueId || null,
        leagueName: adminEditFormData.leagueName || ''
      };
      if (adminEditFormData.dateStr) {
        updates.date = Timestamp.fromDate(new Date(adminEditFormData.dateStr));
      }
      await updateDoc(doc(db, 'matches', adminEditingMatch.id), updates);
      setAdminEditingMatch(null);
      setAdminEditFormData(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `matches/${adminEditingMatch.id}`);
    } finally {
      setIsSavingAdminEdit(false);
    }
  };

  const handleSaveNewAdminFixture = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminFixture.homeTeamName || !newAdminFixture.awayTeamName) {
      alert("Please provide home and away teams.");
      return;
    }
    setIsSavingNewAdminFixture(true);
    try {
      const targetLeague = leagues.find(l => l.id === newAdminFixture.leagueId);
      const homeTeamObj = teams.find(t => t.name.toLowerCase() === newAdminFixture.homeTeamName.toLowerCase());
      const matchTeamId = homeTeamObj ? homeTeamObj.id : (teams[0]?.id || 'league_match');

      await addDoc(collection(db, 'matches'), {
        teamId: matchTeamId,
        matchType: 'league',
        leagueId: newAdminFixture.leagueId || null,
        leagueName: targetLeague ? targetLeague.name : (newAdminFixture.leagueName || 'League'),
        groupName: newAdminFixture.groupName || '',
        stage: newAdminFixture.stage || 'group',
        homeTeamName: newAdminFixture.homeTeamName,
        awayTeamName: newAdminFixture.awayTeamName,
        opponent: newAdminFixture.awayTeamName,
        location: newAdminFixture.location || 'Main Stadium',
        matchNumber: newAdminFixture.matchNumber || `Match #${matches.length + 101}`,
        fixtureRound: newAdminFixture.fixtureRound || 'Round 1',
        status: newAdminFixture.status || 'scheduled',
        date: Timestamp.fromDate(new Date(newAdminFixture.date)),
        attendees: []
      });

      setIsAddingAdminFixture(false);
      setNewAdminFixture({
        leagueId: '',
        groupName: '',
        homeTeamName: '',
        awayTeamName: '',
        date: new Date().toISOString().slice(0, 16),
        location: 'Main Stadium',
        matchNumber: '',
        fixtureRound: 'Round 1',
        stage: 'group',
        status: 'scheduled'
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'matches');
    } finally {
      setIsSavingNewAdminFixture(false);
    }
  };

  const handleApplyBulkSavedStadium = async () => {
    if (!bulkSavedStadiumVal.trim()) return;
    setIsApplyingBulkStadium(true);
    try {
      const targetMatches = matches.filter(m => {
        if (bulkSavedStadiumLeagueId === 'all') return true;
        return m.leagueId === bulkSavedStadiumLeagueId;
      });
      for (const m of targetMatches) {
        await updateDoc(doc(db, 'matches', m.id), {
          location: bulkSavedStadiumVal.trim()
        });
      }
      setBulkSavedStadiumModal(false);
      setBulkSavedStadiumVal('');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'matches (bulk stadium)');
    } finally {
      setIsApplyingBulkStadium(false);
    }
  };

  const handleApplyBulkSavedShift = async () => {
    if (!bulkSavedShiftDays) return;
    setIsApplyingBulkShift(true);
    try {
      const targetMatches = matches.filter(m => {
        if (bulkSavedShiftLeagueId === 'all') return true;
        return m.leagueId === bulkSavedShiftLeagueId;
      });
      const days = Number(bulkSavedShiftDays);
      for (const m of targetMatches) {
        const curDt = m.date ? (typeof m.date === 'string' ? new Date(m.date) : m.date.toDate?.() || new Date()) : new Date();
        const nextDt = new Date(curDt.getTime() + days * 24 * 60 * 60 * 1000);
        await updateDoc(doc(db, 'matches', m.id), {
          date: Timestamp.fromDate(nextDt)
        });
      }
      setBulkSavedShiftModal(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'matches (bulk shift)');
    } finally {
      setIsApplyingBulkShift(false);
    }
  };

  const handleDeleteAdminMatch = async () => {
    if (!adminDeletingMatch) return;
    setIsDeletingAdminMatch(true);
    try {
      await deleteDoc(doc(db, 'matches', adminDeletingMatch.id));
      setAdminDeletingMatch(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `matches/${adminDeletingMatch.id}`);
    } finally {
      setIsDeletingAdminMatch(false);
    }
  };

  const handleSaveBatchFixtures = async () => {
    if (!previewMatches || previewMatches.length === 0) return;
    setIsSavingBatch(true);

    try {
      for (const m of previewMatches) {
        // Match home or away team to existing teamId
        const homeMatchTeam = teams.find(t => t.name.toLowerCase() === m.homeTeamName.toLowerCase());
        const matchTeamId = homeMatchTeam ? homeMatchTeam.id : (teams[0]?.id || 'league_match');
        const matchDateObj = m.date instanceof Date ? m.date : new Date(m.date);

        await addDoc(collection(db, 'matches'), {
          teamId: matchTeamId,
          matchType: 'league',
          leagueId: m.leagueId,
          leagueName: m.leagueName,
          groupName: m.groupName || '',
          stage: m.stage || null,
          homePlaceholder: m.homePlaceholder || null,
          awayPlaceholder: m.awayPlaceholder || null,
          homeResolvedTeam: m.homeResolvedTeam || null,
          awayResolvedTeam: m.awayResolvedTeam || null,
          homeTeamName: m.homeTeamName,
          awayTeamName: m.awayTeamName,
          opponent: m.awayTeamName,
          location: m.location,
          matchNumber: m.matchNumber,
          fixtureRound: m.fixtureRound,
          status: 'scheduled',
          date: Timestamp.fromDate(isNaN(matchDateObj.getTime()) ? new Date() : matchDateObj),
          attendees: []
        });
      }

      if (fixtureGen.leagueId) {
        const leagueUpdates: any = {
          advancementFormat: fixtureGen.advancementFormat,
        };
        if (fixtureGen.advancementFormat === 'top_2_plus_best_3rd') {
          leagueUpdates.wildcardCount = fixtureGen.wildcardCount ?? 4;
        }
        if (fixtureGen.customAdvancingTotal) {
          leagueUpdates.totalAdvancing = parseInt(fixtureGen.customAdvancingTotal);
        }
        try {
          await updateDoc(doc(db, 'leagues', fixtureGen.leagueId), leagueUpdates);
        } catch (e) {
          console.warn('Could not update league advancement metadata:', e);
        }
      }

      alert(`Successfully generated and saved ${previewMatches.length} league fixtures (including all group matches and knockout stages)!`);
      setPreviewMatches(null);
      setIsGeneratingFixtures(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'matches');
    } finally {
      setIsSavingBatch(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }}
      className="space-y-12"
    >
      {/* League Management Section */}
      <section className="space-y-6">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-4xl font-black tracking-tight uppercase italic mb-1">League Management</h2>
            <p className="text-stone-500 font-medium">Create and manage leagues for match fixtures</p>
          </div>
          <button 
            onClick={() => setIsAddingLeague(true)}
            className="bg-emerald-600 text-white px-4 py-3 rounded-xl shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition-colors flex items-center gap-2 font-bold text-sm"
          >
            <Plus size={20} />
            <span>New League</span>
          </button>
        </div>

        <AnimatePresence>
          {isAddingLeague && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <form onSubmit={handleAddLeague} className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-4">
                <h3 className="font-bold text-lg">Add New League / Competition</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input 
                    placeholder="League Name (e.g. Premier Division 2026)"
                    className="w-full px-4 py-3 rounded-xl bg-stone-50 border border-stone-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    value={newLeague.name}
                    onChange={e => setNewLeague({...newLeague, name: e.target.value})}
                    required
                  />
                  <input 
                    placeholder="Description / Season details"
                    className="w-full px-4 py-3 rounded-xl bg-stone-50 border border-stone-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    value={newLeague.description || ''}
                    onChange={e => setNewLeague({...newLeague, description: e.target.value})}
                  />
                </div>
                <div className="flex gap-3 justify-end">
                  <button type="button" onClick={() => setIsAddingLeague(false)} className="px-6 py-2 text-stone-500 font-bold uppercase text-xs tracking-widest">Cancel</button>
                  <button type="submit" className="px-6 py-2 bg-stone-900 text-white rounded-lg font-bold uppercase text-xs tracking-widest hover:bg-stone-800 transition-colors">Create League</button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Batch Fixture Generator button & panel */}
        <div className="bg-stone-900 text-white p-6 rounded-3xl shadow-md space-y-6 border border-stone-800">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Calendar size={22} className="text-emerald-400" />
                <h3 className="text-xl font-black italic uppercase tracking-wider text-white">
                  League Fixture Batch Generator
                </h3>
              </div>
              <p className="text-stone-400 text-xs mt-1">
                Generate complete round-robin fixtures for full point-based leagues or group stage competitions.
              </p>
            </div>
            <button
              onClick={() => {
                setIsGeneratingFixtures(!isGeneratingFixtures);
                setPreviewMatches(null);
              }}
              className="px-4 py-2.5 bg-emerald-500 text-stone-950 font-black text-xs uppercase tracking-wider rounded-xl hover:bg-emerald-400 transition-all shadow-sm"
            >
              {isGeneratingFixtures ? 'Close Generator' : 'Open Fixture Generator'}
            </button>
          </div>

          <AnimatePresence>
            {isGeneratingFixtures && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden pt-4 border-t border-stone-800 space-y-6"
              >
                {!previewMatches ? (
                  <form onSubmit={handleGeneratePreview} className="space-y-6">
                    {/* Format Selector */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-stone-400 block">
                        League Format Mode
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setFixtureGen({ ...fixtureGen, leagueType: 'point_based' })}
                          className={`p-4 rounded-2xl border text-left flex items-start gap-3 transition-all ${
                            fixtureGen.leagueType === 'point_based'
                              ? 'bg-emerald-950/60 border-emerald-500 text-white shadow-md'
                              : 'bg-stone-800/60 border-stone-700 text-stone-400 hover:bg-stone-800'
                          }`}
                        >
                          <Trophy size={20} className={fixtureGen.leagueType === 'point_based' ? 'text-emerald-400' : 'text-stone-500'} />
                          <div>
                            <div className="font-bold text-sm text-white">Point-Based League</div>
                            <div className="text-xs text-stone-400 mt-0.5">Single division table. Every team plays every other team in round-robin schedule.</div>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => setFixtureGen({ ...fixtureGen, leagueType: 'group_stage' })}
                          className={`p-4 rounded-2xl border text-left flex items-start gap-3 transition-all ${
                            fixtureGen.leagueType === 'group_stage'
                              ? 'bg-emerald-950/60 border-emerald-500 text-white shadow-md'
                              : 'bg-stone-800/60 border-stone-700 text-stone-400 hover:bg-stone-800'
                          }`}
                        >
                          <Building2 size={20} className={fixtureGen.leagueType === 'group_stage' ? 'text-emerald-400' : 'text-stone-500'} />
                          <div>
                            <div className="font-bold text-sm text-white">Group Stage Competition</div>
                            <div className="text-xs text-stone-400 mt-0.5">Multiple groups (Group A, B, etc.). Teams compete in round-robin within their group.</div>
                          </div>
                        </button>
                      </div>
                    </div>

                    {/* League & Teams selection */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-bold uppercase tracking-wider text-stone-400 block mb-1">Target League</label>
                        <select
                          className="w-full px-4 py-2.5 rounded-xl bg-stone-800 text-white border border-stone-700 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          value={fixtureGen.leagueId}
                          onChange={e => setFixtureGen({ ...fixtureGen, leagueId: e.target.value })}
                          required
                        >
                          <option value="">-- Select Target League --</option>
                          {leagues.map(l => (
                            <option key={l.id} value={l.id}>{l.name}</option>
                          ))}
                        </select>
                      </div>

                      {fixtureGen.leagueType === 'group_stage' && (
                        <>
                          <div>
                            <label className="text-xs font-bold uppercase tracking-wider text-stone-400 block mb-1">Groups Configuration</label>
                            <input
                              type="text"
                              placeholder="e.g. Group A, Group B, Group C"
                              className="w-full px-4 py-2.5 rounded-xl bg-stone-800 text-white border border-stone-700 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                              value={fixtureGen.groupsText}
                              onChange={e => setFixtureGen({ ...fixtureGen, groupsText: e.target.value })}
                              required
                            />
                          </div>

                          <div className="md:col-span-3 bg-stone-850 p-4 rounded-2xl border border-stone-700 space-y-4">
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                id="includeKnockouts"
                                checked={fixtureGen.includeKnockoutStage}
                                onChange={e => setFixtureGen({ ...fixtureGen, includeKnockoutStage: e.target.checked })}
                                className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-500"
                              />
                              <label htmlFor="includeKnockouts" className="text-xs font-black uppercase tracking-wider text-amber-400 cursor-pointer flex items-center gap-1.5">
                                <Award size={14} /> Auto-Generate Next Round / Knockout Stage Bracket
                              </label>
                            </div>
                            <p className="text-[11px] text-stone-400 pl-7">
                              Automatically schedules knockout rounds scaled to total qualifiers (Round of 32, Round of 16, Quarter-Finals, Semi-Finals, or Grand Final).
                            </p>

                            {fixtureGen.includeKnockoutStage && (
                              <div className="pl-7 space-y-3 pt-1">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  <div>
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-stone-300 block mb-1">
                                      Advancement / Qualification Rule
                                    </label>
                                    <select
                                      value={fixtureGen.advancementFormat}
                                      onChange={e => {
                                        const val = e.target.value as any;
                                        let q = 2;
                                        if (val === 'top_1') q = 1;
                                        else if (val === 'top_3') q = 3;
                                        else if (val === 'top_4') q = 4;
                                        setFixtureGen({ ...fixtureGen, advancementFormat: val, qualifiersPerGroup: q });
                                      }}
                                      className="w-full px-3 py-2 rounded-xl bg-stone-900 text-white border border-stone-600 text-xs font-bold"
                                    >
                                      <option value="top_2">Top 2 Teams per Group (Standard)</option>
                                      <option value="top_2_plus_best_3rd">Top 2 + Best 3rd Place Teams (Wildcard)</option>
                                      <option value="top_1">Top 1 Group Winners Only</option>
                                      <option value="top_3">Top 3 Teams per Group</option>
                                      <option value="top_4">Top 4 Teams per Group</option>
                                      <option value="custom">Custom Rule (Admin Specified)</option>
                                    </select>
                                  </div>

                                  <div>
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-stone-300 block mb-1">
                                      Qualifiers Advancing per Group
                                    </label>
                                    <input
                                      type="number"
                                      min="1"
                                      max="8"
                                      value={fixtureGen.qualifiersPerGroup}
                                      onChange={e => setFixtureGen({ ...fixtureGen, qualifiersPerGroup: parseInt(e.target.value) || 2 })}
                                      className="w-full px-3 py-2 rounded-xl bg-stone-900 text-white border border-stone-600 text-xs font-bold"
                                    />
                                  </div>
                                </div>

                                 {fixtureGen.advancementFormat === 'top_2_plus_best_3rd' && (
                                  <div className="p-3 bg-amber-950/40 rounded-xl border border-amber-500/40 space-y-2">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
                                        <Award size={14} />
                                        <span>Wildcard Qualification Rules</span>
                                      </div>
                                      <span className="text-[10px] text-amber-300/80 font-bold">
                                        Euro / Best Loser Format
                                      </span>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                      <div>
                                        <label className="text-[10px] font-bold uppercase tracking-wider text-amber-300 block mb-1">
                                          Wildcard Team Count (Best 3rd Place)
                                        </label>
                                        <input
                                          type="number"
                                          min="1"
                                          max="16"
                                          value={fixtureGen.wildcardCount ?? 4}
                                          onChange={e => setFixtureGen({ ...fixtureGen, wildcardCount: Math.max(1, parseInt(e.target.value) || 0) })}
                                          className="w-full px-3 py-1.5 rounded-lg bg-stone-900 text-white border border-amber-500/50 text-xs font-bold focus:ring-1 focus:ring-amber-400"
                                        />
                                        <span className="text-[10px] text-stone-400 block mt-0.5">
                                          Number of best 3rd-place teams advancing (e.g. 4 for 6 groups, 2 for 3 groups)
                                        </span>
                                      </div>
                                      <div>
                                        <label className="text-[10px] font-bold uppercase tracking-wider text-stone-300 block mb-1">
                                          Total Advancing Teams
                                        </label>
                                        <input
                                          type="number"
                                          min="2"
                                          max="64"
                                          placeholder={`Auto: ${(() => {
                                            let gCount = fixtureGen.groupsText.split(/[\n,]+/).filter(g => g.trim().length > 0).length;
                                            if (gCount === 0) gCount = fixtureGen.numGroups || 2;
                                            return (gCount * (fixtureGen.qualifiersPerGroup || 2)) + (fixtureGen.wildcardCount ?? 4);
                                          })()} teams`}
                                          value={fixtureGen.customAdvancingTotal}
                                          onChange={e => setFixtureGen({ ...fixtureGen, customAdvancingTotal: e.target.value })}
                                          className="w-full px-3 py-1.5 rounded-lg bg-stone-900 text-white border border-stone-600 text-xs font-bold"
                                        />
                                        <span className="text-[10px] text-stone-400 block mt-0.5">
                                          {(() => {
                                            let gCount = fixtureGen.groupsText.split(/[\n,]+/).filter(g => g.trim().length > 0).length;
                                            if (gCount === 0) gCount = fixtureGen.numGroups || 2;
                                            const dir = gCount * (fixtureGen.qualifiersPerGroup || 2);
                                            const wc = fixtureGen.wildcardCount ?? 4;
                                            return `${dir} Direct (${fixtureGen.qualifiersPerGroup || 2} per grp) + ${wc} Wildcards = ${dir + wc} Total`;
                                          })()}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {fixtureGen.advancementFormat === 'custom' && (
                                  <div className="p-3 bg-stone-900/90 rounded-xl border border-stone-700 space-y-2">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                      <div>
                                        <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block mb-1">
                                          Total Advancing Teams (Optional Override)
                                        </label>
                                        <input
                                          type="number"
                                          min="2"
                                          max="64"
                                          placeholder="e.g. 16, 24, 32"
                                          value={fixtureGen.customAdvancingTotal}
                                          onChange={e => setFixtureGen({ ...fixtureGen, customAdvancingTotal: e.target.value })}
                                          className="w-full px-3 py-1.5 rounded-lg bg-stone-800 text-white border border-stone-600 text-xs font-bold"
                                        />
                                      </div>
                                      <div>
                                        <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block mb-1">
                                          Custom Advancement Notes
                                        </label>
                                        <input
                                          type="text"
                                          placeholder="e.g. 2 from Group A/B, plus 4 wildcard seeds"
                                          value={fixtureGen.customRuleText}
                                          onChange={e => setFixtureGen({ ...fixtureGen, customRuleText: e.target.value })}
                                          className="w-full px-3 py-1.5 rounded-lg bg-stone-800 text-white border border-stone-600 text-xs"
                                        />
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {/* Dynamic Starting Stage Display */}
                                {(() => {
                                  let gCount = fixtureGen.groupsText.split(/[\n,]+/).filter(g => g.trim().length > 0).length;
                                  if (gCount === 0) gCount = fixtureGen.numGroups || 2;

                                  const directQualifiers = gCount * (fixtureGen.qualifiersPerGroup || 2);
                                  const wildcards = fixtureGen.advancementFormat === 'top_2_plus_best_3rd' 
                                    ? (fixtureGen.wildcardCount ?? (gCount === 3 ? 2 : 4))
                                    : 0;

                                  let totalTeams = directQualifiers + wildcards;
                                  if (fixtureGen.customAdvancingTotal) {
                                    totalTeams = parseInt(fixtureGen.customAdvancingTotal) || totalTeams;
                                  }

                                  let startingStageName = 'Semi-Finals';
                                  if (totalTeams >= 32) startingStageName = 'Round of 32 (16 matches)';
                                  else if (totalTeams >= 16) startingStageName = 'Round of 16 (8 matches)';
                                  else if (totalTeams >= 8) startingStageName = 'Quarter-Finals (4 matches)';
                                  else if (totalTeams >= 4) startingStageName = 'Semi-Finals (2 matches)';
                                  else startingStageName = 'Grand Final (1 match)';

                                  return (
                                    <div className="p-3 bg-stone-900 rounded-xl border border-stone-700 flex items-center justify-between text-xs">
                                      <div>
                                        <span className="text-[10px] uppercase font-bold text-amber-400 block">Auto-Calculated Starting Round:</span>
                                        <span className="font-extrabold text-white text-sm">{startingStageName}</span>
                                      </div>
                                      <div className="text-right">
                                        <span className="text-[10px] uppercase font-bold text-stone-400 block">Total Advancing</span>
                                        <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 font-black rounded-lg text-xs">
                                          {totalTeams} Teams {wildcards > 0 && `(${directQualifiers} Direct + ${wildcards} Wildcards)`}
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })()}
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>

                    {/* Teams Input area */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <label className="text-xs font-bold uppercase tracking-wider text-stone-400 block">
                          Participating Teams List (One team per line or comma separated)
                        </label>
                        <button
                          type="button"
                          onClick={handleImportClubTeams}
                          className="px-3 py-1 bg-stone-800 hover:bg-stone-700 text-emerald-400 text-xs font-bold rounded-lg transition-colors border border-stone-700"
                        >
                          + Import Club Teams ({teams.length})
                        </button>
                      </div>
                      <textarea
                        rows={5}
                        placeholder={"Red Rovers\nBlue Dragons\nCity Athletics\nWestside Strikers\nUnited FC\nLions SC"}
                        className="w-full p-4 rounded-xl bg-stone-800 text-white border border-stone-700 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        value={fixtureGen.teamsText}
                        onChange={e => setFixtureGen({ ...fixtureGen, teamsText: e.target.value })}
                        required
                      />
                    </div>

                    {/* Schedule rules grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="text-xs font-bold uppercase tracking-wider text-stone-400 block mb-1">Format Legs</label>
                        <select
                          className="w-full px-4 py-2.5 rounded-xl bg-stone-800 text-white border border-stone-700 text-xs font-bold"
                          value={fixtureGen.isDoubleRoundRobin ? 'double' : 'single'}
                          onChange={e => setFixtureGen({ ...fixtureGen, isDoubleRoundRobin: e.target.value === 'double' })}
                        >
                          <option value="single">Single Round-Robin (1 Leg)</option>
                          <option value="double">Double Round-Robin (Home & Away 2 Legs)</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-xs font-bold uppercase tracking-wider text-stone-400 block mb-1">Season Start Date & Time</label>
                        <input
                          type="datetime-local"
                          className="w-full px-4 py-2.5 rounded-xl bg-stone-800 text-white border border-stone-700 text-xs font-bold"
                          value={fixtureGen.startDate}
                          onChange={e => setFixtureGen({ ...fixtureGen, startDate: e.target.value })}
                          required
                        />
                      </div>

                      <div>
                        <label className="text-xs font-bold uppercase tracking-wider text-emerald-400 block mb-1">
                          Matches per Day
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="12"
                          className="w-full px-4 py-2.5 rounded-xl bg-stone-800 text-white border border-stone-700 text-xs font-bold focus:border-emerald-500"
                          value={fixtureGen.matchesPerDay ?? 2}
                          onChange={e => setFixtureGen({ ...fixtureGen, matchesPerDay: Math.max(1, parseInt(e.target.value) || 1) })}
                        />
                        <span className="text-[10px] text-stone-400 block mt-0.5">Games played per day in each round</span>
                      </div>

                      <div>
                        <label className="text-xs font-bold uppercase tracking-wider text-emerald-400 block mb-1">
                          Rest Days Between Rounds
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="30"
                          className="w-full px-4 py-2.5 rounded-xl bg-stone-800 text-white border border-stone-700 text-xs font-bold focus:border-emerald-500"
                          value={fixtureGen.restDaysBetweenRounds ?? 2}
                          onChange={e => setFixtureGen({ ...fixtureGen, restDaysBetweenRounds: Math.max(0, parseInt(e.target.value) || 0) })}
                        />
                        <span className="text-[10px] text-stone-400 block mt-0.5">Recovery gap before next round starts</span>
                      </div>

                      <div>
                        <label className="text-xs font-bold uppercase tracking-wider text-stone-400 block mb-1">
                          Match Time Gap (Hours)
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="10"
                          className="w-full px-4 py-2.5 rounded-xl bg-stone-800 text-white border border-stone-700 text-xs font-bold"
                          value={fixtureGen.matchTimeGapHours ?? 2}
                          onChange={e => setFixtureGen({ ...fixtureGen, matchTimeGapHours: Math.max(1, parseInt(e.target.value) || 2) })}
                        />
                        <span className="text-[10px] text-stone-400 block mt-0.5">Kickoff hours spacing between same-day games</span>
                      </div>

                      <div>
                        <label className="text-xs font-bold uppercase tracking-wider text-stone-400 block mb-1">Match Number Start</label>
                        <input
                          type="number"
                          min="1"
                          className="w-full px-4 py-2.5 rounded-xl bg-stone-800 text-white border border-stone-700 text-xs font-bold"
                          value={fixtureGen.matchNumberStart}
                          onChange={e => setFixtureGen({ ...fixtureGen, matchNumberStart: parseInt(e.target.value) || 101 })}
                        />
                      </div>

                      <div>
                        <label className="text-xs font-bold uppercase tracking-wider text-stone-400 block mb-1">Stadium / Venue</label>
                        <input
                          type="text"
                          className="w-full px-4 py-2.5 rounded-xl bg-stone-800 text-white border border-stone-700 text-xs font-bold"
                          value={fixtureGen.location}
                          onChange={e => setFixtureGen({ ...fixtureGen, location: e.target.value })}
                        />
                      </div>

                      <div>
                        <label className="text-xs font-bold uppercase tracking-wider text-stone-400 block mb-1">Round Prefix Label</label>
                        <input
                          type="text"
                          placeholder="e.g. Round or Matchday"
                          className="w-full px-4 py-2.5 rounded-xl bg-stone-800 text-white border border-stone-700 text-xs font-bold"
                          value={fixtureGen.roundPrefix}
                          onChange={e => setFixtureGen({ ...fixtureGen, roundPrefix: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                      <button
                        type="submit"
                        className="px-6 py-3 bg-emerald-500 text-stone-950 rounded-xl font-black text-xs uppercase tracking-wider hover:bg-emerald-400 transition-all shadow-lg flex items-center gap-2"
                      >
                        <Calendar size={16} /> Generate Fixture Schedule Preview
                      </button>
                    </div>
                  </form>
                ) : (
                  /* Preview & Confirmation Modal/Panel */
                  <div className="space-y-4">
                    <div className="bg-stone-800/90 p-4 rounded-2xl border border-stone-700 flex flex-wrap justify-between items-center gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black uppercase tracking-widest text-emerald-400">
                            {fixtureGen.leagueType === 'group_stage' ? 'Group Stage Fixture Preview' : 'Point-Based League Fixture Preview'}
                          </span>
                          <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-full text-[10px] font-bold">
                            {previewMatches.length} Matches
                          </span>
                        </div>
                        <h4 className="text-lg font-black italic uppercase text-white mt-0.5">
                          Flexible Schedule Ready for Review
                        </h4>
                        <p className="text-[11px] text-stone-400">
                          Review dates, kickoff times, and stadiums below. You can manually edit or delete any fixture, add custom exhibition games, or apply bulk updates before saving.
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setIsAddingPreviewMatch(true)}
                          className="px-3 py-2 bg-stone-700 hover:bg-stone-600 text-emerald-300 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors border border-stone-600"
                        >
                          <Plus size={14} />
                          <span>Add Fixture</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsBulkPreviewStadiumModal(true)}
                          className="px-3 py-2 bg-stone-700 hover:bg-stone-600 text-stone-200 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors border border-stone-600"
                        >
                          <MapPin size={14} />
                          <span>Set All Stadiums</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsBulkPreviewShiftModal(true)}
                          className="px-3 py-2 bg-stone-700 hover:bg-stone-600 text-stone-200 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors border border-stone-600"
                        >
                          <Calendar size={14} />
                          <span>Shift Schedule (+/- Days)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setPreviewMatches(null)}
                          className="px-3 py-2 bg-stone-700 text-stone-300 text-xs font-bold rounded-xl hover:bg-stone-600 transition-colors"
                        >
                          Reconfigure
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveBatchFixtures}
                          disabled={isSavingBatch}
                          className="px-5 py-2 bg-emerald-500 text-stone-950 text-xs font-black uppercase tracking-wider rounded-xl hover:bg-emerald-400 transition-colors shadow-md flex items-center gap-2"
                        >
                          {isSavingBatch ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                          <span>Confirm & Save All</span>
                        </button>
                      </div>
                    </div>

                    {/* Scrollable Preview Table */}
                    <div className="max-h-96 overflow-y-auto rounded-2xl border border-stone-800 bg-stone-950 p-2">
                      <table className="w-full text-left text-xs text-stone-300">
                        <thead className="bg-stone-900 text-[10px] font-black uppercase tracking-widest text-stone-400 sticky top-0 z-10">
                          <tr>
                            <th className="p-2.5">Match #</th>
                            {fixtureGen.leagueType === 'group_stage' && <th className="p-2.5">Group</th>}
                            <th className="p-2.5">Round</th>
                            <th className="p-2.5">Date & Kickoff</th>
                            <th className="p-2.5 text-right">Home Team</th>
                            <th className="p-2.5 text-center">VS</th>
                            <th className="p-2.5">Away Team</th>
                            <th className="p-2.5">Stadium / Venue</th>
                            <th className="p-2.5 text-center">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-900 font-medium">
                          {previewMatches.map((m, idx) => {
                            const isKo = Boolean(m.stage || m.homePlaceholder || m.awayPlaceholder || m.groupName === 'Knockout Stage');
                            const matchDt = m.date instanceof Date ? m.date : new Date(m.date);

                            return (
                              <tr key={idx} className={`hover:bg-stone-900/60 ${isKo ? 'bg-amber-950/20' : ''}`}>
                                <td className="p-2.5 font-bold text-emerald-400 whitespace-nowrap">{m.matchNumber}</td>
                                {fixtureGen.leagueType === 'group_stage' && (
                                  <td className="p-2.5 whitespace-nowrap">
                                    {isKo ? (
                                      <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded text-[9px] font-black uppercase">
                                        Knockout
                                      </span>
                                    ) : (
                                      <span className="px-2 py-0.5 bg-indigo-950 text-indigo-300 border border-indigo-800 rounded text-[9px] font-black">
                                        {m.groupName}
                                      </span>
                                    )}
                                  </td>
                                )}
                                <td className="p-2.5 whitespace-nowrap">
                                  <span className={isKo ? 'text-amber-400 font-bold' : 'text-stone-400'}>
                                    {m.fixtureRound || m.stage}
                                  </span>
                                </td>
                                <td className="p-2.5 text-stone-200 whitespace-nowrap">
                                  <div className="flex items-center gap-1 font-mono text-[11px]">
                                    <Calendar size={12} className="text-emerald-400" />
                                    <span>
                                      {!isNaN(matchDt.getTime())
                                        ? matchDt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                                        : 'TBD'}
                                    </span>
                                  </div>
                                </td>
                                <td className="p-2.5 text-right font-bold text-white whitespace-nowrap">
                                  <div className="flex items-center justify-end gap-1.5">
                                    {Boolean(m.homeTeamName?.includes('Wildcard') || m.homePlaceholder?.includes('Wildcard') || m.homePlaceholder?.includes('Best 3rd')) && (
                                      <span className="px-1.5 py-0.5 bg-amber-400/20 text-amber-300 border border-amber-400/40 rounded text-[9px] font-bold uppercase tracking-wider">
                                        Wildcard
                                      </span>
                                    )}
                                    <span>{m.homeTeamName}</span>
                                  </div>
                                  {m.homePlaceholder && (
                                    <div className="text-[10px] text-amber-400 font-mono">({m.homePlaceholder})</div>
                                  )}
                                </td>
                                <td className="p-2.5 text-center font-black text-stone-500">vs</td>
                                <td className="p-2.5 font-bold text-white whitespace-nowrap">
                                  <div className="flex items-center gap-1.5">
                                    <span>{m.awayTeamName}</span>
                                    {Boolean(m.awayTeamName?.includes('Wildcard') || m.awayPlaceholder?.includes('Wildcard') || m.awayPlaceholder?.includes('Best 3rd')) && (
                                      <span className="px-1.5 py-0.5 bg-amber-400/20 text-amber-300 border border-amber-400/40 rounded text-[9px] font-bold uppercase tracking-wider">
                                        Wildcard
                                      </span>
                                    )}
                                  </div>
                                  {m.awayPlaceholder && (
                                    <div className="text-[10px] text-amber-400 font-mono">({m.awayPlaceholder})</div>
                                  )}
                                </td>
                                <td className="p-2.5 text-stone-300 whitespace-nowrap">
                                  <div className="flex items-center gap-1">
                                    <MapPin size={12} className="text-stone-400" />
                                    <span>{m.location}</span>
                                  </div>
                                </td>
                                <td className="p-2.5 text-center whitespace-nowrap">
                                  <div className="flex items-center justify-center gap-1">
                                    <button
                                      type="button"
                                      title="Edit Date, Stadium & Teams"
                                      onClick={() => handleStartEditPreview(idx)}
                                      className="p-1.5 hover:bg-stone-800 text-stone-400 hover:text-emerald-400 rounded-lg transition-colors"
                                    >
                                      <PenTool size={13} />
                                    </button>
                                    <button
                                      type="button"
                                      title="Delete Match from Schedule"
                                      onClick={() => handleDeletePreviewMatch(idx)}
                                      className="p-1.5 hover:bg-stone-800 text-stone-400 hover:text-red-400 rounded-lg transition-colors"
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Modal: Edit Preview Match */}
                    {editingPreviewIdx !== null && previewEditForm && (
                      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-xs">
                        <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-stone-200 space-y-4">
                          <div className="flex justify-between items-center">
                            <h4 className="text-base font-black uppercase text-stone-900 flex items-center gap-2">
                              <PenTool size={18} className="text-emerald-600" />
                              <span>Edit Match #{editingPreviewIdx + 1}</span>
                            </h4>
                            <button
                              type="button"
                              onClick={() => { setEditingPreviewIdx(null); setPreviewEditForm(null); }}
                              className="text-stone-400 hover:text-stone-600 p-1"
                            >
                              <X size={18} />
                            </button>
                          </div>

                          <form onSubmit={handleSavePreviewEdit} className="space-y-3 text-xs">
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-[10px] font-bold uppercase text-stone-500 block mb-1">Home Team</label>
                                <input
                                  type="text"
                                  required
                                  value={previewEditForm.homeTeamName}
                                  onChange={e => setPreviewEditForm({ ...previewEditForm, homeTeamName: e.target.value })}
                                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-bold text-stone-900"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] font-bold uppercase text-stone-500 block mb-1">Away Team</label>
                                <input
                                  type="text"
                                  required
                                  value={previewEditForm.awayTeamName}
                                  onChange={e => setPreviewEditForm({ ...previewEditForm, awayTeamName: e.target.value })}
                                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-bold text-stone-900"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="text-[10px] font-bold uppercase text-stone-500 block mb-1">Date & Kickoff Time</label>
                              <input
                                type="datetime-local"
                                required
                                value={previewEditForm.dateStr}
                                onChange={e => setPreviewEditForm({ ...previewEditForm, dateStr: e.target.value })}
                                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-bold text-stone-900"
                              />
                            </div>

                            <div>
                              <label className="text-[10px] font-bold uppercase text-stone-500 block mb-1">Stadium / Venue</label>
                              <input
                                type="text"
                                required
                                value={previewEditForm.location}
                                onChange={e => setPreviewEditForm({ ...previewEditForm, location: e.target.value })}
                                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-bold text-stone-900"
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-[10px] font-bold uppercase text-stone-500 block mb-1">Round Label</label>
                                <input
                                  type="text"
                                  value={previewEditForm.fixtureRound || ''}
                                  onChange={e => setPreviewEditForm({ ...previewEditForm, fixtureRound: e.target.value })}
                                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-bold text-stone-900"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] font-bold uppercase text-stone-500 block mb-1">Match Number</label>
                                <input
                                  type="text"
                                  value={previewEditForm.matchNumber || ''}
                                  onChange={e => setPreviewEditForm({ ...previewEditForm, matchNumber: e.target.value })}
                                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-bold text-stone-900"
                                />
                              </div>
                            </div>

                            <div className="flex gap-2 pt-2 border-t border-stone-100">
                              <button
                                type="button"
                                onClick={() => { setEditingPreviewIdx(null); setPreviewEditForm(null); }}
                                className="flex-1 py-2.5 bg-stone-100 text-stone-700 font-bold rounded-xl hover:bg-stone-200"
                              >
                                Cancel
                              </button>
                              <button
                                type="submit"
                                className="flex-1 py-2.5 bg-emerald-600 text-white font-black uppercase rounded-xl hover:bg-emerald-700 flex items-center justify-center gap-1.5"
                              >
                                <CheckCircle2 size={14} />
                                <span>Save Changes</span>
                              </button>
                            </div>
                          </form>
                        </div>
                      </div>
                    )}

                    {/* Modal: Add Custom Fixture to Preview */}
                    {isAddingPreviewMatch && (
                      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-xs">
                        <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-stone-200 space-y-4">
                          <div className="flex justify-between items-center">
                            <h4 className="text-base font-black uppercase text-stone-900 flex items-center gap-2">
                              <Plus size={18} className="text-emerald-600" />
                              <span>Add Custom Fixture to Schedule</span>
                            </h4>
                            <button
                              type="button"
                              onClick={() => setIsAddingPreviewMatch(false)}
                              className="text-stone-400 hover:text-stone-600 p-1"
                            >
                              <X size={18} />
                            </button>
                          </div>

                          <form onSubmit={handleAddMatchToPreview} className="space-y-3 text-xs">
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-[10px] font-bold uppercase text-stone-500 block mb-1">Home Team</label>
                                <input
                                  type="text"
                                  placeholder="e.g. Eagles FC"
                                  required
                                  value={newPreviewItem.homeTeamName}
                                  onChange={e => setNewPreviewItem({ ...newPreviewItem, homeTeamName: e.target.value })}
                                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-bold text-stone-900"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] font-bold uppercase text-stone-500 block mb-1">Away Team</label>
                                <input
                                  type="text"
                                  placeholder="e.g. Hawks SC"
                                  required
                                  value={newPreviewItem.awayTeamName}
                                  onChange={e => setNewPreviewItem({ ...newPreviewItem, awayTeamName: e.target.value })}
                                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-bold text-stone-900"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="text-[10px] font-bold uppercase text-stone-500 block mb-1">Kickoff Date & Time</label>
                              <input
                                type="datetime-local"
                                required
                                value={newPreviewItem.date}
                                onChange={e => setNewPreviewItem({ ...newPreviewItem, date: e.target.value })}
                                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-bold text-stone-900"
                              />
                            </div>

                            <div>
                              <label className="text-[10px] font-bold uppercase text-stone-500 block mb-1">Stadium / Venue</label>
                              <input
                                type="text"
                                placeholder="e.g. City Arena Pitch 1"
                                required
                                value={newPreviewItem.location}
                                onChange={e => setNewPreviewItem({ ...newPreviewItem, location: e.target.value })}
                                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-bold text-stone-900"
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-[10px] font-bold uppercase text-stone-500 block mb-1">Round / Stage</label>
                                <input
                                  type="text"
                                  placeholder="e.g. Round 3 or Playoff"
                                  value={newPreviewItem.fixtureRound}
                                  onChange={e => setNewPreviewItem({ ...newPreviewItem, fixtureRound: e.target.value })}
                                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-bold text-stone-900"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] font-bold uppercase text-stone-500 block mb-1">Group (Optional)</label>
                                <input
                                  type="text"
                                  placeholder="e.g. Group A"
                                  value={newPreviewItem.groupName}
                                  onChange={e => setNewPreviewItem({ ...newPreviewItem, groupName: e.target.value })}
                                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-bold text-stone-900"
                                />
                              </div>
                            </div>

                            <div className="flex gap-2 pt-2 border-t border-stone-100">
                              <button
                                type="button"
                                onClick={() => setIsAddingPreviewMatch(false)}
                                className="flex-1 py-2.5 bg-stone-100 text-stone-700 font-bold rounded-xl hover:bg-stone-200"
                              >
                                Cancel
                              </button>
                              <button
                                type="submit"
                                className="flex-1 py-2.5 bg-emerald-600 text-white font-black uppercase rounded-xl hover:bg-emerald-700 flex items-center justify-center gap-1.5"
                              >
                                <Plus size={14} />
                                <span>Add to Preview</span>
                              </button>
                            </div>
                          </form>
                        </div>
                      </div>
                    )}

                    {/* Modal: Bulk Set Stadium for Preview */}
                    {isBulkPreviewStadiumModal && (
                      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-xs">
                        <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-stone-200 space-y-4">
                          <div className="flex justify-between items-center">
                            <h4 className="text-base font-black uppercase text-stone-900 flex items-center gap-2">
                              <MapPin size={18} className="text-emerald-600" />
                              <span>Set Stadium for All</span>
                            </h4>
                            <button
                              type="button"
                              onClick={() => setIsBulkPreviewStadiumModal(false)}
                              className="text-stone-400 hover:text-stone-600 p-1"
                            >
                              <X size={18} />
                            </button>
                          </div>
                          <p className="text-xs text-stone-500">
                            Apply this stadium / venue to all {previewMatches.length} matches in this preview.
                          </p>
                          <input
                            type="text"
                            placeholder="e.g. National Stadium"
                            value={bulkPreviewStadiumVal}
                            onChange={e => setBulkPreviewStadiumVal(e.target.value)}
                            className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-900"
                            autoFocus
                          />
                          <div className="flex gap-2 pt-2 border-t border-stone-100">
                            <button
                              type="button"
                              onClick={() => setIsBulkPreviewStadiumModal(false)}
                              className="flex-1 py-2.5 bg-stone-100 text-stone-700 text-xs font-bold rounded-xl hover:bg-stone-200"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={handleApplyBulkPreviewStadium}
                              disabled={!bulkPreviewStadiumVal.trim()}
                              className="flex-1 py-2.5 bg-emerald-600 text-white text-xs font-black uppercase rounded-xl hover:bg-emerald-700 disabled:opacity-50"
                            >
                              Apply to All
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Modal: Bulk Shift Preview Schedule */}
                    {isBulkPreviewShiftModal && (
                      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-xs">
                        <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-stone-200 space-y-4">
                          <div className="flex justify-between items-center">
                            <h4 className="text-base font-black uppercase text-stone-900 flex items-center gap-2">
                              <Calendar size={18} className="text-emerald-600" />
                              <span>Shift Schedule Dates</span>
                            </h4>
                            <button
                              type="button"
                              onClick={() => setIsBulkPreviewShiftModal(false)}
                              className="text-stone-400 hover:text-stone-600 p-1"
                            >
                              <X size={18} />
                            </button>
                          </div>
                          <p className="text-xs text-stone-500">
                            Shift all {previewMatches.length} match dates forward or backward by a number of days (e.g. +7 to postpone by a week, -3 to advance).
                          </p>
                          <div>
                            <label className="text-[10px] font-bold uppercase text-stone-500 block mb-1">Days to Shift (+/-)</label>
                            <input
                              type="number"
                              value={bulkPreviewShiftDaysVal}
                              onChange={e => setBulkPreviewShiftDaysVal(parseInt(e.target.value) || 0)}
                              className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-900"
                              autoFocus
                            />
                          </div>
                          <div className="flex gap-2 pt-2 border-t border-stone-100">
                            <button
                              type="button"
                              onClick={() => setIsBulkPreviewShiftModal(false)}
                              className="flex-1 py-2.5 bg-stone-100 text-stone-700 text-xs font-bold rounded-xl hover:bg-stone-200"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={handleApplyBulkPreviewShift}
                              className="flex-1 py-2.5 bg-emerald-600 text-white text-xs font-black uppercase rounded-xl hover:bg-emerald-700"
                            >
                              Shift Dates
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Existing Leagues & Competitions Grid */}
        <div className="space-y-4 pt-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-lg text-stone-900 flex items-center gap-2">
              <Trophy size={20} className="text-amber-500" />
              <span>Registered Leagues & Tournaments ({leagues.length})</span>
            </h3>
          </div>

          {leagues.length === 0 ? (
            <div className="bg-white p-8 rounded-2xl border border-stone-200 text-center space-y-2 text-stone-400">
              <Trophy size={36} className="mx-auto text-stone-300" />
              <p className="text-sm font-bold text-stone-700">No leagues created yet</p>
              <p className="text-xs">Create your first league using the "New League" button above or generate batch fixtures.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {leagues.map(league => {
                const matchCount = matches.filter(
                  m => m.leagueId === league.id || m.leagueName === league.name
                ).length;
                return (
                  <div key={league.id} className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-3">
                        <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600">
                          <Trophy size={24} />
                        </div>
                        <button 
                          onClick={() => {
                            setDeletingLeague(league);
                            setDeleteLeagueMatches(false);
                          }}
                          className="p-2 text-stone-300 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                          title={`Delete ${league.name}`}
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                      <h4 className="font-black text-xl mb-1 text-stone-900 tracking-tight">{league.name}</h4>
                      <p className="text-stone-500 text-xs line-clamp-2 mb-4 leading-relaxed">
                        {league.description || 'No description provided for this league.'}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-xs font-bold">
                      <span className="text-stone-400 uppercase tracking-wider text-[10px]">Total Fixtures</span>
                      <span className="px-2.5 py-1 bg-stone-100 text-stone-700 rounded-lg text-xs font-black">
                        {matchCount} {matchCount === 1 ? 'match' : 'matches'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Delete League Confirmation Modal */}
        <AnimatePresence>
          {deletingLeague && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-sm">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-stone-200 space-y-6"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                    <Trash2 size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black italic uppercase tracking-tight text-stone-900">
                      Delete League?
                    </h3>
                    <p className="text-stone-500 text-xs mt-1">
                      Are you sure you want to delete <span className="font-bold text-stone-800">"{deletingLeague.name}"</span>?
                    </p>
                  </div>
                </div>

                {(() => {
                  const leagueMatchesCount = matches.filter(
                    m => m.leagueId === deletingLeague.id || m.leagueName === deletingLeague.name
                  ).length;

                  return (
                    <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200/80 space-y-3 text-xs">
                      <div className="flex items-center justify-between text-stone-600 font-bold">
                        <span>Associated fixtures:</span>
                        <span className="px-2 py-0.5 bg-stone-200 rounded font-black text-stone-800">
                          {leagueMatchesCount} matches
                        </span>
                      </div>

                      {leagueMatchesCount > 0 && (
                        <label className="flex items-start gap-2.5 cursor-pointer pt-2 border-t border-stone-200 text-stone-700 font-medium">
                          <input 
                            type="checkbox"
                            checked={deleteLeagueMatches}
                            onChange={e => setDeleteLeagueMatches(e.target.checked)}
                            className="mt-0.5 rounded border-stone-300 text-red-600 focus:ring-red-500"
                          />
                          <span>
                            Also delete all {leagueMatchesCount} match fixture(s) belonging to this league
                          </span>
                        </label>
                      )}
                    </div>
                  );
                })()}

                <div className="flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setDeletingLeague(null);
                      setDeleteLeagueMatches(false);
                    }}
                    disabled={isDeletingLeague}
                    className="px-4 py-2.5 text-stone-500 text-xs font-bold uppercase tracking-wider hover:text-stone-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={confirmDeleteLeague}
                    disabled={isDeletingLeague}
                    className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-colors shadow-lg shadow-red-600/20 flex items-center gap-2"
                  >
                    {isDeletingLeague ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                    <span>Confirm Delete</span>
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </section>

      {/* Fixtures & Venues Management Hub (Add, Change, Delete, Date & Stadium Control) */}
      <section className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 bg-emerald-500/10 text-emerald-700 border border-emerald-500/30 rounded-full text-xs font-bold uppercase tracking-wider">
                Full Flexibility Control
              </span>
              <span className="text-xs font-bold text-stone-500">
                {matches.length} Total Fixtures in System
              </span>
            </div>
            <h2 className="text-3xl md:text-4xl font-black tracking-tight uppercase italic text-stone-900 mt-1">
              Fixtures & Venues Hub
            </h2>
            <p className="text-stone-500 font-medium text-sm">
              Manually change kickoff dates & times, update stadiums/venues, add custom matches, and delete or reassign fixtures.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setNewAdminFixture({
                  leagueId: leagues[0]?.id || '',
                  leagueName: leagues[0]?.name || '',
                  groupName: 'Group A',
                  homeTeamName: teams[0]?.name || 'Home Team',
                  awayTeamName: teams[1]?.name || 'Away Team',
                  date: new Date().toISOString().slice(0, 16),
                  location: 'Main Stadium',
                  matchNumber: `Match #${matches.length + 1}`,
                  fixtureRound: 'Round 1',
                  stage: 'group',
                  status: 'scheduled'
                });
                setIsAddingAdminFixture(true);
              }}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-colors shadow-sm flex items-center gap-2"
            >
              <Plus size={16} />
              <span>Add Fixture</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setBulkSavedStadiumLeagueId(adminFixtureLeagueFilter !== 'all' ? adminFixtureLeagueFilter : 'all');
                setBulkSavedStadiumModal(true);
              }}
              className="px-3.5 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-bold transition-colors border border-stone-300 flex items-center gap-1.5"
            >
              <MapPin size={15} className="text-stone-600" />
              <span>Bulk Change Stadium</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setBulkSavedShiftLeagueId(adminFixtureLeagueFilter !== 'all' ? adminFixtureLeagueFilter : 'all');
                setBulkSavedShiftModal(true);
              }}
              className="px-3.5 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-bold transition-colors border border-stone-300 flex items-center gap-1.5"
            >
              <Calendar size={15} className="text-stone-600" />
              <span>Bulk Shift Dates</span>
            </button>
          </div>
        </div>

        {/* Search and Filters Bar */}
        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">League:</span>
              <select
                value={adminFixtureLeagueFilter}
                onChange={e => setAdminFixtureLeagueFilter(e.target.value)}
                className="px-3 py-1.5 bg-stone-50 border border-stone-300 rounded-xl text-xs font-bold text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="all">All Leagues ({matches.length})</option>
                {leagues.map(l => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">Stage:</span>
              <select
                value={adminFixtureStageFilter}
                onChange={e => setAdminFixtureStageFilter(e.target.value)}
                className="px-3 py-1.5 bg-stone-50 border border-stone-300 rounded-xl text-xs font-bold text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="all">All Match Types</option>
                <option value="group">Group Stage Only</option>
                <option value="knockout">Knockout Stage Only</option>
                <option value="friendly">Friendlies & Practice</option>
              </select>
            </div>
          </div>

          <div className="relative w-full md:w-72">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder="Search team, stadium, match #..."
              value={adminFixtureSearch}
              onChange={e => setAdminFixtureSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs font-medium text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
        </div>

        {/* Fixtures Table */}
        {(() => {
          const adminFilteredMatches = matches.filter(m => {
            if (adminFixtureLeagueFilter !== 'all') {
              if (m.leagueId !== adminFixtureLeagueFilter && m.leagueName !== adminFixtureLeagueFilter) {
                return false;
              }
            }
            if (adminFixtureStageFilter !== 'all') {
              const isKo = Boolean(m.stage || m.homePlaceholder || m.awayPlaceholder || m.groupName === 'Knockout Stage');
              if (adminFixtureStageFilter === 'group' && isKo) return false;
              if (adminFixtureStageFilter === 'knockout' && !isKo) return false;
              if (adminFixtureStageFilter === 'friendly' && m.matchType !== 'friendly') return false;
            }
            if (adminFixtureSearch.trim()) {
              const q = adminFixtureSearch.toLowerCase();
              const h = (m.homeTeamName || '').toLowerCase();
              const a = (m.awayTeamName || m.opponent || '').toLowerCase();
              const loc = (m.location || '').toLowerCase();
              const mn = (m.matchNumber || '').toLowerCase();
              const r = (m.fixtureRound || m.stage || '').toLowerCase();
              if (!h.includes(q) && !a.includes(q) && !loc.includes(q) && !mn.includes(q) && !r.includes(q)) {
                return false;
              }
            }
            return true;
          }).sort((a, b) => {
            const dtA = a.date ? (typeof a.date === 'string' ? new Date(a.date).getTime() : a.date.toDate?.().getTime() || 0) : 0;
            const dtB = b.date ? (typeof b.date === 'string' ? new Date(b.date).getTime() : b.date.toDate?.().getTime() || 0) : 0;
            return dtA - dtB;
          });

          if (adminFilteredMatches.length === 0) {
            return (
              <div className="bg-white p-12 rounded-3xl border border-stone-200 text-center space-y-3">
                <Calendar size={40} className="mx-auto text-stone-300" />
                <h3 className="font-bold text-base text-stone-700">No fixtures match this filter</h3>
                <p className="text-xs text-stone-400 max-w-sm mx-auto">
                  Try clearing your search query or generate new fixtures using the Batch Fixture Generator above.
                </p>
              </div>
            );
          }

          return (
            <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden">
              <div className="p-4 bg-stone-50/70 border-b border-stone-200 flex justify-between items-center">
                <span className="text-xs font-bold text-stone-600">
                  Showing <span className="font-black text-stone-900">{adminFilteredMatches.length}</span> fixtures
                </span>
                <span className="text-[11px] text-stone-500 italic">
                  Tip: Click on date or stadium icons to quickly update any fixture.
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-stone-700">
                  <thead className="bg-stone-100 text-[10px] font-black uppercase tracking-widest text-stone-500 border-b border-stone-200">
                    <tr>
                      <th className="p-3.5">Match #</th>
                      <th className="p-3.5">League / Stage</th>
                      <th className="p-3.5">Round</th>
                      <th className="p-3.5">Kickoff Date & Time</th>
                      <th className="p-3.5 text-right">Home Team</th>
                      <th className="p-3.5 text-center">Score / VS</th>
                      <th className="p-3.5">Away Team</th>
                      <th className="p-3.5">Stadium / Venue</th>
                      <th className="p-3.5 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 font-medium">
                    {adminFilteredMatches.map(m => {
                      const isKo = Boolean(m.stage || m.homePlaceholder || m.awayPlaceholder || m.groupName === 'Knockout Stage');
                      const matchDate = m.date ? (typeof m.date === 'string' ? new Date(m.date) : m.date.toDate?.() || new Date()) : null;

                      return (
                        <tr key={m.id} className="hover:bg-stone-50/80 transition-colors">
                          <td className="p-3.5 whitespace-nowrap font-bold text-emerald-700">
                            {m.matchNumber || m.id.slice(0, 6)}
                          </td>
                          <td className="p-3.5 whitespace-nowrap">
                            <div className="space-y-0.5">
                              <div className="font-bold text-stone-900">{m.leagueName || 'League Match'}</div>
                              {isKo ? (
                                <span className="px-2 py-0.5 bg-amber-100 text-amber-800 border border-amber-300 rounded text-[9px] font-black uppercase">
                                  {m.stage || 'Knockout'}
                                </span>
                              ) : m.groupName ? (
                                <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded text-[9px] font-bold">
                                  {m.groupName}
                                </span>
                              ) : null}
                            </div>
                          </td>
                          <td className="p-3.5 whitespace-nowrap text-stone-600">
                            {m.fixtureRound || m.stage || '—'}
                          </td>
                          <td className="p-3.5 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <div>
                                <div className="font-bold text-stone-900">
                                  {matchDate ? matchDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Date TBD'}
                                </div>
                                <div className="text-[11px] text-stone-500 font-mono">
                                  {matchDate ? matchDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : 'Time TBD'}
                                </div>
                              </div>
                              <button
                                type="button"
                                title="Change Date & Time"
                                onClick={() => {
                                  setQuickDateMatch(m);
                                  const dtStr = matchDate ? matchDate.toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16);
                                  setQuickDateVal(dtStr);
                                }}
                                className="p-1.5 bg-stone-100 hover:bg-emerald-50 text-stone-500 hover:text-emerald-700 rounded-lg transition-colors border border-stone-200"
                              >
                                <Calendar size={13} />
                              </button>
                            </div>
                          </td>
                          <td className="p-3.5 text-right whitespace-nowrap font-bold text-stone-900">
                            <div>{m.homeTeamName || 'TBD'}</div>
                            {m.homePlaceholder && (
                              <div className="text-[10px] text-amber-600 font-mono">({m.homePlaceholder})</div>
                            )}
                          </td>
                          <td className="p-3.5 text-center whitespace-nowrap font-black">
                            {m.status === 'completed' ? (
                              <span className="px-2 py-1 bg-stone-900 text-white rounded-lg text-xs font-mono">
                                {m.score || `${m.homeScore ?? 0} - ${m.awayScore ?? (m.opponentScore ?? 0)}`}
                              </span>
                            ) : (
                              <span className="text-stone-400 font-mono text-xs">vs</span>
                            )}
                          </td>
                          <td className="p-3.5 whitespace-nowrap font-bold text-stone-900">
                            <div>{m.awayTeamName || m.opponent || 'TBD'}</div>
                            {m.awayPlaceholder && (
                              <div className="text-[10px] text-amber-600 font-mono">({m.awayPlaceholder})</div>
                            )}
                          </td>
                          <td className="p-3.5 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <span className="text-stone-800 font-medium">{m.location || 'Not Assigned'}</span>
                              <button
                                type="button"
                                title="Change Stadium"
                                onClick={() => {
                                  setQuickStadiumMatch(m);
                                  setQuickStadiumVal(m.location || '');
                                }}
                                className="p-1.5 bg-stone-100 hover:bg-emerald-50 text-stone-500 hover:text-emerald-700 rounded-lg transition-colors border border-stone-200"
                              >
                                <MapPin size={13} />
                              </button>
                            </div>
                          </td>
                          <td className="p-3.5 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                title="Full Edit Match Details"
                                onClick={() => {
                                  setAdminEditingMatch(m);
                                  const dtStr = matchDate ? matchDate.toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16);
                                  setAdminEditFormData({
                                    homeTeamName: m.homeTeamName || '',
                                    awayTeamName: m.awayTeamName || m.opponent || '',
                                    date: dtStr,
                                    location: m.location || '',
                                    matchNumber: m.matchNumber || '',
                                    fixtureRound: m.fixtureRound || '',
                                    groupName: m.groupName || '',
                                    stage: m.stage || '',
                                    status: m.status || 'scheduled'
                                  });
                                }}
                                className="p-2 hover:bg-stone-100 text-stone-600 hover:text-emerald-600 rounded-lg transition-colors"
                              >
                                <PenTool size={14} />
                              </button>
                              <button
                                type="button"
                                title="Delete Fixture"
                                onClick={() => setAdminDeletingMatch(m)}
                                className="p-2 hover:bg-red-50 text-stone-400 hover:text-red-600 rounded-lg transition-colors"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })()}

        {/* Modal: Quick Change Date & Time */}
        {quickDateMatch && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-xs">
            <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-stone-200 space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="text-base font-black uppercase text-stone-900 flex items-center gap-2">
                  <Calendar size={18} className="text-emerald-600" />
                  <span>Change Kickoff Date & Time</span>
                </h4>
                <button
                  type="button"
                  onClick={() => setQuickDateMatch(null)}
                  className="text-stone-400 hover:text-stone-600 p-1"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="bg-stone-50 p-3 rounded-xl border border-stone-200 text-xs">
                <div className="font-black text-stone-900">{quickDateMatch.homeTeamName} vs {quickDateMatch.awayTeamName || quickDateMatch.opponent}</div>
                <div className="text-[11px] text-stone-500">{quickDateMatch.leagueName} • {quickDateMatch.matchNumber || quickDateMatch.fixtureRound}</div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-stone-500 block mb-1">New Date & Time</label>
                <input
                  type="datetime-local"
                  value={quickDateVal}
                  onChange={e => setQuickDateVal(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-900"
                />
              </div>

              <div className="flex gap-2 pt-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setQuickDateMatch(null)}
                  className="flex-1 py-2.5 bg-stone-100 text-stone-700 text-xs font-bold rounded-xl hover:bg-stone-200"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveQuickDate}
                  disabled={isSavingQuickDate}
                  className="flex-1 py-2.5 bg-emerald-600 text-white text-xs font-black uppercase rounded-xl hover:bg-emerald-700 flex items-center justify-center gap-1.5 shadow-sm"
                >
                  {isSavingQuickDate ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                  <span>Save Date</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Quick Change Stadium */}
        {quickStadiumMatch && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-xs">
            <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-stone-200 space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="text-base font-black uppercase text-stone-900 flex items-center gap-2">
                  <MapPin size={18} className="text-emerald-600" />
                  <span>Change Match Stadium / Venue</span>
                </h4>
                <button
                  type="button"
                  onClick={() => setQuickStadiumMatch(null)}
                  className="text-stone-400 hover:text-stone-600 p-1"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="bg-stone-50 p-3 rounded-xl border border-stone-200 text-xs">
                <div className="font-black text-stone-900">{quickStadiumMatch.homeTeamName} vs {quickStadiumMatch.awayTeamName || quickStadiumMatch.opponent}</div>
                <div className="text-[11px] text-stone-500">{quickStadiumMatch.leagueName} • {quickStadiumMatch.matchNumber || quickStadiumMatch.fixtureRound}</div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-stone-500 block mb-1">Stadium / Venue Name</label>
                <input
                  type="text"
                  placeholder="e.g. Main Arena Pitch 1"
                  value={quickStadiumVal}
                  onChange={e => setQuickStadiumVal(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-900"
                  autoFocus
                />
              </div>

              <div className="flex gap-2 pt-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setQuickStadiumMatch(null)}
                  className="flex-1 py-2.5 bg-stone-100 text-stone-700 text-xs font-bold rounded-xl hover:bg-stone-200"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveQuickStadium}
                  disabled={isSavingQuickStadium || !quickStadiumVal.trim()}
                  className="flex-1 py-2.5 bg-emerald-600 text-white text-xs font-black uppercase rounded-xl hover:bg-emerald-700 flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50"
                >
                  {isSavingQuickStadium ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                  <span>Save Stadium</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Full Edit Match */}
        {adminEditingMatch && adminEditFormData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-xs">
            <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-stone-200 space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="text-base font-black uppercase text-stone-900 flex items-center gap-2">
                  <PenTool size={18} className="text-emerald-600" />
                  <span>Edit Fixture Details</span>
                </h4>
                <button
                  type="button"
                  onClick={() => setAdminEditingMatch(null)}
                  className="text-stone-400 hover:text-stone-600 p-1"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveAdminEdit} className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold uppercase text-stone-500 block mb-1">Home Team</label>
                    <input
                      type="text"
                      required
                      value={adminEditFormData.homeTeamName}
                      onChange={e => setAdminEditFormData({ ...adminEditFormData, homeTeamName: e.target.value })}
                      className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl font-bold text-stone-900"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-stone-500 block mb-1">Away Team</label>
                    <input
                      type="text"
                      required
                      value={adminEditFormData.awayTeamName}
                      onChange={e => setAdminEditFormData({ ...adminEditFormData, awayTeamName: e.target.value })}
                      className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl font-bold text-stone-900"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold uppercase text-stone-500 block mb-1">Date & Time</label>
                    <input
                      type="datetime-local"
                      required
                      value={adminEditFormData.date}
                      onChange={e => setAdminEditFormData({ ...adminEditFormData, date: e.target.value })}
                      className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl font-bold text-stone-900"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-stone-500 block mb-1">Stadium / Venue</label>
                    <input
                      type="text"
                      required
                      value={adminEditFormData.location}
                      onChange={e => setAdminEditFormData({ ...adminEditFormData, location: e.target.value })}
                      className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl font-bold text-stone-900"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] font-bold uppercase text-stone-500 block mb-1">Round / Stage</label>
                    <input
                      type="text"
                      value={adminEditFormData.fixtureRound}
                      onChange={e => setAdminEditFormData({ ...adminEditFormData, fixtureRound: e.target.value })}
                      className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl font-bold text-stone-900"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-stone-500 block mb-1">Group (Optional)</label>
                    <input
                      type="text"
                      value={adminEditFormData.groupName}
                      onChange={e => setAdminEditFormData({ ...adminEditFormData, groupName: e.target.value })}
                      className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl font-bold text-stone-900"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-stone-500 block mb-1">Match Number</label>
                    <input
                      type="text"
                      value={adminEditFormData.matchNumber}
                      onChange={e => setAdminEditFormData({ ...adminEditFormData, matchNumber: e.target.value })}
                      className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl font-bold text-stone-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase text-stone-500 block mb-1">Status</label>
                  <select
                    value={adminEditFormData.status}
                    onChange={e => setAdminEditFormData({ ...adminEditFormData, status: e.target.value })}
                    className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl font-bold text-stone-900"
                  >
                    <option value="scheduled">Scheduled</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                <div className="flex gap-2 pt-3 border-t border-stone-100">
                  <button
                    type="button"
                    onClick={() => setAdminEditingMatch(null)}
                    className="flex-1 py-2.5 bg-stone-100 text-stone-700 font-bold rounded-xl hover:bg-stone-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingAdminEdit}
                    className="flex-1 py-2.5 bg-emerald-600 text-white font-black uppercase rounded-xl hover:bg-emerald-700 flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    {isSavingAdminEdit ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                    <span>Save Fixture</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Add New Custom Fixture */}
        {isAddingAdminFixture && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-xs">
            <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-stone-200 space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="text-base font-black uppercase text-stone-900 flex items-center gap-2">
                  <Plus size={18} className="text-emerald-600" />
                  <span>Create Custom Fixture</span>
                </h4>
                <button
                  type="button"
                  onClick={() => setIsAddingAdminFixture(false)}
                  className="text-stone-400 hover:text-stone-600 p-1"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveNewAdminFixture} className="space-y-3 text-xs">
                <div>
                  <label className="text-[10px] font-bold uppercase text-stone-500 block mb-1">League / Competition</label>
                  <select
                    value={newAdminFixture.leagueId}
                    onChange={e => {
                      const leg = leagues.find(l => l.id === e.target.value);
                      setNewAdminFixture({
                        ...newAdminFixture,
                        leagueId: e.target.value,
                        leagueName: leg ? leg.name : 'League Match'
                      });
                    }}
                    className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl font-bold text-stone-900"
                  >
                    {leagues.map(l => (
                      <option key={l.id} value={l.id}>
                        {l.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold uppercase text-stone-500 block mb-1">Home Team</label>
                    <input
                      type="text"
                      placeholder="e.g. Red Rovers"
                      required
                      value={newAdminFixture.homeTeamName}
                      onChange={e => setNewAdminFixture({ ...newAdminFixture, homeTeamName: e.target.value })}
                      className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl font-bold text-stone-900"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-stone-500 block mb-1">Away Team</label>
                    <input
                      type="text"
                      placeholder="e.g. Blue Dragons"
                      required
                      value={newAdminFixture.awayTeamName}
                      onChange={e => setNewAdminFixture({ ...newAdminFixture, awayTeamName: e.target.value })}
                      className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl font-bold text-stone-900"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold uppercase text-stone-500 block mb-1">Kickoff Date & Time</label>
                    <input
                      type="datetime-local"
                      required
                      value={newAdminFixture.date}
                      onChange={e => setNewAdminFixture({ ...newAdminFixture, date: e.target.value })}
                      className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl font-bold text-stone-900"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-stone-500 block mb-1">Stadium / Venue</label>
                    <input
                      type="text"
                      placeholder="e.g. City Arena"
                      required
                      value={newAdminFixture.location}
                      onChange={e => setNewAdminFixture({ ...newAdminFixture, location: e.target.value })}
                      className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl font-bold text-stone-900"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] font-bold uppercase text-stone-500 block mb-1">Round / Stage</label>
                    <input
                      type="text"
                      placeholder="e.g. Round 1"
                      value={newAdminFixture.fixtureRound}
                      onChange={e => setNewAdminFixture({ ...newAdminFixture, fixtureRound: e.target.value })}
                      className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl font-bold text-stone-900"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-stone-500 block mb-1">Group (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. Group A"
                      value={newAdminFixture.groupName}
                      onChange={e => setNewAdminFixture({ ...newAdminFixture, groupName: e.target.value })}
                      className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl font-bold text-stone-900"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-stone-500 block mb-1">Match Number</label>
                    <input
                      type="text"
                      placeholder="e.g. Match #1"
                      value={newAdminFixture.matchNumber}
                      onChange={e => setNewAdminFixture({ ...newAdminFixture, matchNumber: e.target.value })}
                      className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl font-bold text-stone-900"
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-3 border-t border-stone-100">
                  <button
                    type="button"
                    onClick={() => setIsAddingAdminFixture(false)}
                    className="flex-1 py-2.5 bg-stone-100 text-stone-700 font-bold rounded-xl hover:bg-stone-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingNewAdminFixture}
                    className="flex-1 py-2.5 bg-emerald-600 text-white font-black uppercase rounded-xl hover:bg-emerald-700 flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    {isSavingNewAdminFixture ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                    <span>Save New Fixture</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Bulk Set Stadium for Saved Fixtures */}
        {bulkSavedStadiumModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-xs">
            <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-stone-200 space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="text-base font-black uppercase text-stone-900 flex items-center gap-2">
                  <MapPin size={18} className="text-emerald-600" />
                  <span>Bulk Change Stadium</span>
                </h4>
                <button
                  type="button"
                  onClick={() => setBulkSavedStadiumModal(false)}
                  className="text-stone-400 hover:text-stone-600 p-1"
                >
                  <X size={18} />
                </button>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-stone-500 block mb-1">Target League</label>
                <select
                  value={bulkSavedStadiumLeagueId}
                  onChange={e => setBulkSavedStadiumLeagueId(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-900"
                >
                  <option value="all">All Leagues ({matches.length} matches)</option>
                  {leagues.map(l => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-stone-500 block mb-1">New Stadium / Venue</label>
                <input
                  type="text"
                  placeholder="e.g. National Stadium Pitch 1"
                  value={bulkSavedStadiumVal}
                  onChange={e => setBulkSavedStadiumVal(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-900"
                  autoFocus
                />
              </div>

              <div className="flex gap-2 pt-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setBulkSavedStadiumModal(false)}
                  className="flex-1 py-2.5 bg-stone-100 text-stone-700 text-xs font-bold rounded-xl hover:bg-stone-200"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleApplyBulkSavedStadium}
                  disabled={isApplyingBulkStadium || !bulkSavedStadiumVal.trim()}
                  className="flex-1 py-2.5 bg-emerald-600 text-white text-xs font-black uppercase rounded-xl hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {isApplyingBulkStadium ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                  <span>Apply Stadium</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Bulk Shift Dates for Saved Fixtures */}
        {bulkSavedShiftModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-xs">
            <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-stone-200 space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="text-base font-black uppercase text-stone-900 flex items-center gap-2">
                  <Calendar size={18} className="text-emerald-600" />
                  <span>Bulk Shift Match Dates</span>
                </h4>
                <button
                  type="button"
                  onClick={() => setBulkSavedShiftModal(false)}
                  className="text-stone-400 hover:text-stone-600 p-1"
                >
                  <X size={18} />
                </button>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-stone-500 block mb-1">Target League</label>
                <select
                  value={bulkSavedShiftLeagueId}
                  onChange={e => setBulkSavedShiftLeagueId(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-900"
                >
                  <option value="all">All Leagues ({matches.length} matches)</option>
                  {leagues.map(l => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-stone-500 block mb-1">Shift by Days (+ / -)</label>
                <input
                  type="number"
                  value={bulkSavedShiftDays}
                  onChange={e => setBulkSavedShiftDays(parseInt(e.target.value) || 0)}
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-900"
                  autoFocus
                />
                <span className="text-[10px] text-stone-400 block mt-1">
                  Positive values delay fixtures (e.g. +7 moves all by 1 week); negative values advance fixtures.
                </span>
              </div>

              <div className="flex gap-2 pt-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setBulkSavedShiftModal(false)}
                  className="flex-1 py-2.5 bg-stone-100 text-stone-700 text-xs font-bold rounded-xl hover:bg-stone-200"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleApplyBulkSavedShift}
                  disabled={isApplyingBulkShift}
                  className="flex-1 py-2.5 bg-emerald-600 text-white text-xs font-black uppercase rounded-xl hover:bg-emerald-700 flex items-center justify-center gap-1.5"
                >
                  {isApplyingBulkShift ? <Loader2 size={14} className="animate-spin" /> : <Calendar size={14} />}
                  <span>Shift Dates</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Confirm Delete Admin Match */}
        {adminDeletingMatch && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-xs">
            <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-stone-200 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                  <Trash2 size={20} />
                </div>
                <div>
                  <h4 className="text-base font-black uppercase text-stone-900">
                    Delete Fixture?
                  </h4>
                  <p className="text-xs text-stone-500 mt-0.5">
                    This fixture will be permanently removed from the schedule.
                  </p>
                </div>
              </div>

              <div className="bg-stone-50 p-3 rounded-xl border border-stone-200 text-xs space-y-1">
                <div className="font-bold text-stone-900">
                  {adminDeletingMatch.homeTeamName} vs {adminDeletingMatch.awayTeamName || adminDeletingMatch.opponent}
                </div>
                <div className="text-[11px] text-stone-500">
                  {adminDeletingMatch.leagueName} • {adminDeletingMatch.matchNumber || adminDeletingMatch.fixtureRound}
                </div>
              </div>

              <div className="flex gap-2 pt-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setAdminDeletingMatch(null)}
                  className="flex-1 py-2.5 bg-stone-100 text-stone-700 text-xs font-bold rounded-xl hover:bg-stone-200"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteAdminMatch}
                  disabled={isDeletingAdminMatch}
                  className="flex-1 py-2.5 bg-red-600 text-white text-xs font-black uppercase rounded-xl hover:bg-red-700 flex items-center justify-center gap-1.5 shadow-sm"
                >
                  {isDeletingAdminMatch ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  <span>Delete Match</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Team Management Section */}
      <section className="space-y-6">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-4xl font-black tracking-tight uppercase italic mb-1">Team Management</h2>
            <p className="text-stone-500 font-medium">Create and manage club teams</p>
          </div>
          <button 
            onClick={() => setIsAddingTeam(true)}
            className="bg-emerald-600 text-white p-3 rounded-xl shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition-colors"
          >
            <Plus size={24} />
          </button>
        </div>

        <AnimatePresence>
          {isAddingTeam && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <form onSubmit={handleAddTeam} className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-4">
                <h3 className="font-bold text-lg">Add New Team</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input 
                    placeholder="Team Name (e.g. U14 Boys)"
                    className="w-full px-4 py-3 rounded-xl bg-stone-50 border border-stone-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    value={newTeam.name}
                    onChange={e => setNewTeam({...newTeam, name: e.target.value})}
                    required
                  />
                  <input 
                    placeholder="Description"
                    className="w-full px-4 py-3 rounded-xl bg-stone-50 border border-stone-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    value={newTeam.description}
                    onChange={e => setNewTeam({...newTeam, description: e.target.value})}
                  />
                </div>
                <div className="flex gap-3 justify-end">
                  <button type="button" onClick={() => setIsAddingTeam(false)} className="px-6 py-2 text-stone-500 font-bold uppercase text-xs tracking-widest">Cancel</button>
                  <button type="submit" className="px-6 py-2 bg-stone-900 text-white rounded-lg font-bold uppercase text-xs tracking-widest hover:bg-stone-800 transition-colors">Create Team</button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {teams.map(team => (
            <div key={team.id} className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
                  <Building2 size={24} />
                </div>
                <button 
                  onClick={async () => {
                    if (confirm(`Delete team "${team.name}"? All associated data will remain but be orphaned.`)) {
                      await deleteDoc(doc(db, 'teams', team.id));
                    }
                  }}
                  className="text-stone-300 hover:text-red-500 transition-colors"
                >
                  <Trash2 size={18} />
                </button>
              </div>
              <h3 className="font-bold text-xl mb-1">{team.name}</h3>
              <p className="text-stone-500 text-sm mb-4">{team.description || 'No description'}</p>
              <div className="flex items-center gap-2 text-xs font-bold text-stone-400 uppercase tracking-widest">
                <Users size={14} />
                {team.coachIds?.length || 0} Coaches Assigned
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-6">
        <div>
          <h2 className="text-4xl font-black tracking-tight uppercase italic mb-1">User Management</h2>
          <p className="text-stone-500 font-medium">Assign roles and teams to users</p>
        </div>

        <div className="bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-200">
                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-stone-400">User</th>
                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-stone-400">Role</th>
                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-stone-400">Assigned Teams</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.uid} className="border-b border-stone-100 last:border-0 hover:bg-stone-50/50 transition-colors">
                  <td className="p-4">
                    <p className="font-bold text-stone-900">{u.displayName}</p>
                    <p className="text-xs text-stone-500">{u.email}</p>
                  </td>
                  <td className="p-4">
                    <select 
                      value={u.role} 
                      onChange={(e) => handleUpdateUserRole(u.uid, e.target.value as any)}
                      className="bg-stone-100 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    >
                      <option value="admin">Admin</option>
                      <option value="coach">Coach</option>
                      <option value="data_user">Data User</option>
                    </select>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-wrap gap-2">
                      {teams.map(team => {
                        const isAssigned = (u.teamIds || []).includes(team.id);
                        return (
                          <button
                            key={team.id}
                            onClick={() => handleToggleTeamForUser(u.uid, team.id, u.teamIds || [])}
                            className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${isAssigned ? 'bg-emerald-600 text-white' : 'bg-stone-100 text-stone-400 hover:bg-stone-200'}`}
                          >
                            {team.name}
                          </button>
                        );
                      })}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </motion.div>
  );
}
