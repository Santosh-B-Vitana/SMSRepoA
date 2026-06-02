import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSchool } from '../contexts/SchoolContext';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Loader2, Eye, EyeOff, Sun, Moon, Monitor,
  Shield, Users, GraduationCap, AlertTriangle, ArrowRight,
  Lock, CheckCircle2, ImagePlus, ArrowLeft,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { loginSchema, checkRateLimit } from '@/utils/authValidation';

/* ── Portal config ─────────────────────────────────────────────────────── */
const PORTALS = [
  { id: 'admin',  label: 'Admin',  full: 'Welcome back',   icon: Shield,        accent: '#3B82F6', accentDark: '#2563EB' },
  { id: 'staff',  label: 'Staff',  full: 'Staff Portal',   icon: GraduationCap, accent: '#0EA5E9', accentDark: '#0284C7' },
  { id: 'parent', label: 'Parent', full: 'Parent Portal',  icon: Users,         accent: '#8B5CF6', accentDark: '#7C3AED' },
  { id: 'super_admin', label: 'Super Admin', full: 'Super Admin Portal', icon: Shield, accent: '#2563EB', accentDark: '#1D4ED8' },
] as const;
type PortalId = typeof PORTALS[number]['id'];
type MainPortalId = Exclude<PortalId, 'super_admin'>;

const isPortalId = (value: string): value is PortalId =>
  PORTALS.some((portal) => portal.id === value);

const MAIN_PORTALS = PORTALS.filter((portal) => portal.id !== 'super_admin') as Array<
  Extract<(typeof PORTALS)[number], { id: MainPortalId }>
>;

/* ── Dot-grid background decoration ────────────────────────────────────── */
function MeshBg() {
  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden="true">
      <defs>
        <pattern id="dots" width="28" height="28" patternUnits="userSpaceOnUse">
          <circle cx="1.5" cy="1.5" r="1.5" fill="rgba(99,179,237,0.16)" />
        </pattern>
        <radialGradient id="dotFade" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="white" stopOpacity="0.9" />
          <stop offset="55%" stopColor="white" stopOpacity="0.4" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </radialGradient>
        <mask id="dotMask"><rect width="100%" height="100%" fill="url(#dotFade)" /></mask>
      </defs>
      <rect width="100%" height="100%" fill="url(#dots)" mask="url(#dotMask)" />
    </svg>
  );
}

/* ── Stat card ──────────────────────────────────────────────────────────── */
function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl px-4 py-3 text-center transition-all duration-200 hover:scale-[1.03]"
      style={{ border: '1px solid rgba(59,130,246,0.22)', background: 'rgba(59,130,246,0.07)' }}>
      <p className="text-[1.35rem] font-black text-white leading-none">{value}</p>
      <p className="text-[10px] font-semibold uppercase tracking-wider mt-1" style={{ color: 'rgba(147,197,253,0.65)' }}>{label}</p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════ */
export default function Login() {
  const [email,         setEmail]         = useState('');
  const [password,      setPassword]      = useState('');
  const [showPassword,  setShowPassword]  = useState(false);
  const [error,         setError]         = useState('');
  const [fieldErrors,   setFieldErrors]   = useState<{ email?: string; password?: string }>({});
  const [rateLimitWarn, setRateLimitWarn] = useState<string | null>(null);
  const [loginType,     setLoginType]     = useState<PortalId>('admin');
  const [selectedPortal, setSelectedPortal] = useState<MainPortalId | null>(null);
  const loginTypeRef = useRef<PortalId>('admin');
  loginTypeRef.current = loginType;

  const { login, logout, loading, isAuthenticated, user } = useAuth();
  const { schoolInfo } = useSchool();
  const { t } = useLanguage();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (searchParams.get('expired') === 'true') setError('Your session has expired. Please log in again.');
  }, [searchParams]);

  useEffect(() => {
    const portalFromQuery = (searchParams.get('portal') || '').toLowerCase();
    if (isPortalId(portalFromQuery)) {
      setLoginType(portalFromQuery);
      if (portalFromQuery !== 'super_admin') {
        setSelectedPortal(portalFromQuery);
      } else {
        setSelectedPortal(null);
      }
      return;
    }

    if (location.pathname === '/super-admin-login') {
      setLoginType('super_admin');
      setSelectedPortal(null);
      return;
    }

    setLoginType((prev) => (prev === 'super_admin' ? 'admin' : prev));
  }, [searchParams, location.pathname]);

  useEffect(() => {
    if (!isAuthenticated || !user) return;
    const role = user.role?.toLowerCase() ?? '';
    const isStaff  = role === 'staff';
    const isParent = role === 'parent';
    const isSuperAdmin = role === 'super_admin';
    const portal   = loginTypeRef.current;
    if (portal === 'parent' && !isParent) { setError('This portal is for parents/guardians only.'); logout(); return; }
    if (portal === 'staff'  && !isStaff)  { setError('This portal is for school staff only.');      logout(); return; }
    if (portal === 'super_admin' && !isSuperAdmin) { setError('This portal is for super admins only.'); logout(); return; }
    if (portal === 'admin'  && (isStaff || isParent || isSuperAdmin)) {
      if (isStaff) setError('Staff must use the Staff Login.');
      else if (isParent) setError('Parents must use the Parent Portal.');
      else setError('Super admins must use the Super Admin Portal.');
      logout(); return;
    }
    const routes: Record<string, string> = { staff: '/staff-dashboard', admin: '/admin-dashboard', parent: '/parent-dashboard', super_admin: '/super-admin-dashboard' };
    navigate(searchParams.get('returnUrl') || routes[role] || '/dashboard', { replace: true });
  }, [isAuthenticated, user, navigate, searchParams, logout]);

  useEffect(() => {
    if (!email.includes('@')) { setRateLimitWarn(null); return; }
    const rl = checkRateLimit(email.toLowerCase());
    setRateLimitWarn(rl.message);
    if (!rl.allowed) setError(rl.message || 'Too many attempts.');
  }, [email]);

  const validateForm = () => {
    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      const errs: { email?: string; password?: string } = {};
      result.error.errors.forEach(e => { errs[e.path[0] as 'email' | 'password'] = e.message; });
      setFieldErrors(errs); return false;
    }
    setFieldErrors({}); return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError('');
    const rl = checkRateLimit(email.toLowerCase());
    if (!rl.allowed) { setError(rl.message || 'Too many login attempts.'); return; }
    if (!validateForm()) return;
    try { await login(email, password); }
    catch (err) { setError(err instanceof Error ? err.message : 'Login failed. Please try again.'); }
  };

  const fillDemo = (em: string, pw: string) => { setEmail(em); setPassword(pw); setError(''); setFieldErrors({}); };

  const demos = [
    { email: 'admin@vitanaschools.edu', role: 'Admin',   password: 'admin-dev-change-me', portal: 'admin'  as PortalId },
    { email: 'amit.k@demo.edu',         role: 'Teacher', password: 'Teacher@123',          portal: 'staff'  as PortalId },
    { email: 'aj@gmail.com',            role: 'Parent',  password: 'Veda#834Nh7J',         portal: 'parent' as PortalId },
    { email: 'superadmin@vitana.in',    role: 'Super Admin', password: 'SuperAdmin@123',   portal: 'super_admin' as PortalId },
  ];

  const ap = PORTALS.find(p => p.id === loginType)!;
  const schoolName = schoolInfo?.name?.trim() || 'Your School';
  const hasSchoolLogo = Boolean(schoolInfo?.logoUrl);
  const schoolInitial = schoolName.charAt(0).toUpperCase();
  const brandedSignInLabel = schoolInfo?.name
    ? (loginType === 'super_admin' ? 'Continue to Super Admin Console' : `Sign in to ${schoolInfo.name}`)
    : `Continue to ${ap.label} Portal`;

  const subtitles: Record<PortalId, string> = {
    admin:  'Manage admissions, fees, academics and day-to-day school operations',
    staff:  'Your classes, attendance, timetable and grades — all in one place',
    parent: 'Check your child\'s progress, fees and school updates instantly',
    super_admin: 'Vitana platform access — internal team only',
  };

  const roleExperience: Record<PortalId, {
    eyebrow: string;
    heading: string;
    helper: string;
    chipA: string;
    chipB: string;
    emailPlaceholder: string;
    passwordPlaceholder: string;
  }> = {
    admin: {
      eyebrow: 'Admin Portal',
      heading: 'Good to have you back',
      helper: 'Admissions, fee collection, academics, reports and everything else your school runs on.',
      chipA: 'Leadership Ready',
      chipB: 'Institution Controls',
      emailPlaceholder: 'you@yourschool.edu',
      passwordPlaceholder: 'Your password',
    },
    staff: {
      eyebrow: 'Staff Portal',
      heading: 'Ready for today\'s classes?',
      helper: 'Your attendance, timetable, grades and messages are waiting for you.',
      chipA: 'Academic Workflow',
      chipB: 'Attendance First',
      emailPlaceholder: 'you@yourschool.edu',
      passwordPlaceholder: 'Your password',
    },
    parent: {
      eyebrow: 'Parent Portal',
      heading: 'Stay close to your child\'s day',
      helper: 'See how your child is doing in class, track attendance and pay fees without the hassle.',
      chipA: 'Family Insights',
      chipB: 'Real-time Updates',
      emailPlaceholder: 'your@email.com',
      passwordPlaceholder: 'Your password',
    },
    super_admin: {
      eyebrow: 'Internal Access',
      heading: 'Vitana Operations Console',
      helper: 'Platform-wide controls, school configuration and tenant management for the Vitana team.',
      chipA: 'Platform Governance',
      chipB: 'Internal Team Only',
      emailPlaceholder: 'you@vitana.in',
      passwordPlaceholder: 'Your password',
    },
  };


  return (
    <div className="min-h-screen flex">

      {/* ═══════════ LEFT — Brand panel ═══════════ */}
      <div className="hidden lg:flex lg:w-[52%] xl:w-[54%] relative overflow-hidden flex-col"
        style={{ background: 'linear-gradient(145deg, #06091A 0%, #0C1630 50%, #070E20 100%)' }}>

        {/* Dot mesh */}
        <MeshBg />

        {/* Primary electric-blue glow — top-left */}
        <div className="absolute -top-44 -left-44 w-[640px] h-[640px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.38) 0%, transparent 62%)' }} />
        {/* Indigo glow — bottom-right */}
        <div className="absolute -bottom-36 -right-36 w-[500px] h-[500px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.28) 0%, transparent 62%)' }} />
        {/* Cyan centre hint */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[320px] h-[320px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(14,165,233,0.08) 0%, transparent 65%)' }} />

        {/* Decorative rings — top-right */}
        <div className="absolute top-10 right-10 w-96 h-96 rounded-full pointer-events-none"
          style={{ border: '1px solid rgba(59,130,246,0.11)' }} />
        <div className="absolute top-24 right-24 w-64 h-64 rounded-full pointer-events-none"
          style={{ border: '1px solid rgba(99,102,241,0.09)' }} />
        <div className="absolute top-40 right-40 w-32 h-32 rounded-full pointer-events-none"
          style={{ border: '1px solid rgba(59,130,246,0.07)' }} />

        {/* Floating mock-UI preview cards — decorative depth element */}
        <div className="absolute top-[22%] right-5 xl:right-10 flex flex-col gap-3 pointer-events-none select-none"
          style={{ opacity: 0.13, transform: 'perspective(900px) rotateY(-14deg) rotateX(5deg)' }}>
          <div className="rounded-xl p-4 w-44"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}>
            <div className="text-[8px] font-bold uppercase tracking-widest text-white/60 mb-1">Attendance</div>
            <div className="text-[1.6rem] font-black text-white leading-none">97.2%</div>
            <div className="mt-2 h-1 w-full rounded-full bg-white/10">
              <div className="h-full rounded-full" style={{ width: '97%', background: '#3B82F6' }} />
            </div>
          </div>
          <div className="rounded-xl p-4 w-44"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}>
            <div className="text-[8px] font-bold uppercase tracking-widest text-white/60 mb-1">Fee Collected</div>
            <div className="text-[1.6rem] font-black text-white leading-none">{"\u20B9"}2.4L</div>
            <div className="text-[10px] mt-0.5" style={{ color: '#34D399' }}>{"\u2191"} Today's collection</div>
          </div>
          <div className="rounded-xl p-4 w-44"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}>
            <div className="text-[8px] font-bold uppercase tracking-widest text-white/60 mb-1">Live Students</div>
            <div className="flex items-end gap-0.5 h-10 mt-1">
              {[55,75,60,85,70,90,65].map((h, i) => (
                <div key={i} className="flex-1 rounded-[2px]" style={{ height: `${h * 0.45}px`, background: i === 5 ? '#60A5FA' : 'rgba(99,102,241,0.50)' }} />
              ))}
            </div>
          </div>
        </div>

        {/* Horizontal accent lines — right edge */}
        <div className="absolute bottom-[34%] right-0 w-28 h-px pointer-events-none"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(99,102,241,0.45))' }} />
        <div className="absolute bottom-[34%] translate-y-2.5 right-0 w-16 h-px pointer-events-none"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(59,130,246,0.28))' }} />

        {/* Content */}
        <div className="relative z-10 flex flex-col h-full p-10 xl:p-14">

          {/* ── Brand mark ── */}
          <div className="flex items-center gap-3">
            <div className="relative h-11 w-11 rounded-[14px] flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)', boxShadow: '0 8px 28px rgba(59,130,246,0.45)' }}>
              <img src="/favicon.ico" alt="VEDA" className="h-6 w-6 filter brightness-0 invert" />

            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-black text-white tracking-tight">VEDA</span>
              <span className="text-[9px] font-extrabold uppercase tracking-[0.18em] px-2 py-0.5 rounded-full"
                style={{ color: '#93C5FD', border: '1px solid rgba(59,130,246,0.35)', background: 'rgba(59,130,246,0.14)' }}>PRO</span>
            </div>
          </div>

          {/* ── Hero ── */}
          <div className="flex-1 flex flex-col justify-center py-12">
            <div className="mb-10 max-w-[420px]">

              {/* Category label */}
              <div className="flex items-center gap-3 mb-6">
                <div className="h-px w-8" style={{ background: 'linear-gradient(90deg, #3B82F6, transparent)' }} />
                <span className="text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: '#60A5FA' }}>
                  India's School Management Platform
                </span>
              </div>

              {/* Main headline */}
              <h1 className="font-black text-white leading-[1.06] tracking-[-0.025em] mb-6"
                style={{ fontSize: 'clamp(2.3rem, 3.1vw, 3.15rem)' }}>
                Every student.<br />
                Every milestone.<br />
                <span style={{
                  background: 'linear-gradient(95deg, #60A5FA 0%, #3B82F6 45%, #A78BFA 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}>
                  One platform.
                </span>
              </h1>

              <p className="text-[15px] leading-[1.7]" style={{ color: 'rgba(255,255,255,0.40)' }}>
                Admissions, academics, fees, attendance, exams and parent communication
                — one seamlessly integrated platform transforming how India's best schools operate.
              </p>
            </div>

            {/* Feature chips */}
            <div className="flex flex-wrap gap-2 mb-10">
              {['Live Dashboards', 'Automated Fee Collection', 'Parent App', 'Exam Reports & Grades',
                'Attendance Tracking', 'Transport GPS', 'Hostel Management', 'Payroll & HR'].map(f => (
                <span key={f}
                  className="text-[11px] font-medium px-3 py-1.5 rounded-full cursor-default transition-all duration-200"
                  style={{ color: 'rgba(255,255,255,0.46)', border: '1px solid rgba(59,130,246,0.14)', background: 'rgba(59,130,246,0.05)' }}
                  onMouseEnter={e => { const el = e.target as HTMLElement; el.style.color = 'rgba(255,255,255,0.88)'; el.style.background = 'rgba(59,130,246,0.14)'; el.style.borderColor = 'rgba(59,130,246,0.32)'; }}
                  onMouseLeave={e => { const el = e.target as HTMLElement; el.style.color = 'rgba(255,255,255,0.46)'; el.style.background = 'rgba(59,130,246,0.05)'; el.style.borderColor = 'rgba(59,130,246,0.14)'; }}
                >
                  {f}
                </span>
              ))}
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-4 gap-2.5 max-w-[390px]">
              <Stat value="50K+"  label="Students"  />
              <Stat value="99.5%" label="Uptime"    />
              <Stat value="< 2s"  label="Response"  />
              <Stat value="DPDP"  label="Compliant" />
            </div>
          </div>

          {/* ── Footer trust strip ── */}
          <div className="flex items-center gap-6 pt-5 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            {[
              { icon: Lock,         label: '256-bit SSL'   },
              { icon: CheckCircle2, label: 'SOC 2 Ready'   },
              { icon: Shield,       label: 'DPDP Compliant' },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-1.5">
                <Icon className="h-3 w-3 text-emerald-500" />
                <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.25)' }}>{label}</span>
              </div>
            ))}
            <span className="ml-auto text-[11px]" style={{ color: 'rgba(255,255,255,0.15)' }}>© 2026 Vitana</span>
          </div>
        </div>
      </div>

      {/* ═══════════ RIGHT — Form panel ═══════════ */}
      <div className="flex-1 flex flex-col relative bg-background overflow-y-auto">

        {/* Top bar: theme picker */}
        <div className="flex items-center justify-between px-6 pt-5 pb-0 lg:px-10 shrink-0">
          {/* Mobile brand */}
          <div className="lg:hidden flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #3B82F6, #2563EB)', boxShadow: '0 4px 14px rgba(59,130,246,0.35)' }}>
              <img src="/favicon.ico" alt="VEDA" className="h-4.5 w-4.5 filter brightness-0 invert" />
            </div>
            <span className="font-black text-lg text-foreground tracking-tight">VEDA</span>
          </div>
          <div className="hidden lg:block" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl border border-border/50 hover:bg-muted/60">
                {theme === 'light'  && <Sun className="h-3.5 w-3.5" />}
                {theme === 'dark'   && <Moon className="h-3.5 w-3.5" />}
                {theme === 'system' && <Monitor className="h-3.5 w-3.5" />}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-xl">
              <DropdownMenuItem onClick={() => setTheme('light')}  className="gap-2 rounded-lg"><Sun className="h-4 w-4" />{t('settings.light')}</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme('dark')}   className="gap-2 rounded-lg"><Moon className="h-4 w-4" />{t('settings.dark')}</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme('system')} className="gap-2 rounded-lg"><Monitor className="h-4 w-4" />{t('settings.system')}</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* ── Main centered content ── */}
        <div className="flex-1 flex items-center justify-center px-6 py-8 lg:px-12">
          <div className="w-full max-w-[400px]">

            {/* ── STEP 1: Role selection ── */}
            {loginType !== 'super_admin' && !selectedPortal ? (
              <div>
                {/* School identity header */}
                <div className="flex flex-col items-center text-center mb-8">
                  <div className="relative mb-4">
                    <div className="h-[72px] w-[72px] rounded-2xl overflow-hidden border-2 border-border/60 bg-muted/30 flex items-center justify-center shadow-lg shadow-black/5">
                      {hasSchoolLogo ? (
                        <img src={schoolInfo?.logoUrl} alt={schoolName} className="h-14 w-14 object-contain" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
                          <span className="text-2xl font-black text-primary/60">{schoolInitial}</span>
                        </div>
                      )}
                    </div>
                    {/* Online pulse */}
                    <span className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-background border-2 border-background flex items-center justify-center">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-muted-foreground/60 uppercase tracking-widest mb-1">Welcome to</p>
                  <h2 className="text-2xl font-black text-foreground tracking-tight leading-tight">{schoolName}</h2>
                  <p className="text-[13px] text-muted-foreground mt-1.5">How would you like to sign in?</p>
                </div>

                {/* Role cards */}
                <div className="flex flex-col gap-2.5">
                  {MAIN_PORTALS.map((portal) => {
                    const Icon = portal.icon;
                    return (
                      <button
                        key={portal.id}
                        type="button"
                        onClick={() => {
                          setSelectedPortal(portal.id);
                          setLoginType(portal.id);
                          setError('');
                          setFieldErrors({});
                        }}
                        className="group relative w-full rounded-2xl border border-border/60 bg-card text-left transition-all duration-200 hover:border-transparent hover:shadow-xl overflow-hidden"
                        style={{ '--hover-accent': portal.accent } as React.CSSProperties}
                      >
                        {/* Hover glow */}
                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none rounded-2xl"
                          style={{ boxShadow: `inset 0 0 0 1.5px ${portal.accent}60, 0 8px 32px ${portal.accent}18` }} />
                        <div className="flex items-center gap-4 px-4 py-4">
                          <div className="h-11 w-11 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-110"
                            style={{ background: `linear-gradient(135deg, ${portal.accent}28, ${portal.accentDark}20)` }}>
                            <Icon className="h-5 w-5 transition-colors duration-200" style={{ color: portal.accentDark }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[13.5px] font-bold text-foreground leading-tight">Sign in as {portal.label}</p>
                            <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{subtitles[portal.id]}</p>
                          </div>
                          <div className="h-7 w-7 rounded-full flex items-center justify-center shrink-0 transition-all duration-200 bg-muted/50 group-hover:bg-transparent"
                            style={{ boxShadow: `0 0 0 0px ${portal.accent}00` }}>
                            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/60 group-hover:text-foreground transition-all duration-200 group-hover:translate-x-0.5" />
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-6 text-center">
                  <Link to="/super-admin-login" className="text-[11px] text-muted-foreground/50 hover:text-muted-foreground transition-colors">
                    Super Admin sign-in (internal team)
                  </Link>
                </div>
              </div>

            ) : (
              /* ── STEP 2: Login form ── */
              <div>
                {/* Back + role badge strip */}
                <div className="flex items-center justify-between mb-6">
                  <button
                    type="button"
                    onClick={() => {
                      if (loginType === 'super_admin') {
                        setError(''); setFieldErrors({}); setSelectedPortal(null); setLoginType('admin');
                        navigate('/login', { replace: true }); return;
                      }
                      setSelectedPortal(null); setError(''); setFieldErrors({});
                    }}
                    className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-muted-foreground hover:text-foreground transition-colors group"
                  >
                    <ArrowLeft className="h-3.5 w-3.5 transition-transform duration-150 group-hover:-translate-x-0.5" />
                    {loginType === 'super_admin' ? 'Back to school login' : 'Switch role'}
                  </button>
                  {/* Active role pill */}
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold"
                    style={{ background: `${ap.accent}14`, color: ap.accentDark, border: `1px solid ${ap.accent}35` }}>
                    <ap.icon className="h-3 w-3" />
                    {ap.label} Portal
                  </div>
                </div>

                {/* School + heading */}
                <div className="mb-7">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-11 w-11 rounded-xl overflow-hidden border border-border/60 bg-muted/30 flex items-center justify-center shrink-0 shadow-sm">
                      {hasSchoolLogo ? (
                        <img src={schoolInfo?.logoUrl} alt={schoolName} className="h-9 w-9 object-contain" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
                          <span className="text-base font-black text-primary/60">{schoolInitial}</span>
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] text-muted-foreground/60 font-medium truncate">
                        {loginType === 'super_admin' ? 'Vitana Platform' : schoolName}
                      </p>
                      {!hasSchoolLogo && loginType !== 'super_admin' && (
                        <Link to="/login?portal=super_admin" className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary/70 hover:text-primary transition-colors mt-0.5">
                          <ImagePlus className="h-3 w-3" /> Add logo
                        </Link>
                      )}
                    </div>
                  </div>
                  <h2 className="text-[1.7rem] font-black text-foreground tracking-[-0.02em] leading-tight">
                    {loginType === 'super_admin' ? 'Super Admin Portal' : `Sign in to ${schoolInfo?.name ? schoolInfo.name : ap.full}`}
                  </h2>
                  <p className="text-[13px] text-muted-foreground mt-1.5 leading-relaxed">
                    {roleExperience[loginType].helper}
                  </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                  <div className="space-y-1.5">
                    <label htmlFor="email" className="text-[13px] font-semibold text-foreground">Email address</label>
                    <Input
                      id="email" type="email" value={email}
                      onChange={e => { setEmail(e.target.value); if (fieldErrors.email) setFieldErrors(p => ({ ...p, email: undefined })); }}
                      placeholder={roleExperience[loginType].emailPlaceholder}
                      required autoComplete="email"
                      aria-invalid={!!fieldErrors.email}
                      className={`h-12 rounded-xl text-[13.5px] bg-muted/30 border-border/70 placeholder:text-muted-foreground/40 focus-visible:ring-1 transition-all ${
                        fieldErrors.email ? 'border-destructive focus-visible:ring-destructive/40' : 'focus-visible:border-primary focus-visible:ring-primary/25'
                      }`}
                    />
                    {fieldErrors.email && (
                      <p className="text-xs text-destructive flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3 shrink-0" />{fieldErrors.email}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="password" className="text-[13px] font-semibold text-foreground">Password</label>
                    <div className="relative">
                      <Input
                        id="password" type={showPassword ? 'text' : 'password'} value={password}
                        onChange={e => { setPassword(e.target.value); if (fieldErrors.password) setFieldErrors(p => ({ ...p, password: undefined })); }}
                        placeholder={roleExperience[loginType].passwordPlaceholder}
                        required autoComplete="current-password"
                        aria-invalid={!!fieldErrors.password}
                        className={`h-12 rounded-xl text-[13.5px] bg-muted/30 border-border/70 placeholder:text-muted-foreground/40 pr-11 focus-visible:ring-1 transition-all ${
                          fieldErrors.password ? 'border-destructive focus-visible:ring-destructive/40' : 'focus-visible:border-primary focus-visible:ring-primary/25'
                        }`}
                      />
                      <button type="button" onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground transition-colors"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}>
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {fieldErrors.password && (
                      <p className="text-xs text-destructive flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3 shrink-0" />{fieldErrors.password}
                      </p>
                    )}
                  </div>

                  {rateLimitWarn && !error && (
                    <Alert className="rounded-xl border-amber-400/40 bg-amber-50 dark:bg-amber-950/30 py-2.5">
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                      <AlertDescription className="text-amber-700 dark:text-amber-300 text-sm">{rateLimitWarn}</AlertDescription>
                    </Alert>
                  )}
                  {error && (
                    <Alert variant="destructive" className="rounded-xl py-2.5">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription className="text-sm">{error}</AlertDescription>
                    </Alert>
                  )}

                  {/* CTA */}
                  <div className="pt-1">
                    <Button type="submit" disabled={loading}
                      className="w-full h-12 rounded-xl text-[13.5px] font-bold text-white border-0 transition-all duration-150 hover:opacity-92 active:scale-[0.985]"
                      style={{
                        background: `linear-gradient(135deg, ${ap.accent} 0%, ${ap.accentDark} 100%)`,
                        boxShadow: `0 4px 20px ${ap.accent}45, 0 1px 3px rgba(0,0,0,0.12)`,
                      }}>
                      {loading
                        ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Signing in…</>
                        : <>{brandedSignInLabel}<ArrowRight className="ml-2 h-4 w-4" /></>
                      }
                    </Button>
                  </div>
                </form>

                {/* Demo credentials */}
                {demos.filter(d => d.portal === loginType).length > 0 && (
                  <div className="mt-5 rounded-xl border border-border/50 bg-muted/20 overflow-hidden">
                    <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border/40 bg-muted/30">
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">Demo Access</span>
                    </div>
                    {demos.filter(d => d.portal === loginType).map((du, i) => (
                      <div key={i} className="flex items-center justify-between px-4 py-2.5">
                        <div>
                          <p className="text-[12px] font-semibold text-foreground leading-tight">{du.role}</p>
                          <p className="text-[11px] text-muted-foreground/70">{du.email}</p>
                        </div>
                        <Button type="button" variant="outline" size="sm"
                          onClick={() => fillDemo(du.email, du.password)}
                          className="h-7 px-3.5 text-[11px] font-bold rounded-lg border-border/60 hover:border-primary/50 hover:text-primary hover:bg-primary/5 transition-all">
                          Use
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {/* SSL badge */}
                <div className="mt-5 flex items-center justify-center text-[11px] text-muted-foreground/40 gap-1.5">
                  <Lock className="h-3 w-3 text-emerald-500/70" />
                  Secured with 256-bit SSL
                </div>
              </div>
            )}

            <p className="mt-6 text-center text-[11px] text-muted-foreground/40 lg:hidden">© 2026 Vitana Private Limited</p>
          </div>
        </div>
      </div>
    </div>
  );
}
