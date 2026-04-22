import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Shield, Eye, EyeOff, Sun, Moon, Monitor, AlertTriangle, GraduationCap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Footer } from '@/components/layout/Footer';
import { useTheme } from '@/contexts/ThemeContext';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { superAdminLoginSchema, checkRateLimit } from '@/utils/authValidation';

export default function SuperAdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [rateLimitWarning, setRateLimitWarning] = useState<string | null>(null);
  
  const { login, loading, isAuthenticated, user } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Check for session expiry message
  useEffect(() => {
    if (searchParams.get('expired') === 'true') {
      setError('Your session has expired. Please log in again.');
    }
  }, [searchParams]);

  // Redirect if already authenticated as super admin
  useEffect(() => {
    if (isAuthenticated && user?.role === 'super_admin') {
      navigate('/super-admin-dashboard', { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

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
    const result = superAdminLoginSchema.safeParse({ email, password });
    
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
      setError(err instanceof Error ? err.message : 'Login failed. Please try again.');
    }
  };

  const fillSuperAdminCredentials = () => {
    setEmail('superadmin@vitana.in');
    setPassword('SuperAdmin@123');
    setError('');
    setFieldErrors({});
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left Panel - Premium Branding */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-[55%] relative overflow-hidden bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        {/* Decorative Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-purple-500/20 blur-3xl" />
          <div className="absolute -bottom-32 -left-32 w-80 h-80 rounded-full bg-blue-500/20 blur-3xl" />
          <div className="absolute top-1/2 left-1/3 w-64 h-64 rounded-full bg-indigo-500/15 blur-2xl" />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-10 lg:p-14 xl:p-16 w-full">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl shadow-lg">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-3xl xl:text-4xl font-extrabold text-white tracking-tight">VEDA</span>
              <span className="text-xs font-semibold text-white bg-white/20 px-2 py-0.5 rounded">SuperAdmin</span>
            </div>
          </div>

          {/* Hero Content */}
          <div className="space-y-6 my-auto">
            <div className="space-y-4">
              <p className="text-sm font-semibold tracking-wider uppercase text-purple-300">System Administration</p>
              <div className="w-16 h-1 rounded-full bg-purple-500/80 mt-2 mb-1 shadow-md" />
              <h1 className="text-4xl xl:text-5xl font-bold text-white leading-tight">
                Super Admin<br />
                <span className="text-purple-400">Control Center</span>
              </h1>
              <p className="text-base text-white/70 max-w-md leading-relaxed">
                Complete system oversight, school management, and administrative controls for the VEDA Education Platform.
              </p>
            </div>

            {/* Security Features */}
            <div className="space-y-3">
              <div className="flex items-center gap-4 p-4 rounded-xl bg-white/10 border border-white/10">
                <div className="p-2.5 rounded-lg bg-blue-500/30 text-blue-400">
                  <Shield className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-white text-sm">Multi-Factor Authentication</h3>
                  <p className="text-sm text-white/60">Enhanced security for admin access</p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 rounded-xl bg-white/10 border border-white/10">
                <div className="p-2.5 rounded-lg bg-purple-500/30 text-purple-400">
                  <GraduationCap className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-white text-sm">Multi-School Management</h3>
                  <p className="text-sm text-white/60">Oversee all institutions from one dashboard</p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="text-white/40 text-sm">
            © 2026 Vitana private limited • Super Admin Portal
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex flex-col min-h-screen lg:min-h-0 bg-background">
        {/* Header */}
        <div className="flex items-center justify-between p-6 lg:p-8">
          <div className="lg:hidden flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold text-foreground">Super Admin</span>
          </div>
          
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
                  Light
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme('dark')} className="rounded-lg">
                  <Moon className="mr-2 h-4 w-4" />
                  Dark
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme('system')} className="rounded-lg">
                  <Monitor className="mr-2 h-4 w-4" />
                  System
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Form Container */}
        <div className="flex-1 flex items-center justify-center px-6 pb-10 lg:px-16">
          <div className="w-full max-w-[400px] space-y-8">
            {/* Branding */}
            <div className="text-center space-y-4">
              <div className="inline-flex p-4 rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 shadow-lg">
                <Shield className="h-8 w-8 text-white" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl lg:text-3xl font-bold text-foreground tracking-tight">
                  Super Admin Portal
                </h2>
                <p className="text-muted-foreground text-sm">
                  Enter your super admin credentials to access the system
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
                  placeholder="superadmin@vitana.in"
                  required
                  autoComplete="email"
                  aria-invalid={!!fieldErrors.email}
                  aria-describedby={fieldErrors.email ? 'email-error' : undefined}
                  className={`h-12 rounded-xl border-border bg-background text-foreground placeholder:text-muted-foreground focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 ${
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
                    className={`h-12 rounded-xl border-border bg-background text-foreground placeholder:text-muted-foreground focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 pr-12 ${
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
                className="w-full h-12 rounded-xl text-base font-semibold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg transition-all duration-300" 
                disabled={loading}
              >
                {loading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                Access System
              </Button>
            </form>

            {/* Demo Credentials */}
            <Card className="border-border bg-muted/30 rounded-xl">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
                  <CardTitle className="text-sm font-semibold">Demo Credentials</CardTitle>
                </div>
                <CardDescription className="text-xs">Super Admin demo account for testing</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center py-2 px-3 rounded-lg bg-background/50 border border-border">
                    <span className="font-medium text-foreground">Super Admin</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={fillSuperAdminCredentials}
                      className="text-purple-600 hover:text-purple-700 hover:bg-purple-50 dark:hover:bg-purple-950 h-auto py-1.5 px-3 text-xs font-medium rounded-lg"
                    >
                      Use credentials
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Back Link */}
            <div className="text-center pt-2">
              <Link 
                to="/login" 
                className="text-sm text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1"
              >
                ← Back to School Login
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
