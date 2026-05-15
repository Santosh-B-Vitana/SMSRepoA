import { useState, useEffect } from "react";
import { Search, Filter, Eye, UserX, Users, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { staffApi, StaffBasic as Staff } from "@/services/api/staffApi";
import { StaffLeaveDialog } from "./StaffLeaveDialog";
import { StaffDeactivateDialog } from "./StaffDeactivateDialog";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import placeholderImg from '/placeholder.svg';

export function StaffList({ staff, refreshStaff }: { staff: Staff[]; refreshStaff: () => void }) {
  const [view, setView] = useState<"active" | "inactive">("active");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDept, setSelectedDept] = useState("all");
  const [filteredStaff, setFilteredStaff] = useState<Staff[]>([]);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<Staff | null>(null);

  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin" || user?.role === "super_admin";

  const activeStaff = staff.filter((s) => s.status === "active");
  const inactiveStaff = staff.filter((s) => s.status !== "active");
  const sourceStaff = view === "active" ? activeStaff : inactiveStaff;

  useEffect(() => {
    let filtered = sourceStaff;
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          (s.name ?? "").toLowerCase().includes(lower) ||
          (s.email ?? "").toLowerCase().includes(lower) ||
          (s.employeeId ?? "").toLowerCase().includes(lower) ||
          (s.designation ?? "").toLowerCase().includes(lower)
      );
    }
    if (selectedDept !== "all") {
      filtered = filtered.filter((s) => s.department === selectedDept);
    }
    setFilteredStaff(filtered);
  }, [staff, view, searchTerm, selectedDept]);

  const switchView = (v: "active" | "inactive") => {
    setView(v);
    setSearchTerm("");
    setSelectedDept("all");
  };

  const departments = [...new Set(sourceStaff.map((s) => s.department).filter(Boolean))].sort();

  const handleToggleStatus = async (member: Staff) => {
    if (member.status === "active") {
      // Open the full deactivation dialog
      setDeactivateTarget(member);
      return;
    }

    // Reactivate — simple confirmation + API call
    if (!confirm(`Reactivate ${member.name}? This will restore their login access.`)) return;
    setTogglingId(member.id);
    try {
      await staffApi.reactivate(member.id);
      await refreshStaff();
      toast.success("Staff Reactivated", {
        description: `${member.name} has been reactivated and can now log in.`,
      });
    } catch {
      toast.error("Error", { description: "Failed to reactivate staff member." });
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div className="space-y-4 p-4 sm:p-6">
      {/* Tab bubble filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => switchView("active")}
          className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium transition-colors border ${
            view === "active"
              ? "bg-primary text-primary-foreground border-primary shadow-sm"
              : "bg-background border-border text-muted-foreground hover:bg-muted"
          }`}
        >
          <Users className="h-3.5 w-3.5" />
          Active Staff
          <span className={`ml-1 px-1.5 py-0.5 rounded-full text-xs font-semibold ${
            view === "active" ? "bg-white/20 text-primary-foreground" : "bg-muted text-muted-foreground"
          }`}>{activeStaff.length}</span>
        </button>

        {inactiveStaff.length > 0 && (
          <button
            onClick={() => switchView("inactive")}
            className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium transition-colors border ${
              view === "inactive"
                ? "bg-orange-500 text-white border-orange-500 shadow-sm"
                : "bg-background border-orange-200 text-orange-600 hover:bg-orange-50"
            }`}
          >
            <UserX className="h-3.5 w-3.5" />
            Inactive Staff
            <span className={`ml-1 px-1.5 py-0.5 rounded-full text-xs font-semibold ${
              view === "inactive" ? "bg-white/20 text-white" : "bg-orange-100 text-orange-600"
            }`}>{inactiveStaff.length}</span>
          </button>
        )}
      </div>

      {/* Search & Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="relative sm:col-span-2">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, employee ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={selectedDept} onValueChange={setSelectedDept}>
          <SelectTrigger>
            <SelectValue placeholder="All Departments" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {departments.map((dept) => (
              <SelectItem key={dept} value={dept}>{dept}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          onClick={() => { setSearchTerm(""); setSelectedDept("all"); }}
          className="w-full"
        >
          <Filter className="h-4 w-4 mr-2" />
          Clear Filters
        </Button>
      </div>

      {/* Results summary */}
      <div className="text-sm text-muted-foreground">
        Showing {filteredStaff.length} of {sourceStaff.length}{" "}
        {view === "active" ? "active" : "inactive"} staff members
      </div>

      {/* Table */}
      <Card className="border-border">
        <CardContent className="p-0">
          {filteredStaff.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border">
                    <TableHead className="font-semibold">Name</TableHead>
                    <TableHead className="font-semibold hidden sm:table-cell">Designation</TableHead>
                    <TableHead className="font-semibold hidden md:table-cell">Department</TableHead>
                    <TableHead className="font-semibold hidden lg:table-cell">Employee ID</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStaff.map((member) => (
                    <TableRow
                      key={member.id}
                      className={`border-border hover:bg-muted/50 transition-colors ${view === "inactive" ? "opacity-80" : ""}`}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <span className="inline-block w-9 h-9 rounded-full overflow-hidden bg-gray-200 border border-gray-300 flex-shrink-0">
                            {member.profilePhoto ? (
                              <img src={member.profilePhoto} alt={member.name} className="w-full h-full object-cover" />
                            ) : (
                              <img src={placeholderImg} alt="No photo" className="w-full h-full object-cover opacity-60" />
                            )}
                          </span>
                          <div className="space-y-0.5">
                            <div className={`font-medium text-sm ${view === "inactive" ? "text-muted-foreground" : ""}`}>
                              {member.name}
                            </div>
                            <div className="text-xs text-muted-foreground">{member.email}</div>
                            <div className="text-xs text-muted-foreground sm:hidden">
                              {member.designation} · {member.department}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-sm">{member.designation}</TableCell>
                      <TableCell className="hidden md:table-cell text-sm">{member.department}</TableCell>
                      <TableCell className="hidden lg:table-cell text-sm font-mono text-xs">{member.employeeId || "-"}</TableCell>
                      <TableCell>
                        <Badge
                          variant={member.status === "active" ? "default" : "secondary"}
                          className={`text-xs capitalize ${view === "inactive" ? "border-orange-200 text-orange-700 bg-orange-50" : ""}`}
                        >
                          {member.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/staff/${member.id}`)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            {t("common.manage")}
                          </Button>
                          {isAdmin && (
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={togglingId === member.id}
                              onClick={() => handleToggleStatus(member)}
                              className={view === "inactive"
                                ? "text-green-600 border-green-200 hover:bg-green-50"
                                : "text-orange-600 border-orange-200 hover:bg-orange-50"}
                            >
                              {togglingId === member.id ? (
                                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                              ) : view === "inactive" ? (
                                <><UserCheck className="h-4 w-4 mr-1" />Reactivate</>
                              ) : (
                                <><UserX className="h-4 w-4 mr-1" />Deactivate</>
                              )}
                            </Button>
                          )}
                          {view === "active" && (
                            <StaffLeaveDialog
                              staffId={member.id}
                              staffName={member.name}
                              staffEmail={member.email}
                              staffDesignation={member.designation}
                              adminView={isAdmin}
                            />
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12">
              {view === "inactive" ? (
                <UserX className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              ) : (
                <Users className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              )}
              <p className="text-sm font-medium text-muted-foreground">
                {view === "inactive" ? "No inactive staff members" : "No staff members found"}
              </p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                {searchTerm || selectedDept !== "all" ? "Try adjusting your filters" : ""}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Deactivation dialog — shown when an active staff's Deactivate button is clicked */}
      <StaffDeactivateDialog
        staff={deactivateTarget}
        onClose={() => setDeactivateTarget(null)}
        onSuccess={refreshStaff}
      />
    </div>
  );
}
