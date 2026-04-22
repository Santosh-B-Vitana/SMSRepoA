import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bus, MapPin, Users, Navigation, Plus, Upload, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Route {
  id: string;
  name: string;
  routeCode: string;
  vehicleNumber: string;
  driverName: string;
  capacity: number;
  studentsAssigned: number;
  status: 'active' | 'inactive';
}

interface TransportStudent {
  id: string;
  name: string;
  class: string;
  section: string;
  routeId: string;
  routeName: string;
  stop: string;
  pickupTime: string;
}

export function EnhancedTransportManager() {
  const { toast } = useToast();
  const [routes, setRoutes] = useState<Route[]>([
    {
      id: "RT001",
      name: "Route A - North Zone",
      routeCode: "RT-A",
      vehicleNumber: "DL-01-AB-1234",
      driverName: "Rajesh Kumar",
      capacity: 40,
      studentsAssigned: 35,
      status: 'active'
    },
    {
      id: "RT002",
      name: "Route B - South Zone",
      routeCode: "RT-B",
      vehicleNumber: "DL-01-CD-5678",
      driverName: "Amit Sharma",
      capacity: 35,
      studentsAssigned: 28,
      status: 'active'
    },
    {
      id: "RT003",
      name: "Route C - East Zone",
      routeCode: "RT-C",
      vehicleNumber: "DL-01-EF-9012",
      driverName: "Priya Singh",
      capacity: 45,
      studentsAssigned: 40,
      status: 'active'
    }
  ]);

  const [students, setStudents] = useState<TransportStudent[]>([
    {
      id: "STU001",
      name: "Aarav Gupta",
      class: "5",
      section: "A",
      routeId: "RT001",
      routeName: "Route A - North Zone",
      stop: "Sector 15",
      pickupTime: "07:30 AM"
    },
    {
      id: "STU002",
      name: "Ananya Sharma",
      class: "3",
      section: "B",
      routeId: "RT002",
      routeName: "Route B - South Zone",
      stop: "Green Park",
      pickupTime: "07:45 AM"
    },
    {
      id: "STU003",
      name: "Arjun Patel",
      class: "5",
      section: "A",
      routeId: "RT001",
      routeName: "Route A - North Zone",
      stop: "Sector 18",
      pickupTime: "07:35 AM"
    },
    {
      id: "STU004",
      name: "Diya Mehta",
      class: "2",
      section: "C",
      routeId: "RT003",
      routeName: "Route C - East Zone",
      stop: "Model Town",
      pickupTime: "08:00 AM"
    },
    {
      id: "STU005",
      name: "Kabir Singh",
      class: "4",
      section: "A",
      routeId: "RT002",
      routeName: "Route B - South Zone",
      stop: "Saket",
      pickupTime: "07:50 AM"
    },
    {
      id: "STU006",
      name: "Riya Verma",
      class: "1",
      section: "B",
      routeId: "RT001",
      routeName: "Route A - North Zone",
      stop: "Sector 15",
      pickupTime: "07:30 AM"
    }
  ]);

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [classFilter, setClassFilter] = useState("all");
  const [routeFilter, setRouteFilter] = useState("all");

  // Filter students based on search and filters
  const filteredStudents = students.filter(student => {
    const matchesSearch = !searchTerm || 
      student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.id.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesClass = classFilter === "all" || student.class === classFilter;
    const matchesRoute = routeFilter === "all" || student.routeId === routeFilter;
    
    return matchesSearch && matchesClass && matchesRoute;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Transport Management</h2>
        <div className="flex gap-2">
          <Button variant="outline"><Upload className="h-4 w-4 mr-2" />Import</Button>
          <Button><Plus className="h-4 w-4 mr-2" />Add Route</Button>
        </div>
      </div>

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
            <CardTitle className="text-sm font-medium">Active Buses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{routes.filter(r => r.status === 'active').length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Students</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{routes.reduce((sum, r) => sum + r.studentsAssigned, 0)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Capacity</CardTitle>
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
          <TabsTrigger value="tracking">GPS Tracking</TabsTrigger>
        </TabsList>

        <TabsContent value="routes">
          <Card>
            <CardHeader><CardTitle>Bus Routes</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Route Name</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Vehicle</TableHead>
                    <TableHead>Driver</TableHead>
                    <TableHead>Students</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {routes.map(route => (
                    <TableRow key={route.id}>
                      <TableCell className="font-medium">{route.name}</TableCell>
                      <TableCell>{route.routeCode}</TableCell>
                      <TableCell>{route.vehicleNumber}</TableCell>
                      <TableCell>{route.driverName}</TableCell>
                      <TableCell>{route.studentsAssigned}/{route.capacity}</TableCell>
                      <TableCell>
                        <Badge variant={route.status === 'active' ? 'default' : 'secondary'}>
                          {route.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm">Edit</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="students" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Transport Students</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <Input 
                    placeholder="Search students by name or ID..." 
                    className="w-full" 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Select value={classFilter} onValueChange={setClassFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filter by Class" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Classes</SelectItem>
                    <SelectItem value="1">Class 1</SelectItem>
                    <SelectItem value="2">Class 2</SelectItem>
                    <SelectItem value="3">Class 3</SelectItem>
                    <SelectItem value="4">Class 4</SelectItem>
                    <SelectItem value="5">Class 5</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={routeFilter} onValueChange={setRouteFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filter by Route" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Routes</SelectItem>
                    {routes.map(route => (
                      <SelectItem key={route.id} value={route.id}>{route.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Route</TableHead>
                    <TableHead>Stop</TableHead>
                    <TableHead>Pickup Time</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.length > 0 ? (
                    filteredStudents.map(student => (
                      <TableRow key={student.id}>
                        <TableCell>{student.id}</TableCell>
                        <TableCell className="font-medium">{student.name}</TableCell>
                        <TableCell>Class {student.class}-{student.section}</TableCell>
                        <TableCell>{student.routeName}</TableCell>
                        <TableCell>{student.stop}</TableCell>
                        <TableCell>{student.pickupTime}</TableCell>
                        <TableCell>
                          <Button variant="outline" size="sm">View</Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground">
                        No students found matching your filters
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tracking">
          <Card>
            <CardHeader><CardTitle>GPS Tracking</CardTitle></CardHeader>
            <CardContent>
              <p className="text-muted-foreground">GPS tracking interface coming soon</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
