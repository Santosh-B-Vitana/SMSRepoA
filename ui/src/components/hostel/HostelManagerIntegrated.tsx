import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building, Users, Bed, Plus, Loader2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { hostelApi, HostelRoom, HostelStudent } from "@/services/hostelApi";

// Simple student interface
interface SimpleStudent {
  id: string;
  firstName: string;
  lastName: string;
  classGrade: string;
  gender: string;
}

export function HostelManagerIntegrated() {
  const { toast } = useToast();
  
  // State
  const [rooms, setRooms] = useState<HostelRoom[]>([]);
  const [hostelStudents, setHostelStudents] = useState<HostelStudent[]>([]);
  const [availableStudents, setAvailableStudents] = useState<SimpleStudent[]>([]);
  const [loading, setLoading] = useState(false);
  const [addRoomOpen, setAddRoomOpen] = useState(false);
  const [assignStudentOpen, setAssignStudentOpen] = useState(false);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [roomTypeFilter, setRoomTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Form data
  const [newRoom, setNewRoom] = useState<any>({
    roomNumber: "",
    roomType: "quad",
    capacity: 4,
    occupied: 0,
    rentPerBed: 8000,
    floor: "",
    status: "available",
    facilities: ""
  });

  const [assignForm, setAssignForm] = useState<any>({
    studentId: "",
    roomId: "",
    checkInDate: new Date().toISOString().split('T')[0],
    monthlyFee: 8000,
    status: "active"
  });

  // Load data
  useEffect(() => {
    loadRooms();
    loadHostelStudents();
    loadAvailableStudents();
  }, []);

  const loadRooms = async () => {
    try {
      setLoading(true);
      const response = await hostelApi.getRooms(1, 100);
      setRooms(response.rooms);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load hostel rooms",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadHostelStudents = async () => {
    try {
      const students = await hostelApi.getAllHostelStudents();
      setHostelStudents(students);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load hostel students",
        variant: "destructive"
      });
    }
  };

  const loadAvailableStudents = async () => {
    try {
      // TODO: Replace with actual students API when available
      setAvailableStudents([]);
    } catch (error) {
      console.error("Failed to load students:", error);
    }
  };

  const handleAddRoom = async () => {
    try {
      await hostelApi.createRoom(newRoom);
      toast({
        title: "Success",
        description: "Hostel room created successfully"
      });
      setAddRoomOpen(false);
      resetNewRoom();
      loadRooms();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to create room",
        variant: "destructive"
      });
    }
  };

  const handleAssignStudent = async () => {
    try {
      await hostelApi.assignStudentToRoom(assignForm);
      toast({
        title: "Success",
        description: "Student assigned to hostel room successfully"
      });
      setAssignStudentOpen(false);
      resetAssignForm();
      loadHostelStudents();
      loadRooms(); // Reload to update occupied count
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to assign student",
        variant: "destructive"
      });
    }
  };

  const handleRemoveStudent = async (id: string) => {
    if (!confirm("Are you sure you want to remove this student from the hostel?")) return;
    
    try {
      await hostelApi.removeStudentFromRoom(id);
      toast({
        title: "Success",
        description: "Student removed from hostel"
      });
      loadHostelStudents();
      loadRooms();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to remove student",
        variant: "destructive"
      });
    }
  };

  const handleDeleteRoom = async (id: string) => {
    const room = rooms.find(r => r.id === id);
    if (room && room.occupied > 0) {
      toast({
        title: "Cannot Delete",
        description: "Room has students assigned. Remove students first.",
        variant: "destructive"
      });
      return;
    }

    if (!confirm("Are you sure you want to delete this room?")) return;
    
    try {
      await hostelApi.deleteRoom(id);
      toast({
        title: "Success",
        description: "Room deleted successfully"
      });
      loadRooms();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to delete room",
        variant: "destructive"
      });
    }
  };

  const resetNewRoom = () => {
    setNewRoom({
      roomNumber: "",
      roomType: "quad",
      capacity: 4,
      occupied: 0,
      rentPerBed: 8000,
      floor: "",
      status: "available",
      facilities: ""
    });
  };

  const resetAssignForm = () => {
    setAssignForm({
      studentId: "",
      roomId: "",
      checkInDate: new Date().toISOString().split('T')[0],
      monthlyFee: 8000,
      status: "active"
    });
  };

  // Filtered rooms
  const filteredRooms = rooms.filter(room => {
    const matchesSearch = room.roomNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = roomTypeFilter === "all" || room.roomType === roomTypeFilter;
    const matchesStatus = statusFilter === "all" || room.status === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  // Filtered students
  const filteredStudents = hostelStudents.filter(student => {
    return student.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
           student.roomNumber.toLowerCase().includes(searchTerm.toLowerCase());
  });

  // Available rooms for assignment (not full and not in maintenance)
  const availableRooms = rooms.filter(r => 
    r.occupied < r.capacity && r.status !== "maintenance"
  );

  // Stats
  const totalCapacity = rooms.reduce((sum, r) => sum + r.capacity, 0);
  const totalOccupied = rooms.reduce((sum, r) => sum + r.occupied, 0);
  const occupancyRate = totalCapacity > 0 ? ((totalOccupied / totalCapacity) * 100).toFixed(1) : "0";
  const availableRoomsCount = rooms.filter(r => r.status === "available" || (r.occupied < r.capacity && r.status !== "maintenance")).length;

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
        <div>
          <h2 className="text-2xl font-bold">Hostel Management</h2>
          <p className="text-muted-foreground">Manage hostel rooms and student accommodations</p>
        </div>
        <Dialog open={addRoomOpen} onOpenChange={setAddRoomOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Room
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Add New Hostel Room</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Room Number</Label>
                <Input 
                  value={newRoom.roomNumber} 
                  onChange={e => setNewRoom({...newRoom, roomNumber: e.target.value})}
                  placeholder="101"
                />
              </div>
              <div>
                <Label>Room Type</Label>
                <Select value={newRoom.roomType} onValueChange={val => setNewRoom({...newRoom, roomType: val})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single">Single</SelectItem>
                    <SelectItem value="double">Double</SelectItem>
                    <SelectItem value="triple">Triple</SelectItem>
                    <SelectItem value="quad">Quad</SelectItem>
                    <SelectItem value="boys">Boys Only</SelectItem>
                    <SelectItem value="girls">Girls Only</SelectItem>
                    <SelectItem value="co-ed">Co-ed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Capacity</Label>
                <Input 
                  type="number"
                  value={newRoom.capacity} 
                  onChange={e => setNewRoom({...newRoom, capacity: parseInt(e.target.value)})}
                />
              </div>
              <div>
                <Label>Rent Per Bed</Label>
                <Input 
                  type="number"
                  value={newRoom.rentPerBed} 
                  onChange={e => setNewRoom({...newRoom, rentPerBed: parseFloat(e.target.value)})}
                />
              </div>
              <div>
                <Label>Floor</Label>
                <Input 
                  value={newRoom.floor} 
                  onChange={e => setNewRoom({...newRoom, floor: e.target.value})}
                  placeholder="Ground, 1st, 2nd..."
                />
              </div>
              <div>
                <Label>Status</Label>
                <Select value={newRoom.status} onValueChange={val => setNewRoom({...newRoom, status: val})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="occupied">Occupied</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label>Facilities</Label>
                <Input 
                  value={newRoom.facilities} 
                  onChange={e => setNewRoom({...newRoom, facilities: e.target.value})}
                  placeholder="AC, Attached Bathroom, Study Table..."
                />
              </div>
            </div>
            <Button onClick={handleAddRoom} className="w-full mt-4">Create Room</Button>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Rooms</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rooms.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Occupancy Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{occupancyRate}%</div>
            <p className="text-xs text-muted-foreground">{totalOccupied}/{totalCapacity}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Available Rooms</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{availableRoomsCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{hostelStudents.length}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="rooms">
        <TabsList>
          <TabsTrigger value="rooms">Rooms</TabsTrigger>
          <TabsTrigger value="students">Students</TabsTrigger>
        </TabsList>

        <TabsContent value="rooms">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Hostel Rooms</CardTitle>
                <div className="flex gap-2">
                  <Select value={roomTypeFilter} onValueChange={setRoomTypeFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Room Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="single">Single</SelectItem>
                      <SelectItem value="double">Double</SelectItem>
                      <SelectItem value="triple">Triple</SelectItem>
                      <SelectItem value="quad">Quad</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="available">Available</SelectItem>
                      <SelectItem value="occupied">Occupied</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input 
                    placeholder="Search rooms..." 
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-64"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Room Number</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Floor</TableHead>
                    <TableHead>Capacity</TableHead>
                    <TableHead>Occupancy</TableHead>
                    <TableHead>Rent/Bed</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRooms.map(room => (
                    <TableRow key={room.id}>
                      <TableCell className="font-medium">{room.roomNumber}</TableCell>
                      <TableCell className="capitalize">{room.roomType}</TableCell>
                      <TableCell>{room.floor || 'N/A'}</TableCell>
                      <TableCell>{room.capacity}</TableCell>
                      <TableCell>
                        <Badge variant={room.occupied >= room.capacity ? 'destructive' : 'default'}>
                          {room.occupied}/{room.capacity}
                        </Badge>
                      </TableCell>
                      <TableCell>₹{room.rentPerBed}</TableCell>
                      <TableCell>
                        <Badge variant={
                          room.status === 'available' ? 'default' :
                          room.status === 'maintenance' ? 'destructive' : 'secondary'
                        }>
                          {room.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleDeleteRoom(room.id)}
                        >
                          Delete
                        </Button>
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
                <CardTitle>Hostel Students</CardTitle>
                <Dialog open={assignStudentOpen} onOpenChange={setAssignStudentOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Assign Student
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Assign Student to Hostel Room</DialogTitle>
                    </DialogHeader>
                    {availableRooms.length === 0 ? (
                      <div className="flex items-center gap-2 p-4 border rounded bg-yellow-50 text-yellow-800">
                        <AlertCircle className="h-5 w-5" />
                        <span>No rooms available. All rooms are either full or under maintenance.</span>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div>
                          <Label>Student</Label>
                          <Select value={assignForm.studentId} onValueChange={val => setAssignForm({...assignForm, studentId: val})}>
                            <SelectTrigger><SelectValue placeholder="Select student" /></SelectTrigger>
                            <SelectContent>
                              {availableStudents.map(student => (
                                <SelectItem key={student.id} value={student.id}>
                                  {student.firstName} {student.lastName} - {student.classGrade} ({student.gender})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Room</Label>
                          <Select value={assignForm.roomId} onValueChange={val => setAssignForm({...assignForm, roomId: val})}>
                            <SelectTrigger><SelectValue placeholder="Select room" /></SelectTrigger>
                            <SelectContent>
                              {availableRooms.map(room => (
                                <SelectItem key={room.id} value={room.id}>
                                  {room.roomNumber} - {room.roomType} ({room.occupied}/{room.capacity}) - Floor {room.floor || 'N/A'}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Check-in Date</Label>
                          <Input 
                            type="date"
                            value={assignForm.checkInDate} 
                            onChange={e => setAssignForm({...assignForm, checkInDate: e.target.value})}
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
                        <Button onClick={handleAssignStudent} className="w-full">Assign to Hostel</Button>
                      </div>
                    )}
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input 
                placeholder="Search students..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student Name</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Gender</TableHead>
                    <TableHead>Room</TableHead>
                    <TableHead>Floor</TableHead>
                    <TableHead>Check-in Date</TableHead>
                    <TableHead>Monthly Fee</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.map(student => (
                    <TableRow key={student.id}>
                      <TableCell className="font-medium">{student.studentName}</TableCell>
                      <TableCell>{student.studentClass}-{student.studentSection}</TableCell>
                      <TableCell className="capitalize">{student.gender}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{student.roomNumber}</div>
                          <div className="text-xs text-muted-foreground capitalize">{student.roomType}</div>
                        </div>
                      </TableCell>
                      <TableCell>{student.floor || 'N/A'}</TableCell>
                      <TableCell>{new Date(student.checkInDate).toLocaleDateString()}</TableCell>
                      <TableCell>₹{student.monthlyFee}</TableCell>
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
