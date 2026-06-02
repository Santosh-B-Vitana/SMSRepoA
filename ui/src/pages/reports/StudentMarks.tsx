import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, RefreshCw, Download, Search, Trophy, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import examinationApi, { ExamBasic } from "@/services/api/examinationApi";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

interface StudentMarkDetail {
  studentId: string;
  studentName: string;
  rollNumber: string;
  className: string;
  marksObtained: number;
  totalMarks: number;
  percentage: number;
  grade: string;
  status: string;
}

interface StudentMarksReport {
  examName: string;
  examDate: string;
  totalStudents: number;
  studentMarks: StudentMarkDetail[];
}

function getAuthToken(): string | null {
  try {
    const raw = sessionStorage.getItem("auth_session");
    if (raw) return JSON.parse(raw)?.token ?? null;
  } catch { }
  return localStorage.getItem("authToken");
}

function gradeColor(grade: string) {
  if (!grade) return "bg-gray-100 text-gray-700";
  const g = grade.toUpperCase();
  if (g.startsWith("A")) return "bg-green-100 text-green-700";
  if (g.startsWith("B")) return "bg-blue-100 text-blue-700";
  if (g.startsWith("C")) return "bg-yellow-100 text-yellow-700";
  if (g === "D") return "bg-orange-100 text-orange-700";
  return "bg-red-100 text-red-700";
}

export default function StudentMarks() {
  const navigate = useNavigate();
  const [exams, setExams] = useState<ExamBasic[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<string>("");
  const [report, setReport] = useState<StudentMarksReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingExams, setLoadingExams] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    examinationApi.getExams({}, 1, 500)
      .then(res => setExams(res.items || []))
      .catch(() => setExams([]))
      .finally(() => setLoadingExams(false));
  }, []);

  useEffect(() => {
    if (!selectedExamId) return;
    fetchReport(selectedExamId);
  }, [selectedExamId]);

  const fetchReport = async (examId: string) => {
    setLoading(true);
    setError(null);
    setReport(null);
    try {
      const res = await fetch(`${API_BASE}/api/ExaminationReports/student-marks/${examId}`, {
        headers: { Authorization: `Bearer ${getAuthToken()}` },
      });
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();
      if (data.success && data.data?.data) setReport(data.data.data);
      else throw new Error(data.message || "Failed to load report");
    } catch (e) {
      setError(e instanceof Error ? e.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const downloadCSV = () => {
    if (!report) return;
    const rows = [
      ["Rank", "Student Name", "Roll No", "Class", "Marks", "Total", "Percentage", "Grade", "Status"],
      ...filteredStudents.map((s, i) => [
        i + 1, s.studentName, s.rollNumber, s.className,
        s.marksObtained, s.totalMarks, s.percentage.toFixed(1) + "%", s.grade, s.status,
      ]),
    ];
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `student-marks-${report.examName}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const filteredStudents = (report?.studentMarks ?? []).filter(s =>
    !search || s.studentName.toLowerCase().includes(search.toLowerCase()) || s.rollNumber.includes(search)
  );

  // Deduplicate exams by name+class for a cleaner selector
  const uniqueExamOptions = exams.reduce<Array<{ id: string; label: string }>>((acc, e) => {
    const label = `${e.name} — Class ${e.class}${e.section ? ` (${e.section})` : ""}`;
    if (!acc.find(x => x.id === e.id)) acc.push({ id: e.id, label });
    return acc;
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Student Wise Marks</h1>
              <p className="text-gray-500">Individual student performance per exam</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={() => selectedExamId && fetchReport(selectedExamId)} disabled={!selectedExamId || loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
            <Button variant="outline" className="gap-2" onClick={downloadCSV} disabled={!report}>
              <Download className="h-4 w-4" /> Download CSV
            </Button>
          </div>
        </div>

        {/* Exam selector */}
        <Card>
          <CardHeader><CardTitle>Select Exam</CardTitle></CardHeader>
          <CardContent>
            {loadingExams ? (
              <p className="text-gray-500 text-sm">Loading exams…</p>
            ) : (
              <Select value={selectedExamId} onValueChange={setSelectedExamId}>
                <SelectTrigger className="w-full max-w-xl">
                  <SelectValue placeholder="Choose an exam to view student marks" />
                </SelectTrigger>
                <SelectContent>
                  {uniqueExamOptions.map(e => (
                    <SelectItem key={e.id} value={e.id}>{e.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </CardContent>
        </Card>

        {loading && (
          <div className="flex justify-center items-center h-48">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-3" />
              <p className="text-gray-500 text-sm">Loading student marks…</p>
            </div>
          </div>
        )}

        {error && !loading && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <p className="text-red-600 text-sm">{error}</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => selectedExamId && fetchReport(selectedExamId)}>
                Retry
              </Button>
            </CardContent>
          </Card>
        )}

        {report && !loading && (
          <>
            {/* Summary stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Total Students", value: report.totalStudents, color: "text-blue-600" },
                { label: "Passed", value: filteredStudents.filter(s => s.status === "Pass").length, color: "text-green-600" },
                { label: "Failed", value: filteredStudents.filter(s => s.status === "Fail").length, color: "text-red-600" },
                { label: "Pass Rate", value: report.totalStudents > 0 ? `${((filteredStudents.filter(s => s.status === "Pass").length / report.totalStudents) * 100).toFixed(1)}%` : "—", color: "text-purple-600" },
              ].map(stat => (
                <Card key={stat.label}>
                  <CardHeader className="pb-2"><CardTitle className="text-sm text-gray-500 font-medium">{stat.label}</CardTitle></CardHeader>
                  <CardContent><div className={`text-3xl font-bold ${stat.color}`}>{stat.value}</div></CardContent>
                </Card>
              ))}
            </div>

            {/* Search + table */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2"><User className="h-5 w-5" /> {report.examName} — Student Marks</CardTitle>
                  <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input placeholder="Search name or roll no…" className="pl-9 h-9" value={search} onChange={e => setSearch(e.target.value)} />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        {["Rank", "Student Name", "Roll No", "Class", "Marks", "Percentage", "Grade", "Status"].map(h => (
                          <th key={h} className="px-4 py-3 text-left font-semibold text-gray-600">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStudents.length === 0 ? (
                        <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">No students found</td></tr>
                      ) : filteredStudents.map((s, i) => (
                        <tr key={s.studentId} className="border-b hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3">
                            {i === 0 ? <span className="inline-flex items-center gap-1 text-yellow-600 font-bold"><Trophy className="h-3.5 w-3.5" />1</span> : <span className="text-gray-500">{i + 1}</span>}
                          </td>
                          <td className="px-4 py-3 font-medium">{s.studentName}</td>
                          <td className="px-4 py-3 text-gray-500">{s.rollNumber || "—"}</td>
                          <td className="px-4 py-3">{s.className || "—"}</td>
                          <td className="px-4 py-3 font-mono">{s.marksObtained}/{s.totalMarks}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-20 h-1.5 rounded-full bg-gray-200 overflow-hidden">
                                <div className={`h-full rounded-full ${s.percentage >= 70 ? "bg-green-500" : s.percentage >= 50 ? "bg-yellow-400" : "bg-red-400"}`} style={{ width: `${Math.min(100, s.percentage)}%` }} />
                              </div>
                              <span>{s.percentage.toFixed(1)}%</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <Badge className={gradeColor(s.grade)}>{s.grade}</Badge>
                          </td>
                          <td className="px-4 py-3">
                            <Badge className={s.status === "Pass" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}>{s.status}</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
