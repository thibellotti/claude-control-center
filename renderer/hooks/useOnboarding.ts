import { useState, useEffect, useCallback, useRef } from 'react';

interface OnboardingState {
  completed: boolean;
  apiKeyConfigured: boolean;
  firstProjectCreated: boolean;
  tourCompleted: boolean;
}

const DEFAULT_STATE: OnboardingState = {
  completed: false,
  apiKeyConfigured: false,
  firstProjectCreated: false,
  tourCompleted: false,
};

// Use ~ prefix — the main process IPC handler expands it to os.homedir()
const CONFIG_PATH = '~/.claude/studio/forma-config.json';

export function useOnboarding() {
  const [state, setState] = useState<OnboardingState>(DEFAULT_STATE);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const content = await window.api.readFile(CONFIG_PATH);
        if (content) {
          setState(JSON.parse(content));
        }
      } catch {
        // File doesn't exist yet, use defaults
      }
      setIsLoading(false);
    }
    load();
  }, []);

  const save = useCallback(async (newState: OnboardingState) => {
    setState(newState);
    try {
      await window.api.writeFile(CONFIG_PATH, JSON.stringify(newState, null, 2));
    } catch {
      // Silent fail
    }
  }, []);

  const stateRef = useRef(state);
  stateRef.current = state;

  const completeStep = useCallback(async (step: keyof Omit<OnboardingState, 'completed'>) => {
    const prev = stateRef.current;
    const newState: OnboardingState = { ...prev, [step]: true };

    // Force completed when tourCompleted is set (final step)
    if (step === 'tourCompleted') {
      newState.completed = true;
    }
    // Also complete if all steps done
    if (newState.apiKeyConfigured && newState.firstProjectCreated && newState.tourCompleted) {
      newState.completed = true;
    }

    setState(newState);

    try {
      await window.api.writeFile(CONFIG_PATH, JSON.stringify(newState, null, 2));
    } catch (err) {
      console.error('Failed to persist onboarding state:', err);
    }
  }, []);

  const resetOnboarding = useCallback(async () => {
    await save(DEFAULT_STATE);
  }, [save]);

  return {
    ...state,
    isLoading,
    completeStep,
    resetOnboarding,
  };
}
