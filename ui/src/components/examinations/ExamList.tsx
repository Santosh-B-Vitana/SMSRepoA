import React, { useState } from "react";
import { Calendar, Edit, Trash2, Users, PauseCircle, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Exam {
  id: string;
  name: string;
  class: string;
  subject: string;
  date: string;
  time: string;
  duration: string;
  maxMarks: number;
  status: 'scheduled' | 'ongoing' | 'completed' | 'paused';
}

interface ExamListProps {
  exams: Exam[];
  onEditExam: (examId: string) => void;
  onDeleteExam: (examId: string, newStatus?: 'scheduled' | 'paused') => void;
}

export function ExamList({ exams, onEditExam, onDeleteExam }: ExamListProps) {
  const [filterClass, setFilterClass] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [localExams, setLocalExams] = useState<Exam[]>(exams);
  React.useEffect(() => {
    setLocalExams(exams);
  }, [exams]);
  const uniqueClasses = [...new Set(localExams.map(exam => exam.class))].sort();

  const filteredExams = localExams.filter(exam => {
    if (filterClass !== 'all' && exam.class !== filterClass) return false;
    if (filterStatus !== 'all' && exam.status !== filterStatus) return false;
    return true;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'ongoing':
        return 'bg-blue-100 text-blue-800';
      case 'scheduled':
        return 'bg-yellow-100 text-yellow-800';
      case 'paused':
        return 'bg-gray-300 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Scheduled Exams
        </CardTitle>
        <div className="flex gap-4">
          <Select value={filterClass} onValueChange={setFilterClass}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filter by class" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Classes</SelectItem>
              {uniqueClasses.map(cls => (
                <SelectItem key={cls} value={cls}>Class {cls}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="ongoing">Ongoing</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="paused">Paused</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Exam Details</TableHead>
              <TableHead>Class</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Date & Time</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Max Marks</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredExams.map(exam => (
              <TableRow key={exam.id}>
                <TableCell>
                  <div className="font-medium">{exam.name}</div>
                  <div className="text-sm text-muted-foreground">{exam.id}</div>
                </TableCell>
                <TableCell>Class {exam.class}</TableCell>
                <TableCell>{exam.subject}</TableCell>
                <TableCell>
                  <div>
                    <div className="font-medium">{exam.date}</div>
                    <div className="text-sm text-muted-foreground">{exam.time}</div>
                  </div>
                </TableCell>
                <TableCell>{exam.duration}</TableCell>
                <TableCell>{exam.maxMarks}</TableCell>
                <TableCell>
                  <Badge className={exam.status === 'paused' ? 'bg-gray-300 text-gray-800' : getStatusColor(exam.status) as string}>
                    {exam.status === 'paused' ? 'Paused' : exam.status.charAt(0).toUpperCase() + exam.status.slice(1)}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setLocalExams(prev => prev.map(ex =>
                          ex.id === exam.id
                            ? { ...ex, status: ex.status === 'paused' ? 'scheduled' : 'paused' }
                            : ex
                        ));
                        onDeleteExam(exam.id, exam.status === 'paused' ? 'scheduled' : 'paused');
                      }}
                      title={exam.status === 'paused' ? 'Enable Exam' : 'Pause/Deactivate Exam'}
                    >
                      {exam.status === 'paused' ? (
                        <PlayCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <PauseCircle className="h-4 w-4 text-yellow-500" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEditExam(exam.id)}
                      title="Edit Exam"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {filteredExams.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No exams found matching the current filters.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
