'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertTriangle, Edit3, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  reportCardDocumentsApi,
  type ReportCardDocumentDto,
  type ReportCardSubjectDto,
  type EditReportCardRequest,
} from '@/services/api/reportCardsApi';

interface ReportCardEditorProps {
  reportCard: ReportCardDocumentDto;
  trigger?: React.ReactNode;
}

export function ReportCardEditor({ reportCard, trigger }: ReportCardEditorProps) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [subjects, setSubjects] = useState<ReportCardSubjectDto[]>(
    reportCard.subjects.map(s => ({ ...s }))
  );
  const [teacherRemarks, setTeacherRemarks] = useState(reportCard.teacherRemarks ?? '');
  const [principalRemarks, setPrincipalRemarks] = useState(reportCard.principalRemarks ?? '');
  const [overrideGrade, setOverrideGrade] = useState(reportCard.overallGrade ?? '');
  const [overrideResult, setOverrideResult] = useState(reportCard.resultStatus ?? '');
  const [editRemarks, setEditRemarks] = useState('');

  const editMutation = useMutation({
    mutationFn: (req: EditReportCardRequest) =>
      reportCardDocumentsApi.edit(reportCard.id, req),
    onSuccess: () => {
      toast.success('Report card corrected successfully. Audit trail updated.');
      queryClient.invalidateQueries({ queryKey: ['report-cards'] });
      setOpen(false);
    },
    onError: (err: any) => {
      toast.error(err?.message ?? 'Failed to save corrections.');
    },
  });

  const handleSave = () => {
    if (!editRemarks.trim()) {
      toast.error('Please provide a reason for the correction (required for audit trail).');
      return;
    }
    editMutation.mutate({
      correctedSubjects: subjects,
      teacherRemarks,
      principalRemarks,
      overrideOverallGrade: overrideGrade || undefined,
      overrideResultStatus: overrideResult || undefined,
      editRemarks,
    });
  };

  const updateSubject = (idx: number, field: keyof ReportCardSubjectDto, value: any) => {
    setSubjects(prev => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm">
            <Edit3 className="h-4 w-4 mr-2" />
            Edit / Correct
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit3 className="h-5 w-5 text-amber-600" />
            Edit / Correct Report Card
            <Badge variant="secondary">{reportCard.studentName}</Badge>
          </DialogTitle>
          <DialogDescription>
            Correct marks, grades, remarks or result status. All changes are audit-trailed.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Warning banner */}
          <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
            <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-amber-800 dark:text-amber-200">
              <strong>Important:</strong> All corrections are logged with your identity, timestamp, and reason. The downloaded document will be marked as a <strong>Corrected Document</strong>.
            </div>
          </div>

          {/* Subject marks table */}
          <div>
            <Label className="text-sm font-semibold mb-2 block">Subject Marks Correction</Label>
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="px-3 py-2 text-left font-semibold">Subject</th>
                    <th className="px-2 py-2 text-center font-semibold">Max Marks</th>
                    <th className="px-2 py-2 text-center font-semibold">Obtained</th>
                    <th className="px-2 py-2 text-center font-semibold">Grade</th>
                    <th className="px-2 py-2 text-center font-semibold">Pass?</th>
                  </tr>
                </thead>
                <tbody>
                  {subjects.map((s, idx) => (
                    <tr key={idx} className="border-t">
                      <td className="px-3 py-1.5 font-medium">{s.subjectName}</td>
                      <td className="px-2 py-1.5 text-center">
                        <Input
                          type="number"
                          value={s.annualMax ?? ''}
                          onChange={e => updateSubject(idx, 'annualMax', parseFloat(e.target.value) || undefined)}
                          className="h-7 w-16 text-center text-xs"
                        />
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        <Input
                          type="number"
                          value={s.annualObtained ?? ''}
                          onChange={e => updateSubject(idx, 'annualObtained', parseFloat(e.target.value) || undefined)}
                          className="h-7 w-16 text-center text-xs"
                        />
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        <Input
                          value={s.finalGrade ?? ''}
                          onChange={e => updateSubject(idx, 'finalGrade', e.target.value)}
                          className="h-7 w-14 text-center text-xs"
                          placeholder="A1"
                        />
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        <button
                          type="button"
                          onClick={() => updateSubject(idx, 'isPass', !s.isPass)}
                          className={`text-xs font-semibold px-2 py-0.5 rounded ${
                            s.isPass ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {s.isPass ? 'Pass' : 'Fail'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <Separator />

          {/* Summary overrides */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-xs">Override Overall Grade</Label>
              <Input
                value={overrideGrade}
                onChange={e => setOverrideGrade(e.target.value)}
                placeholder="e.g. A1, A, B+"
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Override Result Status</Label>
              <Input
                value={overrideResult}
                onChange={e => setOverrideResult(e.target.value)}
                placeholder="Pass / Fail / Promoted / Detained"
                className="h-8 text-sm"
              />
            </div>
          </div>

          <Separator />

          {/* Remarks */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-xs">Class Teacher Remarks</Label>
              <Textarea
                value={teacherRemarks}
                onChange={e => setTeacherRemarks(e.target.value)}
                placeholder="Teacher's remarks..."
                rows={2}
                className="text-xs resize-none"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Principal Remarks</Label>
              <Textarea
                value={principalRemarks}
                onChange={e => setPrincipalRemarks(e.target.value)}
                placeholder="Principal's remarks..."
                rows={2}
                className="text-xs resize-none"
              />
            </div>
          </div>

          <Separator />

          {/* Correction reason — required */}
          <div className="space-y-1">
            <Label className="text-sm font-semibold text-red-700 dark:text-red-400">
              Correction Reason <span className="text-red-500">*</span>
            </Label>
            <Textarea
              value={editRemarks}
              onChange={e => setEditRemarks(e.target.value)}
              placeholder="Required: Explain why this correction is being made (e.g., 'Data entry error in Mathematics marks — corrected from 62 to 72')"
              rows={3}
              className="text-sm resize-none border-red-200 dark:border-red-800 focus:border-red-400"
            />
            <p className="text-xs text-muted-foreground">
              This reason will be stored in the audit log and shown on the corrected document.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={editMutation.isPending || !editRemarks.trim()}
            className="bg-amber-600 hover:bg-amber-700 text-white"
          >
            {editMutation.isPending ? 'Saving...' : 'Save Corrections'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
