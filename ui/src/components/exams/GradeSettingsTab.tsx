import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Trash2, Check, Star, Edit2, Download, Zap } from 'lucide-react';
import gradeDefinitionService from '@/services/gradeDefinitionService';

interface GradeDefinition {
  id: string;
  name: string;
  code: string;
  description?: string;
  isDefault: boolean;
  gradeRanges: {
    id: string;
    grade: string;
    minMarks: number;
    maxMarks: number;
    gradePoint: number;
    description?: string;
  }[];
}

interface GradeRangeInput {
  key: string;
  grade: string;
  minMarks: number;
  maxMarks: number;
  gradePoint: number;
  description?: string;
}

export default function GradeSettingsTab() {
  const [definitions, setDefinitions] = useState<GradeDefinition[]>(() => {
    const scales = gradeDefinitionService.getStandardGradingScales();
    const defaults: GradeDefinition[] = [];

    if ((scales as any).cbse && (scales as any).cbse.ranges) {
      defaults.push({
        id: 'grade-cbse-default',
        name: 'CBSE',
        code: 'CBSE',
        description: 'Central Board of Secondary Education - Standard 8 Grade Scale',
        isDefault: true,
        gradeRanges: (scales as any).cbse.ranges.map((range: any, idx: number) => ({
          id: `cbse-range-${idx}`,
          grade: range.grade,
          minMarks: range.minMarks,
          maxMarks: range.maxMarks,
          gradePoint: range.gradePoint,
          description: range.description,
        })),
      });
    }

    if ((scales as any).state && (scales as any).state.ranges) {
      defaults.push({
        id: 'grade-state-default',
        name: 'State Board',
        code: 'STATE',
        description: 'General State Standards - 6 Grade Scale',
        isDefault: false,
        gradeRanges: (scales as any).state.ranges.map((range: any, idx: number) => ({
          id: `state-range-${idx}`,
          grade: range.grade,
          minMarks: range.minMarks,
          maxMarks: range.maxMarks,
          gradePoint: range.gradePoint,
          description: range.description,
        })),
      });
    }

    if ((scales as any).icse && (scales as any).icse.ranges) {
      defaults.push({
        id: 'grade-icse-default',
        name: 'ICSE',
        code: 'ICSE',
        description: 'Indian Certificate of Secondary Education - 7 Grade Scale',
        isDefault: false,
        gradeRanges: (scales as any).icse.ranges.map((range: any, idx: number) => ({
          id: `icse-range-${idx}`,
          grade: range.grade,
          minMarks: range.minMarks,
          maxMarks: range.maxMarks,
          gradePoint: range.gradePoint,
          description: range.description,
        })),
      });
    }

    return defaults;
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [creationMode, setCreationMode] = useState<'quick' | 'custom'>('custom');
  const [selectedScale, setSelectedScale] = useState<'cbse' | 'state' | 'icse'>('cbse');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [gradeRanges, setGradeRanges] = useState<GradeRangeInput[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string>('');

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const handleLoadScale = () => {
    const scales = gradeDefinitionService.getStandardGradingScales();
    const scale = (scales as any)[selectedScale];

    if (scale && scale.ranges) {
      setGradeRanges(
        scale.ranges.map((r: any, idx: number) => ({
          key: `${idx}-${Math.random()}`,
          grade: r.grade,
          minMarks: r.minMarks,
          maxMarks: r.maxMarks,
          gradePoint: r.gradePoint,
          description: r.description,
        }))
      );
      setName(selectedScale.toUpperCase());
      setCode(selectedScale.toUpperCase());
    }
  };

  const handleAddGradeRange = () => {
    setGradeRanges([
      ...gradeRanges,
      {
        key: `new-${Date.now()}`,
        grade: '',
        minMarks: 0,
        maxMarks: 100,
        gradePoint: 0,
        description: '',
      },
    ]);
  };

  const handleRemoveGradeRange = (key: string) => {
    setGradeRanges(gradeRanges.filter((r) => r.key !== key));
  };

  const handleUpdateGradeRange = (key: string, field: string, value: any) => {
    setGradeRanges(gradeRanges.map((r) => (r.key === key ? { ...r, [field]: value } : r)));
  };

  const handleCreateDefinition = () => {
    if (!name.trim() || gradeRanges.length === 0) {
      alert('Please enter a name and add at least one grade range');
      return;
    }

    const newDefinition: GradeDefinition = {
      id: `grade-${Date.now()}`,
      name,
      code,
      description,
      isDefault,
      gradeRanges: gradeRanges.map((range, idx) => ({
        id: `range-${idx}`,
        grade: range.grade,
        minMarks: range.minMarks,
        maxMarks: range.maxMarks,
        gradePoint: range.gradePoint,
        description: range.description,
      })),
    };

    setDefinitions([...definitions, newDefinition]);
    setModalOpen(false);
    resetForm();
    showToast('✅ Grade system created successfully!');
  };

  const handleEditDefinition = (def: GradeDefinition) => {
    setEditingId(def.id);
    setName(def.name);
    setCode(def.code);
    setDescription(def.description || '');
    setIsDefault(def.isDefault);
    setCreationMode('custom');
    setGradeRanges(
      def.gradeRanges.map((r, idx) => ({
        key: `edit-${idx}-${Math.random()}`,
        grade: r.grade,
        minMarks: r.minMarks,
        maxMarks: r.maxMarks,
        gradePoint: r.gradePoint,
        description: r.description,
      }))
    );
    setModalOpen(true);
  };

  const handleSaveEdit = () => {
    if (!editingId || !name.trim() || gradeRanges.length === 0) {
      alert('Please fill in all required fields');
      return;
    }

    setDefinitions(
      definitions.map((def) =>
        def.id === editingId
          ? {
              ...def,
              name,
              code,
              description,
              isDefault,
              gradeRanges: gradeRanges.map((range, idx) => ({
                id: `range-${idx}`,
                grade: range.grade,
                minMarks: range.minMarks,
                maxMarks: range.maxMarks,
                gradePoint: range.gradePoint,
                description: range.description,
              })),
            }
          : def
      )
    );
    setModalOpen(false);
    resetForm();
    showToast('✅ Grade system updated successfully!');
  };

  const resetForm = () => {
    setName('');
    setCode('');
    setDescription('');
    setIsDefault(false);
    setGradeRanges([]);
    setSelectedScale('cbse');
    setCreationMode('custom');
    setEditingId(null);
  };

  const handleSetDefault = (id: string) => {
    setDefinitions(
      definitions.map((def) => ({
        ...def,
        isDefault: def.id === id,
      }))
    );
    showToast('⭐ Set as default successfully!');
  };

  const handleDelete = (id: string) => {
    if (id.endsWith('-default')) {
      alert('Cannot delete default standards. You can set a different standard as default instead.');
      return;
    }
    if (!confirm('Are you sure you want to delete this grade definition?')) return;
    setDefinitions(definitions.filter((def) => def.id !== id));
    showToast('🗑️ Grade system deleted');
  };

  return (
    <div className="w-full h-full flex flex-col space-y-8 p-6 overflow-y-auto bg-gray-50">
      {toastMessage && (
        <div className="fixed top-6 right-6 bg-white border-2 border-green-400 text-green-800 px-6 py-4 rounded-lg shadow-lg font-semibold text-base animate-pulse z-50">
          {toastMessage}
        </div>
      )}
      {/* Header */}
      <div className="flex justify-between items-start gap-6">
        <div className="flex-grow">
          <h2 className="text-3xl font-bold text-gray-900">Grade Management</h2>
          <p className="text-gray-600 mt-2 text-base">Create and manage custom grading scales for your school</p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setModalOpen(true);
          }}
          className="h-12 px-8 text-base whitespace-nowrap"
        >
          <Plus className="h-5 w-5 mr-2" />
          New Grade System
        </Button>
      </div>

      {/* Standards Info */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 flex-shrink-0">
        <CardHeader>
          <CardTitle className="text-xl">Available Standards</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <h4 className="font-bold text-base text-blue-900">CBSE</h4>
              <p className="text-sm text-gray-700">Central Board of Secondary Education</p>
              <p className="text-xs text-gray-600">8 grades: A+ to E</p>
            </div>
            <div className="space-y-2">
              <h4 className="font-bold text-base text-blue-900">State Board</h4>
              <p className="text-sm text-gray-700">General State Standards</p>
              <p className="text-xs text-gray-600">6 grades: A to F</p>
            </div>
            <div className="space-y-2">
              <h4 className="font-bold text-base text-blue-900">ICSE</h4>
              <p className="text-sm text-gray-700">Indian Certificate of Secondary Education</p>
              <p className="text-xs text-gray-600">7 grades: A* to F</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Grade Definitions List */}
      <div className="flex-grow overflow-y-auto space-y-6 pr-2">
        {definitions.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="pt-16 pb-16 text-center">
              <div className="space-y-4">
                <div className="text-6xl">📚</div>
                <p className="text-lg font-medium text-gray-700">No grade definitions yet</p>
                <p className="text-gray-600">Create your first grading scale to get started</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          definitions.map((def) => (
            <Card
              key={def.id}
              className={`transition-all ${
                def.isDefault ? 'border-green-500 bg-green-50 shadow-md' : 'hover:shadow-md'
              }`}
            >
              <CardHeader className="pb-4">
                <div className="flex justify-between items-start gap-6">
                  <div className="flex-grow">
                    <CardTitle className="flex items-center gap-3 text-2xl">
                      {def.name}
                      {def.isDefault && (
                        <div className="flex items-center gap-1 text-xs bg-green-600 text-white px-3 py-1 rounded-full">
                          <Star className="h-3 w-3 fill-yellow-300" />
                          <span className="font-semibold">Default</span>
                        </div>
                      )}
                    </CardTitle>
                    {def.description && (
                      <CardDescription className="text-sm mt-2">{def.description}</CardDescription>
                    )}
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={() => handleEditDefinition(def)}
                      className="h-11"
                    >
                      <Edit2 className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                    {!def.isDefault && (
                      <Button
                        variant="outline"
                        size="lg"
                        onClick={() => handleSetDefault(def.id)}
                        className="h-11"
                      >
                        <Check className="h-4 w-4 mr-2" />
                        Set Default
                      </Button>
                    )}
                    {!def.id.endsWith('-default') && (
                      <Button
                        variant="destructive"
                        size="lg"
                        onClick={() => handleDelete(def.id)}
                        className="h-11"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-100">
                        <TableHead className="font-bold text-base">Grade</TableHead>
                        <TableHead className="font-bold text-base">Range %</TableHead>
                        <TableHead className="font-bold text-base">Points</TableHead>
                        <TableHead className="font-bold text-base">Description</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {def.gradeRanges.map((range, idx) => (
                        <TableRow key={range.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <TableCell className="font-bold text-lg text-center py-4">{range.grade}</TableCell>
                          <TableCell className="text-center py-4 text-base">
                            {range.minMarks}% - {range.maxMarks}%
                          </TableCell>
                          <TableCell className="text-center py-4 text-base font-semibold">
                            {range.gradePoint}
                          </TableCell>
                          <TableCell className="py-4 text-base">{range.description || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Create/Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0 pb-6 border-b-2">
            <DialogTitle className="text-3xl font-bold">
              {editingId ? 'Edit Grade System' : 'Create Grade System'}
            </DialogTitle>
            <DialogDescription className="text-base mt-2">
              {editingId
                ? 'Modify the grade tiers and settings for this system'
                : 'Use a template or manually define each grade tier'}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-grow overflow-y-auto">
            <Tabs
              value={creationMode}
              onValueChange={(v) => setCreationMode(v as 'quick' | 'custom')}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-2 mb-8 h-14 p-2">
                <TabsTrigger value="quick" className="text-base py-2">
                  📋 Quick Templates
                </TabsTrigger>
                <TabsTrigger value="custom" className="text-base py-2">
                  ✏️ Manual Setup
                </TabsTrigger>
              </TabsList>

              {/* QUICK MODE */}
              <TabsContent value="quick" className="space-y-8 px-8 pb-8 mt-0">
                <div className="space-y-6">
                  <h3 className="text-2xl font-bold text-gray-900">System Information</h3>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <Label className="text-base font-semibold">System Name</Label>
                      <Input
                        placeholder="e.g., CBSE 2024"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="h-12 text-base"
                      />
                    </div>
                    <div className="space-y-3">
                      <Label className="text-base font-semibold">Code</Label>
                      <Input
                        placeholder="e.g., CBSE"
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        className="h-12 text-base"
                      />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <Label className="text-base font-semibold">Description</Label>
                    <Input
                      placeholder="Add notes about this grading system..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="h-12 text-base"
                    />
                  </div>
                  <div className="flex items-center space-x-3 pt-4">
                    <input
                      type="checkbox"
                      id="quick-default"
                      checked={isDefault}
                      onChange={(e) => setIsDefault(e.target.checked)}
                      className="w-6 h-6 rounded"
                    />
                    <Label htmlFor="quick-default" className="text-base font-medium cursor-pointer">
                      Set as school default
                    </Label>
                  </div>
                </div>

                <div className="border-t-2 pt-8 space-y-6">
                  <h3 className="text-2xl font-bold text-gray-900">Select a Standard Template</h3>
                  <p className="text-gray-600 text-base">Choose a standard and load its grades to get started</p>
                  <div className="grid grid-cols-3 gap-6">
                    {(['cbse', 'state', 'icse'] as const).map((scale) => (
                      <button
                        key={scale}
                        type="button"
                        onClick={() => {
                          setSelectedScale(scale);
                          setTimeout(() => handleLoadScale(), 0);
                        }}
                        className={`h-auto py-8 flex flex-col items-center justify-center gap-4 text-lg rounded-lg border-2 transition-all transform hover:scale-105 ${
                          selectedScale === scale
                            ? 'border-blue-500 bg-blue-50 shadow-md'
                            : 'border-gray-300 bg-white hover:border-blue-400'
                        }`}
                      >
                        <div className="text-5xl">
                          {scale === 'cbse' && '🏫'}
                          {scale === 'state' && '🏛️'}
                          {scale === 'icse' && '📚'}
                        </div>
                        <div className="text-center">
                          <div className="font-bold text-lg">
                            {scale === 'cbse' && 'CBSE'}
                            {scale === 'state' && 'State Board'}
                            {scale === 'icse' && 'ICSE'}
                          </div>
                          <div className="text-sm opacity-75">
                            {scale === 'cbse' && '8 Grades'}
                            {scale === 'state' && '6 Grades'}
                            {scale === 'icse' && '7 Grades'}
                          </div>
                          <div className="text-xs text-blue-600 font-semibold mt-2">
                            {selectedScale === scale ? '✓ Loaded' : 'Click to load'}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {gradeRanges.length > 0 && (
                  <div className="border-t-2 pt-8 space-y-6">
                    <h3 className="text-2xl font-bold text-gray-900">Preview</h3>
                    <div className="border-2 rounded-lg overflow-hidden bg-white">
                      <Table>
                        <TableHeader className="bg-gray-100">
                          <TableRow>
                            <TableHead className="font-bold text-base">Grade</TableHead>
                            <TableHead className="font-bold text-base">Range</TableHead>
                            <TableHead className="font-bold text-base">Points</TableHead>
                            <TableHead className="font-bold text-base">Description</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {gradeRanges.map((range, idx) => (
                            <TableRow key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                              <TableCell className="font-bold text-xl py-3">{range.grade}</TableCell>
                              <TableCell className="py-3">{range.minMarks}% - {range.maxMarks}%</TableCell>
                              <TableCell className="font-semibold py-3">{range.gradePoint}</TableCell>
                              <TableCell className="py-3">{range.description || '-'}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* CUSTOM MODE */}
              <TabsContent value="custom" className="space-y-8 px-8 pb-8 mt-0">
                <div className="space-y-6">
                  <h3 className="text-2xl font-bold text-gray-900">System Information</h3>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <Label className="text-base font-semibold">System Name</Label>
                      <Input
                        placeholder="e.g., My Custom Grades"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="h-12 text-base"
                      />
                    </div>
                    <div className="space-y-3">
                      <Label className="text-base font-semibold">Code</Label>
                      <Input
                        placeholder="e.g., CUSTOM"
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        className="h-12 text-base"
                      />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <Label className="text-base font-semibold">Description</Label>
                    <Textarea
                      placeholder="Describe your custom grading system..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="h-20 text-base resize-none"
                    />
                  </div>
                  <div className="flex items-center space-x-3 pt-4">
                    <input
                      type="checkbox"
                      id="custom-default"
                      checked={isDefault}
                      onChange={(e) => setIsDefault(e.target.checked)}
                      className="w-6 h-6 rounded"
                    />
                    <Label htmlFor="custom-default" className="text-base font-medium cursor-pointer">
                      Set as school default
                    </Label>
                  </div>
                </div>

                <div className="border-t-2 pt-8 space-y-6">
                  <div className="flex justify-between items-center gap-4">
                    <div className="flex-grow">
                      <h3 className="text-2xl font-bold text-gray-900">Define Grade Tiers</h3>
                      <p className="text-gray-600 text-sm mt-1">Manually add each grade tier with custom ranges and points</p>
                    </div>
                    <Button
                      type="button"
                      variant="default"
                      size="lg"
                      onClick={handleAddGradeRange}
                      className="h-12 px-8 text-base whitespace-nowrap"
                    >
                      <Plus className="h-5 w-5 mr-2" />
                      Add Tier
                    </Button>
                  </div>

                  <div className="space-y-5 bg-gray-50 border-2 rounded-xl p-8 max-h-96 overflow-y-auto">
                    {gradeRanges.length === 0 ? (
                      <div className="text-center py-16">
                        <div className="text-5xl mb-4">📝</div>
                        <p className="text-lg font-medium text-gray-700">No grades defined yet</p>
                        <p className="text-gray-600 mt-2">Click "Add Grade Tier" to start creating</p>
                      </div>
                    ) : (
                      gradeRanges.map((range, idx) => (
                        <div
                          key={range.key}
                          className="bg-white border-3 border-gray-300 rounded-xl p-8 space-y-6 hover:border-blue-400 transition-colors"
                        >
                          <div className="flex justify-between items-center mb-4">
                            <h4 className="text-xl font-bold text-gray-800">Grade Tier #{idx + 1}</h4>
                            <Button
                              type="button"
                              variant="ghost"
                              size="lg"
                              onClick={() => handleRemoveGradeRange(range.key)}
                              className="h-10 w-10 p-0 text-red-600 hover:bg-red-100"
                            >
                              <Trash2 className="h-5 w-5" />
                            </Button>
                          </div>

                          <div className="grid grid-cols-4 gap-6">
                            <div className="space-y-2">
                              <Label className="text-sm font-bold">Grade Letter</Label>
                              <p className="text-xs text-gray-500">e.g., A, A+, B</p>
                              <Input
                                placeholder="A, B, C, etc."
                                value={range.grade}
                                onChange={(e) =>
                                  handleUpdateGradeRange(range.key, 'grade', e.target.value)
                                }
                                className="h-12 text-base text-center font-bold text-xl"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-sm font-bold">Min %</Label>
                              <p className="text-xs text-gray-500">Starting %</p>
                              <Input
                                type="number"
                                min="0"
                                max="100"
                                value={range.minMarks}
                                onChange={(e) =>
                                  handleUpdateGradeRange(
                                    range.key,
                                    'minMarks',
                                    parseInt(e.target.value) || 0
                                  )
                                }
                                className="h-12 text-base text-center font-semibold"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-sm font-bold">Max %</Label>
                              <p className="text-xs text-gray-500">Ending %</p>
                              <Input
                                type="number"
                                min="0"
                                max="100"
                                value={range.maxMarks}
                                onChange={(e) =>
                                  handleUpdateGradeRange(
                                    range.key,
                                    'maxMarks',
                                    parseInt(e.target.value) || 100
                                  )
                                }
                                className="h-12 text-base text-center font-semibold"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-sm font-bold">Points</Label>
                              <p className="text-xs text-gray-500">GPA/Points</p>
                              <Input
                                type="number"
                                step="0.1"
                                value={range.gradePoint}
                                onChange={(e) =>
                                  handleUpdateGradeRange(
                                    range.key,
                                    'gradePoint',
                                    parseFloat(e.target.value) || 0
                                  )
                                }
                                className="h-12 text-base text-center font-semibold"
                              />
                            </div>
                          </div>

                          <div className="space-y-2 pt-4 border-t-2">
                            <Label className="text-sm font-bold">Description (Optional)</Label>
                            <Input
                              placeholder="e.g., Excellent Performance, Very Good, etc."
                              value={range.description || ''}
                              onChange={(e) =>
                                handleUpdateGradeRange(range.key, 'description', e.target.value)
                              }
                              className="h-12 text-base"
                            />
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          <DialogFooter className="flex-shrink-0 border-t-2 pt-8 mt-8 gap-4 flex justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setModalOpen(false)}
              className="h-12 px-8 text-base"
            >
              Cancel
            </Button>
            <Button
              onClick={editingId ? handleSaveEdit : handleCreateDefinition}
              className="h-12 px-10 text-base font-semibold"
            >
              {editingId ? 'Save Changes' : 'Create System'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
