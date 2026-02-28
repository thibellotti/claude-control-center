import React, { useState, useCallback } from 'react';

interface OnboardingWizardProps {
  onComplete: () => void;
  onStepComplete: (step: 'apiKeyConfigured' | 'firstProjectCreated' | 'tourCompleted') => void;
}

// Step indicator dots
function StepDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex gap-2 justify-center mt-8">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`w-2 h-2 rounded-full transition-colors ${
            i === current ? 'bg-accent' : 'bg-surface-3'
          }`}
        />
      ))}
    </div>
  );
}

// Step 1: Welcome
function WelcomeStep({ onNext }: { onNext: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center flex-1 text-center px-8">
      <h1 className="text-2xl font-bold text-text-primary">Forma</h1>
      <p className="text-sm text-text-tertiary italic mt-2">Design is building.</p>
      <p className="text-sm text-text-secondary mt-4">
        Build web apps visually with AI. No terminal. No code. Just results.
      </p>
      <div className="mt-auto w-full pt-8">
        <button
          onClick={onNext}
          className="w-full py-2.5 rounded-button text-sm font-medium bg-accent text-white hover:bg-accent-hover transition-colors"
        >
          Continue
        </button>
      </div>
    </div>
  );
}

// Step 2: API Key
function ApiKeyStep({
  onNext,
  onSkip,
}: {
  onNext: () => void;
  onSkip: () => void;
}) {
  const [apiKey, setApiKey] = useState('');
  const isValid = apiKey.startsWith('sk-');

  const handleContinue = useCallback(() => {
    if (!isValid) return;
    // For MVP, store in localStorage. Real key management comes later.
    localStorage.setItem('forma_api_key', apiKey);
    onNext();
  }, [apiKey, isValid, onNext]);

  return (
    <div className="flex flex-col flex-1 px-8">
      <h2 className="text-lg font-semibold text-text-primary">Connect to Claude</h2>
      <p className="text-sm text-text-secondary mt-2">
        Enter your Anthropic API key to power the AI engine.
      </p>
      <div className="mt-6">
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="sk-ant-..."
          className="w-full bg-surface-1 border border-border-default rounded-input px-3 py-2.5 text-sm text-text-primary font-mono placeholder:text-text-tertiary focus:outline-none focus:border-accent transition-colors"
        />
        <a
          href="https://console.anthropic.com"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block mt-2 text-micro text-accent hover:underline"
        >
          Get your API key at console.anthropic.com
        </a>
      </div>
      <div className="mt-auto w-full pt-8 flex flex-col items-center gap-3">
        <button
          onClick={handleContinue}
          disabled={!isValid}
          className="w-full py-2.5 rounded-button text-sm font-medium bg-accent text-white hover:bg-accent-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Continue
        </button>
        <button
          onClick={onSkip}
          className="text-xs text-text-tertiary hover:text-text-secondary transition-colors"
        >
          Skip
        </button>
      </div>
    </div>
  );
}

// Step 3: First Project
function FirstProjectStep({ onNext }: { onNext: () => void }) {
  return (
    <div className="flex flex-col flex-1 px-8">
      <h2 className="text-lg font-semibold text-text-primary">Start your first project</h2>
      <p className="text-sm text-text-secondary mt-2">
        Choose how you want to begin.
      </p>
      <div className="grid grid-cols-2 gap-4 mt-6">
        {/* New from template */}
        <button
          onClick={onNext}
          className="flex flex-col items-center gap-3 bg-surface-1 border border-border-subtle rounded-card p-6 hover:border-accent transition-colors text-center"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-text-secondary"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M3 9h18" />
            <path d="M9 21V9" />
          </svg>
          <span className="text-sm font-medium text-text-primary">New from template</span>
          <span className="text-xs text-text-tertiary">Start with a pre-built template</span>
        </button>

        {/* Open existing folder */}
        <button
          onClick={onNext}
          className="flex flex-col items-center gap-3 bg-surface-1 border border-border-subtle rounded-card p-6 hover:border-accent transition-colors text-center"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-text-secondary"
          >
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
          </svg>
          <span className="text-sm font-medium text-text-primary">Open existing folder</span>
          <span className="text-xs text-text-tertiary">Open a project from your computer</span>
        </button>
      </div>
      <div className="mt-auto" />
    </div>
  );
}

// Step 4: Quick Tour
const TOUR_ITEMS = [
  {
    number: 1,
    title: 'Request Bar',
    description: 'Press Cmd+K to tell Claude what to build',
  },
  {
    number: 2,
    title: 'Live Preview',
    description: 'Watch your app update in real-time',
  },
  {
    number: 3,
    title: 'Activity Feed',
    description: 'See what Claude is doing, translated for designers',
  },
];

function QuickTourStep({ onFinish }: { onFinish: () => void }) {
  return (
    <div className="flex flex-col flex-1 px-8">
      <h2 className="text-lg font-semibold text-text-primary">You're all set!</h2>
      <p className="text-sm text-text-secondary mt-2">
        Here's a quick overview of the essentials.
      </p>
      <div className="flex flex-col gap-3 mt-6">
        {TOUR_ITEMS.map((item) => (
          <div
            key={item.number}
            className="bg-surface-1 border border-border-subtle rounded-card p-4 flex items-start gap-4"
          >
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-accent text-white text-xs font-semibold flex items-center justify-center">
              {item.number}
            </span>
            <div>
              <p className="text-sm font-medium text-text-primary">{item.title}</p>
              <p className="text-xs text-text-tertiary mt-0.5">{item.description}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-auto w-full pt-8">
        <button
          onClick={onFinish}
          className="w-full py-2.5 rounded-button text-sm font-medium bg-accent text-white hover:bg-accent-hover transition-colors"
        >
          Start Building
        </button>
      </div>
    </div>
  );
}

// Main wizard component
const OnboardingWizard = React.memo(function OnboardingWizard({
  onComplete,
  onStepComplete,
}: OnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const TOTAL_STEPS = 4;

  const goToStep = useCallback((step: number) => {
    setCurrentStep(step);
  }, []);

  // Step 1 -> Step 2
  const handleWelcomeNext = useCallback(() => {
    goToStep(1);
  }, [goToStep]);

  // Step 2 -> Step 3 (with API key)
  const handleApiKeyNext = useCallback(() => {
    onStepComplete('apiKeyConfigured');
    goToStep(2);
  }, [goToStep, onStepComplete]);

  // Step 2 -> Step 3 (skip)
  const handleApiKeySkip = useCallback(() => {
    goToStep(2);
  }, [goToStep]);

  // Step 3 -> Step 4
  const handleFirstProjectNext = useCallback(() => {
    onStepComplete('firstProjectCreated');
    goToStep(3);
  }, [goToStep, onStepComplete]);

  // Step 4 -> Done
  const handleTourFinish = useCallback(() => {
    onStepComplete('tourCompleted');
    onComplete();
  }, [onComplete, onStepComplete]);

  return (
    <div className="fixed inset-0 z-50 bg-surface-0 flex items-center justify-center">
      <div className="w-[480px] max-h-[600px] flex flex-col">
        {/* Step content */}
        <div className="flex-1 flex flex-col min-h-0">
          {currentStep === 0 && <WelcomeStep onNext={handleWelcomeNext} />}
          {currentStep === 1 && (
            <ApiKeyStep onNext={handleApiKeyNext} onSkip={handleApiKeySkip} />
          )}
          {currentStep === 2 && <FirstProjectStep onNext={handleFirstProjectNext} />}
          {currentStep === 3 && <QuickTourStep onFinish={handleTourFinish} />}
        </div>

        {/* Step indicator dots */}
        <StepDots current={currentStep} total={TOTAL_STEPS} />
      </div>
    </div>
  );
});

export default OnboardingWizard;
