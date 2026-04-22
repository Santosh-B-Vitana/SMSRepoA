import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, Circle, Clock } from "lucide-react";

interface ApplicationStage {
  stage: string;
  status: 'completed' | 'current' | 'pending';
  date?: string;
}

interface Application {
  id: string;
  studentName: string;
  appliedClass: string;
  stages: ApplicationStage[];
}

export function ApplicationTrackingSystem() {
  const [applications] = useState<Application[]>([
    {
      id: "ADM001",
      studentName: "Ananya Sharma",
      appliedClass: "Grade 6",
      stages: [
        { stage: "Application Submitted", status: "completed", date: "2024-01-15" },
        { stage: "Document Verification", status: "completed", date: "2024-01-18" },
        { stage: "Entrance Test", status: "current" },
        { stage: "Interview", status: "pending" },
        { stage: "Final Decision", status: "pending" }
      ]
    }
  ]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Application Tracking</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {applications.map((app) => (
          <div key={app.id} className="space-y-4">
            <div>
              <h3 className="font-semibold">{app.studentName}</h3>
              <p className="text-sm text-muted-foreground">Application ID: {app.id}</p>
            </div>

            <div className="space-y-3">
              {app.stages.map((stage, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className="mt-1">
                    {stage.status === 'completed' ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : stage.status === 'current' ? (
                      <Clock className="h-5 w-5 text-blue-600" />
                    ) : (
                      <Circle className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{stage.stage}</p>
                    {stage.date && (
                      <p className="text-sm text-muted-foreground">{stage.date}</p>
                    )}
                    {stage.status === 'current' && (
                      <Badge variant="secondary" className="mt-1">In Progress</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
