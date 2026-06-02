'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TemplateSelector } from './TemplateSelector';
import { FileText, Users, Zap, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  reportCardDocumentsApi,
  BOARD_TYPES,
  type GenerateReportCardRequest,
  type BulkGenerateRequest,
} from '@/services/api/reportCardsApi';
import { academicApi } from '@/services/api/academicApi';
import { useAcademicYear } from '@/contexts/AcademicYearContext';

export function ReportCardGenerator() {
  const queryClient = useQueryClient();
  const { academicYear } = useAcademicYear();

  // Single student state
  const [studentId, setStudentId] = useState('');
  const [singleTerm, setSingleTerm] = useState('Annual');
  const [singleBoard, setSingleBoard] = useState('CBSE');
  const [singleTemplate, setSingleTemplate] = useState('CBSE_Classic');
  const [singleOrientation, setSingleOrientation] = useState('Portrait');
  const [includeCoScholastic, setIncludeCoScholastic] = useState(true);
  const [includeAttendance, setIncludeAttendance] = useState(true);

  // Bulk state
  const [bulkClassId, setBulkClassId] = useState('');
  const [bulkSectionId, setBulkSectionId] = useState('');
  const [bulkTerm, setBulkTerm] = useState('Annual');
  const [bulkBoard, setBulkBoard] = useState('CBSE');
  const [bulkTemplate, setBulkTemplate] = useState('CBSE_Classic');

  // Classes
  const { data: classesData } = useQuery({
    queryKey: ['classes-list'],
    queryFn: () => academicApi.listClasses(1, 200),
  });
  const classes = classesData?.classes ?? [];

  // Sections for selected bulk class
  const sections = bulkClassId
    ? classes.filter(c => c.id === bulkClassId || c.standard === classes.find(x => x.id === bulkClassId)?.standard)
    : [];

  // Generate single
  const singleMutation = useMutation({
    mutationFn: (req: GenerateReportCardRequest) => reportCardDocumentsApi.generate(req),
    onSuccess: rc => {
      toast.success(`Report card generated for ${rc.studentName} (${rc.percentage.toFixed(1)}%)`);
      queryClient.invalidateQueries({ queryKey: ['report-cards'] });
      setStudentId('');
    },
    onError: (err: any) => {
      toast.error(err?.message ?? 'Generation failed.');
    },
  });

  // Generate bulk
  const bulkMutation = useMutation({
    mutationFn: (req: BulkGenerateRequest) => reportCardDocumentsApi.bulkGenerate(req),
    onSuccess: res => {
      toast.success(`${res.count} report cards generated successfully.`);
      queryClient.invalidateQueries({ queryKey: ['report-cards'] });
    },
    onError: (err: any) => {
      toast.error(err?.message ?? 'Bulk generation failed.');
    },
  });

  const handleSingleGenerate = () => {
    if (!studentId.trim()) {
      toast.error('Please enter a Student ID or Admission Number.');
      return;
    }
    singleMutation.mutate({
      studentId: studentId.trim(),
      academicYear: academicYear ?? '',
      term: singleTerm,
      boardType: singleBoard,
      templateStyle: singleTemplate,
      orientation: singleOrientation,
      includeCoScholastic,
      includeAttendance,
    });
  };

  const handleBulkGenerate = () => {
    if (!bulkClassId) {
      toast.error('Please select a class.');
      return;
    }
    if (!window.confirm(`Generate report cards for the entire ${
      classes.find(c => c.id === bulkClassId)?.standard ?? ''
    } ${bulkSectionId ? sections.find(s => s.id === bulkSectionId)?.section ?? '' : '(All Sections)'}? This may take a few minutes.`)) return;

    bulkMutation.mutate({
      classId: bulkClassId,
      sectionId: bulkSectionId || undefined,
      academicYear: academicYear ?? '',
      term: bulkTerm,
      boardType: bulkBoard,
      templateStyle: bulkTemplate,
      includeCoScholastic,
      includeAttendance,
    });
  };

  const TERMS = ['Term 1', 'Term 2', 'Annual', 'Mid-Term', 'Pre-Board', 'Board'];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Zap className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-bold">Generate Report Cards</h2>
        <Badge variant="outline" className="text-xs">{academicYear}</Badge>
      </div>

      <Tabs defaultValue="single">
        <TabsList>
          <TabsTrigger value="single" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Single Student
          </TabsTrigger>
          <TabsTrigger value="bulk" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Bulk (Class / Section)
          </TabsTrigger>
        </TabsList>

        {/* ── Single student ─────────────────────────── */}
        <TabsContent value="single" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Single Student Report Card</CardTitle>
              <CardDescription>Generate for one student. Enter admission number or student ID.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Student ID / Admission No.</Label>
                  <Input
                    value={studentId}
                    onChange={e => setStudentId(e.target.value)}
                    placeholder="e.g. ADM2024001"
                    className="h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Term / Examination</Label>
                  <Select value={singleTerm} onValueChange={setSingleTerm}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TERMS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Board Type</Label>
                  <Select value={singleBoard} onValueChange={setSingleBoard}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {BOARD_TYPES.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Orientation</Label>
                  <Select value={singleOrientation} onValueChange={setSingleOrientation}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Portrait">Portrait</SelectItem>
                      <SelectItem value="Landscape">Landscape</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex gap-6">
                <div className="flex items-center gap-2">
                  <Switch checked={includeCoScholastic} onCheckedChange={setIncludeCoScholastic} id="co-sc" />
                  <Label htmlFor="co-sc" className="cursor-pointer text-sm">Co-Scholastic Activities</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={includeAttendance} onCheckedChange={setIncludeAttendance} id="attendance" />
                  <Label htmlFor="attendance" className="cursor-pointer text-sm">Attendance Summary</Label>
                </div>
              </div>

              <Separator />
              <TemplateSelector value={singleTemplate} onChange={setSingleTemplate} />

              <Button
                onClick={handleSingleGenerate}
                disabled={singleMutation.isPending}
                className="w-full"
              >
                {singleMutation.isPending ? (
                  'Generating...'
                ) : (
                  <><FileText className="h-4 w-4 mr-2" />Generate Report Card</>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Bulk ────────────────────────────────────── */}
        <TabsContent value="bulk" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Bulk Generate — Class / Section</CardTitle>
              <CardDescription>
                Generates report cards for all students in the selected class or section.
                Students with no exam data are skipped.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Class</Label>
                  <Select value={bulkClassId} onValueChange={v => { setBulkClassId(v); setBulkSectionId(''); }}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Select class..." />
                    </SelectTrigger>
                    <SelectContent>
                      {classes.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.standard} {c.section}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Section <span className="text-muted-foreground text-xs">(optional — all if blank)</span></Label>
                  <Select value={bulkSectionId || 'all'} onValueChange={v => setBulkSectionId(v === 'all' ? '' : v)}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="All sections" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All sections</SelectItem>
                      {sections.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.section}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Term</Label>
                  <Select value={bulkTerm} onValueChange={setBulkTerm}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TERMS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Board Type</Label>
                  <Select value={bulkBoard} onValueChange={setBulkBoard}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {BOARD_TYPES.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />
              <TemplateSelector value={bulkTemplate} onChange={setBulkTemplate} />

              {bulkMutation.isSuccess && (
                <div className="flex items-center gap-2 bg-green-50 dark:bg-green-950/30 rounded p-3 text-sm text-green-700 dark:text-green-300">
                  <CheckCircle2 className="h-4 w-4" />
                  {bulkMutation.data?.count} report cards generated successfully.
                </div>
              )}

              <Button
                onClick={handleBulkGenerate}
                disabled={bulkMutation.isPending || !bulkClassId}
                className="w-full"
                variant="default"
              >
                {bulkMutation.isPending ? (
                  'Generating — please wait...'
                ) : (
                  <><Users className="h-4 w-4 mr-2" />Bulk Generate Report Cards</>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
