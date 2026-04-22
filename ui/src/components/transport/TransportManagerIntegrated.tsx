import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bus, MapPin, Users, Plus, Settings, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { transportApi, TransportRoute, TransportStudent } from "@/services/transportApi";

// Simple student interface for the component
interface SimpleStudent {
  id: string;
  firstName: string;
  lastName: string;
  classGrade: string;
}

export function TransportManagerIntegrated() {
  const { toast } = useToast();
  
  // State
  const [routes, setRoutes] = useState<TransportRoute[]>([]);
  const [transportStudents, setTransportStudents] = useState<TransportStudent[]>([]);
  const [availableStudents, setAvailableStudents] = useState<SimpleStudent[]>([]);
  const [loading, setLoading] = useState(false);
  const [addRouteOpen, setAddRouteOpen] = useState(false);
  const [assignStudentOpen, setAssignStudentOpen] = useState(false);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [classFilter, setClassFilter] = useState("all");
  const [routeFilter, setRouteFilter] = useState("all");

  // Form data
  const [newRoute, setNewRoute] = useState<any>({
    routeName: "",
    routeNumber: "",
    vehicleNumber: "",
    driverName: "",
    driverPhone: "",
    capacity: 40,
    startTime: "07:00",
    endTime: "17:00",
    monthlyFee: 500,
    status: "active"
  });

  const [assignForm, setAssignForm] = useState<any>({
    studentId: "",
    routeId: "",
    pickupPoint: "",
    dropPoint: "",
    monthlyFee: 500,
    status: "active"
  });

  // Load data
  useEffect(() => {
    loadRoutes();
    loadTransportStudents();
    loadAvailableStudents();
  }, []);

  const loadRoutes = async () => {
    try {
      setLoading(true);
      const response = await transportApi.getRoutes(1, 100);
      setRoutes(response.routes);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load transport routes",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadTransportStudents = async () => {
    try {
      const students = await transportApi.getAllTransportStudents();
      setTransportStudents(students);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load transport students",
        variant: "destructive"
      });
    }
  };

  const loadAvailableStudents = async () => {
    try {
      // TODO: Replace with actual students API when available
      // For now, using empty array - will be populated from backend
      setAvailableStudents([]);
    } catch (error) {
      console.error("Failed to load students:", error);
    }
  };

  const handleAddRoute = async () => {
    try {
      const routeData = {
        ...newRoute,
        startTime: newRoute.startTime || "07:00:00",
        endTime: newRoute.endTime || "17:00:00"
      };
      
      await transportApi.createRoute(routeData);
      toast({
        title: "Success",
        description: "Transport route created successfully"
      });
      setAddRouteOpen(false);
      resetNewRoute();
      loadRoutes();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to create route",
        variant: "destructive"
      });
    }
  };

  const handleAssignStudent = async () => {
    try {
      await transportApi.assignStudentToRoute(assignForm);
      toast({
        title: "Success",
        description: "Student assigned to transport successfully"
      });
      setAssignStudentOpen(false);
      resetAssignForm();
      loadTransportStudents();
      loadRoutes(); // Reload to update studentsAssigned count
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to assign student",
        variant: "destructive"
      });
    }
  };

  const handleRemoveStudent = async (id: string) => {
    try {
      await transportApi.removeStudentFromRoute(id);
      toast({
        title: "Success",
        description: "Student removed from transport"
      });
      loadTransportStudents();
      loadRoutes();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to remove student",
        variant: "destructive"
      });
    }
  };

  const handleDeleteRoute = async (id: string) => {
    if (!confirm("Are you sure you want to delete this route?")) return;
    
    try {
      await transportApi.deleteRoute(id);
      toast({
        title: "Success",
        description: "Route deleted successfully"
      });
      loadRoutes();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to delete route",
        variant: "destructive"
      });
    }
  };

  const resetNewRoute = () => {
    setNewRoute({
      routeName: "",
      routeNumber: "",
      vehicleNumber: "",
      driverName: "",
      driverPhone: "",
      capacity: 40,
      startTime: "07:00",
      endTime: "17:00",
      monthlyFee: 500,
      status: "active"
    });
  };

  const resetAssignForm = () => {
    setAssignForm({
      studentId: "",
      routeId: "",
      pickupPoint: "",
      dropPoint: "",
      monthlyFee: 500,
      status: "active"
    });
  };

  // Filtered students
  const filteredStudents = transportStudents.filter(student => {
    const matchesSearch = student.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         student.studentId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesClass = classFilter === "all" || student.studentClass === classFilter;
    const matchesRoute = routeFilter === "all" || student.routeId === routeFilter;
    return matchesSearch && matchesClass && matchesRoute;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Transport Management</h2>
        <Dialog open={addRouteOpen} onOpenChange={setAddRouteOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Route
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Add New Transport Route</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Route Number</Label>
                <Input 
                  value={newRoute.routeNumber} 
                  onChange={e => setNewRoute({...newRoute, routeNumber: e.target.value})}
                  placeholder="RT-001"
                />
              </div>
              <div>
                <Label>Route Name</Label>
                <Input 
                  value={newRoute.routeName} 
                  onChange={e => setNewRoute({...newRoute, routeName: e.target.value})}
                  placeholder="North Zone Route"
                />
              </div>
              <div>
                <Label>Vehicle Number</Label>
                <Input 
                  value={newRoute.vehicleNumber} 
                  onChange={e => setNewRoute({...newRoute, vehicleNumber: e.target.value})}
                  placeholder="DL-01-AB-1234"
                />
              </div>
              <div>
                <Label>Capacity</Label>
                <Input 
                  type="number"
                  value={newRoute.capacity} 
                  onChange={e => setNewRoute({...newRoute, capacity: parseInt(e.target.value)})}
                />
              </div>
              <div>
                <Label>Driver Name</Label>
                <Input 
                  value={newRoute.driverName} 
                  onChange={e => setNewRoute({...newRoute, driverName: e.target.value})}
                />
              </div>
              <div>
                <Label>Driver Phone</Label>
                <Input 
                  value={newRoute.driverPhone} 
                  onChange={e => setNewRoute({...newRoute, driverPhone: e.target.value})}
                />
              </div>
              <div>
                <Label>Start Time</Label>
                <Input 
                  type="time"
                  value={newRoute.startTime} 
                  onChange={e => setNewRoute({...newRoute, startTime: e.target.value})}
                />
              </div>
              <div>
                <Label>End Time</Label>
                <Input 
                  type="time"
                  value={newRoute.endTime} 
                  onChange={e => setNewRoute({...newRoute, endTime: e.target.value})}
                />
              </div>
              <div>
                <Label>Monthly Fee</Label>
                <Input 
                  type="number"
                  value={newRoute.monthlyFee} 
                  onChange={e => setNewRoute({...newRoute, monthlyFee: parseFloat(e.target.value)})}
                />
              </div>
              <div>
                <Label>Status</Label>
                <Select value={newRoute.status} onValueChange={val => setNewRoute({...newRoute, status: val})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={handleAddRoute} className="w-full mt-4">Create Route</Button>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Routes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{routes.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Routes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {routes.filter(r => r.status === 'active').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{transportStudents.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Capacity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{routes.reduce((sum, r) => sum + r.capacity, 0)}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="routes">
        <TabsList>
          <TabsTrigger value="routes">Routes</TabsTrigger>
          <TabsTrigger value="students">Students</TabsTrigger>
        </TabsList>

        <TabsContent value="routes">
          <Card>
            <CardHeader><CardTitle>Transport Routes</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Route</TableHead>
                    <TableHead>Vehicle</TableHead>
                    <TableHead>Driver</TableHead>
                    <TableHead>Capacity</TableHead>
                    <TableHead>Students</TableHead>
                    <TableHead>Timing</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {routes.map(route => (
                    <TableRow key={route.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{route.routeName}</div>
                          <div className="text-sm text-muted-foreground">{route.routeNumber}</div>
                        </div>
                      </TableCell>
                      <TableCell>{route.vehicleNumber || 'N/A'}</TableCell>
                      <TableCell>
                        <div>
                          <div>{route.driverName || 'N/A'}</div>
                          <div className="text-sm text-muted-foreground">{route.driverPhone}</div>
                        </div>
                      </TableCell>
                      <TableCell>{route.capacity}</TableCell>
                      <TableCell>
                        <Badge variant={route.studentsAssigned >= route.capacity ? 'destructive' : 'default'}>
                          {route.studentsAssigned}/{route.capacity}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {route.startTime} - {route.endTime}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={route.status === 'active' ? 'default' : 'secondary'}>
                          {route.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => handleDeleteRoute(route.id)}>
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="students">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Transport Students</CardTitle>
                <Dialog open={assignStudentOpen} onOpenChange={setAssignStudentOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Assign Student
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Assign Student to Transport</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>Student</Label>
                        <Select value={assignForm.studentId} onValueChange={val => setAssignForm({...assignForm, studentId: val})}>
                          <SelectTrigger><SelectValue placeholder="Select student" /></SelectTrigger>
                          <SelectContent>
                            {availableStudents.map(student => (
                              <SelectItem key={student.id} value={student.id}>
                                {student.firstName} {student.lastName} - {student.classGrade}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Route</Label>
                        <Select value={assignForm.routeId} onValueChange={val => setAssignForm({...assignForm, routeId: val})}>
                          <SelectTrigger><SelectValue placeholder="Select route" /></SelectTrigger>
                          <SelectContent>
                            {routes.filter(r => r.studentsAssigned < r.capacity).map(route => (
                              <SelectItem key={route.id} value={route.id}>
                                {route.routeName} ({route.studentsAssigned}/{route.capacity})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Pickup Point</Label>
                        <Input 
                          value={assignForm.pickupPoint} 
                          onChange={e => setAssignForm({...assignForm, pickupPoint: e.target.value})}
                          placeholder="Enter pickup location"
                        />
                      </div>
                      <div>
                        <Label>Drop Point</Label>
                        <Input 
                          value={assignForm.dropPoint} 
                          onChange={e => setAssignForm({...assignForm, dropPoint: e.target.value})}
                          placeholder="Enter drop location"
                        />
                      </div>
                      <div>
                        <Label>Monthly Fee</Label>
                        <Input 
                          type="number"
                          value={assignForm.monthlyFee} 
                          onChange={e => setAssignForm({...assignForm, monthlyFee: parseFloat(e.target.value)})}
                        />
                      </div>
                      <Button onClick={handleAssignStudent} className="w-full">Assign Student</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Input 
                  placeholder="Search students..." 
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="flex-1"
                />
                <Select value={classFilter} onValueChange={setClassFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filter by Class" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Classes</SelectItem>
                    {Array.from(new Set(transportStudents.map(s => s.studentClass))).map(cls => (
                      <SelectItem key={cls} value={cls}>{cls}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={routeFilter} onValueChange={setRouteFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filter by Route" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Routes</SelectItem>
                    {routes.map(route => (
                      <SelectItem key={route.id} value={route.id}>{route.routeName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student Name</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Route</TableHead>
                    <TableHead>Pickup Point</TableHead>
                    <TableHead>Monthly Fee</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.map(student => (
                    <TableRow key={student.id}>
                      <TableCell className="font-medium">{student.studentName}</TableCell>
                      <TableCell>{student.studentClass}-{student.studentSection}</TableCell>
                      <TableCell>{student.routeName}</TableCell>
                      <TableCell>{student.pickupPoint || 'N/A'}</TableCell>
                      <TableCell>₹{student.monthlyFee || 0}</TableCell>
                      <TableCell>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleRemoveStudent(student.id)}
                        >
                          Remove
                        </Button>
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
