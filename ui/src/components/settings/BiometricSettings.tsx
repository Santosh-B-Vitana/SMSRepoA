import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Fingerprint, 
  Wifi, 
  WifiOff, 
  RefreshCcw, 
  Settings,
  Plus,
  Edit,
  Trash2,
  AlertCircle
} from "lucide-react";
import { toast } from "sonner";

interface BiometricDevice {
  id: string;
  name: string;
  last_sync: string;
  status: 'online' | 'offline';
  mappings: number;
}

interface BiometricMapping {
  id: string;
  device_user_id: string;
  system_student_id: string;
  student_name: string;
}

export default function BiometricSettings() {
  const [devices, setDevices] = useState<BiometricDevice[]>([
    {
      id: "BIO001",
      name: "Main Entrance Scanner",
      last_sync: "2025-09-08 09:30:00",
      status: "online",
      mappings: 150
    },
    {
      id: "BIO002", 
      name: "Library Scanner",
      last_sync: "2025-09-08 08:45:00",
      status: "offline",
      mappings: 75
    }
  ]);

  const [mappings, setMappings] = useState<BiometricMapping[]>([
    {
      id: "MAP001",
      device_user_id: "001",
      system_student_id: "STU001",
      student_name: "Aarav Gupta"
    }
  ]);

  const [autoApply, setAutoApply] = useState(false);
  const [syncInProgress, setSyncInProgress] = useState(false);
  const [mappingDialogOpen, setMappingDialogOpen] = useState(false);
  const [newMapping, setNewMapping] = useState({
    device_user_id: "",
    system_student_id: "",
    student_name: ""
  });

  const handleTestSync = async (deviceId: string) => {
    setSyncInProgress(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast.success("Test sync completed successfully");
      
      // Update last sync time
      setDevices(prev => prev.map(device => 
        device.id === deviceId 
          ? { ...device, last_sync: new Date().toISOString().replace('T', ' ').split('.')[0] }
          : device
      ));
    } catch (error) {
      toast.error("Sync failed");
    } finally {
      setSyncInProgress(false);
    }
  };

  const handleAddMapping = () => {
    if (!newMapping.device_user_id || !newMapping.system_student_id || !newMapping.student_name) {
      toast.error("Please fill all fields");
      return;
    }

    const mapping: BiometricMapping = {
      id: `MAP${Date.now()}`,
      ...newMapping
    };

    setMappings(prev => [...prev, mapping]);
    setMappingDialogOpen(false);
    setNewMapping({ device_user_id: "", system_student_id: "", student_name: "" });
    toast.success("Mapping added successfully");
  };

  const handleDeleteMapping = (id: string) => {
    setMappings(prev => prev.filter(mapping => mapping.id !== id));
    toast.success("Mapping deleted successfully");
  };

  return (
    <div className="space-y-6">
      {/* Device Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Fingerprint className="h-5 w-5" />
            Biometric Devices
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Device Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Sync</TableHead>
                  <TableHead>Mappings</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {devices.map((device) => (
                  <TableRow key={device.id}>
                    <TableCell className="font-medium">{device.name}</TableCell>
                    <TableCell>
                      <Badge 
                        variant={device.status === 'online' ? 'default' : 'destructive'}
                        className="flex items-center gap-1 w-fit"
                      >
                        {device.status === 'online' ? (
                          <Wifi className="h-3 w-3" />
                        ) : (
                          <WifiOff className="h-3 w-3" />
                        )}
                        {device.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {device.last_sync}
                    </TableCell>
                    <TableCell>{device.mappings} users</TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleTestSync(device.id)}
                        disabled={syncInProgress}
                        className="flex items-center gap-2"
                      >
                        <RefreshCcw className={`h-4 w-4 ${syncInProgress ? 'animate-spin' : ''}`} />
                        Test Sync
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Sync Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Sync Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="auto-apply">Auto-apply attendance from biometric</Label>
              <p className="text-sm text-muted-foreground">
                Automatically apply attendance records from biometric devices without manual review
              </p>
            </div>
            <Switch
              id="auto-apply"
              checked={autoApply}
              onCheckedChange={setAutoApply}
            />
          </div>

          {!autoApply && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-amber-800">Manual Review Mode</p>
                <p className="text-amber-700">
                  Biometric attendance will be queued for admin approval before being applied to student records.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* User Mappings */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            User ID Mappings
          </CardTitle>
          <Dialog open={mappingDialogOpen} onOpenChange={setMappingDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Mapping
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add User Mapping</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Device User ID</Label>
                  <Input
                    placeholder="Enter device user ID"
                    value={newMapping.device_user_id}
                    onChange={(e) => setNewMapping(prev => ({ ...prev, device_user_id: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>System Student ID</Label>
                  <Input
                    placeholder="Enter system student ID"
                    value={newMapping.system_student_id}
                    onChange={(e) => setNewMapping(prev => ({ ...prev, system_student_id: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Student Name</Label>
                  <Input
                    placeholder="Enter student name"
                    value={newMapping.student_name}
                    onChange={(e) => setNewMapping(prev => ({ ...prev, student_name: e.target.value }))}
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleAddMapping} className="flex-1">
                    Add Mapping
                  </Button>
                  <Button variant="outline" onClick={() => setMappingDialogOpen(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Device User ID</TableHead>
                  <TableHead>System Student ID</TableHead>
                  <TableHead>Student Name</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mappings.map((mapping) => (
                  <TableRow key={mapping.id}>
                    <TableCell className="font-mono">{mapping.device_user_id}</TableCell>
                    <TableCell className="font-mono">{mapping.system_student_id}</TableCell>
                    <TableCell>{mapping.student_name}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleDeleteMapping(mapping.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}