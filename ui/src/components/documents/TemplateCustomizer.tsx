
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Palette, Save, Eye, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CertificateTemplate {
  id: string;
  name: string;
  type: 'bonafide' | 'transfer' | 'character' | 'conduct';
  headerText: string;
  bodyTemplate: string;
  footerText: string;
  logoPosition: 'left' | 'center' | 'right';
  colors: {
    header: string;
    text: string;
    border: string;
  };
  fonts: {
    header: string;
    body: string;
  };
}

export function TemplateCustomizer() {
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [templates, setTemplates] = useState<CertificateTemplate[]>([
    {
      id: "TPL001",
      name: "Standard Bonafide Certificate",
      type: "bonafide",
      headerText: "BONAFIDE CERTIFICATE",
      bodyTemplate: "This is to certify that {student_name}, son/daughter of {guardian_name}, is a bonafide student of our school studying in Class {class} during the academic year {academic_year}.",
      footerText: "Principal\n{school_name}",
      logoPosition: "center",
      colors: {
        header: "#1f2937",
        text: "#374151",
        border: "#d1d5db"
      },
      fonts: {
        header: "Arial",
        body: "Times New Roman"
      }
    }
  ]);
  
  const [currentTemplate, setCurrentTemplate] = useState<CertificateTemplate | null>(null);
  const { toast } = useToast();

  const handleTemplateSelect = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    setCurrentTemplate(template || null);
    setSelectedTemplate(templateId);
  };

  const saveTemplate = () => {
    if (!currentTemplate) return;
    
    setTemplates(prev => prev.map(t => 
      t.id === currentTemplate.id ? currentTemplate : t
    ));
    
    toast({
      title: "Success",
      description: "Template saved successfully"
    });
  };

  const duplicateTemplate = () => {
    if (!currentTemplate) return;
    
    const newTemplate: CertificateTemplate = {
      ...currentTemplate,
      id: `TPL${Date.now()}`,
      name: `${currentTemplate.name} (Copy)`
    };
    
    setTemplates(prev => [...prev, newTemplate]);
    
    toast({
      title: "Success",
      description: "Template duplicated successfully"
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Template Customizer
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Select Template</Label>
              <Select value={selectedTemplate} onValueChange={handleTemplateSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose template to customize" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map(template => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {currentTemplate && (
              <Tabs defaultValue="content">
                <TabsList className="w-full flex">
                  <TabsTrigger value="content">Content</TabsTrigger>
                  <TabsTrigger value="styling">Styling</TabsTrigger>
                  <TabsTrigger value="layout">Layout</TabsTrigger>
                </TabsList>
                
                <TabsContent value="content" className="space-y-4">
                  <div>
                    <Label>Template Name</Label>
                    <Input 
                      value={currentTemplate.name}
                      onChange={(e) => setCurrentTemplate({
                        ...currentTemplate,
                        name: e.target.value
                      })}
                    />
                  </div>
                  
                  <div>
                    <Label>Header Text</Label>
                    <Input 
                      value={currentTemplate.headerText}
                      onChange={(e) => setCurrentTemplate({
                        ...currentTemplate,
                        headerText: e.target.value
                      })}
                    />
                  </div>
                  
                  <div>
                    <Label>Body Template</Label>
                    <Textarea 
                      value={currentTemplate.bodyTemplate}
                      onChange={(e) => setCurrentTemplate({
                        ...currentTemplate,
                        bodyTemplate: e.target.value
                      })}
                      rows={4}
                      placeholder="Use variables like {student_name}, {class}, etc."
                    />
                  </div>
                  
                  <div>
                    <Label>Footer Text</Label>
                    <Textarea 
                      value={currentTemplate.footerText}
                      onChange={(e) => setCurrentTemplate({
                        ...currentTemplate,
                        footerText: e.target.value
                      })}
                      rows={3}
                    />
                  </div>
                </TabsContent>
                
                <TabsContent value="styling" className="space-y-4">
                  <div>
                    <Label>Header Font</Label>
                    <Select 
                      value={currentTemplate.fonts.header}
                      onValueChange={(value) => setCurrentTemplate({
                        ...currentTemplate,
                        fonts: { ...currentTemplate.fonts, header: value }
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Arial">Arial</SelectItem>
                        <SelectItem value="Times New Roman">Times New Roman</SelectItem>
                        <SelectItem value="Helvetica">Helvetica</SelectItem>
                        <SelectItem value="Georgia">Georgia</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label>Body Font</Label>
                    <Select 
                      value={currentTemplate.fonts.body}
                      onValueChange={(value) => setCurrentTemplate({
                        ...currentTemplate,
                        fonts: { ...currentTemplate.fonts, body: value }
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Arial">Arial</SelectItem>
                        <SelectItem value="Times New Roman">Times New Roman</SelectItem>
                        <SelectItem value="Helvetica">Helvetica</SelectItem>
                        <SelectItem value="Georgia">Georgia</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label>Header Color</Label>
                      <Input 
                        type="color" 
                        value={currentTemplate.colors.header}
                        onChange={(e) => setCurrentTemplate({
                          ...currentTemplate,
                          colors: { ...currentTemplate.colors, header: e.target.value }
                        })}
                      />
                    </div>
                    <div>
                      <Label>Text Color</Label>
                      <Input 
                        type="color" 
                        value={currentTemplate.colors.text}
                        onChange={(e) => setCurrentTemplate({
                          ...currentTemplate,
                          colors: { ...currentTemplate.colors, text: e.target.value }
                        })}
                      />
                    </div>
                    <div>
                      <Label>Border Color</Label>
                      <Input 
                        type="color" 
                        value={currentTemplate.colors.border}
                        onChange={(e) => setCurrentTemplate({
                          ...currentTemplate,
                          colors: { ...currentTemplate.colors, border: e.target.value }
                        })}
                      />
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="layout" className="space-y-4">
                  <div>
                    <Label>Logo Position</Label>
                    <Select 
                      value={currentTemplate.logoPosition}
                      onValueChange={(value: 'left' | 'center' | 'right') => setCurrentTemplate({
                        ...currentTemplate,
                        logoPosition: value
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="left">Left</SelectItem>
                        <SelectItem value="center">Center</SelectItem>
                        <SelectItem value="right">Right</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </TabsContent>
              </Tabs>
            )}

            <div className="flex gap-2">
              <Button onClick={saveTemplate} disabled={!currentTemplate}>
                <Save className="h-4 w-4 mr-2" />
                Save Template
              </Button>
              <Button variant="outline" onClick={duplicateTemplate} disabled={!currentTemplate}>
                <Copy className="h-4 w-4 mr-2" />
                Duplicate
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Preview
            </CardTitle>
          </CardHeader>
          <CardContent>
            {currentTemplate ? (
              <div 
                className="p-6 border-2 rounded-lg bg-white text-black min-h-96"
                style={{ 
                  borderColor: currentTemplate.colors.border,
                  fontFamily: currentTemplate.fonts.body
                }}
              >
                <div className={`text-center mb-6 ${
                  currentTemplate.logoPosition === 'left' ? 'text-left' :
                  currentTemplate.logoPosition === 'right' ? 'text-right' : 'text-center'
                }`}>
                  <div className="w-16 h-16 bg-gray-200 rounded mx-auto mb-4"></div>
                  <h1 
                    className="text-2xl font-bold"
                    style={{ 
                      color: currentTemplate.colors.header,
                      fontFamily: currentTemplate.fonts.header
                    }}
                  >
                    {currentTemplate.headerText}
                  </h1>
                </div>
                
                <div 
                  className="text-justify leading-relaxed mb-8"
                  style={{ color: currentTemplate.colors.text }}
                >
                  {currentTemplate.bodyTemplate}
                </div>
                
                <div className="text-right">
                  <div className="whitespace-pre-line">
                    {currentTemplate.footerText}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-96 text-muted-foreground">
                Select a template to preview
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
