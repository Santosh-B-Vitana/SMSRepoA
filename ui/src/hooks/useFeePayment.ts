import { useState, useCallback } from 'react';
import { feeService, PaymentTransaction } from '@/services/feeService';

export function useFeePayment(schoolId: string) {
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const processPayment = useCallback(
    async (
      studentId: string,
      amount: number,
      method: string
    ): Promise<{ success: boolean; transaction?: PaymentTransaction }> => {
      try {
        setProcessing(true);
        setError(null);

        const result = await feeService.processPayment(schoolId, studentId, amount, method);

        if (!result.success) {
          setError(result.error || 'Payment failed');
          return { success: false };
        }

        return { success: true, transaction: result.transaction };
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Payment processing failed';
        setError(errorMessage);
        return { success: false };
      } finally {
        setProcessing(false);
      }
    },
    [schoolId]
  );

  return {
    processPayment,
    processing,
    error
  };
}
