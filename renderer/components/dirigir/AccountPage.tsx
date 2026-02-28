import React, { useState, useCallback } from 'react';
import { useAccount } from '../../hooks/useAccount';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type PlanTier = 'free' | 'pro' | 'team';

interface PlanDetail {
  tier: PlanTier;
  label: string;
  price: string;
  features: { name: string; included: boolean }[];
}

// ---------------------------------------------------------------------------
// Plan definitions
// ---------------------------------------------------------------------------

const PLANS: PlanDetail[] = [
  {
    tier: 'free',
    label: 'Free',
    price: '$0',
    features: [
      { name: '1 project', included: true },
      { name: 'Deploy', included: false },
      { name: 'Figma Bridge', included: false },
      { name: 'Design Replay', included: false },
    ],
  },
  {
    tier: 'pro',
    label: 'Pro',
    price: '$29/mo',
    features: [
      { name: 'Unlimited projects', included: true },
      { name: 'Deploy', included: true },
      { name: 'Figma Bridge', included: true },
      { name: 'Design Replay', included: true },
    ],
  },
  {
    tier: 'team',
    label: 'Team',
    price: '$79/mo/seat',
    features: [
      { name: 'Unlimited projects', included: true },
      { name: 'Deploy', included: true },
      { name: 'Figma Bridge', included: true },
      { name: 'Design Replay', included: true },
      { name: 'Shared workspaces', included: true },
    ],
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function maskApiKey(key: string): string {
  if (!key || key.length < 12) return key || '';
  const last8 = key.slice(-8);
  return `sk-ant-...${last8}`;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

const CheckIcon = React.memo(function CheckIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 7.5l2.5 2.5L11 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
});

const CrossIcon = React.memo(function CrossIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 4l6 6M10 4l-6 6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
});

// ---------------------------------------------------------------------------
// Plan Card
// ---------------------------------------------------------------------------

interface PlanCardProps {
  plan: PlanDetail;
  isActive: boolean;
  onUpgrade: () => void;
}

const PlanCard = React.memo<PlanCardProps>(function PlanCard({ plan, isActive, onUpgrade }) {
  return (
    <div
      className={`border rounded-card p-4 flex-1 transition-colors ${
        isActive
          ? 'border-accent bg-accent-muted'
          : 'border-border-subtle hover:border-border-default'
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-text-primary">{plan.label}</span>
        <span className="text-xs text-text-secondary font-mono">{plan.price}</span>
      </div>

      <ul className="space-y-1.5 mb-4">
        {plan.features.map((f) => (
          <li key={f.name} className="flex items-center gap-2 text-xs">
            <span className={f.included ? 'text-feedback-success' : 'text-text-tertiary'}>
              {f.included ? <CheckIcon /> : <CrossIcon />}
            </span>
            <span className={f.included ? 'text-text-secondary' : 'text-text-tertiary'}>
              {f.name}
            </span>
          </li>
        ))}
      </ul>

      {isActive ? (
        <span className="inline-block px-3 py-1.5 rounded-button text-xs font-medium bg-accent/10 text-accent">
          Current plan
        </span>
      ) : (
        <button
          onClick={onUpgrade}
          className="px-3 py-1.5 rounded-button text-xs font-medium bg-accent text-white hover:bg-accent-hover transition-colors"
        >
          Upgrade
        </button>
      )}
    </div>
  );
});

// ---------------------------------------------------------------------------
// Section wrapper
// ---------------------------------------------------------------------------

const Section = React.memo<{ title: string; children: React.ReactNode }>(function Section({
  title,
  children,
}) {
  return (
    <div className="bg-surface-1 border border-border-subtle rounded-card p-6">
      <h3 className="text-sm font-semibold text-text-primary mb-4">{title}</h3>
      {children}
    </div>
  );
});

// ---------------------------------------------------------------------------
// AccountPage
// ---------------------------------------------------------------------------

const AccountPage = React.memo(function AccountPage() {
  const { account, isLoading, updateAccount, openBilling } = useAccount();

  // API Key state
  const [isEditingKey, setIsEditingKey] = useState(false);
  const [keyDraft, setKeyDraft] = useState('');
  const [isSavingKey, setIsSavingKey] = useState(false);

  // Account info state
  const [emailDraft, setEmailDraft] = useState('');
  const [licenseDraft, setLicenseDraft] = useState('');
  const [emailInitialized, setEmailInitialized] = useState(false);
  const [licenseInitialized, setLicenseInitialized] = useState(false);
  const [isSavingInfo, setIsSavingInfo] = useState(false);

  // Sync drafts once account loads
  React.useEffect(() => {
    if (account && !emailInitialized) {
      setEmailDraft(account.email || '');
      setEmailInitialized(true);
    }
    if (account && !licenseInitialized) {
      setLicenseDraft(account.licenseKey || '');
      setLicenseInitialized(true);
    }
  }, [account, emailInitialized, licenseInitialized]);

  // API key handlers
  const handleEditKey = useCallback(() => {
    setKeyDraft(account?.apiKey || '');
    setIsEditingKey(true);
  }, [account]);

  const handleSaveKey = useCallback(async () => {
    setIsSavingKey(true);
    await updateAccount({ apiKey: keyDraft });
    setIsEditingKey(false);
    setIsSavingKey(false);
  }, [keyDraft, updateAccount]);

  const handleCancelKey = useCallback(() => {
    setIsEditingKey(false);
    setKeyDraft('');
  }, []);

  // Account info handler
  const handleSaveInfo = useCallback(async () => {
    setIsSavingInfo(true);
    await updateAccount({ email: emailDraft || undefined, licenseKey: licenseDraft || undefined });
    setIsSavingInfo(false);
  }, [emailDraft, licenseDraft, updateAccount]);

  // Loading state
  if (isLoading || !account) {
    return (
      <div className="max-w-[600px] mx-auto py-8 px-6 flex items-center justify-center min-h-[300px]">
        <span className="text-xs text-text-tertiary">Loading account...</span>
      </div>
    );
  }

  return (
    <div className="max-w-[600px] mx-auto py-8 px-6 space-y-8">
      {/* ---- API Key ---- */}
      <Section title="Anthropic API Key">
        {isEditingKey ? (
          <div className="space-y-3">
            <input
              type="text"
              value={keyDraft}
              onChange={(e) => setKeyDraft(e.target.value)}
              placeholder="sk-ant-api03-..."
              className="w-full bg-surface-0 border border-border-default rounded-input px-3 py-2 text-sm text-text-primary font-mono focus:outline-none focus:border-accent"
              autoFocus
            />
            <div className="flex items-center gap-2">
              <button
                onClick={handleSaveKey}
                disabled={isSavingKey}
                className="px-4 py-2 rounded-button text-xs font-medium bg-accent text-white hover:bg-accent-hover transition-colors disabled:opacity-50"
              >
                {isSavingKey ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={handleCancelKey}
                className="px-4 py-2 rounded-button text-xs font-medium text-text-secondary hover:text-text-primary transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <span className="flex-1 bg-surface-0 border border-border-default rounded-input px-3 py-2 text-sm text-text-secondary font-mono truncate">
              {account.apiKey ? maskApiKey(account.apiKey) : 'Not configured'}
            </span>
            <button
              onClick={handleEditKey}
              className="px-4 py-2 rounded-button text-xs font-medium text-text-secondary border border-border-default hover:border-border-hover hover:text-text-primary transition-colors"
            >
              Edit
            </button>
          </div>
        )}
      </Section>

      {/* ---- Plan ---- */}
      <Section title="Plan">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs text-text-secondary">Current plan:</span>
          <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-accent/10 text-accent capitalize">
            {account.plan}
          </span>
        </div>

        <div className="flex gap-3">
          {PLANS.map((plan) => (
            <PlanCard
              key={plan.tier}
              plan={plan}
              isActive={account.plan === plan.tier}
              onUpgrade={openBilling}
            />
          ))}
        </div>
      </Section>

      {/* ---- Account Info ---- */}
      <Section title="Account Info">
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-text-secondary mb-1.5">Email (optional)</label>
            <input
              type="email"
              value={emailDraft}
              onChange={(e) => setEmailDraft(e.target.value)}
              placeholder="you@example.com"
              className="w-full bg-surface-0 border border-border-default rounded-input px-3 py-2 text-sm text-text-primary font-mono focus:outline-none focus:border-accent"
            />
          </div>

          <div>
            <label className="block text-xs text-text-secondary mb-1.5">License Key</label>
            <input
              type="text"
              value={licenseDraft}
              onChange={(e) => setLicenseDraft(e.target.value)}
              placeholder="XXXX-XXXX-XXXX-XXXX"
              className="w-full bg-surface-0 border border-border-default rounded-input px-3 py-2 text-sm text-text-primary font-mono focus:outline-none focus:border-accent"
            />
          </div>

          <button
            onClick={handleSaveInfo}
            disabled={isSavingInfo}
            className="px-4 py-2 rounded-button text-xs font-medium bg-accent text-white hover:bg-accent-hover transition-colors disabled:opacity-50"
          >
            {isSavingInfo ? 'Saving...' : 'Save'}
          </button>
        </div>
      </Section>
    </div>
  );
});

export default AccountPage;
