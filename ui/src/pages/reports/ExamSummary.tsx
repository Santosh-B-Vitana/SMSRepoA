import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, RefreshCw, Download } from "lucide-react";
import { useNavigate } from "react-router-dom";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5092';

interface ExamSummary {
  examId: string;
  examName: string;
  examCode: string;
  examDate: string;
  totalQuestions: number;
  passPercentage: number;
  failPercentage: number;
  averageMarks: number;
  highestMarks: number;
  lowestMarks: number;
  totalStudents: number;
}

interface ResultSummaryReport {
  generatedAt: string;
  examSummaries: ExamSummary[];
  overallPassPercentage: number;
  overallAverageMarks: number;
  totalStudentsAppeared: number;
  totalStudentsPassed: number;
  totalStudentsFailed: number;
  gradeAPercentage: number;
  gradeBPercentage: number;
  gradeCPercentage: number;
  gradeDPercentage: number;
  gradeEPercentage: number;
}

export default function ExamSummary() {
  const navigate = useNavigate();
  const [report, setReport] = useState<ResultSummaryReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchReport();
  }, []);

  const fetchReport = async () => {
    try {
      setLoading(true);
      setError(null);

      // Use same token retrieval as apiClient.ts
      let token: string | null = null;
      try {
        const raw = sessionStorage.getItem('auth_session');
        if (raw) token = JSON.parse(raw)?.token ?? null;
      } catch { }
      if (!token) token = localStorage.getItem('authToken');

      const response = await fetch(`${API_BASE_URL}/api/ExaminationReports/result-summary`, {
        headers: { "Authorization": `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch report");
      }

      const data = await response.json();
      if (data.success && data.data) {
        setReport(data.data);
      } else {
        throw new Error(data.message || "Failed to load report");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Result Summary Report</h1>
              <p className="text-gray-500">Overall performance metrics across all exams</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={fetchReport} disabled={loading}>
              <RefreshCw className={`h-5 w-5 ${loading ? "animate-spin" : ""}`} />
            </Button>
            <Button variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Download
            </Button>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
              <p className="text-gray-600">Loading report...</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <p className="text-red-600">{error}</p>
              <Button onClick={fetchReport} variant="outline" className="mt-4">
                Try Again
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Report Content */}
        {!loading && !error && report && (
          <div className="space-y-6">
            {/* Overall Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600">Overall Pass Percentage</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-600">
                    {report.overallPassPercentage.toFixed(2)}%
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600">Average Marks</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-600">
                    {report.overallAverageMarks.toFixed(2)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600">Total Students</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-purple-600">
                    {report.totalStudentsAppeared}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Pass/Fail Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Students Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Passed:</span>
                      <span className="font-semibold text-green-600">{report.totalStudentsPassed}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Failed:</span>
                      <span className="font-semibold text-red-600">{report.totalStudentsFailed}</span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full mt-4 overflow-hidden">
                      <div
                        className="h-full bg-green-600"
                        style={{
                          width: `${
                            report.totalStudentsAppeared > 0
                              ? (report.totalStudentsPassed / report.totalStudentsAppeared) * 100
                              : 0
                          }%`,
                        }}
                      ></div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Grade Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Grade A (90-100):</span>
                      <span className="font-semibold">{report.gradeAPercentage.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Grade B (80-89):</span>
                      <span className="font-semibold">{report.gradeBPercentage.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Grade C (70-79):</span>
                      <span className="font-semibold">{report.gradeCPercentage.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Grade D (60-69):</span>
                      <span className="font-semibold">{report.gradeDPercentage.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Grade E (Below 60):</span>
                      <span className="font-semibold">{report.gradeEPercentage.toFixed(1)}%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Exam Summaries Table */}
            {report.examSummaries.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Exam-wise Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-100 border-b">
                        <tr>
                          <th className="px-4 py-2 text-left">Exam Name</th>
                          <th className="px-4 py-2 text-right">Students</th>
                          <th className="px-4 py-2 text-right">Pass %</th>
                          <th className="px-4 py-2 text-right">Average</th>
                          <th className="px-4 py-2 text-right">Highest</th>
                          <th className="px-4 py-2 text-right">Lowest</th>
                        </tr>
                      </thead>
                      <tbody>
                        {report.examSummaries.map((exam, idx) => (
                          <tr key={idx} className="border-b hover:bg-gray-50">
                            <td className="px-4 py-2">{exam.examName}</td>
                            <td className="px-4 py-2 text-right">{exam.totalStudents}</td>
                            <td className="px-4 py-2 text-right">
                              <span className={exam.passPercentage >= 70 ? "text-green-600" : "text-red-600"}>
                                {exam.passPercentage.toFixed(1)}%
                              </span>
                            </td>
                            <td className="px-4 py-2 text-right">{exam.averageMarks.toFixed(2)}</td>
                            <td className="px-4 py-2 text-right font-semibold">{exam.highestMarks.toFixed(0)}</td>
                            <td className="px-4 py-2 text-right">{exam.lowestMarks.toFixed(0)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* No Data Message */}
            {report.examSummaries.length === 0 && (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-center text-gray-500">No exam data available</p>
                </CardContent>
              </Card>
            )}

            {/* Generated At */}
            <div className="text-center text-sm text-gray-500">
              Report generated at {new Date(report.generatedAt).toLocaleString()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
