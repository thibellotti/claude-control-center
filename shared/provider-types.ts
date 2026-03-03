export type ProviderId = 'claude' | 'codex' | 'gemini';

export interface ProviderModel {
  id: string;
  name: string;
  isDefault?: boolean;
}

export interface ProviderConfig {
  id: ProviderId;
  name: string;
  executable: string;
  executablePath?: string;
  isInstalled: boolean;
  models: ProviderModel[];
  printArgs: string[];
  interactiveArgs: string[];
  autopilotArgs: string[];
  requiredEnvPrefixes: string[];
  envOverrides: Record<string, string>;
  modelFlag?: string;
  enabled: boolean;
}

export const DEFAULT_PROVIDERS: ProviderConfig[] = [
  {
    id: 'claude',
    name: 'Claude Code',
    executable: 'claude',
    isInstalled: false,
    models: [
      { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6', isDefault: true },
      { id: 'claude-opus-4-6', name: 'Claude Opus 4.6' },
      { id: 'claude-haiku-4-5-20251001', name: 'Claude Haiku 4.5' },
    ],
    printArgs: ['--print', '--system-prompt', '{systemPrompt}', '-p', '{task}'],
    interactiveArgs: [],
    autopilotArgs: ['--dangerously-skip-permissions'],
    requiredEnvPrefixes: ['ANTHROPIC_'],
    envOverrides: {},
    enabled: true,
  },
  {
    id: 'codex',
    name: 'Codex CLI',
    executable: 'codex',
    isInstalled: false,
    models: [
      { id: 'o4-mini', name: 'o4-mini', isDefault: true },
      { id: 'o3', name: 'o3' },
      { id: 'gpt-4.1', name: 'GPT-4.1' },
    ],
    printArgs: ['--quiet', '-p', '{task}'],
    interactiveArgs: [],
    autopilotArgs: ['--full-auto'],
    requiredEnvPrefixes: ['OPENAI_'],
    envOverrides: {},
    modelFlag: '--model',
    enabled: false,
  },
  {
    id: 'gemini',
    name: 'Gemini CLI',
    executable: 'gemini',
    isInstalled: false,
    models: [
      { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', isDefault: true },
      { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
    ],
    printArgs: ['-p', '{task}'],
    interactiveArgs: [],
    autopilotArgs: ['--sandbox'],
    requiredEnvPrefixes: ['GOOGLE_', 'GEMINI_'],
    envOverrides: {},
    modelFlag: '--model',
    enabled: false,
  },
];
