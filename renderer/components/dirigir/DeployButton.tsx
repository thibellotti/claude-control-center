import React, { useState, useEffect, useCallback } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DeployButtonProps {
  projectPath: string;
}

type DeployProvider = 'vercel' | 'netlify' | 'none';

interface ProviderDetection {
  provider: DeployProvider;
}

interface DeployResultData {
  success: boolean;
  url?: string;
  error?: string;
  output: string[];
  timestamp: number;
}

type DeployState = 'idle' | 'deploying' | 'success' | 'error';

// ---------------------------------------------------------------------------
// Inline SVG icons — 14x14, stroke-based
// ---------------------------------------------------------------------------

function DeployArrowIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M7 11V3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M3.5 6L7 2.5L10.5 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg
      width={14}
      height={14}
      viewBox="0 0 14 14"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="animate-spin"
    >
      <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.4" opacity="0.25" />
      <path d="M12.5 7a5.5 5.5 0 00-5.5-5.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width={12} height={12} viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M2.5 6.5L5 9l4.5-6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ErrorIcon() {
  return (
    <svg width={12} height={12} viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M6 4v2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <circle cx="6" cy="9" r="0.6" fill="currentColor" />
    </svg>
  );
}

function VercelProviderIcon() {
  return (
    <svg width={12} height={12} viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M6 1.5L11 10.5H1L6 1.5Z" fill="currentColor" />
    </svg>
  );
}

function NetlifyProviderIcon() {
  return (
    <svg width={12} height={12} viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M6 1L1 6l5 5 5-5-5-5z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <path d="M3 6h6M6 3v6" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg width={10} height={10} viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="3" width="5.5" height="5.5" rx="0.8" stroke="currentColor" strokeWidth="1.1" />
      <path d="M7 3V2a.8.8 0 00-.8-.8H2a.8.8 0 00-.8.8v4.2c0 .44.36.8.8.8h1" stroke="currentColor" strokeWidth="1.1" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const DeployButton = React.memo(function DeployButton({
  projectPath,
}: DeployButtonProps) {
  const [provider, setProvider] = useState<DeployProvider>('none');
  const [isDetecting, setIsDetecting] = useState(true);
  const [deployState, setDeployState] = useState<DeployState>('idle');
  const [deployUrl, setDeployUrl] = useState<string | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Detect deploy provider on mount
  useEffect(() => {
    let cancelled = false;

    async function detect() {
      setIsDetecting(true);
      try {
        const result: ProviderDetection = await window.api.detectDeployProvider(projectPath);
        if (!cancelled) {
          setProvider(result.provider);
        }
      } catch {
        if (!cancelled) {
          setProvider('none');
        }
      } finally {
        if (!cancelled) setIsDetecting(false);
      }
    }

    detect();
    return () => { cancelled = true; };
  }, [projectPath]);

  // Handle deploy
  const handleDeploy = useCallback(async () => {
    if (provider === 'none' || deployState === 'deploying') return;

    setDeployState('deploying');
    setDeployUrl(null);
    setErrorText(null);

    try {
      const result: DeployResultData = await window.api.deployProject(projectPath, provider);

      if (result.success) {
        setDeployState('success');
        setDeployUrl(result.url ?? null);
      } else {
        setDeployState('error');
        setErrorText(result.error ?? 'Deploy failed');
      }
    } catch (err) {
      setDeployState('error');
      setErrorText(err instanceof Error ? err.message : 'Deploy failed');
    }
  }, [projectPath, provider, deployState]);

  // Copy URL to clipboard
  const handleCopyUrl = useCallback(async () => {
    if (!deployUrl) return;
    try {
      await navigator.clipboard.writeText(deployUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: silent failure
    }
  }, [deployUrl]);

  // Reset to idle when clicking the button again after success/error
  const handleReset = useCallback(() => {
    setDeployState('idle');
    setDeployUrl(null);
    setErrorText(null);
  }, []);

  // Provider icon based on detected provider
  const ProviderIcon = provider === 'vercel'
    ? VercelProviderIcon
    : provider === 'netlify'
      ? NetlifyProviderIcon
      : null;

  // --- Detecting state ---
  if (isDetecting) {
    return (
      <div className="w-full px-3 py-2">
        <button
          disabled
          className="w-full flex items-center justify-center gap-2 py-2 rounded-button text-xs font-medium bg-accent text-white opacity-60 cursor-not-allowed transition-colors"
        >
          <SpinnerIcon />
          Detecting...
        </button>
      </div>
    );
  }

  // --- No provider detected ---
  if (provider === 'none') {
    return (
      <div className="w-full px-3 py-2">
        <button
          disabled
          className="w-full flex items-center justify-center gap-2 py-2 rounded-button text-xs font-medium bg-accent text-white opacity-40 cursor-not-allowed transition-colors"
        >
          <DeployArrowIcon />
          No deploy provider detected
        </button>
      </div>
    );
  }

  // --- Success state ---
  if (deployState === 'success') {
    return (
      <div className="w-full px-3 py-2">
        <div className="bg-feedback-success-muted border border-feedback-success-border rounded-card p-2">
          {/* Header row */}
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-feedback-success shrink-0">
              <CheckIcon />
            </span>
            <span className="text-xs font-medium text-feedback-success">Live</span>
          </div>

          {/* URL + copy */}
          {deployUrl && (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => window.open(deployUrl, '_blank')}
                className="text-micro text-accent truncate cursor-pointer hover:underline flex-1 text-left"
                title={deployUrl}
              >
                {deployUrl}
              </button>
              <button
                onClick={handleCopyUrl}
                className="text-micro text-text-tertiary hover:text-text-secondary shrink-0 flex items-center gap-0.5 transition-colors"
                title="Copy URL"
              >
                <CopyIcon />
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          )}

          {/* Deploy again */}
          <button
            onClick={handleReset}
            className="text-micro text-text-tertiary hover:text-text-secondary mt-1.5 transition-colors"
          >
            Deploy again
          </button>
        </div>
      </div>
    );
  }

  // --- Error state ---
  if (deployState === 'error') {
    return (
      <div className="w-full px-3 py-2">
        <div className="bg-feedback-error-muted border border-feedback-error-border rounded-card p-2">
          {/* Header row */}
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-feedback-error shrink-0">
              <ErrorIcon />
            </span>
            <span className="text-xs font-medium text-feedback-error">Failed</span>
          </div>

          {/* Error text */}
          {errorText && (
            <p className="text-micro text-feedback-error truncate" title={errorText}>
              {errorText}
            </p>
          )}

          {/* Retry */}
          <button
            onClick={handleReset}
            className="text-micro text-text-tertiary hover:text-text-secondary mt-1.5 transition-colors"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  // --- Deploying state ---
  if (deployState === 'deploying') {
    return (
      <div className="w-full px-3 py-2">
        <button
          disabled
          className="w-full flex items-center justify-center gap-2 py-2 rounded-button text-xs font-medium bg-accent text-white opacity-80 cursor-not-allowed transition-colors"
        >
          <SpinnerIcon />
          Deploying...
        </button>
      </div>
    );
  }

  // --- Idle state ---
  return (
    <div className="w-full px-3 py-2">
      <button
        onClick={handleDeploy}
        className="w-full flex items-center justify-center gap-2 py-2 rounded-button text-xs font-medium bg-accent text-white hover:bg-accent-hover transition-colors"
      >
        {ProviderIcon && <ProviderIcon />}
        <DeployArrowIcon />
        Deploy
      </button>
    </div>
  );
});

export default DeployButton;
