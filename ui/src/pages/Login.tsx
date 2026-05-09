import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSchool } from '../contexts/SchoolContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Loader2, Eye, EyeOff, Sun, Moon, Monitor, Building2, BarChart3, 
  Shield, Users, Clock, AlertTriangle, GraduationCap
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { loginSchema, checkRateLimit } from '@/utils/authValidation';

const features = [
  {
    icon: Building2,
    title: 'Multi-Institution Management',
    description: 'Unified dashboard for all your schools'
  },
  {
    icon: BarChart3,
    title: 'Real-time Analytics',
    description: 'Data-driven insights at your fingertips'
  },
  {
    icon: Shield,
    title: 'Enterprise Security',
    description: 'Bank-grade encryption & compliance'
  }
];

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [rateLimitWarning, setRateLimitWarning] = useState<string | null>(null);
  const [loginType, setLoginType] = useState<'admin' | 'staff' | 'parent'>('admin');
  const loginTypeRef = useRef<'admin' | 'staff' | 'parent'>('admin');
  loginTypeRef.current = loginType;
  
  const { login, logout, loading, isAuthenticated, user } = useAuth();
  const { schoolInfo } = useSchool();
  const { t } = useLanguage();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Check for session expiry message
  useEffect(() => {
    if (searchParams.get('expired') === 'true') {
      setError('Your session has expired. Please log in again.');
    }
  }, [searchParams]);

  // Redirect if already authenticated — enforce portal type restriction
  useEffect(() => {
    if (isAuthenticated && user) {
      const role = user.role?.toLowerCase() ?? '';
      const staffRoles = ['staff', 'teacher'];
      const isStaffRole = staffRoles.includes(role);
      const isParentRole = role === 'parent';
      const currentPortal = loginTypeRef.current;

      if (currentPortal === 'parent' && !isParentRole) {
        setError('This portal is for parents/guardians only. Please use the Administration or Staff login.');
        logout();
        return;
      }
      if (currentPortal === 'staff' && !isStaffRole) {
        setError('This portal is for teaching and non-teaching staff only. Please use the Administration login.');
        logout();
        return;
      }
      if (currentPortal === 'admin' && (isStaffRole || isParentRole)) {
        const hint = isStaffRole ? 'Staff members must use the Staff Login portal.' : 'Parents must use the Parent Portal.';
        setError(hint);
        logout();
        return;
      }

      const dashboardRoutes: Record<string, string> = {
        staff: '/staff-dashboard',
        admin: '/admin-dashboard',
        parent: '/parent-dashboard',
        super_admin: '/super-admin-dashboard',
      };
      const returnUrl = searchParams.get('returnUrl');
      navigate(returnUrl || dashboardRoutes[user.role?.toLowerCase()] || '/dashboard', { replace: true });
    }
  }, [isAuthenticated, user, navigate, searchParams, logout]);

  // Check rate limit on email change
  useEffect(() => {
    if (email.includes('@')) {
      const rateLimitStatus = checkRateLimit(email.toLowerCase());
      setRateLimitWarning(rateLimitStatus.message);
      if (!rateLimitStatus.allowed) {
        setError(rateLimitStatus.message || 'Too many attempts. Please try again later.');
      }
    } else {
      setRateLimitWarning(null);
    }
  }, [email]);

  const validateForm = (): boolean => {
    const result = loginSchema.safeParse({ email, password });
    
    if (!result.success) {
      const errors: { email?: string; password?: string } = {};
      result.error.errors.forEach((err) => {
        const field = err.path[0] as 'email' | 'password';
        errors[field] = err.message;
      });
      setFieldErrors(errors);
      return false;
    }
    
    setFieldErrors({});
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Check rate limit before submission
    const rateLimitStatus = checkRateLimit(email.toLowerCase());
    if (!rateLimitStatus.allowed) {
      setError(rateLimitStatus.message || 'Too many login attempts. Please try again later.');
      return;
    }

    // Validate form
    if (!validateForm()) {
      return;
    }

    try {
      await login(email, password);
    } catch (err) {
      // Don't log sensitive info
      setError(err instanceof Error ? err.message : 'Login failed. Please try again.');
    }
  };

  const demoUsers = [
    { email: 'admin@vitanaschools.edu', role: 'Admin', password: 'admin-dev-change-me', name: 'Admin User', portal: 'admin' },
    { email: 'amit.k@demo.edu', role: 'Teacher', password: 'Teacher@123', name: 'Amit Kapoor', portal: 'staff' },
    { email: 'parent@demo.edu', role: 'Parent', password: 'ParentDemo2026!', name: 'Arjun Sharma', portal: 'parent' }
  ];

  const fillDemoCredentials = (demoEmail: string, demoPassword: string) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setError('');
    setFieldErrors({});
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left Panel - Premium Branding Showcase */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-[55%] relative overflow-hidden bg-[#1e3a5f]">
        {/* Subtle Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#1e3a5f] via-[#1a3352] to-[#152a45]" />
        
        {/* Decorative Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-primary/20 blur-3xl" />
          <div className="absolute -bottom-32 -left-32 w-80 h-80 rounded-full bg-primary/15 blur-3xl" />
          <div className="absolute top-1/2 left-1/3 w-64 h-64 rounded-full bg-primary/10 blur-2xl" />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-10 lg:p-14 xl:p-16 w-full">
          {/* VEDA Pro Brand */}
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 backdrop-blur-md rounded-xl shadow-lg border border-white/20 hover:bg-white/15 transition-all">
              <img src="/favicon.ico" alt="VEDA Logo" className="h-6 w-6 filter brightness-0 invert" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-3xl xl:text-5xl font-extrabold text-white tracking-tight">VEDA</span>
              <span className="text-xs font-semibold text-white bg-white/20 px-2 py-0.5 rounded">Pro</span>
            </div>
          </div>

          {/* Hero Content */}
          <div className="space-y-8 my-auto">
            <div className="space-y-4">
              <p className="text-sm font-semibold tracking-wider uppercase text-blue-300">Education Management Platform</p>
              <div className="w-16 h-1 rounded-full bg-blue-500/80 mt-2 mb-1 shadow-md" />
              <h1 className="text-4xl xl:text-5xl font-bold text-white leading-tight">
                Excellence.<br />
                Innovation.<br />
                <span style={{ color: '#FFD700' }}>Growth.</span>
              </h1>
              <p className="text-base text-white/70 max-w-md leading-relaxed">
                Transform your institution with our comprehensive management system designed for modern education.
              </p>
            </div>

            {/* Feature Cards */}
            <div className="space-y-3">
              {features.map((feature, index) => (
                <div
                  key={index}
                  className="group flex items-center gap-4 p-4 rounded-xl bg-white/10 border border-white/10 hover:bg-white/15 transition-all duration-150"
                >
                  <div className="p-2.5 rounded-lg bg-primary/30 text-primary">
                    <feature.icon className="h-5 w-5 feature-icon-glow" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white text-sm">{feature.title}</h3>
                    <p className="text-sm text-white/60">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Stats Row */}
            <div className="flex items-center gap-6 pt-2">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-400" />
                <div>
                  <p className="text-lg font-bold text-white">1200+ hrs</p>
                  <p className="text-xs text-white/50">Saved Annually</p>
                  <p className="text-xs text-blue-300">Seamless digital processes</p>
                </div>
              </div>
              <div className="w-px h-8 bg-white/20" />
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-green-400" />
                <div>
                  <p className="text-lg font-bold text-white">98%</p>
                  <p className="text-xs text-white/50">Process Automation</p>
                  <p className="text-xs text-green-300">Manual work eliminated</p>
                </div>
              </div>
              <div className="w-px h-8 bg-white/20" />
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-yellow-400" />
                <div>
                  <p className="text-lg font-bold text-white">95%</p>
                  <p className="text-xs text-white/50">On-Time Fee Collection</p>
                  <p className="text-xs text-yellow-300">Digital payments</p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="text-white/40 text-sm">
            © 2026 Vitana private limited
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex flex-col min-h-screen lg:min-h-0 bg-background">
        {/* Header */}
        <div className="flex items-center justify-between p-6 lg:p-8">
          {/* Mobile VEDA Branding */}
          <div className="lg:hidden flex items-center gap-3">
            <div className="p-2 bg-primary/5 backdrop-blur-sm rounded-lg border border-primary/10">
              <img src="/favicon.ico" alt="VEDA Logo" className="h-5 w-5 filter drop-shadow-sm" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-bold text-foreground tracking-tight">VEDA</span>
              <span className="text-xs font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded">Pro</span>
            </div>
          </div>
          
          {/* Theme Toggle */}
          <div className="ml-auto">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="rounded-xl h-10 w-10 border-border">
                  {theme === 'light' && <Sun className="h-4 w-4" />}
                  {theme === 'dark' && <Moon className="h-4 w-4" />}
                  {theme === 'system' && <Monitor className="h-4 w-4" />}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-xl">
                <DropdownMenuItem onClick={() => setTheme('light')} className="rounded-lg">
                  <Sun className="mr-2 h-4 w-4" />
                  {t('settings.light')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme('dark')} className="rounded-lg">
                  <Moon className="mr-2 h-4 w-4" />
                  {t('settings.dark')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme('system')} className="rounded-lg">
                  <Monitor className="mr-2 h-4 w-4" />
                  {t('settings.system')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Form Container */}
        <div className="flex-1 flex items-center justify-center px-6 pb-10 lg:px-16">
          <div className="w-full max-w-[400px] space-y-8">
            {/* Portal Type Selector */}
            <div className="grid grid-cols-3 gap-2 p-1.5 rounded-2xl bg-muted/50 border border-border">
              <button
                type="button"
                onClick={() => { setLoginType('admin'); setError(''); }}
                className={`flex items-center justify-center gap-1.5 py-3 px-2 rounded-xl text-xs font-semibold transition-all duration-200 ${
                  loginType === 'admin'
                    ? 'bg-background text-foreground shadow-sm border border-border'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Shield className="h-4 w-4 flex-shrink-0" />
                Admin
              </button>
              <button
                type="button"
                onClick={() => { setLoginType('staff'); setError(''); }}
                className={`flex items-center justify-center gap-1.5 py-3 px-2 rounded-xl text-xs font-semibold transition-all duration-200 ${
                  loginType === 'staff'
                    ? 'bg-background text-foreground shadow-sm border border-border'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <GraduationCap className="h-4 w-4 flex-shrink-0" />
                Staff
              </button>
              <button
                type="button"
                onClick={() => { setLoginType('parent'); setError(''); }}
                className={`flex items-center justify-center gap-1.5 py-3 px-2 rounded-xl text-xs font-semibold transition-all duration-200 ${
                  loginType === 'parent'
                    ? 'bg-background text-foreground shadow-sm border border-border'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Users className="h-4 w-4 flex-shrink-0" />
                Parent
              </button>
            </div>

            {/* School Branding */}
            <div className="text-center space-y-4">
              {schoolInfo?.logoUrl && (
                <div className="inline-flex p-3 rounded-2xl bg-muted/50 border border-border">
                  <img 
                    src={schoolInfo.logoUrl} 
                    alt={`${schoolInfo.name} Logo`}
                    className="w-16 h-16 object-contain rounded-xl"
                  />
                </div>
              )}
              <div className="space-y-2">
                <h2 className="text-2xl lg:text-3xl font-bold text-foreground tracking-tight">
                  {loginType === 'staff' ? 'Staff Login' : loginType === 'parent' ? 'Parent Portal' : 'Admin Login'}
                </h2>
                <p className="text-muted-foreground text-sm">
                  {loginType === 'staff'
                    ? 'Principal, Teacher, Warden & all school staff'
                    : loginType === 'parent'
                    ? 'Sign in with your registered email and password'
                    : <>Sign in to <span className="font-medium text-foreground">{schoolInfo?.name || 'your account'}</span></>
                  }
                </p>
              </div>
            </div>

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-foreground text-sm font-medium">
                  Email address
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (fieldErrors.email) setFieldErrors(prev => ({ ...prev, email: undefined }));
                  }}
                  placeholder="admin@school.edu"
                  required
                  autoComplete="email"
                  aria-invalid={!!fieldErrors.email}
                  aria-describedby={fieldErrors.email ? 'email-error' : undefined}
                  className={`h-12 rounded-xl border-border bg-background text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 ${
                    fieldErrors.email ? 'border-destructive focus:border-destructive focus:ring-destructive/20' : ''
                  }`}
                />
                {fieldErrors.email && (
                  <p id="email-error" className="text-sm text-destructive flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    {fieldErrors.email}
                  </p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password" className="text-foreground text-sm font-medium">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (fieldErrors.password) setFieldErrors(prev => ({ ...prev, password: undefined }));
                    }}
                    placeholder="Enter your password"
                    required
                    autoComplete="current-password"
                    aria-invalid={!!fieldErrors.password}
                    aria-describedby={fieldErrors.password ? 'password-error' : undefined}
                    className={`h-12 rounded-xl border-border bg-background text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 pr-12 ${
                      fieldErrors.password ? 'border-destructive focus:border-destructive focus:ring-destructive/20' : ''
                    }`}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-10 w-10 p-0 hover:bg-muted rounded-lg"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
                {fieldErrors.password && (
                  <p id="password-error" className="text-sm text-destructive flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    {fieldErrors.password}
                  </p>
                )}
              </div>

              {/* Rate Limit Warning */}
              {rateLimitWarning && !error && (
                <Alert className="rounded-xl border-yellow-500/50 bg-yellow-500/10">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <AlertDescription className="text-yellow-700 dark:text-yellow-400">
                    {rateLimitWarning}
                  </AlertDescription>
                </Alert>
              )}

              {error && (
                <Alert variant="destructive" className="rounded-xl border-destructive/50 bg-destructive/10">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-destructive">{error}</AlertDescription>
                </Alert>
              )}

              <Button 
                type="submit" 
                className="w-full h-12 rounded-xl text-base font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 transition-all duration-300 hover:shadow-xl hover:shadow-primary/30" 
                disabled={loading}
              >
                {loading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                {loginType === 'staff' ? 'Sign in to Staff Portal' : loginType === 'parent' ? 'Sign in to Parent Portal' : 'Sign In'}
              </Button>
            </form>

            {/* Demo Credentials */}
            <div className="rounded-xl border border-border bg-muted/30 p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                <span className="text-sm font-semibold text-foreground">Demo Credentials</span>
              </div>
              <div className="space-y-2.5">
                {demoUsers.filter(d => d.portal === loginType).map((demoUser, index) => (
                  <div 
                    key={index} 
                    className="flex items-center justify-between py-1"
                  >
                    <span className="text-muted-foreground text-sm">{demoUser.role}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => fillDemoCredentials(demoUser.email, demoUser.password)}
                      className="text-primary hover:text-primary hover:bg-primary/10 h-auto py-1.5 px-3 text-xs font-medium rounded-lg"
                    >
                      Use credentials
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* Super Admin Link */}
            <div className="text-center pt-2">
              <Link 
                to="/super-admin-login" 
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                {t('auth.superAdminAccess')}
              </Link>
            </div>

            {/* Mobile Footer */}
            <div className="text-center text-xs text-muted-foreground pt-6 lg:hidden">
              © 2026 Vitana private limited
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
