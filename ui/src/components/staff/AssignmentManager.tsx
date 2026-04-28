
import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Calendar, FileText, Users, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { assignmentApi, type AssignmentResponse } from "@/services/api/assignmentApi";
import { academicApi } from "@/services/api/academicApi";
import { assignmentSchema, type AssignmentFormData } from "@/schemas/assignmentSchema";

interface Assignment {
  id: string;
  title: string;
  subject: string;
  class: string;
  dueDate: string;
  submitted: number;
  total: number;
  status: 'active' | 'completed' | 'overdue';
}

const mockAssignments: Assignment[] = [
  {
    id: "1",
    title: "Quadratic Equations Practice",
    subject: "Mathematics",
    class: "10-A",
    dueDate: "2024-03-20",
    submitted: 28,
    total: 35,
    status: 'active'
  },
  {
    id: "2", 
    title: "Algebra Problem Set",
    subject: "Mathematics",
    class: "10-B", 
    dueDate: "2024-03-18",
    submitted: 30,
    total: 33,
    status: 'completed'
  }
];

export function AssignmentManager() {
  const [assignments, setAssignments] = useState<AssignmentResponse[]>([]);
  const [totalAssignments, setTotalAssignments] = useState(0);
  const [totalStudents, setTotalStudents] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedClass, setSelectedClass] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [staffClasses, setStaffClasses] = useState<{ id: string; name: string }[]>([]);

  const {
    register,
    handleSubmit,
    control,
    reset: resetForm,
    formState: { errors, isSubmitting },
  } = useForm<AssignmentFormData>({
    resolver: zodResolver(assignmentSchema),
    defaultValues: {
      assignedDate: new Date().toISOString().split("T")[0],
      assignmentType: "homework",
      isPublished: false,
      allowLateSubmission: false,
    },
  });

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      assignmentApi.getAssignments(undefined, undefined, 1, 100),
      academicApi.getMyClassAssignments().catch(() => [] as Awaited<ReturnType<typeof academicApi.getMyClassAssignments>>),
    ]).then(([assignRes, classAssignments]) => {
      if (cancelled) return;
      setAssignments(assignRes.assignments ?? []);
      setTotalAssignments(assignRes.total ?? 0);
      const classes = classAssignments.map(a => ({
        id: a.classId,
        name: [a.className, a.sectionName].filter(Boolean).join(' '),
      }));
      setStaffClasses(classes);
      // get student count from class assignments
      const studentCount = classAssignments.reduce((sum, a) => sum + (a.studentCount ?? 0), 0);
      setTotalStudents(studentCount);
    }).catch(() => {}).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const today = new Date().toISOString().split('T')[0];
  const pendingReview = assignments.filter(a => a.status === 'active' || a.status === 'pending').length;
  const dueThisWeek = assignments.filter(a => {
    if (!a.dueDate) return false;
    const due = new Date(a.dueDate);
    const now = new Date();
    const diff = (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return diff >= 0 && diff <= 7;
  }).length;

  // Filter assignments based on selected class and search term
  const filteredAssignments = assignments.filter(assignment => {
    const matchesClass = selectedClass === "all" || assignment.classId === selectedClass;
    const matchesSearch = assignment.title.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesClass && matchesSearch;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Assignment Management</h1>
        <Button onClick={() => setShowCreateForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Assignment
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <FileText className="h-8 w-8 text-blue-600" />
              <div>
                {loading ? <Skeleton className="h-8 w-12" /> : <p className="text-2xl font-bold">{totalAssignments}</p>}
                <p className="text-sm text-muted-foreground">Total Assignments</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <Clock className="h-8 w-8 text-orange-600" />
              <div>
                {loading ? <Skeleton className="h-8 w-12" /> : <p className="text-2xl font-bold">{pendingReview}</p>}
                <p className="text-sm text-muted-foreground">Pending Review</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <Users className="h-8 w-8 text-green-600" />
              <div>
                {loading ? <Skeleton className="h-8 w-12" /> : <p className="text-2xl font-bold">{totalStudents || '—'}</p>}
                <p className="text-sm text-muted-foreground">Total Students</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <Calendar className="h-8 w-8 text-purple-600" />
              <div>
                {loading ? <Skeleton className="h-8 w-12" /> : <p className="text-2xl font-bold">{dueThisWeek}</p>}
                <p className="text-sm text-muted-foreground">Due This Week</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Assignment List */}
      <Card>
        <CardHeader>
          <CardTitle>Current Assignments</CardTitle>
          <div className="flex flex-col md:flex-row gap-2 mt-4">
            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by class" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes</SelectItem>
                {staffClasses.map(cls => (
                  <SelectItem key={cls.id} value={cls.name.split(' ').pop()}>{cls.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="text"
              placeholder="Search assignments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-64"
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Assignment</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Submissions</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAssignments.map((assignment) => (
                <TableRow key={assignment.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{assignment.title}</div>
                      <div className="text-sm text-muted-foreground">{assignment.description?.slice(0, 60)}</div>
                    </div>
                  </TableCell>
                  <TableCell>{assignment.classId}</TableCell>
                  <TableCell>{assignment.dueDate ? new Date(assignment.dueDate).toLocaleDateString() : '—'}</TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">Max {assignment.maxMarks} pts</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={
                      assignment.status === 'completed' ? 'default' :
                      assignment.status === 'overdue' ? 'destructive' : 'secondary'
                    }>
                      {assignment.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm">
                      View Details
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Assignment Form */}
      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Assignment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <form
              onSubmit={handleSubmit(async (data: AssignmentFormData) => {
                try {
                  await assignmentApi.createAssignment({
                    title: data.title,
                    description: data.description ?? "",
                    subjectId: data.subjectId,
                    classId: data.classId,
                    sectionId: data.sectionId ?? undefined,
                    assignedDate: data.assignedDate,
                    dueDate: data.dueDate,
                    maxMarks: data.maxMarks,
                    assignmentType: data.assignmentType,
                    instructions: data.instructions ?? "",
                    isPublished: data.isPublished,
                    allowLateSubmission: data.allowLateSubmission,
                    latePenaltyPercent: data.latePenaltyPercent,
                  });
                  toast.success("Assignment created successfully");
                  setShowCreateForm(false);
                  resetForm();
                  // Re-fetch assignments
                  const res = await assignmentApi.getAssignments(undefined, undefined, 1, 100);
                  setAssignments(res.assignments ?? []);
                  setTotalAssignments(res.total ?? 0);
                } catch {
                  toast.error("Failed to create assignment");
                }
              })}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Title *</label>
                  <Input {...register("title")} placeholder="Assignment title" />
                  {errors.title && <p className="text-xs text-destructive mt-1">{errors.title.message}</p>}
                </div>
                <div>
                  <label className="text-sm font-medium">Class *</label>
                  <Controller
                    name="classId"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value ?? ""}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select class" />
                        </SelectTrigger>
                        <SelectContent>
                          {staffClasses.map(cls => (
                            <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.classId && <p className="text-xs text-destructive mt-1">{errors.classId.message}</p>}
                </div>
                <div>
                  <label className="text-sm font-medium">Due Date *</label>
                  <Input type="date" {...register("dueDate")} />
                  {errors.dueDate && <p className="text-xs text-destructive mt-1">{errors.dueDate.message}</p>}
                </div>
                <div>
                  <label className="text-sm font-medium">Max Points</label>
                  <Input type="number" {...register("maxMarks")} placeholder="100" />
                  {errors.maxMarks && <p className="text-xs text-destructive mt-1">{errors.maxMarks.message}</p>}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Instructions</label>
                <Textarea {...register("instructions")} placeholder="Assignment instructions and requirements..." rows={4} />
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={isSubmitting}>Create Assignment</Button>
                <Button type="button" variant="outline" onClick={() => { setShowCreateForm(false); resetForm(); }}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
