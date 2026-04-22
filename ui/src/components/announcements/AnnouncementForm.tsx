
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { CalendarIcon, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AnnouncementFormProps {
  onSubmit: (announcement: any) => void;
  onCancel: () => void;
}

export function AnnouncementForm({ onSubmit, onCancel }: AnnouncementFormProps) {
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    priority: "medium",
    targetAudience: [] as string[],
    scheduledDate: "",
    expiryDate: "",
    attachments: [] as File[]
  });
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.content) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    const announcement = {
      id: Date.now().toString(),
      ...formData,
      createdAt: new Date().toISOString(),
      status: formData.scheduledDate ? 'scheduled' : 'published',
      author: "Admin User"
    };

    onSubmit(announcement);
    toast({
      title: "Success",
      description: "Announcement created successfully"
    });
  };

  const handleAudienceChange = (audience: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      targetAudience: checked 
        ? [...prev.targetAudience, audience]
        : prev.targetAudience.filter(a => a !== audience)
    }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create New Announcement</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium">Title *</label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Enter announcement title"
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium">Content *</label>
            <Textarea
              value={formData.content}
              onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
              placeholder="Enter announcement content"
              rows={4}
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium">Priority</label>
            <Select value={formData.priority} onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium">Target Audience</label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {['students', 'parents', 'staff', 'all'].map((audience) => (
                <div key={audience} className="flex items-center space-x-2">
                  <Checkbox
                    id={audience}
                    checked={formData.targetAudience.includes(audience)}
                    onCheckedChange={(checked) => handleAudienceChange(audience, checked as boolean)}
                  />
                  <label htmlFor={audience} className="text-sm capitalize">{audience}</label>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Scheduled Date (Optional)</label>
              <Input
                type="datetime-local"
                value={formData.scheduledDate}
                onChange={(e) => setFormData(prev => ({ ...prev, scheduledDate: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Expiry Date (Optional)</label>
              <Input
                type="datetime-local"
                value={formData.expiryDate}
                onChange={(e) => setFormData(prev => ({ ...prev, expiryDate: e.target.value }))}
              />
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="submit">
              <Plus className="h-4 w-4 mr-2" />
              Create Announcement
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
