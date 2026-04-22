import { useState } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';

interface Step {
  id: string;
  label: string;
  completed?: boolean;
}

interface FormProgressProps {
  steps: Step[];
  currentStep: number;
  variant?: 'horizontal' | 'vertical';
  showPercentage?: boolean;
}

export function FormProgress({
  steps,
  currentStep,
  variant = 'horizontal',
  showPercentage = true,
}: FormProgressProps) {
  const progress = ((currentStep + 1) / steps.length) * 100;

  if (variant === 'vertical') {
    return (
      <div className="space-y-4">
        {showPercentage && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">{Math.round(progress)}%</span>
          </div>
        )}
        {steps.map((step, index) => (
          <div key={step.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors',
                  index < currentStep
                    ? 'bg-primary border-primary text-primary-foreground'
                    : index === currentStep
                    ? 'border-primary text-primary'
                    : 'border-muted text-muted-foreground'
                )}
              >
                {index < currentStep ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <span>{index + 1}</span>
                )}
              </div>
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    'w-0.5 h-12 mt-2',
                    index < currentStep ? 'bg-primary' : 'bg-muted'
                  )}
                />
              )}
            </div>
            <div className="flex-1 pt-1">
              <p
                className={cn(
                  'text-sm font-medium',
                  index <= currentStep
                    ? 'text-foreground'
                    : 'text-muted-foreground'
                )}
              >
                {step.label}
              </p>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {showPercentage && (
        <div className="flex justify-between text-sm mb-2">
          <span className="text-muted-foreground">
            Step {currentStep + 1} of {steps.length}
          </span>
          <span className="font-medium">{Math.round(progress)}%</span>
        </div>
      )}
      <Progress value={progress} className="h-2" />
      <div className="flex justify-between gap-2">
        {steps.map((step, index) => (
          <div key={step.id} className="flex-1 flex flex-col items-center gap-2">
            <div
              className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors',
                index < currentStep
                  ? 'bg-primary border-primary text-primary-foreground'
                  : index === currentStep
                  ? 'border-primary text-primary'
                  : 'border-muted text-muted-foreground'
              )}
            >
              {index < currentStep ? (
                <Check className="h-4 w-4" />
              ) : (
                <span className="text-sm">{index + 1}</span>
              )}
            </div>
            <p
              className={cn(
                'text-xs text-center',
                index <= currentStep
                  ? 'text-foreground font-medium'
                  : 'text-muted-foreground'
              )}
            >
              {step.label}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

// Hook for multi-step form management
export function useFormSteps(totalSteps: number) {
  const [currentStep, setCurrentStep] = useState(0);

  const nextStep = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const goToStep = (step: number) => {
    if (step >= 0 && step < totalSteps) {
      setCurrentStep(step);
    }
  };

  const reset = () => {
    setCurrentStep(0);
  };

  return {
    currentStep,
    nextStep,
    prevStep,
    goToStep,
    reset,
    isFirstStep: currentStep === 0,
    isLastStep: currentStep === totalSteps - 1,
    progress: ((currentStep + 1) / totalSteps) * 100,
  };
}
