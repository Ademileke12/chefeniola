import React from 'react';
import { AlertCircle, XCircle } from 'lucide-react';

export interface ErrorMessageProps {
  message: string;
  title?: string;
  variant?: 'inline' | 'banner';
  onDismiss?: () => void;
}

export default function ErrorMessage({
  message,
  title,
  variant = 'inline',
  onDismiss,
}: ErrorMessageProps) {
  if (variant === 'banner') {
    return (
      <div
        className="bg-red-50 border border-red-200 rounded-lg p-4"
        role="alert"
        aria-live="polite"
      >
        <div className="flex items-start">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
          <div className="ml-3 flex-1">
            {title && (
              <h3 className="text-sm font-semibold text-red-800 mb-1">
                {title}
              </h3>
            )}
            <p className="text-sm text-red-700">{message}</p>
          </div>
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="ml-3 flex-shrink-0 text-red-600 hover:text-red-800 transition-colors"
              aria-label="Dismiss error"
            >
              <XCircle className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    );
  }
  
  // Inline variant
  return (
    <div
      className="flex items-center text-red-600 text-sm"
      role="alert"
      aria-live="polite"
    >
      <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
      <span>{message}</span>
    </div>
  );
}
