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
import { studentApi, StudentBasic } from "@/services/api/studentApi";
import { staffApi, StaffBasic } from "@/services/api/staffApi";
import { IdCardTemplate } from "./IdCardTemplate";
import { IndividualIdCardGenerator } from "./IndividualIdCardGenerator";
import { ErrorBoundary, LoadingState, EmptyState } from "@/components/common";
import { useLanguage } from "@/contexts/LanguageContext";

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
  const { t } = useLanguage();
  const [students, setStudents] = useState<StudentBasic[]>([]);
  const [staff, setStaff] = useState<StaffBasic[]>([]);
  const [idCards, setIdCards] = useState<IdCardRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<"all" | "student" | "staff">("all");
  const [selectedPerson, setSelectedPerson] = useState<StudentBasic | StaffBasic | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [studentsResp, staffResp] = await Promise.all([
          studentApi.list({ pageSize: 2000 }),
          staffApi.list({ pageSize: 2000 })
        ]);
        const studentsData = studentsResp.students;
        const staffData = staffResp.staff;
        setStudents(studentsData);
        setStaff(staffData);

        // Build ID card record stubs from real student/staff data
        const realIdCards: IdCardRecord[] = [
          ...studentsData.map((student, index) => ({
            id: `IDC${String(index + 1).padStart(3, '0')}`,
            personId: student.id,
            personName: student.name ?? `${student.admissionNumber}`,
            personType: 'student' as const,
            idNumber: `STU${student.rollNumber}${new Date().getFullYear()}`,
            issueDate: new Date().toISOString().split('T')[0],
            expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            status: 'active' as const,
            template: 'student-default'
          })),
          ...staffData.map((staffMember, index) => ({
            id: `IDC${String(studentsData.length + index + 1).padStart(3, '0')}`,
            personId: staffMember.id,
            personName: staffMember.name ?? `${staffMember.firstName} ${staffMember.lastName}`.trim(),
            personType: 'staff' as const,
            idNumber: `EMP${staffMember.employeeId}${new Date().getFullYear()}`,
            issueDate: new Date().toISOString().split('T')[0],
            expiryDate: new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            status: 'active' as const,
            template: 'staff-default'
          }))
        ];
        setIdCards(realIdCards);
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

  const generateIdCard = async (person: StudentBasic | StaffBasic, type: 'student' | 'staff') => {
    try {
      const name = (person as StudentBasic).name ?? `${(person as StaffBasic).firstName ?? ''} ${(person as StaffBasic).lastName ?? ''}`.trim();
      const newIdCard: IdCardRecord = {
        id: `IDC${String(idCards.length + 1).padStart(3, '0')}`,
        personId: person.id,
        personName: name,
        personType: type,
        idNumber: type === 'student' ?
          `STU${(person as StudentBasic).rollNumber}${new Date().getFullYear()}` :
          `EMP${(person as StaffBasic).employeeId}${new Date().getFullYear()}`,
        issueDate: new Date().toISOString().split('T')[0],
        expiryDate: type === 'student' ?
          new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] :
          new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'active',
        template: `${type}-default`
      };

      setIdCards(prev => [...prev, newIdCard]);
      toast({
        title: t('common.analytics'),
        description: `${t('idCard.generateSuccess').replace('{name}', name)}`
      });
    } catch (error) {
      toast({
        title: t('common.retry'),
        description: t('idCard.generateError'),
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
    return <LoadingState variant="cards" rows={3} message={t('idCard.loading')} />;
  }

  return (
    <ErrorBoundary>
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-display">{t('idCard.title')}</h1>
          <p className="text-muted-foreground">{t('idCard.subtitle')}</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('idCard.statTotal')}</p>
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
                <p className="text-sm font-medium text-muted-foreground">{t('idCard.statStudent')}</p>
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
                <p className="text-sm font-medium text-muted-foreground">{t('idCard.statStaff')}</p>
                <p className="text-2xl font-bold">{idCards.filter(c => c.personType === 'staff').length}</p>
              </div>
              <UserCheck className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('idCard.recordsTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="existing" className="space-y-4">
            <TabsList>
              <TabsTrigger value="existing">{t('idCard.tabExisting')}</TabsTrigger>
              <TabsTrigger value="individual">{t('idCard.tabGenerate')}</TabsTrigger>
            </TabsList>

            <TabsContent value="existing" className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder={t('idCard.searchPlaceholder')}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>
                <Select value={filterType} onValueChange={(value: any) => setFilterType(value)}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder={t('idCard.filterPlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('idCard.allTypes')}</SelectItem>
                    <SelectItem value="student">{t('idCard.filterStudents')}</SelectItem>
                    <SelectItem value="staff">{t('idCard.filterStaff')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('idCard.colName')}</TableHead>
                    <TableHead>{t('idCard.colType')}</TableHead>
                    <TableHead>{t('idCard.colIdNumber')}</TableHead>
                    <TableHead>{t('idCard.colIssueDate')}</TableHead>
                    <TableHead>{t('idCard.colExpiryDate')}</TableHead>
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
                students={students as any}
                staff={staff as any}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* ID Card Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('idCard.previewTitle')}</DialogTitle>
          </DialogHeader>
          {selectedPerson && (
            <IdCardTemplate
              person={selectedPerson as any}
              type={'rollNumber' in selectedPerson ? 'student' : 'staff'}
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
