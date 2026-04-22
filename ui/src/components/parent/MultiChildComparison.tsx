import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Users, TrendingUp, Calendar, Award } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface Child {
  id: string;
  name: string;
  class: string;
  rollNo: string;
  attendance: number;
  performance: string;
  averageMarks: number;
  rank: number;
  totalStudents: number;
}

interface MultiChildComparisonProps {
  children: Child[];
}

export function MultiChildComparison({ children }: MultiChildComparisonProps) {
  const [selectedChildren, setSelectedChildren] = useState<string[]>(
    children.slice(0, 2).map(c => c.id)
  );

  const compareChildren = children.filter(c => selectedChildren.includes(c.id));

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          Multi-Child Comparison
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Child Selectors */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[0, 1].map((index) => (
            <div key={index}>
              <label className="text-sm font-medium mb-2 block">
                Select Child {index + 1}
              </label>
              <Select
                value={selectedChildren[index] || ""}
                onValueChange={(value) => {
                  const newSelection = [...selectedChildren];
                  newSelection[index] = value;
                  setSelectedChildren(newSelection);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a child" />
                </SelectTrigger>
                <SelectContent>
                  {children.map((child) => (
                    <SelectItem key={child.id} value={child.id}>
                      {child.name} - {child.class}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>

        {/* Comparison Grid */}
        {compareChildren.length >= 2 && (
          <div className="space-y-4">
            {/* Attendance Comparison */}
            <div className="p-4 border rounded-lg bg-card/50">
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="h-4 w-4 text-primary" />
                <h3 className="font-semibold">Attendance</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {compareChildren.map((child) => (
                  <div key={child.id} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">{child.name}</span>
                      <Badge variant={child.attendance >= 90 ? "default" : "secondary"}>
                        {child.attendance}%
                      </Badge>
                    </div>
                    <Progress value={child.attendance} className="h-2" />
                  </div>
                ))}
              </div>
            </div>

            {/* Performance Comparison */}
            <div className="p-4 border rounded-lg bg-card/50">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="h-4 w-4 text-primary" />
                <h3 className="font-semibold">Academic Performance</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {compareChildren.map((child) => (
                  <div key={child.id} className="space-y-2">
                    <div className="text-sm font-medium">{child.name}</div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Average Marks</span>
                        <span className="font-semibold">{child.averageMarks}%</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Performance</span>
                        <Badge variant="outline">{child.performance}</Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Rank Comparison */}
            <div className="p-4 border rounded-lg bg-card/50">
              <div className="flex items-center gap-2 mb-4">
                <Award className="h-4 w-4 text-primary" />
                <h3 className="font-semibold">Class Rank</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {compareChildren.map((child) => (
                  <div key={child.id} className="text-center p-3 bg-primary/5 rounded-lg">
                    <div className="text-sm font-medium mb-1">{child.name}</div>
                    <div className="text-2xl font-bold text-primary">#{child.rank}</div>
                    <div className="text-xs text-muted-foreground">
                      out of {child.totalStudents}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {compareChildren.length < 2 && (
          <div className="text-center py-8 text-muted-foreground">
            Please select two children to compare
          </div>
        )}
      </CardContent>
    </Card>
  );
}
