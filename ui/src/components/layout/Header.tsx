
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage, Language } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useSchool } from '@/contexts/SchoolContext';
import { useAcademicYear } from '@/contexts/AcademicYearContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from '@/components/ui/dropdown-menu';
import { useSidebar } from '@/components/ui/sidebar';
import { LogOut, Settings, User, BadgeCheck, CreditCard, Bell, Sun, Moon, Monitor, GraduationCap, ChevronDown, Building2, Shield } from 'lucide-react';
import { UniversalSearch } from '@/components/search/UniversalSearch';
import { CenteredModal } from '@/components/common/CenteredModal';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useNavigate } from 'react-router-dom';
import { NotificationCenter } from '@/components/notifications';
import { useSuperAdminSchool } from '@/contexts/SuperAdminSchoolContext';

// ── Super Admin School Switcher ──────────────────────────────────────────────
// Separate component so it can safely call useSuperAdminSchool()
// (it's only rendered when SuperAdminSchoolProvider is present in the tree)
function SuperAdminSchoolSwitcher() {
  const { schools, selectedSchoolId, setSelectedSchoolId } = useSuperAdminSchool();

  return (
    <div className="flex items-center gap-1.5 shrink-0">
      <Shield className="h-3.5 w-3.5 text-orange-500 shrink-0" />
      <Select value={selectedSchoolId} onValueChange={setSelectedSchoolId}>
        <SelectTrigger className="h-8 text-xs font-semibold border-orange-300 bg-orange-50 dark:bg-orange-950/20 text-orange-700 dark:text-orange-300 max-w-[180px] sm:max-w-[220px]">
          <SelectValue placeholder="Select school…" />
        </SelectTrigger>
        <SelectContent>
          {schools.map((s) => (
            <SelectItem key={s.id} value={s.id} textValue={s.name} className="text-sm">
              <span className="flex items-center gap-2">
                <Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                {s.name}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function Header() {
  const { toggleSidebar } = useSidebar();
  const { user, logout } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const { theme, setTheme } = useTheme();
  const { schoolInfo } = useSchool();
  const { currentYear, availableYears, setCurrentYear } = useAcademicYear();
  const navigate = useNavigate();
  const isSuperAdmin = user?.role === "super_admin";

  const handleLogout = () => {
    logout();
  };

  const getUserInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Dialog state for Account, Billing, Notifications
  const [accountOpen, setAccountOpen] = React.useState(false);
  const [billingOpen, setBillingOpen] = React.useState(false);
  const [notificationsOpen, setNotificationsOpen] = React.useState(false);
  const [profileOpen, setProfileOpen] = React.useState(false);
  const [settingsOpen, setSettingsOpen] = React.useState(false);

  // Language change handler with immediate UI update
  const handleLanguageChange = (newLanguage: Language) => {
    setLanguage(newLanguage);
    // Force re-render by closing and reopening the dialog
    setTimeout(() => {
      setSettingsOpen(false);
      setTimeout(() => setSettingsOpen(true), 100);
    }, 50);
  };

  // Determine if school is pro or not (mock: if schoolInfo.plan === 'Pro')
  // For now, let's assume schoolInfo has a 'plan' property, fallback to 'Pro' if missing
  const isPro = (schoolInfo as any)?.plan === 'Pro' || (schoolInfo as any)?.plan === 'Enterprise';

  return (
  <header className="flex h-14 sm:h-16 lg:h-18 items-center gap-2 sm:gap-4 border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-3 sm:px-4 lg:px-6 sticky top-0 z-40">
      {/* Modern sidebar trigger with enhanced visual feedback */}
      <button
        className="lg:hidden h-9 w-9 sm:h-8 sm:w-8 flex flex-col justify-center items-center focus:outline-none rounded-lg hover:bg-accent/50 transition-all duration-200 group"
        aria-label="Open navigation menu"
        onClick={toggleSidebar}
      >
        <span className="block w-5 h-0.5 bg-foreground mb-1 rounded-full transition-all group-hover:bg-primary"></span>
        <span className="block w-5 h-0.5 bg-foreground mb-1 rounded-full transition-all group-hover:bg-primary"></span>
        <span className="block w-5 h-0.5 bg-foreground rounded-full transition-all group-hover:bg-primary"></span>
      </button>
      {/* Professional school branding with modern design */}
      <div className="flex items-center gap-3 flex-1 min-w-0 header-school-info">
        {schoolInfo?.logoUrl && (
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/10 rounded-xl blur-md group-hover:blur-lg transition-all opacity-0 group-hover:opacity-100"></div>
            <img 
              src={schoolInfo.logoUrl} 
              alt={`${schoolInfo.name} Logo`}
              className="relative w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 object-contain rounded-xl shadow-lg flex-shrink-0 transition-all duration-150 group-hover:scale-110 ring-2 ring-border group-hover:ring-primary/50"
            />
          </div>
        )}
        <div className="min-w-0 flex-1 overflow-hidden">
          <h1 className="font-bold text-base sm:text-lg lg:text-xl bg-gradient-to-r from-primary via-primary/90 to-primary/70 bg-clip-text text-transparent truncate">
            {schoolInfo?.name || 'School Management System'}
          </h1>
          <p className="text-[10px] sm:text-xs text-muted-foreground/80 hidden sm:block tracking-wide">
            Excellence • Innovation • Growth
          </p>
        </div>
      </div>
      {/* Enhanced Universal Search for Admin and Super Admin */}
      {(user?.role === "admin" || user?.role === "super_admin") && (
        <div className="flex-1 flex justify-center max-w-sm lg:max-w-md">
          <UniversalSearch className="w-full" />
        </div>
      )}

      {/* Super Admin School Context Switcher — shown only for super_admin */}
      {isSuperAdmin && <SuperAdminSchoolSwitcher />}

      {/* Academic Year Selector — admin & principal can switch; staff/parent see current year as read-only badge */}
      {(user?.role === 'admin' || user?.role === 'principal') && availableYears.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={`flex items-center gap-1.5 h-8 px-2 sm:px-3 text-xs font-semibold border-primary/30 bg-primary/5 hover:bg-primary/10 text-primary transition-all rounded-lg ${!currentYear?.isCurrent ? 'border-amber-400 bg-amber-50 text-amber-700 hover:bg-amber-100' : ''}`}
            >
              <GraduationCap className="h-3.5 w-3.5 shrink-0" />
              <span className="hidden md:inline">{currentYear?.name ?? 'Year'}</span>
              <span className="md:hidden text-[11px]">{currentYear?.name ?? 'Yr'}</span>
              {!currentYear?.isCurrent && <span className="hidden sm:inline text-[9px] font-bold uppercase tracking-wider ml-0.5 opacity-75">Historical</span>}
              <ChevronDown className="h-3 w-3 opacity-60" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52 z-[10000]">
            <DropdownMenuLabel className="text-xs text-muted-foreground pb-1">Academic Year</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {availableYears.map((yr) => (
              <DropdownMenuItem
                key={yr.id}
                onClick={() => setCurrentYear(yr)}
                className={`text-sm cursor-pointer ${currentYear?.id === yr.id ? 'font-semibold text-primary bg-primary/5' : ''}`}
              >
                <GraduationCap className="h-3.5 w-3.5 mr-2 opacity-60" />
                {yr.name}
                {yr.isCurrent && (
                  <span className="ml-auto text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-semibold">Active</span>
                )}
              </DropdownMenuItem>
            ))}
            {!currentYear?.isCurrent && (
              <>
                <DropdownMenuSeparator />
                <div className="px-3 py-1.5 text-[10px] text-amber-600 bg-amber-50">
                  Viewing historical data — changes won&apos;t affect the current year
                </div>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      {/* Staff and parent always see the current academic year — no switching allowed */}
      {(user?.role === 'staff' || user?.role === 'parent') && currentYear && (
        <div
          title="Current academic year (read-only)"
          className="flex items-center gap-1.5 h-8 px-2 sm:px-3 text-xs font-semibold border border-primary/30 bg-primary/5 text-primary rounded-lg cursor-default select-none"
        >
          <GraduationCap className="h-3.5 w-3.5 shrink-0" />
          <span className="hidden md:inline">{currentYear.name}</span>
          <span className="md:hidden text-[11px]">{currentYear.name}</span>
        </div>
      )}
      {/* Notification Center */}
      {user?.role !== 'parent' && (
        <NotificationCenter />
      )}
      
      {/* User menu styled like NavUser, with photo and details */}
      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-9 w-9 sm:w-36 lg:h-11 lg:w-60 rounded-xl px-1 sm:px-3 flex items-center gap-2 sm:gap-3 hover:bg-accent/50 transition-all duration-200 group">
              <Avatar className="h-7 w-7 sm:h-8 sm:w-8 rounded-xl ring-2 ring-background shadow-md group-hover:ring-primary/20 transition-all">
                <AvatarImage src={user?.avatar || "/placeholder.svg"} alt={user?.name || 'User'} />
                <AvatarFallback className="rounded-xl text-xs font-semibold bg-gradient-to-br from-primary/10 to-primary/5">
                  {user?.name ? getUserInitials(user.name) : 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="hidden sm:grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold text-xs sm:text-sm group-hover:text-primary transition-colors">{user?.name}</span>
                <span className="truncate text-xs text-muted-foreground">{user?.email}</span>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56 min-w-56 rounded-lg bg-popover text-popover-foreground border border-border z-[10000]" align="end" forceMount>
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={user?.avatar || "/placeholder.svg"} alt={user?.name || 'User'} />
                  <AvatarFallback className="rounded-lg">
                    {user?.name ? getUserInitials(user.name) : 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">{user?.name}</span>
                  <span className="truncate text-xs">{user?.email}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {/* Removed Upgrade to Pro for admin and super admin */}
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => setAccountOpen(true)} className="cursor-pointer">
                <BadgeCheck className="mr-2 h-4 w-4 text-green-500" />
                <span>{t('nav.account')}</span>
              </DropdownMenuItem>
              {user?.role !== 'parent' && user?.role !== 'staff' && (
                <DropdownMenuItem onClick={() => setBillingOpen(true)} className="cursor-pointer">
                  <CreditCard className="mr-2 h-4 w-4 text-blue-500" />
                  <span>{t('nav.billing')}</span>
                </DropdownMenuItem>
              )}
              {user?.role !== 'parent' && (
                <DropdownMenuItem onClick={() => setNotificationsOpen(true)} className="cursor-pointer">
                  <Bell className="mr-2 h-4 w-4 text-pink-500 animate-bounce" />
                  <span>{t('notifications.title')}</span>
                </DropdownMenuItem>
              )}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer" onClick={() => setProfileOpen(true)}>
              <User className="mr-2 h-4 w-4" />
              <span>{t('nav.profile')}</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer" onClick={() => setSettingsOpen(true)}>
              <Settings className="mr-2 h-4 w-4" />
              <span>{t('nav.preferences')}</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              className="cursor-pointer text-destructive focus:text-destructive"
              onClick={handleLogout}
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>{t('nav.logout')}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
  {/* Elegant dialogs for Account, Billing, Notifications, Profile, Settings */}
        {/* Profile Dialog */}
        {profileOpen && (
          <CenteredModal open={profileOpen} onClose={() => setProfileOpen(false)} ariaLabel="Profile dialog">
            <div className="bg-background border rounded-xl shadow-2xl p-8 w-full max-w-md mx-auto animate-enter relative">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xl font-bold flex items-center gap-2"><User className="text-purple-500" /> {t('nav.profile')}</h2>
                <div>
                  <Button size="sm" variant="ghost" onClick={() => {
                    // Close profile modal and open the dashboard settings (profile subtab)
                    setProfileOpen(false);
                    navigate('/admin-dashboard?tab=settings&sub=profile');
                  }}>
                    Edit
                  </Button>
                </div>
              </div>
              <p className="text-muted-foreground mb-4">{t('profile.profileDescription')}</p>
              <div className="mb-4 space-y-3">
                <div>
                  <div className="font-semibold text-sm text-muted-foreground">{t('profile.name')}</div>
                  <div className="text-foreground">{user?.name}</div>
                </div>
                <div>
                  <div className="font-semibold text-sm text-muted-foreground">{t('common.email')}</div>
                  <div className="text-foreground">{user?.email}</div>
                </div>
                <div>
                  <div className="font-semibold text-sm text-muted-foreground">{t('profile.role')}</div>
                  <div className="text-foreground capitalize">{user?.role}</div>
                </div>
              </div>
              <Button variant="outline" className="w-full" onClick={() => setProfileOpen(false)}>{t('common.close')}</Button>
            </div>
          </CenteredModal>
        )}
        {/* Settings Dialog */}
        {settingsOpen && (
          <CenteredModal open={settingsOpen} onClose={() => setSettingsOpen(false)} ariaLabel="Settings dialog">
            <div className="bg-background border rounded-xl shadow-2xl p-8 w-full max-w-md mx-auto animate-enter relative">
              <h2 className="text-xl font-bold mb-2 flex items-center gap-2"><Settings className="text-muted-foreground" /> {t('nav.preferences')}</h2>
              <p className="text-muted-foreground mb-4">{t('nav.preferencesDesc')}</p>
              <div className="mb-4 space-y-3">
                <div>
                  <div className="font-semibold text-sm text-muted-foreground">{t('settings.theme')}</div>
                  <div className="text-foreground">{t('settings.systemDefault')}</div>
                </div>
                <div>
                  <div className="font-semibold text-sm text-muted-foreground">{t('notifications.title')}</div>
                  <div className="text-foreground">{t('settings.enabled')}</div>
                </div>
                <div>
                  <div className="font-semibold text-sm text-muted-foreground">{t('settings.language')}</div>
                  <Select value={language} onValueChange={handleLanguageChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={t('settings.selectLanguage')} />
                    </SelectTrigger>
                    <SelectContent className="z-[10001] bg-popover text-popover-foreground border border-border shadow-md">
                      <SelectItem value="en">{t('settings.english')}</SelectItem>
                      <SelectItem value="hi">{t('settings.hindi')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <div className="font-semibold text-sm text-muted-foreground">{t('settings.theme')}</div>
                  <Select value={theme} onValueChange={setTheme}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={t('settings.selectTheme')} />
                    </SelectTrigger>
                    <SelectContent className="z-[10001] bg-popover text-popover-foreground border border-border shadow-md">
                      <SelectItem value="light">
                        <div className="flex items-center gap-2">
                          <Sun className="h-4 w-4" />
                          {t('settings.light')}
                        </div>
                      </SelectItem>
                      <SelectItem value="dark">
                        <div className="flex items-center gap-2">
                          <Moon className="h-4 w-4" />
                          {t('settings.dark')}
                        </div>
                      </SelectItem>
                      <SelectItem value="system">
                        <div className="flex items-center gap-2">
                          <Monitor className="h-4 w-4" />
                          {t('settings.system')}
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {(user?.role === 'admin' || user?.role === 'super_admin') && (
                <Button 
                  variant="default" 
                  className="w-full mb-2" 
                  onClick={() => {
                    // Close the modal and navigate to admin dashboard with settings tab active
                    setSettingsOpen(false);
                    navigate('/admin-dashboard?tab=settings');
                  }}
                >
                  <Settings className="mr-2 h-4 w-4" />
                  View Full Settings
                </Button>
              )}
              <Button variant="outline" className="w-full" onClick={() => setSettingsOpen(false)}>{t('common.close')}</Button>
            </div>
          </CenteredModal>
        )}
        {/* Account Dialog */}
        {accountOpen && (
          <CenteredModal open={accountOpen} onClose={() => setAccountOpen(false)} ariaLabel="Account dialog">
            <div className="bg-background border rounded-xl shadow-2xl p-8 w-full max-w-md mx-auto animate-enter relative">
              <h2 className="text-xl font-bold mb-2 flex items-center gap-2"><BadgeCheck className="text-green-500" /> Account</h2>
              <p className="text-muted-foreground mb-4">Manage your account details and preferences.</p>
              <div className="mb-4 space-y-3">
                <div>
                  <div className="font-semibold text-sm text-muted-foreground">Name</div>
                  <div className="text-foreground">{user?.name}</div>
                </div>
                <div>
                  <div className="font-semibold text-sm text-muted-foreground">Email</div>
                  <div className="text-foreground">{user?.email}</div>
                </div>
                <div>
                  <div className="font-semibold text-sm text-muted-foreground">Account Status</div>
                  <div className="text-green-600 flex items-center gap-1">
                    <BadgeCheck className="h-4 w-4" /> Active
                  </div>
                </div>
              </div>
              <Button variant="outline" className="w-full" onClick={() => setAccountOpen(false)}>Close</Button>
            </div>
          </CenteredModal>
        )}
        {/* Billing Dialog */}
        {billingOpen && (
          <CenteredModal open={billingOpen} onClose={() => setBillingOpen(false)} ariaLabel="Billing dialog">
            <div className="bg-background border rounded-xl shadow-2xl p-8 w-full max-w-md mx-auto animate-enter relative">
              <h2 className="text-xl font-bold mb-2 flex items-center gap-2"><CreditCard className="text-blue-500" /> Billing</h2>
              <p className="text-muted-foreground mb-4">View and manage your billing information.</p>
              <div className="mb-4 space-y-3">
                <div>
                  <div className="font-semibold text-sm text-muted-foreground">Current Plan</div>
                  <div className="text-foreground font-medium">{(schoolInfo as any)?.plan || 'Pro'}</div>
                </div>
                <div>
                  <div className="font-semibold text-sm text-muted-foreground">School</div>
                  <div className="text-foreground">{schoolInfo?.name}</div>
                </div>
                <div>
                  <div className="font-semibold text-sm text-muted-foreground">Billing Status</div>
                  <div className="text-green-600 flex items-center gap-1">
                    <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                    Current
                  </div>
                </div>
              </div>
              <Button variant="outline" className="w-full" onClick={() => setBillingOpen(false)}>Close</Button>
            </div>
          </CenteredModal>
        )}
        {/* Notifications Dialog */}
        {notificationsOpen && (
          <CenteredModal open={notificationsOpen} onClose={() => setNotificationsOpen(false)} ariaLabel="Notifications dialog">
            <div className="bg-background border rounded-xl shadow-2xl p-8 w-full max-w-md mx-auto animate-enter relative">
              <h2 className="text-xl font-bold mb-2 flex items-center gap-2"><Bell className="text-amber-500" /> Notifications</h2>
              <p className="text-muted-foreground mb-4">Your recent notifications will appear here.</p>
              <div className="mb-4 space-y-2 max-h-48 overflow-y-auto">
                <div className="bg-accent/50 rounded-lg px-3 py-2 border border-border/50">
                  <div className="flex items-center gap-2 text-sm">
                    <Bell className="text-amber-500 h-4 w-4" />
                    <div>
                      <div className="font-medium">Welcome to Vitana Schools!</div>
                      <div className="text-xs text-muted-foreground">System notification</div>
                    </div>
                  </div>
                </div>
                <div className="bg-accent/50 rounded-lg px-3 py-2 border border-border/50">
                  <div className="flex items-center gap-2 text-sm">
                    <Bell className="text-green-500 h-4 w-4" />
                    <div>
                      <div className="font-medium">Your account is active</div>
                      <div className="text-xs text-muted-foreground">Account status</div>
                    </div>
                  </div>
                </div>
              </div>
              <Button variant="outline" className="w-full" onClick={() => setNotificationsOpen(false)}>Close</Button>
            </div>
          </CenteredModal>
        )}
      </div>
    </header>
  );
}
