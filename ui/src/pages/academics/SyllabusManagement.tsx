import { useEffect, useState } from "react";
import { mockApi } from "@/services/mockApi";
import type { Syllabus } from "@/services/mockApi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function SyllabusManagement() {
  const [syllabi, setSyllabi] = useState<Syllabus[]>([]);
  const [search, setSearch] = useState("");
  const [addDialog, setAddDialog] = useState(false);
  const [newSyllabus, setNewSyllabus] = useState<Partial<Syllabus>>({});
  const [customSubject, setCustomSubject] = useState("");
  const [useCustomSubject, setUseCustomSubject] = useState(false);

  // Basic subjects for Indian schools
  const basicSubjects = [
    "English", "Hindi", "Mathematics", "Science", "Social Science", "EVS", "Sanskrit", "Computer Science", "General Knowledge", "Physical Education"
  ];

  useEffect(() => {
    fetchSyllabi();
  }, []);

  const fetchSyllabi = async () => {
    const data = await mockApi.getSyllabi();
    setSyllabi(data);
  };

  const handleAddSyllabus = async () => {
    const subject = useCustomSubject ? customSubject : newSyllabus.subject;
    if (newSyllabus.class && subject && newSyllabus.title) {
      await mockApi.addSyllabus({
        class: newSyllabus.class,
        subject: subject,
        title: newSyllabus.title,
        description: newSyllabus.description || "",
        fileUrl: newSyllabus.fileUrl || "",
        schoolId: newSyllabus.schoolId || "SCH001"
      });
      setAddDialog(false);
      setNewSyllabus({});
      setCustomSubject("");
      setUseCustomSubject(false);
      fetchSyllabi();
    }
  };

  const filtered = syllabi.filter(s =>
    s.title.toLowerCase().includes(search.toLowerCase()) ||
    s.subject.toLowerCase().includes(search.toLowerCase()) ||
    s.class.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-5xl mx-auto py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Syllabus Management</h1>
        <Button onClick={() => setAddDialog(true)}>Add Syllabus</Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Syllabi</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex gap-2">
            <Input
              placeholder="Search by class, subject, or title..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="max-w-xs"
            />
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Class</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>File</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(s => (
                  <TableRow key={s.id}>
                    <TableCell>{s.class}</TableCell>
                    <TableCell>{s.subject}</TableCell>
                    <TableCell>{s.title}</TableCell>
                    <TableCell>{s.description}</TableCell>
                    <TableCell>
                      {s.fileUrl ? <a href={s.fileUrl} target="_blank" rel="noopener noreferrer">View</a> : "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      <Dialog open={addDialog} onOpenChange={setAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Syllabus</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Input placeholder="Class (e.g. 1, 2, 10, Pre-Primary)" value={newSyllabus.class || ''} onChange={e => setNewSyllabus(ns => ({ ...ns, class: e.target.value }))} />
            {!useCustomSubject ? (
              <div className="flex gap-2">
                <select
                  className="border rounded px-2 py-1 flex-1"
                  value={newSyllabus.subject || ''}
                  onChange={e => setNewSyllabus(ns => ({ ...ns, subject: e.target.value }))}
                >
                  <option value="">Select Subject</option>
                  {basicSubjects.map(subj => (
                    <option key={subj} value={subj}>{subj}</option>
                  ))}
                </select>
                <Button type="button" variant="outline" onClick={() => setUseCustomSubject(true)}>
                  Add Custom
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Input placeholder="Custom Subject" value={customSubject} onChange={e => setCustomSubject(e.target.value)} />
                <Button type="button" variant="outline" onClick={() => setUseCustomSubject(false)}>
                  Back
                </Button>
              </div>
            )}
            <Input placeholder="Title" value={newSyllabus.title || ''} onChange={e => setNewSyllabus(ns => ({ ...ns, title: e.target.value }))} />
            <Input placeholder="Description" value={newSyllabus.description || ''} onChange={e => setNewSyllabus(ns => ({ ...ns, description: e.target.value }))} />
            <Input placeholder="File URL (optional)" value={newSyllabus.fileUrl || ''} onChange={e => setNewSyllabus(ns => ({ ...ns, fileUrl: e.target.value }))} />
            <Button onClick={handleAddSyllabus} className="w-full mt-2">Add Syllabus</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
