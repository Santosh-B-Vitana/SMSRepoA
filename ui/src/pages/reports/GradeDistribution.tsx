import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, RefreshCw, Download, BarChart3 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import examinationApi, { ExamBasic } from "@/services/api/examinationApi";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5092";

interface GradeSlot {
  gradeSymbol: string;
  gradeRange: string;
  studentCount: number;
  percentage: number;
}

interface GradeDistributionReport {
  examName: string;
  examDate: string;
  totalStudents: number;
  gradeDistributions: GradeSlot[];
}

function getAuthToken(): string | null {
  try {
    const raw = sessionStorage.getItem("auth_session");
    if (raw) return JSON.parse(raw)?.token ?? null;
  } catch { }
  return localStorage.getItem("authToken");
}

const GRADE_COLORS: Record<string, string> = {
  A: "bg-emerald-500",
  B: "bg-blue-500",
  C: "bg-yellow-400",
  D: "bg-orange-400",
  E: "bg-red-400",
};
const GRADE_BADGE: Record<string, string> = {
  A: "bg-emerald-100 text-emerald-700",
  B: "bg-blue-100 text-blue-700",
  C: "bg-yellow-100 text-yellow-700",
  D: "bg-orange-100 text-orange-700",
  E: "bg-red-100 text-red-700",
};

export default function GradeDistribution() {
  const navigate = useNavigate();
  const [exams, setExams] = useState<ExamBasic[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<string>("");
  const [report, setReport] = useState<GradeDistributionReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingExams, setLoadingExams] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    setLoading(true); setError(null); setReport(null);
    try {
      const res = await fetch(`${API_BASE}/api/ExaminationReports/grade-distribution/${examId}`, {
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
      ["Grade", "Range", "Students", "Percentage"],
      ...(report.gradeDistributions || []).map(g => [g.gradeSymbol, g.gradeRange, g.studentCount, g.percentage.toFixed(1) + "%"]),
    ];
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `grade-distribution-${report.examName}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const examOptions = exams.reduce<Array<{ id: string; label: string }>>((acc, e) => {
    const label = `${e.name} — Class ${e.class}${e.section ? ` (${e.section})` : ""}`;
    if (!acc.find(x => x.id === e.id)) acc.push({ id: e.id, label });
    return acc;
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Grade Distribution</h1>
              <p className="text-gray-500">Statistical distribution of student grades per exam</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={() => selectedExamId && fetchReport(selectedExamId)} disabled={!selectedExamId || loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
            <Button variant="outline" className="gap-2" onClick={downloadCSV} disabled={!report}>
              <Download className="h-4 w-4" /> CSV
            </Button>
          </div>
        </div>

        {/* Selector */}
        <Card>
          <CardHeader><CardTitle>Select Exam</CardTitle></CardHeader>
          <CardContent>
            {loadingExams ? <p className="text-gray-500 text-sm">Loading exams…</p> : (
              <Select value={selectedExamId} onValueChange={setSelectedExamId}>
                <SelectTrigger className="w-full max-w-xl">
                  <SelectValue placeholder="Choose an exam" />
                </SelectTrigger>
                <SelectContent>
                  {examOptions.map(e => <SelectItem key={e.id} value={e.id}>{e.label}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          </CardContent>
        </Card>

        {loading && (
          <div className="flex justify-center items-center h-48">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-3" />
              <p className="text-gray-500 text-sm">Loading grade distribution…</p>
            </div>
          </div>
        )}

        {error && !loading && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <p className="text-red-600 text-sm">{error}</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => selectedExamId && fetchReport(selectedExamId)}>Retry</Button>
            </CardContent>
          </Card>
        )}

        {report && !loading && (
          <>
            {/* Summary */}
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm text-gray-500">Exam</CardTitle></CardHeader>
                <CardContent><div className="text-xl font-bold">{report.examName}</div></CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm text-gray-500">Total Students</CardTitle></CardHeader>
                <CardContent><div className="text-3xl font-bold text-blue-600">{report.totalStudents}</div></CardContent>
              </Card>
            </div>

            {/* Visual bar chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5" /> Grade Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {(report.gradeDistributions || []).map(g => (
                  <div key={g.gradeSymbol} className="space-y-1">
                    <div className="flex justify-between text-sm font-medium">
                      <span>
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold mr-2 ${GRADE_BADGE[g.gradeSymbol] ?? "bg-gray-100 text-gray-700"}`}>
                          Grade {g.gradeSymbol}
                        </span>
                        {g.gradeRange}
                      </span>
                      <span className="text-gray-600">{g.studentCount} students ({g.percentage.toFixed(1)}%)</span>
                    </div>
                    <div className="h-5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${GRADE_COLORS[g.gradeSymbol] ?? "bg-gray-400"}`}
                        style={{ width: `${Math.max(g.percentage, g.studentCount > 0 ? 2 : 0)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Table */}
            <Card>
              <CardHeader><CardTitle>Grade Summary Table</CardTitle></CardHeader>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      {["Grade", "Range", "Students", "Percentage", "Visual"].map(h => (
                        <th key={h} className="px-4 py-3 text-left font-semibold text-gray-600">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(report.gradeDistributions || []).map(g => (
                      <tr key={g.gradeSymbol} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded text-xs font-bold ${GRADE_BADGE[g.gradeSymbol] ?? "bg-gray-100 text-gray-700"}`}>
                            {g.gradeSymbol}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{g.gradeRange}</td>
                        <td className="px-4 py-3 font-semibold">{g.studentCount}</td>
                        <td className="px-4 py-3">{g.percentage.toFixed(1)}%</td>
                        <td className="px-4 py-3 w-40">
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div className={`h-full ${GRADE_COLORS[g.gradeSymbol] ?? "bg-gray-400"}`} style={{ width: `${g.percentage}%` }} />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
