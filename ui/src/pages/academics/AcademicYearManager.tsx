import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Plus, Edit, Trash2, Calendar, Loader2, Star, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { academicApi, AcademicYearResponse } from "@/services/api/academicApi";
import { useAcademicYear } from "@/contexts/AcademicYearContext";

export default function AcademicYearManager() {
  const { refresh: refreshGlobalYear, availableYears: contextYears, setCurrentYear: setContextYear } = useAcademicYear();
  const [academicYears, setAcademicYears] = useState<AcademicYearResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingYear, setEditingYear] = useState<AcademicYearResponse | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    startDate: "",
    endDate: ""
  });

  const fetchAcademicYears = useCallback(async () => {
    try {
      setLoading(true);
      const response = await academicApi.listAcademicYears(1, 100);
      setAcademicYears(response.academicYears || contextYears || []);
    } catch (error) {
      // Avoid noisy page-load toast; use context years as fallback.
      setAcademicYears(contextYears || []);
    } finally {
      setLoading(false);
    }
  }, [contextYears]);

  useEffect(() => {
    fetchAcademicYears();
  }, [fetchAcademicYears]);

  /**
   * Derive display status:
   * - If isCurrent flag is set by admin → "active"
   * - Otherwise use dates: upcoming / completed
   */
  const getYearStatus = (year: AcademicYearResponse) => {
    if (year.isCurrent) return 'active';
    const now = new Date();
    const start = new Date(year.startDate);
    const end = new Date(year.endDate);
    if (now < start) return 'upcoming';
    return 'completed';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.startDate || !formData.endDate) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (new Date(formData.startDate) >= new Date(formData.endDate)) {
      toast.error("Start date must be before end date");
      return;
    }

    try {
      if (editingYear) {
        await academicApi.updateAcademicYear(editingYear.id, {
          name: formData.name,
          startDate: formData.startDate,
          endDate: formData.endDate
        });
        toast.success("Academic year updated successfully");
      } else {
        await academicApi.createAcademicYear({
          name: formData.name,
          startDate: formData.startDate,
          endDate: formData.endDate
        });
        toast.success("Academic year created successfully");
      }
      
      setDialogOpen(false);
      setEditingYear(null);
      setFormData({ name: "", startDate: "", endDate: "" });
      await fetchAcademicYears();
      refreshGlobalYear();
    } catch (error: any) {
      toast.error(error?.message || "Failed to save academic year");
    }
  };

  const handleEdit = (year: AcademicYearResponse) => {
    setEditingYear(year);
    setFormData({
      name: year.name,
      startDate: year.startDate.split('T')[0],
      endDate: year.endDate.split('T')[0]
    });
    setDialogOpen(true);
  };

  const handleSetCurrent = async (year: AcademicYearResponse) => {
    try {
      const updated = await academicApi.setCurrentAcademicYear(year.id);
      toast.success(`"${year.name}" is now the current academic year`);
      await fetchAcademicYears();
      refreshGlobalYear();
      // Also update the nav dropdown selection to the newly set current year
      if (updated) setContextYear(updated);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to set current year';
      toast.error(msg);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this academic year?")) {
      try {
        await academicApi.deleteAcademicYear(id);
        toast.success("Academic year deleted successfully");
        await fetchAcademicYears();
        refreshGlobalYear();
      } catch (error: any) {
        toast.error(error?.message || "Failed to delete academic year");
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':    return 'bg-green-100 text-green-800 border-green-200';
      case 'upcoming':  return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'completed': return 'bg-gray-100 text-gray-700 border-gray-200';
      default:          return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Academic Years
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Manage academic years and their duration
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setEditingYear(null);
              setFormData({ name: "", startDate: "", endDate: "" });
            }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Academic Year
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingYear ? "Edit Academic Year" : "Add New Academic Year"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Academic Year Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g., 2024-2025"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="startDate">Start Date *</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="endDate">End Date *</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                  required
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="flex-1">
                  {editingYear ? "Update" : "Create"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Academic Year</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>End Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {academicYears.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No academic years created yet. Click "Add Academic Year" to get started.
                  </TableCell>
                </TableRow>
              ) : (
                academicYears.map((year) => {
                  const status = getYearStatus(year);
                  return (
                    <TableRow key={year.id} className={year.isCurrent ? 'bg-green-50/50' : ''}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {year.name}
                          {year.isCurrent && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-green-100 text-green-700">
                              <Star className="h-2.5 w-2.5 fill-current" /> Current
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{new Date(year.startDate).toLocaleDateString()}</TableCell>
                      <TableCell>{new Date(year.endDate).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(status)}>
                          {status === 'active' && <CheckCircle className="h-3 w-3 mr-1" />}
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {!year.isCurrent && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs h-7 px-2 text-amber-700 border-amber-300 hover:bg-amber-50"
                              onClick={() => handleSetCurrent(year)}
                            >
                              <Star className="h-3 w-3 mr-1" /> Set Active
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEdit(year)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(year.id)}
                            disabled={year.isCurrent}
                            title={year.isCurrent ? 'Cannot delete the active year' : 'Delete'}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}