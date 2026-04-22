import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { Wifi, WifiOff, Upload, CheckCircle2, Clock } from "lucide-react";

interface OfflineRecord {
  id: string;
  studentId: string;
  studentName: string;
  status: 'present' | 'absent';
  date: string;
  time: string;
  synced: boolean;
}

export function OfflineAttendanceManager() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [offlineRecords, setOfflineRecords] = useState<OfflineRecord[]>([
    {
      id: '1',
      studentId: 'STU001',
      studentName: 'Rahul Kumar',
      status: 'present',
      date: '2024-11-25',
      time: '09:15:00',
      synced: false
    },
    {
      id: '2',
      studentId: 'STU002',
      studentName: 'Priya Sharma',
      status: 'present',
      date: '2024-11-25',
      time: '09:16:00',
      synced: false
    }
  ]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success('Back online! You can now sync attendance records.');
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.warning('You are offline. Attendance will be saved locally.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const syncRecords = async () => {
    const unsyncedRecords = offlineRecords.filter(r => !r.synced);
    
    if (unsyncedRecords.length === 0) {
      toast.info('All records are already synced');
      return;
    }

    if (!isOnline) {
      toast.error('Cannot sync while offline');
      return;
    }

    // Simulate API sync
    toast.promise(
      new Promise((resolve) => setTimeout(resolve, 2000)),
      {
        loading: `Syncing ${unsyncedRecords.length} records...`,
        success: () => {
          setOfflineRecords(records => 
            records.map(r => ({ ...r, synced: true }))
          );
          return `Successfully synced ${unsyncedRecords.length} records`;
        },
        error: 'Failed to sync records'
      }
    );
  };

  const unsyncedCount = offlineRecords.filter(r => !r.synced).length;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Offline Attendance</h2>
          <p className="text-muted-foreground">Mark attendance even without internet connection</p>
        </div>
        <Badge variant={isOnline ? "default" : "destructive"} className="gap-2">
          {isOnline ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
          {isOnline ? 'Online' : 'Offline'}
        </Badge>
      </div>

      {!isOnline && (
        <Alert className="border-warning bg-warning/10">
          <WifiOff className="h-4 w-4 text-warning" />
          <AlertDescription className="text-warning-foreground">
            You are currently offline. All attendance records will be saved locally and synced automatically when connection is restored.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Records</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{offlineRecords.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Synced</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-success">
              {offlineRecords.filter(r => r.synced).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Sync</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-warning">{unsyncedCount}</div>
          </CardContent>
        </Card>
      </div>

      {unsyncedCount > 0 && (
        <Card className="border-warning">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Unsynced Records</CardTitle>
                <CardDescription>
                  {unsyncedCount} record(s) waiting to be synced to server
                </CardDescription>
              </div>
              <Button 
                onClick={syncRecords} 
                disabled={!isOnline}
                className="gap-2"
              >
                <Upload className="h-4 w-4" />
                Sync Now
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {offlineRecords.filter(r => !r.synced).map((record) => (
                <div 
                  key={record.id}
                  className="flex items-center justify-between p-3 bg-muted rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="font-medium text-foreground">{record.studentName}</div>
                      <div className="text-sm text-muted-foreground">
                        {record.date} at {record.time}
                      </div>
                    </div>
                  </div>
                  <Badge variant={record.status === 'present' ? 'default' : 'destructive'}>
                    {record.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {offlineRecords.filter(r => r.synced).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Synced Records</CardTitle>
            <CardDescription>Successfully synced attendance records</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {offlineRecords.filter(r => r.synced).map((record) => (
                <div 
                  key={record.id}
                  className="flex items-center justify-between p-3 bg-success/10 rounded-lg border border-success/20"
                >
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    <div>
                      <div className="font-medium text-foreground">{record.studentName}</div>
                      <div className="text-sm text-muted-foreground">
                        {record.date} at {record.time}
                      </div>
                    </div>
                  </div>
                  <Badge variant="outline" className="border-success text-success">
                    Synced
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
