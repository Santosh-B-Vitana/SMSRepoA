import { useEffect, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { WifiOff, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

export function NetworkErrorHandler() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showOfflineAlert, setShowOfflineAlert] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowOfflineAlert(false);
      toast.success('Connection restored', {
        description: 'You are back online'
      });
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowOfflineAlert(true);
      toast.error('Connection lost', {
        description: 'Please check your internet connection',
        duration: Infinity
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!showOfflineAlert) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md">
      <Alert variant="destructive">
        <WifiOff className="h-4 w-4" />
        <AlertTitle>No Internet Connection</AlertTitle>
        <AlertDescription className="space-y-2">
          <p>You are currently offline. Some features may not be available.</p>
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => window.location.reload()}
            className="mt-2"
          >
            <RefreshCw className="h-3 w-3 mr-2" />
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    </div>
  );
}

// Network status hook
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

// Network-aware fetch wrapper
export async function networkAwareFetch<T>(
  fetchFn: () => Promise<T>,
  options?: {
    retries?: number;
    retryDelay?: number;
    onError?: (error: Error) => void;
  }
): Promise<T> {
  const { retries = 3, retryDelay = 1000, onError } = options || {};

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      if (!navigator.onLine) {
        throw new Error('No internet connection');
      }

      return await fetchFn();
    } catch (error) {
      const isLastAttempt = attempt === retries - 1;
      
      if (isLastAttempt) {
        if (onError) {
          onError(error as Error);
        }
        throw error;
      }

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)));
    }
  }

  throw new Error('Max retries exceeded');
}
