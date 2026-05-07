import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Eye, EyeOff, KeyRound, Loader2, CheckCircle2 } from 'lucide-react';
import { authApi } from '@/services/api/authApi';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When true, the dialog cannot be dismissed — user must change password before continuing. */
  forced?: boolean;
  /** Called after a successful password change so the parent can trigger logout / re-login. */
  onSuccess?: () => void;
}

const REQUIREMENTS = [
  { label: 'At least 8 characters', test: (v: string) => v.length >= 8 },
  { label: 'At least one uppercase letter', test: (v: string) => /[A-Z]/.test(v) },
  { label: 'At least one lowercase letter', test: (v: string) => /[a-z]/.test(v) },
  { label: 'At least one number', test: (v: string) => /[0-9]/.test(v) },
];

export function ChangePasswordDialog({ open, onOpenChange, forced = false, onSuccess }: Props) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const metRequirements = REQUIREMENTS.filter(r => r.test(newPassword));
  const allRequirementsMet = metRequirements.length === REQUIREMENTS.length;
  const passwordsMatch = newPassword === confirmPassword && newPassword.length > 0;
  const canSubmit = allRequirementsMet && passwordsMatch && currentPassword.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setError('');
    setLoading(true);

    try {
      await authApi.changePassword({ currentPassword, newPassword });
      toast.success('Password changed successfully. Please log in with your new password.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      if (onSuccess) {
        onSuccess();
      } else {
        // Default: close and the AuthContext session will end on next API call
        onOpenChange(false);
      }
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ??
        err?.message ??
        'Failed to change password. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (val: boolean) => {
    if (forced && !val) return; // block dismiss when forced
    if (!val) {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setError('');
    }
    onOpenChange(val);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="sm:max-w-md"
        onInteractOutside={forced ? (e) => e.preventDefault() : undefined}
        onEscapeKeyDown={forced ? (e) => e.preventDefault() : undefined}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" />
            {forced ? 'Set Your Password' : 'Change Password'}
          </DialogTitle>
          <DialogDescription>
            {forced
              ? 'Your account was created by an administrator. You must set a personal password before continuing.'
              : 'Enter your current password and choose a strong new password.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Current password */}
          <div className="space-y-1.5">
            <Label htmlFor="cp-current">
              {forced ? 'Temporary Password' : 'Current Password'}
            </Label>
            <div className="relative">
              <Input
                id="cp-current"
                type={showCurrent ? 'text' : 'password'}
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
                required
                disabled={loading}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowCurrent(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                tabIndex={-1}
              >
                {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* New password */}
          <div className="space-y-1.5">
            <Label htmlFor="cp-new">New Password</Label>
            <div className="relative">
              <Input
                id="cp-new"
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                autoComplete="new-password"
                required
                disabled={loading}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowNew(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                tabIndex={-1}
              >
                {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            {/* Strength requirements */}
            {newPassword.length > 0 && (
              <ul className="mt-2 space-y-1">
                {REQUIREMENTS.map(req => {
                  const met = req.test(newPassword);
                  return (
                    <li key={req.label} className={`flex items-center gap-1.5 text-xs ${met ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}>
                      <CheckCircle2 className={`h-3.5 w-3.5 flex-shrink-0 ${met ? 'text-green-500' : 'text-muted-foreground/40'}`} />
                      {req.label}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Confirm new password */}
          <div className="space-y-1.5">
            <Label htmlFor="cp-confirm">Confirm New Password</Label>
            <div className="relative">
              <Input
                id="cp-confirm"
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                required
                disabled={loading}
                className={`pr-10 ${confirmPassword.length > 0 && !passwordsMatch ? 'border-destructive' : ''}`}
              />
              <button
                type="button"
                onClick={() => setShowConfirm(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                tabIndex={-1}
              >
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {confirmPassword.length > 0 && !passwordsMatch && (
              <p className="text-xs text-destructive">Passwords do not match.</p>
            )}
          </div>

          <DialogFooter className="pt-2">
            {!forced && (
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={loading}>
                Cancel
              </Button>
            )}
            <Button type="submit" disabled={!canSubmit || loading}>
              {loading ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" />Changing...</>
              ) : (
                'Change Password'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
