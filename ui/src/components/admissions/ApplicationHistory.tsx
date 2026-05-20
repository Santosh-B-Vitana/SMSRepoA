import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle, Circle, Clock, XCircle, AlertCircle, Search, Filter } from "lucide-react";
import { useAdmissions } from "@/hooks/useAdmissions";
import { Loader2 } from "lucide-react";

interface TimelineEvent {
  date: string;
  status: string;
  remarks?: string;
  icon: React.ReactNode;
  color: string;
}

export function ApplicationHistory() {
  const { items, isLoading, error } = useAdmissions({ page: 1, pageSize: 1000 });
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filteredApplications = useMemo(() => {
    return items.filter((app) => {
      const matchesSearch = 
        app.studentName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.applicationNumber?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === "all" || app.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [items, searchTerm, statusFilter]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved":
      case "enrolled":
        return <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />;
      case "rejected":
        return <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />;
      case "interviewed":
        return <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />;
      case "pending":
        return <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />;
      case "waitlisted":
        return <Clock className="h-5 w-5 text-purple-600 dark:text-purple-400" />;
      default:
        return <Circle className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
      case "enrolled":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
      case "rejected":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
      case "interviewed":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
      case "pending":
        return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300";
      case "waitlisted":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
    }
  };

  const parseRemarks = (remarks?: string) => {
    if (!remarks) return null;
    try {
      const data = JSON.parse(remarks);
      if (data.RejectionReason) {
        return `Reason: ${data.RejectionReason}`;
      }
      if (data.Notes) {
        return data.Notes;
      }
      return null;
    } catch {
      return remarks;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Application History</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Application History</CardTitle>
        </CardHeader>
        <CardContent className="text-red-500 py-12 text-center">{error}</CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Application History & Timeline</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pb-4 border-b border-border dark:border-slate-700">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or application #…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-9"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="interviewed">Interviewed</SelectItem>
                <SelectItem value="waitlisted">Waitlisted</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="enrolled">Enrolled</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="text-right text-sm text-muted-foreground">
            Showing {filteredApplications.length} of {items.length} applications
          </div>
        </div>

        {/* Timeline */}
        {filteredApplications.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No applications found matching your criteria.
          </div>
        ) : (
          <div className="space-y-8">
            {filteredApplications.map((app) => (
              <div key={app.id} className="pb-6 border-b border-border dark:border-slate-700 last:border-b-0 last:pb-0">
                {/* Application Header */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-lg text-foreground">{app.studentName}</h3>
                    <p className="text-sm text-muted-foreground">
                      Application #{app.applicationNumber} • Class {app.appliedClass} • {app.academicYear}
                    </p>
                  </div>
                  <Badge className={getStatusColor(app.status)}>
                    {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                  </Badge>
                </div>

                {/* Timeline */}
                <div className="space-y-3 pl-4 border-l-2 border-muted-foreground/30 dark:border-slate-600">
                  {/* Initial Application */}
                  <div className="flex items-start gap-4 -ml-7">
                    <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-foreground">Application Submitted</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(app.applicationDate).toLocaleDateString()} at{" "}
                        {new Date(app.applicationDate).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>

                  {/* Current Status */}
                  <div className="flex items-start gap-4 -ml-7">
                    {getStatusIcon(app.status)}
                    <div className="flex-1">
                      <p className="font-medium text-foreground">
                        {app.status === "interviewed"
                          ? "Interviewed"
                          : app.status === "approved"
                          ? "Approved"
                          : app.status === "enrolled"
                          ? "Enrolled"
                          : app.status === "rejected"
                          ? "Rejected"
                          : app.status === "waitlisted"
                          ? "Waitlisted"
                          : "Pending Review"}
                      </p>
                      {app.processedAt && (
                        <p className="text-sm text-muted-foreground">
                          {new Date(app.processedAt).toLocaleDateString()} at{" "}
                          {new Date(app.processedAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      )}
                      {app.remarks && (
                        <p className="text-sm text-muted-foreground mt-1 italic">
                          {parseRemarks(app.remarks) || app.remarks}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Interview Score if available */}
                  {app.interviewScore && (
                    <div className="flex items-start gap-4 -ml-7">
                      <CheckCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-foreground">Interview Score Recorded</p>
                        <p className="text-sm text-muted-foreground">Score: {app.interviewScore}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
