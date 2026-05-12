import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Ticket, Zap, Printer, Search, Loader2, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import examinationApi, { ExamBasic, HallTicket } from "@/services/api/examinationApi";
import { academicApi, ClassResponse } from "@/services/api/academicApi";
import { useAcademicYear } from "@/contexts/AcademicYearContext";

export function HallTicketManager() {
  const { academicYear } = useAcademicYear();
  const { toast } = useToast();

  const [classes, setClasses] = useState<ClassResponse[]>([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [exams, setExams] = useState<ExamBasic[]>([]);
  const [selectedExamId, setSelectedExamId] = useState("");
  const [hallTickets, setHallTickets] = useState<HallTicket[]>([]);
  const [prefix, setPrefix] = useState("HT");
  const [loadingExams, setLoadingExams] = useState(false);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const standards = Array.from(new Set(classes.map(c => c.standard))).sort(
    (a, b) => (parseInt(a.replace(/\D/g, "")) || 0) - (parseInt(b.replace(/\D/g, "")) || 0)
  );

  useEffect(() => {
    academicApi.listClasses(1, 500).then(r => setClasses(r.classes || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedClass) { setExams([]); setSelectedExamId(""); return; }
    setLoadingExams(true);
    examinationApi.getExams({ class: selectedClass }, 1, 500)
      .then(r => { setExams(r.items || []); setSelectedExamId(""); })
      .catch(() => {})
      .finally(() => setLoadingExams(false));
  }, [selectedClass, academicYear]);

  useEffect(() => {
    if (!selectedExamId) { setHallTickets([]); return; }
    setLoadingTickets(true);
    examinationApi.getHallTickets(selectedExamId)
      .then(r => setHallTickets(r))
      .catch(() => setHallTickets([]))
      .finally(() => setLoadingTickets(false));
  }, [selectedExamId]);

  const handleGenerate = async () => {
    if (!selectedExamId) return;
    setGenerating(true);
    try {
      const tickets = await examinationApi.generateHallTickets(selectedExamId, { prefix: prefix.trim() || undefined });
      setHallTickets(tickets);
      toast({ title: `Generated ${tickets.length} hall ticket(s)` });
    } catch (e: any) {
      toast({ title: e?.response?.data?.message ?? "Generation failed", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const exportCSV = () => {
    const rows = [["Hall Ticket No.", "Student Name", "Roll No.", "Class", "Section"]];
    filteredTickets.forEach(t => rows.push([t.hallTicketNumber, t.studentName, t.rollNumber ?? "", t.class, t.section ?? ""]));
    const csv = rows.map(r => r.map(c => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `hall_tickets_${selectedExamId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const selectedExam = exams.find(e => e.id === selectedExamId);
  const filteredTickets = hallTickets.filter(t =>
    !searchQuery || t.studentName.toLowerCase().includes(searchQuery.toLowerCase()) || t.hallTicketNumber.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Ticket className="h-5 w-5" />
          Hall Ticket Generation
        </CardTitle>
        <CardDescription>Generate and manage hall tickets for exams</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Class</Label>
            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
              <SelectContent>
                {standards.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Exam {loadingExams && <Loader2 className="h-3 w-3 inline animate-spin ml-1" />}
            </Label>
            <Select value={selectedExamId} onValueChange={setSelectedExamId} disabled={!selectedClass || loadingExams}>
              <SelectTrigger><SelectValue placeholder={!selectedClass ? "Select class first" : "Select exam"} /></SelectTrigger>
              <SelectContent>
                {exams.map(e => <SelectItem key={e.id} value={e.id}>{e.name} — {e.subject}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ticket Prefix</Label>
            <div className="flex gap-2">
              <Input value={prefix} onChange={e => setPrefix(e.target.value.toUpperCase())} placeholder="HT" className="font-mono" />
              <Button onClick={handleGenerate} disabled={!selectedExamId || generating} className="whitespace-nowrap">
                {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4 mr-1" />}
                Generate
              </Button>
            </div>
          </div>
        </div>

        {selectedExam && (
          <div className="rounded-md bg-muted px-3 py-2 text-sm">
            <span className="font-medium">{selectedExam.name}</span>
            &nbsp;&bull;&nbsp;{selectedExam.subject}
            &nbsp;&bull;&nbsp;{new Date(selectedExam.date).toLocaleDateString("en-IN")}
            {hallTickets.length > 0 && <Badge variant="secondary" className="ml-2">{hallTickets.length} tickets</Badge>}
          </div>
        )}

        {hallTickets.length > 0 && (
          <>
            <div className="flex items-center gap-2">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input className="pl-8" placeholder="Search by name or ticket no." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
              </div>
              <Button variant="outline" size="sm" onClick={exportCSV}>
                <Download className="h-4 w-4 mr-1" /> Export CSV
              </Button>
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-1" /> Print
              </Button>
            </div>

            <div className="print:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Hall Ticket No.</TableHead>
                    <TableHead>Student Name</TableHead>
                    <TableHead>Roll No.</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Section</TableHead>
                    <TableHead>Generated At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingTickets ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8"><Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" /></TableCell></TableRow>
                  ) : filteredTickets.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No hall tickets found</TableCell></TableRow>
                  ) : filteredTickets.map(t => (
                    <TableRow key={t.id}>
                      <TableCell><Badge variant="outline" className="font-mono">{t.hallTicketNumber}</Badge></TableCell>
                      <TableCell className="font-medium">{t.studentName}</TableCell>
                      <TableCell className="text-muted-foreground">{t.rollNumber ?? "—"}</TableCell>
                      <TableCell>{t.class}</TableCell>
                      <TableCell>{t.section ?? "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{new Date(t.generatedAt).toLocaleString("en-IN")}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}

        {selectedExamId && !loadingTickets && hallTickets.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Ticket className="h-10 w-10 mx-auto mb-2 opacity-30" />
            <p>No hall tickets generated yet.</p>
            <p className="text-sm">Click <span className="font-medium">Generate</span> to create hall tickets for enrolled students.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
