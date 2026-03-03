import type { ElectronAPI } from '../../main/preload';

declare global {
  interface Window {
    api: ElectronAPI;
  }

  namespace JSX {
    interface IntrinsicElements {
      webview: React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          src?: string;
          allowpopups?: string;
          partition?: string;
          preload?: string;
          nodeintegration?: string;
          disablewebsecurity?: string;
          useragent?: string;
        },
        HTMLElement
      >;
    }
  }
}

export {};
