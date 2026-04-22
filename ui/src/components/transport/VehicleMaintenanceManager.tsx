import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Wrench, Plus, Calendar, AlertTriangle, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface MaintenanceRecord {
  id: string;
  vehicleNumber: string;
  maintenanceType: "scheduled" | "breakdown" | "accident";
  description: string;
  cost: number;
  date: Date;
  status: "pending" | "in-progress" | "completed";
  nextServiceDate?: Date;
}

export function VehicleMaintenanceManager() {
  const [records, setRecords] = useState<MaintenanceRecord[]>([
    {
      id: "1",
      vehicleNumber: "DL-01-AB-1234",
      maintenanceType: "scheduled",
      description: "Regular service and oil change",
      cost: 3500,
      date: new Date(Date.now() - 86400000 * 5),
      status: "completed",
      nextServiceDate: new Date(Date.now() + 86400000 * 85),
    },
    {
      id: "2",
      vehicleNumber: "DL-02-CD-5678",
      maintenanceType: "breakdown",
      description: "Engine issue - coolant leak",
      cost: 8500,
      date: new Date(),
      status: "in-progress",
    },
  ]);
  const [showForm, setShowForm] = useState(false);
  const [newRecord, setNewRecord] = useState<Partial<MaintenanceRecord>>({
    maintenanceType: "scheduled",
    status: "pending",
    date: new Date(),
  });

  const handleAdd = () => {
    if (!newRecord.vehicleNumber || !newRecord.description || !newRecord.cost) {
      toast.error("Please fill all required fields");
      return;
    }

    const record: MaintenanceRecord = {
      id: Date.now().toString(),
      vehicleNumber: newRecord.vehicleNumber,
      maintenanceType: newRecord.maintenanceType || "scheduled",
      description: newRecord.description,
      cost: newRecord.cost,
      date: newRecord.date || new Date(),
      status: newRecord.status || "pending",
      nextServiceDate: newRecord.nextServiceDate,
    };

    setRecords([...records, record]);
    toast.success("Maintenance record added");
    setShowForm(false);
    setNewRecord({
      maintenanceType: "scheduled",
      status: "pending",
      date: new Date(),
    });
  };

  const updateStatus = (id: string, status: MaintenanceRecord["status"]) => {
    setRecords(records.map((r) => (r.id === id ? { ...r, status } : r)));
    toast.success("Status updated");
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Vehicle Maintenance</h2>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Maintenance Record
        </Button>
      </div>

      {showForm && (
        <Card className="border-2 border-primary">
          <CardHeader>
            <CardTitle>New Maintenance Record</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Vehicle Number</Label>
                <Input
                  value={newRecord.vehicleNumber || ""}
                  onChange={(e) =>
                    setNewRecord({ ...newRecord, vehicleNumber: e.target.value })
                  }
                  placeholder="DL-01-AB-1234"
                />
              </div>
              <div className="space-y-2">
                <Label>Maintenance Type</Label>
                <Select
                  value={newRecord.maintenanceType}
                  onValueChange={(value: "scheduled" | "breakdown" | "accident") =>
                    setNewRecord({ ...newRecord, maintenanceType: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scheduled">Scheduled Service</SelectItem>
                    <SelectItem value="breakdown">Breakdown</SelectItem>
                    <SelectItem value="accident">Accident Repair</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={newRecord.description || ""}
                onChange={(e) =>
                  setNewRecord({ ...newRecord, description: e.target.value })
                }
                placeholder="Describe the maintenance work"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Cost (₹)</Label>
                <Input
                  type="number"
                  value={newRecord.cost || ""}
                  onChange={(e) =>
                    setNewRecord({ ...newRecord, cost: Number(e.target.value) })
                  }
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={newRecord.date ? format(newRecord.date, "yyyy-MM-dd") : ""}
                  onChange={(e) =>
                    setNewRecord({ ...newRecord, date: new Date(e.target.value) })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={newRecord.status}
                  onValueChange={(value: MaintenanceRecord["status"]) =>
                    setNewRecord({ ...newRecord, status: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in-progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {newRecord.maintenanceType === "scheduled" && (
              <div className="space-y-2">
                <Label>Next Service Date</Label>
                <Input
                  type="date"
                  value={
                    newRecord.nextServiceDate
                      ? format(newRecord.nextServiceDate, "yyyy-MM-dd")
                      : ""
                  }
                  onChange={(e) =>
                    setNewRecord({ ...newRecord, nextServiceDate: new Date(e.target.value) })
                  }
                />
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button onClick={handleAdd}>Add Record</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Maintenance History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vehicle</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Cost</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Next Service</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((record) => (
                <TableRow key={record.id}>
                  <TableCell className="font-medium">{record.vehicleNumber}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        record.maintenanceType === "scheduled"
                          ? "default"
                          : record.maintenanceType === "breakdown"
                          ? "destructive"
                          : "secondary"
                      }
                    >
                      {record.maintenanceType}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-xs truncate">{record.description}</TableCell>
                  <TableCell>{format(record.date, "dd MMM yyyy")}</TableCell>
                  <TableCell>₹{record.cost.toLocaleString()}</TableCell>
                  <TableCell>
                    <Select
                      value={record.status}
                      onValueChange={(value: MaintenanceRecord["status"]) =>
                        updateStatus(record.id, value)
                      }
                    >
                      <SelectTrigger className="w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="in-progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    {record.nextServiceDate ? (
                      <span className="flex items-center gap-1 text-sm">
                        <Calendar className="h-3 w-3" />
                        {format(record.nextServiceDate, "dd MMM yyyy")}
                      </span>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell>
                    {record.status === "completed" ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
