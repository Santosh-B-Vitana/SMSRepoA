import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  RefreshCw,
  Download,
  Users,
  FileText,
  Search,
  AlertCircle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAcademicYear } from "@/contexts/AcademicYearContext";
import {
  getDISESummary,
  getDISEStudents,
  downloadDISECsv,
  getDISEStaffSummary,
  type DISESchoolSummary,
  type DISEStudentRecord,
  type DISEStaffSummary,
} from "@/services/api/diseApi";
import { GraduationCap } from "lucide-react";

// ── Tabs ──────────────────────────────────────────────────────────────────────

type Tab = "summary" | "students" | "staff";

export default function DISEReport() {
  const navigate = useNavigate();
  const { academicYear, availableYears, currentYear, setCurrentYear } = useAcademicYear();

  const [activeTab, setActiveTab] = useState<Tab>("summary");
  const [classFilter, setClassFilter] = useState<string>("all");

  const [summary, setSummary] = useState<DISESchoolSummary | null>(null);
  const [students, setStudents] = useState<DISEStudentRecord[]>([]);
  const [studentSearch, setStudentSearch] = useState("");

  const [loadingSummary, setLoadingSummary] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [exportingCsv, setExportingCsv] = useState(false);

  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [studentsError, setStudentsError] = useState<string | null>(null);

  const [staffSummary, setStaffSummary] = useState<DISEStaffSummary | null>(null);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [staffError, setStaffError] = useState<string | null>(null);

  // Derive unique class names from summary breakdown (or from loaded students)
  const classNames: string[] = summary?.classBreakdown?.map((c) => c.className) ?? [];

  // ── Fetch summary ──────────────────────────────────────────────────────────
  const fetchSummary = useCallback(async () => {
    if (!academicYear) return;
    setLoadingSummary(true);
    setSummaryError(null);
    try {
      const data = await getDISESummary(academicYear);
      setSummary(data);
    } catch (e) {
      setSummaryError(e instanceof Error ? e.message : "Failed to load DISE summary.");
    } finally {
      setLoadingSummary(false);
    }
  }, [academicYear]);

  // ── Fetch student records ──────────────────────────────────────────────────
  const fetchStudents = useCallback(async () => {
    if (!academicYear) return;
    setLoadingStudents(true);
    setStudentsError(null);
    try {
      const data = await getDISEStudents(
        academicYear,
        classFilter !== "all" ? classFilter : undefined
      );
      setStudents(data.records);
    } catch (e) {
      setStudentsError(e instanceof Error ? e.message : "Failed to load student records.");
    } finally {
      setLoadingStudents(false);
    }
  }, [academicYear, classFilter]);

  // Load summary on mount / when academic year changes
  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  // ── Fetch staff summary ────────────────────────────────────────────────────
  const fetchStaff = useCallback(async () => {
    setLoadingStaff(true);
    setStaffError(null);
    try {
      const data = await getDISEStaffSummary();
      setStaffSummary(data);
    } catch (e) {
      setStaffError(e instanceof Error ? e.message : "Failed to load staff data.");
    } finally {
      setLoadingStaff(false);
    }
  }, []);

  // Load students when tab is active or filters change
  useEffect(() => {
    if (activeTab === "students") {
      fetchStudents();
    }
    if (activeTab === "staff" && !staffSummary) {
      fetchStaff();
    }
  }, [activeTab, fetchStudents, fetchStaff, staffSummary]);

  // ── CSV Export ─────────────────────────────────────────────────────────────
  const handleExportCsv = async () => {
    if (!academicYear) return;
    setExportingCsv(true);
    try {
      await downloadDISECsv(academicYear, classFilter !== "all" ? classFilter : undefined);
    } catch (e) {
      alert(e instanceof Error ? e.message : "CSV export failed.");
    } finally {
      setExportingCsv(false);
    }
  };

  // ── Filtered student list ──────────────────────────────────────────────────
  const filteredStudents = students.filter((s) => {
    if (!studentSearch) return true;
    const q = studentSearch.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      (s.penNumber ?? "").toLowerCase().includes(q) ||
      (s.aadharNumber ?? "").toLowerCase().includes(q) ||
      s.className.toLowerCase().includes(q)
    );
  });

  // ── Reusable stat card ─────────────────────────────────────────────────────
  const StatCard = ({
    label,
    value,
    sub,
    accent,
  }: {
    label: string;
    value: string | number;
    sub?: string;
    accent?: string;
  }) => (
    <Card>
      <CardContent className="p-5">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className={`text-2xl font-bold mt-1 ${accent ?? ""}`}>{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  );

  const pct = (n: number, total: number) =>
    total > 0 ? ` (${((n / total) * 100).toFixed(1)}%)` : "";

  return (
    <div className="space-y-6 p-6">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">DISE / UDISE Report</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              District Information System for Education — Annual School Report
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Academic year selector */}
          {availableYears.length > 0 && (
            <Select
              value={currentYear?.id ?? ""}
              onValueChange={(id) => {
                const y = availableYears.find((yr) => yr.id === id);
                if (y) setCurrentYear(y);
              }}
            >
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                {availableYears.map((y) => (
                  <SelectItem key={y.id} value={y.id}>
                    {y.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Class filter */}
          <Select value={classFilter} onValueChange={setClassFilter}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="All Classes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Classes</SelectItem>
              {classNames.map((c) => (
                <SelectItem key={c} value={c}>
                  Class {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              fetchSummary();
              if (activeTab === "students") fetchStudents();
              if (activeTab === "staff") fetchStaff();
            }}
            disabled={loadingSummary || loadingStudents || loadingStaff}
            title="Refresh"
          >
            <RefreshCw
              className={`h-4 w-4 ${loadingSummary || loadingStudents ? "animate-spin" : ""}`}
            />
          </Button>

          <Button
            variant="default"
            className="gap-2"
            onClick={handleExportCsv}
            disabled={exportingCsv || !academicYear}
          >
            <Download className="h-4 w-4" />
            {exportingCsv ? "Exporting…" : "Export CSV"}
          </Button>
        </div>
      </div>

      {/* ── No academic year warning ── */}
      {!academicYear && (
        <div className="flex items-center gap-2 rounded-md border border-yellow-300 bg-yellow-50 p-4 text-sm text-yellow-800">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          No academic year selected. Please choose an academic year from the selector above.
        </div>
      )}

      {/* ── Tabs ── */}
      <div className="flex gap-1 border-b">
        {(["summary", "students", "staff"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
              activeTab === t
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t === "summary" ? "School Summary" : t === "students" ? "Student Records" : "Staff & Teachers"}
          </button>
        ))}
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          SUMMARY TAB
          ════════════════════════════════════════════════════════════════════ */}
      {activeTab === "summary" && (
        <>
          {loadingSummary && (
            <div className="flex justify-center items-center h-48">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-3" />
                <p className="text-sm text-muted-foreground">Loading DISE summary…</p>
              </div>
            </div>
          )}

          {summaryError && !loadingSummary && (
            <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {summaryError}
            </div>
          )}

          {summary && !loadingSummary && (
            <div className="space-y-6">
              {/* School info bar */}
              <Card className="border-l-4 border-l-primary">
                <CardContent className="p-4 flex flex-wrap items-center gap-6">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">School</p>
                    <p className="font-semibold">{summary.schoolName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">UDISE Code</p>
                    <p className="font-semibold font-mono">
                      {summary.udiseCode ?? (
                        <span className="text-amber-600 text-sm">Not configured</span>
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Academic Year</p>
                    <p className="font-semibold">{summary.academicYear}</p>
                  </div>
                  <div className="ml-auto text-xs text-muted-foreground">
                    Generated: {new Date(summary.generatedAt).toLocaleString()}
                  </div>
                </CardContent>
              </Card>

              {/* Top-level stat cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label="Total Students" value={summary.totalStudents} />
                <StatCard
                  label="Boys"
                  value={summary.totalBoys}
                  sub={`${pct(summary.totalBoys, summary.totalStudents)} of total`}
                  accent="text-blue-600"
                />
                <StatCard
                  label="Girls"
                  value={summary.totalGirls}
                  sub={`${pct(summary.totalGirls, summary.totalStudents)} of total`}
                  accent="text-pink-600"
                />
                <StatCard
                  label="UDISE Code"
                  value={summary.udiseCode ?? "—"}
                  sub={summary.udiseCode ? "School identifier" : "Configure in Settings"}
                />
              </div>

              {/* Category breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Category Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { label: "General", value: summary.generalCategory, color: "bg-slate-100 text-slate-800" },
                      { label: "OBC", value: summary.obcCategory, color: "bg-blue-100 text-blue-800" },
                      { label: "SC", value: summary.scCategory, color: "bg-purple-100 text-purple-800" },
                      { label: "ST", value: summary.stCategory, color: "bg-green-100 text-green-800" },
                    ].map(({ label, value, color }) => (
                      <div key={label} className={`rounded-lg p-4 ${color}`}>
                        <p className="text-xs font-medium uppercase tracking-wide opacity-70">{label}</p>
                        <p className="text-2xl font-bold mt-1">{value}</p>
                        <p className="text-xs mt-0.5 opacity-70">
                          {pct(value, summary.totalStudents)}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Social indicators */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard
                  label="Minority Students"
                  value={summary.minorityStudents}
                  sub={pct(summary.minorityStudents, summary.totalStudents)}
                />
                <StatCard
                  label="BPL Students"
                  value={summary.bplStudents}
                  sub={pct(summary.bplStudents, summary.totalStudents)}
                />
                <StatCard
                  label="Differently Abled"
                  value={summary.differentlyAbledStudents}
                  sub={pct(summary.differentlyAbledStudents, summary.totalStudents)}
                />
                <div className="space-y-2">
                  <StatCard
                    label="Students with PEN"
                    value={summary.studentsWithPEN}
                    sub={`${pct(summary.studentsWithPEN, summary.totalStudents)} coverage`}
                    accent={
                      summary.studentsWithPEN === summary.totalStudents
                        ? "text-green-600"
                        : "text-amber-600"
                    }
                  />
                </div>
              </div>

              {/* Aadhaar coverage */}
              <Card>
                <CardContent className="p-5 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Aadhaar Coverage</p>
                    <p className="text-2xl font-bold mt-1">{summary.studentsWithAadhar}</p>
                    <p className="text-xs text-muted-foreground">
                      of {summary.totalStudents} students
                      {pct(summary.studentsWithAadhar, summary.totalStudents)}
                    </p>
                  </div>
                  <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                    <FileText className="h-6 w-6 text-primary" />
                  </div>
                </CardContent>
              </Card>

              {/* Class-wise breakdown table */}
              {summary.classBreakdown.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Class-wise Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Class</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                            <TableHead className="text-right">Boys</TableHead>
                            <TableHead className="text-right">Girls</TableHead>
                            <TableHead className="text-right">General</TableHead>
                            <TableHead className="text-right">OBC</TableHead>
                            <TableHead className="text-right">SC</TableHead>
                            <TableHead className="text-right">ST</TableHead>
                            <TableHead className="text-right">Minority</TableHead>
                            <TableHead className="text-right">BPL</TableHead>
                            <TableHead className="text-right">Diff. Abled</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {summary.classBreakdown.map((cls) => (
                            <TableRow key={cls.className}>
                              <TableCell className="font-medium">Class {cls.className}</TableCell>
                              <TableCell className="text-right font-semibold">{cls.totalStudents}</TableCell>
                              <TableCell className="text-right text-blue-600">{cls.boys}</TableCell>
                              <TableCell className="text-right text-pink-600">{cls.girls}</TableCell>
                              <TableCell className="text-right">{cls.generalCategory}</TableCell>
                              <TableCell className="text-right">{cls.obcCategory}</TableCell>
                              <TableCell className="text-right">{cls.scCategory}</TableCell>
                              <TableCell className="text-right">{cls.stCategory}</TableCell>
                              <TableCell className="text-right">{cls.minorityStudents}</TableCell>
                              <TableCell className="text-right">{cls.bplStudents}</TableCell>
                              <TableCell className="text-right">{cls.differentlyAbledStudents}</TableCell>
                            </TableRow>
                          ))}
                          {/* Totals row */}
                          <TableRow className="bg-muted/50 font-semibold">
                            <TableCell>Total</TableCell>
                            <TableCell className="text-right">{summary.totalStudents}</TableCell>
                            <TableCell className="text-right text-blue-600">{summary.totalBoys}</TableCell>
                            <TableCell className="text-right text-pink-600">{summary.totalGirls}</TableCell>
                            <TableCell className="text-right">{summary.generalCategory}</TableCell>
                            <TableCell className="text-right">{summary.obcCategory}</TableCell>
                            <TableCell className="text-right">{summary.scCategory}</TableCell>
                            <TableCell className="text-right">{summary.stCategory}</TableCell>
                            <TableCell className="text-right">{summary.minorityStudents}</TableCell>
                            <TableCell className="text-right">{summary.bplStudents}</TableCell>
                            <TableCell className="text-right">{summary.differentlyAbledStudents}</TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          STUDENTS TAB
          ════════════════════════════════════════════════════════════════════ */}
      {activeTab === "students" && (
        <>
          {/* Search bar */}
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search by name, PEN, Aadhaar…"
              value={studentSearch}
              onChange={(e) => setStudentSearch(e.target.value)}
            />
          </div>

          {loadingStudents && (
            <div className="flex justify-center items-center h-48">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-3" />
                <p className="text-sm text-muted-foreground">Loading student records…</p>
              </div>
            </div>
          )}

          {studentsError && !loadingStudents && (
            <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {studentsError}
            </div>
          )}

          {!loadingStudents && !studentsError && (
            <>
              <p className="text-sm text-muted-foreground">
                {filteredStudents.length} student{filteredStudents.length !== 1 ? "s" : ""}
                {studentSearch ? " matching search" : ""}
              </p>

              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>#</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>PEN</TableHead>
                          <TableHead>Aadhaar</TableHead>
                          <TableHead>Class</TableHead>
                          <TableHead>Section</TableHead>
                          <TableHead>Gender</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>DOB</TableHead>
                          <TableHead>Flags</TableHead>
                          <TableHead>Religion</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredStudents.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={11} className="text-center py-10 text-muted-foreground">
                              <Users className="h-8 w-8 mx-auto mb-2 opacity-30" />
                              No students found{studentSearch ? " matching your search" : ""}.
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredStudents.map((s, i) => (
                            <TableRow key={s.studentId}>
                              <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                              <TableCell className="font-medium whitespace-nowrap">
                                {s.name}
                                {s.fatherName && (
                                  <div className="text-xs text-muted-foreground">{s.fatherName}</div>
                                )}
                              </TableCell>
                              <TableCell className="font-mono text-sm">
                                {s.penNumber ?? <span className="text-muted-foreground">—</span>}
                              </TableCell>
                              <TableCell className="font-mono text-sm">
                                {s.aadharNumber ? (
                                  // Mask middle digits for display
                                  `${s.aadharNumber.slice(0, 4)}-XXXX-${s.aadharNumber.slice(-4)}`
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </TableCell>
                              <TableCell>{s.className}</TableCell>
                              <TableCell>{s.sectionName}</TableCell>
                              <TableCell>
                                {s.gender ? (
                                  <Badge
                                    variant="outline"
                                    className={
                                      s.gender.toLowerCase().startsWith("m")
                                        ? "border-blue-300 text-blue-700"
                                        : "border-pink-300 text-pink-700"
                                    }
                                  >
                                    {s.gender}
                                  </Badge>
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {s.category && (
                                  <Badge variant="secondary">{s.category}</Badge>
                                )}
                              </TableCell>
                              <TableCell className="whitespace-nowrap">
                                {s.dateOfBirth
                                  ? new Date(s.dateOfBirth).toLocaleDateString("en-IN")
                                  : "—"}
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-wrap gap-1">
                                  {s.isMinority && (
                                    <Badge variant="outline" className="text-xs">Minority</Badge>
                                  )}
                                  {s.isBPL && (
                                    <Badge variant="outline" className="text-xs border-orange-300 text-orange-700">BPL</Badge>
                                  )}
                                  {s.isDifferentlyAbled && (
                                    <Badge variant="outline" className="text-xs border-violet-300 text-violet-700">
                                      {s.differentlyAbledType ?? "Diff. Abled"}
                                    </Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                {s.religion ?? <span className="text-muted-foreground">—</span>}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          STAFF & TEACHERS TAB
          ════════════════════════════════════════════════════════════════════ */}
      {activeTab === "staff" && (
        <>
          {loadingStaff && (
            <div className="flex justify-center items-center h-48">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-3" />
                <p className="text-sm text-muted-foreground">Loading staff data…</p>
              </div>
            </div>
          )}

          {staffError && !loadingStaff && (
            <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {staffError}
            </div>
          )}

          {staffSummary && !loadingStaff && (
            <div className="space-y-6">
              {/* Overview stat cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                <StatCard
                  label="Total Teaching Staff"
                  value={staffSummary.totalTeachingStaff}
                  accent="text-primary"
                />
                <StatCard
                  label="Male Teachers"
                  value={staffSummary.maleTeachers}
                  sub={pct(staffSummary.maleTeachers, staffSummary.totalTeachingStaff)}
                />
                <StatCard
                  label="Female Teachers"
                  value={staffSummary.femaleTeachers}
                  sub={pct(staffSummary.femaleTeachers, staffSummary.totalTeachingStaff)}
                />
                <StatCard
                  label="Trained (B.Ed / D.El.Ed)"
                  value={staffSummary.trainedTeachers}
                  sub={pct(staffSummary.trainedTeachers, staffSummary.totalTeachingStaff)}
                  accent="text-green-600"
                />
                <StatCard
                  label="Untrained"
                  value={staffSummary.untrainedTeachers}
                  sub={pct(staffSummary.untrainedTeachers, staffSummary.totalTeachingStaff)}
                  accent={staffSummary.untrainedTeachers > 0 ? "text-amber-600" : undefined}
                />
                <StatCard
                  label="Permanent"
                  value={staffSummary.permanentTeachers}
                  sub={pct(staffSummary.permanentTeachers, staffSummary.totalTeachingStaff)}
                />
                <StatCard
                  label="Contract / Temporary"
                  value={staffSummary.contractTeachers}
                  sub={pct(staffSummary.contractTeachers, staffSummary.totalTeachingStaff)}
                />
                <StatCard
                  label="Staff with Aadhaar"
                  value={staffSummary.staffWithAadhar}
                  sub={`of ${staffSummary.totalTeachingStaff} (all staff)`}
                />
              </div>

              {/* Designation breakdown table */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <GraduationCap className="h-4 w-4" />
                    Teacher Count by Designation
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Designation</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                          <TableHead className="text-right">Male</TableHead>
                          <TableHead className="text-right">Female</TableHead>
                          <TableHead className="text-right">Trained</TableHead>
                          <TableHead className="text-right">Training %</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {staffSummary.byDesignation.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                              <GraduationCap className="h-8 w-8 mx-auto mb-2 opacity-30" />
                              No teaching staff records found.
                            </TableCell>
                          </TableRow>
                        ) : (
                          <>
                            {staffSummary.byDesignation.map((d) => (
                              <TableRow key={d.designation}>
                                <TableCell className="font-medium capitalize">{d.designation}</TableCell>
                                <TableCell className="text-right font-semibold">{d.total}</TableCell>
                                <TableCell className="text-right">{d.male}</TableCell>
                                <TableCell className="text-right">{d.female}</TableCell>
                                <TableCell className="text-right text-green-700">{d.trained}</TableCell>
                                <TableCell className="text-right text-muted-foreground text-sm">
                                  {d.total > 0 ? `${((d.trained / d.total) * 100).toFixed(0)}%` : "—"}
                                </TableCell>
                              </TableRow>
                            ))}
                            {/* Totals row */}
                            <TableRow className="bg-muted/40 font-semibold">
                              <TableCell>Total</TableCell>
                              <TableCell className="text-right">{staffSummary.totalTeachingStaff}</TableCell>
                              <TableCell className="text-right">{staffSummary.maleTeachers}</TableCell>
                              <TableCell className="text-right">{staffSummary.femaleTeachers}</TableCell>
                              <TableCell className="text-right text-green-700">{staffSummary.trainedTeachers}</TableCell>
                              <TableCell className="text-right text-muted-foreground text-sm">
                                {staffSummary.totalTeachingStaff > 0
                                  ? `${((staffSummary.trainedTeachers / staffSummary.totalTeachingStaff) * 100).toFixed(0)}%`
                                  : "—"}
                              </TableCell>
                            </TableRow>
                          </>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {/* Compliance note */}
              <p className="text-xs text-muted-foreground">
                Trained status is determined from the Qualification field (B.Ed, D.El.Ed, JBT, NTT, ETT).
                Ensure staff records are up to date before submitting to DISE.
                Generated at: {new Date(staffSummary.generatedAt).toLocaleString("en-IN")}.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
