import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { BookOpen, FileQuestion, PlayCircle, ClipboardCheck, BarChart2, Plus, Loader2, Trash2, Pencil } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import * as examApi from "@/services/api/onlineExamApi";
import type {
  QuestionBank, CreateQuestionDto,
  OnlineExam, CreateOnlineExamDto,
  ExamSession, GradeResponseDto,
  ExamStats,
} from "@/services/api/onlineExamApi";

// ─── Question Bank Tab ───────────────────────────────────────────────────────

function QuestionBankTab() {
  const { toast } = useToast();
  const [questions, setQuestions] = useState<QuestionBank[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<QuestionBank | null>(null);
  const [typeFilter, setTypeFilter] = useState("all");
  const [difficultyFilter, setDifficultyFilter] = useState("all");
  const [options, setOptions] = useState<string[]>(["", "", "", ""]);
  const [form, setForm] = useState<CreateQuestionDto>({
    subjectId: "", questionText: "", questionType: "mcq",
    marks: 1, difficulty: "medium",
  });

  useEffect(() => { load(); }, [typeFilter, difficultyFilter]);

  const load = async () => {
    try {
      setLoading(true);
      setQuestions(await examApi.getQuestions({ type: typeFilter, difficulty: difficultyFilter }));
    } catch {
      toast({ title: "Error", description: "Failed to load questions", variant: "destructive" });
    } finally { setLoading(false); }
  };

  const openNew = () => {
    setEditTarget(null);
    setForm({ subjectId: "", questionText: "", questionType: "mcq", marks: 1, difficulty: "medium" });
    setOptions(["", "", "", ""]);
    setOpen(true);
  };

  const openEdit = (q: QuestionBank) => {
    setEditTarget(q);
    setForm({
      subjectId: q.subjectId, questionText: q.questionText, questionType: q.questionType,
      marks: q.marks, difficulty: q.difficulty, correctAnswer: q.correctAnswer,
      tags: q.tags, explanation: q.explanation,
    });
    setOptions(q.options && q.options.length ? [...q.options, "", "", "", ""].slice(0, 4) : ["", "", "", ""]);
    setOpen(true);
  };

  const save = async () => {
    const dto: CreateQuestionDto = {
      ...form,
      options: form.questionType !== "subjective" ? options.filter(o => o.trim()) : undefined,
    };
    try {
      if (editTarget) {
        await examApi.updateQuestion(editTarget.id, dto);
        toast({ title: "Question updated" });
      } else {
        await examApi.createQuestion(dto);
        toast({ title: "Question created" });
      }
      setOpen(false); load();
    } catch {
      toast({ title: "Error", variant: "destructive" });
    }
  };

  const remove = async (id: string) => {
    try {
      await examApi.deleteQuestion(id);
      toast({ title: "Question deleted" });
      load();
    } catch {
      toast({ title: "Error", variant: "destructive" });
    }
  };

  const diffBadge = (d: string) => {
    if (d === "easy") return <Badge className="bg-green-100 text-green-800">Easy</Badge>;
    if (d === "hard") return <Badge variant="destructive">Hard</Badge>;
    return <Badge variant="outline">Medium</Badge>;
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex gap-3">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-32"><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="mcq">MCQ</SelectItem>
              <SelectItem value="subjective">Subjective</SelectItem>
              <SelectItem value="true_false">True/False</SelectItem>
            </SelectContent>
          </Select>
          <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
            <SelectTrigger className="w-32"><SelectValue placeholder="Difficulty" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="easy">Easy</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="hard">Hard</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button size="sm" onClick={openNew}><Plus className="w-4 h-4 mr-1" /> Add Question</Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="animate-spin w-6 h-6" /></div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-1/2">Question</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Marks</TableHead>
              <TableHead>Difficulty</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {questions.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No questions in bank</TableCell></TableRow>
            ) : questions.map(q => (
              <TableRow key={q.id}>
                <TableCell className="max-w-xs">
                  <p className="truncate">{q.questionText}</p>
                  {q.tags && <p className="text-xs text-muted-foreground">{q.tags}</p>}
                </TableCell>
                <TableCell><Badge variant="outline">{q.questionType}</Badge></TableCell>
                <TableCell>{q.marks}</TableCell>
                <TableCell>{diffBadge(q.difficulty)}</TableCell>
                <TableCell className="space-x-1">
                  <Button size="sm" variant="outline" onClick={() => openEdit(q)}><Pencil className="w-3 h-3" /></Button>
                  <Button size="sm" variant="destructive" onClick={() => remove(q.id)}><Trash2 className="w-3 h-3" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editTarget ? "Edit Question" : "Add Question"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Subject ID *</Label>
              <Input value={form.subjectId} onChange={e => setForm(f => ({ ...f, subjectId: e.target.value }))} />
            </div>
            <div>
              <Label>Question *</Label>
              <Textarea value={form.questionText} onChange={e => setForm(f => ({ ...f, questionText: e.target.value }))} rows={3} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Type</Label>
                <Select value={form.questionType} onValueChange={v => setForm(f => ({ ...f, questionType: v as any }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mcq">MCQ</SelectItem>
                    <SelectItem value="subjective">Subjective</SelectItem>
                    <SelectItem value="true_false">True/False</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Marks</Label>
                <Input type="number" min={1} value={form.marks} onChange={e => setForm(f => ({ ...f, marks: +e.target.value }))} />
              </div>
              <div>
                <Label>Difficulty</Label>
                <Select value={form.difficulty} onValueChange={v => setForm(f => ({ ...f, difficulty: v as any }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {form.questionType === "mcq" && (
              <div>
                <Label>Options</Label>
                {options.map((opt, i) => (
                  <Input key={i} className="mt-1" value={opt}
                    placeholder={`Option ${String.fromCharCode(65 + i)}`}
                    onChange={e => { const o = [...options]; o[i] = e.target.value; setOptions(o); }} />
                ))}
              </div>
            )}
            {form.questionType !== "subjective" && (
              <div>
                <Label>Correct Answer</Label>
                <Input value={form.correctAnswer ?? ""} onChange={e => setForm(f => ({ ...f, correctAnswer: e.target.value }))}
                  placeholder={form.questionType === "true_false" ? "true or false" : "e.g. A or Option text"} />
              </div>
            )}
            <div>
              <Label>Explanation</Label>
              <Textarea value={form.explanation ?? ""} onChange={e => setForm(f => ({ ...f, explanation: e.target.value }))} rows={2} />
            </div>
            <div>
              <Label>Tags</Label>
              <Input value={form.tags ?? ""} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} placeholder="algebra, chapter-3" />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={save}>Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Exams Tab ───────────────────────────────────────────────────────────────

function ExamsTab() {
  const { toast } = useToast();
  const [exams, setExams] = useState<OnlineExam[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [form, setForm] = useState<CreateOnlineExamDto>({
    title: "", subjectId: "", classId: "", scheduledStart: "", scheduledEnd: "",
    durationMinutes: 60, passingMarks: 35, questions: [],
  });
  const [questionIdInput, setQuestionIdInput] = useState("");

  useEffect(() => { load(); }, [statusFilter]);

  const load = async () => {
    try {
      setLoading(true);
      setExams(await examApi.getExams({ status: statusFilter }));
    } catch {
      toast({ title: "Error", description: "Failed to load exams", variant: "destructive" });
    } finally { setLoading(false); }
  };

  const addQuestion = () => {
    if (!questionIdInput.trim()) return;
    setForm(f => ({
      ...f,
      questions: [...f.questions, { questionId: questionIdInput.trim(), questionOrder: f.questions.length + 1 }],
    }));
    setQuestionIdInput("");
  };

  const submit = async () => {
    try {
      await examApi.createExam(form);
      toast({ title: "Exam created" });
      setOpen(false); load();
    } catch {
      toast({ title: "Error", variant: "destructive" });
    }
  };

  const statusBadge = (s: string) => {
    const map: Record<string, string> = { draft: "secondary", published: "outline", ongoing: "default", completed: "default", cancelled: "destructive" };
    return <Badge variant={(map[s] ?? "outline") as any}>{s}</Badge>;
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="ongoing">Ongoing</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
        <Button size="sm" onClick={() => setOpen(true)}><Plus className="w-4 h-4 mr-1" /> New Exam</Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="animate-spin w-6 h-6" /></div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Scheduled</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Questions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {exams.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No exams</TableCell></TableRow>
            ) : exams.map(e => (
              <TableRow key={e.id}>
                <TableCell className="font-medium">{e.title}</TableCell>
                <TableCell>{e.subjectName ?? e.subjectId}</TableCell>
                <TableCell>{e.durationMinutes} min</TableCell>
                <TableCell>{new Date(e.scheduledStart).toLocaleString()}</TableCell>
                <TableCell>{statusBadge(e.status)}</TableCell>
                <TableCell>{e.questions.length}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Create Online Exam</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Title *</Label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Subject ID *</Label>
                <Input value={form.subjectId} onChange={e => setForm(f => ({ ...f, subjectId: e.target.value }))} />
              </div>
              <div>
                <Label>Class ID *</Label>
                <Input value={form.classId} onChange={e => setForm(f => ({ ...f, classId: e.target.value }))} />
              </div>
              <div>
                <Label>Start *</Label>
                <Input type="datetime-local" value={form.scheduledStart} onChange={e => setForm(f => ({ ...f, scheduledStart: e.target.value }))} />
              </div>
              <div>
                <Label>End *</Label>
                <Input type="datetime-local" value={form.scheduledEnd} onChange={e => setForm(f => ({ ...f, scheduledEnd: e.target.value }))} />
              </div>
              <div>
                <Label>Duration (min)</Label>
                <Input type="number" value={form.durationMinutes} onChange={e => setForm(f => ({ ...f, durationMinutes: +e.target.value }))} />
              </div>
              <div>
                <Label>Passing Marks</Label>
                <Input type="number" value={form.passingMarks} onChange={e => setForm(f => ({ ...f, passingMarks: +e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>Instructions</Label>
              <Textarea value={form.instructions ?? ""} onChange={e => setForm(f => ({ ...f, instructions: e.target.value }))} rows={2} />
            </div>
            <div>
              <Label>Add Questions by ID</Label>
              <div className="flex gap-2">
                <Input value={questionIdInput} onChange={e => setQuestionIdInput(e.target.value)} placeholder="Question UUID" />
                <Button type="button" variant="outline" onClick={addQuestion}>Add</Button>
              </div>
              {form.questions.length > 0 && (
                <ul className="mt-2 text-sm space-y-1">
                  {form.questions.map((q, i) => (
                    <li key={i} className="flex items-center justify-between p-1 bg-muted rounded">
                      <span className="font-mono text-xs">{q.questionId}</span>
                      <Button variant="ghost" size="sm" onClick={() => setForm(f => ({ ...f, questions: f.questions.filter((_, j) => j !== i) }))}>×</Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={submit}>Create</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Grading Tab ─────────────────────────────────────────────────────────────

function GradingTab() {
  const { toast } = useToast();
  const [examId, setExamId] = useState("");
  const [sessions, setSessions] = useState<ExamSession[]>([]);
  const [selected, setSelected] = useState<ExamSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [grades, setGrades] = useState<Record<string, { marks: number; remarks: string }>>({});

  const loadSessions = async () => {
    if (!examId.trim()) return;
    try {
      setLoading(true);
      setSessions(await examApi.getExamSessions(examId));
    } catch {
      toast({ title: "Error", description: "Failed to load sessions", variant: "destructive" });
    } finally { setLoading(false); }
  };

  const openSession = async (s: ExamSession) => {
    setSelected(s);
    const init: Record<string, { marks: number; remarks: string }> = {};
    s.responses.forEach(r => { init[r.questionId] = { marks: r.marksAwarded ?? 0, remarks: r.graderRemarks ?? "" }; });
    setGrades(init);
  };

  const submitGrades = async () => {
    if (!selected) return;
    try {
      const subjective = selected.responses.filter(r => r.questionType === "subjective");
      for (const r of subjective) {
        const g = grades[r.questionId];
        if (g) {
          await examApi.gradeResponse({ sessionId: selected.id, questionId: r.questionId, marksAwarded: g.marks, remarks: g.remarks });
        }
      }
      toast({ title: "Grades saved" });
      setSelected(null);
      loadSessions();
    } catch {
      toast({ title: "Error", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-3 items-end">
        <div className="flex-1">
          <Label>Exam ID</Label>
          <Input value={examId} onChange={e => setExamId(e.target.value)} placeholder="Enter exam UUID" />
        </div>
        <Button onClick={loadSessions} disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Load Sessions"}
        </Button>
      </div>

      {sessions.length > 0 && !selected && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Score</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sessions.map(s => (
              <TableRow key={s.id}>
                <TableCell>{s.studentName ?? s.studentId}</TableCell>
                <TableCell><Badge variant={s.status === "graded" ? "default" : "outline"}>{s.status}</Badge></TableCell>
                <TableCell>{s.obtainedMarks != null ? `${s.obtainedMarks}/${s.totalMarks}` : "—"}</TableCell>
                <TableCell>
                  {s.status === "submitted" && (
                    <Button size="sm" onClick={() => openSession(s)}>Grade</Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {selected && (
        <div className="space-y-4 border rounded-lg p-4">
          <div className="flex justify-between items-center">
            <h4 className="font-semibold">Grading: {selected.studentName}</h4>
            <Button variant="outline" size="sm" onClick={() => setSelected(null)}>Back</Button>
          </div>
          {selected.responses.filter(r => r.questionType === "subjective").map(r => (
            <div key={r.questionId} className="p-3 bg-muted rounded space-y-2">
              <p className="text-sm font-medium">{r.questionText}</p>
              <p className="text-sm text-muted-foreground">Answer: {r.responseText ?? "—"}</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Marks</Label>
                  <Input type="number" min={0} value={grades[r.questionId]?.marks ?? 0}
                    onChange={e => setGrades(g => ({ ...g, [r.questionId]: { ...g[r.questionId], marks: +e.target.value } }))} />
                </div>
                <div>
                  <Label>Remarks</Label>
                  <Input value={grades[r.questionId]?.remarks ?? ""}
                    onChange={e => setGrades(g => ({ ...g, [r.questionId]: { ...g[r.questionId], remarks: e.target.value } }))} />
                </div>
              </div>
            </div>
          ))}
          <Button onClick={submitGrades}>Save Grades</Button>
        </div>
      )}
    </div>
  );
}

// ─── Stats Tab ───────────────────────────────────────────────────────────────

function StatsTab() {
  const { toast } = useToast();
  const [examId, setExamId] = useState("");
  const [stats, setStats] = useState<ExamStats | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    if (!examId.trim()) return;
    try {
      setLoading(true);
      setStats(await examApi.getExamStats(examId));
    } catch {
      toast({ title: "Error", description: "Failed to load stats", variant: "destructive" });
    } finally { setLoading(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-3 items-end">
        <div className="flex-1">
          <Label>Exam ID</Label>
          <Input value={examId} onChange={e => setExamId(e.target.value)} placeholder="Enter exam UUID" />
        </div>
        <Button onClick={load} disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Get Stats"}
        </Button>
      </div>
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Students", value: stats.totalStudents },
            { label: "Appeared", value: stats.appeared },
            { label: "Absent", value: stats.absent },
            { label: "Passed", value: stats.passed },
            { label: "Failed", value: stats.failed },
            { label: "Average Marks", value: stats.averageMarks.toFixed(1) },
            { label: "Highest", value: stats.highestMarks },
            { label: "Lowest", value: stats.lowestMarks },
          ].map(item => (
            <Card key={item.label}>
              <CardContent className="pt-4">
                <p className="text-2xl font-bold">{item.value}</p>
                <p className="text-sm text-muted-foreground">{item.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function OnlineExamPortal() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="w-5 h-5" />
          Online Examination Portal
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="questions">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="questions"><FileQuestion className="w-4 h-4 mr-1" />Question Bank</TabsTrigger>
            <TabsTrigger value="exams"><PlayCircle className="w-4 h-4 mr-1" />Exams</TabsTrigger>
            <TabsTrigger value="grading"><ClipboardCheck className="w-4 h-4 mr-1" />Grading</TabsTrigger>
            <TabsTrigger value="stats"><BarChart2 className="w-4 h-4 mr-1" />Stats</TabsTrigger>
          </TabsList>
          <TabsContent value="questions" className="mt-4"><QuestionBankTab /></TabsContent>
          <TabsContent value="exams" className="mt-4"><ExamsTab /></TabsContent>
          <TabsContent value="grading" className="mt-4"><GradingTab /></TabsContent>
          <TabsContent value="stats" className="mt-4"><StatsTab /></TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
