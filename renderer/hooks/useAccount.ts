import { useState, useEffect, useCallback } from 'react';

interface AccountConfig {
  apiKey: string;
  plan: 'free' | 'pro' | 'team';
  email?: string;
  licenseKey?: string;
  activatedAt?: number;
}

interface PlanLimits {
  maxProjects: number;
  canDeploy: boolean;
  hasFigmaBridge: boolean;
  hasDesignReplay: boolean;
}

export function useAccount() {
  const [account, setAccount] = useState<AccountConfig | null>(null);
  const [limits, setLimits] = useState<PlanLimits | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [acc, lim] = await Promise.all([
        window.api.getAccount(),
        window.api.getPlanLimits(),
      ]);
      setAccount(acc as AccountConfig);
      setLimits(lim as PlanLimits);
      setIsLoading(false);
    }
    load();
  }, []);

  const updateAccount = useCallback(async (updates: Partial<AccountConfig>) => {
    const updated = await window.api.saveAccount(updates);
    setAccount(updated as AccountConfig);
    // Refresh limits after plan change
    const lim = await window.api.getPlanLimits();
    setLimits(lim as PlanLimits);
  }, []);

  const openBilling = useCallback(async () => {
    await window.api.openBillingPortal();
  }, []);

  return {
    account,
    limits,
    isLoading,
    updateAccount,
    openBilling,
  };
}
