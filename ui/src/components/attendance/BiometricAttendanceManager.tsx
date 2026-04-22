
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Fingerprint, Scan, UserCheck, Clock, AlertCircle, CheckCircle, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface BiometricDevice {
  id: string;
  name: string;
  type: 'fingerprint' | 'face_recognition' | 'iris' | 'palm';
  location: string;
  status: 'online' | 'offline' | 'maintenance';
  lastSync: string;
  enrolledUsers: number;
}

interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  deviceId: string;
  timestamp: string;
  type: 'check_in' | 'check_out';
  confidence: number;
}

export function BiometricAttendanceManager() {
  const [devices] = useState<BiometricDevice[]>([
    {
      id: "DEV001",
      name: "Main Entrance Scanner",
      type: "fingerprint",
      location: "Main Building Entrance",
      status: "online",
      lastSync: "2 minutes ago",
      enrolledUsers: 125
    },
    {
      id: "DEV002", 
      name: "Staff Room Face Scanner",
      type: "face_recognition",
      location: "Staff Room",
      status: "online",
      lastSync: "5 minutes ago",
      enrolledUsers: 85
    },
    {
      id: "DEV003",
      name: "Admin Block Scanner",
      type: "fingerprint", 
      location: "Administrative Block",
      status: "offline",
      lastSync: "2 hours ago",
      enrolledUsers: 45
    }
  ]);

  const [attendanceRecords] = useState<AttendanceRecord[]>([
    {
      id: "ATT001",
      employeeId: "STAFF001",
      employeeName: "Dr. Sarah Martinez",
      deviceId: "DEV001",
      timestamp: "2024-03-15 08:30:00",
      type: "check_in",
      confidence: 98.5
    },
    {
      id: "ATT002",
      employeeId: "STAFF002", 
      employeeName: "James Thompson",
      deviceId: "DEV002",
      timestamp: "2024-03-15 08:45:00",
      type: "check_in",
      confidence: 96.2
    },
    {
      id: "ATT003",
      employeeId: "STAFF001",
      employeeName: "Dr. Sarah Martinez", 
      deviceId: "DEV001",
      timestamp: "2024-03-15 17:30:00",
      type: "check_out",
      confidence: 97.8
    }
  ]);

  const { toast } = useToast();

  const handleDeviceSync = (deviceId: string) => {
    toast({
      title: "Device Sync Initiated",
      description: `Syncing attendance data from device ${deviceId}...`,
    });
  };

  const handleEnrollUser = () => {
    toast({
      title: "User Enrollment",
      description: "Biometric enrollment process initiated. Please follow device instructions.",
    });
  };

  const getDeviceIcon = (type: BiometricDevice['type']) => {
    switch (type) {
      case 'fingerprint':
        return <Fingerprint className="h-5 w-5" />;
      case 'face_recognition':
        return <Scan className="h-5 w-5" />;
      case 'iris':
        return <UserCheck className="h-5 w-5" />;
      case 'palm':
        return <UserCheck className="h-5 w-5" />;
      default:
        return <Fingerprint className="h-5 w-5" />;
    }
  };

  const getStatusColor = (status: BiometricDevice['status']) => {
    switch (status) {
      case 'online':
        return 'text-green-600';
      case 'offline':
        return 'text-red-600';
      case 'maintenance':
        return 'text-yellow-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Biometric Attendance Management</h2>
        <Badge variant="secondary" className="bg-blue-100 text-blue-800">
          <CheckCircle className="h-3 w-3 mr-1" />
          Mock Implementation
        </Badge>
      </div>

      <Tabs defaultValue="devices">
        <TabsList className="w-full flex">
          <TabsTrigger value="devices">Devices</TabsTrigger>
          <TabsTrigger value="attendance">Live Attendance</TabsTrigger>
          <TabsTrigger value="enrollment">User Enrollment</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="devices" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Biometric Devices</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {devices.map((device) => (
                  <Card key={device.id} className={`border-2 ${device.status === 'online' ? 'border-green-200 bg-green-50' : device.status === 'offline' ? 'border-red-200 bg-red-50' : 'border-yellow-200 bg-yellow-50'}`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          {getDeviceIcon(device.type)}
                          <CardTitle className="text-lg">{device.name}</CardTitle>
                        </div>
                        <Badge variant={device.status === 'online' ? 'default' : device.status === 'offline' ? 'destructive' : 'secondary'}>
                          {device.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="text-sm space-y-1">
                        <p><strong>Type:</strong> {device.type.replace('_', ' ').toUpperCase()}</p>
                        <p><strong>Location:</strong> {device.location}</p>
                        <p><strong>Enrolled Users:</strong> {device.enrolledUsers}</p>
                        <p><strong>Last Sync:</strong> {device.lastSync}</p>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button 
                          onClick={() => handleDeviceSync(device.id)}
                          variant="outline" 
                          size="sm"
                          className="flex-1"
                        >
                          <Clock className="h-3 w-3 mr-1" />
                          Sync
                        </Button>
                        <Button variant="outline" size="sm" className="flex-1">
                          <Settings className="h-3 w-3 mr-1" />
                          Config
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attendance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Today's Attendance Records</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Device</TableHead>
                    <TableHead>Confidence</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attendanceRecords.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium">{record.employeeName}</TableCell>
                      <TableCell>{new Date(record.timestamp).toLocaleTimeString()}</TableCell>
                      <TableCell>
                        <Badge variant={record.type === 'check_in' ? 'default' : 'secondary'}>
                          {record.type.replace('_', ' ').toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>{record.deviceId}</TableCell>
                      <TableCell>
                        <span className={record.confidence > 95 ? 'text-green-600' : record.confidence > 90 ? 'text-yellow-600' : 'text-red-600'}>
                          {record.confidence}%
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="enrollment" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Biometric Enrollment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label>Select Employee</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose employee" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="staff001">Dr. Sarah Martinez</SelectItem>
                        <SelectItem value="staff002">James Thompson</SelectItem>
                        <SelectItem value="staff003">Maria Garcia</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label>Select Device</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose device" />
                      </SelectTrigger>
                      <SelectContent>
                        {devices.filter(d => d.status === 'online').map((device) => (
                          <SelectItem key={device.id} value={device.id}>
                            {device.name} ({device.type})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label>Biometric Type</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select biometric type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fingerprint">Fingerprint</SelectItem>
                        <SelectItem value="face">Face Recognition</SelectItem>
                        <SelectItem value="iris">Iris Scan</SelectItem>
                        <SelectItem value="palm">Palm Print</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <Button onClick={handleEnrollUser} className="w-full">
                    <UserCheck className="h-4 w-4 mr-2" />
                    Start Enrollment Process
                  </Button>
                </div>
                
                <div className="space-y-4">
                  <div className="p-4 border rounded-lg bg-muted">
                    <h4 className="font-medium mb-2">Enrollment Instructions</h4>
                    <ul className="text-sm space-y-1">
                      <li>1. Select the employee to enroll</li>
                      <li>2. Choose the biometric device</li>
                      <li>3. Select the biometric type</li>
                      <li>4. Follow device-specific instructions</li>
                      <li>5. Verify enrollment success</li>
                    </ul>
                  </div>
                  
                  <div className="p-4 border border-blue-200 bg-blue-50 rounded-lg">
                    <div className="flex items-start space-x-3">
                      <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-blue-900">Integration Ready</h4>
                        <p className="text-sm text-blue-700 mt-1">
                          This system supports integration with leading biometric providers including ZKTeco, eSSL, Suprema, and Mantra.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Biometric System Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-medium">Security Settings</h4>
                  
                  <div className="flex items-center justify-between">
                    <Label>Require High Confidence Match</Label>
                    <Switch defaultChecked />
                  </div>
                  
                  <div>
                    <Label>Minimum Confidence Threshold (%)</Label>
                    <Input type="number" defaultValue="90" min="70" max="99" />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label>Enable Duplicate Detection</Label>
                    <Switch defaultChecked />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label>Log Failed Attempts</Label>
                    <Switch defaultChecked />
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h4 className="font-medium">Integration Settings</h4>
                  
                  <div>
                    <Label>Device Protocol</Label>
                    <Select defaultValue="tcp">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="tcp">TCP/IP</SelectItem>
                        <SelectItem value="usb">USB</SelectItem>
                        <SelectItem value="wifi">WiFi</SelectItem>
                        <SelectItem value="ethernet">Ethernet</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label>Sync Interval (minutes)</Label>
                    <Select defaultValue="5">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 minute</SelectItem>
                        <SelectItem value="5">5 minutes</SelectItem>
                        <SelectItem value="10">10 minutes</SelectItem>
                        <SelectItem value="30">30 minutes</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label>Backup Frequency</Label>
                    <Select defaultValue="daily">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hourly">Hourly</SelectItem>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
