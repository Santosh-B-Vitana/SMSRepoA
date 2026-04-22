import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, BookOpen } from "lucide-react";

interface ClassAssignment {
  subject: string;
  class: string;
  section: string;
  period: string;
  room: string;
}

interface WeeklyScheduleProps {
  staffId: string;
}

export function WeeklySchedule({ staffId }: WeeklyScheduleProps) {
  // Mock assigned classes data - in real app, this would be fetched based on staffId
  const assignedClasses: ClassAssignment[] = [
    {
      subject: "Mathematics",
      class: "10",
      section: "A",
      period: "1st Period",
      room: "Room 101"
    },
    {
      subject: "Mathematics", 
      class: "10",
      section: "B",
      period: "2nd Period", 
      room: "Room 102"
    },
    {
      subject: "Algebra",
      class: "9",
      section: "A", 
      period: "3rd Period",
      room: "Room 103"
    },
    {
      subject: "Mathematics",
      class: "8",
      section: "C",
      period: "5th Period",
      room: "Room 104"
    }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          Assigned Classes
        </CardTitle>
      </CardHeader>
      <CardContent>
        {assignedClasses.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No classes assigned to this staff member.
          </div>
        ) : (
          <div className="space-y-4">
            {assignedClasses.map((assignment, index) => (
              <div key={index} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold">{assignment.subject}</h3>
                    <Badge variant="secondary">
                      Class {assignment.class}-{assignment.section}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {assignment.period}
                    </span>
                    <span>{assignment.room}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}