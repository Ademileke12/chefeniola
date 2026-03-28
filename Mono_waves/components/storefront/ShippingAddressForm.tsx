'use client';

import React from 'react';
import Input from '@/components/ui/Input';
import { ShippingAddress } from '@/types/order';

export interface ShippingAddressFormProps {
  values: Partial<ShippingAddress>;
  errors: Partial<Record<keyof ShippingAddress, string>>;
  onChange: (field: keyof ShippingAddress, value: string) => void;
}

export default function ShippingAddressForm({
  values,
  errors,
  onChange,
}: ShippingAddressFormProps) {
  const handleChange = (field: keyof ShippingAddress) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    onChange(field, e.target.value);
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-900 uppercase tracking-wider mb-6">
        Shipping Address
      </h2>

      {/* Name Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="First Name"
          type="text"
          value={values.firstName || ''}
          onChange={handleChange('firstName')}
          error={errors.firstName}
          fullWidth
          required
        />
        <Input
          label="Last Name"
          type="text"
          value={values.lastName || ''}
          onChange={handleChange('lastName')}
          error={errors.lastName}
          fullWidth
          required
        />
      </div>

      {/* Address Line 1 */}
      <Input
        label="Address Line 1"
        type="text"
        value={values.addressLine1 || ''}
        onChange={handleChange('addressLine1')}
        error={errors.addressLine1}
        fullWidth
        required
      />

      {/* Address Line 2 */}
      <Input
        label="Address Line 2 (Optional)"
        type="text"
        value={values.addressLine2 || ''}
        onChange={handleChange('addressLine2')}
        error={errors.addressLine2}
        fullWidth
      />

      {/* City, State, Postal Code */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Input
          label="City"
          type="text"
          value={values.city || ''}
          onChange={handleChange('city')}
          error={errors.city}
          fullWidth
          required
        />
        <Input
          label="State"
          type="text"
          value={values.state || ''}
          onChange={handleChange('state')}
          error={errors.state}
          fullWidth
          required
        />
        <Input
          label="Postal Code"
          type="text"
          value={values.postCode || ''}
          onChange={handleChange('postCode')}
          error={errors.postCode}
          fullWidth
          required
        />
      </div>

      {/* Country */}
      <Input
        label="Country"
        type="text"
        value={values.country || ''}
        onChange={handleChange('country')}
        error={errors.country}
        fullWidth
        required
      />

      {/* Phone */}
      <Input
        label="Phone"
        type="tel"
        value={values.phone || ''}
        onChange={handleChange('phone')}
        error={errors.phone}
        fullWidth
        required
      />
    </div>
  );
}
