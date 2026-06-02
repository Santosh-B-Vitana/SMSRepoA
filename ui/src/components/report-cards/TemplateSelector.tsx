'use client';

import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, Eye, Palette } from 'lucide-react';
import { reportCardDocumentsApi, TEMPLATE_STYLES, type TemplatePreviewResponse } from '@/services/api/reportCardsApi';
import { cn } from '@/lib/utils';

interface TemplateSelectorProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function TemplateSelector({ value, onChange, className }: TemplateSelectorProps) {
  const { data: gallery = [], isLoading } = useQuery({
    queryKey: ['report-card-template-gallery'],
    queryFn: () => reportCardDocumentsApi.getTemplateGallery(),
    staleTime: Infinity,
  });

  // Merge fetched gallery with static fallbacks
  const templates: TemplatePreviewResponse[] = gallery.length > 0
    ? gallery
    : TEMPLATE_STYLES.map(t => ({
        templateStyle: t.value,
        displayName: t.label,
        description: '',
        boardCompatibility: '',
        primaryColor: t.color,
        previewImageUrl: '',
        sampleHtml: '',
      }));

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center gap-2 mb-1">
        <Palette className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-semibold text-foreground">Choose Report Card Template</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
        {templates.map(t => (
          <TemplateCard
            key={t.templateStyle}
            template={t}
            isSelected={value === t.templateStyle}
            onSelect={() => onChange(t.templateStyle)}
          />
        ))}
      </div>
    </div>
  );
}

interface TemplateCardProps {
  template: TemplatePreviewResponse;
  isSelected: boolean;
  onSelect: () => void;
}

function TemplateCard({ template, isSelected, onSelect }: TemplateCardProps) {
  return (
    <Card
      className={cn(
        'cursor-pointer transition-all hover:shadow-md relative overflow-hidden',
        isSelected
          ? 'ring-2 ring-offset-2 shadow-md'
          : 'hover:ring-1 hover:ring-muted-foreground/30'
      )}
      style={isSelected ? { ringColor: template.primaryColor } : undefined}
      onClick={onSelect}
    >
      {isSelected && (
        <div
          className="absolute top-2 right-2 z-10 rounded-full"
          style={{ color: template.primaryColor }}
        >
          <CheckCircle2 className="h-5 w-5 fill-white" />
        </div>
      )}

      {/* Mini preview */}
      <div
        className="h-24 flex items-stretch overflow-hidden rounded-t-md"
        style={{ borderBottom: `3px solid ${template.primaryColor}` }}
      >
        {template.sampleHtml ? (
          <div
            className="w-full text-xs overflow-hidden scale-75 origin-top-left"
            style={{ width: '133%', height: '133%' }}
            dangerouslySetInnerHTML={{ __html: template.sampleHtml }}
          />
        ) : (
          <div
            className="w-full flex items-center justify-center text-white font-bold text-sm"
            style={{ background: template.primaryColor }}
          >
            {template.displayName}
          </div>
        )}
      </div>

      <CardHeader className="px-3 py-2 pb-1">
        <CardTitle className="text-xs font-bold leading-tight" style={{ color: template.primaryColor }}>
          {template.displayName}
        </CardTitle>
        {template.boardCompatibility && (
          <Badge variant="secondary" className="text-[9px] px-1.5 py-0 w-fit mt-0.5">
            {template.boardCompatibility}
          </Badge>
        )}
      </CardHeader>

      {template.description && (
        <CardContent className="px-3 pb-3 pt-0">
          <p className="text-[10px] text-muted-foreground leading-snug line-clamp-2">
            {template.description}
          </p>
        </CardContent>
      )}
    </Card>
  );
}
