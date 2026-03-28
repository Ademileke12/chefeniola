'use client';

import React from 'react';
import { Order } from '@/types/order';

export interface TrackingInfoProps {
  order: Order;
}

const getCarrierTrackingUrl = (carrier: string, trackingNumber: string): string | null => {
  const carrierLower = carrier.toLowerCase();
  
  if (carrierLower.includes('ups')) {
    return `https://www.ups.com/track?tracknum=${trackingNumber}`;
  }
  if (carrierLower.includes('fedex')) {
    return `https://www.fedex.com/fedextrack/?trknbr=${trackingNumber}`;
  }
  if (carrierLower.includes('usps')) {
    return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${trackingNumber}`;
  }
  if (carrierLower.includes('dhl')) {
    return `https://www.dhl.com/en/express/tracking.html?AWB=${trackingNumber}`;
  }
  
  return null;
};

export default function TrackingInfo({ order }: TrackingInfoProps) {
  const hasTracking = order.trackingNumber && order.carrier;
  const trackingUrl = hasTracking
    ? getCarrierTrackingUrl(order.carrier!, order.trackingNumber!)
    : null;

  if (!hasTracking) {
    return (
      <div className="bg-gray-50 border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 uppercase tracking-wider mb-4">
          Tracking Information
        </h3>
        <p className="text-gray-600">
          Tracking information will be available once your order has shipped.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 uppercase tracking-wider mb-6">
        Tracking Information
      </h3>

      <div className="space-y-4">
        {/* Carrier */}
        <div>
          <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
            Carrier
          </dt>
          <dd className="text-base text-gray-900">{order.carrier}</dd>
        </div>

        {/* Tracking Number */}
        <div>
          <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
            Tracking Number
          </dt>
          <dd className="text-base text-gray-900 font-mono">{order.trackingNumber}</dd>
        </div>

        {/* Track Package Button */}
        {trackingUrl && (
          <div className="pt-4">
            <a
              href={trackingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center px-6 py-3 text-sm font-semibold uppercase tracking-wider bg-black text-white hover:bg-gray-800 transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black"
            >
              Track Package
              <svg
                className="ml-2 w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
