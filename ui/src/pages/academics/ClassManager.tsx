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
import { Plus, Edit, Trash2, GraduationCap, Settings, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { boardApi, BoardConfigurationResponse } from "@/services/api/boardApi";

interface GroupedClass {
  standard: string;
  sections: number;
  totalStudents: number;
  classIds: string[];
  boardName?: string;
}

export default function ClassManager() {
  const navigate = useNavigate();
  const [classes, setClasses] = useState<ClassResponse[]>([]);
  const [groupedClasses, setGroupedClasses] = useState<GroupedClass[]>([]);
  const [boards, setBoards] = useState<BoardConfigurationResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [boardsLoading, setBoardsLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassResponse | null>(null);
  const [formData, setFormData] = useState({
    standard: "",
    section: "",
    academicYear: "2025-2026",
    boardConfigurationId: ""
  });

  const fetchClasses = useCallback(async () => {
    try {
      setLoading(true);
      const response = await academicApi.listClasses(1, 100);
      setClasses(response.classes || []);
    } catch (error) {
      toast.error("Failed to load classes");
      setClasses([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchBoards = useCallback(async () => {
    try {
      setBoardsLoading(true);
      const response = await boardApi.getAllBoards();
      setBoards(response.boards || []);
    } catch (error) {
      console.error("Failed to load boards:", error);
      setBoards([]);
    } finally {
      setBoardsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClasses();
    fetchBoards();
  }, [fetchClasses, fetchBoards]);

  useEffect(() => {
    const grouped: { [key: string]: GroupedClass } = {};
    classes.forEach((cls) => {
      if (!grouped[cls.standard]) {
        grouped[cls.standard] = {
          standard: cls.standard,
          sections: 0,
          totalStudents: 0,
          classIds: [],
          boardName: cls.boardName
        };
      }
      grouped[cls.standard].sections += 1;
      grouped[cls.standard].totalStudents += cls.totalStudents || 0;
      grouped[cls.standard].classIds.push(cls.id);
      if (cls.boardName) {
        grouped[cls.standard].boardName = cls.boardName;
      }
    });
    setGroupedClasses(Object.values(grouped).sort((a, b) => {
      const aNum = parseInt(a.standard.replace(/\D/g, "")) || 0;
      const bNum = parseInt(b.standard.replace(/\D/g, "")) || 0;
      return aNum - bNum;
    }));
  }, [classes]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.standard || !formData.section) {
      toast.error("Please fill in all required fields");
      return;
    }
    try {
      const boardId = formData.boardConfigurationId === "__school_default__" ? undefined : formData.boardConfigurationId;
      if (editingClass) {
        await academicApi.updateClass(editingClass.id, {
          standard: formData.standard,
          section: formData.section,
          academicYear: formData.academicYear,
          boardConfigurationId: boardId
        });
        toast.success("Class updated successfully");
      } else {
        await academicApi.createClass({
          standard: formData.standard,
          section: formData.section,
          academicYear: formData.academicYear,
          boardConfigurationId: boardId
        });
        toast.success("Class created successfully");
      }
      setDialogOpen(false);
      setEditingClass(null);
      setFormData({ standard: "", section: "", academicYear: "2025-2026", boardConfigurationId: "__school_default__" });
      await fetchClasses();
    } catch (error: any) {
      toast.error(error?.message || "Failed to save class");
    }
  };

  const handleEdit = (cls: ClassResponse) => {
    setEditingClass(cls);
    setFormData({
      standard: cls.standard,
      section: cls.section,
      academicYear: cls.academicYear,
      boardConfigurationId: cls.boardConfigurationId || "__school_default__"
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
        toast.error(error?.message || "Failed to delete class");
      }
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            Class Management
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Create and manage classes for your school
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={() => {
                setEditingClass(null);
                setFormData({ standard: "", section: "", academicYear: "2025-2026", boardConfigurationId: "" });
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Class
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingClass ? "Edit Class" : "Add New Class"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="standard">Standard *</Label>
                <Input
                  id="standard"
                  placeholder="e.g., Class 10"
                  value={formData.standard}
                  onChange={(e) => setFormData((prev) => ({ ...prev, standard: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="section">Section *</Label>
                <Input
                  id="section"
                  placeholder="e.g., A"
                  value={formData.section}
                  onChange={(e) => setFormData((prev) => ({ ...prev, section: e.target.value.toUpperCase() }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="academicYear">Academic Year *</Label>
                <Select value={formData.academicYear} onValueChange={(value) => setFormData((prev) => ({ ...prev, academicYear: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select academic year" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2024-2025">2024-2025</SelectItem>
                    <SelectItem value="2025-2026">2025-2026</SelectItem>
                    <SelectItem value="2026-2027">2026-2027</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="board">Board (Optional Override)</Label>
                <p className="text-xs text-muted-foreground mb-2">Leave blank to use school's default board</p>
                <Select value={formData.boardConfigurationId} onValueChange={(value) => setFormData((prev) => ({ ...prev, boardConfigurationId: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a board (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__school_default__">Use School Default</SelectItem>
                    {boards.map((board) => (
                      <SelectItem key={board.id} value={board.id}>
                        {board.name} ({board.code})
                      </SelectItem>
                    ))}
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
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Class Name</TableHead>
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
                    No classes created yet. Click "Add Class" to get started.
                  </TableCell>
                </TableRow>
              ) : (
                groupedClasses.map((group) => (
                  <TableRow key={group.standard}>
                    <TableCell className="font-medium">{group.standard}</TableCell>
                    <TableCell className="text-sm">{group.boardName || "School Default"}</TableCell>
                    <TableCell>{group.sections} {group.sections === 1 ? "section" : "sections"}</TableCell>
                    <TableCell>{group.totalStudents}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            const firstClassId = group.classIds[0];
                            navigate(`/academics/classes/${firstClassId}`);
                          }}
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
