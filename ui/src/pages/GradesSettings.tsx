import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { GradeDefinitionManagement } from '@/components/exams/GradeDefinitionManagement';

interface GradesSettingsPageProps {
  schoolId: string;
}

/**
 * Grades Settings Page
 * Access point for managing all grading-related configurations
 * - Grade Definitions (Indian Standards: CBSE, State, ICSE + Custom)
 * - Default Grading System
 * - Grade Bands and Ranges
 */
export function GradesSettingsPage({ schoolId }: GradesSettingsPageProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Grading System Settings</h1>
        <p className="text-gray-600 mt-2">
          Configure grading standards and create custom grade bands for your school
        </p>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="definitions" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="definitions">Grade Definitions</TabsTrigger>
          <TabsTrigger value="guide">Guide & Standards</TabsTrigger>
        </TabsList>

        {/* Grade Definitions Tab */}
        <TabsContent value="definitions" className="space-y-4">
          <GradeDefinitionManagement schoolId={schoolId} />
        </TabsContent>

        {/* Guide & Standards Tab */}
        <TabsContent value="guide" className="space-y-4">
          <div className="grid gap-6">
            {/* Indian Standards Reference */}
            <Card>
              <CardHeader>
                <CardTitle>Indian Educational Standards</CardTitle>
                <CardDescription>
                  Default grading systems used in Indian schools
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* CBSE */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">
                    🎓 CBSE (Central Board of Secondary Education)
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600 mb-2">
                        Used in schools affiliated with CBSE across India. Uses 10-point grading scale with 8 grades.
                      </p>
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2">Grade</th>
                            <th className="text-center py-2">Range %</th>
                            <th className="text-center py-2">Points</th>
                          </tr>
                        </thead>
                        <tbody className="text-xs">
                          <tr className="border-b">
                            <td className="py-1 font-bold text-green-600">A+</td>
                            <td className="text-center">91-100</td>
                            <td className="text-center">10</td>
                          </tr>
                          <tr className="border-b">
                            <td className="py-1 font-bold text-green-500">A</td>
                            <td className="text-center">81-90</td>
                            <td className="text-center">9</td>
                          </tr>
                          <tr className="border-b">
                            <td className="py-1 font-bold text-blue-600">B+</td>
                            <td className="text-center">71-80</td>
                            <td className="text-center">8</td>
                          </tr>
                          <tr className="border-b">
                            <td className="py-1 font-bold text-blue-500">B</td>
                            <td className="text-center">61-70</td>
                            <td className="text-center">7</td>
                          </tr>
                          <tr className="border-b">
                            <td className="py-1 font-bold text-yellow-600">C+</td>
                            <td className="text-center">51-60</td>
                            <td className="text-center">6</td>
                          </tr>
                          <tr className="border-b">
                            <td className="py-1 font-bold text-yellow-500">C</td>
                            <td className="text-center">41-50</td>
                            <td className="text-center">5</td>
                          </tr>
                          <tr className="border-b">
                            <td className="py-1 font-bold text-orange-600">D</td>
                            <td className="text-center">33-40</td>
                            <td className="text-center">4</td>
                          </tr>
                          <tr>
                            <td className="py-1 font-bold text-red-600">E</td>
                            <td className="text-center">0-32</td>
                            <td className="text-center">0</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* State Board */}
                <div className="pt-4 border-t">
                  <h3 className="text-lg font-semibold mb-3">
                    🏛️ State Board (General Standards)
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600 mb-2">
                        Used in state board schools. Simpler 6-point grading scale based on percentage bands.
                      </p>
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2">Grade</th>
                            <th className="text-center py-2">Range %</th>
                            <th className="text-center py-2">Points</th>
                          </tr>
                        </thead>
                        <tbody className="text-xs">
                          <tr className="border-b">
                            <td className="py-1 font-bold text-green-600">A</td>
                            <td className="text-center">80-100</td>
                            <td className="text-center">9</td>
                          </tr>
                          <tr className="border-b">
                            <td className="py-1 font-bold text-blue-600">B</td>
                            <td className="text-center">70-79</td>
                            <td className="text-center">7</td>
                          </tr>
                          <tr className="border-b">
                            <td className="py-1 font-bold text-yellow-600">C</td>
                            <td className="text-center">60-69</td>
                            <td className="text-center">5</td>
                          </tr>
                          <tr className="border-b">
                            <td className="py-1 font-bold text-orange-600">D</td>
                            <td className="text-center">50-59</td>
                            <td className="text-center">3</td>
                          </tr>
                          <tr className="border-b">
                            <td className="py-1 font-bold text-orange-700">E</td>
                            <td className="text-center">35-49</td>
                            <td className="text-center">1</td>
                          </tr>
                          <tr>
                            <td className="py-1 font-bold text-red-600">F</td>
                            <td className="text-center">0-34</td>
                            <td className="text-center">0</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* ICSE */}
                <div className="pt-4 border-t">
                  <h3 className="text-lg font-semibold mb-3">
                    🌐 ICSE (Indian Certificate of Secondary Education)
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600 mb-2">
                        International standard used in ICSE affiliated schools. Uses 10-point scale with 7 grades.
                      </p>
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2">Grade</th>
                            <th className="text-center py-2">Range %</th>
                            <th className="text-center py-2">Points</th>
                          </tr>
                        </thead>
                        <tbody className="text-xs">
                          <tr className="border-b">
                            <td className="py-1 font-bold text-green-600">A*</td>
                            <td className="text-center">90-100</td>
                            <td className="text-center">10</td>
                          </tr>
                          <tr className="border-b">
                            <td className="py-1 font-bold text-green-500">A</td>
                            <td className="text-center">80-89</td>
                            <td className="text-center">9</td>
                          </tr>
                          <tr className="border-b">
                            <td className="py-1 font-bold text-blue-600">B</td>
                            <td className="text-center">70-79</td>
                            <td className="text-center">8</td>
                          </tr>
                          <tr className="border-b">
                            <td className="py-1 font-bold text-blue-500">C</td>
                            <td className="text-center">60-69</td>
                            <td className="text-center">7</td>
                          </tr>
                          <tr className="border-b">
                            <td className="py-1 font-bold text-yellow-600">D</td>
                            <td className="text-center">50-59</td>
                            <td className="text-center">6</td>
                          </tr>
                          <tr className="border-b">
                            <td className="py-1 font-bold text-yellow-500">E</td>
                            <td className="text-center">40-49</td>
                            <td className="text-center">5</td>
                          </tr>
                          <tr>
                            <td className="py-1 font-bold text-red-600">F</td>
                            <td className="text-center">0-39</td>
                            <td className="text-center">0</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* How to Use */}
            <Card>
              <CardHeader>
                <CardTitle>How to Set Up Grading</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Step 1: Choose a Standard</h4>
                  <p className="text-sm text-gray-700">
                    Go to the "Grade Definitions" tab and click "Create Grade Definition". Select one of the Indian standards (CBSE, State, ICSE) or create a custom system.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Step 2: Customize (Optional)</h4>
                  <p className="text-sm text-gray-700">
                    Modify the grade ranges, bands, or grade points to match your school's requirements. Add or remove grades as needed.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Step 3: Set as Default</h4>
                  <p className="text-sm text-gray-700">
                    Click "Set Default" on your chosen grade definition. This will be used for all new exams by default.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Step 4: Apply to Exams</h4>
                  <p className="text-sm text-gray-700">
                    When creating exams, select the appropriate grade definition. You can also override it per exam if needed.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Key Features */}
            <Card>
              <CardHeader>
                <CardTitle>Key Features</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-3">
                  <span className="text-green-600 font-bold">✓</span>
                  <p className="text-sm">
                    <strong>Indian Standards:</strong> Pre-configured CBSE, State Board, and ICSE grading systems
                  </p>
                </div>
                <div className="flex gap-3">
                  <span className="text-green-600 font-bold">✓</span>
                  <p className="text-sm">
                    <strong>Custom Grades:</strong> Create custom grade bands and ranges to match your school's policy
                  </p>
                </div>
                <div className="flex gap-3">
                  <span className="text-green-600 font-bold">✓</span>
                  <p className="text-sm">
                    <strong>Grade Points:</strong> Each grade has associated points for GPA/CGPA calculations
                  </p>
                </div>
                <div className="flex gap-3">
                  <span className="text-green-600 font-bold">✓</span>
                  <p className="text-sm">
                    <strong>Auto-Calculation:</strong> Grades automatically calculate based on marks when enabled
                  </p>
                </div>
                <div className="flex gap-3">
                  <span className="text-green-600 font-bold">✓</span>
                  <p className="text-sm">
                    <strong>Multi-Standard Support:</strong> Use different grading standards for different classes/streams
                  </p>
                </div>
                <div className="flex gap-3">
                  <span className="text-green-600 font-bold">✓</span>
                  <p className="text-sm">
                    <strong>Report Integration:</strong> Grades appear on report cards, transcripts, and performance reports
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default GradesSettingsPage;
