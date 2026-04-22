
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RefreshCw, CheckCircle, XCircle, Clock, AlertTriangle } from "lucide-react";

interface DeliveryStatus {
  id: string;
  messageId: string;
  recipient: string;
  recipientType: 'email' | 'sms' | 'push';
  status: 'sent' | 'delivered' | 'failed' | 'pending' | 'bounced';
  sentAt: string;
  deliveredAt?: string;
  errorMessage?: string;
  retryCount: number;
}

interface MessageDeliveryReport {
  messageId: string;
  subject: string;
  type: 'email' | 'sms' | 'notification';
  totalRecipients: number;
  delivered: number;
  failed: number;
  pending: number;
  deliveryRate: number;
}

export function NotificationTracker() {
  const [deliveryStatuses, setDeliveryStatuses] = useState<DeliveryStatus[]>([]);
  const [deliveryReports, setDeliveryReports] = useState<MessageDeliveryReport[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Mock delivery data
    const mockStatuses: DeliveryStatus[] = [
      {
        id: "DS001",
        messageId: "MSG001",
        recipient: "parent1@email.com",
        recipientType: "email",
        status: "delivered",
        sentAt: "2024-01-15T10:00:00Z",
        deliveredAt: "2024-01-15T10:01:30Z",
        retryCount: 0
      },
      {
        id: "DS002",
        messageId: "MSG001",
        recipient: "parent2@email.com",
        recipientType: "email",
        status: "failed",
        sentAt: "2024-01-15T10:00:00Z",
        errorMessage: "Invalid email address",
        retryCount: 2
      },
      {
        id: "DS003",
        messageId: "MSG002",
        recipient: "+1234567890",
        recipientType: "sms",
        status: "delivered",
        sentAt: "2024-01-15T14:30:00Z",
        deliveredAt: "2024-01-15T14:30:45Z",
        retryCount: 0
      }
    ];

    const mockReports: MessageDeliveryReport[] = [
      {
        messageId: "MSG001",
        subject: "Monthly Fee Reminder",
        type: "email",
        totalRecipients: 150,
        delivered: 142,
        failed: 5,
        pending: 3,
        deliveryRate: 94.7
      },
      {
        messageId: "MSG002",
        subject: "Attendance Alert",
        type: "sms",
        totalRecipients: 25,
        delivered: 24,
        failed: 1,
        pending: 0,
        deliveryRate: 96.0
      }
    ];

    setDeliveryStatuses(mockStatuses);
    setDeliveryReports(mockReports);
  }, []);

  const refreshDeliveryStatus = () => {
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      // Update some statuses
      setDeliveryStatuses(prev => prev.map(status => ({
        ...status,
        status: status.status === 'pending' ? 'delivered' : status.status
      })));
      setLoading(false);
    }, 1000);
  };

  const retryFailedDelivery = (statusId: string) => {
    setDeliveryStatuses(prev => prev.map(status => 
      status.id === statusId 
        ? { ...status, status: 'pending', retryCount: status.retryCount + 1 }
        : status
    ));

    // Simulate retry
    setTimeout(() => {
      setDeliveryStatuses(prev => prev.map(status => 
        status.id === statusId 
          ? { ...status, status: Math.random() > 0.5 ? 'delivered' : 'failed' }
          : status
      ));
    }, 2000);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'delivered':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
      case 'bounced':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered': return 'default';
      case 'failed': 
      case 'bounced': return 'destructive';
      case 'pending': return 'secondary';
      default: return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Delivery Tracking</h2>
        <Button onClick={refreshDeliveryStatus} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh Status
        </Button>
      </div>

      <Tabs defaultValue="reports">
        <TabsList>
          <TabsTrigger value="reports">Delivery Reports</TabsTrigger>
          <TabsTrigger value="details">Detailed Status</TabsTrigger>
        </TabsList>

        <TabsContent value="reports" className="space-y-4">
          <div className="grid gap-4">
            {deliveryReports.map((report) => (
              <Card key={report.messageId}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base">{report.subject}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {report.type.toUpperCase()} • {report.totalRecipients} recipients
                      </p>
                    </div>
                    <Badge variant="outline">{report.deliveryRate}% delivered</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <Progress value={report.deliveryRate} className="w-full" />
                    
                    <div className="grid grid-cols-4 gap-4 text-center">
                      <div>
                        <p className="text-2xl font-bold text-green-600">{report.delivered}</p>
                        <p className="text-sm text-muted-foreground">Delivered</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-red-600">{report.failed}</p>
                        <p className="text-sm text-muted-foreground">Failed</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-yellow-600">{report.pending}</p>
                        <p className="text-sm text-muted-foreground">Pending</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{report.totalRecipients}</p>
                        <p className="text-sm text-muted-foreground">Total</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="details">
          <Card>
            <CardHeader>
              <CardTitle>Detailed Delivery Status</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Recipient</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Sent At</TableHead>
                    <TableHead>Delivered At</TableHead>
                    <TableHead>Retries</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deliveryStatuses.map((status) => (
                    <TableRow key={status.id}>
                      <TableCell className="font-medium">{status.recipient}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {status.recipientType.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(status.status)}
                          <Badge variant={getStatusColor(status.status) as any}>
                            {status.status}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        {new Date(status.sentAt).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {status.deliveredAt ? new Date(status.deliveredAt).toLocaleString() : '-'}
                      </TableCell>
                      <TableCell>{status.retryCount}</TableCell>
                      <TableCell>
                        {status.status === 'failed' && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => retryFailedDelivery(status.id)}
                          >
                            Retry
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
