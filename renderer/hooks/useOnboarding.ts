import { useState, useEffect, useCallback } from 'react';

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

const CONFIG_PATH = '~/.claude/studio/forma-config.json';

function expandPath() {
  return CONFIG_PATH.replace('~', process.env.HOME || process.env.USERPROFILE || '');
}

export function useOnboarding() {
  const [state, setState] = useState<OnboardingState>(DEFAULT_STATE);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const content = await window.api.readFile(expandPath());
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
      await window.api.writeFile(expandPath(), JSON.stringify(newState, null, 2));
    } catch {
      // Silent fail
    }
  }, []);

  // Use functional setState to avoid stale closure
  const completeStep = useCallback(async (step: keyof Omit<OnboardingState, 'completed'>) => {
    setState((prev) => {
      const newState = { ...prev, [step]: true };
      // Force completed when tourCompleted is set (final step)
      if (step === 'tourCompleted') {
        newState.completed = true;
      }
      // Also complete if all steps done
      if (newState.apiKeyConfigured && newState.firstProjectCreated && newState.tourCompleted) {
        newState.completed = true;
      }
      // Persist async (fire-and-forget from setState)
      window.api.writeFile(expandPath(), JSON.stringify(newState, null, 2)).catch(() => {});
      return newState;
    });
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
