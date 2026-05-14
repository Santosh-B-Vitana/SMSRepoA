import * as React from "react"
import { GraduationCap, Users, UserCheck, BookOpen, Award, Clock, Bus, Heart, DollarSign, MessageSquare, Settings, User, Building, Library, Wallet, School, ShoppingBag, LayoutDashboard, Shield, UserCog, Home, BarChart3, UserPlus, Calendar, Bell, ClipboardList, HeartPulse, Banknote, Truck, CalendarCheck } from "lucide-react"
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
import { usePermissions } from "@/contexts/PermissionsContext"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user } = useAuth()
  const { t } = useLanguage()
  const { hasUserPermission } = usePermissions()

  const getNavigationItems = () => {
    if (!user) return []

    if (user.role === 'super_admin' || user.role === 'admin') {
      return [
        { title: "OVERVIEW", isLabel: true },
        { title: t('nav.dashboard'), url: user.role === 'super_admin' ? "/super-admin-dashboard" : "/admin-dashboard", icon: LayoutDashboard },

        { title: "PEOPLE & ENROLLMENT", isLabel: true },
        { title: t('nav.students'), url: "/students", icon: Users },
        { title: t('nav.staff'), url: "/staff", icon: UserCheck },

        { title: "ACADEMICS & ASSESSMENT", isLabel: true },
        { title: t('nav.academicSetup'), url: "/academics", icon: BookOpen },
        { title: t('nav.examinations'), url: "/examinations", icon: Award },
        { title: t('nav.timetable'), url: "/timetable", icon: Clock },

        { title: "FINANCE & ADMINISTRATION", isLabel: true },
        { title: t('nav.fees'), url: "/fees", icon: DollarSign },
        { title: t('nav.library'), url: "/library", icon: Library },
        { title: t('nav.roleManagement'), url: "/role-management", icon: Shield },

        { title: "STUDENT SUPPORT SERVICES", isLabel: true },
        { title: t('nav.transport'), url: "/transport", icon: Bus },
        { title: t('nav.hostel'), url: "/hostel", icon: Home },
        { title: t('nav.health'), url: "/health", icon: Heart },
        { title: t('nav.visitorManagement'), url: "/visitor-management", icon: UserCog },

        { title: "COMMUNICATIONS", isLabel: true },
        { title: t('nav.communication'), url: "/communication", icon: MessageSquare },

        ...(user.role === 'super_admin' ? [
          { title: "SYSTEM ADMINISTRATION", isLabel: true },
          { title: t('nav.schools'), url: "/superadmin/schools", icon: Building },
          { title: "User Management", url: "/superadmin/users", icon: UserCog },
        ] : []),

        { title: "ADDITIONAL FEATURES", isLabel: true },
        { title: t('nav.alumni'), url: "/alumni", icon: GraduationCap },
        { title: t('nav.wallet'), url: "/wallet", icon: Wallet },
        { title: t('common.store'), url: "/store", icon: ShoppingBag },
        { title: t('nav.schoolConnect'), url: "/school-connect", icon: School },

        { title: "SETTINGS", isLabel: true },
        { title: t('nav.settings'), url: "/settings", icon: Settings },
        { title: "Security", url: "/security", icon: Shield },
        { title: "Advanced Analytics", url: "/advanced-analytics", icon: BarChart3 },
      ]
    }

    if (user.role === 'staff') {
      const designation = (user.designation ?? 'Teacher').toLowerCase();

      const isTeacher = designation === 'teacher' || designation === 'class teacher';

      // ── Shared items for every staff member ──────────────────────────────
      const shared = [
        { title: "OVERVIEW", isLabel: true },
        { title: "Dashboard", url: "/staff-dashboard", icon: LayoutDashboard },
        { title: "COMMUNICATIONS", isLabel: true },
        { title: "Announcements", url: "/announcements", icon: Bell },
        { title: "Communication", url: "/communication", icon: MessageSquare },
        { title: "LEAVE", isLabel: true },
        { title: "My Leave", url: "/leave-management", icon: Calendar },
        { title: "My Attendance", url: "/my-attendance", icon: CalendarCheck },
        { title: "School Connect", url: "/school-connect", icon: School },
      ]

      // ── Build designation-based nav items ─────────────────────────────────
      let staffItems: { title: string; url?: string; icon?: React.ElementType; isLabel?: boolean }[];

      if (designation === 'principal' || designation === 'vice principal') {
        staffItems = [
          { title: "OVERVIEW", isLabel: true },
          { title: "Dashboard", url: "/staff-dashboard", icon: LayoutDashboard },
          { title: "TEACHING", isLabel: true },
          { title: "My Classes", url: "/my-classes", icon: GraduationCap },
          ...(hasUserPermission('Attendance', 'View') || hasUserPermission('Attendance', 'Create')
            ? [{ title: "Attendance", url: "/attendance", icon: UserCheck } as const] : []),
          { title: t('nav.timetable'), url: "/timetable", icon: Clock },
          ...(hasUserPermission('Assignments', 'View') || hasUserPermission('Assignments', 'Create')
            ? [{ title: "Assignments", url: "/assignments", icon: ClipboardList } as const] : []),
          { title: "COMMUNICATIONS", isLabel: true },
          { title: "Announcements", url: "/announcements", icon: Bell },
          { title: "Communication", url: "/communication", icon: MessageSquare },
          { title: "ADMINISTRATION", isLabel: true },
          { title: "Leave Management", url: "/leave-management", icon: Calendar },
          { title: "My Attendance", url: "/my-attendance", icon: CalendarCheck },
          { title: "School Connect", url: "/school-connect", icon: School },
        ];
      } else if (designation === 'head of department') {
        staffItems = [
          ...shared,
          { title: "DEPARTMENT", isLabel: true },
          { title: "My Classes", url: "/my-classes", icon: GraduationCap },
          { title: "Timetable", url: "/timetable", icon: Clock },
          { title: t('nav.examinations'), url: "/examinations", icon: Award },
          ...(hasUserPermission('Assignments', 'View') || hasUserPermission('Assignments', 'Create')
            ? [{ title: "Assignments", url: "/assignments", icon: ClipboardList } as const] : []),
          { title: "Staff", url: "/staff", icon: UserCheck },
        ];
      } else if (isTeacher) {
        staffItems = [
          ...shared,
          { title: "ACADEMIC", isLabel: true },
          { title: "My Classes", url: "/my-classes", icon: GraduationCap },
          ...(hasUserPermission('Attendance', 'View') || hasUserPermission('Attendance', 'Create')
            ? [{ title: "Attendance", url: "/attendance", icon: UserCheck } as const] : []),
          ...(hasUserPermission('Assignments', 'View') || hasUserPermission('Assignments', 'Create')
            ? [{ title: "Assignments", url: "/assignments", icon: ClipboardList } as const] : []),
          { title: "Timetable", url: "/timetable", icon: Clock },
          { title: "DIARY", isLabel: true },
          { title: "Diary", url: "/staff-diary", icon: BookOpen },
        ];
      } else if (designation === 'accountant') {
        staffItems = [
          ...shared,
          { title: "FINANCE", isLabel: true },
          { title: "Fees", url: "/fees", icon: DollarSign },
          { title: "Wallet / Finance", url: "/wallet", icon: Wallet },
          { title: "Store", url: "/store", icon: ShoppingBag },
        ];
      } else if (designation === 'receptionist' || designation === 'front desk officer') {
        staffItems = [
          ...shared,
          { title: "FRONT DESK", isLabel: true },
          { title: "Visitor Management", url: "/visitor-management", icon: UserCog },
          { title: "Communication", url: "/communication", icon: MessageSquare },
        ];
      } else if (designation === 'hr manager') {
        staffItems = [
          ...shared,
          { title: "HR MANAGEMENT", isLabel: true },
          { title: "Staff", url: "/staff", icon: UserCheck },
        ];
      } else if (designation === 'librarian') {
        staffItems = [
          ...shared,
          { title: "LIBRARY", isLabel: true },
          { title: "Library", url: "/library", icon: Library },
        ];
      } else if (designation === 'transport manager') {
        staffItems = [
          ...shared,
          { title: "TRANSPORT", isLabel: true },
          { title: "Transport", url: "/transport", icon: Truck },
        ];
      } else if (designation === 'hostel warden') {
        staffItems = [
          ...shared,
          { title: "HOSTEL", isLabel: true },
          { title: "Hostel", url: "/hostel", icon: Home },
          { title: "Health", url: "/health", icon: HeartPulse },
        ];
      } else if (designation === 'admissions officer') {
        staffItems = [
          ...shared,
          { title: "ADMISSIONS", isLabel: true },
          { title: "Students", url: "/students", icon: Users },
          { title: "Communication", url: "/communication", icon: MessageSquare },
        ];
      } else if (designation === 'counselor') {
        staffItems = [
          ...shared,
          { title: "SERVICES", isLabel: true },
          { title: "Health", url: "/health", icon: HeartPulse },
          { title: "Communication", url: "/communication", icon: MessageSquare },
          { title: "Students", url: "/students", icon: Users },
        ];
      } else {
        staffItems = [
          ...shared,
          { title: "ACADEMIC", isLabel: true },
          { title: "My Classes", url: "/my-classes", icon: GraduationCap },
          ...(hasUserPermission('Attendance', 'View') || hasUserPermission('Attendance', 'Create')
            ? [{ title: "Attendance", url: "/attendance", icon: UserCheck } as const] : []),
        ];
      }

      // ── Augment with permission-based items (role management overrides) ───
      // Library: show for anyone with Library.View permission
      if (hasUserPermission('Library', 'View') && !staffItems.some(i => i.url === '/library')) {
        staffItems.push(
          { title: "LIBRARY", isLabel: true },
          { title: "Library", url: "/library", icon: Library },
        );
      }

      // Transport: show for anyone with Transport.View permission
      if (hasUserPermission('Transport', 'View') && !staffItems.some(i => i.url === '/transport')) {
        staffItems.push(
          { title: "TRANSPORT", isLabel: true },
          { title: "Transport", url: "/transport", icon: Truck },
        );
      }

      // Hostel: show for anyone with Hostel.View permission
      if (hasUserPermission('Hostel', 'View') && !staffItems.some(i => i.url === '/hostel')) {
        staffItems.push(
          { title: "HOSTEL", isLabel: true },
          { title: "Hostel", url: "/hostel", icon: Home },
        );
      }

      // Fees: show for anyone with Fees.View permission
      if (hasUserPermission('Fees', 'View') && !staffItems.some(i => i.url === '/fees')) {
        staffItems.push(
          { title: "FINANCE", isLabel: true },
          { title: "Fees", url: "/fees", icon: DollarSign },
        );
      }

      // Visitor Management: show for anyone with Visitor.View permission
      if (hasUserPermission('Visitor', 'View') && !staffItems.some(i => i.url === '/visitor-management')) {
        staffItems.push(
          { title: "OPERATIONS", isLabel: true },
          { title: "Visitor Management", url: "/visitor-management", icon: UserCog },
        );
      }

      return staffItems;
    }

    if (user.role === 'parent') {
      return [
        { title: t('nav.childProfile'), url: "/child-profile", icon: User },
        { title: t('nav.fees'), url: "/parent-fees", icon: DollarSign },
        { title: t('nav.notifications'), url: "/parent-notifications", icon: MessageSquare },
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

