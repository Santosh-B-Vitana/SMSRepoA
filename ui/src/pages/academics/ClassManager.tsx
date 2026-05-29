import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { academicApi, ClassResponse } from "@/services/api/academicApi";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, GraduationCap, Settings, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { boardApi, SchoolBoardConfigResponse } from "@/services/api/boardApi";
import { useAcademicYear } from "@/contexts/AcademicYearContext";
import { useAuth } from "@/contexts/AuthContext";

interface GroupedClass {
  key: string; // standard + boardConfigurationId
  standard: string;
  boardConfigurationId?: string;
  boardName?: string;
  isDefaultBoard?: boolean;
  sections: number;
  totalStudents: number;
  classIds: string[];
}

export default function ClassManager() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { academicYear: globalYear, availableYears } = useAcademicYear();
  const [classes, setClasses] = useState<ClassResponse[]>([]);
  const [groupedClasses, setGroupedClasses] = useState<GroupedClass[]>([]);
  const [schoolBoards, setSchoolBoards] = useState<SchoolBoardConfigResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [boardsLoading, setBoardsLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassResponse | null>(null);
  const [formData, setFormData] = useState({
    standard: "",
    numberOfSections: 1,
    academicYear: globalYear || "2025-2026",
    boardConfigurationId: ""
  });

  useEffect(() => {
    if (globalYear && !editingClass) {
      setFormData(prev => ({ ...prev, academicYear: globalYear }));
    }
  }, [globalYear, editingClass]);

  const fetchClasses = useCallback(async () => {
    try {
      setLoading(true);
      const response = await academicApi.listClasses(1, 100);
      setClasses(response.classes || []);
    } catch {
      toast.error("Failed to load classes");
      setClasses([]);
    } finally {
      setLoading(false);
    }
  }, [globalYear]);

  const fetchSchoolBoards = useCallback(async () => {
    try {
      setBoardsLoading(true);
      const response = await boardApi.getSchoolBoards();
      setSchoolBoards(response.boards || []);
      // Pre-select default board when no board is selected
      const defaultBoard = response.boards?.find(b => b.isDefault);
      if (defaultBoard) {
        setFormData(prev => prev.boardConfigurationId ? prev : { ...prev, boardConfigurationId: defaultBoard.boardConfigurationId });
      }
    } catch (error: any) {
      console.error("Failed to fetch school boards:", error);
      toast.error(error?.response?.data?.message || "Failed to load boards");
      setSchoolBoards([]);
    } finally {
      setBoardsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClasses();
    fetchSchoolBoards();
  }, [fetchClasses, fetchSchoolBoards]);

  useEffect(() => {
    const grouped: { [key: string]: GroupedClass } = {};
    classes.forEach((cls) => {
      const key = `${cls.standard}__${cls.boardConfigurationId ?? "none"}`;
      if (!grouped[key]) {
        const boardIsDefault = cls.boardConfigurationId
          ? schoolBoards.some(b => b.boardConfigurationId === cls.boardConfigurationId && b.isDefault)
          : false;
        grouped[key] = {
          key,
          standard: cls.standard,
          boardConfigurationId: cls.boardConfigurationId,
          boardName: cls.boardName,
          isDefaultBoard: boardIsDefault,
          sections: 0,
          totalStudents: 0,
          classIds: [],
        };
      }
      grouped[key].sections += 1;
      grouped[key].totalStudents += cls.totalStudents || 0;
      grouped[key].classIds.push(cls.id);
    });
    setGroupedClasses(Object.values(grouped).sort((a, b) => {
      const aNum = parseInt(a.standard.replace(/\D/g, "")) || 0;
      const bNum = parseInt(b.standard.replace(/\D/g, "")) || 0;
      return aNum !== bNum ? aNum - bNum : (a.boardName ?? "").localeCompare(b.boardName ?? "");
    }));
  }, [classes, schoolBoards]);

  const resetForm = () => {
    const defaultBoard = schoolBoards.find(b => b.isDefault);
    setFormData({
      standard: "",
      numberOfSections: 1,
      academicYear: globalYear || "2025-2026",
      boardConfigurationId: defaultBoard?.boardConfigurationId ?? ""
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.standard) {
      toast.error("Please enter the class standard/name");
      return;
    }
    if (!formData.boardConfigurationId) {
      toast.error("Please select a board");
      return;
    }
    try {
      if (editingClass) {
        await academicApi.updateClass(editingClass.id, {
          schoolId: user?.schoolId,
          standard: formData.standard,
          academicYear: formData.academicYear,
          boardConfigurationId: formData.boardConfigurationId,
          numberOfSections: formData.numberOfSections,
        });
        toast.success("Class updated successfully");
      } else {
        await academicApi.createClass({
          schoolId: user?.schoolId,
          standard: formData.standard,
          academicYear: formData.academicYear,
          boardConfigurationId: formData.boardConfigurationId,
          numberOfSections: formData.numberOfSections,
        });
        toast.success("Class created successfully");
      }
      setDialogOpen(false);
      setEditingClass(null);
      resetForm();
      await fetchClasses();
    } catch (error: any) {
      const msg = error?.response?.data?.message ?? error?.message ?? "Failed to save class";
      toast.error(msg);
    }
  };

  const handleEdit = (cls: ClassResponse) => {
    setEditingClass(cls);
    setFormData({
      standard: cls.standard,
      numberOfSections: 1,
      academicYear: cls.academicYear,
      boardConfigurationId: cls.boardConfigurationId || ""
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this class?")) {
      try {
        await academicApi.deleteClass(id);
        toast.success("Class deleted successfully");
        await fetchClasses();
      } catch (error: any) {
        toast.error(error?.response?.data?.message ?? error?.message ?? "Failed to delete class");
      }
    }
  };

  const noBoardsConfigured = !boardsLoading && schoolBoards.length === 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            Class Management
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Create and manage classes. Configure boards in Settings → Board first.
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button
              disabled={noBoardsConfigured}
              onClick={() => { setEditingClass(null); resetForm(); }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Class
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingClass ? "Edit Class" : "Add New Class"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="standard">Standard / Class Name *</Label>
                <Input
                  id="standard"
                  placeholder="e.g., Class 10"
                  value={formData.standard}
                  onChange={(e) => setFormData((prev) => ({ ...prev, standard: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="board">Board *</Label>
                <Select
                  value={formData.boardConfigurationId}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, boardConfigurationId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={boardsLoading ? "Loading boards..." : "Select a board"} />
                  </SelectTrigger>
                  <SelectContent>
                    {schoolBoards.map((sb) => (
                      <SelectItem key={sb.boardConfigurationId} value={sb.boardConfigurationId}>
                        {sb.boardName} ({sb.boardCode}){sb.isDefault ? " — Default" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="numberOfSections">Number of Sections *</Label>
                <p className="text-xs text-muted-foreground mb-1">
                  Sections A, B, C... will be created automatically
                </p>
                <Input
                  id="numberOfSections"
                  type="number"
                  min={1}
                  max={26}
                  value={formData.numberOfSections}
                  onChange={(e) => setFormData((prev) => ({ ...prev, numberOfSections: Math.max(1, parseInt(e.target.value) || 1) }))}
                />
              </div>
              <div>
                <Label htmlFor="academicYear">Academic Year *</Label>
                <Select
                  value={formData.academicYear}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, academicYear: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select academic year" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableYears.length > 0
                      ? availableYears.map(y => (
                          <SelectItem key={y.id} value={y.name}>{y.name}</SelectItem>
                        ))
                      : (
                          <>
                            <SelectItem value="2024-2025">2024-2025</SelectItem>
                            <SelectItem value="2025-2026">2025-2026</SelectItem>
                            <SelectItem value="2026-2027">2026-2027</SelectItem>
                          </>
                        )
                    }
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="flex-1">
                  {editingClass ? "Update" : "Create"}
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
        {noBoardsConfigured && (
          <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
            <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800">
              No boards have been configured for your school. Go to <strong>Settings → Board</strong> to add boards before creating classes.
            </p>
          </div>
        )}
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Class / Standard</TableHead>
                <TableHead>Board</TableHead>
                <TableHead>Sections</TableHead>
                <TableHead>Students</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groupedClasses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No classes yet. Click "Add Class" to get started.
                  </TableCell>
                </TableRow>
              ) : (
                groupedClasses.map((group) => (
                  <TableRow key={group.key}>
                    <TableCell className="font-medium">{group.standard}</TableCell>
                    <TableCell>
                      {group.boardName ? (
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">{group.boardName}</Badge>
                          {group.isDefaultBoard && <Badge className="text-xs bg-green-100 text-green-800 hover:bg-green-100">School Default</Badge>}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell>{group.sections} {group.sections === 1 ? "section" : "sections"}</TableCell>
                    <TableCell>{group.totalStudents}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => navigate(`/academics/classes/${group.classIds[0]}`)}
                        >
                          <Settings className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEdit(classes.find((c) => c.id === group.classIds[0])!)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(group.classIds[0])}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
