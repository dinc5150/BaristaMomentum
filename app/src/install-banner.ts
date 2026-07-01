import { LitElement, html, css, nothing } from 'lit';
import { customElement, state } from 'lit/decorators.js';

/** localStorage key remembering that the user dismissed the install banner. */
const DISMISSED_KEY = 'installBannerDismissed';

/**
 * The `beforeinstallprompt` event (Chromium only) with the members we use.
 * It's not in the standard lib DOM types, so we describe it locally.
 */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/**
 * A full-width banner shown at the very top of the page offering to install the
 * app as a PWA. It only appears when the browser fires `beforeinstallprompt`
 * (i.e. the app is installable and not already installed), and stays hidden if
 * the user has dismissed it or after a successful install.
 */
@customElement('install-banner')
export class InstallBanner extends LitElement {
  static styles = css`
    :host {
      display: block;
      font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
    }

    .bar {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.6rem 1rem;
      color: #fff7ee;
      background: #6f4e37; /* espresso */
      box-shadow: 0 2px 8px rgba(58, 42, 30, 0.25);
    }

    .icon {
      font-size: 1.25rem;
      line-height: 1;
    }

    .text {
      flex: 1;
      min-width: 0;
      font-size: 0.9rem;
      line-height: 1.3;
    }

    .text strong {
      font-weight: 700;
    }

    button {
      font: inherit;
      font-weight: 600;
      cursor: pointer;
      border-radius: 8px;
    }

    .install {
      padding: 0.45rem 1rem;
      color: #6f4e37;
      background: #fff7ee;
      border: none;
    }

    .install:hover {
      background: #ffffff;
    }

    .dismiss {
      padding: 0.3rem 0.55rem;
      color: #fff7ee;
      background: transparent;
      border: 1px solid rgba(255, 247, 238, 0.5);
      line-height: 1;
    }

    .dismiss:hover {
      background: rgba(255, 247, 238, 0.15);
    }

    @media (max-width: 30rem) {
      .text {
        font-size: 0.82rem;
      }
    }
  `;

  /** The deferred install prompt, captured from `beforeinstallprompt`. */
  private _deferredPrompt: BeforeInstallPromptEvent | null = null;

  @state() private _visible = false;

  private _onBeforeInstallPrompt = (event: Event) => {
    // Stop Chrome's mini-infobar so we can show our own banner instead.
    event.preventDefault();
    this._deferredPrompt = event as BeforeInstallPromptEvent;
    if (localStorage.getItem(DISMISSED_KEY) !== '1') this._visible = true;
  };

  private _onAppInstalled = () => {
    this._deferredPrompt = null;
    this._visible = false;
  };

  connectedCallback() {
    super.connectedCallback();
    window.addEventListener('beforeinstallprompt', this._onBeforeInstallPrompt);
    window.addEventListener('appinstalled', this._onAppInstalled);
  }

  disconnectedCallback() {
    window.removeEventListener('beforeinstallprompt', this._onBeforeInstallPrompt);
    window.removeEventListener('appinstalled', this._onAppInstalled);
    super.disconnectedCallback();
  }

  private async _install() {
    const prompt = this._deferredPrompt;
    if (!prompt) return;
    this._visible = false;
    await prompt.prompt();
    await prompt.userChoice.catch(() => undefined);
    // A prompt can only be used once; drop it either way.
    this._deferredPrompt = null;
  }

  private _dismiss() {
    this._visible = false;
    localStorage.setItem(DISMISSED_KEY, '1');
  }

  render() {
    if (!this._visible) return nothing;
    return html`
      <div class="bar" role="region" aria-label="Install app">
        <span class="icon" aria-hidden="true">☕</span>
        <span class="text">
          <strong>Install Espresso Shot Advisor</strong> for quick access and offline use.
        </span>
        <button class="install" @click=${this._install}>Install</button>
        <button class="dismiss" aria-label="Dismiss" title="Dismiss" @click=${this._dismiss}>
          ✕
        </button>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'install-banner': InstallBanner;
  }
}
