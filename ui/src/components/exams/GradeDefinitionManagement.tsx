import React, { useState, useEffect } from 'react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertCircle,
  Plus,
  Edit2,
  Trash2,
  Check,
  Star,
} from 'lucide-react';
import gradeDefinitionService from '@/services/gradeDefinitionService';
import {
  GradeDefinitionResponse,
  CreateGradeDefinitionRequest,
  CreateGradeRangeRequest,
} from '@/services/api/gradeDefinitionApi';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface GradeDefinitionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  schoolId: string;
  defaultScaleType?: 'cbse' | 'state' | 'icse' | 'standard' | 'simple' | 'international';
}

interface GradeRangeRow extends CreateGradeRangeRequest {
  key: string;
}

export function GradeDefinitionModal({
  open,
  onOpenChange,
  onSuccess,
  schoolId,
  defaultScaleType = 'standard',
}: GradeDefinitionModalProps) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [gradeRanges, setGradeRanges] = useState<GradeRangeRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedScale, setSelectedScale] = useState(defaultScaleType);

  useEffect(() => {
    if (open) {
      loadStandardScale(selectedScale || 'cbse');
    }
  }, [open, selectedScale]);

  const loadStandardScale = (scaleType: string) => {
    const scales = gradeDefinitionService.getStandardGradingScales();
    let scale = (scales as any)[scaleType];
    
    // Handle Indian standards that have object format
    if (scaleType === 'cbse' || scaleType === 'state' || scaleType === 'icse') {
      if (scale && scale.ranges) {
        scale = scale.ranges;
        if (!name) setName(scaleType.toUpperCase());
      }
    }
    
    scale = scale || (scales.standard as any);
    setGradeRanges(
      scale.map((range: any, idx: number) => ({
        ...range,
        key: `${idx}-${Math.random()}`,
      }))
    );
  };

  const handleAddRange = () => {
    setGradeRanges([
      ...gradeRanges,
      {
        grade: '',
        minMarks: 0,
        maxMarks: 100,
        gradePoint: 0,
        displayOrder: gradeRanges.length + 1,
        key: `new-${Date.now()}`,
      },
    ]);
  };

  const handleUpdateRange = (key: string, field: string, value: any) => {
    setGradeRanges(
      gradeRanges.map((range) =>
        range.key === key ? { ...range, [field]: value } : range
      )
    );
  };

  const handleRemoveRange = (key: string) => {
    setGradeRanges(gradeRanges.filter((range) => range.key !== key));
  };

  const handleSubmit = async () => {
    try {
      setError('');
      setLoading(true);

      // Validate
      if (!name.trim()) {
        setError('Grade definition name is required');
        return;
      }

      if (gradeRanges.length === 0) {
        setError('At least one grade range is required');
        return;
      }

      // Validate ranges
      const rangesForValidation = gradeRanges.map(({ key, ...rest }) => rest);
      const validation = gradeDefinitionService.validateGradeRanges(
        rangesForValidation
      );
      if (!validation.valid) {
        setError(validation.error || 'Invalid grade ranges');
        return;
      }

      const payload: CreateGradeDefinitionRequest = {
        schoolId,
        name,
        code: code || undefined,
        description: description || undefined,
        isDefault,
        status: 'active',
        gradeRanges: rangesForValidation,
      };

      await gradeDefinitionService.createGradeDefinition(payload);

      // Reset form
      setName('');
      setCode('');
      setDescription('');
      setIsDefault(false);
      setError('');

      onOpenChange(false);
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create grade definition');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Grade Definition</DialogTitle>
          <DialogDescription>
            Define grading scales and ranges for your exams
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid gap-4">
            <div>
              <Label htmlFor="name">Grade Definition Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Standard Scale, International Scale"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="code">Code</Label>
                <Input
                  id="code"
                  placeholder="e.g., STD, INT"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                />
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isDefault}
                    onChange={(e) => setIsDefault(e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm">Set as default</span>
                </label>
              </div>
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                placeholder="Optional description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {/* Grade Ranges Section */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <Label>Grade Ranges *</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddRange}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Range
                </Button>
              </div>

              {/* Template Selection */}
              <div className="mb-4">
                <Label className="text-sm text-gray-600 mb-2 block">Indian Standards:</Label>
                <div className="flex flex-wrap gap-2 mb-4">
                  {['cbse', 'state', 'icse'].map((scale) => (
                    <Button
                      key={scale}
                      type="button"
                      variant={selectedScale === scale ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedScale(scale as 'cbse' | 'state' | 'icse' | 'standard' | 'simple' | 'international')}
                    >
                      {scale === 'cbse' && 'CBSE (Central Board)'}
                      {scale === 'state' && 'State Board'}
                      {scale === 'icse' && 'ICSE (Indian Certificate)'}
                    </Button>
                  ))}
                </div>

                <Label className="text-sm text-gray-600 mb-2 block">International Standards:</Label>
                <div className="flex flex-wrap gap-2">
                  {['standard', 'simple', 'international'].map((scale) => (
                    <Button
                      key={scale}
                      type="button"
                      variant={selectedScale === scale ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedScale(scale as 'cbse' | 'state' | 'icse' | 'standard' | 'simple' | 'international')}
                    >
                      {scale.charAt(0).toUpperCase() + scale.slice(1)}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Grade Ranges Table */}
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Grade</TableHead>
                      <TableHead>Min %</TableHead>
                      <TableHead>Max %</TableHead>
                      <TableHead>Points</TableHead>
                      <TableHead>Order</TableHead>
                      <TableHead className="w-10">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {gradeRanges.map((range) => (
                      <TableRow key={range.key}>
                        <TableCell>
                          <Input
                            value={range.grade}
                            onChange={(e) =>
                              handleUpdateRange(range.key, 'grade', e.target.value)
                            }
                            placeholder="A, B, C..."
                            className="w-20"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={range.minMarks}
                            onChange={(e) =>
                              handleUpdateRange(
                                range.key,
                                'minMarks',
                                parseFloat(e.target.value)
                              )
                            }
                            className="w-20"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={range.maxMarks}
                            onChange={(e) =>
                              handleUpdateRange(
                                range.key,
                                'maxMarks',
                                parseFloat(e.target.value)
                              )
                            }
                            className="w-20"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.1"
                            value={range.gradePoint}
                            onChange={(e) =>
                              handleUpdateRange(
                                range.key,
                                'gradePoint',
                                parseFloat(e.target.value)
                              )
                            }
                            className="w-16"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={range.displayOrder}
                            onChange={(e) =>
                              handleUpdateRange(
                                range.key,
                                'displayOrder',
                                parseInt(e.target.value)
                              )
                            }
                            className="w-16"
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveRange(range.key)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? 'Creating...' : 'Create Grade Definition'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Main Grade Definition Management Page
export function GradeDefinitionManagement({ schoolId }: { schoolId: string }) {
  const [definitions, setDefinitions] = useState<GradeDefinitionResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    loadDefinitions();
  }, []);

  const loadDefinitions = async () => {
    try {
      setLoading(true);
      const response = await gradeDefinitionService.getGradeDefinitions();
      setDefinitions(response.definitions);
    } catch (error) {
      console.error('Failed to load grade definitions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      await gradeDefinitionService.setAsDefault(id);
      await loadDefinitions();
    } catch (error) {
      console.error('Failed to set as default:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this grade definition?')) return;

    try {
      await gradeDefinitionService.deleteGradeDefinition(id);
      await loadDefinitions();
    } catch (error) {
      console.error('Failed to delete grade definition:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Grade Definitions</h1>
        <Button onClick={() => setModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Grade Definition
        </Button>
      </div>

      <GradeDefinitionModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSuccess={loadDefinitions}
        schoolId={schoolId}
      />

      {loading ? (
        <Card>
          <CardContent className="pt-6">Loading...</CardContent>
        </Card>
      ) : definitions.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center text-gray-500">
            No grade definitions yet. Create one to get started.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {definitions.map((def) => (
            <Card key={def.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {def.name}
                      {def.isDefault && (
                        <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                      )}
                    </CardTitle>
                    {def.description && (
                      <CardDescription>{def.description}</CardDescription>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {!def.isDefault && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSetDefault(def.id)}
                      >
                        <Check className="h-4 w-4 mr-2" />
                        Set Default
                      </Button>
                    )}
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(def.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Grade</TableHead>
                        <TableHead>Range %</TableHead>
                        <TableHead>Grade Points</TableHead>
                        <TableHead>Description</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {def.gradeRanges.map((range) => (
                        <TableRow key={range.id}>
                          <TableCell className="font-semibold">
                            {range.grade}
                          </TableCell>
                          <TableCell>
                            {range.minMarks}% - {range.maxMarks}%
                          </TableCell>
                          <TableCell>{range.gradePoint}</TableCell>
                          <TableCell>{range.description || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
