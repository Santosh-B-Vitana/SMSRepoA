import * as React from "react"
import { GraduationCap, Users, UserCheck, BookOpen, Award, Clock, Bus, Heart, DollarSign, MessageSquare, Settings, User, Building, Library, Wallet, School, ShoppingBag, LayoutDashboard, Shield, UserCog, Home, BarChart3, UserPlus, Calendar, Bell, ClipboardList, HeartPulse, Banknote, Truck, CalendarCheck, Star, FileText, Megaphone, Receipt, Crown, BadgeCheck, AlertTriangle, type LucideIcon } from "lucide-react"
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
  const { hasUserPermission, isModuleEnabled, permissionsLoaded, isRoleManaged } = usePermissions()

  const getNavigationItems = () => {
    if (!user) return []

    if (user.role === 'super_admin') {
      // ── Super Admin: platform management comes first ──────────────────────
      return [
        { title: 'Platform Management', isLabel: true },
        { title: t('nav.dashboard'), url: "/super-admin-dashboard", icon: LayoutDashboard },
        { title: t('nav.schools'), url: "/superadmin/schools", icon: Building },
        { title: t('nav.userManagement'), url: "/superadmin/users", icon: UserCog },

        { title: 'School Operations', isLabel: true },
        { title: t('nav.students'), url: "/students", icon: Users, moduleKey: "students" as ModuleName },
        { title: t('nav.staff'), url: "/staff", icon: UserCheck, moduleKey: "staff" as ModuleName },
        { title: t('nav.academicSetup'), url: "/academics", icon: BookOpen },
        { title: t('nav.examinations'), url: "/examinations", icon: Award, moduleKey: "examinations" as ModuleName },
        { title: t('nav.timetable'), url: "/timetable", icon: Clock, moduleKey: "timetable" as ModuleName },

        { title: 'Finance & Reports', isLabel: true },
        { title: t('nav.collectFees'), url: "/fees/collect", icon: Receipt, moduleKey: "fees" as ModuleName },
        { title: t('nav.feeSetup'), url: "/fees/setup", icon: Settings, moduleKey: "fees" as ModuleName },
        { title: t('nav.reports'), url: "/reports", icon: FileText, moduleKey: "reports" as ModuleName },
        { title: t('nav.advancedAnalytics'), url: "/advanced-analytics", icon: BarChart3, moduleKey: "analytics" as ModuleName },

        { title: 'System', isLabel: true },
        { title: t('nav.settings'), url: "/settings", icon: Settings },
        { title: t('nav.security'), url: "/security", icon: Shield },
        { title: t('nav.roleManagement'), url: "/role-management", icon: Shield },
      ] as NavItem[];
    }

    if (user.role === 'admin') {
      // ── School Admin: full school operations ──────────────────────────────
      const adminItems: NavItem[] = [
        { title: t('nav.sectionOverview'), isLabel: true },
        { title: t('nav.dashboard'), url: "/admin-dashboard", icon: LayoutDashboard },

        { title: t('nav.sectionPeople'), isLabel: true },
        { title: t('nav.students'), url: "/students", icon: Users, moduleKey: "students" },
        { title: t('nav.staff'), url: "/staff", icon: UserCheck, moduleKey: "staff" },
        { title: t('nav.admissions'), url: "/admissions", icon: UserPlus, moduleKey: "admissions" },

        { title: t('nav.sectionAcademics'), isLabel: true },
        { title: t('nav.academicSetup'), url: "/academics", icon: BookOpen },
        { title: t('nav.examinations'), url: "/examinations", icon: Award, moduleKey: "examinations" },
        { title: t('nav.timetable'), url: "/timetable", icon: Clock, moduleKey: "timetable" },
        { title: t('nav.curriculumPlanner'), url: "/syllabus", icon: ClipboardList },

        { title: t('nav.sectionFinanceAdmin'), isLabel: true },
        { title: t('nav.collectFees'), url: "/fees/collect", icon: Receipt, moduleKey: "fees" },
        { title: t('nav.feeSetup'), url: "/fees/setup", icon: Settings, moduleKey: "fees" },
        { title: t('nav.library'), url: "/library", icon: Library, moduleKey: "library" },
        { title: t('nav.roleManagement'), url: "/role-management", icon: Shield },

        { title: t('nav.sectionStudentSupport'), isLabel: true },
        { title: t('nav.transport'), url: "/transport", icon: Bus, moduleKey: "transport" },
        { title: t('nav.hostel'), url: "/hostel", icon: Home, moduleKey: "hostel" },
        { title: t('nav.health'), url: "/health", icon: Heart, moduleKey: "health" },
        { title: t('nav.visitorManagement'), url: "/visitor-management", icon: UserCog },

        { title: t('nav.sectionCommunications'), isLabel: true },
        { title: t('nav.communication'), url: "/communication", icon: MessageSquare, moduleKey: "communication" },
        { title: 'Parent-Teacher Meetings', url: "/ptm", icon: Users },
        { title: 'Behaviour & Discipline', url: "/behaviour", icon: AlertTriangle },

        { title: t('nav.sectionAdditional'), isLabel: true },
        { title: t('nav.alumni'), url: "/alumni", icon: GraduationCap },
        { title: t('nav.wallet'), url: "/wallet", icon: Wallet, moduleKey: "wallet" },
        { title: t('common.store'), url: "/store", icon: ShoppingBag, moduleKey: "store" },
        { title: t('nav.schoolConnect'), url: "/school-connect", icon: School },

        { title: 'Reports & Analytics', isLabel: true },
        { title: 'Reports', url: "/reports", icon: FileText, moduleKey: "reports" },
        { title: t('nav.advancedAnalytics'), url: "/advanced-analytics", icon: BarChart3, moduleKey: "analytics" },
        { title: t('nav.diseReport'), url: "/reports/dise", icon: FileText, moduleKey: "reports" },

        { title: t('nav.sectionSettings'), isLabel: true },
        { title: t('nav.settings'), url: "/settings", icon: Settings },
        { title: t('nav.security'), url: "/security", icon: Shield },
      ];

      return adminItems;
    }

    if (user.role === 'staff') {
      const designation = (user.designation ?? 'Teacher').toLowerCase();

      // ── Terminal sections – always anchored at the bottom ─────────────────
      // COMMUNICATION: Announcements + optional full Communication channel + School Connect
      const communicationSection: NavItem[] = [
        { title: t('nav.sectionCommunication'), isLabel: true },
        { title: t('nav.announcements'), url: "/announcements", icon: Bell },
        ...(isModuleEnabled('communication') && hasUserPermission('Communication', 'View')
          ? [{ title: t('nav.communication'), url: "/communication", icon: MessageSquare, moduleKey: 'communication' as const } as NavItem]
          : []),
        { title: t('nav.schoolConnect'), url: "/school-connect", icon: School },
      ];

      // MY PROFILE: personal leave & attendance tracking
      const myProfileSection: NavItem[] = [
        { title: t('nav.sectionMyProfile'), isLabel: true },
        { title: t('nav.myLeave'), url: "/leave-management", icon: Calendar },
        { title: t('nav.myAttendance'), url: "/my-attendance", icon: CalendarCheck },
      ];

      // ── Core designation-based navigation ─────────────────────────────────
      let coreItems: NavItem[];

      if (designation === 'principal' || designation === 'vice principal') {
        coreItems = [
          { title: t('nav.sectionOverview'), isLabel: true },
          { title: t('nav.dashboard'), url: "/staff-dashboard", icon: LayoutDashboard },

          { title: t('nav.sectionSchoolMgmt'), isLabel: true },
          { title: t('nav.myClasses'), url: "/my-classes", icon: GraduationCap },
          ...(hasUserPermission('Attendance', 'View') || hasUserPermission('Attendance', 'Create')
            ? [{ title: t('nav.classAttendance'), url: "/attendance", icon: UserCheck, moduleKey: 'attendance' as const } as NavItem] : []),
          { title: t('nav.myTimetable'), url: "/timetable", icon: Clock },
          { title: t('nav.examinations'), url: "/examinations", icon: Award, moduleKey: 'examinations' as const },
          ...(hasUserPermission('Assignments', 'View') || hasUserPermission('Assignments', 'Create')
            ? [{ title: t('nav.assignments'), url: "/assignments", icon: ClipboardList } as NavItem] : []),
          { title: t('nav.myCurriculum'), url: "/syllabus", icon: BookOpen },

          // Principal gets the full communications section inline (incl. Communication channel)
          { title: t('nav.sectionCommunications'), isLabel: true },
          { title: t('nav.announcements'), url: "/announcements", icon: Bell },
          { title: t('nav.communication'), url: "/communication", icon: MessageSquare },
          { title: t('nav.schoolConnect'), url: "/school-connect", icon: School },

          { title: t('nav.sectionReports'), isLabel: true },
          { title: t('nav.diseReport'), url: "/reports/dise", icon: FileText },

          { title: t('nav.sectionMyProfile'), isLabel: true },
          { title: t('nav.myLeave'), url: "/leave-management", icon: Calendar },
          { title: t('nav.myAttendance'), url: "/my-attendance", icon: CalendarCheck },
        ];
      } else if (designation === 'head of department') {
        coreItems = [
          { title: t('nav.sectionOverview'), isLabel: true },
          { title: t('nav.dashboard'), url: "/staff-dashboard", icon: LayoutDashboard },

          { title: t('nav.sectionDepartment'), isLabel: true },
          { title: t('nav.myClasses'), url: "/my-classes", icon: GraduationCap },
          { title: t('nav.myTimetable'), url: "/timetable", icon: Clock },
          { title: t('nav.examinations'), url: "/examinations", icon: Award, moduleKey: 'examinations' as const },
          ...(hasUserPermission('Assignments', 'View') || hasUserPermission('Assignments', 'Create')
            ? [{ title: t('nav.assignments'), url: "/assignments", icon: ClipboardList } as NavItem] : []),
          { title: t('nav.myCurriculum'), url: "/syllabus", icon: BookOpen },
          { title: t('nav.staff'), url: "/staff", icon: UserCheck },
        ];
      } else if (designation === 'class teacher') {
        coreItems = [
          { title: t('nav.sectionOverview'), isLabel: true },
          { title: t('nav.dashboard'), url: "/staff-dashboard", icon: LayoutDashboard },

          { title: t('nav.sectionTeaching'), isLabel: true },
          { title: t('nav.myClasses'), url: "/my-classes", icon: GraduationCap },
          { title: t('nav.myTimetable'), url: "/timetable", icon: Clock },
          ...(hasUserPermission('Assignments', 'View') || hasUserPermission('Assignments', 'Create')
            ? [{ title: t('nav.assignments'), url: "/assignments", icon: ClipboardList } as NavItem] : []),
          { title: t('nav.myCurriculum'), url: "/syllabus", icon: BookOpen },
          { title: t('nav.diary'), url: "/staff-diary", icon: FileText },

          { title: t('nav.sectionClassroom'), isLabel: true },
          ...(hasUserPermission('Attendance', 'View') || hasUserPermission('Attendance', 'Create')
            ? [{ title: t('nav.classAttendance'), url: "/attendance", icon: UserCheck, moduleKey: 'attendance' as const } as NavItem] : []),
          ...(hasUserPermission('Health', 'View')
            ? [{ title: t('nav.healthRecords'), url: "/health", icon: HeartPulse, moduleKey: 'health' as const } as NavItem] : []),
        ];
      } else if (designation === 'teacher' || designation === 'subject teacher') {
        coreItems = [
          { title: t('nav.sectionOverview'), isLabel: true },
          { title: t('nav.dashboard'), url: "/staff-dashboard", icon: LayoutDashboard },

          { title: t('nav.sectionTeaching'), isLabel: true },
          { title: t('nav.myClasses'), url: "/my-classes", icon: GraduationCap },
          ...(hasUserPermission('Assignments', 'View') || hasUserPermission('Assignments', 'Create')
            ? [{ title: t('nav.assignments'), url: "/assignments", icon: ClipboardList } as NavItem] : []),
          { title: t('nav.myTimetable'), url: "/timetable", icon: Clock },
          { title: t('nav.myCurriculum'), url: "/syllabus", icon: BookOpen },
          { title: t('nav.diary'), url: "/staff-diary", icon: FileText },
        ];
      } else if (designation === 'accountant') {
        coreItems = [
          { title: t('nav.sectionOverview'), isLabel: true },
          { title: t('nav.dashboard'), url: "/staff-dashboard", icon: LayoutDashboard },

          { title: t('nav.sectionFinance'), isLabel: true },
          { title: t('nav.collectFees'), url: "/fees/collect", icon: Receipt, moduleKey: 'fees' as const },
          { title: t('nav.walletFinance'), url: "/wallet", icon: Wallet, moduleKey: 'wallet' as const },
          { title: t('common.store'), url: "/store", icon: ShoppingBag, moduleKey: 'store' as const },
        ];
      } else if (designation === 'receptionist' || designation === 'front desk officer') {
        coreItems = [
          { title: t('nav.sectionOverview'), isLabel: true },
          { title: t('nav.dashboard'), url: "/staff-dashboard", icon: LayoutDashboard },

          { title: t('nav.sectionFrontDesk'), isLabel: true },
          { title: t('nav.visitorManagement'), url: "/visitor-management", icon: UserCog },

          { title: t('nav.sectionAdmissions'), isLabel: true },
          { title: t('nav.admissions'), url: "/admissions", icon: UserPlus, moduleKey: "admissions" as const },
        ];
      } else if (designation === 'hr manager') {
        coreItems = [
          { title: t('nav.sectionOverview'), isLabel: true },
          { title: t('nav.dashboard'), url: "/staff-dashboard", icon: LayoutDashboard },

          { title: t('nav.sectionHR'), isLabel: true },
          { title: t('nav.staff'), url: "/staff", icon: UserCheck },
        ];
      } else if (designation === 'librarian') {
        coreItems = [
          { title: t('nav.sectionOverview'), isLabel: true },
          { title: t('nav.dashboard'), url: "/staff-dashboard", icon: LayoutDashboard },

          { title: t('nav.sectionLibrary'), isLabel: true },
          { title: t('nav.library'), url: "/library", icon: Library, moduleKey: 'library' as const },
        ];
      } else if (designation === 'transport manager') {
        coreItems = [
          { title: t('nav.sectionOverview'), isLabel: true },
          { title: t('nav.dashboard'), url: "/staff-dashboard", icon: LayoutDashboard },

          { title: t('nav.sectionTransport'), isLabel: true },
          { title: t('nav.transport'), url: "/transport", icon: Truck, moduleKey: 'transport' as const },
        ];
      } else if (designation === 'hostel warden') {
        coreItems = [
          { title: t('nav.sectionOverview'), isLabel: true },
          { title: t('nav.dashboard'), url: "/staff-dashboard", icon: LayoutDashboard },

          { title: t('nav.sectionHostel'), isLabel: true },
          { title: t('nav.hostel'), url: "/hostel", icon: Home, moduleKey: 'hostel' as const },
          { title: t('nav.health'), url: "/health", icon: HeartPulse, moduleKey: 'health' as const },
        ];
      } else if (designation === 'admissions officer') {
        coreItems = [
          { title: t('nav.sectionOverview'), isLabel: true },
          { title: t('nav.dashboard'), url: "/staff-dashboard", icon: LayoutDashboard },

          { title: t('nav.sectionAdmissions'), isLabel: true },
          { title: t('nav.students'), url: "/students", icon: Users, moduleKey: 'students' as const },
        ];
      } else if (designation === 'counselor') {
        coreItems = [
          { title: t('nav.sectionOverview'), isLabel: true },
          { title: t('nav.dashboard'), url: "/staff-dashboard", icon: LayoutDashboard },

          { title: t('nav.sectionStudentServices'), isLabel: true },
          { title: t('nav.students'), url: "/students", icon: Users, moduleKey: 'students' as const },
          { title: t('nav.health'), url: "/health", icon: HeartPulse, moduleKey: 'health' as const },
        ];
      } else {
        // Unknown/custom designation – all nav built by permission augmentation
        coreItems = [
          { title: t('nav.sectionOverview'), isLabel: true },
          { title: t('nav.dashboard'), url: "/staff-dashboard", icon: LayoutDashboard },
        ];
      }

      // ── Permission-based augmentation (role-management overrides) ─────────
      // Only augment once permissions are loaded — avoids flooding the nav with ghost
      // sections during the brief loading window when hasUserPermission returns true
      // for everything (its fail-open behaviour while the API call is in-flight).
      if (!permissionsLoaded) {
        return [...coreItems, ...communicationSection, ...myProfileSection];
      }

      // When the admin has configured an explicit role for this user, build the sidebar
      // purely from the permission set — not from designation defaults. This ensures
      // that a custom role with limited permissions actually limits the navigation.
      const staffItems: NavItem[] = (isRoleManaged && permissionsLoaded)
        ? [
            { title: t('nav.sectionOverview'), isLabel: true },
            { title: t('nav.dashboard'), url: '/staff-dashboard', icon: LayoutDashboard },
          ]
        : [...coreItems];

      // Students & Staff management — Admin & Principal only
      const isPrincipalRole = ['principal', 'vice principal'].includes(designation);
      
      if ((isPrincipalRole || isRoleManaged) && hasUserPermission('Students', 'View') && !staffItems.some(i => i.url === '/students')) {
        staffItems.push(
          { title: t('nav.sectionPeople'), isLabel: true },
          { title: t('nav.students'), url: "/students", icon: Users, moduleKey: 'students' },
        );
      }

      if ((isPrincipalRole || isRoleManaged) && hasUserPermission('Staff', 'View') && !staffItems.some(i => i.url === '/staff')) {
        staffItems.push(
          { title: t('nav.staff'), url: "/staff", icon: UserCheck, moduleKey: 'staff' },
        );
      }

      if (isModuleEnabled('admissions') && hasUserPermission('Admissions', 'View') && !staffItems.some(i => i.url === '/admissions')) {
        staffItems.push(
          { title: t('nav.sectionAdmissions'), isLabel: true },
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
          { title: t('nav.assignments'), url: "/assignments", icon: ClipboardList },
        );
      }

      if (isModuleEnabled('library') && hasUserPermission('Library', 'View') && !staffItems.some(i => i.url === '/library')) {
        staffItems.push(
          { title: t('nav.sectionLibrary'), isLabel: true },
          { title: t('nav.library'), url: "/library", icon: Library, moduleKey: 'library' },
        );
      }

      if (isModuleEnabled('transport') && hasUserPermission('Transport', 'View') && !staffItems.some(i => i.url === '/transport')) {
        staffItems.push(
          { title: t('nav.sectionTransport'), isLabel: true },
          { title: t('nav.transport'), url: "/transport", icon: Truck, moduleKey: 'transport' },
        );
      }

      if (isModuleEnabled('hostel') && hasUserPermission('Hostel', 'View') && !staffItems.some(i => i.url === '/hostel')) {
        staffItems.push(
          { title: t('nav.sectionHostel'), isLabel: true },
          { title: t('nav.hostel'), url: "/hostel", icon: Home, moduleKey: 'hostel' },
        );
      }

      if (isModuleEnabled('fees') && hasUserPermission('Fees', 'View') && !staffItems.some(i => i.url === '/fees/collect' || i.url === '/fees')) {
        staffItems.push(
          { title: t('nav.sectionFinance'), isLabel: true },
          { title: t('nav.collectFees'), url: "/fees/collect", icon: Receipt, moduleKey: 'fees' },
        );
      }

      if (hasUserPermission('Visitor', 'View') && !staffItems.some(i => i.url === '/visitor-management')) {
        staffItems.push(
          { title: t('nav.sectionOperations'), isLabel: true },
          { title: t('nav.visitorManagement'), url: "/visitor-management", icon: UserCog },
        );
      }

      if (isModuleEnabled('examinations') && hasUserPermission('Examinations', 'View') && !staffItems.some(i => i.url === '/examinations')) {
        staffItems.push(
          { title: t('nav.sectionExaminations'), isLabel: true },
          { title: t('nav.examinations'), url: "/examinations", icon: Award, moduleKey: 'examinations' },
        );
      }

      // Curriculum: fallback for teaching staff not yet covered above
      if (!staffItems.some(i => i.url === '/syllabus') && (
        designation === 'teacher' || designation === 'class teacher' ||
        designation === 'head of department' || designation === 'principal' || designation === 'vice principal'
      )) {
        staffItems.push(
          { title: t('nav.myCurriculum'), url: "/syllabus", icon: BookOpen },
        );
      }

      // Attendance: covers staff whose DB designation differs from their role assignment
      if (
        isModuleEnabled('attendance') &&
        (hasUserPermission('Attendance', 'Create') || hasUserPermission('Attendance', 'View')) &&
        !staffItems.some(i => i.url === '/attendance')
      ) {
        staffItems.push(
          { title: t('nav.sectionAttendance'), isLabel: true },
          { title: t('nav.classAttendance'), url: "/attendance", icon: UserCheck, moduleKey: 'attendance' },
        );
      }

      if (isModuleEnabled('health') && hasUserPermission('Health', 'View') && !staffItems.some(i => i.url === '/health')) {
        staffItems.push(
          { title: t('nav.sectionHealth'), isLabel: true },
          { title: t('nav.health'), url: "/health", icon: HeartPulse, moduleKey: 'health' },
        );
      }

      if (hasUserPermission('Grades', 'View') && !staffItems.some(i => i.url === '/grades')) {
        staffItems.push(
          { title: t('nav.sectionGrades'), isLabel: true },
          { title: t('nav.grades'), url: "/grades", icon: Star },
        );
      }

      if (!['principal', 'vice principal'].includes(designation) && hasUserPermission('Certificates', 'View') && !staffItems.some(i => i.url === '/certificates')) {
        staffItems.push(
          { title: t('nav.sectionCertificates'), isLabel: true },
          { title: t('nav.certificates'), url: "/certificates", icon: GraduationCap },
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
        { title: t('nav.announcements'), url: "/parent-announcements", icon: Megaphone },
        { title: t('nav.diary'), url: "/parent-diary", icon: BookOpen },
        { title: t('nav.schoolConnect'), url: "/school-connect", icon: School },
      ]
    }

    return []
  }

  // Role badge shown below the school name / team switcher
  const roleBadge = user?.role === 'super_admin' ? (
    <div className="mx-2 mb-1 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-100 border border-purple-200 text-purple-800">
      <Crown className="h-3.5 w-3.5 shrink-0" />
      <span className="text-[11px] font-semibold tracking-wide">Platform Admin</span>
    </div>
  ) : user?.role === 'admin' ? (
    <div className="mx-2 mb-1 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-700">
      <BadgeCheck className="h-3.5 w-3.5 shrink-0" />
      <span className="text-[11px] font-semibold tracking-wide">School Admin</span>
    </div>
  ) : user?.role === 'staff' ? (
    <div className="mx-2 mb-1 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-50 border border-green-200 text-green-700">
      <BadgeCheck className="h-3.5 w-3.5 shrink-0" />
      <span className="text-[11px] font-semibold tracking-wide">
        {user.designation ? user.designation : 'Staff'}
      </span>
    </div>
  ) : user?.role === 'parent' ? (
    <div className="mx-2 mb-1 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-700">
      <User className="h-3.5 w-3.5 shrink-0" />
      <span className="text-[11px] font-semibold tracking-wide">Parent / Guardian</span>
    </div>
  ) : null;

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher />
        {roleBadge}
      </SidebarHeader>
      <SidebarContent className="py-2 px-1">
        <NavMain items={getNavigationItems()} />
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}

