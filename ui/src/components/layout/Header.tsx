
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSchool } from '@/contexts/SchoolContext';
import { useAcademicYear } from '@/contexts/AcademicYearContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useSidebar } from '@/components/ui/sidebar';
import { GraduationCap, ChevronDown, Building2, Shield } from 'lucide-react';
import { UniversalSearch } from '@/components/search/UniversalSearch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useNavigate } from 'react-router-dom';
import { NotificationCenter } from '@/components/notifications';
import { useSuperAdminSchool } from '@/contexts/SuperAdminSchoolContext';
import { UserMenuDropdown } from '@/components/layout/UserMenuDropdown';

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
  const { user } = useAuth();
  const { t } = useLanguage();
  const { schoolInfo } = useSchool();
  const { selectedSchool } = useSuperAdminSchool();
  const { currentYear, availableYears, setCurrentYear } = useAcademicYear();
  const navigate = useNavigate();
  const isSuperAdmin = user?.role === "super_admin";
  const headerSchoolName = (isSuperAdmin ? selectedSchool?.name : undefined) || schoolInfo?.name || 'School Management System';
  const headerSchoolLogo = (isSuperAdmin ? selectedSchool?.logo : undefined) || schoolInfo?.logoUrl;

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
        <div className="relative group shrink-0">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/10 rounded-xl blur-md group-hover:blur-lg transition-all opacity-0 group-hover:opacity-100"></div>
          {headerSchoolLogo ? (
            <img
              src={headerSchoolLogo}
              alt={`${headerSchoolName} Logo`}
              className="relative w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 object-contain rounded-xl shadow-lg transition-all duration-150 group-hover:scale-110 ring-2 ring-border group-hover:ring-primary/50 bg-background"
            />
          ) : (
            <div className="relative w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 rounded-xl border-2 border-border bg-muted/40 flex items-center justify-center">
              <Building2 className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-muted-foreground" />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1 overflow-hidden">
          <h1 className="font-bold text-base sm:text-lg lg:text-xl bg-gradient-to-r from-primary via-primary/90 to-primary/70 bg-clip-text text-transparent truncate">
            {headerSchoolName}
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
      
      {/* User menu — fully wired with real dialogs */}
      <UserMenuDropdown />
    </header>
  );
}
