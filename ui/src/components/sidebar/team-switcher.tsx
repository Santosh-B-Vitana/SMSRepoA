
import * as React from "react"
import { BookOpen, Pencil, Ruler, Calculator } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { useAuth } from "@/contexts/AuthContext"
import { useSchool } from "@/contexts/SchoolContext"
import { useNavigate } from "react-router-dom"

export function TeamSwitcher() {
  const { isMobile } = useSidebar()
  const { user } = useAuth()
  const { schoolInfo } = useSchool()
  const navigate = useNavigate()

  const appName = "VEDA";
  const appDesc = "Vitana Educational Application";
  const isPro = (schoolInfo as any)?.plan === 'Pro';

  const handleLogoClick = () => {
    const role = user?.role?.toLowerCase();
    const routes: Record<string, string> = {
      staff: '/staff-dashboard',
      admin: '/admin-dashboard',
      parent: '/parent-dashboard',
      super_admin: '/super-admin-dashboard',
    };
    navigate(routes[role ?? ''] ?? '/dashboard');
  };

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <div 
          className="group relative px-2 py-2.5 cursor-pointer rounded-md hover:bg-sidebar-accent/50 transition-all duration-150 border-b border-sidebar-border/40" 
          onClick={handleLogoClick}
        >
          {/* Decorative education icons - subtle and premium, positioned closer */}
          <BookOpen className="absolute top-1.5 right-3 w-4 h-4 text-primary/40 rotate-6 group-hover:text-primary/50 transition-colors duration-200" strokeWidth={1.5} />
          <Pencil className="absolute top-4 right-2 w-3.5 h-3.5 text-primary/35 rotate-35 group-hover:text-primary/45 transition-colors duration-200" strokeWidth={1.5} />
          <Ruler className="absolute bottom-2 right-4 w-3.5 h-3.5 text-primary/30 -rotate-15 group-hover:text-primary/40 transition-colors duration-200" strokeWidth={1.5} />
          <Calculator className="absolute bottom-1.5 right-7 w-3 h-3 text-primary/35 -rotate-8 group-hover:text-primary/45 transition-colors duration-200" strokeWidth={1.5} />
          <Pencil className="absolute top-2.5 right-6 w-2.5 h-2.5 text-primary/30 rotate-20 group-hover:text-primary/40 transition-colors duration-200" strokeWidth={1.5} />
          
          {/* Content */}
          <div className="relative flex items-center gap-2.5">
            {/* Logo */}
            <div className="relative flex-shrink-0">
              {/* Subtle glow */}
              <div className="absolute inset-0 rounded-lg bg-primary/5 opacity-0 group-hover:opacity-100 blur-sm transition-opacity duration-300"></div>
              
              <div className="relative w-10 h-10 rounded-lg bg-gradient-to-br from-sidebar-accent/70 to-sidebar-accent/50 group-hover:from-sidebar-accent group-hover:to-sidebar-accent/70 transition-all duration-200 flex items-center justify-center p-2 shadow-sm group-hover:shadow">
                <img 
                  src="/favicon.ico" 
                  alt="VEDA" 
                  className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-200" 
                />
              </div>
            </div>
            
            {/* Brand */}
            <div className="flex-1 min-w-0 space-y-0.5">
              {/* Brand name and badge */}
              <div className="flex items-center gap-2">
                <h1 className="text-[19px] font-bold text-sidebar-foreground leading-none" style={{ fontFamily: 'system-ui, -apple-system, sans-serif', letterSpacing: '-0.01em' }}>
                  <span className="bg-gradient-to-br from-sidebar-foreground to-sidebar-foreground/90 bg-clip-text text-transparent">
                    VEDA
                  </span>
                </h1>
                {isPro && (
                  <span className="px-2 py-0.5 text-[8px] font-extrabold tracking-[0.1em] rounded bg-gradient-to-r from-slate-300 via-gray-100 to-slate-300 text-slate-800 shadow-sm group-hover:shadow-md transition-shadow duration-200 border border-slate-200/50">
                    PRO
                  </span>
                )}
              </div>
              
              {/* Tagline */}
              <div className="space-y-0">
                <p className="text-[10px] font-semibold text-muted-foreground/70 leading-tight" style={{ letterSpacing: '0.02em' }}>
                  Education Platform
                </p>
                <p className="text-[9px] font-medium text-muted-foreground/55 leading-tight" style={{ letterSpacing: '0.03em' }}>
                  by Vitana Inc.
                </p>
              </div>
            </div>
          </div>
        </div>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
