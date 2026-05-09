import * as React from "react"
import { GraduationCap, Users, UserCheck, BookOpen, Award, Clock, Bus, Heart, DollarSign, MessageSquare, Settings, User, Building, Library, Wallet, School, ShoppingBag, LayoutDashboard, Shield, UserCog, Home, BarChart3, UserPlus, Calendar, Bell, ClipboardList, HeartPulse, Banknote, Truck } from "lucide-react"
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

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user } = useAuth()
  const { t } = useLanguage()

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

      // ── Shared items for every staff member ──────────────────────────────
      const shared = [
        { title: "OVERVIEW", isLabel: true },
        { title: "Dashboard", url: "/staff-dashboard", icon: LayoutDashboard },
        { title: "LEAVE & ANNOUNCEMENTS", isLabel: true },
        { title: "My Leave", url: "/leave-management", icon: Calendar },
        { title: "School Connect", url: "/school-connect", icon: School },
      ]

      // ── Leadership: Principal / Vice Principal ────────────────────────────
      if (designation === 'principal' || designation === 'vice principal') {
        return [
          { title: "OVERVIEW", isLabel: true },
          { title: "Dashboard", url: "/staff-dashboard", icon: LayoutDashboard },
          { title: "TEACHING", isLabel: true },
          { title: "My Classes", url: "/my-classes", icon: GraduationCap },
          { title: "Attendance", url: "/attendance", icon: UserCheck },
          { title: t('nav.timetable'), url: "/timetable", icon: Clock },
          { title: "Grades", url: "/grades", icon: BookOpen },
          { title: "Assignments", url: "/assignments", icon: ClipboardList },
          { title: "ADMINISTRATION", isLabel: true },
          { title: "Leave Management", url: "/leave-management", icon: Calendar },
          { title: "Communication", url: "/communication", icon: MessageSquare },
          { title: "Announcements", url: "/announcements", icon: Bell },
          { title: "School Connect", url: "/school-connect", icon: School },
        ]
      }

      // ── Head of Department ────────────────────────────────────────────────
      if (designation === 'head of department') {
        return [
          ...shared,
          { title: "DEPARTMENT", isLabel: true },
          { title: "My Classes", url: "/my-classes", icon: GraduationCap },
          { title: "Timetable", url: "/timetable", icon: Clock },
          { title: t('nav.examinations'), url: "/examinations", icon: Award },
          { title: "Grades", url: "/grades", icon: BookOpen },
          { title: "Assignments", url: "/assignments", icon: ClipboardList },
          { title: "Staff", url: "/staff", icon: UserCheck },
          { title: "Message Parents", url: "/staff-parent-communication", icon: MessageSquare },
        ]
      }

      // ── Class Teacher / Teacher ───────────────────────────────────────────
      if (designation === 'class teacher' || designation === 'teacher') {
        return [
          ...shared,
          { title: "ACADEMIC", isLabel: true },
          { title: "My Classes", url: "/my-classes", icon: GraduationCap },
          { title: "Attendance", url: "/attendance", icon: UserCheck },
          { title: "Grades", url: "/grades", icon: BookOpen },
          { title: "Assignments", url: "/assignments", icon: ClipboardList },
          { title: "Timetable", url: "/timetable", icon: Clock },
          { title: "COMMUNICATION", isLabel: true },
          { title: "Message Parents", url: "/staff-parent-communication", icon: MessageSquare },
          { title: "Communication", url: "/communication", icon: MessageSquare },
        ]
      }

      // ── Accountant / Finance ──────────────────────────────────────────────
      if (designation === 'accountant') {
        return [
          ...shared,
          { title: "FINANCE", isLabel: true },
          { title: "Fees", url: "/fees", icon: DollarSign },
          { title: "Wallet / Finance", url: "/wallet", icon: Wallet },
          { title: "Store", url: "/store", icon: ShoppingBag },
        ]
      }

      // ── HR Manager ───────────────────────────────────────────────────────
      if (designation === 'hr manager') {
        return [
          ...shared,
          { title: "HR MANAGEMENT", isLabel: true },
          { title: "Staff", url: "/staff", icon: UserCheck },
        ]
      }

      // ── Librarian ────────────────────────────────────────────────────────
      if (designation === 'librarian') {
        return [
          ...shared,
          { title: "LIBRARY", isLabel: true },
          { title: "Library", url: "/library", icon: Library },
          { title: "Students", url: "/students", icon: Users },
        ]
      }

      // ── Transport Manager ────────────────────────────────────────────────
      if (designation === 'transport manager') {
        return [
          ...shared,
          { title: "TRANSPORT", isLabel: true },
          { title: "Transport", url: "/transport", icon: Truck },
          { title: "Students", url: "/students", icon: Users },
        ]
      }

      // ── Hostel Warden ────────────────────────────────────────────────────
      if (designation === 'hostel warden') {
        return [
          ...shared,
          { title: "HOSTEL", isLabel: true },
          { title: "Hostel", url: "/hostel", icon: Home },
          { title: "Health", url: "/health", icon: HeartPulse },
          { title: "Students", url: "/students", icon: Users },
        ]
      }

      // ── Admissions Officer ────────────────────────────────────────────────
      if (designation === 'admissions officer') {
        return [
          ...shared,
          { title: "ADMISSIONS", isLabel: true },
          { title: "Students", url: "/students", icon: Users },
          { title: "Communication", url: "/communication", icon: MessageSquare },
        ]
      }

      // ── Counselor ────────────────────────────────────────────────────────
      if (designation === 'counselor') {
        return [
          ...shared,
          { title: "SERVICES", isLabel: true },
          { title: "Health", url: "/health", icon: HeartPulse },
          { title: "Communication", url: "/communication", icon: MessageSquare },
          { title: "Students", url: "/students", icon: Users },
        ]
      }

      // ── Default Staff fallback ────────────────────────────────────────────
      return [
        ...shared,
        { title: "ACADEMIC", isLabel: true },
        { title: "My Classes", url: "/my-classes", icon: GraduationCap },
        { title: "Attendance", url: "/attendance", icon: UserCheck },
        { title: "Message Parents", url: "/staff-parent-communication", icon: MessageSquare },
      ]
    }

    if (user.role === 'parent') {
      return [
        { title: t('nav.childProfile'), url: "/child-profile", icon: User },
        { title: t('nav.fees'), url: "/parent-fees", icon: DollarSign },
        { title: t('nav.notifications'), url: "/parent-notifications", icon: MessageSquare },
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

