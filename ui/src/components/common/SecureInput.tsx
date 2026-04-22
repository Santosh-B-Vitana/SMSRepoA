import React, { useState, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, Check, X, AlertTriangle, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { checkPasswordStrength, PasswordStrength, maskSensitiveData } from '@/utils/securityUtils';

interface SecureInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange'> {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  type?: 'text' | 'password' | 'email' | 'phone' | 'aadhaar' | 'pan' | 'account';
  showStrengthMeter?: boolean;
  showMaskedPreview?: boolean;
  error?: string;
  hint?: string;
  required?: boolean;
}

export function SecureInput({
  label,
  value,
  onChange,
  type = 'text',
  showStrengthMeter = false,
  showMaskedPreview = false,
  error,
  hint,
  required,
  className,
  id,
  ...props
}: SecureInputProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const inputId = id || `secure-input-${type}`;
  const isPasswordType = type === 'password';
  const isSensitiveType = ['aadhaar', 'pan', 'account', 'phone'].includes(type);

  const passwordStrength: PasswordStrength | null = 
    isPasswordType && showStrengthMeter && value.length > 0
      ? checkPasswordStrength(value)
      : null;

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    let newValue = e.target.value;

    // Auto-format based on type
    switch (type) {
      case 'phone':
        // Remove non-digits and limit to 10-12 characters
        newValue = newValue.replace(/\D/g, '').slice(0, 12);
        break;
      case 'aadhaar':
        // 12 digits only
        newValue = newValue.replace(/\D/g, '').slice(0, 12);
        break;
      case 'pan':
        // Uppercase alphanumeric, 10 characters
        newValue = newValue.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
        break;
      case 'account':
        // Digits only, max 18 characters
        newValue = newValue.replace(/\D/g, '').slice(0, 18);
        break;
    }

    onChange(newValue);
  }, [onChange, type]);

  const getInputType = (): string => {
    if (isPasswordType) {
      return showPassword ? 'text' : 'password';
    }
    if (isSensitiveType && !isFocused && value.length > 0) {
      return 'password';
    }
    if (type === 'email') return 'email';
    return 'text';
  };

  const getMaskedValue = (): string => {
    if (!showMaskedPreview || !value || isFocused) return '';
    if (isSensitiveType) {
      return maskSensitiveData(value, type as any);
    }
    return '';
  };

  return (
    <div className="space-y-2">
      {label && (
        <Label htmlFor={inputId} className="flex items-center gap-1.5">
          {isSensitiveType && <Shield className="h-3 w-3 text-muted-foreground" />}
          {label}
          {required && <span className="text-destructive">*</span>}
        </Label>
      )}
      
      <div className="relative">
        <Input
          id={inputId}
          type={getInputType()}
          value={value}
          onChange={handleChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
          className={cn(
            'pr-10',
            error && 'border-destructive focus:ring-destructive/20',
            className
          )}
          {...props}
        />

        {/* Password toggle */}
        {isPasswordType && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0 hover:bg-muted"
            onClick={() => setShowPassword(!showPassword)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Eye className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>
        )}

        {/* Sensitive data indicator */}
        {isSensitiveType && !isFocused && value.length > 0 && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2">
            <Shield className="h-4 w-4 text-primary" />
          </div>
        )}
      </div>

      {/* Masked preview */}
      {showMaskedPreview && getMaskedValue() && !isFocused && (
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <Shield className="h-3 w-3" />
          Stored as: {getMaskedValue()}
        </p>
      )}

      {/* Password strength meter */}
      {passwordStrength && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full transition-all duration-150"
                style={{
                  width: `${(passwordStrength.score / 4) * 100}%`,
                  backgroundColor: passwordStrength.color,
                }}
              />
            </div>
            <span 
              className="text-xs font-medium min-w-[80px]"
              style={{ color: passwordStrength.color }}
            >
              {passwordStrength.label}
            </span>
          </div>
          
          {passwordStrength.suggestions.length > 0 && (
            <ul className="space-y-1">
              {passwordStrength.suggestions.map((suggestion, i) => (
                <li key={i} className="text-xs text-muted-foreground flex items-center gap-1">
                  <X className="h-3 w-3 text-destructive" />
                  {suggestion}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Error message */}
      {error && (
        <p id={`${inputId}-error`} className="text-sm text-destructive flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          {error}
        </p>
      )}

      {/* Hint */}
      {hint && !error && (
        <p id={`${inputId}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
    </div>
  );
}

// Secure OTP Input
interface SecureOtpInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  autoFocus?: boolean;
}

export function SecureOtpInput({
  length = 6,
  value,
  onChange,
  error,
  autoFocus = false,
}: SecureOtpInputProps) {
  const handleChange = (index: number, char: string) => {
    if (!/^\d*$/.test(char)) return;
    
    const newValue = value.split('');
    newValue[index] = char;
    const updated = newValue.join('').slice(0, length);
    onChange(updated);

    // Auto-focus next input
    if (char && index < length - 1) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !value[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    onChange(pasted);
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2 justify-center">
        {Array.from({ length }).map((_, i) => (
          <Input
            key={i}
            id={`otp-${i}`}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={value[i] || ''}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onPaste={handlePaste}
            autoFocus={autoFocus && i === 0}
            className={cn(
              'w-12 h-12 text-center text-lg font-semibold',
              error && 'border-destructive'
            )}
          />
        ))}
      </div>
      
      {error && (
        <p className="text-sm text-destructive text-center flex items-center justify-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          {error}
        </p>
      )}
    </div>
  );
}
