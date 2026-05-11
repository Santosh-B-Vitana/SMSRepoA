import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSchool } from '../contexts/SchoolContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Loader2, Eye, EyeOff, Sun, Moon, Monitor,
  Shield, Users, GraduationCap, AlertTriangle, ArrowRight,
  Lock, CheckCircle2,
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
] as const;
type PortalId = typeof PORTALS[number]['id'];

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
  const loginTypeRef = useRef<PortalId>('admin');
  loginTypeRef.current = loginType;

  const { login, logout, loading, isAuthenticated, user } = useAuth();
  const { schoolInfo } = useSchool();
  const { t } = useLanguage();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (searchParams.get('expired') === 'true') setError('Your session has expired. Please log in again.');
  }, [searchParams]);

  useEffect(() => {
    if (!isAuthenticated || !user) return;
    const role = user.role?.toLowerCase() ?? '';
    const isStaff  = ['staff', 'teacher'].includes(role);
    const isParent = role === 'parent';
    const portal   = loginTypeRef.current;
    if (portal === 'parent' && !isParent) { setError('This portal is for parents/guardians only.'); logout(); return; }
    if (portal === 'staff'  && !isStaff)  { setError('This portal is for school staff only.');      logout(); return; }
    if (portal === 'admin'  && (isStaff || isParent)) {
      setError(isStaff ? 'Staff must use the Staff Login.' : 'Parents must use the Parent Portal.');
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
  ];

  const ap = PORTALS.find(p => p.id === loginType)!;

  const subtitles: Record<PortalId, string> = {
    admin:  schoolInfo?.name ? `Administration · ${schoolInfo.name}` : 'School administration console',
    staff:  'For principals, teachers, wardens & support staff',
    parent: "Track your child's progress, attendance & fees",
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
              <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-emerald-400 border-[2.5px]"
                style={{ borderColor: '#070E20' }} />
            </div>
            <div className="flex items-baseline gap-2">
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
      <div className="flex-1 flex flex-col relative bg-background">

        {/* Theme picker */}
        <div className="absolute top-5 right-5 z-10">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl border border-border/60 hover:bg-muted/60">
                {theme === 'light'  && <Sun className="h-4 w-4" />}
                {theme === 'dark'   && <Moon className="h-4 w-4" />}
                {theme === 'system' && <Monitor className="h-4 w-4" />}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-xl">
              <DropdownMenuItem onClick={() => setTheme('light')}  className="gap-2 rounded-lg"><Sun className="h-4 w-4" />{t('settings.light')}</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme('dark')}   className="gap-2 rounded-lg"><Moon className="h-4 w-4" />{t('settings.dark')}</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme('system')} className="gap-2 rounded-lg"><Monitor className="h-4 w-4" />{t('settings.system')}</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-2.5 px-6 pt-6">
          <div className="h-9 w-9 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #3B82F6, #2563EB)', boxShadow: '0 4px 16px rgba(59,130,246,0.38)' }}>
            <img src="/favicon.ico" alt="VEDA" className="h-5 w-5 filter brightness-0 invert" />
          </div>
          <span className="font-black text-xl text-foreground">VEDA</span>
          <span className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-full"
            style={{ color: '#3B82F6', border: '1px solid rgba(59,130,246,0.38)', background: 'rgba(59,130,246,0.08)' }}>Pro</span>
        </div>

        {/* ── Main centered content ── */}
        <div className="flex-1 flex items-center justify-center px-6 py-10 lg:px-12">
          <div className="w-full max-w-[400px]">

            {/* Portal tab switcher */}
            <div className="flex relative border-b border-border mb-8">
              {PORTALS.map(p => {
                const Icon = p.icon;
                const active = loginType === p.id;
                return (
                  <button key={p.id} type="button"
                    onClick={() => { setLoginType(p.id); setError(''); setFieldErrors({}); }}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-semibold transition-colors relative ${
                      active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    {p.label}
                    {active && (
                      <span className="absolute bottom-[-1px] left-1/2 -translate-x-1/2 h-[2.5px] w-full rounded-full transition-all duration-300"
                        style={{ background: ap.accent }} />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Heading */}
            <div className="mb-7">
              {schoolInfo?.logoUrl && (
                <div className="mb-4 h-12 w-12 rounded-xl overflow-hidden border border-border bg-muted/40 flex items-center justify-center">
                  <img src={schoolInfo.logoUrl} alt={schoolInfo.name} className="h-10 w-10 object-contain" />
                </div>
              )}
              <h2 className="text-[1.85rem] font-black text-foreground tracking-tight leading-none">{ap.full}</h2>
              <p className="text-sm text-muted-foreground mt-1.5">{subtitles[loginType]}</p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>

              <div className="space-y-1.5">
                <label htmlFor="email" className="text-[13px] font-semibold text-foreground">Email address</label>
                <Input
                  id="email" type="email" value={email}
                  onChange={e => { setEmail(e.target.value); if (fieldErrors.email) setFieldErrors(p => ({ ...p, email: undefined })); }}
                  placeholder="you@school.edu"
                  required autoComplete="email"
                  aria-invalid={!!fieldErrors.email}
                  className={`h-11 rounded-xl bg-muted/30 border-border placeholder:text-muted-foreground/50 focus-visible:ring-1 transition-all text-sm ${
                    fieldErrors.email ? 'border-destructive focus-visible:ring-destructive/50' : 'focus-visible:border-primary focus-visible:ring-primary/30'
                  }`}
                />
                {fieldErrors.email && (
                  <p className="text-xs text-destructive flex items-center gap-1 mt-1">
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
                    placeholder="Enter your password"
                    required autoComplete="current-password"
                    aria-invalid={!!fieldErrors.password}
                    className={`h-11 rounded-xl bg-muted/30 border-border placeholder:text-muted-foreground/50 pr-11 focus-visible:ring-1 transition-all text-sm ${
                      fieldErrors.password ? 'border-destructive focus-visible:ring-destructive/50' : 'focus-visible:border-primary focus-visible:ring-primary/30'
                    }`}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1 rounded"
                    aria-label={showPassword ? 'Hide' : 'Show'}>
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {fieldErrors.password && (
                  <p className="text-xs text-destructive flex items-center gap-1 mt-1">
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

              {/* Submit button — portal-colored gradient */}
              <Button type="submit" disabled={loading}
                className="w-full h-11 rounded-xl text-sm font-bold text-white border-0 shadow-lg transition-all duration-150 hover:opacity-90 active:scale-[0.98] mt-2"
                style={{ background: `linear-gradient(135deg, ${ap.accent} 0%, ${ap.accentDark} 100%)`, boxShadow: `0 4px 24px ${ap.accent}40` }}>
                {loading
                  ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Signing in…</>
                  : <>Sign in to {ap.full} <ArrowRight className="ml-1.5 h-4 w-4" /></>
                }
              </Button>
            </form>

            {/* Demo credentials */}
            {demos.filter(d => d.portal === loginType).length > 0 && (
              <div className="mt-6 rounded-2xl border border-border/60 bg-muted/20 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Demo Access</span>
                </div>
                {demos.filter(d => d.portal === loginType).map((du, i) => (
                  <div key={i} className="flex items-center justify-between py-1.5">
                    <div>
                      <p className="text-xs font-semibold text-foreground">{du.role}</p>
                      <p className="text-[11px] text-muted-foreground leading-tight">{du.email}</p>
                    </div>
                    <Button type="button" variant="outline" size="sm"
                      onClick={() => fillDemo(du.email, du.password)}
                      className="h-7 px-3 text-[11px] font-semibold rounded-lg hover:border-primary/50 hover:text-primary transition-colors">
                      Use
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Footer links */}
            <div className="mt-5 flex items-center justify-between text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Lock className="h-3 w-3 text-emerald-500" />
                Secured with 256-bit SSL
              </span>
              <Link to="/super-admin-login" className="hover:text-primary transition-colors font-medium">
                {t('auth.superAdminAccess')}
              </Link>
            </div>

            <p className="mt-8 text-center text-[11px] text-muted-foreground lg:hidden">© 2026 Vitana Private Limited</p>
          </div>
        </div>
      </div>
    </div>
  );
}
