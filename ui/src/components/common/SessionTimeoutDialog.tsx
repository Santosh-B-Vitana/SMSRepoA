import React, { useEffect, useState } from 'react';
import { useSessionTimeout } from '@/hooks/useSessionTimeout';
import { useAuth } from '@/contexts/AuthContext';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Clock, LogOut, RefreshCw } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface SessionTimeoutDialogProps {
  /** Session timeout in milliseconds (default: 30 minutes) */
  timeout?: number;
  /** Warning time before timeout in milliseconds (default: 2 minutes) */
  warningTime?: number;
  /** Enable/disable the timeout feature */
  enabled?: boolean;
}

export function SessionTimeoutDialog({
  timeout = 30 * 60 * 1000, // 30 minutes
  warningTime = 2 * 60 * 1000, // 2 minutes
  enabled = true,
}: SessionTimeoutDialogProps) {
  const { logout, refreshSession, isAuthenticated } = useAuth();
  const [showDialog, setShowDialog] = useState(false);

  const handleTimeout = () => {
    setShowDialog(false);
    logout();
  };

  const handleWarning = () => {
    if (isAuthenticated) {
      setShowDialog(true);
    }
  };

  const { remainingTime, formattedTime, resetTimeout } = useSessionTimeout({
    timeout,
    warningTime,
    onTimeout: handleTimeout,
    onWarning: handleWarning,
  });

  const handleContinue = () => {
    setShowDialog(false);
    resetTimeout();
    refreshSession();
  };

  const handleLogout = () => {
    setShowDialog(false);
    logout();
  };

  // Calculate progress percentage
  const progressPercentage = Math.max(0, (remainingTime / warningTime) * 100);

  if (!enabled || !isAuthenticated) {
    return null;
  }

  return (
    <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-warning/10 rounded-full">
              <Clock className="h-5 w-5 text-warning" />
            </div>
            <AlertDialogTitle>Session Expiring Soon</AlertDialogTitle>
          </div>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <p>
                Your session will expire in <strong className="text-foreground">{formattedTime}</strong> due to inactivity.
              </p>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Time remaining</span>
                  <span className="font-medium text-foreground">{formattedTime}</span>
                </div>
                <Progress value={progressPercentage} className="h-2" />
              </div>

              <p className="text-sm text-muted-foreground">
                Click "Continue Session" to stay logged in, or you will be automatically logged out for security.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel asChild>
            <Button variant="outline" onClick={handleLogout} className="w-full sm:w-auto">
              <LogOut className="h-4 w-4 mr-2" />
              Logout Now
            </Button>
          </AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button onClick={handleContinue} className="w-full sm:w-auto">
              <RefreshCw className="h-4 w-4 mr-2" />
              Continue Session
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// Idle detection hook for more accurate session management
export function useIdleDetection(
  onIdle: () => void,
  idleTime: number = 15 * 60 * 1000 // 15 minutes
) {
  useEffect(() => {
    let idleTimer: NodeJS.Timeout;

    const resetTimer = () => {
      clearTimeout(idleTimer);
      idleTimer = setTimeout(onIdle, idleTime);
    };

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'mousemove'];
    
    events.forEach(event => {
      document.addEventListener(event, resetTimer, { passive: true });
    });

    resetTimer();

    return () => {
      clearTimeout(idleTimer);
      events.forEach(event => {
        document.removeEventListener(event, resetTimer);
      });
    };
  }, [onIdle, idleTime]);
}
