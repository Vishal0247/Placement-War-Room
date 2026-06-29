import { useEffect, useState } from 'react';
import { auth, googleAuthProvider } from './lib/firebase.ts';
import { signInWithPopup, User, onAuthStateChanged, signOut } from 'firebase/auth';
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
  Sparkles
} from 'lucide-react';

interface Mission {
  title: string;
  type: string;
  description: string;
  completed?: boolean;
}

interface SkillGap {
  missingSkills: string[];
}

interface ResumeResult {
  atsScore: number;
  feedback: string[];
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  
  // Data states
  const [missions, setMissions] = useState<Mission[]>([]);
  const [readinessScore, setReadinessScore] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [completedMissions, setCompletedMissions] = useState<Set<number>>(new Set());

  // Skill gap states
  const [skillGaps, setSkillGaps] = useState<string[]>([]);
  const [loadingSkills, setLoadingSkills] = useState(false);

  // Resume states
  const [resumeResult, setResumeResult] = useState<ResumeResult | null>(null);
  const [uploadingResume, setUploadingResume] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setSyncing(true);
        try {
          const token = await currentUser.getIdToken();
          const syncRes = await fetch('/api/auth/sync', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          const userData = await syncRes.json();
          if (userData.readinessScore) {
            setReadinessScore(JSON.parse(userData.readinessScore).overall || 0);
          }
        } catch (error) {
          console.error("Failed to sync user:", error);
        } finally {
          setSyncing(false);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Recalculate readiness from completed missions
  useEffect(() => {
    if (missions.length > 0) {
      const completed = completedMissions.size;
      const baseScore = Math.round((completed / missions.length) * 100);
      setReadinessScore(Math.min(baseScore + (skillGaps.length > 0 ? 10 : 0) + (resumeResult ? 15 : 0), 100));
    }
  }, [completedMissions, missions, skillGaps, resumeResult]);

  const generateMissions = async () => {
    if (!user) return;
    setGenerating(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/agents/strategy', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.success) {
        setMissions(data.missions);
        setCompletedMissions(new Set());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setGenerating(false);
    }
  };

  const fetchSkillGaps = async () => {
    if (!user) return;
    setLoadingSkills(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/agents/skill-gap', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.success && data.missingSkills) {
        setSkillGaps(data.missingSkills);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingSkills(false);
    }
  };

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploadingResume(true);
    try {
      const token = await user.getIdToken();
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

  const toggleMission = (index: number) => {
    setCompletedMissions(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleAuthProvider);
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  const handleGuestLogin = () => {
    setUser({
      uid: 'guest_123',
      email: 'guest@placement-war.app',
      getIdToken: async () => 'guest_token',
      displayName: 'Demo User',
      photoURL: ''
    } as any);
  };

  const handleLogout = () => {
    signOut(auth);
    setMissions([]);
    setSkillGaps([]);
    setResumeResult(null);
    setReadinessScore(0);
    setCompletedMissions(new Set());
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
        {/* Background effects */}
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
            Your AI-powered command center for placement preparation. Get personalized strategies, resume analysis, and skill gap detection — all powered by Gemini.
          </p>
          <div className="flex flex-col gap-4 mt-6">
            <button 
              onClick={handleLogin}
              className="group relative px-8 py-4 bg-cyan-500/10 border border-cyan-500/50 hover:bg-cyan-500/20 text-cyan-400 rounded-xl overflow-hidden transition-all shadow-[0_0_20px_rgba(6,182,212,0.15)] hover:shadow-[0_0_30px_rgba(6,182,212,0.3)]"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-400/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
              <span className="relative font-semibold tracking-wide text-sm flex items-center justify-center space-x-3">
                <Cpu className="w-5 h-5 group-hover:text-cyan-300 transition-colors" />
                <span>Continue with Google</span>
              </span>
            </button>
            
            <button 
              onClick={handleGuestLogin}
              className="px-8 py-3 bg-white/5 hover:bg-white/10 text-slate-400 text-xs rounded-xl tracking-wide transition-all border border-white/5 hover:border-white/10"
            >
              Try Demo Mode
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

  return (
    <div className="min-h-screen bg-[#050507] text-slate-200 flex flex-col font-sans selection:bg-cyan-900 selection:text-cyan-50" style={{ fontFamily: 'Inter, sans-serif' }}>
      <nav className="h-16 border-b border-cyan-500/30 bg-[#0a0a14] flex items-center justify-between px-6 shrink-0 shadow-[0_0_20px_rgba(6,182,212,0.1)] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto w-full flex justify-between items-center h-full">
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 bg-cyan-500 rounded-sm flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.6)] rotate-45">
              <div className="-rotate-45 font-bold text-black text-xs">PWR</div>
            </div>
            <h1 className="text-xl font-black tracking-tighter text-cyan-400 hidden sm:block">PLACEMENT WAR ROOM</h1>
          </div>
          
          <div className="flex items-center gap-8">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-[10px] text-cyan-500" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                {user.displayName || user.email}
              </span>
              <span className="text-xs font-bold flex items-center gap-2">CONNECTED <span className="w-1.5 h-1.5 bg-green-500 rounded-full shadow-[0_0_8px_#22c55e]"></span></span>
            </div>
            <button 
              onClick={handleLogout}
              className="w-10 h-10 rounded-full border border-cyan-500/50 p-0.5 flex items-center justify-center hover:bg-cyan-500/10 transition-colors"
              title="Sign out"
            >
              <div className="w-full h-full rounded-full bg-gradient-to-tr from-cyan-900 to-slate-800 flex items-center justify-center">
                <LogOut className="w-4 h-4 text-cyan-400 ml-0.5" />
              </div>
            </button>
          </div>
        </div>
      </nav>

      <main className="flex-1 p-6 lg:p-8 flex flex-col gap-6 bg-[radial-gradient(circle_at_50%_50%,_rgba(15,23,42,1)_0%,_rgba(5,5,7,1)_100%)] min-h-[calc(100vh-4rem)]">
        <div className="max-w-7xl mx-auto w-full">

        <AnimatePresence>
          {syncing && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mb-6 flex items-center space-x-2 text-cyan-400 text-sm bg-cyan-950/30 inline-flex px-3 py-1.5 rounded-full border border-cyan-900/50"
              style={{ fontFamily: 'JetBrains Mono, monospace' }}
            >
              <Activity className="w-4 h-4 animate-spin" />
              <span>Syncing profile...</span>
            </motion.div>
          )}
        </AnimatePresence>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Content Area */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Readiness Score Header */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-[#0f172a]/50 border border-cyan-500/20 rounded-2xl p-6 relative overflow-hidden backdrop-blur-md"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full -mr-12 -mt-12" />
              
              <span className="text-[10px] tracking-widest text-cyan-500 uppercase" style={{ fontFamily: 'JetBrains Mono, monospace' }}>Mission Objective</span>
              <div className="flex items-end justify-between mt-2">
                <div>
                  <h3 className="text-3xl sm:text-4xl font-black text-white tracking-tighter">Interview Ready</h3>
                  <p className="text-sm text-slate-400 mt-1">Complete missions to boost your readiness score</p>
                </div>
                <div className="text-right flex flex-col items-end">
                  <span className="text-[10px] text-slate-400 uppercase tracking-widest mb-1" style={{ fontFamily: 'JetBrains Mono, monospace' }}>Readiness</span>
                  <span className="text-4xl sm:text-5xl font-black text-white">{readinessScore}<span className="text-2xl text-cyan-500">%</span></span>
                </div>
              </div>
              
              <div className="mt-8 h-2 bg-white/5 rounded-full overflow-hidden">
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

            {/* Daily Missions */}
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <h3 className="text-[11px] text-slate-500 uppercase tracking-widest flex items-center gap-2" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                  <span className="w-2 h-2 bg-cyan-500 rounded-full animate-pulse"></span> Daily Missions
                </h3>
                <button 
                  onClick={generateMissions} 
                  disabled={generating}
                  className="text-xs bg-cyan-500/20 text-cyan-400 px-4 py-1.5 rounded-lg hover:bg-cyan-500/30 transition border border-cyan-500/50 flex items-center gap-2 disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {generating ? "Generating..." : "Generate with AI"}
                </button>
              </div>
              
              <div className="bg-black/40 border border-white/5 rounded-2xl p-6 overflow-hidden flex flex-col gap-3">
                {missions.length > 0 ? missions.map((mission, i) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    onClick={() => toggleMission(i)}
                    className={`bg-[#11111f] border rounded-xl p-4 flex items-center justify-between relative group hover:border-cyan-500/30 transition-all cursor-pointer overflow-hidden ${
                      completedMissions.has(i) ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-white/5'
                    }`}
                  >
                    <div className="flex items-center space-x-4 z-10">
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                        completedMissions.has(i) 
                          ? 'border-emerald-500 bg-emerald-500' 
                          : 'border-slate-600 group-hover:border-cyan-500'
                      }`}>
                        {completedMissions.has(i) && <CheckCircle2 className="w-4 h-4 text-white" />}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-200">{mission.title}</span>
                        <span className="text-xs text-slate-500 mt-0.5">{mission.description}</span>
                      </div>
                    </div>
                    <span className={`text-xs px-2.5 py-1 rounded border shadow-lg z-10 ${getTypeColor(mission.type)}`} style={{ fontFamily: 'JetBrains Mono, monospace' }}>{mission.type}</span>
                    <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity">
                       <Target className="w-24 h-24 text-cyan-400" />
                    </div>
                  </motion.div>
                )) : (
                  <div className="text-center text-slate-500 text-sm py-8 flex flex-col items-center gap-3">
                    <Crosshair className="w-8 h-8 text-slate-600" />
                    <span>No active missions. Click "Generate with AI" to get started.</span>
                  </div>
                )}
              </div>
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

          {/* Sidebar */}
          <div className="space-y-6">
            
            {/* Skill Gap Analysis */}
            <div className="bg-[#0f172a]/50 border border-fuchsia-500/20 rounded-2xl p-6 backdrop-blur-md relative overflow-hidden">
              <div className="flex items-center justify-between mb-6">
                <span className="text-[10px] tracking-widest text-fuchsia-400 uppercase" style={{ fontFamily: 'JetBrains Mono, monospace' }}>Skill Matrix</span>
                {skillGaps.length === 0 && (
                  <button 
                    onClick={fetchSkillGaps}
                    disabled={loadingSkills}
                    className="text-[10px] text-fuchsia-400 hover:text-fuchsia-300 transition-colors disabled:opacity-50"
                    style={{ fontFamily: 'JetBrains Mono, monospace' }}
                  >
                    {loadingSkills ? 'Analyzing...' : 'Analyze'}
                  </button>
                )}
              </div>
              
              {skillGaps.length > 0 ? (
                <div className="space-y-3">
                  {skillGaps.map((skill, i) => (
                    <motion.div 
                      key={i}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="flex items-center justify-between p-3 bg-fuchsia-500/5 border border-fuchsia-500/10 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <Zap className="w-4 h-4 text-fuchsia-400" />
                        <span className="text-sm text-slate-300">{skill}</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-600" />
                    </motion.div>
                  ))}
                  <button 
                    onClick={fetchSkillGaps}
                    disabled={loadingSkills}
                    className="w-full text-[10px] text-fuchsia-400/60 hover:text-fuchsia-400 transition-colors py-2 disabled:opacity-50"
                    style={{ fontFamily: 'JetBrains Mono, monospace' }}
                  >
                    {loadingSkills ? 'Re-analyzing...' : 'Re-analyze skills'}
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center space-y-3 py-6 opacity-50">
                  <Target className="w-8 h-8 text-fuchsia-400" />
                  <span className="text-xs text-center" style={{ fontFamily: 'JetBrains Mono, monospace' }}>Click "Analyze" to identify<br/>missing skills for your target role</span>
                </div>
              )}
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#0f172a]/50 border border-white/5 rounded-xl p-4 text-center">
                <div className="text-2xl font-black text-white">{completedMissions.size}</div>
                <div className="text-[10px] text-slate-500 uppercase tracking-wider mt-1" style={{ fontFamily: 'JetBrains Mono, monospace' }}>Completed</div>
              </div>
              <div className="bg-[#0f172a]/50 border border-white/5 rounded-xl p-4 text-center">
                <div className="text-2xl font-black text-white">{Math.max(missions.length - completedMissions.size, 0)}</div>
                <div className="text-[10px] text-slate-500 uppercase tracking-wider mt-1" style={{ fontFamily: 'JetBrains Mono, monospace' }}>Pending</div>
              </div>
            </div>

            {/* Activity Feed */}
            <div className="flex flex-col gap-4">
              <h3 className="text-[11px] text-slate-500 uppercase tracking-widest flex items-center gap-2" style={{ fontFamily: 'JetBrains Mono, monospace' }}>Activity</h3>
              <div className="bg-black/40 border border-white/5 rounded-2xl p-4 overflow-hidden flex flex-col gap-3">
                {(missions.length > 0 || skillGaps.length > 0 || resumeResult) ? (
                  <div className="space-y-3">
                    {missions.length > 0 && (
                      <div className="flex items-start gap-3 text-xs">
                        <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full mt-1.5 shrink-0" />
                        <div>
                          <span className="text-slate-300">{missions.length} missions generated</span>
                          <p className="text-slate-600 mt-0.5">{completedMissions.size} completed</p>
                        </div>
                      </div>
                    )}
                    {skillGaps.length > 0 && (
                      <div className="flex items-start gap-3 text-xs">
                        <div className="w-1.5 h-1.5 bg-fuchsia-500 rounded-full mt-1.5 shrink-0" />
                        <div>
                          <span className="text-slate-300">{skillGaps.length} skill gaps identified</span>
                          <p className="text-slate-600 mt-0.5">Focus areas flagged</p>
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
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-4 px-6">
        <div className="max-w-7xl mx-auto flex justify-between items-center text-[10px] text-slate-600">
          <span>Placement War Room</span>
          <span>Powered by Gemini AI</span>
        </div>
      </footer>
    </div>
  );
}
