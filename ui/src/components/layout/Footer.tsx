
export function Footer() {
  return (
    <footer id="footer" className="bg-background border-t border-border py-3 px-4 sm:px-6">
      <div className="container mx-auto max-w-7xl">
        <div className="flex flex-col items-center justify-center space-y-1 text-center">
          <p className="text-xs text-muted-foreground">
            Powered by Vitana Group
          </p>
          <p className="text-xs text-muted-foreground/70">
            Redesigned Edition v2.0 • 2025
          </p>
          <p className="text-[10px] text-muted-foreground/60 mt-1">
            Beta Version • Currently in Testing Phase
          </p>
        </div>
      </div>
    </footer>
  );
}
