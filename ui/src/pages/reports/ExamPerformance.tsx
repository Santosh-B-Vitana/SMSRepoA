import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, RefreshCw, Download, Activity } from "lucide-react";
import { useNavigate } from "react-router-dom";
import examinationApi, { ExamBasic } from "@/services/api/examinationApi";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5092';

interface ExamPerformanceReport {
  examName: string;
  examCode: string;
  examDate: string;
  totalMarks: number;
  passMarks: number;
  averageMarks: number;
  passPercentage: number;
}

function getAuthToken(): string | null {
  try {
    const raw = sessionStorage.getItem('auth_session');
    if (raw) return JSON.parse(raw)?.token ?? null;
  } catch { }
  return localStorage.getItem('authToken');
}

export default function ExamPerformance() {
  const navigate = useNavigate();
  const [exams, setExams] = useState<ExamBasic[]>([]);
  const [loadingExams, setLoadingExams] = useState(true);
  const [report, setReport] = useState<ExamPerformanceReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedExamId, setSelectedExamId] = useState<string>("");

  useEffect(() => {
    examinationApi.getExams({}, 1, 500)
      .then(res => setExams(res.items || []))
      .catch(() => setExams([]))
      .finally(() => setLoadingExams(false));
  }, []);

  useEffect(() => {
    if (selectedExamId) fetchReport();
  }, [selectedExamId]);

  const fetchReport = async () => {
    try {
      setLoading(true); setError(null);
      const response = await fetch(
        `${API_BASE_URL}/api/ExaminationReports/exam-performance/${selectedExamId}`,
        { headers: { "Authorization": `Bearer ${getAuthToken()}` } }
      );
      if (!response.ok) throw new Error("Failed to fetch report");
      const data = await response.json();
      if (data.success && data.data?.data) setReport(data.data.data);
      else throw new Error(data.message || "Failed to load report");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const examOptions = exams.reduce<Array<{ id: string; label: string }>>((acc, e) => {
    const label = `${e.name} — Class ${e.class}${e.section ? ` (${e.section})` : ''}`;
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
              <h1 className="text-3xl font-bold text-gray-900">Exam Performance Report</h1>
              <p className="text-gray-500">Detailed exam-wise performance analysis</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={fetchReport} disabled={!selectedExamId || loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button variant="outline" className="gap-2" disabled={!report}>
              <Download className="h-4 w-4" /> Download
            </Button>
          </div>
        </div>

        {/* Select Exam */}
        <Card>
          <CardHeader><CardTitle>Select Exam</CardTitle></CardHeader>
          <CardContent>
            {loadingExams ? <p className="text-gray-500 text-sm">Loading exams…</p> : (
              <Select value={selectedExamId} onValueChange={setSelectedExamId}>
                <SelectTrigger className="w-full max-w-xl">
                  <SelectValue placeholder="Choose an exam to view performance details" />
                </SelectTrigger>
                <SelectContent>
                  {examOptions.map(e => (
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
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-3"></div>
              <p className="text-gray-500 text-sm">Loading report…</p>
            </div>
          </div>
        )}

        {error && !loading && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <p className="text-red-600 text-sm">{error}</p>
              <Button onClick={fetchReport} variant="outline" size="sm" className="mt-3">Try Again</Button>
            </CardContent>
          </Card>
        )}

        {!loading && !error && report && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Pass Percentage", value: `${report.passPercentage.toFixed(1)}%`, color: "text-green-600" },
                { label: "Average Marks", value: report.averageMarks.toFixed(1), color: "text-blue-600" },
                { label: "Total Marks", value: report.totalMarks, color: "text-purple-600" },
                { label: "Pass Marks", value: report.passMarks, color: "text-orange-600" },
              ].map(s => (
                <Card key={s.label}>
                  <CardHeader className="pb-2"><CardTitle className="text-sm text-gray-500 font-medium">{s.label}</CardTitle></CardHeader>
                  <CardContent><div className={`text-3xl font-bold ${s.color}`}>{s.value}</div></CardContent>
                </Card>
              ))}
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5" /> {report.examName}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Pass Rate</span>
                    <Badge className={report.passPercentage >= 70 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}>
                      {report.passPercentage.toFixed(1)}%
                    </Badge>
                  </div>
                  <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${report.passPercentage >= 70 ? "bg-green-500" : report.passPercentage >= 50 ? "bg-yellow-400" : "bg-red-400"}`}
                      style={{ width: `${report.passPercentage}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-2">
                    Average: {report.averageMarks.toFixed(1)} / {report.totalMarks} · Pass mark: {report.passMarks}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}