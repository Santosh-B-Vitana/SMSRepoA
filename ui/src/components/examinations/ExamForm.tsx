
import { useState } from "react";
import { Plus, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

interface ExamFormData {
  name: string;
  class: string;
  subject: string;
  date: string;
  time: string;
  duration: string;
  maxMarks: number;
  instructions?: string;
}


interface ExamFormProps {
  onSubmit: (examData: ExamFormData) => void;
  onCancel?: () => void;
  initialData?: Partial<ExamFormData>;
}

export function ExamForm({ onSubmit, onCancel, initialData }: ExamFormProps) {
  const [formData, setFormData] = useState<ExamFormData>({
    name: initialData?.name || '',
    class: initialData?.class || '',
    subject: initialData?.subject || '',
    date: initialData?.date || '',
    time: initialData?.time || '',
    duration: initialData?.duration || '',
    maxMarks: initialData?.maxMarks ?? 100,
    instructions: initialData?.instructions || ''
  });

  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.class || !formData.subject || !formData.date || !formData.time) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    onSubmit(formData);
    toast({
      title: "Success",
      description: "Exam has been scheduled successfully."
    });
  };

  const updateField = (field: keyof ExamFormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Schedule New Exam
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="examName">Exam Name *</Label>
              <Input
                id="examName"
                value={formData.name}
                onChange={(e) => updateField('name', e.target.value)}
                placeholder="e.g. Mid-term Examination"
              />
            </div>
            <div>
              <Label htmlFor="subject">Subject *</Label>
              <Select value={formData.subject} onValueChange={(value) => updateField('subject', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mathematics">Mathematics</SelectItem>
                  <SelectItem value="english">English</SelectItem>
                  <SelectItem value="science">Science</SelectItem>
                  <SelectItem value="history">History</SelectItem>
                  <SelectItem value="geography">Geography</SelectItem>
                  <SelectItem value="physics">Physics</SelectItem>
                  <SelectItem value="chemistry">Chemistry</SelectItem>
                  <SelectItem value="biology">Biology</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="class">Class *</Label>
              <Select value={formData.class} onValueChange={(value) => updateField('class', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({length: 12}, (_, i) => (
                    <SelectItem key={i+1} value={String(i+1)}>Class {i+1}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="date">Date *</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => updateField('date', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="time">Time *</Label>
              <Input
                id="time"
                type="time"
                value={formData.time}
                onChange={(e) => updateField('time', e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="duration">Duration</Label>
              <Select value={formData.duration} onValueChange={(value) => updateField('duration', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select duration" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1 hour">1 hour</SelectItem>
                  <SelectItem value="1.5 hours">1.5 hours</SelectItem>
                  <SelectItem value="2 hours">2 hours</SelectItem>
                  <SelectItem value="2.5 hours">2.5 hours</SelectItem>
                  <SelectItem value="3 hours">3 hours</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="maxMarks">Maximum Marks</Label>
              <Input
                id="maxMarks"
                type="number"
                value={formData.maxMarks}
                onChange={(e) => updateField('maxMarks', parseInt(e.target.value) || 0)}
                min="1"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="instructions">Exam Instructions (Optional)</Label>
            <Textarea
              id="instructions"
              value={formData.instructions}
              onChange={(e) => updateField('instructions', e.target.value)}
              placeholder="Enter any special instructions for the exam"
              rows={3}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="submit">
              <Plus className="h-4 w-4 mr-2" />
              Schedule Exam
            </Button>
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
