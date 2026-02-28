import React from 'react';
import type { DesignRequest } from '../../../shared/types';
import { CheckIcon, CloseIcon } from '../icons';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface RequestQueueProps {
  requests: DesignRequest[];
  onApprove: (requestId: string) => void;
  onReject: (requestId: string) => void;
  onCancel: (requestId: string) => void;
}

// ---------------------------------------------------------------------------
// Status badge config
// ---------------------------------------------------------------------------

const statusStyles: Record<
  DesignRequest['status'],
  string
> = {
  draft: 'bg-surface-3 text-text-tertiary',
  queued: 'bg-surface-3 text-text-tertiary',
  in_progress: 'bg-accent-muted text-accent animate-pulse',
  review: 'bg-feedback-warning-muted text-feedback-warning',
  approved: 'bg-feedback-success-muted text-feedback-success',
  rejected: 'bg-feedback-error-muted text-feedback-error',
};

// ---------------------------------------------------------------------------
// Timestamp formatter
// ---------------------------------------------------------------------------

function formatTime(timestamp: number): string {
  const d = new Date(timestamp);
  return d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ---------------------------------------------------------------------------
// Request card
// ---------------------------------------------------------------------------

const RequestCard = React.memo(function RequestCard({
  request,
  onApprove,
  onReject,
  onCancel,
}: {
  request: DesignRequest;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onCancel: (id: string) => void;
}) {
  const isInProgress = request.status === 'in_progress';
  const isReview = request.status === 'review';

  return (
    <div
      className={`bg-surface-1 border rounded-card p-3 ${
        isInProgress
          ? 'border-accent animate-pulse'
          : 'border-border-subtle'
      }`}
    >
      {/* Status badge */}
      <div className="flex justify-end mb-1.5">
        <span
          className={`inline-block px-1.5 py-0.5 rounded-full text-micro font-medium ${
            statusStyles[request.status]
          }`}
        >
          {request.status.replace('_', ' ')}
        </span>
      </div>

      {/* Prompt */}
      <p className="text-xs text-text-primary line-clamp-2">
        {request.prompt}
      </p>

      {/* Timestamp */}
      <p className="mt-1 text-micro text-text-tertiary">
        {formatTime(request.createdAt)}
      </p>

      {/* Review actions */}
      {isReview && (
        <div className="flex items-center gap-2 mt-2">
          <button
            onClick={() => onApprove(request.id)}
            className="flex items-center gap-1 px-2 py-1 rounded-button text-micro font-medium bg-accent text-white hover:bg-accent-hover transition-colors"
          >
            <CheckIcon size={10} />
            Approve
          </button>
          <button
            onClick={() => onReject(request.id)}
            className="flex items-center gap-1 px-2 py-1 rounded-button text-micro font-medium text-feedback-error hover:bg-surface-2 transition-colors"
          >
            <CloseIcon size={10} />
            Reject
          </button>
        </div>
      )}

      {/* Cancel action for in-progress */}
      {isInProgress && (
        <div className="mt-2">
          <button
            onClick={() => onCancel(request.id)}
            className="text-micro font-medium text-feedback-error hover:underline transition-colors"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
});

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

const RequestQueue = React.memo(function RequestQueue({
  requests,
  onApprove,
  onReject,
  onCancel,
}: RequestQueueProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border-subtle">
        <span className="text-xs font-medium text-text-primary">
          Requests
        </span>
        {requests.length > 0 && (
          <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-surface-3 text-micro text-text-tertiary">
            {requests.length}
          </span>
        )}
      </div>

      {/* Card list */}
      <div className="flex-1 overflow-y-auto px-3 py-2">
        {requests.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-1 px-4">
            <p className="text-xs text-text-tertiary">
              No requests yet
            </p>
            <p className="text-micro text-text-tertiary text-center">
              Use Cmd+K to submit your first request
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {requests.map((request) => (
              <RequestCard
                key={request.id}
                request={request}
                onApprove={onApprove}
                onReject={onReject}
                onCancel={onCancel}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
});

export default RequestQueue;
