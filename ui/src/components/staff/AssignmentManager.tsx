
import { useState, useEffect, useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Calendar, FileText, Users, Clock, X, BookOpen } from "lucide-react";
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
import { academicApi, type MyClassAssignment } from "@/services/api/academicApi";
import { assignmentSchema, type AssignmentFormData } from "@/schemas/assignmentSchema";

export function AssignmentManager() {
  const [assignments, setAssignments] = useState<AssignmentResponse[]>([]);
  const [totalAssignments, setTotalAssignments] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [classAssignments, setClassAssignments] = useState<MyClassAssignment[]>([]);

  const {
    register,
    handleSubmit,
    control,
    watch,
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

  const watchedClassId = watch("classId");

  // Unique classes for dropdown (deduplicate by classId+sectionId)
  const uniqueClasses = useMemo(() => {
    const seen = new Set<string>();
    const result: { id: string; sectionId: string | null; label: string }[] = [];
    for (const a of classAssignments) {
      const key = a.classId + (a.sectionId ?? "");
      if (!seen.has(key)) {
        seen.add(key);
        result.push({
          id: a.classId,
          sectionId: a.sectionId ?? null,
          label: [a.className, a.sectionName].filter(Boolean).join(" – "),
        });
      }
    }
    return result;
  }, [classAssignments]);

  // Map classId → display name for the table
  const classNameMap = useMemo(() => {
    const m: Record<string, string> = {};
    for (const c of uniqueClasses) m[c.id] = c.label;
    return m;
  }, [uniqueClasses]);

  // Subjects available for the currently selected class in the create form
  const subjectsForClass = useMemo(() => {
    if (!watchedClassId) return [];
    return classAssignments
      .filter((a) => a.classId === watchedClassId && a.subjectId && a.subjectName)
      .map((a) => ({ id: a.subjectId!, name: a.subjectName! }))
      .filter((v, i, arr) => arr.findIndex((x) => x.id === v.id) === i); // deduplicate
  }, [classAssignments, watchedClassId]);

  const totalStudents = useMemo(
    () => classAssignments.reduce((sum, a) => sum + (a.studentCount ?? 0), 0),
    [classAssignments]
  );

  const loadAssignments = async () => {
    const res = await assignmentApi.getAssignments(undefined, undefined, 1, 100);
    setAssignments(res.assignments ?? []);
    setTotalAssignments(res.total ?? 0);
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      assignmentApi.getAssignments(undefined, undefined, 1, 100),
      academicApi.getMyClassAssignments().catch(() => [] as MyClassAssignment[]),
    ])
      .then(([assignRes, caList]) => {
        if (cancelled) return;
        setAssignments(assignRes.assignments ?? []);
        setTotalAssignments(assignRes.total ?? 0);
        setClassAssignments(caList);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const pendingReview = assignments.filter(
    (a) => a.status === "active" || a.status === "pending"
  ).length;
  const dueThisWeek = assignments.filter((a) => {
    if (!a.dueDate) return false;
    const due = new Date(a.dueDate);
    const now = new Date();
    const diff = (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return diff >= 0 && diff <= 7;
  }).length;

  const filteredAssignments = assignments.filter((a) => {
    const matchesClass =
      selectedClassFilter === "all" || a.classId === selectedClassFilter;
    const matchesSearch = a.title
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    return matchesClass && matchesSearch;
  });

  const onSubmit = async (data: AssignmentFormData) => {
    try {
      await assignmentApi.createAssignment({
        title: data.title,
        description: data.description ?? "",
        subjectId: data.subjectId,
        classId: data.classId,
        sectionId: data.sectionId ?? undefined,
        assignedDate: data.assignedDate,
        dueDate: data.dueDate,
        maxMarks: data.maxMarks ?? 100,
        assignmentType: data.assignmentType,
        instructions: data.instructions ?? "",
        isPublished: data.isPublished,
        allowLateSubmission: data.allowLateSubmission,
        latePenaltyPercent: data.latePenaltyPercent,
      });
      toast.success("Assignment created successfully");
      setShowCreateForm(false);
      resetForm();
      await loadAssignments();
    } catch {
      toast.error("Failed to create assignment");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">My Assignments</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Assignments you have created across all your classes
          </p>
        </div>
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
                {loading ? (
                  <Skeleton className="h-8 w-12" />
                ) : (
                  <p className="text-2xl font-bold">{totalAssignments}</p>
                )}
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
                {loading ? (
                  <Skeleton className="h-8 w-12" />
                ) : (
                  <p className="text-2xl font-bold">{pendingReview}</p>
                )}
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
                {loading ? (
                  <Skeleton className="h-8 w-12" />
                ) : (
                  <p className="text-2xl font-bold">{totalStudents || "—"}</p>
                )}
                <p className="text-sm text-muted-foreground">Students in My Classes</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <Calendar className="h-8 w-8 text-purple-600" />
              <div>
                {loading ? (
                  <Skeleton className="h-8 w-12" />
                ) : (
                  <p className="text-2xl font-bold">{dueThisWeek}</p>
                )}
                <p className="text-sm text-muted-foreground">Due This Week</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Assignment List */}
      <Card>
        <CardHeader>
          <CardTitle>Assignments</CardTitle>
          <div className="flex flex-col md:flex-row gap-2 mt-4">
            <Select value={selectedClassFilter} onValueChange={setSelectedClassFilter}>
              <SelectTrigger className="w-52">
                <SelectValue placeholder="Filter by class" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All My Classes</SelectItem>
                {uniqueClasses.map((cls) => (
                  <SelectItem key={cls.id + (cls.sectionId ?? "")} value={cls.id}>
                    {cls.label}
                  </SelectItem>
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
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredAssignments.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="font-medium">No assignments found</p>
              <p className="text-sm mt-1">
                {assignments.length === 0
                  ? "Create your first assignment using the button above."
                  : "Try adjusting your filters."}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Assignment</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Assigned</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Max Marks</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAssignments.map((assignment) => (
                  <TableRow key={assignment.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{assignment.title}</div>
                        {assignment.description && (
                          <div className="text-sm text-muted-foreground">
                            {assignment.description.slice(0, 60)}
                            {assignment.description.length > 60 ? "…" : ""}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {classNameMap[assignment.classId] ?? assignment.classId}
                    </TableCell>
                    <TableCell className="text-sm">
                      {assignment.assignedDate
                        ? new Date(assignment.assignedDate).toLocaleDateString()
                        : "—"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {assignment.dueDate
                        ? new Date(assignment.dueDate).toLocaleDateString()
                        : "—"}
                    </TableCell>
                    <TableCell className="text-sm">{assignment.maxMarks ?? "—"}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          assignment.status === "completed"
                            ? "default"
                            : assignment.status === "overdue"
                            ? "destructive"
                            : "secondary"
                        }
                        className="capitalize"
                      >
                        {assignment.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Assignment Form */}
      {showCreateForm && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Create New Assignment</CardTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setShowCreateForm(false);
                resetForm();
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Title */}
                <div className="md:col-span-2">
                  <label className="text-sm font-medium">Title *</label>
                  <Input {...register("title")} placeholder="Assignment title" />
                  {errors.title && (
                    <p className="text-xs text-destructive mt-1">{errors.title.message}</p>
                  )}
                </div>

                {/* Class */}
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
                          {uniqueClasses.map((cls) => (
                            <SelectItem
                              key={cls.id + (cls.sectionId ?? "")}
                              value={cls.id}
                            >
                              {cls.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.classId && (
                    <p className="text-xs text-destructive mt-1">{errors.classId.message}</p>
                  )}
                </div>

                {/* Subject */}
                <div>
                  <label className="text-sm font-medium">Subject *</label>
                  <Controller
                    name="subjectId"
                    control={control}
                    render={({ field }) => (
                      <Select
                        onValueChange={field.onChange}
                        value={field.value ?? ""}
                        disabled={!watchedClassId || subjectsForClass.length === 0}
                      >
                        <SelectTrigger>
                          <SelectValue
                            placeholder={
                              !watchedClassId
                                ? "Select class first"
                                : subjectsForClass.length === 0
                                ? "No subjects for this class"
                                : "Select subject"
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {subjectsForClass.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.subjectId && (
                    <p className="text-xs text-destructive mt-1">{errors.subjectId.message}</p>
                  )}
                </div>

                {/* Type */}
                <div>
                  <label className="text-sm font-medium">Type</label>
                  <Controller
                    name="assignmentType"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value ?? "homework"}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {["homework", "project", "quiz", "test", "practicals", "other"].map(
                            (t) => (
                              <SelectItem key={t} value={t} className="capitalize">
                                {t.charAt(0).toUpperCase() + t.slice(1)}
                              </SelectItem>
                            )
                          )}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>

                {/* Max Marks */}
                <div>
                  <label className="text-sm font-medium">Max Marks</label>
                  <Input
                    type="number"
                    {...register("maxMarks")}
                    placeholder="100"
                    min={0}
                    max={1000}
                  />
                  {errors.maxMarks && (
                    <p className="text-xs text-destructive mt-1">{errors.maxMarks.message}</p>
                  )}
                </div>

                {/* Assigned Date */}
                <div>
                  <label className="text-sm font-medium">Assigned Date *</label>
                  <Input type="date" {...register("assignedDate")} />
                  {errors.assignedDate && (
                    <p className="text-xs text-destructive mt-1">{errors.assignedDate.message}</p>
                  )}
                </div>

                {/* Due Date */}
                <div>
                  <label className="text-sm font-medium">Due Date *</label>
                  <Input type="date" {...register("dueDate")} />
                  {errors.dueDate && (
                    <p className="text-xs text-destructive mt-1">{errors.dueDate.message}</p>
                  )}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  {...register("description")}
                  placeholder="Brief description of the assignment..."
                  rows={2}
                />
              </div>

              {/* Instructions */}
              <div>
                <label className="text-sm font-medium">Instructions</label>
                <Textarea
                  {...register("instructions")}
                  placeholder="Detailed instructions and requirements..."
                  rows={3}
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Creating…" : "Create Assignment"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowCreateForm(false);
                    resetForm();
                  }}
                >
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
