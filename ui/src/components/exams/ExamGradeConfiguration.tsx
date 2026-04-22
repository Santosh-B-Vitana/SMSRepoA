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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
  AlertCircle,
  Settings,
  Check,
  X,
} from 'lucide-react';
import gradeDefinitionService from '@/services/gradeDefinitionService';
import { examinationService } from '@/services/examinationService';
import {
  GradeDefinitionResponse,
  ExamGradeConfigurationResponse,
} from '@/services/api/gradeDefinitionApi';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ExamGradeConfigProps {
  examId: string;
  schoolId: string;
  onConfigured?: () => void;
}

export function ExamGradeConfiguration({
  examId,
  schoolId,
  onConfigured,
}: ExamGradeConfigProps) {
  const [definitions, setDefinitions] = useState<GradeDefinitionResponse[]>([]);
  const [selectedDefinitionId, setSelectedDefinitionId] = useState('');
  const [autoCalculate, setAutoCalculate] = useState(true);
  const [loading, setLoading] = useState(false);
  const [currentConfig, setCurrentConfig] = useState<ExamGradeConfigurationResponse | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadData();
  }, [examId]);

  const loadData = async () => {
    try {
      setError('');
      setLoading(true);

      // Load grade definitions
      const defsResponse = await gradeDefinitionService.getGradeDefinitions();
      setDefinitions(defsResponse.definitions);

      // Load current configuration
      const config = await gradeDefinitionService.getExamGradeConfig(examId);
      if (config) {
        setCurrentConfig(config);
        setSelectedDefinitionId(config.gradeDefinitionId);
        setAutoCalculate(config.autoCalculateGrades);
      } else {
        // Use default if available
        const defaultDef = await gradeDefinitionService.getDefaultGradeDefinition();
        if (defaultDef) {
          setSelectedDefinitionId(defaultDef.id);
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setError('');
      setSuccess('');
      setLoading(true);

      if (!selectedDefinitionId) {
        setError('Please select a grade definition');
        return;
      }

      if (currentConfig) {
        // Update existing
        await gradeDefinitionService.updateExamGradeConfig(examId, {
          gradeDefinitionId: selectedDefinitionId,
          autoCalculateGrades: autoCalculate,
        });
      } else {
        // Create new
        await gradeDefinitionService.configureExamGrading({
          schoolId,
          examId,
          gradeDefinitionId: selectedDefinitionId,
          autoCalculateGrades: autoCalculate,
        });
      }

      setSuccess('Grade configuration saved successfully');
      await loadData();
      onConfigured?.();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async () => {
    if (!confirm('Remove grade configuration from this exam?')) return;

    try {
      setError('');
      setSuccess('');
      setLoading(true);

      await gradeDefinitionService.removeExamGradeConfig(examId);
      setCurrentConfig(null);
      setSelectedDefinitionId('');
      setSuccess('Grade configuration removed');
      onConfigured?.();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to remove configuration');
    } finally {
      setLoading(false);
    }
  };

  const selectedDef = definitions.find((d) => d.id === selectedDefinitionId);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Configure Grading
        </CardTitle>
        <CardDescription>
          {currentConfig ? 'Update grading settings for this exam' : 'Set up grading for this exam'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="border-green-200 bg-green-50">
            <Check className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          {/* Grade Definition Selection */}
          <div>
            <Label htmlFor="grade-def">Select Grade Definition *</Label>
            <Select value={selectedDefinitionId} onValueChange={setSelectedDefinitionId}>
              <SelectTrigger id="grade-def">
                <SelectValue placeholder="Choose a grade definition" />
              </SelectTrigger>
              <SelectContent>
                {definitions.map((def) => (
                  <SelectItem key={def.id} value={def.id}>
                    {def.name} {def.isDefault ? '(Default)' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Auto-calculate toggle */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="auto-calc"
              checked={autoCalculate}
              onChange={(e) => setAutoCalculate(e.target.checked)}
              className="rounded"
            />
            <Label htmlFor="auto-calc" className="cursor-pointer">
              Auto-calculate grades for results based on marks
            </Label>
          </div>

          {/* Preview of selected definition */}
          {selectedDef && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-semibold mb-3">Grade Scale Preview</h4>
              <div className="grid grid-cols-2 gap-3">
                {selectedDef.gradeRanges.map((range) => (
                  <div key={range.id} className="text-sm">
                    <span className="font-medium">{range.grade}:</span>{' '}
                    {range.minMarks}% - {range.maxMarks}% ({range.gradePoint} pts)
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4">
            <Button
              onClick={handleSave}
              disabled={loading || !selectedDefinitionId}
              className="flex-1"
            >
              {loading ? 'Saving...' : 'Save Configuration'}
            </Button>
            {currentConfig && (
              <Button
                onClick={handleRemove}
                disabled={loading}
                variant="destructive"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Current Configuration Info */}
          {currentConfig && (
            <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg text-sm">
              <p className="text-blue-900">
                <strong>Current:</strong> {currentConfig.gradeDefinitionName} |
                Auto-calculate: {currentConfig.autoCalculateGrades ? 'Yes' : 'No'}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Component for displaying grade ranges in result entry
export function GradeRangeDisplay({ gradeDefinitionId }: { gradeDefinitionId: string }) {
  const [definition, setDefinition] = useState<GradeDefinitionResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDefinition();
  }, [gradeDefinitionId]);

  const loadDefinition = async () => {
    try {
      const def = await gradeDefinitionService.getGradeDefinitionById(
        gradeDefinitionId
      );
      setDefinition(def);
    } catch (error) {
      console.error('Failed to load grade definition:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !definition) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{definition.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {definition.gradeRanges.map((range) => (
            <div
              key={range.id}
              className="flex justify-between items-center p-2 bg-gray-50 rounded"
            >
              <div>
                <span className="font-bold text-lg">{range.grade}</span>
                <span className="text-sm text-gray-600 ml-2">
                  {range.minMarks}% - {range.maxMarks}%
                </span>
              </div>
              <span className="text-sm font-semibold">{range.gradePoint} pts</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
