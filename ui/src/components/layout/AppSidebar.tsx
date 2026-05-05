import * as React from "react"
import { GraduationCap, Users, UserCheck, BookOpen, Award, Clock, Bus, Heart, DollarSign, MessageSquare, Settings, User, Building, Library, Wallet, School, ShoppingBag, LayoutDashboard, Shield, UserCog, Home, BarChart3, UserPlus, TrendingUp } from "lucide-react"
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
        // { title: "Admissions", url: "/admissions", icon: UserPlus }, // hidden for now

        { title: "ACADEMICS & ASSESSMENT", isLabel: true },
        { title: t('nav.academicSetup'), url: "/academics", icon: BookOpen },
        { title: t('nav.examinations'), url: "/examinations", icon: Award },
        { title: t('nav.timetable'), url: "/timetable", icon: Clock },

        { title: "FINANCE & ADMINISTRATION", isLabel: true },
        { title: "Finance Dashboard", url: "/finance", icon: TrendingUp },
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
      return [
        { title: t('nav.myClasses'), url: "/my-classes", icon: GraduationCap },
        { title: t('nav.attendance'), url: "/attendance", icon: UserCheck },
        { title: "Message Parents", url: "/staff-parent-communication", icon: MessageSquare },
      ]
    }

    if (user.role === 'parent') {
      return [
        { title: t('nav.childProfile'), url: "/child-profile", icon: User },
        { title: t('nav.fees'), url: "/parent-fees", icon: DollarSign },
        { title: t('nav.notifications'), url: "/parent-notifications", icon: MessageSquare },
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
