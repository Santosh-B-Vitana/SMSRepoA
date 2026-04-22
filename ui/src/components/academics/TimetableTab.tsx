import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { apiClient } from "@/services/api";

interface TimetableEntry {
  id: string;
  schoolId: string;
  sectionId: string;
  dayOfWeek: string;
  period: number;
  subjectId: string;
  subjectName: string;
  teacherId?: string;
  teacherName?: string;
  startTime?: string;
  endTime?: string;
  createdAt: string;
  updatedAt: string;
}

interface TimetableTabProps {
  sectionId: string;
}

const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function TimetableTab({ sectionId }: TimetableTabProps) {
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [subjects, setSubjects] = useState<Array<{ id: string; name: string }>>([]);
  const [teachers, setTeachers] = useState<Array<{ id: string; name: string }>>([]);
  const [editDialog, setEditDialog] = useState<{ 
    open: boolean; 
    entry: TimetableEntry | null;
    isNew: boolean;
  }>({ open: false, entry: null, isNew: false });
  
  // Form state
  const [formDay, setFormDay] = useState("");
  const [formPeriod, setFormPeriod] = useState(1);
  const [formSubjectId, setFormSubjectId] = useState("");
  const [formTeacherId, setFormTeacherId] = useState("");
  const [formStartTime, setFormStartTime] = useState("");
  const [formEndTime, setFormEndTime] = useState("");

  useEffect(() => {
    loadTimetable();
    loadSubjects();
    loadTeachers();
  }, [sectionId]);

  const loadTimetable = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/academics/sections/${sectionId}/timetable`);
      setEntries(response.data.entries || []);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to load timetable");
    } finally {
      setLoading(false);
    }
  };

  const loadSubjects = async () => {
    try {
      const response = await apiClient.get('/academics/subjects');
      setSubjects(response.data.subjects || []);
    } catch (error) {
      console.error("Failed to load subjects", error);
    }
  };

  const loadTeachers = async () => {
    try {
      const response = await apiClient.get('/staff/list');
      setTeachers(response.data.staff?.map((s: any) => ({
        id: s.id,
        name: `${s.firstName || ''} ${s.lastName || ''}`.trim()
      })) || []);
    } catch (error) {
      console.error("Failed to load teachers", error);
    }
  };

  const handleAdd = (day: string) => {
    const maxPeriod = Math.max(0, ...entries.filter(e => e.dayOfWeek === day).map(e => e.period));
    setFormDay(day);
    setFormPeriod(maxPeriod + 1);
    setFormSubjectId("");
    setFormTeacherId("");
    setFormStartTime("");
    setFormEndTime("");
    setEditDialog({ open: true, entry: null, isNew: true });
  };

  const handleEdit = (entry: TimetableEntry) => {
    setFormDay(entry.dayOfWeek);
    setFormPeriod(entry.period);
    setFormSubjectId(entry.subjectId);
    setFormTeacherId(entry.teacherId || "");
    setFormStartTime(entry.startTime || "");
    setFormEndTime(entry.endTime || "");
    setEditDialog({ open: true, entry, isNew: false });
  };

  const handleSave = async () => {
    if (!formSubjectId) {
      toast.error("Please select a subject");
      return;
    }

    try {
      if (editDialog.isNew) {
        // Create new entry
        await apiClient.post('/academics/timetable', {
          sectionId,
          dayOfWeek: formDay,
          period: formPeriod,
          subjectId: formSubjectId,
          teacherId: formTeacherId || null,
          startTime: formStartTime || null,
          endTime: formEndTime || null
        });
        toast.success("Timetable entry added");
      } else if (editDialog.entry) {
        // Update existing entry
        await apiClient.put(`/academics/timetable/${editDialog.entry.id}`, {
          dayOfWeek: formDay,
          period: formPeriod,
          subjectId: formSubjectId,
          teacherId: formTeacherId || null,
          startTime: formStartTime || null,
          endTime: formEndTime || null
        });
        toast.success("Timetable entry updated");
      }
      
      setEditDialog({ open: false, entry: null, isNew: false });
      loadTimetable();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to save timetable entry");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this timetable entry?")) return;
    
    try {
      await apiClient.delete(`/academics/timetable/${id}`);
      toast.success("Timetable entry deleted");
      loadTimetable();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to delete entry");
    }
  };

  const getEntriesForDay = (day: string) => {
    return entries
      .filter(e => e.dayOfWeek === day)
      .sort((a, b) => a.period - b.period);
  };

  if (loading) {
    return <div className="text-center py-8">Loading timetable...</div>;
  }
  if (loading) {
    return <div className="text-center py-8">Loading timetable...</div>;
  }

  return (
    <div className="space-y-6">
      {days.map((day) => {
        const dayEntries = getEntriesForDay(day);
        return (
          <Card key={day}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{day}</CardTitle>
              <Button size="sm" onClick={() => handleAdd(day)}>Add Period</Button>
            </CardHeader>
            <CardContent>
              {dayEntries.length === 0 ? (
                <p className="text-muted-foreground text-sm py-4">No periods scheduled</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Period</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Teacher</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dayEntries.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell>{entry.period}</TableCell>
                        <TableCell>
                          {entry.startTime && entry.endTime 
                            ? `${entry.startTime} - ${entry.endTime}` 
                            : '-'}
                        </TableCell>
                        <TableCell>{entry.subjectName}</TableCell>
                        <TableCell>{entry.teacherName || '-'}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => handleEdit(entry)}>
                              Edit
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => handleDelete(entry.id)}>
                              Delete
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        );
      })}

      <Dialog open={editDialog.open} onOpenChange={(open) => !open && setEditDialog({ open: false, entry: null, isNew: false })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editDialog.isNew ? 'Add Period' : 'Edit Period'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Day</label>
              <Select value={formDay} onValueChange={setFormDay}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {days.map(d => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Period Number</label>
              <Input 
                type="number" 
                min="1" 
                max="10"
                value={formPeriod} 
                onChange={(e) => setFormPeriod(parseInt(e.target.value) || 1)} 
              />
            </div>

            <div>
              <label className="text-sm font-medium">Subject *</label>
              <Select value={formSubjectId} onValueChange={setFormSubjectId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Teacher</label>
              <Select value={formTeacherId} onValueChange={setFormTeacherId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select teacher (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {teachers.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Start Time</label>
                <Input 
                  type="time"
                  value={formStartTime} 
                  onChange={(e) => setFormStartTime(e.target.value)} 
                />
              </div>
              <div>
                <label className="text-sm font-medium">End Time</label>
                <Input 
                  type="time"
                  value={formEndTime} 
                  onChange={(e) => setFormEndTime(e.target.value)} 
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setEditDialog({ open: false, entry: null, isNew: false })}>
                Cancel
              </Button>
              <Button onClick={handleSave}>Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
