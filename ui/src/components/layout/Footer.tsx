export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer id="footer" className="relative mt-auto">
      {/* Gradient accent line at top */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

      <div className="bg-card/80 backdrop-blur-sm">
        <div className="container mx-auto max-w-7xl px-5 sm:px-8">

          {/* Main row */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4">

            {/* Brand */}
            <div className="flex items-center gap-3">
              <div className="relative w-8 h-8 rounded-lg overflow-hidden ring-1 ring-border/60 shadow-sm bg-background flex items-center justify-center">
                <img src="/favicon.ico" alt="Veda" className="w-6 h-6 object-contain" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold tracking-tight text-foreground">VEDA</span>
                  <span className="text-[9px] font-semibold uppercase tracking-[0.12em] px-1.5 py-0.5 rounded-sm bg-primary/10 text-primary border border-primary/20">
                    v2.0
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground/60 tracking-wide">School Management Platform</p>
              </div>
            </div>

            {/* Status + links */}
            <div className="flex items-center gap-5 text-[11px] text-muted-foreground/55">
              <span className="flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-50" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                All systems operational
              </span>
              <span className="hidden sm:block h-3 w-px bg-border/60" />
              <div className="hidden sm:flex items-center gap-4">
                <a href="#" className="hover:text-foreground transition-colors duration-150">Privacy</a>
                <a href="#" className="hover:text-foreground transition-colors duration-150">Terms</a>
                <a href="mailto:support@vitanagroup.com" className="hover:text-foreground transition-colors duration-150">
                  support@vitanagroup.com
                </a>
              </div>
            </div>

            {/* Copyright */}
            <p className="text-[11px] text-muted-foreground/45 tabular-nums whitespace-nowrap">
              © {year} Vitana Private Limited
            </p>

          </div>

          {/* Mobile-only links row */}
          <div className="flex sm:hidden justify-center gap-5 pb-3 text-[11px] text-muted-foreground/55 border-t border-border/30 pt-3">
            <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
            <a href="#" className="hover:text-foreground transition-colors">Terms</a>
            <a href="mailto:support@vitanagroup.com" className="hover:text-foreground transition-colors">Support</a>
          </div>

        </div>
      </div>
    </footer>
  );
}

