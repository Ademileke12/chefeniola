'use client';

import React, { useState } from 'react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import ErrorMessage from '@/components/ui/ErrorMessage';
import ShippingAddressForm from './ShippingAddressForm';
import { ShippingAddress } from '@/types/order';
import { CartItem } from '@/types/cart';

export interface CheckoutFormData {
  customerEmail: string;
  shippingAddress: ShippingAddress;
}

export interface CheckoutFormProps {
  cartItems: CartItem[];
  onSubmit: (data: CheckoutFormData) => Promise<void>;
  isProcessing?: boolean;
}

interface FormErrors {
  customerEmail?: string;
  shippingAddress?: Partial<Record<keyof ShippingAddress, string>>;
  general?: string;
}

export default function CheckoutForm({ cartItems, onSubmit, isProcessing = false }: CheckoutFormProps) {
  const [customerEmail, setCustomerEmail] = useState('');
  const [shippingAddress, setShippingAddress] = useState<Partial<ShippingAddress>>({
    firstName: '',
    lastName: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    postCode: '',
    country: '',
    phone: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {
      shippingAddress: {},
    };

    // Validate email
    if (!customerEmail.trim()) {
      newErrors.customerEmail = 'Email is required';
    } else if (!validateEmail(customerEmail)) {
      newErrors.customerEmail = 'Please enter a valid email address';
    }

    // Validate shipping address
    const requiredFields: (keyof ShippingAddress)[] = [
      'firstName',
      'lastName',
      'addressLine1',
      'city',
      'state',
      'postCode',
      'country',
      'phone',
    ];

    requiredFields.forEach((field) => {
      if (!shippingAddress[field]?.trim()) {
        newErrors.shippingAddress![field] = `${field.replace(/([A-Z])/g, ' $1').trim()} is required`;
      }
    });

    // Validate phone format (basic validation)
    if (shippingAddress.phone && !/^[\d\s\-\+\(\)]+$/.test(shippingAddress.phone)) {
      newErrors.shippingAddress!.phone = 'Please enter a valid phone number';
    }

    // Check if there are any errors
    const hasErrors =
      !!newErrors.customerEmail ||
      Object.keys(newErrors.shippingAddress || {}).length > 0;

    setErrors(newErrors);
    return !hasErrors;
  };

  const handleShippingAddressChange = (field: keyof ShippingAddress, value: string) => {
    setShippingAddress((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Clear error for this field
    if (errors.shippingAddress?.[field]) {
      setErrors((prev) => ({
        ...prev,
        shippingAddress: {
          ...prev.shippingAddress,
          [field]: undefined,
        },
      }));
    }
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomerEmail(e.target.value);
    if (errors.customerEmail) {
      setErrors((prev) => ({ ...prev, customerEmail: undefined }));
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
      await onSubmit({
        customerEmail,
        shippingAddress: shippingAddress as ShippingAddress,
      });
    } catch (error) {
      setErrors({
        general: error instanceof Error ? error.message : 'An error occurred during checkout',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* General Error */}
      {errors.general && (
        <ErrorMessage
          message={errors.general}
          title="Checkout Error"
          variant="banner"
          onDismiss={() => setErrors((prev) => ({ ...prev, general: undefined }))}
        />
      )}

      {/* Customer Email */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 uppercase tracking-wider mb-6">
          Contact Information
        </h2>
        <Input
          label="Email"
          type="email"
          value={customerEmail}
          onChange={handleEmailChange}
          error={errors.customerEmail}
          fullWidth
          required
          placeholder="[email protected]"
        />
      </div>

      {/* Shipping Address */}
      <ShippingAddressForm
        values={shippingAddress}
        errors={errors.shippingAddress || {}}
        onChange={handleShippingAddressChange}
      />

      {/* Submit Button */}
      <div className="pt-6">
        <Button
          type="submit"
          fullWidth
          size="lg"
          loading={isProcessing || loading}
          disabled={isProcessing || loading || cartItems.length === 0}
        >
          {isProcessing ? 'Processing...' : 'Continue to Payment'}
        </Button>
      </div>

      {/* Security Notice */}
      <div className="text-xs text-gray-500 text-center">
        Your payment information is securely processed by Stripe
      </div>
    </form>
  );
}
