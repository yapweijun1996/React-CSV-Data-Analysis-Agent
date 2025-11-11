import React from 'react';

interface StatusSpinnerProps {
    className?: string;
    ariaLabel?: string;
}

export const StatusSpinner: React.FC<StatusSpinnerProps> = ({
    className = 'h-4 w-4 text-blue-600 animate-spin',
    ariaLabel = 'Loading',
}) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" role="status" aria-label={ariaLabel}>
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
);
