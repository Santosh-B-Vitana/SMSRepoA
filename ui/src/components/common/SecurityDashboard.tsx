import React from 'react';
import { Shield, AlertTriangle, CheckCircle, XCircle, Info, Lock, Eye, FileWarning, Key } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface SecurityCheck {
  id: string;
  name: string;
  description: string;
  status: 'pass' | 'warning' | 'fail' | 'info';
  category: 'authentication' | 'authorization' | 'data' | 'network' | 'input';
}

interface SecurityDashboardProps {
  className?: string;
}

export function SecurityDashboard({ className }: SecurityDashboardProps) {
  // Security checks status (would be computed from actual app state in production)
  const securityChecks: SecurityCheck[] = [
    {
      id: 'session-mgmt',
      name: 'Session Management',
      description: 'Secure session storage with expiry and refresh',
      status: 'pass',
      category: 'authentication',
    },
    {
      id: 'rate-limiting',
      name: 'Rate Limiting',
      description: 'Login attempt limiting to prevent brute force',
      status: 'pass',
      category: 'authentication',
    },
    {
      id: 'password-strength',
      name: 'Password Requirements',
      description: 'Strong password validation enforced',
      status: 'pass',
      category: 'authentication',
    },
    {
      id: 'input-validation',
      name: 'Input Validation',
      description: 'Zod schema validation on all forms',
      status: 'pass',
      category: 'input',
    },
    {
      id: 'xss-prevention',
      name: 'XSS Prevention',
      description: 'HTML entity encoding for user input',
      status: 'pass',
      category: 'input',
    },
    {
      id: 'csrf-protection',
      name: 'CSRF Protection',
      description: 'Token-based CSRF prevention',
      status: 'pass',
      category: 'network',
    },
    {
      id: 'role-based-access',
      name: 'Role-Based Access',
      description: 'Module and route protection by role',
      status: 'pass',
      category: 'authorization',
    },
    {
      id: 'data-masking',
      name: 'Sensitive Data Masking',
      description: 'Aadhaar, PAN, phone masking in logs',
      status: 'pass',
      category: 'data',
    },
    {
      id: 'secure-storage',
      name: 'Secure Storage',
      description: 'Session storage instead of local storage',
      status: 'pass',
      category: 'data',
    },
    {
      id: 'activity-logging',
      name: 'Activity Logging',
      description: 'User actions tracked for audit',
      status: 'pass',
      category: 'authorization',
    },
    {
      id: 'file-validation',
      name: 'File Upload Validation',
      description: 'Type and size restrictions on uploads',
      status: 'pass',
      category: 'input',
    },
    {
      id: 'network-handling',
      name: 'Network Error Handling',
      description: 'Graceful offline detection and retry',
      status: 'pass',
      category: 'network',
    },
  ];

  const passCount = securityChecks.filter(c => c.status === 'pass').length;
  const warningCount = securityChecks.filter(c => c.status === 'warning').length;
  const failCount = securityChecks.filter(c => c.status === 'fail').length;
  const totalChecks = securityChecks.length;
  const score = Math.round((passCount / totalChecks) * 100);

  const getStatusIcon = (status: SecurityCheck['status']) => {
    switch (status) {
      case 'pass':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'fail':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'info':
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const getCategoryIcon = (category: SecurityCheck['category']) => {
    switch (category) {
      case 'authentication':
        return <Key className="h-4 w-4" />;
      case 'authorization':
        return <Lock className="h-4 w-4" />;
      case 'data':
        return <Eye className="h-4 w-4" />;
      case 'network':
        return <Shield className="h-4 w-4" />;
      case 'input':
        return <FileWarning className="h-4 w-4" />;
    }
  };

  const groupedChecks = securityChecks.reduce((acc, check) => {
    if (!acc[check.category]) {
      acc[check.category] = [];
    }
    acc[check.category].push(check);
    return acc;
  }, {} as Record<string, SecurityCheck[]>);

  const categoryLabels: Record<string, string> = {
    authentication: 'Authentication',
    authorization: 'Authorization',
    data: 'Data Protection',
    network: 'Network Security',
    input: 'Input Validation',
  };

  return (
    <Card className={cn('', className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Security Status</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Frontend security posture
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-primary">{score}%</div>
            <p className="text-xs text-muted-foreground">Security Score</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Progress Bar */}
        <div className="space-y-2">
          <Progress value={score} className="h-2" />
          <div className="flex justify-between text-sm">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3 text-green-500" />
                {passCount} Passed
              </span>
              <span className="flex items-center gap-1">
                <AlertTriangle className="h-3 w-3 text-yellow-500" />
                {warningCount} Warnings
              </span>
              <span className="flex items-center gap-1">
                <XCircle className="h-3 w-3 text-red-500" />
                {failCount} Failed
              </span>
            </div>
            <span className="text-muted-foreground">{totalChecks} checks</span>
          </div>
        </div>

        <Separator />

        {/* Grouped Checks */}
        <ScrollArea className="h-[300px] pr-4">
          <div className="space-y-6">
            {Object.entries(groupedChecks).map(([category, checks]) => (
              <div key={category} className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  {getCategoryIcon(category as SecurityCheck['category'])}
                  {categoryLabels[category]}
                </div>
                <div className="space-y-2 ml-6">
                  {checks.map((check) => (
                    <div
                      key={check.id}
                      className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      {getStatusIcon(check.status)}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{check.name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {check.description}
                        </p>
                      </div>
                      <Badge
                        variant={
                          check.status === 'pass' ? 'default' :
                          check.status === 'warning' ? 'secondary' :
                          'destructive'
                        }
                        className="text-xs"
                      >
                        {check.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

// Quick security status badge for headers/dashboards
export function SecurityStatusBadge() {
  return (
    <Badge variant="outline" className="gap-1.5 text-green-600 border-green-500/30 bg-green-500/10">
      <Shield className="h-3 w-3" />
      Secure
    </Badge>
  );
}
