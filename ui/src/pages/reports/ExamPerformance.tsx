import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, RefreshCw, Download } from "lucide-react";
import { useNavigate } from "react-router-dom";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5092';

export default function ExamPerformance() {
  const navigate = useNavigate();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedExamId, setSelectedExamId] = useState<string>("");

  useEffect(() => {
    if (selectedExamId) {
      fetchReport();
    }
  }, [selectedExamId]);

  const fetchReport = async () => {
    try {
      setLoading(true);
      setError(null);

      let token: string | null = null;
      try {
        const raw = sessionStorage.getItem('auth_session');
        if (raw) token = JSON.parse(raw)?.token ?? null;
      } catch { }
      if (!token) token = localStorage.getItem('authToken');

      const response = await fetch(
        `${API_BASE_URL}/api/ExaminationReports/exam-performance/${selectedExamId}`,
        { headers: { "Authorization": `Bearer ${token}` } }
      );

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
              <h1 className="text-3xl font-bold text-gray-900">Exam Performance Report</h1>
              <p className="text-gray-500">Detailed exam-wise performance analysis</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={fetchReport} disabled={!selectedExamId || loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Download
            </Button>
          </div>
        </div>

        {/* Select Exam */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Select Exam</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-gray-500">
              Select an exam from the examinations page to view performance details
            </div>
          </CardContent>
        </Card>

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
            </CardContent>
          </Card>
        )}

        {/* Report Content */}
        {!loading && !error && report && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">Report data will be displayed here</p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
