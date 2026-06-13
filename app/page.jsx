"use client";

import { useEffect, useState } from "react";
import { supabase, supabaseReady } from "../lib/supabase";
import {
  ChevronRight,
  CheckCircle2,
  XCircle,
  Heart,
  MessageCircle,
  Share2,
  Play,
  ShieldCheck,
  Gavel,
  User,
  Scale,
  CalendarDays,
  Search,
  TrendingUp,
} from "lucide-react";

const MOCK_CASES = [
  {
    id: "case-01",
    title: "The Coffee Shop Laptop Spill",
    claimant: { name: "Maya Chen", title: "Claimant", location: "City Center Cafe", avatar: "MC" },
    respondent: { name: "Jordan Reyes", title: "Respondent", avatar: "JR" },
    description: "A latte spill on a working laptop sparked a community debate. Was the neighbor negligent when they left the table without offering to pay for repairs?",
    tags: ["#Accident", "#Cafe", "#Responsibility"],
    supportVotes: 312,
    againstVotes: 183,
    status: "open",
    filedAt: 1749686400000,
    claimVideoUrl: null,
    evidence: [
      { id: "e1", side: "prosecution", type: "video", user: { name: "JT Rivera", avatar: "JR" }, caption: "Uploaded close-up of the spill angle and unattended cup.", likes: 54, comments: 12, commentsList: [] },
      { id: "e2", side: "defense", type: "image", user: { name: "Nina Park", avatar: "NP" }, caption: "Receipt showing two drinks and the claimant's table placement.", likes: 28, comments: 7, commentsList: [] },
      { id: "e3", side: "prosecution", type: "image", user: { name: "Samir Jones", avatar: "SJ" }, caption: "Witness testimony screenshot asserting the other party left abruptly.", likes: 46, comments: 9, commentsList: [] },
      { id: "e4", side: "defense", type: "video", user: { name: "Lena Brooks", avatar: "LB" }, caption: "Door cam clip showing the other side bending to pick up keys first.", likes: 33, comments: 5, commentsList: [] },
    ],
  },
  {
    id: "case-02",
    title: "Stolen Parking Spot Showdown",
    claimant: { name: "Derek Owens", title: "Claimant", location: "Riverside Plaza Lot", avatar: "DO" },
    respondent: { name: "Sam Martinez", title: "Respondent", avatar: "SM" },
    description: "A parking space dispute escalated into public jury review after conflicting accounts surfaced. Did the late arriver steal the spot or was the claimant obstructing traffic?",
    tags: ["#Parking", "#Etiquette", "#NeighborWar"],
    supportVotes: 198,
    againstVotes: 257,
    status: "verdict",
    filedAt: 1749600000000,
    claimVideoUrl: null,
    evidence: [
      { id: "e5", side: "prosecution", type: "image", user: { name: "Ava Liu", avatar: "AL" }, caption: "Photo of the claimant double-parked while saving the spot.", likes: 63, comments: 16, commentsList: [] },
      { id: "e6", side: "defense", type: "video", user: { name: "Nate Kim", avatar: "NK" }, caption: "Dash cam footage showing the claimant circling the lot repeatedly.", likes: 40, comments: 11, commentsList: [] },
      { id: "e7", side: "prosecution", type: "video", user: { name: "Priya Shah", avatar: "PS" }, caption: "A seven-second clip of a second car pulling into the claimed spot.", likes: 38, comments: 8, commentsList: [] },
      { id: "e8", side: "defense", type: "image", user: { name: "Miguel Torres", avatar: "MT" }, caption: "Parking lot map annotated with the claimant's initial arrival path.", likes: 21, comments: 4, commentsList: [] },
    ],
  },
];

const formatPercent = (value) => `${value}%`;

const timeAgo = (ts) => {
  if (!ts) return "Unknown";
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  const days = Math.floor(diff / 86400);
  return days === 1 ? "1 day ago" : `${days} days ago`;
};

const STATUS_STYLES = {
  open: { label: "Open", cls: "bg-emerald-500/15 text-emerald-300" },
  verdict: { label: "Verdict Delivered", cls: "bg-amber-500/15 text-amber-300" },
  closed: { label: "Closed", cls: "bg-slate-700 text-slate-400" },
};

const CARD_GRADIENTS = [
  "from-indigo-500/25 to-transparent",
  "from-pink-500/25 to-transparent",
  "from-amber-500/25 to-transparent",
  "from-emerald-500/25 to-transparent",
  "from-cyan-500/25 to-transparent",
  "from-violet-500/25 to-transparent",
  "from-rose-500/25 to-transparent",
];

const cardGradient = (id) => {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return CARD_GRADIENTS[Math.abs(hash) % CARD_GRADIENTS.length];
};

export default function HomePage() {
  const [view, setView] = useState("lobby");
  const [cases, setCases] = useState(MOCK_CASES);
  const [selectedCaseId, setSelectedCaseId] = useState(null);
  const [currentCase, setCurrentCase] = useState(null);
  const [voteState, setVoteState] = useState({ support: 0, against: 0 });
  const [activeTab, setActiveTab] = useState("prosecution");
  const [credentials, setCredentials] = useState({ email: "", password: "", username: "" });
  const [userVoteStatus, setUserVoteStatus] = useState(null);
  const [likedMap, setLikedMap] = useState({});
  const [showMainCommentBox, setShowMainCommentBox] = useState(false);
  const [mainCommentText, setMainCommentText] = useState("");
  const [evidenceCommentTexts, setEvidenceCommentTexts] = useState({});
  const [openEvidenceCommentBoxes, setOpenEvidenceCommentBoxes] = useState({});
  const [showNewCaseForm, setShowNewCaseForm] = useState(false);
  const [newCase, setNewCase] = useState({ title: "", description: "", tags: "", respondentName: "", claimVideoFile: null, claimVideoUrl: null });
  const [showEvidenceSubmitForm, setShowEvidenceSubmitForm] = useState(false);
  const [evidenceDraft, setEvidenceDraft] = useState({ side: "prosecution", type: "video", caption: "", file: null, fileUrl: null });
  const [evidenceSubmitError, setEvidenceSubmitError] = useState("");
  const [selectedTag, setSelectedTag] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [voteHistory, setVoteHistory] = useState({});
  const [shareCopied, setShareCopied] = useState(false);
  const [authMode, setAuthMode] = useState("signin");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  useEffect(() => {
    // Check existing Supabase session
    if (supabase) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          const meta = session.user.user_metadata || {};
          setCredentials({ email: session.user.email, username: meta.username || "", password: "" });
          setView("dashboard");
        }
      });
    }

    // Listen for sign-in / sign-out events
    const subscription = supabase
      ? supabase.auth.onAuthStateChange((_event, session) => {
          if (session?.user) {
            const meta = session.user.user_metadata || {};
            setCredentials((c) => ({ ...c, email: session.user.email, username: meta.username || c.username }));
          } else {
            setCredentials({ email: "", username: "", password: "" });
            setView("lobby");
          }
        }).data.subscription
      : null;

    try {
      const rawCases = localStorage.getItem("pv_cases_extra");
      if (rawCases) {
        const extra = JSON.parse(rawCases);
        if (Array.isArray(extra) && extra.length > 0) {
          setCases((prev) => {
            const filtered = extra.filter((item) => !prev.some((p) => p.id === item.id));
            return [...filtered, ...prev];
          });
        }
      }
    } catch (e) {}

    try {
      const rawVotes = localStorage.getItem("pv_votes");
      if (rawVotes) setVoteHistory(JSON.parse(rawVotes));
    } catch (e) {}

    try {
      const rawStatuses = localStorage.getItem("pv_case_statuses");
      if (rawStatuses) {
        const statuses = JSON.parse(rawStatuses);
        setCases((prev) => prev.map((c) => statuses[c.id] ? { ...c, status: statuses[c.id] } : c));
      }
    } catch (e) {}

    return () => subscription?.unsubscribe();
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("pv_likes");
      if (raw) setLikedMap(JSON.parse(raw));
    } catch (e) {}
  }, []);

  useEffect(() => {
    if (!selectedCaseId) return;
    const match = cases.find((c) => c.id === selectedCaseId);
    if (!match) return;

    const cloned = JSON.parse(JSON.stringify(match));
    cloned.likes = cloned.likes ?? 0;
    cloned.comments = cloned.comments ?? 0;
    cloned.mainComments = cloned.mainComments ?? [];
    cloned.evidence = cloned.evidence.map((e) => ({ ...e, commentsList: e.commentsList ?? [] }));

    try {
      const raw = localStorage.getItem("pv_comments");
      if (raw) {
        const store = JSON.parse(raw);
        const cs = store[cloned.id];
        if (cs) {
          cloned.mainComments = cs.mainComments || cloned.mainComments;
          const evC = cs.evidenceComments || {};
          cloned.evidence = cloned.evidence.map((e) => ({ ...e, commentsList: evC[e.id] || e.commentsList || [] }));
          cloned.comments = cloned.mainComments.length || cloned.comments;
          cloned.evidence = cloned.evidence.map((e) => ({ ...e, comments: (e.commentsList || []).length || e.comments }));
        }
      }
    } catch (e) {}

    setCurrentCase(cloned);
    setVoteState({ support: cloned.supportVotes, against: cloned.againstVotes });
    setActiveTab("prosecution");
    setUserVoteStatus(voteHistory[cloned.id] || null);
  }, [selectedCaseId, cases]);

  const handleSignIn = async (e) => {
    e.preventDefault();
    if (!supabase) { setAuthError("Supabase is not configured. Add your keys to .env.local."); return; }
    setAuthError("");
    setAuthLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password,
    });
    setAuthLoading(false);
    if (error) { setAuthError(error.message); return; }
    const meta = data.user.user_metadata || {};
    setCredentials((c) => ({ ...c, username: meta.username || "" }));
    setView("dashboard");
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    if (!supabase) { setAuthError("Supabase is not configured. Add your keys to .env.local."); return; }
    setAuthError("");
    if (!credentials.username.trim()) { setAuthError("Please enter a display name."); return; }
    setAuthLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: credentials.email,
      password: credentials.password,
      options: { data: { username: credentials.username.trim() } },
    });
    setAuthLoading(false);
    if (error) { setAuthError(error.message); return; }
    if (data.user) {
      await supabase.from("profiles").upsert({ id: data.user.id, username: credentials.username.trim() });
      if (data.session) {
        setView("dashboard");
      } else {
        setAuthError("Account created! Check your email to confirm before signing in.");
        setAuthMode("signin");
      }
    }
  };

  const handleSignOut = async () => {
    if (supabase) await supabase.auth.signOut();
    setView("lobby");
  };

  const totalVotes = voteState.support + voteState.against;
  const supportPercent = totalVotes > 0 ? Math.round((voteState.support / totalVotes) * 100) : 50;
  const againstPercent = 100 - supportPercent;

  const claimStrength =
    supportPercent >= 70 ? "Strong — public opinion firmly supports the claimant."
    : supportPercent >= 55 ? "Moderate — jury leans toward the claimant."
    : supportPercent >= 45 ? "Contested — jury is split almost evenly."
    : supportPercent >= 30 ? "Weak — jury is skeptical of the claim."
    : "Very weak — public opinion is against the claimant.";

  const handleEnterCourtroom = (e) => {
    e.preventDefault();
    try {
      const payload = { email: credentials.email, username: credentials.username };
      setCookie("pv_user", JSON.stringify(payload), 1);
      localStorage.setItem("pv_user", JSON.stringify(payload));
    } catch (e) {}
    setView("dashboard");
  };

  const handleOpenCase = (caseId) => {
    setSelectedCaseId(caseId);
    setView("case");
  };

  const persistCaseStatus = (caseId, status) => {
    try {
      const raw = localStorage.getItem("pv_case_statuses");
      const store = raw ? JSON.parse(raw) : {};
      store[caseId] = status;
      localStorage.setItem("pv_case_statuses", JSON.stringify(store));
    } catch (e) {}
  };

  const applyVerdictToCase = (caseId, status) => {
    setCases((prev) => prev.map((c) => c.id === caseId ? { ...c, status } : c));
    setCurrentCase((prev) => prev && prev.id === caseId ? { ...prev, status } : prev);
    persistCaseStatus(caseId, status);
  };

  const handleVote = (side) => {
    if (!currentCase || userVoteStatus === side || currentCase.status === "verdict" || currentCase.status === "closed") return;

    const newSupport = side === "prosecution" ? voteState.support + 1 : voteState.support;
    const newAgainst = side === "defense" ? voteState.against + 1 : voteState.against;
    const newTotal = newSupport + newAgainst;
    const newSupportPct = Math.round((newSupport / newTotal) * 100);

    setVoteState({ support: newSupport, against: newAgainst });
    setUserVoteStatus(side);
    const next = { ...voteHistory, [currentCase.id]: side };
    setVoteHistory(next);
    try { localStorage.setItem("pv_votes", JSON.stringify(next)); } catch (e) {}

    // Auto-verdict: 30+ votes AND one side holds 65%+
    if (newTotal >= 30 && (newSupportPct >= 65 || newSupportPct <= 35)) {
      applyVerdictToCase(currentCase.id, "verdict");
    }
  };

  const handleDeliverVerdict = () => {
    if (!currentCase) return;
    applyVerdictToCase(currentCase.id, "verdict");
  };

  const handleShare = () => {
    const url = `${window.location.origin}${window.location.pathname}#case=${currentCase.id}`;
    navigator.clipboard.writeText(url).catch(() => {});
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 2000);
  };

  const handleMainLike = () => {
    if (!currentCase) return;
    const key = `main:${currentCase.id}`;
    if (likedMap[key]) return;
    const next = { ...likedMap, [key]: true };
    try { localStorage.setItem("pv_likes", JSON.stringify(next)); } catch (e) {}
    setLikedMap(next);
    setCurrentCase((prev) => ({ ...prev, likes: (prev.likes || 0) + 1 }));
  };

  const handleMainCommentSubmit = () => {
    if (!currentCase || !mainCommentText.trim()) return;
    const comment = { id: `m-${Date.now()}`, user: credentials.username || credentials.email || "You", text: mainCommentText.trim(), time: new Date().toISOString() };
    setCurrentCase((prev) => {
      const next = { ...prev, comments: (prev.comments || 0) + 1, mainComments: [...(prev.mainComments || []), comment] };
      try {
        const raw = localStorage.getItem("pv_comments");
        const store = raw ? JSON.parse(raw) : {};
        store[prev.id] = store[prev.id] || {};
        store[prev.id].mainComments = next.mainComments;
        store[prev.id].evidenceComments = store[prev.id].evidenceComments || {};
        localStorage.setItem("pv_comments", JSON.stringify(store));
      } catch (e) {}
      return next;
    });
    setMainCommentText("");
    setShowMainCommentBox(false);
  };

  const handleEvidenceLike = (evidenceId) => {
    const key = `evidence:${evidenceId}`;
    if (likedMap[key]) return;
    const next = { ...likedMap, [key]: true };
    try { localStorage.setItem("pv_likes", JSON.stringify(next)); } catch (e) {}
    setLikedMap(next);
    setCurrentCase((prev) => ({
      ...prev,
      evidence: prev.evidence.map((e) => (e.id === evidenceId ? { ...e, likes: (e.likes || 0) + 1 } : e)),
    }));
  };

  const handleEvidenceCommentSubmit = (evidenceId) => {
    const text = (evidenceCommentTexts[evidenceId] || "").trim();
    if (!currentCase || !text) return;
    const comment = { id: `ec-${Date.now()}`, user: credentials.username || credentials.email || "You", text, time: new Date().toISOString() };
    setCurrentCase((prev) => {
      const evidence = prev.evidence.map((e) => {
        if (e.id !== evidenceId) return e;
        const nextList = [...(e.commentsList || []), comment];
        return { ...e, commentsList: nextList, comments: nextList.length };
      });
      const next = { ...prev, evidence };
      try {
        const raw = localStorage.getItem("pv_comments");
        const store = raw ? JSON.parse(raw) : {};
        store[prev.id] = store[prev.id] || {};
        store[prev.id].evidenceComments = store[prev.id].evidenceComments || {};
        store[prev.id].evidenceComments[evidenceId] = (store[prev.id].evidenceComments[evidenceId] || []).concat(comment);
        store[prev.id].mainComments = store[prev.id].mainComments || next.mainComments || [];
        localStorage.setItem("pv_comments", JSON.stringify(store));
      } catch (e) {}
      return next;
    });
    setEvidenceCommentTexts((prev) => ({ ...prev, [evidenceId]: "" }));
    setOpenEvidenceCommentBoxes((prev) => ({ ...prev, [evidenceId]: false }));
  };

  const handleEvidenceSubmit = () => {
    if (!currentCase || !evidenceDraft.caption.trim()) {
      setEvidenceSubmitError("Provide a brief caption for your evidence.");
      return;
    }
    setEvidenceSubmitError("");
    const id = `e-${Date.now()}`;
    const uname = credentials.username || credentials.email || "You";
    const evidenceItem = {
      id,
      side: evidenceDraft.side,
      type: evidenceDraft.type,
      user: { name: uname, avatar: uname.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase() },
      caption: evidenceDraft.caption.trim(),
      fileUrl: evidenceDraft.fileUrl || null,
      likes: 0,
      comments: 0,
      commentsList: [],
    };
    setCurrentCase((prev) => ({ ...prev, evidence: [...prev.evidence, evidenceItem] }));
    setCases((prev) => prev.map((c) => (c.id === currentCase.id ? { ...c, evidence: [...c.evidence, evidenceItem] } : c)));
    try {
      const raw = localStorage.getItem("pv_evidence");
      const store = raw ? JSON.parse(raw) : {};
      store[currentCase.id] = store[currentCase.id] || [];
      const { fileUrl: _u, ...forStorage } = evidenceItem;
      store[currentCase.id].push(forStorage);
      localStorage.setItem("pv_evidence", JSON.stringify(store));
    } catch (e) {}
    setEvidenceDraft({ side: "prosecution", type: "video", caption: "", file: null, fileUrl: null });
    setShowEvidenceSubmitForm(false);
  };

  const activeEvidence = currentCase ? currentCase.evidence.filter((item) => item.side === activeTab) : [];

  const trendingTags = (() => {
    const counts = {};
    cases.forEach((c) => {
      const votes = c.supportVotes + c.againstVotes;
      (c.tags || []).forEach((tag) => { counts[tag] = (counts[tag] || 0) + 1 + votes; });
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([tag]) => tag);
  })();

  const filteredCases = cases.filter((c) => {
    const matchesTag = !selectedTag || (c.tags && c.tags.includes(selectedTag));
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch = !q || c.title.toLowerCase().includes(q) || (c.description || "").toLowerCase().includes(q) || (c.tags || []).some((t) => t.toLowerCase().includes(q));
    return matchesTag && matchesSearch;
  });

  const myName = credentials.username || credentials.email || "";
  const isClaimant = currentCase && myName && currentCase.claimant.name === myName;
  const verdictWinner = supportPercent >= 50 ? "claimant" : "respondent";
  const myCases = cases.filter((c) => c.claimant.name === myName);
  const myVotes = Object.entries(voteHistory).map(([caseId, side]) => ({
    caseId, side, caseTitle: cases.find((c) => c.id === caseId)?.title || "Unknown case",
  }));

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">

      {/* ── LOBBY ── */}
      {view === "lobby" && (
        <section className="mx-auto flex min-h-screen max-w-md items-center justify-center px-6 py-16">
          <div className="w-full rounded-3xl border border-slate-800 bg-slate-900/95 p-8 shadow-2xl shadow-slate-950/30 backdrop-blur-xl">
            <div className="mb-8 flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/15 text-indigo-300">
                <Gavel className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm uppercase tracking-[0.32em] text-slate-400">PublicVerdict</p>
                <h1 className="mt-1 text-2xl font-semibold text-slate-50">The Courtroom</h1>
              </div>
            </div>

            {/* Sign in / Sign up tabs */}
            <div className="mb-6 flex rounded-2xl bg-slate-950/80 p-1">
              <button onClick={() => { setAuthMode("signin"); setAuthError(""); }} className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition ${authMode === "signin" ? "bg-indigo-500 text-white" : "text-slate-400 hover:text-slate-200"}`}>Sign In</button>
              <button onClick={() => { setAuthMode("signup"); setAuthError(""); }} className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition ${authMode === "signup" ? "bg-indigo-500 text-white" : "text-slate-400 hover:text-slate-200"}`}>Sign Up</button>
            </div>

            <form onSubmit={authMode === "signin" ? handleSignIn : handleSignUp} className="space-y-4">
              {authMode === "signup" && (
                <label className="block">
                  <span className="text-sm text-slate-300">Display name</span>
                  <input type="text" value={credentials.username} onChange={(e) => setCredentials({ ...credentials, username: e.target.value })} placeholder="Your public name in the courtroom" className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-slate-100 outline-none transition focus:border-indigo-500/80 focus:ring-2 focus:ring-indigo-500/10" required />
                </label>
              )}
              <label className="block">
                <span className="text-sm text-slate-300">Email</span>
                <input type="email" value={credentials.email} onChange={(e) => setCredentials({ ...credentials, email: e.target.value })} placeholder="you@example.com" className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-slate-100 outline-none transition focus:border-indigo-500/80 focus:ring-2 focus:ring-indigo-500/10" required />
              </label>
              <label className="block">
                <span className="text-sm text-slate-300">Password</span>
                <input type="password" value={credentials.password} onChange={(e) => setCredentials({ ...credentials, password: e.target.value })} placeholder={authMode === "signup" ? "Min 6 characters" : "Your password"} className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-slate-100 outline-none transition focus:border-indigo-500/80 focus:ring-2 focus:ring-indigo-500/10" required />
              </label>

              {!supabaseReady && (
                <div className="rounded-2xl bg-amber-500/10 border border-amber-500/20 px-4 py-3 text-sm text-amber-300">
                  Supabase not connected. Create <code className="font-mono">.env.local</code> with your project URL and anon key.
                </div>
              )}

              {authError && (
                <p className={`rounded-2xl px-4 py-3 text-sm ${authError.startsWith("Account created") ? "bg-emerald-500/10 text-emerald-300" : "bg-rose-500/10 text-rose-300"}`}>{authError}</p>
              )}

              <button type="submit" disabled={authLoading} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-500 px-6 py-3.5 text-base font-semibold text-white transition hover:bg-indigo-400 disabled:opacity-60 disabled:cursor-not-allowed">
                {authLoading ? "Please wait…" : authMode === "signin" ? "Sign In" : "Create Account"}
                {!authLoading && <ChevronRight className="h-5 w-5" />}
              </button>
            </form>

            <p className="mt-5 text-center text-sm text-slate-500">
              {authMode === "signin" ? "No account yet? " : "Already have an account? "}
              <button onClick={() => { setAuthMode(authMode === "signin" ? "signup" : "signin"); setAuthError(""); }} className="text-indigo-400 hover:text-indigo-300">
                {authMode === "signin" ? "Sign up free" : "Sign in"}
              </button>
            </p>
          </div>
        </section>
      )}

      {/* ── DASHBOARD ── */}
      {view === "dashboard" && (
        <section className="mx-auto max-w-7xl px-6 py-10 lg:px-8">
          <header className="mb-8 flex flex-col gap-4 rounded-3xl border border-slate-800 bg-slate-900/90 p-8 shadow-xl shadow-slate-950/20">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.3em] text-indigo-300/80">The Public Docket</p>
                <h2 className="mt-3 text-4xl font-semibold text-slate-50 sm:text-5xl">Trending Cases in Review</h2>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button onClick={() => setView("profile")} className="inline-flex items-center gap-2 rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-300 transition hover:bg-slate-900">
                  <User className="h-4 w-4 text-indigo-400" /> My Profile
                </button>
                <button onClick={() => setShowNewCaseForm(true)} className="inline-flex items-center gap-2 rounded-2xl bg-indigo-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-400">
                  File New Case
                </button>
                <button onClick={handleSignOut} className="inline-flex items-center gap-2 rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-300 transition hover:bg-slate-900">
                  <Scale className="h-4 w-4 text-indigo-400" /> Sign Out
                </button>
              </div>
            </div>
            <p className="max-w-2xl text-slate-400">Review highlighted disputes before the people and pick a case to examine. The Jury is watching.</p>
          </header>

          {/* Search */}
          <div className="mb-6 relative">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search cases by title, description or tag…" className="w-full rounded-2xl border border-slate-800 bg-slate-900 py-3 pl-11 pr-4 text-slate-100 outline-none transition focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/10" />
          </div>

          {/* Trending topics */}
          {trendingTags.length > 0 && (
            <div className="mb-8">
              <p className="mb-3 text-xs uppercase tracking-[0.28em] text-slate-500">Trending Topics</p>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => setSelectedTag(null)} className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${selectedTag === null ? "bg-indigo-500 text-slate-950" : "bg-slate-800 text-slate-300 hover:bg-slate-700"}`}>All</button>
                {trendingTags.map((tag) => (
                  <button key={tag} onClick={() => setSelectedTag(selectedTag === tag ? null : tag)} className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${selectedTag === tag ? "bg-indigo-500 text-slate-950" : "bg-slate-800 text-slate-300 hover:bg-slate-700"}`}>{tag}</button>
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {filteredCases.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-slate-800 bg-slate-900/80 py-20 text-center">
              <TrendingUp className="mb-4 h-10 w-10 text-slate-600" />
              <p className="text-lg font-semibold text-slate-300">No cases found</p>
              <p className="mt-2 text-slate-500">Try a different search or tag filter.</p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {filteredCases.map((caseItem) => {
                const total = caseItem.supportVotes + caseItem.againstVotes;
                const support = total > 0 ? Math.round((caseItem.supportVotes / total) * 100) : 50;
                const against = 100 - support;
                const status = STATUS_STYLES[caseItem.status] || STATUS_STYLES.open;
                return (
                  <article key={caseItem.id} onClick={() => handleOpenCase(caseItem.id)} className="group cursor-pointer overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/95 transition hover:-translate-y-1 hover:border-indigo-500/40">
                    <div className={`relative h-36 bg-gradient-to-br ${cardGradient(caseItem.id)} bg-slate-900 p-5`}>
                      <div className="flex items-start justify-between">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900/80 text-sm font-semibold text-indigo-300 ring-1 ring-slate-700">{caseItem.claimant.avatar}</div>
                        <span className={`rounded-full px-3 py-1 text-[11px] font-medium uppercase tracking-[0.2em] ${status.cls}`}>{status.label}</span>
                      </div>
                      <p className="mt-3 text-xs uppercase tracking-[0.28em] text-slate-400">{caseItem.claimant.name}</p>
                    </div>
                    <div className="space-y-4 p-5">
                      <div>
                        <h3 className="text-lg font-semibold text-slate-50">{caseItem.title}</h3>
                        <p className="mt-2 line-clamp-2 text-sm text-slate-400">{caseItem.description}</p>
                      </div>
                      {caseItem.respondent && (
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <span className="rounded-full bg-slate-800 px-2 py-0.5 text-slate-500">vs</span>
                          <span className="font-medium text-slate-400">{caseItem.respondent.name}</span>
                        </div>
                      )}
                      <div className="flex flex-wrap gap-2">
                        {caseItem.tags.map((tag) => (
                          <span key={tag} className="rounded-full bg-slate-800 px-3 py-1 text-xs uppercase tracking-[0.18em] text-slate-400">{tag}</span>
                        ))}
                      </div>
                      <div className="rounded-3xl bg-slate-950/60 p-4">
                        <div className="mb-3 flex items-center justify-between text-sm text-slate-400">
                          <span>Jury Meter</span>
                          <span className="font-semibold text-slate-300">{total} votes</span>
                        </div>
                        <div className="h-2.5 overflow-hidden rounded-full bg-slate-800">
                          <div className="h-full rounded-full bg-indigo-500 transition-all duration-500" style={{ width: `${support}%` }} />
                        </div>
                        <div className="mt-3 flex items-center justify-between text-[11px] uppercase tracking-[0.24em] text-slate-500">
                          <span>{support}% Support</span><span>{against}% Against</span>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* ── FILE NEW CASE MODAL ── */}
      {showNewCaseForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-slate-100">File a New Case</h3>
            <p className="mt-1 text-sm text-slate-400">Bring your dispute to the public court for review.</p>
            <div className="mt-5 grid gap-3">
              <input value={newCase.title} onChange={(e) => setNewCase((s) => ({ ...s, title: e.target.value }))} placeholder="Case title" className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-slate-100 outline-none focus:border-indigo-500/60" />
              <textarea value={newCase.description} onChange={(e) => setNewCase((s) => ({ ...s, description: e.target.value }))} placeholder="Short description of the dispute" className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-slate-100 outline-none focus:border-indigo-500/60" rows={3} />
              <input value={newCase.respondentName} onChange={(e) => setNewCase((s) => ({ ...s, respondentName: e.target.value }))} placeholder="Respondent name (who you're filing against)" className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-slate-100 outline-none focus:border-indigo-500/60" />
              <input value={newCase.tags} onChange={(e) => setNewCase((s) => ({ ...s, tags: e.target.value }))} placeholder="Tags, comma separated (e.g. Parking, Etiquette)" className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-slate-100 outline-none focus:border-indigo-500/60" />
              <label className="block">
                <span className="text-sm text-slate-300">Claim video (optional)</span>
                <input type="file" accept="video/*" onChange={(e) => { const f = e.target.files[0]; if (!f) return; setNewCase((s) => ({ ...s, claimVideoFile: f, claimVideoUrl: URL.createObjectURL(f) })); }} className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-slate-100 outline-none file:mr-4 file:rounded-xl file:border-0 file:bg-indigo-500/20 file:px-3 file:py-1 file:text-sm file:text-indigo-300 file:cursor-pointer" />
              </label>
              {newCase.claimVideoUrl && <video src={newCase.claimVideoUrl} controls className="w-full max-h-40 rounded-2xl" />}
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => { setShowNewCaseForm(false); setNewCase({ title: "", description: "", tags: "", respondentName: "", claimVideoFile: null, claimVideoUrl: null }); }} className="rounded-2xl bg-slate-800 px-4 py-2 text-sm text-slate-300 hover:bg-slate-700">Cancel</button>
                <button onClick={() => {
                  if (!newCase.title.trim()) return;
                  const id = `case-${Date.now()}`;
                  const tagsArr = (newCase.tags || "").split(",").map((t) => t.trim()).filter(Boolean).map((t) => (t.startsWith("#") ? t : `#${t}`));
                  const claimantName = credentials.username || credentials.email || "Anonymous";
                  const respName = newCase.respondentName.trim() || "Unknown";
                  const created = {
                    id,
                    title: newCase.title.trim(),
                    claimant: { name: claimantName, title: "Claimant", location: "User Submitted", avatar: claimantName.split(" ").map((s) => s[0]).join("").slice(0, 2).toUpperCase() },
                    respondent: { name: respName, title: "Respondent", avatar: respName.split(" ").map((s) => s[0]).join("").slice(0, 2).toUpperCase() },
                    description: newCase.description.trim(),
                    tags: tagsArr,
                    supportVotes: 0,
                    againstVotes: 0,
                    evidence: [],
                    status: "open",
                    filedAt: Date.now(),
                    claimVideoUrl: newCase.claimVideoUrl || null,
                  };
                  setCases((prev) => [created, ...prev]);
                  try {
                    const raw = localStorage.getItem("pv_cases_extra");
                    const arr = raw ? JSON.parse(raw) : [];
                    const { claimVideoUrl: _v, ...storable } = created;
                    arr.unshift(storable);
                    localStorage.setItem("pv_cases_extra", JSON.stringify(arr));
                  } catch (e) {}
                  setNewCase({ title: "", description: "", tags: "", respondentName: "", claimVideoFile: null, claimVideoUrl: null });
                  setShowNewCaseForm(false);
                }} className="rounded-2xl bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-400">Submit Case</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── CASE VIEW ── */}
      {view === "case" && currentCase && (
        <section className="mx-auto max-w-7xl px-6 py-10 lg:px-8">
          <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <button onClick={() => setView("dashboard")} className="mb-4 inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-950/90 px-4 py-2 text-sm text-slate-300 transition hover:bg-slate-900">
                <ChevronRight className="rotate-180 text-indigo-400" /> Back to Docket
              </button>
              <p className="text-sm uppercase tracking-[0.35em] text-indigo-300/80">The Courtroom</p>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <h2 className="text-4xl font-semibold text-slate-50 sm:text-5xl">{currentCase.title}</h2>
                <span className={`rounded-full px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] ${(STATUS_STYLES[currentCase.status] || STATUS_STYLES.open).cls}`}>
                  {(STATUS_STYLES[currentCase.status] || STATUS_STYLES.open).label}
                </span>
              </div>
              <p className="mt-4 max-w-2xl text-slate-400">{currentCase.description}</p>
            </div>

            {/* Claimant vs Respondent cards */}
            <div className="flex flex-col gap-3 sm:flex-row md:flex-col lg:flex-row">
              <div className="rounded-3xl border border-slate-800 bg-slate-900/90 px-5 py-4 shadow-xl">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/10 text-sm font-semibold text-indigo-300 ring-1 ring-slate-700">{currentCase.claimant.avatar}</div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Claimant</p>
                    <p className="text-base font-semibold text-slate-100">{currentCase.claimant.name}</p>
                  </div>
                </div>
                <p className="mt-3 text-sm text-slate-400">{currentCase.claimant.location}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {currentCase.tags.map((tag) => <span key={tag} className="rounded-full bg-slate-950 px-3 py-1 text-xs uppercase tracking-[0.18em] text-slate-400">{tag}</span>)}
                </div>
              </div>
              {currentCase.respondent && (
                <div className="rounded-3xl border border-rose-500/20 bg-slate-900/90 px-5 py-4 shadow-xl">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/10 text-sm font-semibold text-rose-300 ring-1 ring-rose-500/30">{currentCase.respondent.avatar}</div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Respondent</p>
                      <p className="text-base font-semibold text-slate-100">{currentCase.respondent.name}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="grid gap-8 lg:grid-cols-[1.45fr_0.95fr]">
            <div className="space-y-8">
              <div className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/95 shadow-2xl shadow-slate-950/20">
                <div className="relative bg-slate-950/90 p-6">
                  <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-500 via-slate-600 to-indigo-400" />
                  <div className="aspect-video overflow-hidden rounded-b-[2rem] bg-slate-800 shadow-inner shadow-slate-950/50">
                    {currentCase.claimVideoUrl ? (
                      <video src={currentCase.claimVideoUrl} controls className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-slate-500">
                        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-slate-900 text-indigo-300"><Play className="h-10 w-10" /></div>
                        <p className="text-base font-medium">Original Claim Video</p>
                        <p className="max-w-sm text-center text-sm">No video uploaded for this case.</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-6 p-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm uppercase tracking-[0.24em] text-indigo-300/80">Main Claim</p>
                      <h3 className="mt-2 text-2xl font-semibold text-slate-100">Review the evidence. Decide the verdict.</h3>
                    </div>
                    <div className="inline-flex items-center gap-2 rounded-3xl bg-slate-950/80 px-4 py-3 text-sm text-slate-300 ring-1 ring-slate-700">
                      <User className="h-4 w-4 text-indigo-400" /> Public Courtroom Live
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="rounded-3xl bg-slate-950/80 p-4"><p className="text-sm text-slate-400">Support votes</p><p className="mt-2 text-2xl font-semibold text-indigo-300">{voteState.support}</p></div>
                    <div className="rounded-3xl bg-slate-950/80 p-4"><p className="text-sm text-slate-400">Against votes</p><p className="mt-2 text-2xl font-semibold text-slate-300">{voteState.against}</p></div>
                    <div className="rounded-3xl bg-slate-950/80 p-4"><p className="text-sm text-slate-400">Public verdict</p><p className="mt-2 text-2xl font-semibold text-slate-300">{supportPercent}% For</p></div>
                  </div>

                  {/* Verdict banner */}
                  {currentCase.status === "verdict" && (
                    <div className={`rounded-3xl p-6 ${verdictWinner === "claimant" ? "bg-indigo-500/10 border border-indigo-500/30" : "bg-rose-500/10 border border-rose-500/30"}`}>
                      <div className="flex items-center gap-3">
                        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${verdictWinner === "claimant" ? "bg-indigo-500/20 text-indigo-300" : "bg-rose-500/20 text-rose-300"}`}>
                          <Gavel className="h-6 w-6" />
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Jury Has Spoken</p>
                          <p className="mt-1 text-xl font-semibold text-slate-50">
                            {verdictWinner === "claimant"
                              ? `${currentCase.claimant.name} wins — ${supportPercent}% of the jury sided with the claimant.`
                              : `${currentCase.respondent?.name || "Respondent"} wins — ${againstPercent}% of the jury sided against the claimant.`}
                          </p>
                        </div>
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-3">
                        <div className="rounded-2xl bg-slate-950/60 p-3 text-center">
                          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">For Claimant</p>
                          <p className="mt-1 text-2xl font-semibold text-indigo-300">{supportPercent}%</p>
                        </div>
                        <div className="rounded-2xl bg-slate-950/60 p-3 text-center">
                          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Against Claimant</p>
                          <p className="mt-1 text-2xl font-semibold text-slate-300">{againstPercent}%</p>
                        </div>
                      </div>
                      <p className="mt-3 text-center text-xs text-slate-500">{totalVotes} total votes cast · Voting is now closed</p>
                    </div>
                  )}

                  <div className="rounded-3xl bg-slate-950/70 p-6">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm uppercase tracking-[0.24em] text-slate-400">Jury Meter</p>
                        <p className="mt-2 text-lg font-semibold text-slate-100">
                          {currentCase.status === "verdict" ? "Final verdict split" : "Live verdict split"}
                        </p>
                      </div>
                      <div className="rounded-full bg-slate-900/90 px-4 py-2 text-sm text-slate-400 ring-1 ring-slate-700">{totalVotes} votes cast</div>
                    </div>
                    <div className="mt-6 space-y-4">
                      <div className="rounded-full bg-slate-800 p-1">
                        <div className="relative h-4 overflow-hidden rounded-full bg-slate-900">
                          <div className="absolute inset-y-0 left-0 rounded-full bg-indigo-500 transition-all duration-500" style={{ width: `${supportPercent}%` }} />
                          <div className="absolute inset-y-0 right-0 rounded-full bg-slate-600/80" style={{ width: `${againstPercent}%` }} />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="rounded-3xl bg-slate-950/80 p-3"><p className="text-xs uppercase tracking-[0.24em] text-slate-500">For Claimant</p><p className="mt-2 text-lg font-semibold text-indigo-300">{formatPercent(supportPercent)}</p></div>
                        <div className="rounded-3xl bg-slate-950/80 p-3"><p className="text-xs uppercase tracking-[0.24em] text-slate-500">Against Claimant</p><p className="mt-2 text-lg font-semibold text-slate-300">{formatPercent(againstPercent)}</p></div>
                      </div>
                    </div>
                    {currentCase.status !== "verdict" && currentCase.status !== "closed" ? (
                      <>
                        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                          <button onClick={() => handleVote("prosecution")} disabled={userVoteStatus === "prosecution"} className="inline-flex flex-1 items-center justify-center gap-2 rounded-3xl bg-indigo-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:bg-slate-700">
                            <CheckCircle2 className="h-4 w-4" /> Find For Claimant
                          </button>
                          <button onClick={() => handleVote("defense")} disabled={userVoteStatus === "defense"} className="inline-flex flex-1 items-center justify-center gap-2 rounded-3xl border border-slate-700 bg-slate-950 px-5 py-3 text-sm font-semibold text-slate-100 transition hover:border-indigo-500 hover:text-indigo-300 disabled:cursor-not-allowed disabled:text-slate-500">
                            <XCircle className="h-4 w-4" /> Find Against Claimant
                          </button>
                        </div>
                        {userVoteStatus && (
                          <p className="mt-4 text-sm text-slate-400">You voted: <span className="font-semibold text-indigo-300">{userVoteStatus === "prosecution" ? "For Claimant" : "Against Claimant"}</span>.</p>
                        )}
                        <p className="mt-3 text-xs text-slate-600 text-center">Auto-verdict triggers at 30+ votes with 65%+ consensus</p>
                      </>
                    ) : (
                      <p className="mt-6 text-center text-sm text-slate-500">Voting is closed — verdict has been delivered.</p>
                    )}
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-800 bg-slate-900/95 p-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm uppercase tracking-[0.28em] text-indigo-300/80">Engage</p>
                      <h3 className="mt-2 text-2xl font-semibold text-slate-50">Participate in the debate</h3>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <button onClick={handleMainLike} disabled={likedMap[`main:${currentCase.id}`]} className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm text-slate-300 transition hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-60">
                        <Heart className="h-4 w-4 text-pink-400" /> Like <span className="ml-1 text-slate-400">{currentCase.likes}</span>
                      </button>
                      <button onClick={() => setShowMainCommentBox((s) => !s)} className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm text-slate-300 transition hover:bg-slate-900">
                        <MessageCircle className="h-4 w-4 text-cyan-400" /> Comment <span className="ml-1 text-slate-400">{currentCase.comments}</span>
                      </button>
                      <button onClick={handleShare} className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm text-slate-300 transition hover:bg-slate-900">
                        <Share2 className="h-4 w-4 text-indigo-400" /> {shareCopied ? "Copied!" : "Share"}
                      </button>
                      {isClaimant && currentCase.status === "open" && (
                        <button onClick={handleDeliverVerdict} className="inline-flex items-center gap-2 rounded-2xl bg-amber-500/20 px-4 py-3 text-sm font-semibold text-amber-300 transition hover:bg-amber-500/30 border border-amber-500/30">
                          <Gavel className="h-4 w-4" /> Deliver Verdict
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {showMainCommentBox && (
                  <div className="mt-4 rounded-2xl bg-slate-950/80 p-4">
                    <textarea value={mainCommentText} onChange={(e) => setMainCommentText(e.target.value)} className="w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-slate-100 outline-none" placeholder="Write your comment…" />
                    <div className="mt-3 flex justify-end gap-2">
                      <button onClick={() => setShowMainCommentBox(false)} className="rounded-2xl bg-slate-800 px-4 py-2 text-sm text-slate-300">Cancel</button>
                      <button onClick={handleMainCommentSubmit} className="rounded-2xl bg-indigo-500 px-4 py-2 text-sm text-white">Submit</button>
                    </div>
                  </div>
                )}

                {currentCase.mainComments && currentCase.mainComments.length > 0 && (
                  <div className="mt-6 space-y-3">
                    {currentCase.mainComments.map((c) => (
                      <div key={c.id} className="rounded-2xl bg-slate-950/80 p-3 text-sm">
                        <div className="flex items-center justify-between">
                          <div className="font-semibold text-slate-100">{c.user}</div>
                          <div className="text-xs text-slate-500">{new Date(c.time).toLocaleString()}</div>
                        </div>
                        <div className="mt-2 text-slate-300">{c.text}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="rounded-3xl border border-slate-800 bg-slate-900/95 p-6 shadow-xl">
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="h-5 w-5 text-indigo-400" />
                    <p className="text-sm uppercase tracking-[0.28em] text-slate-400">Case Intelligence</p>
                  </div>
                  <div className="mt-6 space-y-4">
                    <div className="rounded-3xl bg-slate-950/80 p-4">
                      <p className="text-sm text-slate-400">Claim strength</p>
                      <p className="mt-2 text-base font-semibold text-slate-100">{claimStrength}</p>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="rounded-3xl bg-slate-950/80 p-4">
                        <p className="text-sm text-slate-400">Jury momentum</p>
                        <p className="mt-2 font-semibold text-slate-100">{supportPercent}% leaning toward claimant</p>
                      </div>
                      <div className="rounded-3xl bg-slate-950/80 p-4">
                        <p className="text-sm text-slate-400">Evidence pieces</p>
                        <p className="mt-2 font-semibold text-slate-100">{currentCase.evidence.length} submissions</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-800 bg-slate-900/95 p-6 shadow-xl">
                  <div className="flex items-center gap-3">
                    <CalendarDays className="h-5 w-5 text-indigo-400" />
                    <p className="text-sm uppercase tracking-[0.28em] text-slate-400">Timeline</p>
                  </div>
                  <div className="mt-6 space-y-4">
                    <div className="rounded-3xl bg-slate-950/80 p-4">
                      <p className="text-sm text-slate-400">Filed</p>
                      <p className="mt-2 font-semibold text-slate-100">{timeAgo(currentCase.filedAt)}</p>
                    </div>
                    <div className="rounded-3xl bg-slate-950/80 p-4">
                      <p className="text-sm text-slate-400">Status</p>
                      <p className={`mt-2 font-semibold ${(STATUS_STYLES[currentCase.status] || STATUS_STYLES.open).cls}`}>
                        {(STATUS_STYLES[currentCase.status] || STATUS_STYLES.open).label}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── EVIDENCE SIDEBAR ── */}
            <aside className="space-y-6">
              <div className="rounded-3xl border border-slate-800 bg-slate-900/95 p-6 shadow-xl">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm uppercase tracking-[0.28em] text-indigo-300/80">Crowdsourced Evidence</p>
                    <h3 className="mt-2 text-2xl font-semibold text-slate-100">Prosecution vs Defense</h3>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-slate-950/80 px-4 py-2 text-xs uppercase tracking-[0.24em] text-slate-400">
                    <Gavel className="h-4 w-4 text-indigo-300" /> Public Jury Review
                  </div>
                </div>

                <div className="mt-6 flex flex-col gap-3 rounded-3xl bg-slate-950/80 p-2 sm:flex-row">
                  <button onClick={() => { setActiveTab("prosecution"); setShowEvidenceSubmitForm(false); setEvidenceSubmitError(""); }} className={`flex-1 rounded-3xl px-4 py-3 text-sm font-semibold transition ${activeTab === "prosecution" ? "bg-indigo-500 text-slate-950" : "text-slate-300 hover:bg-slate-900"}`}>Supporting Evidence</button>
                  <button onClick={() => { setActiveTab("defense"); setShowEvidenceSubmitForm(false); setEvidenceSubmitError(""); }} className={`flex-1 rounded-3xl px-4 py-3 text-sm font-semibold transition ${activeTab === "defense" ? "bg-indigo-500 text-slate-950" : "text-slate-300 hover:bg-slate-900"}`}>Defending Evidence</button>
                  <button onClick={() => setShowEvidenceSubmitForm((s) => !s)} className="flex-none rounded-2xl bg-slate-800 px-4 py-3 text-base font-semibold leading-none text-slate-300 hover:bg-slate-700" title="Add Evidence">+</button>
                </div>

                {showEvidenceSubmitForm && (
                  <div className="mt-6 rounded-3xl border border-slate-800 bg-slate-950/85 p-5">
                    <div className="flex flex-col gap-4">
                      <label className="block">
                        <span className="text-sm text-slate-300">Evidence side</span>
                        <select value={evidenceDraft.side} onChange={(e) => setEvidenceDraft((prev) => ({ ...prev, side: e.target.value }))} className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-slate-100 outline-none">
                          <option value="prosecution">Supporting Evidence</option>
                          <option value="defense">Defending Evidence</option>
                        </select>
                      </label>
                      <label className="block">
                        <span className="text-sm text-slate-300">Upload image or video</span>
                        <input type="file" accept="image/*,video/*" onChange={(e) => { const f = e.target.files[0]; if (!f) return; const type = f.type.startsWith("video/") ? "video" : "image"; setEvidenceDraft((prev) => ({ ...prev, file: f, fileUrl: URL.createObjectURL(f), type })); }} className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-slate-100 outline-none file:mr-4 file:cursor-pointer file:rounded-xl file:border-0 file:bg-indigo-500/20 file:px-3 file:py-1 file:text-sm file:text-indigo-300" />
                      </label>
                      {evidenceDraft.fileUrl && (
                        <div className="overflow-hidden rounded-2xl bg-slate-900">
                          {evidenceDraft.type === "video"
                            ? <video src={evidenceDraft.fileUrl} controls className="w-full max-h-48 rounded-2xl" />
                            : <img src={evidenceDraft.fileUrl} alt="preview" className="w-full max-h-48 rounded-2xl object-cover" />}
                        </div>
                      )}
                      <label className="block">
                        <span className="text-sm text-slate-300">Evidence description</span>
                        <textarea value={evidenceDraft.caption} onChange={(e) => setEvidenceDraft((prev) => ({ ...prev, caption: e.target.value }))} placeholder="Describe the evidence you are submitting." className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-slate-100 outline-none" rows={3} />
                      </label>
                      {evidenceSubmitError && <p className="text-sm text-rose-400">{evidenceSubmitError}</p>}
                      <div className="flex justify-end gap-2">
                        <button onClick={() => { setShowEvidenceSubmitForm(false); setEvidenceSubmitError(""); }} className="rounded-2xl bg-slate-800 px-4 py-3 text-sm text-slate-300">Cancel</button>
                        <button onClick={handleEvidenceSubmit} className="rounded-2xl bg-indigo-500 px-4 py-3 text-sm font-semibold text-slate-950">Submit Evidence</button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-6 space-y-4">
                  {activeEvidence.length === 0 ? (
                    <button onClick={() => setShowEvidenceSubmitForm(true)} className="w-full rounded-3xl bg-slate-950/80 p-6 text-center text-slate-400 transition hover:bg-slate-900/80 hover:text-slate-200">
                      No evidence submitted for this side yet.
                    </button>
                  ) : (
                    activeEvidence.map((item) => (
                      <div key={item.id} className="rounded-3xl border border-slate-800 bg-slate-950/80 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-indigo-300 ring-1 ring-slate-700">{item.user.avatar}</div>
                            <div>
                              <p className="font-semibold text-slate-100">{item.user.name}</p>
                              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">{item.type === "video" ? "Video Submission" : "Image Submission"}</p>
                            </div>
                          </div>
                          <div className="rounded-full bg-slate-900 px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-slate-500">{item.side === "prosecution" ? "Prosecution" : "Defense"}</div>
                        </div>

                        <div className="mt-5 rounded-3xl bg-slate-900 p-4">
                          {item.fileUrl && (
                            <div className="mb-3 overflow-hidden rounded-2xl">
                              {item.type === "video"
                                ? <video src={item.fileUrl} controls className="w-full max-h-64 rounded-2xl" />
                                : <img src={item.fileUrl} alt={item.caption} className="w-full max-h-64 rounded-2xl object-cover" />}
                            </div>
                          )}
                          <div className="flex items-center gap-3 text-slate-400">
                            {!item.fileUrl && (
                              <div className="flex h-10 w-10 flex-none items-center justify-center rounded-2xl bg-slate-950">
                                {item.type === "video" ? <Play className="h-5 w-5" /> : <div className="h-5 w-5 rounded-xl bg-indigo-400" />}
                              </div>
                            )}
                            <p className="text-sm">{item.caption}</p>
                          </div>
                        </div>

                        <div className="mt-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <button disabled={likedMap[`evidence:${item.id}`]} onClick={() => handleEvidenceLike(item.id)} className="rounded-md bg-slate-950 px-3 py-1 text-sm text-slate-300 hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-60">Like</button>
                              <button onClick={() => setOpenEvidenceCommentBoxes((s) => ({ ...s, [item.id]: !s[item.id] }))} className="rounded-md bg-slate-950 px-3 py-1 text-sm text-slate-300 hover:bg-slate-900">Comment</button>
                            </div>
                            <div className="text-sm text-slate-400">{item.likes} likes · {item.comments} comments</div>
                          </div>

                          {openEvidenceCommentBoxes[item.id] && (
                            <div className="mt-3">
                              <textarea value={evidenceCommentTexts[item.id] || ""} onChange={(e) => setEvidenceCommentTexts((p) => ({ ...p, [item.id]: e.target.value }))} className="w-full rounded-2xl border border-slate-800 bg-slate-900 px-3 py-2 text-slate-100 outline-none" placeholder="Write a comment…" />
                              <div className="mt-2 flex justify-end gap-2">
                                <button onClick={() => setOpenEvidenceCommentBoxes((s) => ({ ...s, [item.id]: false }))} className="rounded-2xl bg-slate-800 px-3 py-1 text-sm text-slate-300">Cancel</button>
                                <button onClick={() => handleEvidenceCommentSubmit(item.id)} className="rounded-2xl bg-indigo-500 px-3 py-1 text-sm text-white">Submit</button>
                              </div>
                            </div>
                          )}

                          {item.commentsList && item.commentsList.length > 0 && (
                            <div className="mt-4 space-y-2">
                              {item.commentsList.map((c) => (
                                <div key={c.id} className="rounded-2xl bg-slate-950/80 p-3 text-sm">
                                  <div className="flex items-center justify-between">
                                    <div className="font-semibold text-slate-100">{c.user}</div>
                                    <div className="text-xs text-slate-500">{new Date(c.time).toLocaleString()}</div>
                                  </div>
                                  <div className="mt-2 text-slate-300">{c.text}</div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-3xl border border-slate-800 bg-slate-900/95 p-6 shadow-xl">
                <p className="text-sm uppercase tracking-[0.3em] text-indigo-300/80">Court Brief</p>
                <p className="mt-4 text-slate-400">The courtroom highlights public opinion, evidence submissions, and the live jury meter. Every vote shifts the verdict and keeps the debate in motion.</p>
              </div>
            </aside>
          </div>
        </section>
      )}

      {/* ── PROFILE VIEW ── */}
      {view === "profile" && (
        <section className="mx-auto max-w-4xl px-6 py-10 lg:px-8">
          <button onClick={() => setView("dashboard")} className="mb-6 inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-950/90 px-4 py-2 text-sm text-slate-300 transition hover:bg-slate-900">
            <ChevronRight className="rotate-180 text-indigo-400" /> Back to Docket
          </button>

          <div className="mb-8 rounded-3xl border border-slate-800 bg-slate-900/95 p-8">
            <div className="flex items-center gap-5">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-500/15 text-xl font-bold text-indigo-300">
                {(credentials.username || credentials.email || "?").slice(0, 2).toUpperCase()}
              </div>
              <div>
                <p className="text-xl font-semibold text-slate-100">{credentials.username || "Anonymous"}</p>
                <p className="mt-1 text-sm text-slate-400">{credentials.email}</p>
              </div>
            </div>
            <div className="mt-6 grid grid-cols-3 gap-4">
              <div className="rounded-3xl bg-slate-950/80 p-4 text-center">
                <p className="text-2xl font-semibold text-indigo-300">{myCases.length}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-500">Cases Filed</p>
              </div>
              <div className="rounded-3xl bg-slate-950/80 p-4 text-center">
                <p className="text-2xl font-semibold text-indigo-300">{myVotes.length}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-500">Votes Cast</p>
              </div>
              <div className="rounded-3xl bg-slate-950/80 p-4 text-center">
                <p className="text-2xl font-semibold text-indigo-300">{myCases.reduce((acc, c) => acc + c.evidence.length, 0)}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-500">Evidence Submitted</p>
              </div>
            </div>
          </div>

          {myCases.length > 0 && (
            <div className="mb-8">
              <h3 className="mb-4 text-lg font-semibold text-slate-100">My Cases</h3>
              <div className="space-y-3">
                {myCases.map((c) => {
                  const total = c.supportVotes + c.againstVotes;
                  const support = total > 0 ? Math.round((c.supportVotes / total) * 100) : 50;
                  const status = STATUS_STYLES[c.status] || STATUS_STYLES.open;
                  return (
                    <div key={c.id} onClick={() => handleOpenCase(c.id)} className="cursor-pointer rounded-3xl border border-slate-800 bg-slate-900/95 p-5 transition hover:border-indigo-500/40">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="font-semibold text-slate-100">{c.title}</p>
                          <p className="mt-1 line-clamp-1 text-sm text-slate-400">{c.description}</p>
                        </div>
                        <span className={`flex-none rounded-full px-3 py-1 text-[11px] font-medium uppercase tracking-[0.2em] ${status.cls}`}>{status.label}</span>
                      </div>
                      <div className="mt-3 flex items-center gap-4 text-xs text-slate-500">
                        <span>{total} votes · {support}% for</span>
                        <span>{c.evidence.length} evidence</span>
                        {c.filedAt && <span>{timeAgo(c.filedAt)}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {myVotes.length > 0 && (
            <div>
              <h3 className="mb-4 text-lg font-semibold text-slate-100">My Votes</h3>
              <div className="space-y-3">
                {myVotes.map(({ caseId, side, caseTitle }) => (
                  <div key={caseId} onClick={() => handleOpenCase(caseId)} className="cursor-pointer rounded-3xl border border-slate-800 bg-slate-900/95 p-5 transition hover:border-indigo-500/40">
                    <div className="flex items-center justify-between gap-4">
                      <p className="font-semibold text-slate-100">{caseTitle}</p>
                      <span className={`flex-none rounded-full px-3 py-1 text-[11px] font-medium uppercase tracking-[0.2em] ${side === "prosecution" ? "bg-indigo-500/15 text-indigo-300" : "bg-slate-700 text-slate-400"}`}>
                        {side === "prosecution" ? "Voted For" : "Voted Against"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {myCases.length === 0 && myVotes.length === 0 && (
            <div className="rounded-3xl border border-slate-800 bg-slate-900/80 py-16 text-center">
              <Gavel className="mx-auto mb-4 h-10 w-10 text-slate-600" />
              <p className="text-slate-400">You haven't filed any cases or cast any votes yet.</p>
            </div>
          )}
        </section>
      )}
    </main>
  );
}
