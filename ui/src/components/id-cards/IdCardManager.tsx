import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { IdCard, Printer, Search, Download, Plus, Users, UserCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { mockApi, Student, Staff } from "../../services/mockApi";
import { IdCardTemplate } from "./IdCardTemplate";
import { IndividualIdCardGenerator } from "./IndividualIdCardGenerator";
import { ErrorBoundary, LoadingState, EmptyState } from "@/components/common";

interface IdCardRecord {
  id: string;
  personId: string;
  personName: string;
  personType: 'student' | 'staff';
  idNumber: string;
  issueDate: string;
  expiryDate: string;
  status: 'active' | 'expired' | 'cancelled';
  template: string;
}

export function IdCardManager() {
  const [students, setStudents] = useState<Student[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [idCards, setIdCards] = useState<IdCardRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<"all" | "student" | "staff">("all");
  const [selectedPerson, setSelectedPerson] = useState<Student | Staff | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [studentsData, staffData] = await Promise.all([
          mockApi.getStudents(),
          mockApi.getStaff()
        ]);
        setStudents(studentsData);
        setStaff(staffData);
        
        // Generate mock ID card records
        const mockIdCards: IdCardRecord[] = [
          ...studentsData.map((student, index) => ({
            id: `IDC${String(index + 1).padStart(3, '0')}`,
            personId: student.id,
            personName: student.name,
            personType: 'student' as const,
            idNumber: `STU${student.rollNo}${new Date().getFullYear()}`,
            issueDate: '2024-01-15',
            expiryDate: '2025-01-15',
            status: 'active' as const,
            template: 'student-default'
          })),
          ...staffData.map((staffMember, index) => ({
            id: `IDC${String(studentsData.length + index + 1).padStart(3, '0')}`,
            personId: staffMember.id,
            personName: staffMember.name,
            personType: 'staff' as const,
            idNumber: `EMP${staffMember.id.slice(-3)}${new Date().getFullYear()}`,
            issueDate: '2024-01-15',
            expiryDate: '2025-12-31',
            status: 'active' as const,
            template: 'staff-default'
          }))
        ];
        setIdCards(mockIdCards);
      } catch (error) {
        console.error("Failed to fetch data:", error);
        toast({
          title: "Error",
          description: "Failed to load data",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [toast]);

  const filteredIdCards = idCards.filter(card => {
    const matchesSearch = card.personName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         card.idNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === "all" || card.personType === filterType;
    return matchesSearch && matchesType;
  });

  const generateIdCard = async (person: Student | Staff, type: 'student' | 'staff') => {
    try {
      const newIdCard: IdCardRecord = {
        id: `IDC${String(idCards.length + 1).padStart(3, '0')}`,
        personId: person.id,
        personName: person.name,
        personType: type,
        idNumber: type === 'student' ? 
          `STU${(person as Student).rollNo}${new Date().getFullYear()}` :
          `EMP${person.id.slice(-3)}${new Date().getFullYear()}`,
        issueDate: new Date().toISOString().split('T')[0],
        expiryDate: type === 'student' ? 
          new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] :
          new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'active',
        template: `${type}-default`
      };

      setIdCards(prev => [...prev, newIdCard]);
      toast({
        title: "Success",
        description: `ID card generated for ${person.name}`
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate ID card",
        variant: "destructive"
      });
    }
  };

  const printIdCard = (card: IdCardRecord) => {
    const person = card.personType === 'student' 
      ? students.find(s => s.id === card.personId)
      : staff.find(s => s.id === card.personId);
    
    if (person) {
      setSelectedPerson(person);
      setShowPreview(true);
    }
  };

  if (loading) {
    return <LoadingState variant="cards" rows={3} message="Loading ID card data..." />;
  }

  return (
    <ErrorBoundary>
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-display">ID Card Management</h1>
          <p className="text-muted-foreground">Generate and manage student and staff ID cards</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total ID Cards</p>
                <p className="text-2xl font-bold">{idCards.length}</p>
              </div>
              <IdCard className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Student Cards</p>
                <p className="text-2xl font-bold">{idCards.filter(c => c.personType === 'student').length}</p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Staff Cards</p>
                <p className="text-2xl font-bold">{idCards.filter(c => c.personType === 'staff').length}</p>
              </div>
              <UserCheck className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>ID Card Records</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="existing" className="space-y-4">
            <TabsList>
              <TabsTrigger value="existing">Existing Cards</TabsTrigger>
              <TabsTrigger value="individual">Generate New</TabsTrigger>
            </TabsList>

            <TabsContent value="existing" className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name or ID number..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>
                <Select value={filterType} onValueChange={(value: any) => setFilterType(value)}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filter by type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="student">Students</SelectItem>
                    <SelectItem value="staff">Staff</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>ID Number</TableHead>
                    <TableHead>Issue Date</TableHead>
                    <TableHead>Expiry Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredIdCards.map((card) => (
                    <TableRow key={card.id}>
                      <TableCell className="font-medium">{card.personName}</TableCell>
                      <TableCell>
                        <Badge variant={card.personType === 'student' ? 'default' : 'secondary'}>
                          {card.personType}
                        </Badge>
                      </TableCell>
                      <TableCell>{card.idNumber}</TableCell>
                      <TableCell>{new Date(card.issueDate).toLocaleDateString()}</TableCell>
                      <TableCell>{new Date(card.expiryDate).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Badge variant={card.status === 'active' ? 'default' : 'destructive'}>
                          {card.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => printIdCard(card)}
                          >
                            <Printer className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline">
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>

            <TabsContent value="individual" className="space-y-4">
              <IndividualIdCardGenerator 
                students={students}
                staff={staff}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* ID Card Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>ID Card Preview</DialogTitle>
          </DialogHeader>
          {selectedPerson && (
            <IdCardTemplate 
              person={selectedPerson}
              type={'name' in selectedPerson && 'rollNo' in selectedPerson ? 'student' : 'staff'}
            />
          )}
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowPreview(false)}>
              Close
            </Button>
            <Button onClick={() => window.print()}>
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
    </ErrorBoundary>
  );
}
