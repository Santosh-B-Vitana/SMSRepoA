import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, RefreshCw, Download, School, Trophy } from "lucide-react";
import { useNavigate } from "react-router-dom";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5092";

interface ClassMetric {
  classId: string;
  className: string;
  totalStudents: number;
  passedStudents: number;
  failedStudents: number;
  classAverage: number;
  passPercentage: number;
  failPercentage: number;
  highestMarks: number;
  lowestMarks: number;
  performerName: string;
  performerMarks: number;
}

interface ClassAnalysisReport {
  academicYear: string;
  reportGeneratedDate: string;
  classMetrics: ClassMetric[];
}

function getAuthToken(): string | null {
  try {
    const raw = sessionStorage.getItem("auth_session");
    if (raw) return JSON.parse(raw)?.token ?? null;
  } catch { }
  return localStorage.getItem("authToken");
}

export default function ClassAnalysis() {
  const navigate = useNavigate();
  const [report, setReport] = useState<ClassAnalysisReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReport = useCallback(async () => {
    setLoading(true); setError(null); setReport(null);
    try {
      const res = await fetch(`${API_BASE}/api/ExaminationReports/class-analysis`, {
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
  }, []);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  const downloadCSV = () => {
    if (!report) return;
    const rows = [
      ["Class", "Total Students", "Passed", "Failed", "Pass %", "Average", "Highest", "Lowest", "Top Student", "Topper Score"],
      ...(report.classMetrics || []).map(c => [
        c.className, c.totalStudents, c.passedStudents, c.failedStudents,
        c.passPercentage.toFixed(1) + "%", c.classAverage.toFixed(2),
        c.highestMarks, c.lowestMarks, c.performerName, c.performerMarks,
      ]),
    ];
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "class-analysis.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const sortedClasses = [...(report?.classMetrics ?? [])].sort((a, b) => b.classAverage - a.classAverage);
  const overallAvg = sortedClasses.length > 0 ? sortedClasses.reduce((s, c) => s + c.classAverage, 0) / sortedClasses.length : 0;
  const totalStudents = sortedClasses.reduce((s, c) => s + c.totalStudents, 0);
  const totalPassed = sortedClasses.reduce((s, c) => s + c.passedStudents, 0);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Class Analysis</h1>
              <p className="text-gray-500">Comparative class-wise performance across all exams</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={fetchReport} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
            <Button variant="outline" className="gap-2" onClick={downloadCSV} disabled={!report}>
              <Download className="h-4 w-4" /> CSV
            </Button>
          </div>
        </div>

        {loading && (
          <div className="flex justify-center items-center h-48">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-3" />
              <p className="text-gray-500 text-sm">Loading class analysis…</p>
            </div>
          </div>
        )}

        {error && !loading && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <p className="text-red-600 text-sm">{error}</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={fetchReport}>Retry</Button>
            </CardContent>
          </Card>
        )}

        {report && !loading && (
          <>
            {/* Summary KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Total Classes", value: sortedClasses.length, color: "text-blue-600" },
                { label: "Total Students", value: totalStudents, color: "text-purple-600" },
                { label: "Overall Avg", value: overallAvg.toFixed(1), color: "text-orange-600" },
                { label: "Overall Pass Rate", value: totalStudents > 0 ? `${((totalPassed / totalStudents) * 100).toFixed(1)}%` : "—", color: "text-green-600" },
              ].map(s => (
                <Card key={s.label}>
                  <CardHeader className="pb-2"><CardTitle className="text-sm text-gray-500 font-medium">{s.label}</CardTitle></CardHeader>
                  <CardContent><div className={`text-3xl font-bold ${s.color}`}>{s.value}</div></CardContent>
                </Card>
              ))}
            </div>

            {/* Visual class comparison bar */}
            {sortedClasses.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><School className="h-5 w-5" /> Class Average Comparison</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {sortedClasses.map((c, i) => {
                    const maxAvg = sortedClasses[0].classAverage;
                    const pct = maxAvg > 0 ? (c.classAverage / maxAvg) * 100 : 0;
                    return (
                      <div key={c.classId || c.className} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium flex items-center gap-1">
                            {i === 0 && <Trophy className="h-3.5 w-3.5 text-yellow-500" />}
                            Class {c.className}
                          </span>
                          <span className="text-gray-500">Avg: <span className="font-semibold text-gray-800">{c.classAverage.toFixed(1)}</span></span>
                        </div>
                        <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${i === 0 ? "bg-blue-500" : pct >= 75 ? "bg-blue-400" : pct >= 50 ? "bg-yellow-400" : "bg-orange-400"}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            )}

            {/* Detailed table */}
            <Card>
              <CardHeader><CardTitle>Detailed Class Report</CardTitle></CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        {["Rank", "Class", "Students", "Passed", "Failed", "Pass %", "Avg Marks", "Highest", "Top Performer"].map(h => (
                          <th key={h} className="px-4 py-3 text-left font-semibold text-gray-600">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sortedClasses.length === 0 ? (
                        <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-400">No class data available</td></tr>
                      ) : sortedClasses.map((c, i) => (
                        <tr key={c.classId || c.className} className="border-b hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3">
                            {i === 0 ? <span className="text-yellow-500 font-bold">#1 🥇</span> :
                             i === 1 ? <span className="text-gray-400 font-semibold">#2</span> :
                             i === 2 ? <span className="text-amber-600 font-semibold">#3</span> :
                             <span className="text-gray-400">#{i + 1}</span>}
                          </td>
                          <td className="px-4 py-3 font-medium">Class {c.className}</td>
                          <td className="px-4 py-3 text-gray-600">{c.totalStudents}</td>
                          <td className="px-4 py-3 text-green-600 font-medium">{c.passedStudents}</td>
                          <td className="px-4 py-3 text-red-500">{c.failedStudents}</td>
                          <td className="px-4 py-3">
                            <Badge className={c.passPercentage >= 75 ? "bg-green-100 text-green-700" : c.passPercentage >= 50 ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"}>
                              {c.passPercentage.toFixed(1)}%
                            </Badge>
                          </td>
                          <td className="px-4 py-3 font-mono">{c.classAverage.toFixed(1)}</td>
                          <td className="px-4 py-3 font-semibold text-blue-700">{c.highestMarks}</td>
                          <td className="px-4 py-3 text-xs text-gray-600">
                            {c.performerName !== "N/A" ? (
                              <span>{c.performerName} <span className="text-green-600 font-semibold">({c.performerMarks})</span></span>
                            ) : "—"}
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
