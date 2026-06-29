import { LitElement, html, css, nothing } from 'lit';
import { customElement, state } from 'lit/decorators.js';

/** localStorage key under which the user's API key is persisted. */
const API_KEY_STORAGE_KEY = 'apiKey';

/**
 * Demo component that gates access behind an API key.
 *
 * On load it requires the user to enter the API key (stored in localStorage).
 * Once a key is present it calls the API-key protected `/api/hello` endpoint
 * and renders the response (or any error).
 */
@customElement('hello-world-app')
export class HelloWorldApp extends LitElement {
  static styles = css`
    :host {
      display: block;
      max-width: 32rem;
      margin: 4rem auto;
      padding: 2rem;
      font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
      color: #1f2933;
      border: 1px solid #e4e7eb;
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
    }

    :host([hidden]) {
      display: none;
    }

    h1 {
      margin: 0 0 0.25rem;
      font-size: 1.5rem;
    }

    p.subtitle {
      margin: 0 0 1.5rem;
      color: #616e7c;
    }

    button {
      font: inherit;
      font-weight: 600;
      padding: 0.6rem 1.2rem;
      color: #fff;
      background: #3b5bdb;
      border: none;
      border-radius: 8px;
      cursor: pointer;
    }

    button:hover:not(:disabled) {
      background: #364fc7;
    }

    button:disabled {
      opacity: 0.6;
      cursor: progress;
    }

    .result {
      margin-top: 1.25rem;
      min-height: 1.5rem;
    }

    .ok {
      color: #0b7285;
      font-weight: 600;
    }

    .err {
      color: #c92a2a;
      font-weight: 600;
    }

    form {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    label {
      font-weight: 600;
      font-size: 0.9rem;
    }

    input {
      font: inherit;
      padding: 0.6rem 0.75rem;
      border: 1px solid #cbd2d9;
      border-radius: 8px;
    }

    input:focus {
      outline: 2px solid #3b5bdb;
      outline-offset: 1px;
      border-color: #3b5bdb;
    }

    .toolbar {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-top: 1.25rem;
    }

    button.link {
      background: none;
      color: #616e7c;
      padding: 0;
      font-weight: 500;
      text-decoration: underline;
    }

    button.link:hover:not(:disabled) {
      background: none;
      color: #1f2933;
    }
  `;

  @state() private _apiKey = localStorage.getItem(API_KEY_STORAGE_KEY) ?? '';
  @state() private _message = '';
  @state() private _error = '';
  @state() private _loading = false;

  render() {
    return this._apiKey ? this._renderApp() : this._renderLogin();
  }

  private _renderLogin() {
    return html`
      <main>
        <h1>Sign in</h1>
        <p class="subtitle">Enter your API key to access this app.</p>

        <form @submit=${this._onLoginSubmit}>
          <label for="api-key">API key</label>
          <input
            id="api-key"
            name="apiKey"
            type="password"
            autocomplete="current-password"
            required
            placeholder="Enter your API key"
          />
          <button type="submit">Continue</button>
        </form>

        <div class="result" role="status" aria-live="polite">
          ${this._error ? html`<p class="err">${this._error}</p>` : nothing}
        </div>
      </main>
    `;
  }

  private _renderApp() {
    return html`
      <main>
        <h1>Azure Static Web App Starter</h1>
        <p class="subtitle">Lit + Vite frontend &middot; C# Functions API &middot; API-key protected</p>

        <button
          type="button"
          @click=${this._callApi}
          ?disabled=${this._loading}
          aria-busy=${this._loading ? 'true' : 'false'}
        >
          ${this._loading ? 'Calling…' : 'Call /api/hello'}
        </button>

        <div class="result" role="status" aria-live="polite">
          ${this._message ? html`<p class="ok">Response: ${this._message}</p>` : nothing}
          ${this._error ? html`<p class="err">${this._error}</p>` : nothing}
        </div>

        <div class="toolbar">
          <button type="button" class="link" @click=${this._signOut}>Sign out</button>
        </div>
      </main>
    `;
  }

  private _onLoginSubmit(event: SubmitEvent) {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    const key = new FormData(form).get('apiKey')?.toString().trim() ?? '';

    if (!key) {
      this._error = 'Please enter an API key.';
      return;
    }

    localStorage.setItem(API_KEY_STORAGE_KEY, key);
    this._error = '';
    this._apiKey = key;
  }

  private _signOut() {
    localStorage.removeItem(API_KEY_STORAGE_KEY);
    this._apiKey = '';
    this._message = '';
    this._error = '';
  }

  private async _callApi() {
    this._loading = true;
    this._error = '';
    this._message = '';

    try {
      const response = await fetch('/api/hello', {
        headers: {
          'x-api-key': this._apiKey,
        },
      });

      if (response.status === 401) {
        // Stored key is wrong/expired — clear it and send the user back to login.
        localStorage.removeItem(API_KEY_STORAGE_KEY);
        this._apiKey = '';
        this._error = 'Unauthorized — your API key is invalid. Please sign in again.';
        return;
      }

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}.`);
      }

      this._message = await response.text();
    } catch (error) {
      this._error = error instanceof Error ? error.message : 'Unknown error.';
    } finally {
      this._loading = false;
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'hello-world-app': HelloWorldApp;
  }
}
