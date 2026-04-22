import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Mail, MessageSquare, Plus, Edit, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Template {
  id: string;
  name: string;
  type: "email" | "sms";
  category: string;
  subject?: string;
  body: string;
  variables: string[];
}

export function CommunicationTemplateManager() {
  const [templates, setTemplates] = useState<Template[]>([
    {
      id: "1",
      name: "Fee Reminder",
      type: "email",
      category: "fees",
      subject: "Fee Payment Reminder - {{student_name}}",
      body: "Dear {{parent_name}},\n\nThis is a reminder that the fee payment of ₹{{amount}} is due on {{due_date}} for {{student_name}}.\n\nPlease make the payment at your earliest convenience.\n\nThank you.",
      variables: ["student_name", "parent_name", "amount", "due_date"],
    },
    {
      id: "2",
      name: "Absence Alert",
      type: "sms",
      category: "attendance",
      body: "{{student_name}} was absent on {{date}}. Please contact school if any clarification needed.",
      variables: ["student_name", "date"],
    },
  ]);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const handleSave = () => {
    if (editingTemplate) {
      setTemplates(templates.map((t) => (t.id === editingTemplate.id ? editingTemplate : t)));
      toast.success("Template updated successfully");
    }
    setEditingTemplate(null);
    setIsCreating(false);
  };

  const handleCreate = () => {
    if (editingTemplate) {
      const newTemplate = { ...editingTemplate, id: Date.now().toString() };
      setTemplates([...templates, newTemplate]);
      toast.success("Template created successfully");
    }
    setEditingTemplate(null);
    setIsCreating(false);
  };

  const handleDelete = (id: string) => {
    setTemplates(templates.filter((t) => t.id !== id));
    toast.success("Template deleted");
  };

  const startCreate = () => {
    setEditingTemplate({
      id: "",
      name: "",
      type: "email",
      category: "general",
      body: "",
      variables: [],
    });
    setIsCreating(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Communication Templates</h2>
        <Button onClick={startCreate}>
          <Plus className="mr-2 h-4 w-4" />
          New Template
        </Button>
      </div>

      <Tabs defaultValue="email">
        <TabsList>
          <TabsTrigger value="email">
            <Mail className="mr-2 h-4 w-4" />
            Email Templates
          </TabsTrigger>
          <TabsTrigger value="sms">
            <MessageSquare className="mr-2 h-4 w-4" />
            SMS Templates
          </TabsTrigger>
        </TabsList>

        <TabsContent value="email" className="space-y-4">
          {templates
            .filter((t) => t.type === "email")
            .map((template) => (
              <Card key={template.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>{template.name}</CardTitle>
                      <Badge variant="secondary" className="mt-2">
                        {template.category}
                      </Badge>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditingTemplate(template)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(template.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Subject: {template.subject}</p>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {template.body}
                    </p>
                    <div className="flex gap-2 flex-wrap">
                      {template.variables.map((v) => (
                        <Badge key={v} variant="outline">
                          {`{{${v}}}`}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
        </TabsContent>

        <TabsContent value="sms" className="space-y-4">
          {templates
            .filter((t) => t.type === "sms")
            .map((template) => (
              <Card key={template.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>{template.name}</CardTitle>
                      <Badge variant="secondary" className="mt-2">
                        {template.category}
                      </Badge>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditingTemplate(template)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(template.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {template.body}
                    </p>
                    <div className="flex gap-2 flex-wrap">
                      {template.variables.map((v) => (
                        <Badge key={v} variant="outline">
                          {`{{${v}}}`}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
        </TabsContent>
      </Tabs>

      {editingTemplate && (
        <Card className="border-2 border-primary">
          <CardHeader>
            <CardTitle>{isCreating ? "Create New Template" : "Edit Template"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Template Name</Label>
                <Input
                  value={editingTemplate.name}
                  onChange={(e) =>
                    setEditingTemplate({ ...editingTemplate, name: e.target.value })
                  }
                  placeholder="Enter template name"
                />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={editingTemplate.type}
                  onValueChange={(value: "email" | "sms") =>
                    setEditingTemplate({ ...editingTemplate, type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="sms">SMS</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {editingTemplate.type === "email" && (
              <div className="space-y-2">
                <Label>Subject</Label>
                <Input
                  value={editingTemplate.subject || ""}
                  onChange={(e) =>
                    setEditingTemplate({ ...editingTemplate, subject: e.target.value })
                  }
                  placeholder="Email subject"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Message Body</Label>
              <Textarea
                value={editingTemplate.body}
                onChange={(e) =>
                  setEditingTemplate({ ...editingTemplate, body: e.target.value })
                }
                placeholder="Enter message content. Use {{variable_name}} for dynamic content."
                rows={6}
              />
            </div>

            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={editingTemplate.category}
                onValueChange={(value) =>
                  setEditingTemplate({ ...editingTemplate, category: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="fees">Fees</SelectItem>
                  <SelectItem value="attendance">Attendance</SelectItem>
                  <SelectItem value="exams">Examinations</SelectItem>
                  <SelectItem value="events">Events</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setEditingTemplate(null);
                  setIsCreating(false);
                }}
              >
                Cancel
              </Button>
              <Button onClick={isCreating ? handleCreate : handleSave}>
                {isCreating ? "Create" : "Save Changes"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
