'use client';

import React from 'react';
import { Order, OrderStatus as OrderStatusType } from '@/types/order';

export interface OrderStatusProps {
  order: Order;
}

interface StatusStep {
  status: OrderStatusType;
  label: string;
  description: string;
}

const statusSteps: StatusStep[] = [
  {
    status: 'payment_confirmed',
    label: 'Order Confirmed',
    description: 'Your order has been received and payment confirmed',
  },
  {
    status: 'submitted_to_gelato',
    label: 'Processing',
    description: 'Your order is being prepared for production',
  },
  {
    status: 'printing',
    label: 'Printing',
    description: 'Your custom design is being printed',
  },
  {
    status: 'shipped',
    label: 'Shipped',
    description: 'Your order is on its way',
  },
  {
    status: 'delivered',
    label: 'Delivered',
    description: 'Your order has been delivered',
  },
];

const getStatusIndex = (status: OrderStatusType): number => {
  const index = statusSteps.findIndex((step) => step.status === status);
  return index >= 0 ? index : -1;
};

const getStatusColor = (status: OrderStatusType): string => {
  switch (status) {
    case 'delivered':
      return 'text-green-600';
    case 'cancelled':
      return 'text-red-600';
    case 'failed':
      return 'text-red-600';
    default:
      return 'text-blue-600';
  }
};

const getStatusBadgeColor = (status: OrderStatusType): string => {
  switch (status) {
    case 'delivered':
      return 'bg-green-100 text-green-800';
    case 'cancelled':
      return 'bg-red-100 text-red-800';
    case 'failed':
      return 'bg-red-100 text-red-800';
    case 'shipped':
      return 'bg-blue-100 text-blue-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export default function OrderStatus({ order }: OrderStatusProps) {
  const currentStatusIndex = getStatusIndex(order.status);
  const statusColor = getStatusColor(order.status);
  const badgeColor = getStatusBadgeColor(order.status);

  // Handle special statuses
  if (order.status === 'cancelled' || order.status === 'failed' || order.status === 'pending') {
    return (
      <div className="bg-white border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 uppercase tracking-wider">
            Order Status
          </h3>
          <span className={`px-3 py-1 text-xs font-semibold uppercase tracking-wider ${badgeColor}`}>
            {order.status.replace(/_/g, ' ')}
          </span>
        </div>
        
        {order.status === 'cancelled' && (
          <div className="bg-red-50 border border-red-200 p-4 rounded">
            <p className="text-red-900 font-medium mb-2">This order has been cancelled</p>
            <p className="text-red-800 text-sm">
              A full refund has been issued to your original payment method. 
              Please allow 5-10 business days for the refund to appear in your account.
            </p>
            <p className="text-red-800 text-sm mt-2">
              If you have any questions, please contact our support team.
            </p>
          </div>
        )}
        
        {order.status === 'failed' && (
          <div className="bg-red-50 border border-red-200 p-4 rounded">
            <p className="text-red-900 font-medium mb-2">There was an issue processing this order</p>
            <p className="text-red-800 text-sm">
              Please contact our support team for assistance.
            </p>
          </div>
        )}
        
        {order.status === 'pending' && (
          <div className="bg-yellow-50 border border-yellow-200 p-4 rounded">
            <p className="text-yellow-900 font-medium mb-2">Your order is pending payment confirmation</p>
            <p className="text-yellow-800 text-sm">
              We&apos;re waiting for payment confirmation. This usually takes a few minutes.
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-lg font-semibold text-gray-900 uppercase tracking-wider">
          Order Status
        </h3>
        <span className={`px-3 py-1 text-xs font-semibold uppercase tracking-wider ${badgeColor}`}>
          {order.status.replace(/_/g, ' ')}
        </span>
      </div>

      {/* Status Timeline */}
      <div className="space-y-6">
        {statusSteps.map((step, index) => {
          const isCompleted = index <= currentStatusIndex;
          const isCurrent = index === currentStatusIndex;

          return (
            <div key={step.status} className="flex items-start">
              {/* Status Icon */}
              <div className="flex-shrink-0 mr-4">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                    isCompleted
                      ? 'bg-black border-black'
                      : 'bg-white border-gray-300'
                  }`}
                >
                  {isCompleted ? (
                    <svg
                      className="w-5 h-5 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  ) : (
                    <div className="w-3 h-3 rounded-full bg-gray-300" />
                  )}
                </div>
              </div>

              {/* Status Content */}
              <div className="flex-1 pb-6">
                <h4
                  className={`text-sm font-semibold uppercase tracking-wider mb-1 ${
                    isCompleted ? 'text-gray-900' : 'text-gray-400'
                  }`}
                >
                  {step.label}
                </h4>
                <p
                  className={`text-sm ${
                    isCompleted ? 'text-gray-600' : 'text-gray-400'
                  }`}
                >
                  {step.description}
                </p>
                {isCurrent && (
                  <div className="mt-2">
                    <span className={`text-xs font-semibold ${statusColor}`}>
                      Current Status
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
