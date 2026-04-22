import { useEffect, useState } from 'react';

interface SkipLink {
  id: string;
  label: string;
}

const defaultLinks: SkipLink[] = [
  { id: 'main-content', label: 'Skip to main content' },
  { id: 'navigation', label: 'Skip to navigation' },
  { id: 'footer', label: 'Skip to footer' },
];

export function SkipLinks({ links = defaultLinks }: { links?: SkipLink[] }) {
  const [isVisible, setIsVisible] = useState(false);

  const handleSkip = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.focus();
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="skip-links">
      {links.map((link) => (
        <a
          key={link.id}
          href={`#${link.id}`}
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:shadow-lg"
          onClick={(e) => {
            e.preventDefault();
            handleSkip(link.id);
          }}
        >
          {link.label}
        </a>
      ))}
    </div>
  );
}

export function FocusTrap({ children, active }: { children: React.ReactNode; active: boolean }) {
  useEffect(() => {
    if (!active) return;

    const focusableElements = document.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    document.addEventListener('keydown', handleTab);
    firstElement?.focus();

    return () => document.removeEventListener('keydown', handleTab);
  }, [active]);

  return <>{children}</>;
}

export function AriaAnnouncer() {
  const [message, setMessage] = useState('');

  useEffect(() => {
    const handleAnnounce = (event: CustomEvent) => {
      setMessage(event.detail.message);
      setTimeout(() => setMessage(''), 1000);
    };

    window.addEventListener('announce' as any, handleAnnounce);
    return () => window.removeEventListener('announce' as any, handleAnnounce);
  }, []);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    >
      {message}
    </div>
  );
}

export const announce = (message: string) => {
  window.dispatchEvent(new CustomEvent('announce', { detail: { message } }));
};
