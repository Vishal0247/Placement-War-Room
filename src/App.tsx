import { useEffect, useState, type ChangeEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldAlert, 
  Target, 
  Terminal, 
  Activity, 
  LogOut,
  Brain,
  Crosshair,
  TrendingUp,
  Cpu,
  Upload,
  FileText,
  CheckCircle2,
  Clock,
  Zap,
  ChevronRight,
  AlertTriangle,
  Sparkles,
  Building2,
  Briefcase,
  Code2,
  GraduationCap,
  ArrowRight,
  Pencil
} from 'lucide-react';

interface User {
  uid: string;
  displayName?: string | null;
}

interface Mission {
  id: number;
  title: string;
  type: string;
  description: string;
  level: number;
  status: string;
}

interface ResumeResult {
  atsScore: number;
  feedback: string[];
}

interface UserProfile {
  targetCompanies: string;
  preferredRole: string;
  skills: string;
  branch: string;
  name: string;
}

const POPULAR_COMPANIES = [
  'Google', 'Amazon', 'Microsoft', 'Meta', 'Apple',
  'Goldman Sachs', 'JP Morgan', 'Flipkart', 'Walmart',
  'Adobe', 'Oracle', 'Infosys', 'TCS', 'Wipro',
];

const POPULAR_ROLES = [
  'SDE-1', 'SDE-2', 'Frontend Engineer', 'Backend Engineer',
  'Full Stack Developer', 'Data Scientist', 'ML Engineer',
  'DevOps Engineer', 'Cloud Engineer', 'Product Manager',
];

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  
  // Profile / onboarding
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [savingProfile, setSavingProfile] = useState(false);

  // Onboarding form fields
  const [formCompany, setFormCompany] = useState('');
  const [formRole, setFormRole] = useState('');
  const [formSkills, setFormSkills] = useState('');
  const [formBranch, setFormBranch] = useState('');
  const [formName, setFormName] = useState('');
  
  // Data states
  const [missions, setMissions] = useState<Mission[]>([]);
  const [readinessScore, setReadinessScore] = useState(0);
  const [readinessReason, setReadinessReason] = useState('');
  const [generating, setGenerating] = useState(false);
  
  // Custom Mission Modal
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customTitle, setCustomTitle] = useState('');
  const [customDesc, setCustomDesc] = useState('');
  const [customType, setCustomType] = useState('CUSTOM');

  // Skill matrix states
  const [skillMatrix, setSkillMatrix] = useState<{ requiredSkills: string[], acquiredSkills: string[], missingSkills: string[] } | null>(null);
  const [loadingSkills, setLoadingSkills] = useState(false);

  // Resume states
  const [resumeResult, setResumeResult] = useState<ResumeResult | null>(null);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [extractingSkills, setExtractingSkills] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      const storedToken = localStorage.getItem('pwr_token');
      if (storedToken) {
        const currentUser = { uid: storedToken, displayName: storedToken };
        setUser(currentUser);
        setSyncing(true);
        try {
          const token = storedToken;
          const syncRes = await fetch('/api/auth/sync', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          const userData = await syncRes.json();
          
          if (userData.targetCompanies && userData.preferredRole) {
            setProfile({
              targetCompanies: userData.targetCompanies,
              preferredRole: userData.preferredRole,
              skills: userData.skills || '',
              branch: userData.branch || '',
              name: userData.name || currentUser.displayName || '',
            });
            setShowOnboarding(false);
          } else {
            setShowOnboarding(true);
            setFormName(currentUser.displayName || '');
          }

          if (userData.readinessScore) {
            try {
              const parsed = JSON.parse(userData.readinessScore);
              setReadinessScore(parsed.score || parsed.overall || 0);
              setReadinessReason(parsed.reason || '');
            } catch (e) {
              console.error("Failed to parse readiness score");
            }
          }
          
          if (userData.skillMatrix) {
            try {
              setSkillMatrix(JSON.parse(userData.skillMatrix));
            } catch (e) {}
          }
          
          if (userData.resumeResult) {
            try {
              setResumeResult(JSON.parse(userData.resumeResult));
            } catch (e) {}
          }
          
          fetchMissions(token);
        } catch (error) {
          console.error("Failed to sync user:", error);
          setShowOnboarding(true);
        } finally {
          setSyncing(false);
        }
      }
      setLoading(false);
    };
    loadUser();
  }, []);

  const fetchMissions = async (token: string) => {
    try {
      const res = await fetch('/api/missions', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && data.missions) {
        setMissions(data.missions);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const saveProfile = async () => {
    if (!user || !formCompany || !formRole) return;
    setSavingProfile(true);
    try {
      const token = localStorage.getItem('pwr_token') || '';
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: formName,
          targetCompanies: formCompany,
          preferredRole: formRole,
          skills: formSkills,
          branch: formBranch,
        })
      });
      const data = await res.json();
      if (data.success) {
        setProfile({
          targetCompanies: formCompany,
          preferredRole: formRole,
          skills: formSkills,
          branch: formBranch,
          name: formName,
        });
        setShowOnboarding(false);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSavingProfile(false);
    }
  };

  const generateRoadmap = async () => {
    if (!user) return;
    setGenerating(true);
    try {
      const token = localStorage.getItem('pwr_token') || '';
      const res = await fetch('/api/agents/strategy', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ force: true })
      });
      const data = await res.json();
      if (data.success) {
        if (data.missions) setMissions(data.missions);
        if (data.skillMatrix) setSkillMatrix(data.skillMatrix);
        if (data.readiness) {
          setReadinessScore(data.readiness.score);
          setReadinessReason(data.readiness.reason);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setGenerating(false);
    }
  };

  const addCustomMission = async () => {
    if (!user || !customTitle) return;
    try {
      const token = localStorage.getItem('pwr_token') || '';
      const res = await fetch('/api/missions/custom', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ title: customTitle, description: customDesc, type: customType })
      });
      const data = await res.json();
      if (data.success && data.mission) {
        setMissions(prev => [...prev, data.mission]);
        setShowCustomModal(false);
        setCustomTitle('');
        setCustomDesc('');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const toggleMission = async (missionId: number, currentStatus: string) => {
    if (!user) return;
    const newStatus = currentStatus === 'COMPLETED' ? 'PENDING' : 'COMPLETED';
    
    setMissions(prev => prev.map(m => m.id === missionId ? { ...m, status: newStatus } : m));
    
    try {
      const token = localStorage.getItem('pwr_token') || '';
      await fetch(`/api/missions/${missionId}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });
    } catch (e) {
      console.error(e);
      setMissions(prev => prev.map(m => m.id === missionId ? { ...m, status: currentStatus } : m));
    }
  };



  const handleResumeUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploadingResume(true);
    try {
      const token = localStorage.getItem('pwr_token') || '';
      const formData = new FormData();
      formData.append('resume', file);
      const res = await fetch('/api/agents/resume', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        setResumeResult({ atsScore: data.atsScore, feedback: data.feedback });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setUploadingResume(false);
    }
  };


  const handleExtractSkills = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setExtractingSkills(true);
    try {
      const token = localStorage.getItem('pwr_token') || '';
      const formData = new FormData();
      formData.append('resume', file);
      const res = await fetch('/api/extract-skills', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      const data = await res.json();
      
      if (!res.ok) {
        alert(data.error || "Failed to extract skills. Please try again.");
        return;
      }
      
      if (data.success && data.skills) {
        setFormSkills(data.skills);
        if (profile) {
          setProfile({ ...profile, skills: data.skills });
        }
      }
    } catch (e) {
      console.error(e);
      alert("Network error: Failed to connect to server.");
    } finally {
      setExtractingSkills(false);
      e.target.value = '';
    }
  };

  const [loginUsername, setLoginUsername] = useState('');
  
  const handleLogin = async () => {
    if (!loginUsername.trim()) return;
    localStorage.setItem('pwr_token', loginUsername.trim());
    window.location.reload();
  };

  const handleGuestLogin = () => {
    localStorage.setItem('pwr_token', 'guest_123');
    window.location.reload();
  };

  const handleLogout = () => {
    localStorage.removeItem('pwr_token');
    window.location.reload();
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      'DSA': 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
      'OS': 'text-amber-400 bg-amber-500/10 border-amber-500/30',
      'DBMS': 'text-violet-400 bg-violet-500/10 border-violet-500/30',
      'RESUME': 'text-rose-400 bg-rose-500/10 border-rose-500/30',
      'SYSTEM_DESIGN': 'text-sky-400 bg-sky-500/10 border-sky-500/30',
      'MOCK': 'text-orange-400 bg-orange-500/10 border-orange-500/30',
    };
    return colors[type] || 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-pulse flex items-center space-x-2 text-cyan-400">
          <Terminal size={24} />
          <span className="font-mono text-xl tracking-widest">INITIALIZING...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-300 flex items-center justify-center p-4 font-sans relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-cyan-900/20 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-1/4 right-1/4 w-[400px] h-[400px] bg-fuchsia-900/10 rounded-full blur-[100px] pointer-events-none" />
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-slate-900/50 backdrop-blur-xl border border-slate-800 p-8 rounded-2xl shadow-2xl relative z-10"
        >
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-cyan-500/10 rounded-2xl flex items-center justify-center border border-cyan-500/30">
              <ShieldAlert className="text-cyan-400 w-8 h-8" />
            </div>
          </div>
          
          <h1 className="text-3xl font-bold text-center text-white mb-2 tracking-tight" style={{ fontFamily: 'Inter, sans-serif' }}>Placement War Room</h1>
          <p className="text-slate-400 text-sm max-w-sm text-center leading-relaxed">
            Your AI-powered command center for placement preparation.
          </p>
          <div className="flex flex-col gap-4 mt-6">
            <input
              type="text"
              placeholder="Enter your username..."
              value={loginUsername}
              onChange={(e) => setLoginUsername(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              className="w-full bg-slate-900/50 border border-slate-700 focus:border-cyan-500 rounded-xl px-6 py-4 text-white placeholder-slate-500 outline-none transition-colors text-sm text-center"
              autoFocus
            />
            <button 
              onClick={handleLogin}
              className="group relative px-8 py-4 bg-cyan-500/10 border border-cyan-500/50 hover:bg-cyan-500/20 text-cyan-400 rounded-xl overflow-hidden transition-all shadow-[0_0_20px_rgba(6,182,212,0.15)] hover:shadow-[0_0_30px_rgba(6,182,212,0.3)] w-full"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-400/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
              <span className="relative font-semibold tracking-wide text-sm flex items-center justify-center space-x-3">
                <Terminal className="w-5 h-5 group-hover:text-cyan-300 transition-colors" />
                <span>Enter War Room</span>
              </span>
            </button>
          </div>
          
          <div className="mt-10 text-[10px] text-slate-600 flex items-center justify-center space-x-2">
            <Activity className="w-3 h-3 text-cyan-500/50" />
            <span>Powered by Gemini AI • Built with React & Node.js</span>
          </div>
        </motion.div>
      </div>
    );
  }

  if (showOnboarding && !profile) {
    const steps = [
      { icon: Building2, title: "What's your dream company?", subtitle: "Tell us where you want to land" },
      { icon: Briefcase, title: "What role are you targeting?", subtitle: "This helps us generate the right kind of prep missions" },
      { icon: Code2, title: "What do you already know?", subtitle: "Your current skills help us find the gaps" },
    ];

    const currentStep = steps[onboardingStep];
    const canProceed = onboardingStep === 0 ? formCompany.length > 0 :
                       onboardingStep === 1 ? formRole.length > 0 :
                       formSkills.length > 0;

    return (
      <div className="min-h-screen bg-slate-950 text-slate-300 flex items-center justify-center p-4 font-sans relative overflow-hidden" style={{ fontFamily: 'Inter, sans-serif' }}>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-cyan-900/15 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-1/4 left-1/4 w-[500px] h-[500px] bg-fuchsia-900/10 rounded-full blur-[100px] pointer-events-none" />
        
        <motion.div 
          key={onboardingStep}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          transition={{ duration: 0.3 }}
          className="max-w-lg w-full bg-slate-900/60 backdrop-blur-xl border border-slate-800 p-8 rounded-2xl shadow-2xl relative z-10"
        >
          <div className="flex items-center gap-2 mb-8">
            {steps.map((_, i) => (
              <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300 ${i <= onboardingStep ? 'bg-cyan-500' : 'bg-slate-700'}`} />
            ))}
          </div>

          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-cyan-500/10 rounded-xl flex items-center justify-center border border-cyan-500/30">
              <currentStep.icon className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{currentStep.title}</h2>
              <p className="text-xs text-slate-500">{currentStep.subtitle}</p>
            </div>
          </div>

          <div className="mt-6">
            {onboardingStep === 0 && (
              <div className="space-y-4">
                <input type="text" placeholder="e.g. Google, Amazon..." value={formCompany} onChange={(e) => setFormCompany(e.target.value)} className="w-full bg-slate-800/50 border border-slate-700 focus:border-cyan-500 rounded-xl px-4 py-3.5 text-white placeholder-slate-500 outline-none transition-colors text-sm" autoFocus />
                <div className="flex flex-wrap gap-2">
                  {POPULAR_COMPANIES.map((c) => (
                    <button key={c} onClick={() => setFormCompany(c)} className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${formCompany === c ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400' : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-500'}`}>{c}</button>
                  ))}
                </div>
              </div>
            )}

            {onboardingStep === 1 && (
              <div className="space-y-4">
                <input type="text" placeholder="e.g. SDE-1, Frontend Engineer..." value={formRole} onChange={(e) => setFormRole(e.target.value)} className="w-full bg-slate-800/50 border border-slate-700 focus:border-cyan-500 rounded-xl px-4 py-3.5 text-white placeholder-slate-500 outline-none transition-colors text-sm" autoFocus />
                <div className="flex flex-wrap gap-2">
                  {POPULAR_ROLES.map((r) => (
                    <button key={r} onClick={() => setFormRole(r)} className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${formRole === r ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400' : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-500'}`}>{r}</button>
                  ))}
                </div>
              </div>
            )}

            {onboardingStep === 2 && (
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] text-slate-500 uppercase tracking-widest mb-1.5 block" style={{ fontFamily: 'JetBrains Mono, monospace' }}>Your Skills</label>
                  <div className="relative">
                    <input type="text" placeholder="e.g. Java, React, SQL..." value={formSkills} onChange={(e) => setFormSkills(e.target.value)} className="w-full bg-slate-800/50 border border-slate-700 focus:border-cyan-500 rounded-xl pl-4 pr-32 py-3.5 text-white placeholder-slate-500 outline-none transition-colors text-sm" autoFocus />
                    <label className={`absolute right-2 top-2 bottom-2 px-3 flex items-center justify-center gap-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${extractingSkills ? 'bg-cyan-500/20 text-cyan-400 cursor-wait' : 'bg-slate-700/50 hover:bg-slate-700 text-slate-300'}`}>
                      {extractingSkills ? <Activity className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                      <span>{extractingSkills ? 'Extracting...' : 'Upload CV'}</span>
                      <input type="file" accept=".pdf" className="hidden" onChange={handleExtractSkills} disabled={extractingSkills} />
                    </label>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 uppercase tracking-widest mb-1.5 block" style={{ fontFamily: 'JetBrains Mono, monospace' }}>Branch (optional)</label>
                  <input type="text" placeholder="e.g. Computer Science..." value={formBranch} onChange={(e) => setFormBranch(e.target.value)} className="w-full bg-slate-800/50 border border-slate-700 focus:border-cyan-500 rounded-xl px-4 py-3.5 text-white placeholder-slate-500 outline-none transition-colors text-sm" />
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between mt-8">
            {onboardingStep > 0 ? <button onClick={() => setOnboardingStep(s => s - 1)} className="text-sm text-slate-400 hover:text-slate-300 transition-colors">← Back</button> : <div />}
            {onboardingStep < 2 ? (
              <button onClick={() => setOnboardingStep(s => s + 1)} disabled={!canProceed} className="flex items-center gap-2 px-6 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-sm rounded-xl transition-colors disabled:opacity-30 disabled:cursor-not-allowed">Next <ArrowRight className="w-4 h-4" /></button>
            ) : (
              <button onClick={saveProfile} disabled={!canProceed || savingProfile} className="flex items-center gap-2 px-6 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-sm rounded-xl transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                {savingProfile ? <><Activity className="w-4 h-4 animate-spin" /> Setting up...</> : <><Sparkles className="w-4 h-4" /> Start Preparing</>}
              </button>
            )}
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050507] text-slate-200 flex flex-col font-sans" style={{ fontFamily: 'Inter, sans-serif' }}>
      <nav className="h-16 border-b border-cyan-500/30 bg-[#0a0a14] flex items-center justify-between px-6 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto w-full flex justify-between items-center h-full">
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 bg-cyan-500 rounded-sm flex items-center justify-center rotate-45"><div className="-rotate-45 font-bold text-black text-xs">PWR</div></div>
            <h1 className="text-xl font-black tracking-tighter text-cyan-400 hidden sm:block">PLACEMENT WAR ROOM</h1>
          </div>
          <button onClick={handleLogout} className="w-10 h-10 rounded-full border border-cyan-500/50 p-0.5 flex items-center justify-center hover:bg-cyan-500/10 transition-colors"><LogOut className="w-4 h-4 text-cyan-400" /></button>
        </div>
      </nav>

      <main className="flex-1 p-6 lg:p-8 flex flex-col gap-6 bg-[radial-gradient(circle_at_50%_50%,_rgba(15,23,42,1)_0%,_rgba(5,5,7,1)_100%)]">
        <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            
            {/* Readiness Score Header — shows target company & role */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-[#0f172a]/50 border border-cyan-500/20 rounded-2xl p-6 relative overflow-hidden backdrop-blur-md"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full -mr-12 -mt-12" />
              
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] tracking-widest text-cyan-500 uppercase" style={{ fontFamily: 'JetBrains Mono, monospace' }}>Mission Objective</span>
                <button 
                  onClick={() => {
                    setFormCompany(profile?.targetCompanies || '');
                    setFormRole(profile?.preferredRole || '');
                    setFormSkills(profile?.skills || '');
                    setFormBranch(profile?.branch || '');
                    setFormName(profile?.name || '');
                    setOnboardingStep(0);
                    setShowOnboarding(true);
                    setProfile(null);
                  }}
                  className="text-[10px] text-slate-500 hover:text-cyan-400 transition-colors flex items-center gap-1"
                  style={{ fontFamily: 'JetBrains Mono, monospace' }}
                >
                  <Pencil className="w-3 h-3" /> Edit Goal
                </button>
              </div>
              <div className="flex items-end justify-between mt-2">
                <div>
                  <h3 className="text-3xl sm:text-4xl font-black text-white tracking-tighter">
                    {profile?.preferredRole || 'Interview Ready'}
                  </h3>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-sm text-slate-400 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-cyan-500" />
                      {profile?.targetCompanies || 'Set your target'}
                    </span>
                  </div>
                </div>
                <div className="text-right flex flex-col items-end">
                  <span className="text-[10px] text-slate-400 uppercase tracking-widest mb-1" style={{ fontFamily: 'JetBrains Mono, monospace' }}>Readiness</span>
                  <span className="text-4xl sm:text-5xl font-black text-white">{readinessScore}<span className="text-2xl text-cyan-500">%</span></span>
                </div>
              </div>
              
              {readinessReason && (
                <div className="mt-4 p-3 bg-cyan-950/30 border border-cyan-500/20 rounded-xl">
                  <p className="text-sm text-cyan-100/80 leading-relaxed flex items-start gap-2">
                    <Brain className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                    {readinessReason}
                  </p>
                </div>
              )}
              
              <div className="mt-6 h-2 bg-white/5 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${readinessScore}%` }}
                  transition={{ duration: 1, delay: 0.2 }}
                  className={`h-full shadow-[0_0_10px_rgba(6,182,212,0.8)] ${
                    readinessScore >= 80 ? 'bg-emerald-500' : readinessScore >= 50 ? 'bg-cyan-500' : 'bg-amber-500'
                  }`}
                />
              </div>
            </motion.div>

            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-black text-white flex items-center gap-2">
                  <Target className="text-cyan-400" />
                  Your Curriculum Roadmap
                </h2>
                <p className="text-sm text-slate-400 mt-1">Complete these missions sequentially to reach interview readiness.</p>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => setShowCustomModal(true)} className="px-5 py-2.5 rounded-xl text-sm font-bold border border-slate-700 hover:border-slate-500 hover:bg-slate-800 text-slate-300 transition-all flex items-center gap-2">
                  <Briefcase className="w-4 h-4" /> Add Manual Mission
                </button>
                <button onClick={generateRoadmap} disabled={generating} className="px-5 py-2.5 rounded-xl text-sm font-bold bg-cyan-500 hover:bg-cyan-400 text-cyan-950 transition-all flex items-center gap-2 disabled:opacity-50">
                  {generating ? <><Activity className="w-4 h-4 animate-spin" /> Generating...</> : <><Sparkles className="w-4 h-4" /> Generate Full Curriculum</>}
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {missions.length === 0 && !generating && (
                <div className="text-center py-12 border-2 border-dashed border-slate-800 rounded-2xl bg-slate-900/50">
                  <Target className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                  <h3 className="text-lg font-bold text-slate-300">No Roadmap Generated</h3>
                  <button onClick={generateRoadmap} className="mt-4 px-6 py-2 rounded-lg bg-cyan-500/10 text-cyan-400 text-sm font-semibold hover:bg-cyan-500/20 transition-colors">Generate Curriculum</button>
                </div>
              )}
              
              {missions.map((mission) => (
                <div key={mission.id} onClick={() => toggleMission(mission.id, mission.status)} className="group relative bg-[#0f172a] border border-slate-800 hover:border-cyan-500/50 rounded-2xl p-5 cursor-pointer transition-all hover:shadow-[0_0_20px_rgba(6,182,212,0.1)] overflow-hidden">
                  <div className={`absolute inset-0 opacity-10 transition-colors ${mission.status === 'COMPLETED' ? 'bg-emerald-500/50' : 'bg-transparent'}`} />
                  <div className="flex items-start space-x-4 z-10 w-full">
                    <div className={`w-6 h-6 shrink-0 rounded-full border-2 flex items-center justify-center transition-all mt-0.5 ${mission.status === 'COMPLETED' ? 'border-emerald-500 bg-emerald-500' : 'border-slate-600 group-hover:border-cyan-500'}`}>
                      {mission.status === 'COMPLETED' && <CheckCircle2 className="w-4 h-4 text-white" />}
                    </div>
                    <div className="flex flex-col flex-1 pr-16">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-400">LVL {mission.level}</span>
                        <span className="text-base font-bold text-slate-200">{mission.title}</span>
                      </div>
                      <span className="text-sm text-slate-400 mt-1.5 leading-relaxed">{mission.description}</span>
                    </div>
                  </div>
                  <span className={`absolute right-4 top-4 text-xs px-2.5 py-1 rounded border shadow-lg z-10 ${getTypeColor(mission.type)}`}>{mission.type}</span>
                </div>
              ))}
            </div>
            
            {/* Resume Analyzer */}
            <div className="flex flex-col gap-4">
              <h3 className="text-[11px] text-slate-500 uppercase tracking-widest flex items-center gap-2" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                <FileText className="w-3.5 h-3.5" /> Resume Analysis
              </h3>
              
              <div className="bg-black/40 border border-white/5 rounded-2xl p-6">
                {resumeResult ? (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-400">ATS Compatibility Score</span>
                      <span className={`text-3xl font-black ${
                        resumeResult.atsScore >= 80 ? 'text-emerald-400' : resumeResult.atsScore >= 50 ? 'text-amber-400' : 'text-rose-400'
                      }`}>{resumeResult.atsScore}<span className="text-lg text-slate-500">/100</span></span>
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${resumeResult.atsScore}%` }}
                        className={`h-full ${resumeResult.atsScore >= 80 ? 'bg-emerald-500' : resumeResult.atsScore >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`}
                      />
                    </div>
                    <div className="space-y-2 mt-4">
                      {resumeResult.feedback.map((item, i) => (
                        <div key={i} className="flex items-start gap-2 text-sm text-slate-300">
                          <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                    <label className="cursor-pointer text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 mt-2">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload new resume</span>
                      <input type="file" accept=".pdf" onChange={handleResumeUpload} className="hidden" />
                    </label>
                  </motion.div>
                ) : (
                  <label className="cursor-pointer flex flex-col items-center justify-center py-8 border-2 border-dashed border-slate-700 hover:border-cyan-500/50 rounded-xl transition-colors group">
                    <Upload className={`w-8 h-8 text-slate-600 group-hover:text-cyan-400 transition-colors ${uploadingResume ? 'animate-bounce' : ''}`} />
                    <span className="text-sm text-slate-500 mt-2 group-hover:text-slate-300 transition-colors">
                      {uploadingResume ? 'Analyzing your resume...' : 'Drop your resume PDF here'}
                    </span>
                    <span className="text-[10px] text-slate-600 mt-1">AI will analyze it for ATS compatibility</span>
                    <input type="file" accept=".pdf" onChange={handleResumeUpload} className="hidden" disabled={uploadingResume} />
                  </label>
                )}
              </div>
            </div>
            
          </div>

          <div className="space-y-6">
            {/* Profile Card */}
            {profile && (
              <div className="bg-[#0f172a]/50 border border-cyan-500/20 rounded-2xl p-5 backdrop-blur-md">
                <span className="text-[10px] tracking-widest text-cyan-500 uppercase" style={{ fontFamily: 'JetBrains Mono, monospace' }}>Your Target</span>
                <div className="mt-3 space-y-2.5">
                  <div className="flex items-center gap-2.5">
                    <Building2 className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span className="text-sm text-white font-semibold">{profile.targetCompanies}</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Briefcase className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span className="text-sm text-slate-300">{profile.preferredRole}</span>
                  </div>
                  {profile.skills && (
                    <div className="flex items-start gap-2.5">
                      <Code2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                      <div className="flex flex-wrap gap-1">
                        {profile.skills.split(',').map((s, i) => (
                          <span key={i} className="text-[10px] px-2 py-0.5 bg-cyan-500/10 text-cyan-400 rounded border border-cyan-500/20">{s.trim()}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {profile.branch && (
                    <div className="flex items-center gap-2.5">
                      <GraduationCap className="w-4 h-4 text-cyan-400 shrink-0" />
                      <span className="text-sm text-slate-400">{profile.branch}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Skill Matrix Sidebar */}
            <div className="bg-[#0f172a]/50 border border-fuchsia-500/20 rounded-2xl p-6 backdrop-blur-md relative overflow-hidden">
              <div className="flex items-center justify-between mb-6">
                <span className="text-[10px] tracking-widest text-fuchsia-400 uppercase" style={{ fontFamily: 'JetBrains Mono, monospace' }}>Skill Matrix</span>
                <div className="flex items-center gap-2">
                </div>
              </div>
              
              {skillMatrix ? (
                <div className="space-y-6">
                  {/* Progress Bar */}
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-slate-400">Skill Acquisition</span>
                      <span className="text-fuchsia-400">{Math.round((skillMatrix.acquiredSkills.length / Math.max(1, skillMatrix.requiredSkills.length)) * 100)}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-fuchsia-600 to-cyan-500 rounded-full" 
                        style={{ width: `${(skillMatrix.acquiredSkills.length / Math.max(1, skillMatrix.requiredSkills.length)) * 100}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-semibold text-emerald-400 mb-3 flex items-center gap-2 uppercase tracking-wider">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Acquired Skills
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {skillMatrix.acquiredSkills.length > 0 ? skillMatrix.acquiredSkills.map((skill, i) => (
                        <span key={i} className="px-2.5 py-1 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs shadow-sm">
                          {skill}
                        </span>
                      )) : <span className="text-xs text-slate-500">None detected from CV</span>}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-semibold text-rose-400 mb-3 flex items-center gap-2 uppercase tracking-wider">
                      <AlertTriangle className="w-3.5 h-3.5" /> Missing Requirements
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {skillMatrix.missingSkills.length > 0 ? skillMatrix.missingSkills.map((skill, i) => (
                        <span key={i} className="px-2.5 py-1 rounded bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs shadow-sm">
                          {skill}
                        </span>
                      )) : <span className="text-xs text-emerald-400">All required skills met!</span>}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6">
                  <Brain className="w-8 h-8 text-fuchsia-500/50 mx-auto mb-3" />
                  <p className="text-xs text-slate-400">Click "Generate Full Curriculum" to automatically map your acquired vs missing skills.</p>
                </div>
              )}
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#0f172a]/50 border border-white/5 rounded-xl p-4 text-center">
                <div className="text-2xl font-black text-white">{missions.filter(m => m.status === 'COMPLETED').length}</div>
                <div className="text-[10px] text-slate-500 uppercase tracking-wider mt-1" style={{ fontFamily: 'JetBrains Mono, monospace' }}>Completed</div>
              </div>
              <div className="bg-[#0f172a]/50 border border-white/5 rounded-xl p-4 text-center">
                <div className="text-2xl font-black text-white">{missions.filter(m => m.status !== 'COMPLETED').length}</div>
                <div className="text-[10px] text-slate-500 uppercase tracking-wider mt-1" style={{ fontFamily: 'JetBrains Mono, monospace' }}>Pending</div>
              </div>
            </div>

            {/* Activity Feed */}
            <div className="flex flex-col gap-4">
              <h3 className="text-[11px] text-slate-500 uppercase tracking-widest flex items-center gap-2" style={{ fontFamily: 'JetBrains Mono, monospace' }}>Activity</h3>
              <div className="bg-black/40 border border-white/5 rounded-2xl p-4 overflow-hidden flex flex-col gap-3">
                {(missions.length > 0 || skillMatrix || resumeResult) ? (
                  <div className="space-y-3">
                    {missions.length > 0 && (
                      <div className="flex items-start gap-3 text-xs">
                        <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full mt-1.5 shrink-0" />
                        <div>
                          <span className="text-slate-300">{missions.length} missions active</span>
                          <p className="text-slate-600 mt-0.5">{missions.filter(m => m.status === 'COMPLETED').length} completed</p>
                        </div>
                      </div>
                    )}
                    {skillMatrix && (
                      <div className="flex items-start gap-3 text-xs">
                        <div className="w-1.5 h-1.5 bg-fuchsia-500 rounded-full mt-1.5 shrink-0" />
                        <div>
                          <span className="text-slate-300">{skillMatrix.missingSkills.length} missing skills flagged</span>
                          <p className="text-slate-600 mt-0.5">Focus areas identified</p>
                        </div>
                      </div>
                    )}
                    {resumeResult && (
                      <div className="flex items-start gap-3 text-xs">
                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-1.5 shrink-0" />
                        <div>
                          <span className="text-slate-300">Resume analyzed — ATS {resumeResult.atsScore}%</span>
                          <p className="text-slate-600 mt-0.5">{resumeResult.feedback.length} suggestions</p>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center space-y-3 py-6 opacity-50">
                    <Brain className="w-8 h-8 text-slate-400" />
                    <span className="text-xs text-center" style={{ fontFamily: 'JetBrains Mono, monospace' }}>No activity yet.<br/>Generate missions to get started.</span>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-4 px-6">
        <div className="max-w-7xl mx-auto flex justify-between items-center text-[10px] text-slate-600">
          <span>Placement War Room</span>
          <span>Powered by Gemini AI</span>
        </div>
      </footer>
      {/* Custom Mission Modal */}
      <AnimatePresence>
        {showCustomModal && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-md w-full relative"
            >
              <h2 className="text-2xl font-black text-white mb-6">Add Custom Mission</h2>
              <div className="space-y-4 mb-8">
                <div>
                  <label className="text-xs text-slate-500 uppercase font-semibold mb-1 block">Mission Title</label>
                  <input type="text" value={customTitle} onChange={e => setCustomTitle(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-cyan-500 outline-none" placeholder="e.g. Master Dynamic Programming" />
                </div>
                <div>
                  <label className="text-xs text-slate-500 uppercase font-semibold mb-1 block">Description</label>
                  <textarea value={customDesc} onChange={e => setCustomDesc(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-cyan-500 outline-none resize-none h-24" placeholder="Specific details of what to accomplish..." />
                </div>
                <div>
                  <label className="text-xs text-slate-500 uppercase font-semibold mb-1 block">Type</label>
                  <select value={customType} onChange={e => setCustomType(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-cyan-500 outline-none">
                    <option value="DSA">DSA</option>
                    <option value="SYSTEM_DESIGN">System Design</option>
                    <option value="DBMS">DBMS</option>
                    <option value="OS">OS</option>
                    <option value="RESUME">Resume</option>
                    <option value="MOCK">Mock Interview</option>
                    <option value="CUSTOM">Custom</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-4">
                <button onClick={() => setShowCustomModal(false)} className="flex-1 py-3 rounded-xl font-bold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors">Cancel</button>
                <button onClick={addCustomMission} disabled={!customTitle} className="flex-1 py-3 rounded-xl font-bold text-cyan-950 bg-cyan-500 hover:bg-cyan-400 transition-colors disabled:opacity-50">Add Mission</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
