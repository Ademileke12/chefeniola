'use client';

import React, { useState } from 'react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import ErrorMessage from '@/components/ui/ErrorMessage';

export interface TrackOrderFormProps {
  onSubmit: (email: string, orderId: string) => Promise<void>;
}

interface FormErrors {
  email?: string;
  orderId?: string;
  general?: string;
}

export default function TrackOrderForm({ onSubmit }: TrackOrderFormProps) {
  const [email, setEmail] = useState('');
  const [orderId, setOrderId] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Validate email
    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Validate order ID
    if (!orderId.trim()) {
      newErrors.orderId = 'Order ID is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    if (errors.email) {
      setErrors((prev) => ({ ...prev, email: undefined }));
    }
  };

  const handleOrderIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setOrderId(e.target.value);
    if (errors.orderId) {
      setErrors((prev) => ({ ...prev, orderId: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      await onSubmit(email, orderId);
    } catch (error) {
      setErrors({
        general: error instanceof Error ? error.message : 'Unable to find order. Please check your email and order ID.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* General Error */}
      {errors.general && (
        <ErrorMessage
          message={errors.general}
          title="Order Not Found"
          variant="banner"
          onDismiss={() => setErrors((prev) => ({ ...prev, general: undefined }))}
        />
      )}

      {/* Email Input */}
      <Input
        label="Email Address"
        type="email"
        value={email}
        onChange={handleEmailChange}
        error={errors.email}
        fullWidth
        required
        placeholder="[email protected]"
      />

      {/* Order ID Input */}
      <Input
        label="Order ID"
        type="text"
        value={orderId}
        onChange={handleOrderIdChange}
        error={errors.orderId}
        fullWidth
        required
        placeholder="MW-2024-001"
      />

      {/* Submit Button */}
      <Button
        type="submit"
        fullWidth
        size="lg"
        loading={loading}
        disabled={loading}
      >
        Track Order
      </Button>

      {/* Help Text */}
      <div className="text-sm text-gray-600 text-center">
        You can find your order ID in your confirmation email
      </div>
    </form>
  );
}
