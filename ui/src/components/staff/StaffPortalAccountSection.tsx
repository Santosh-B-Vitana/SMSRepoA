import React, { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  UserCog,
  ShieldCheck,
  ShieldAlert,
  ShieldOff,
  RotateCcw,
  Copy,
  CheckCheck,
  Loader2,
  AlertCircle,
  Mail,
  Phone,
  Briefcase,
  BadgeInfo,
} from 'lucide-react';
import {
  authApi,
  type StaffAccountStatus,
  type ProvisionStaffAccountResponse,
} from '@/services/api/authApi';
import { toast } from 'sonner';

interface Props {
  staffId: string;
}

export function StaffPortalAccountSection({ staffId }: Props) {
  const [account, setAccount] = useState<StaffAccountStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [credentialDialog, setCredentialDialog] = useState<{
    open: boolean;
    result: ProvisionStaffAccountResponse | null;
  }>({ open: false, result: null });

  const [actionLoading, setActionLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await authApi.getStaffAccount(staffId);
      setAccount(data);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to load staff portal account.');
    } finally {
      setLoading(false);
    }
  }, [staffId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleProvision = async () => {
    setActionLoading(true);
    try {
      const result = await authApi.provisionStaffAccount(staffId);
      setCredentialDialog({ open: true, result });
      await load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to provision account.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReset = async () => {
    setActionLoading(true);
    try {
      const result = await authApi.resetStaffPassword(staffId);
      setCredentialDialog({ open: true, result });
      await load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to reset password.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCopy = () => {
    if (credentialDialog.result?.temporaryPassword) {
      navigator.clipboard.writeText(credentialDialog.result.temporaryPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const StatusBadge = ({ acct }: { acct: StaffAccountStatus }) => {
    if (!acct.hasAccount)
      return (
        <Badge variant="outline" className="text-muted-foreground gap-1">
          <ShieldOff className="h-3 w-3" />No Account
        </Badge>
      );
    const s = acct.accountStatus ?? 'active';
    const map: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
      active:    { label: 'Active',    className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',   icon: <ShieldCheck className="h-3 w-3" /> },
      locked:    { label: 'Locked',    className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',           icon: <ShieldAlert className="h-3 w-3" /> },
      inactive:  { label: 'Inactive',  className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', icon: <ShieldAlert className="h-3 w-3" /> },
      suspended: { label: 'Suspended', className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400', icon: <ShieldAlert className="h-3 w-3" /> },
    };
    const cfg = map[s] ?? map.active;
    return (
      <Badge className={`gap-1 border-0 font-normal ${cfg.className}`}>
        {cfg.icon}{cfg.label}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-4 text-muted-foreground text-sm">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading staff portal account…
      </div>
    );
  }

  return (
    <>
      <Card className="border border-dashed">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <UserCog className="h-4 w-4 text-primary" />
            Staff Portal Account
          </CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-3">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {account && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg bg-muted/40 border">
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm">{account.staffName}</span>
                  {account.employeeId && (
                    <Badge variant="secondary" className="text-xs font-mono">{account.employeeId}</Badge>
                  )}
                  <StatusBadge acct={account} />
                  {account.hasAccount && account.requirePasswordChange && (
                    <Badge variant="outline" className="text-xs text-amber-600 border-amber-400">
                      Password Change Required
                    </Badge>
                  )}
                </div>
                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                  {account.designation && (
                    <span className="flex items-center gap-1">
                      <Briefcase className="h-3 w-3" />{account.designation}
                    </span>
                  )}
                  {account.department && (
                    <span className="flex items-center gap-1">
                      <BadgeInfo className="h-3 w-3" />{account.department}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                  {account.email && (
                    <span className="flex items-center gap-1">
                      <Mail className="h-3 w-3" />{account.email}
                    </span>
                  )}
                  {account.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="h-3 w-3" />{account.phone}
                    </span>
                  )}
                  {account.lastLogin && (
                    <span>
                      Last login:{' '}
                      {new Date(account.lastLogin).toLocaleDateString('en-IN', {
                        day: '2-digit', month: 'short', year: 'numeric',
                      })}
                    </span>
                  )}
                </div>
                {!account.email && (
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    No email on record — update the staff profile to enable portal access.
                  </p>
                )}
              </div>

              <div className="flex gap-2 flex-shrink-0">
                {!account.hasAccount ? (
                  <Button
                    size="sm"
                    variant="default"
                    onClick={handleProvision}
                    disabled={!account.email || actionLoading}
                  >
                    {actionLoading
                      ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                      : <ShieldCheck className="h-3.5 w-3.5 mr-1" />
                    }
                    Create Account
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleReset}
                    disabled={actionLoading}
                  >
                    {actionLoading
                      ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                      : <RotateCcw className="h-3.5 w-3.5 mr-1" />
                    }
                    Reset Password
                  </Button>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Credential reveal dialog */}
      <Dialog
        open={credentialDialog.open}
        onOpenChange={v => {
          if (!v) setCopied(false);
          setCredentialDialog(prev => ({ ...prev, open: v }));
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-green-600" />
              {credentialDialog.result?.action === 'provisioned'
                ? 'Staff Account Created'
                : 'Password Reset'}
            </DialogTitle>
            <DialogDescription>
              {credentialDialog.result?.message}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <Alert className="border-amber-400 bg-amber-50 dark:bg-amber-950/20">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-700 dark:text-amber-400 text-sm">
                This password is shown <strong>once only</strong>. Copy it and share it with the staff member securely.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{credentialDialog.result?.staffName}</span>
                {credentialDialog.result?.employeeId && (
                  <span className="ml-1 text-xs font-mono">({credentialDialog.result.employeeId})</span>
                )}
                {' '}— {credentialDialog.result?.email}
              </div>

              <div className="flex items-center gap-2">
                <div className="flex-1 font-mono text-lg font-semibold tracking-wider bg-muted px-4 py-3 rounded-lg border select-all text-center">
                  {credentialDialog.result?.temporaryPassword}
                </div>
                <Button variant="outline" size="icon" onClick={handleCopy} className="flex-shrink-0">
                  {copied
                    ? <CheckCheck className="h-4 w-4 text-green-600" />
                    : <Copy className="h-4 w-4" />}
                </Button>
              </div>

              <p className="text-xs text-muted-foreground">
                The staff member will be required to change this password on first login.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setCredentialDialog({ open: false, result: null })}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
