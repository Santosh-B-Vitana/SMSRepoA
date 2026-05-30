import * as React from "react"
import { GraduationCap, Users, UserCheck, BookOpen, Award, Clock, Bus, Heart, DollarSign, MessageSquare, Settings, User, Building, Library, Wallet, School, ShoppingBag, LayoutDashboard, Shield, UserCog, Home, BarChart3, UserPlus, Calendar, Bell, ClipboardList, HeartPulse, Banknote, Truck, CalendarCheck, Star, FileText, Megaphone, Receipt, type LucideIcon } from "lucide-react"
import { NavMain } from "@/components/sidebar/nav-main"
import { TeamSwitcher } from "@/components/sidebar/team-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"
import { useAuth } from "@/contexts/AuthContext"
import { useLanguage } from "@/contexts/LanguageContext"
import { usePermissions, type ModuleName } from "@/contexts/PermissionsContext"

type NavItem = {
  title: string;
  url?: string;
  icon?: LucideIcon;
  isLabel?: boolean;
  moduleKey?: ModuleName;
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user } = useAuth()
  const { t } = useLanguage()
  const { hasUserPermission, isModuleEnabled } = usePermissions()

  const getNavigationItems = () => {
    if (!user) return []

    if (user.role === 'super_admin' || user.role === 'admin') {
      const adminItems: NavItem[] = [
        { title: "OVERVIEW", isLabel: true },
        { title: t('nav.dashboard'), url: user.role === 'super_admin' ? "/super-admin-dashboard" : "/admin-dashboard", icon: LayoutDashboard },

        { title: "PEOPLE & ENROLLMENT", isLabel: true },
        { title: t('nav.students'), url: "/students", icon: Users, moduleKey: "students" },
        { title: t('nav.staff'), url: "/staff", icon: UserCheck, moduleKey: "staff" },
        { title: t('nav.admissions'), url: "/admissions", icon: UserPlus, moduleKey: "admissions" },

        { title: "ACADEMICS & ASSESSMENT", isLabel: true },
        { title: t('nav.academicSetup'), url: "/academics", icon: BookOpen },
        { title: t('nav.examinations'), url: "/examinations", icon: Award, moduleKey: "examinations" },
        { title: t('nav.timetable'), url: "/timetable", icon: Clock, moduleKey: "timetable" },
        { title: "Curriculum Planner", url: "/syllabus", icon: ClipboardList },

        { title: "FINANCE & ADMINISTRATION", isLabel: true },
        { title: "Collect Fees", url: "/fees/collect", icon: Receipt, moduleKey: "fees" },
        { title: "Fee Setup", url: "/fees/setup", icon: Settings, moduleKey: "fees" },
        { title: t('nav.library'), url: "/library", icon: Library, moduleKey: "library" },
        { title: t('nav.roleManagement'), url: "/role-management", icon: Shield },

        { title: "STUDENT SUPPORT SERVICES", isLabel: true },
        { title: t('nav.transport'), url: "/transport", icon: Bus, moduleKey: "transport" },
        { title: t('nav.hostel'), url: "/hostel", icon: Home, moduleKey: "hostel" },
        { title: t('nav.health'), url: "/health", icon: Heart, moduleKey: "health" },
        { title: t('nav.visitorManagement'), url: "/visitor-management", icon: UserCog },

        { title: "COMMUNICATIONS", isLabel: true },
        { title: t('nav.communication'), url: "/communication", icon: MessageSquare, moduleKey: "communication" },

        ...(user.role === 'super_admin' ? [
          { title: "SYSTEM ADMINISTRATION", isLabel: true },
          { title: t('nav.schools'), url: "/superadmin/schools", icon: Building },
          { title: "User Management", url: "/superadmin/users", icon: UserCog },
        ] as NavItem[] : []),

        { title: "ADDITIONAL FEATURES", isLabel: true },
        { title: t('nav.alumni'), url: "/alumni", icon: GraduationCap },
        { title: t('nav.wallet'), url: "/wallet", icon: Wallet, moduleKey: "wallet" },
        { title: t('common.store'), url: "/store", icon: ShoppingBag, moduleKey: "store" },
        { title: t('nav.schoolConnect'), url: "/school-connect", icon: School },

        { title: "GOVERNMENT & COMPLIANCE", isLabel: true },
        { title: "DISE / UDISE Report", url: "/reports/dise", icon: FileText, moduleKey: "reports" },

        { title: "SETTINGS", isLabel: true },
        { title: t('nav.settings'), url: "/settings", icon: Settings },
        { title: "Security", url: "/security", icon: Shield },
        { title: "Advanced Analytics", url: "/advanced-analytics", icon: BarChart3, moduleKey: "analytics" },
      ];

      // Keep module items visible even when disabled so users can open the existing
      // ModuleRestricted page and understand why access is blocked.
      return adminItems;
    }

    if (user.role === 'staff') {
      const designation = (user.designation ?? 'Teacher').toLowerCase();

      // ── Terminal sections – always anchored at the bottom ─────────────────
      // COMMUNICATION: Announcements + optional full Communication channel + School Connect
      const communicationSection: NavItem[] = [
        { title: "COMMUNICATION", isLabel: true },
        { title: "Announcements", url: "/announcements", icon: Bell },
        ...(isModuleEnabled('communication') && hasUserPermission('Communication', 'View')
          ? [{ title: "Communication", url: "/communication", icon: MessageSquare, moduleKey: 'communication' as const } as NavItem]
          : []),
        { title: "School Connect", url: "/school-connect", icon: School },
      ];

      // MY PROFILE: personal leave & attendance tracking
      const myProfileSection: NavItem[] = [
        { title: "MY PROFILE", isLabel: true },
        { title: "My Leave", url: "/leave-management", icon: Calendar },
        { title: "My Attendance", url: "/my-attendance", icon: CalendarCheck },
      ];

      // ── Core designation-based navigation ─────────────────────────────────
      let coreItems: NavItem[];

      if (designation === 'principal' || designation === 'vice principal') {
        coreItems = [
          { title: "OVERVIEW", isLabel: true },
          { title: "Dashboard", url: "/staff-dashboard", icon: LayoutDashboard },

          { title: "SCHOOL MANAGEMENT", isLabel: true },
          { title: "My Classes", url: "/my-classes", icon: GraduationCap },
          ...(hasUserPermission('Attendance', 'View') || hasUserPermission('Attendance', 'Create')
            ? [{ title: "Class Attendance", url: "/attendance", icon: UserCheck, moduleKey: 'attendance' as const } as NavItem] : []),
          { title: "My Timetable", url: "/timetable", icon: Clock },
          { title: t('nav.examinations'), url: "/examinations", icon: Award, moduleKey: 'examinations' as const },
          ...(hasUserPermission('Assignments', 'View') || hasUserPermission('Assignments', 'Create')
            ? [{ title: "Assignments", url: "/assignments", icon: ClipboardList } as NavItem] : []),
          { title: "My Curriculum", url: "/syllabus", icon: BookOpen },

          // Principal gets the full communications section inline (incl. Communication channel)
          { title: "COMMUNICATIONS", isLabel: true },
          { title: "Announcements", url: "/announcements", icon: Bell },
          { title: "Communication", url: "/communication", icon: MessageSquare },
          { title: "School Connect", url: "/school-connect", icon: School },

          { title: "REPORTS & COMPLIANCE", isLabel: true },
          { title: "DISE / UDISE Report", url: "/reports/dise", icon: FileText },

          { title: "MY PROFILE", isLabel: true },
          { title: "My Leave", url: "/leave-management", icon: Calendar },
          { title: "My Attendance", url: "/my-attendance", icon: CalendarCheck },
        ];
      } else if (designation === 'head of department') {
        coreItems = [
          { title: "OVERVIEW", isLabel: true },
          { title: "Dashboard", url: "/staff-dashboard", icon: LayoutDashboard },

          { title: "DEPARTMENT", isLabel: true },
          { title: "My Classes", url: "/my-classes", icon: GraduationCap },
          { title: "My Timetable", url: "/timetable", icon: Clock },
          { title: t('nav.examinations'), url: "/examinations", icon: Award, moduleKey: 'examinations' as const },
          ...(hasUserPermission('Assignments', 'View') || hasUserPermission('Assignments', 'Create')
            ? [{ title: "Assignments", url: "/assignments", icon: ClipboardList } as NavItem] : []),
          { title: "My Curriculum", url: "/syllabus", icon: BookOpen },
          { title: "Staff", url: "/staff", icon: UserCheck },
        ];
      } else if (designation === 'class teacher') {
        coreItems = [
          { title: "OVERVIEW", isLabel: true },
          { title: "Dashboard", url: "/staff-dashboard", icon: LayoutDashboard },

          { title: "TEACHING", isLabel: true },
          { title: "My Classes", url: "/my-classes", icon: GraduationCap },
          { title: "My Timetable", url: "/timetable", icon: Clock },
          ...(hasUserPermission('Assignments', 'View') || hasUserPermission('Assignments', 'Create')
            ? [{ title: "Assignments", url: "/assignments", icon: ClipboardList } as NavItem] : []),
          { title: "My Curriculum", url: "/syllabus", icon: BookOpen },
          { title: "Diary", url: "/staff-diary", icon: FileText },

          { title: "CLASSROOM", isLabel: true },
          ...(hasUserPermission('Attendance', 'View') || hasUserPermission('Attendance', 'Create')
            ? [{ title: "Class Attendance", url: "/attendance", icon: UserCheck, moduleKey: 'attendance' as const } as NavItem] : []),
          ...(hasUserPermission('Health', 'View')
            ? [{ title: "Health Records", url: "/health", icon: HeartPulse, moduleKey: 'health' as const } as NavItem] : []),
        ];
      } else if (designation === 'teacher') {
        coreItems = [
          { title: "OVERVIEW", isLabel: true },
          { title: "Dashboard", url: "/staff-dashboard", icon: LayoutDashboard },

          { title: "TEACHING", isLabel: true },
          { title: "My Classes", url: "/my-classes", icon: GraduationCap },
          ...(hasUserPermission('Assignments', 'View') || hasUserPermission('Assignments', 'Create')
            ? [{ title: "Assignments", url: "/assignments", icon: ClipboardList } as NavItem] : []),
          { title: "My Timetable", url: "/timetable", icon: Clock },
          { title: "My Curriculum", url: "/syllabus", icon: BookOpen },
          { title: "Diary", url: "/staff-diary", icon: FileText },
        ];
      } else if (designation === 'accountant') {
        coreItems = [
          { title: "OVERVIEW", isLabel: true },
          { title: "Dashboard", url: "/staff-dashboard", icon: LayoutDashboard },

          { title: "FINANCE", isLabel: true },
          { title: "Collect Fees", url: "/fees/collect", icon: Receipt, moduleKey: 'fees' as const },
          { title: "Wallet & Finance", url: "/wallet", icon: Wallet, moduleKey: 'wallet' as const },
          { title: "Store", url: "/store", icon: ShoppingBag, moduleKey: 'store' as const },
        ];
      } else if (designation === 'receptionist' || designation === 'front desk officer') {
        coreItems = [
          { title: "OVERVIEW", isLabel: true },
          { title: "Dashboard", url: "/staff-dashboard", icon: LayoutDashboard },

          { title: "FRONT DESK", isLabel: true },
          { title: "Visitor Management", url: "/visitor-management", icon: UserCog },

          { title: "ADMISSIONS", isLabel: true },
          { title: t('nav.admissions'), url: "/admissions", icon: UserPlus, moduleKey: "admissions" as const },
        ];
      } else if (designation === 'hr manager') {
        coreItems = [
          { title: "OVERVIEW", isLabel: true },
          { title: "Dashboard", url: "/staff-dashboard", icon: LayoutDashboard },

          { title: "HR MANAGEMENT", isLabel: true },
          { title: "Staff", url: "/staff", icon: UserCheck },
        ];
      } else if (designation === 'librarian') {
        coreItems = [
          { title: "OVERVIEW", isLabel: true },
          { title: "Dashboard", url: "/staff-dashboard", icon: LayoutDashboard },

          { title: "LIBRARY", isLabel: true },
          { title: "Library", url: "/library", icon: Library, moduleKey: 'library' as const },
        ];
      } else if (designation === 'transport manager') {
        coreItems = [
          { title: "OVERVIEW", isLabel: true },
          { title: "Dashboard", url: "/staff-dashboard", icon: LayoutDashboard },

          { title: "TRANSPORT", isLabel: true },
          { title: "Transport", url: "/transport", icon: Truck, moduleKey: 'transport' as const },
        ];
      } else if (designation === 'hostel warden') {
        coreItems = [
          { title: "OVERVIEW", isLabel: true },
          { title: "Dashboard", url: "/staff-dashboard", icon: LayoutDashboard },

          { title: "HOSTEL", isLabel: true },
          { title: "Hostel", url: "/hostel", icon: Home, moduleKey: 'hostel' as const },
          { title: "Health", url: "/health", icon: HeartPulse, moduleKey: 'health' as const },
        ];
      } else if (designation === 'admissions officer') {
        coreItems = [
          { title: "OVERVIEW", isLabel: true },
          { title: "Dashboard", url: "/staff-dashboard", icon: LayoutDashboard },

          { title: "ADMISSIONS", isLabel: true },
          { title: "Students", url: "/students", icon: Users, moduleKey: 'students' as const },
        ];
      } else if (designation === 'counselor') {
        coreItems = [
          { title: "OVERVIEW", isLabel: true },
          { title: "Dashboard", url: "/staff-dashboard", icon: LayoutDashboard },

          { title: "STUDENT SERVICES", isLabel: true },
          { title: "Students", url: "/students", icon: Users, moduleKey: 'students' as const },
          { title: "Health", url: "/health", icon: HeartPulse, moduleKey: 'health' as const },
        ];
      } else {
        // Unknown/custom designation – all nav built by permission augmentation
        coreItems = [
          { title: "OVERVIEW", isLabel: true },
          { title: "Dashboard", url: "/staff-dashboard", icon: LayoutDashboard },
        ];
      }

      // ── Permission-based augmentation (role-management overrides) ─────────
      const staffItems: NavItem[] = [...coreItems];

      // Students & Staff management — Admin & Principal only
      const isPrincipalRole = ['principal', 'vice principal'].includes(designation);
      
      if (isPrincipalRole && hasUserPermission('Students', 'View') && !staffItems.some(i => i.url === '/students')) {
        staffItems.push(
          { title: "PEOPLE & ENROLLMENT", isLabel: true },
          { title: "Students", url: "/students", icon: Users, moduleKey: 'students' },
        );
      }

      if (isPrincipalRole && hasUserPermission('Staff', 'View') && !staffItems.some(i => i.url === '/staff')) {
        staffItems.push(
          { title: "Staff", url: "/staff", icon: UserCheck, moduleKey: 'staff' },
        );
      }

      if (isModuleEnabled('admissions') && hasUserPermission('Admissions', 'View') && !staffItems.some(i => i.url === '/admissions')) {
        staffItems.push(
          { title: "ADMISSIONS", isLabel: true },
          { title: t('nav.admissions'), url: "/admissions", icon: UserPlus, moduleKey: 'admissions' },
        );
      }

      if (isModuleEnabled('timetable') && hasUserPermission('Timetable', 'View') && !staffItems.some(i => i.url === '/timetable')) {
        staffItems.push(
          { title: t('nav.timetable'), url: "/timetable", icon: Clock, moduleKey: 'timetable' },
        );
      }

      if (hasUserPermission('Assignments', 'View') && !staffItems.some(i => i.url === '/assignments')) {
        staffItems.push(
          { title: "Assignments", url: "/assignments", icon: ClipboardList },
        );
      }

      if (isModuleEnabled('library') && hasUserPermission('Library', 'View') && !staffItems.some(i => i.url === '/library')) {
        staffItems.push(
          { title: "LIBRARY", isLabel: true },
          { title: "Library", url: "/library", icon: Library, moduleKey: 'library' },
        );
      }

      if (isModuleEnabled('transport') && hasUserPermission('Transport', 'View') && !staffItems.some(i => i.url === '/transport')) {
        staffItems.push(
          { title: "TRANSPORT", isLabel: true },
          { title: "Transport", url: "/transport", icon: Truck, moduleKey: 'transport' },
        );
      }

      if (isModuleEnabled('hostel') && hasUserPermission('Hostel', 'View') && !staffItems.some(i => i.url === '/hostel')) {
        staffItems.push(
          { title: "HOSTEL", isLabel: true },
          { title: "Hostel", url: "/hostel", icon: Home, moduleKey: 'hostel' },
        );
      }

      if (isModuleEnabled('fees') && hasUserPermission('Fees', 'View') && !staffItems.some(i => i.url === '/fees/collect' || i.url === '/fees')) {
        staffItems.push(
          { title: "FINANCE", isLabel: true },
          { title: "Collect Fees", url: "/fees/collect", icon: Receipt, moduleKey: 'fees' },
        );
      }

      if (hasUserPermission('Visitor', 'View') && !staffItems.some(i => i.url === '/visitor-management')) {
        staffItems.push(
          { title: "OPERATIONS", isLabel: true },
          { title: "Visitor Management", url: "/visitor-management", icon: UserCog },
        );
      }

      if (isModuleEnabled('examinations') && hasUserPermission('Examinations', 'View') && !staffItems.some(i => i.url === '/examinations')) {
        staffItems.push(
          { title: "EXAMINATIONS", isLabel: true },
          { title: t('nav.examinations'), url: "/examinations", icon: Award, moduleKey: 'examinations' },
        );
      }

      // Curriculum: fallback for teaching staff not yet covered above
      if (!staffItems.some(i => i.url === '/syllabus') && (
        designation === 'teacher' || designation === 'class teacher' ||
        designation === 'head of department' || designation === 'principal' || designation === 'vice principal'
      )) {
        staffItems.push(
          { title: "My Curriculum", url: "/syllabus", icon: BookOpen },
        );
      }

      // Attendance: covers staff whose DB designation differs from their role assignment
      if (
        isModuleEnabled('attendance') &&
        (hasUserPermission('Attendance', 'Create') || hasUserPermission('Attendance', 'View')) &&
        !staffItems.some(i => i.url === '/attendance')
      ) {
        staffItems.push(
          { title: "ATTENDANCE", isLabel: true },
          { title: "Class Attendance", url: "/attendance", icon: UserCheck, moduleKey: 'attendance' },
        );
      }

      if (isModuleEnabled('health') && hasUserPermission('Health', 'View') && !staffItems.some(i => i.url === '/health')) {
        staffItems.push(
          { title: "HEALTH", isLabel: true },
          { title: "Health", url: "/health", icon: HeartPulse, moduleKey: 'health' },
        );
      }

      if (hasUserPermission('Grades', 'View') && !staffItems.some(i => i.url === '/grades')) {
        staffItems.push(
          { title: "GRADES", isLabel: true },
          { title: "Grades", url: "/grades", icon: Star },
        );
      }

      if (!['principal', 'vice principal'].includes(designation) && hasUserPermission('Certificates', 'View') && !staffItems.some(i => i.url === '/certificates')) {
        staffItems.push(
          { title: "CERTIFICATES", isLabel: true },
          { title: "Certificates", url: "/certificates", icon: GraduationCap },
        );
      }

      // ── Append terminal sections ──────────────────────────────────────────
      // Principal/VP already has their COMMUNICATIONS + MY PROFILE inline, so skip for them.
      if (!staffItems.some(i => i.url === '/school-connect')) {
        staffItems.push(...communicationSection);
      }
      if (!staffItems.some(i => i.url === '/my-attendance')) {
        staffItems.push(...myProfileSection);
      }

      return staffItems;
    }
    if (user.role === 'parent') {
      return [
        { title: t('nav.childProfile'), url: "/child-profile", icon: User },
        { title: t('nav.fees'), url: "/parent-fees", icon: DollarSign },
        { title: t('nav.notifications'), url: "/parent-notifications", icon: MessageSquare },
        { title: "Announcements", url: "/parent-announcements", icon: Megaphone },
        { title: "Diary", url: "/parent-diary", icon: BookOpen },
        { title: t('nav.schoolConnect'), url: "/school-connect", icon: School },
      ]
    }

    return []
  }

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher />
      </SidebarHeader>
      <SidebarContent className="py-2 px-1">
        <NavMain items={getNavigationItems()} />
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}

