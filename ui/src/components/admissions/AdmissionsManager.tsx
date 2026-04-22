
import { useState } from "react";
import { Plus, Search, Users, Calendar, CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { ApplicationTrackingSystem } from "./ApplicationTrackingSystem";
import { AnimatedBackground } from "@/components/common/AnimatedBackground";
import { AnimatedWrapper } from "@/components/common/AnimatedWrapper";
import { ModernCard } from "@/components/common/ModernCard";
import { useAdmissions, useAdmissionStats } from "@/hooks/useAdmissions";
import type { CreateAdmissionData } from "@/services/admissionService";

const statusColors: Record<string, string> = {
  pending:    "bg-yellow-100 text-yellow-800",
  approved:   "bg-green-100 text-green-800",
  rejected:   "bg-red-100 text-red-800",
  waitlisted: "bg-blue-100 text-blue-800",
  enrolled:   "bg-purple-100 text-purple-800",
  interviewed:"bg-orange-100 text-orange-800",
};

const CLASSES = ["Nursery","LKG","UKG","1","2","3","4","5","6","7","8","9","10","11","12"];

export function AdmissionsManager() {
  const { toast } = useToast();

  const [searchTerm, setSearchTerm]     = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [classFilter, setClassFilter]   = useState("all");
  const [page, setPage]                 = useState(1);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  // Form state
  const [formData, setFormData] = useState<Partial<CreateAdmissionData>>({
    gender: "male", academicYear: new Date().getFullYear() + "-" + String(new Date().getFullYear() + 1).slice(2),
  });

  const { items, totalCount, totalPages, isLoading, error, updateStatus, createAdmission } = useAdmissions({
    filters: {
      searchTerm: searchTerm || undefined,
      status: statusFilter !== "all" ? statusFilter : undefined,
      class: classFilter !== "all" ? classFilter : undefined,
    },
    pagination: { page, pageSize: 20 },
  });

  const { stats } = useAdmissionStats();

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      if (newStatus === "rejected") {
        const reason = window.prompt("Enter rejection reason (min 3 chars):");
        if (!reason || reason.trim().length < 3) {
          toast({ title: "Rejection reason is required (min 3 chars)", variant: "destructive" });
          return;
        }
        await updateStatus({ id, status: newStatus, remarks: reason });
      } else {
        await updateStatus({ id, status: newStatus });
      }
      toast({ title: "Status Updated", description: `Application status changed to ${newStatus}.` });
    } catch (err: any) {
      toast({
        title: "Update Failed",
        description: err?.response?.data?.message ?? err?.message ?? "Unknown error",
        variant: "destructive",
      });
    }
  };

  const handleCreate = async () => {
    try {
      const required: (keyof CreateAdmissionData)[] = [
        "firstName","lastName","dateOfBirth","gender","guardianName","guardianRelation","guardianPhone","address","appliedClass","academicYear"
      ];
      for (const field of required) {
        if (!formData[field]) {
          toast({ title: `${field} is required`, variant: "destructive" });
          return;
        }
      }
      await createAdmission(formData as CreateAdmissionData);
      toast({ title: "Application submitted successfully" });
      setIsAddDialogOpen(false);
      setFormData({ gender: "male", academicYear: formData.academicYear });
    } catch (err: any) {
      toast({
        title: "Submission Failed",
        description: err?.response?.data?.message ?? err?.message ?? "Unknown error",
        variant: "destructive",
      });
    }
  };

  const field = (key: keyof CreateAdmissionData, value: string) =>
    setFormData(prev => ({ ...prev, [key]: value }));

  return (
    <div className="relative min-h-screen">
      <AnimatedBackground variant="mesh" className="fixed inset-0 -z-10 opacity-30" />

      <div className="space-y-6 relative z-10">
        <AnimatedWrapper variant="fadeInUp" delay={0.05}>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-display gradient-text">Admissions</h1>
              <p className="text-muted-foreground mt-2">Manage student admission applications</p>
            </div>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="w-full sm:w-auto">
                  <Plus className="w-4 h-4 mr-2" />
                  New Application
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>New Admission Application</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>First Name *</Label>
                      <Input placeholder="First name" onChange={e => field("firstName", e.target.value)} />
                    </div>
                    <div>
                      <Label>Last Name *</Label>
                      <Input placeholder="Last name" onChange={e => field("lastName", e.target.value)} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Date of Birth *</Label>
                      <Input type="date" onChange={e => field("dateOfBirth", e.target.value)} />
                    </div>
                    <div>
                      <Label>Gender *</Label>
                      <Select defaultValue="male" onValueChange={v => field("gender", v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Applied Class *</Label>
                      <Select onValueChange={v => field("appliedClass", v)}>
                        <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                        <SelectContent>
                          {CLASSES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Academic Year *</Label>
                      <Input placeholder="e.g. 2025-26" defaultValue={formData.academicYear} onChange={e => field("academicYear", e.target.value)} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Guardian Name *</Label>
                      <Input placeholder="Guardian name" onChange={e => field("guardianName", e.target.value)} />
                    </div>
                    <div>
                      <Label>Relation *</Label>
                      <Input placeholder="e.g. Father, Mother" onChange={e => field("guardianRelation", e.target.value)} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Guardian Phone *</Label>
                      <Input placeholder="Phone number" onChange={e => field("guardianPhone", e.target.value)} />
                    </div>
                    <div>
                      <Label>Guardian Email</Label>
                      <Input type="email" placeholder="Email" onChange={e => field("guardianEmail", e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <Label>Address *</Label>
                    <Textarea placeholder="Full address" onChange={e => field("address", e.target.value)} />
                  </div>
                  <div>
                    <Label>Previous School</Label>
                    <Input placeholder="Previous school name" onChange={e => field("previousSchool", e.target.value)} />
                  </div>
                  <div>
                    <Label>Category</Label>
                    <Select onValueChange={v => field("category", v)}>
                      <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="general">General</SelectItem>
                        <SelectItem value="obc">OBC</SelectItem>
                        <SelectItem value="sc">SC</SelectItem>
                        <SelectItem value="st">ST</SelectItem>
                        <SelectItem value="ews">EWS</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button className="w-full" onClick={handleCreate}>Submit Application</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </AnimatedWrapper>

        {/* Stats */}
        <AnimatedWrapper variant="fadeInUp" delay={0.1}>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            {[
              { label: "Total", value: stats?.total ?? 0, color: "blue" },
              { label: "Pending", value: stats?.pending ?? 0, color: "yellow" },
              { label: "Interviewed", value: stats?.interviewed ?? 0, color: "orange" },
              { label: "Approved", value: stats?.approved ?? 0, color: "green" },
              { label: "Enrolled", value: stats?.enrolled ?? 0, color: "purple" },
              { label: "Waitlisted", value: stats?.waitlisted ?? 0, color: "blue" },
              { label: "Rejected", value: stats?.rejected ?? 0, color: "red" },
            ].map(({ label, value, color }) => (
              <ModernCard key={label} variant="glass">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <div className={`p-2 bg-${color}-100 dark:bg-${color}-900/30 rounded-lg`}>
                      <Users className={`w-4 h-4 text-${color}-600 dark:text-${color}-400`} />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{label}</p>
                      <p className="text-xl font-semibold">{value}</p>
                    </div>
                  </div>
                </CardContent>
              </ModernCard>
            ))}
          </div>
        </AnimatedWrapper>

        {/* Filters */}
        <AnimatedWrapper variant="fadeInUp" delay={0.15}>
          <ModernCard variant="glass">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Search by student name, guardian, application number..."
                    value={searchTerm}
                    onChange={e => { setSearchTerm(e.target.value); setPage(1); }}
                    className="pl-10"
                  />
                </div>
                <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(1); }}>
                  <SelectTrigger className="w-full sm:w-44">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="interviewed">Interviewed</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="enrolled">Enrolled</SelectItem>
                    <SelectItem value="waitlisted">Waitlisted</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={classFilter} onValueChange={v => { setClassFilter(v); setPage(1); }}>
                  <SelectTrigger className="w-full sm:w-40">
                    <SelectValue placeholder="Filter by class" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Classes</SelectItem>
                    {CLASSES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </ModernCard>
        </AnimatedWrapper>

        {/* Table */}
        <AnimatedWrapper variant="fadeInUp" delay={0.2}>
          <Tabs defaultValue="applications">
            <TabsList className="w-full flex">
              <TabsTrigger value="applications">Applications ({totalCount})</TabsTrigger>
              <TabsTrigger value="tracking">
                <CheckCircle className="h-4 w-4 mr-2" />
                Application Tracking
              </TabsTrigger>
            </TabsList>

            <TabsContent value="applications">
              <ModernCard variant="glass">
                <CardHeader>
                  <CardTitle>Admission Applications</CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="flex justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : error ? (
                    <div className="text-center py-12 text-red-500">{error}</div>
                  ) : items.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">No applications found.</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Application #</TableHead>
                            <TableHead>Student</TableHead>
                            <TableHead>Guardian</TableHead>
                            <TableHead>Class</TableHead>
                            <TableHead>Academic Year</TableHead>
                            <TableHead>Applied On</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {items.map(admission => (
                            <TableRow key={admission.id}>
                              <TableCell className="font-medium">{admission.applicationNumber}</TableCell>
                              <TableCell>
                                <div>
                                  <p className="font-medium">{admission.studentName}</p>
                                  <p className="text-sm text-muted-foreground">
                                    DOB: {new Date(admission.dateOfBirth).toLocaleDateString()}
                                  </p>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div>
                                  <p>{admission.guardianName}</p>
                                  <p className="text-sm text-muted-foreground">{admission.guardianPhone}</p>
                                </div>
                              </TableCell>
                              <TableCell>{admission.appliedClass}</TableCell>
                              <TableCell>{admission.academicYear}</TableCell>
                              <TableCell>{new Date(admission.applicationDate).toLocaleDateString()}</TableCell>
                              <TableCell>
                                <Badge className={statusColors[admission.status] ?? ""}>
                                  {admission.status.charAt(0).toUpperCase() + admission.status.slice(1)}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Select
                                  value={admission.status}
                                  onValueChange={v => handleStatusChange(admission.id, v)}
                                  disabled={admission.status === "enrolled"}
                                >
                                  <SelectTrigger className="w-32">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="pending">Pending</SelectItem>
                                    <SelectItem value="interviewed">Interviewed</SelectItem>
                                    <SelectItem value="approved">Approved</SelectItem>
                                    <SelectItem value="waitlisted">Waitlisted</SelectItem>
                                    <SelectItem value="rejected">Rejected</SelectItem>
                                  </SelectContent>
                                </Select>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4">
                      <p className="text-sm text-muted-foreground">
                        Page {page} of {totalPages} ({totalCount} total)
                      </p>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                          Previous
                        </Button>
                        <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </ModernCard>
            </TabsContent>

            <TabsContent value="tracking">
              <ApplicationTrackingSystem />
            </TabsContent>
          </Tabs>
        </AnimatedWrapper>
      </div>
    </div>
  );
}

