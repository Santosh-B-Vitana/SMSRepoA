import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, RefreshCw, Download, BookOpen, TrendingUp, TrendingDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import examinationApi, { ExamBasic } from "@/services/api/examinationApi";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5092";

interface SubjectMetric {
  subjectName: string;
  totalMarks: number;
  passMarks: number;
  averageMarks: number;
  passPercentage: number;
  failPercentage: number;
  highestMarks: number;
  lowestMarks: number;
  studentsPassed: number;
  studentsFailed: number;
  totalStudents: number;
}

interface SubjectPerformanceReport {
  examName: string;
  examDate: string;
  subjectMetrics: SubjectMetric[];
}

function getAuthToken(): string | null {
  try {
    const raw = sessionStorage.getItem("auth_session");
    if (raw) return JSON.parse(raw)?.token ?? null;
  } catch { }
  return localStorage.getItem("authToken");
}

export default function SubjectPerformance() {
  const navigate = useNavigate();
  const [exams, setExams] = useState<ExamBasic[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<string>("");
  const [report, setReport] = useState<SubjectPerformanceReport | null>(null);
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
      const res = await fetch(`${API_BASE}/api/ExaminationReports/subject-performance/${examId}`, {
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
      ["Subject", "Students", "Pass %", "Fail %", "Average", "Highest", "Lowest", "Passed", "Failed"],
      ...(report.subjectMetrics || []).map(s => [
        s.subjectName, s.totalStudents, s.passPercentage.toFixed(1) + "%",
        s.failPercentage.toFixed(1) + "%", s.averageMarks.toFixed(2),
        s.highestMarks, s.lowestMarks, s.studentsPassed, s.studentsFailed,
      ]),
    ];
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `subject-performance-${report.examName}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const examOptions = exams.reduce<Array<{ id: string; label: string }>>((acc, e) => {
    const label = `${e.name} — Class ${e.class}${e.section ? ` (${e.section})` : ""}`;
    if (!acc.find(x => x.id === e.id)) acc.push({ id: e.id, label });
    return acc;
  }, []);

  const sortedSubjects = [...(report?.subjectMetrics ?? [])].sort((a, b) => b.averageMarks - a.averageMarks);
  const bestSubject = sortedSubjects[0];
  const worstSubject = sortedSubjects[sortedSubjects.length - 1];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Subject Performance</h1>
              <p className="text-gray-500">Subject-wise averages, pass rates and topper scores</p>
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
              <p className="text-gray-500 text-sm">Loading subject data…</p>
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
            {/* Highlight cards */}
            {sortedSubjects.length > 1 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="border-green-200 bg-green-50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2 text-green-700">
                      <TrendingUp className="h-4 w-4" /> Top Performing Subject
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl font-bold text-green-800">{bestSubject?.subjectName}</div>
                    <div className="text-sm text-green-600 mt-1">
                      Avg: {bestSubject?.averageMarks.toFixed(1)} · Pass: {bestSubject?.passPercentage.toFixed(1)}%
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-red-200 bg-red-50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2 text-red-700">
                      <TrendingDown className="h-4 w-4" /> Needs Attention
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl font-bold text-red-800">{worstSubject?.subjectName}</div>
                    <div className="text-sm text-red-600 mt-1">
                      Avg: {worstSubject?.averageMarks.toFixed(1)} · Pass: {worstSubject?.passPercentage.toFixed(1)}%
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Main table */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><BookOpen className="h-5 w-5" /> {report.examName} — Subject Analysis</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        {["Subject", "Students", "Pass %", "Avg Marks", "Highest", "Lowest", "Passed", "Failed"].map(h => (
                          <th key={h} className="px-4 py-3 text-left font-semibold text-gray-600">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sortedSubjects.length === 0 ? (
                        <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">No subject data available for this exam</td></tr>
                      ) : sortedSubjects.map(s => (
                        <tr key={s.subjectName} className="border-b hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium">{s.subjectName}</td>
                          <td className="px-4 py-3 text-gray-600">{s.totalStudents}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <Badge className={s.passPercentage >= 70 ? "bg-green-100 text-green-700" : s.passPercentage >= 50 ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"}>
                                {s.passPercentage.toFixed(1)}%
                              </Badge>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${s.totalMarks > 0 ? (s.averageMarks / s.totalMarks) * 100 : 0}%` }} />
                              </div>
                              <span className="font-mono">{s.averageMarks.toFixed(1)}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 font-semibold text-green-700">{s.highestMarks}</td>
                          <td className="px-4 py-3 text-red-600">{s.lowestMarks}</td>
                          <td className="px-4 py-3 text-green-600 font-medium">{s.studentsPassed}</td>
                          <td className="px-4 py-3 text-red-600">{s.studentsFailed}</td>
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
