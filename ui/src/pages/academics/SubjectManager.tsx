import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, BookOpen, Loader2, Search, X, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { academicApi, SubjectResponse } from "@/services/api/academicApi";
import { boardApi, SchoolBoardConfigResponse } from "@/services/api/boardApi";

const SCHOOL_DEFAULT = "__school_default__";
const ALL_FILTER     = "__all__";
const PAGE_SIZE      = 20;

export default function SubjectManager() {
  const [subjects, setSubjects]       = useState<SubjectResponse[]>([]);
  const [total, setTotal]             = useState(0);
  const [page, setPage]               = useState(1);
  const [schoolBoards, setSchoolBoards] = useState<SchoolBoardConfigResponse[]>([]);
  const [loading, setLoading]         = useState(true);
  const [dialogOpen, setDialogOpen]   = useState(false);
  const [editingSubject, setEditingSubject] = useState<SubjectResponse | null>(null);

  // Filter state
  const [searchInput, setSearchInput]   = useState("");
  const [search, setSearch]             = useState("");        // debounced value sent to API
  const [typeFilter, setTypeFilter]     = useState(ALL_FILTER);
  const [boardFilter, setBoardFilter]   = useState(ALL_FILTER);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    code: "",
    description: "",
    type: "Core" as "Core" | "Elective" | "Language" | "Activity",
    boardConfigurationId: SCHOOL_DEFAULT,
  });

  const typeOptions = ["Core", "Elective", "Language", "Activity"] as const;

  const fetchSchoolBoards = useCallback(async () => {
    try {
      const response = await boardApi.getSchoolBoards();
      setSchoolBoards(response.boards || []);
    } catch {
      setSchoolBoards([]);
    }
  }, []);

  const fetchSubjects = useCallback(async (
    p: number, q: string, type: string, board: string
  ) => {
    try {
      setLoading(true);
      const response = await academicApi.listSubjects(
        p,
        PAGE_SIZE,
        q || undefined,
        type !== ALL_FILTER ? type : undefined,
        board !== ALL_FILTER ? board : undefined,
      );
      setSubjects(response.subjects || []);
      setTotal(response.total || 0);
    } catch {
      toast.error("Failed to load subjects");
      setSubjects([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSchoolBoards();
  }, [fetchSchoolBoards]);

  useEffect(() => {
    fetchSubjects(page, search, typeFilter, boardFilter);
  }, [page, search, typeFilter, boardFilter, fetchSubjects]);

  // Debounce search input → reset to page 1
  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      setSearch(value);
    }, 300);
  };

  const handleTypeChange = (value: string) => { setPage(1); setTypeFilter(value); };
  const handleBoardChange = (value: string) => { setPage(1); setBoardFilter(value); };

  const clearFilters = () => {
    setSearchInput(""); setSearch(""); setTypeFilter(ALL_FILTER); setBoardFilter(ALL_FILTER); setPage(1);
  };
  const hasFilters = searchInput || typeFilter !== ALL_FILTER || boardFilter !== ALL_FILTER;

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.code) {
      toast.error("Please fill in required fields");
      return;
    }

    const boardConfigurationId = formData.boardConfigurationId === SCHOOL_DEFAULT
      ? undefined
      : formData.boardConfigurationId;

    try {
      if (editingSubject) {
        await academicApi.updateSubject(editingSubject.id, {
          name: formData.name,
          code: formData.code,
          description: formData.description,
          type: formData.type,
          boardConfigurationId,
        });
        toast.success("Subject updated successfully");
      } else {
        await academicApi.createSubject({
          name: formData.name,
          code: formData.code,
          description: formData.description,
          type: formData.type,
          boardConfigurationId,
        });
        toast.success("Subject created successfully");
      }

      setDialogOpen(false);
      setEditingSubject(null);
      setFormData({ name: "", code: "", description: "", type: "Core", boardConfigurationId: SCHOOL_DEFAULT });
      fetchSubjects(page, search, typeFilter, boardFilter);
    } catch (error: any) {
      toast.error(error?.message || "Failed to save subject");
    }
  };

  const handleEdit = (subject: SubjectResponse) => {
    setEditingSubject(subject);
    setFormData({
      name: subject.name,
      code: subject.code,
      description: subject.description || "",
      type: (subject.type as any) || "Core",
      boardConfigurationId: subject.boardConfigurationId ?? SCHOOL_DEFAULT,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this subject?")) {
      try {
        await academicApi.deleteSubject(id);
        toast.success("Subject deleted successfully");
        // If we just deleted the last item on this page, go back one
        const newTotal = total - 1;
        const newPages = Math.max(1, Math.ceil(newTotal / PAGE_SIZE));
        const targetPage = page > newPages ? newPages : page;
        setPage(targetPage);
        fetchSubjects(targetPage, search, typeFilter, boardFilter);
      } catch (error: any) {
        toast.error(error?.message || "Failed to delete subject");
      }
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Subject Management
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Create and manage subjects for classes
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setEditingSubject(null);
              setFormData({ name: "", code: "", description: "", type: "Core", boardConfigurationId: SCHOOL_DEFAULT });
            }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Subject
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingSubject ? "Edit Subject" : "Add New Subject"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Subject Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g., Mathematics"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="code">Subject Code *</Label>
                <Input
                  id="code"
                  placeholder="e.g., MATH"
                  value={formData.code}
                  onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  placeholder="Optional description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="type">Type</Label>
                <Select value={formData.type} onValueChange={(value: any) => setFormData(prev => ({ ...prev, type: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {typeOptions.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="board">Board</Label>
                <Select
                  value={formData.boardConfigurationId}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, boardConfigurationId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select board" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={SCHOOL_DEFAULT}>School Default (all boards)</SelectItem>
                    {schoolBoards.map((b) => (
                      <SelectItem key={b.boardConfigurationId} value={b.boardConfigurationId}>
                        {b.boardName}{b.isDefault ? " (Default)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  School Default subjects can be assigned to any class. Board-specific subjects can only be assigned to classes under that board.
                </p>
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="flex-1">
                  {editingSubject ? "Update" : "Create"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* ── Search & Filter bar ──────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or code…"
              value={searchInput}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-9"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => handleSearchChange("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <Select value={typeFilter} onValueChange={handleTypeChange}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_FILTER}>All types</SelectItem>
              {typeOptions.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={boardFilter} onValueChange={handleBoardChange}>
            <SelectTrigger className="w-full sm:w-52">
              <SelectValue placeholder="All boards" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_FILTER}>All boards</SelectItem>
              <SelectItem value="school_default_filter">School Default</SelectItem>
              {schoolBoards.map(b => (
                <SelectItem key={b.boardConfigurationId} value={b.boardConfigurationId}>
                  {b.boardName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="shrink-0">
              <X className="h-4 w-4 mr-1" />
              Clear
            </Button>
          )}
        </div>

        {/* ── Table ────────────────────────────────────────────────── */}
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subject</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Board</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subjects.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      {hasFilters ? "No subjects match the current filters." : "No subjects created yet. Click \"Add Subject\" to get started."}
                    </TableCell>
                  </TableRow>
                ) : (
                  subjects.map((subject) => (
                    <TableRow key={subject.id}>
                      <TableCell className="font-medium">{subject.name}</TableCell>
                      <TableCell>{subject.code}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{subject.type || "Core"}</Badge>
                      </TableCell>
                      <TableCell>
                        {subject.boardConfigurationId
                          ? <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700">{subject.boardName || "Board"}</Badge>
                          : <Badge variant="outline" className="border-green-200 bg-green-50 text-green-700">School Default</Badge>
                        }
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="ghost" onClick={() => handleEdit(subject)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleDelete(subject.id)}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            {/* ── Pagination ──────────────────────────────────────── */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-2 border-t">
                <p className="text-sm text-muted-foreground">
                  Showing {Math.min((page - 1) * PAGE_SIZE + 1, total)}–{Math.min(page * PAGE_SIZE, total)} of {total} subjects
                </p>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(n => n === 1 || n === totalPages || Math.abs(n - page) <= 1)
                    .reduce<(number | "…")[]>((acc, n, idx, arr) => {
                      if (idx > 0 && n - (arr[idx - 1] as number) > 1) acc.push("…");
                      acc.push(n);
                      return acc;
                    }, [])
                    .map((n, idx) =>
                      n === "…"
                        ? <span key={`ellipsis-${idx}`} className="px-1 text-muted-foreground text-sm">…</span>
                        : <Button
                            key={n}
                            variant={page === n ? "default" : "outline"}
                            size="sm"
                            className="w-8 px-0"
                            onClick={() => setPage(n as number)}
                          >{n}</Button>
                    )
                  }
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
            {totalPages <= 1 && total > 0 && (
              <p className="text-sm text-muted-foreground text-right pt-2 border-t">
                {total} subject{total !== 1 ? "s" : ""}
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}