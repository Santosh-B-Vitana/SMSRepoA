import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ExamGradeConfiguration } from '@/components/exams/ExamGradeConfiguration';
import gradeDefinitionService from '@/services/gradeDefinitionService';
import { GradeDefinitionResponse } from '@/services/api/gradeDefinitionApi';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { InfoIcon } from 'lucide-react';

interface ExamGradingSetupProps {
  examId: string;
  schoolId: string;
  examName?: string;
  onGradingConfigured?: () => void;
}

/**
 * Component for setting up grading during exam creation/editing
 * Can be embedded in exam form or shown as a separate step
 */
export function ExamGradingSetup({
  examId,
  schoolId,
  examName,
  onGradingConfigured,
}: ExamGradingSetupProps) {
  const [defaultDefinition, setDefaultDefinition] = useState<GradeDefinitionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [indianStandards, setIndianStandards] = useState<string[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const defaultDef = await gradeDefinitionService.getDefaultGradeDefinition();
      setDefaultDefinition(defaultDef);
      
      const standards = Object.keys(gradeDefinitionService.getIndianGradingStandards());
      setIndianStandards(standards);
    } catch (error) {
      console.error('Failed to load grading data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Loading grading configuration...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Info Alert */}
      <Alert>
        <InfoIcon className="h-4 w-4" />
        <AlertDescription>
          Configure grading for <strong>{examName || 'this exam'}</strong>. 
          Grades will auto-calculate based on marks if enabled.
        </AlertDescription>
      </Alert>

      {/* Configuration Card */}
      <ExamGradeConfiguration
        examId={examId}
        schoolId={schoolId}
        onConfigured={onGradingConfigured}
      />

      {/* Quick Info */}
      {defaultDefinition && (
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-base">
              Default Grading System: {defaultDefinition.name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-700 mb-3">
              Your school's default grading system is already applied. You can:
            </p>
            <ul className="text-sm space-y-1 text-gray-700">
              <li>✓ Keep this grading system</li>
              <li>✓ Switch to a different standard</li>
              <li>✓ Enable/disable auto-calculation</li>
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Available Standards Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Available Grading Standards</CardTitle>
          <CardDescription>
            All Indian and international standards are pre-configured
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-3 border rounded bg-amber-50">
              <div className="font-semibold text-sm mb-1">🎓 CBSE</div>
              <p className="text-xs text-gray-600">
                Central Board - 8 grades (A+ to E) with 10-point scale
              </p>
            </div>
            <div className="p-3 border rounded bg-green-50">
              <div className="font-semibold text-sm mb-1">🏛️ State Board</div>
              <p className="text-xs text-gray-600">
                State Board - 6 grades (A to F) with 9-point scale
              </p>
            </div>
            <div className="p-3 border rounded bg-blue-50">
              <div className="font-semibold text-sm mb-1">🌐 ICSE</div>
              <p className="text-xs text-gray-600">
                International Certificate - 7 grades (A* to F) with 10-point scale
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Modal component for selecting grading system during exam creation
 */
export function ExamGradingModal({
  examId,
  schoolId,
  examName,
  onConfirm,
}: ExamGradingSetupProps & { onConfirm?: () => void }) {
  return (
    <div className="space-y-4">
      <ExamGradingSetup
        examId={examId}
        schoolId={schoolId}
        examName={examName}
        onGradingConfigured={onConfirm}
      />
    </div>
  );
}

export default ExamGradingSetup;
