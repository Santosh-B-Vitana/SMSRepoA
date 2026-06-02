import { Shield, BarChart3, Heart, Lock } from 'lucide-react';

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer id="footer" className="relative mt-auto">
      <div className="h-px w-full bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

      <div className="bg-card/80 backdrop-blur-sm">
        <div className="container mx-auto max-w-7xl px-5 sm:px-8 py-3.5">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">

            {/* Brand + status */}
            <div className="flex items-center gap-3">
              {/* Logo mark — borderless, transparent bg */}
              <div className="shrink-0 w-7 h-7 flex items-center justify-center">
                <img src="/favicon.ico" alt="VEDA" className="w-6 h-6 object-contain opacity-80" />
              </div>
              {/* Wordmark */}
              <div className="flex flex-col leading-none">
                <div className="flex items-center gap-1.5">
                  <span className="text-[13px] font-bold tracking-[-0.01em] text-foreground">VEDA</span>
                  <span className="text-[8px] font-bold uppercase tracking-[0.14em] px-1.5 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20">v2.0</span>
                </div>
                <span className="text-[9px] text-muted-foreground/50 tracking-wide mt-0.5">by Vitana Inc.</span>
              </div>
              <span className="hidden sm:block h-3.5 w-px bg-border/50 mx-0.5" />
              <span className="hidden sm:flex items-center gap-1.5 text-[10.5px] text-muted-foreground/50">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                </span>
                Live &amp; running
              </span>
            </div>

            {/* Trust badges */}
            <div className="flex items-center gap-3.5 text-[10px] text-muted-foreground/40">
              <span className="flex items-center gap-1">
                <Lock className="h-2.5 w-2.5" />
                256-bit SSL
              </span>
              <span className="h-2.5 w-px bg-border/40" />
              <span className="flex items-center gap-1">
                <Shield className="h-2.5 w-2.5" />
                SOC 2 Aligned
              </span>
              <span className="h-2.5 w-px bg-border/40" />
              <span className="flex items-center gap-1">
                <BarChart3 className="h-2.5 w-2.5" />
                99.9% Uptime
              </span>
            </div>

            {/* Right */}
            <div className="flex items-center gap-3 text-[11px] text-muted-foreground/40">
              <span className="tabular-nums">© {year} Vitana Private Limited</span>
              <span className="h-2.5 w-px bg-border/40" />
              <span className="flex items-center gap-1">
                Built with <Heart className="h-2.5 w-2.5 text-rose-400/60 fill-rose-400/60" /> in India
              </span>
            </div>

          </div>
        </div>
      </div>
    </footer>
  );
}

