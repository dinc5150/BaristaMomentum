import { LitElement, html, css, nothing, type TemplateResult } from 'lit';
import { customElement, state } from 'lit/decorators.js';

/** localStorage key under which the user's API key is persisted. */
const API_KEY_STORAGE_KEY = 'apiKey';

/** localStorage key under which all form settings are persisted. */
const SETTINGS_STORAGE_KEY = 'coffeeAdvisorSettings';

/** Option lists for the select / radio inputs. */
const ROAST_LEVELS = ['Light', 'Medium', 'Dark'] as const;
const CREMA_COLOURS = [
  'Hazelnut',
  'Golden caramel',
  'Deep amber',
  'Tiger striping',
  'Pale blond',
  'Light tan',
  'Dark brown',
  'Red-brown',
  'Grey/muddy',
] as const;
const CREMA_THICKNESS = ['Thick (2–4 mm)', 'Medium', 'Thin', 'Almost None'] as const;
const CREMA_PERSISTENCE = [
  'Holds 30–60 sec',
  'Fades moderately',
  'Fades quickly',
  'Disappears immediately',
] as const;
const CREMA_TEXTURE = ['Fine tight bubbles', 'Large soapy bubbles'] as const;
const INITIAL_DRIP = ['Smooth', 'Slow', 'Sputtering', 'Immediate fast flow'] as const;
const BLONDING_TIMING = ['Late', 'Medium', 'Early', 'Immediate'] as const;
const AROMA_QUALITY = ['Sweet / balanced', 'Neutral', 'Sour', 'Bitter / burnt', 'Metallic / off'] as const;
const AROMA_INTENSITY = ['Strong', 'Moderate', 'Weak'] as const;
const SWEETNESS = ['High', 'Medium', 'Low', 'None'] as const;
const ACIDITY = ['Balanced', 'Bright', 'Sharp / Sour', 'Flat'] as const;
const BITTERNESS = ['Clean', 'Balanced', 'Harsh', 'Burnt'] as const;
const BODY = ['Silky', 'Medium', 'Thin', 'Astringent'] as const;
const AFTERTASTE = ['Pleasant', 'Neutral', 'Dry', 'Bitter', 'Sour'] as const;

/** Every value the user can set on the form. Persisted to localStorage as a whole. */
interface Settings {
  // Beans
  roastDate: string;
  roastLevel: string;
  // Configuration
  shots: string;
  machine: string;
  waterTemperatureC: number;
  // Extraction
  doseGrams: number;
  yieldGrams: number;
  timeSeconds: number;
  // Result
  resultDescription: string;
  // Advanced — Crema
  cremaColour: string;
  cremaThickness: string;
  cremaPersistence: string;
  cremaTexture: string;
  // Advanced — Shot
  initialDrip: string;
  blondingTiming: string;
  // Advanced — Aroma
  aromaQuality: string;
  aromaIntensity: string;
  // Advanced — Taste & Mouthfeel
  sweetness: string;
  acidity: string;
  bitterness: string;
  body: string;
  aftertaste: string;
  // UI
  advancedOpen: boolean;
}

/** The default value for every setting; also what the "Reset defaults" button restores. */
const DEFAULT_SETTINGS: Settings = {
  roastDate: '',
  roastLevel: 'Medium',
  shots: '2',
  machine: '',
  waterTemperatureC: 93,
  doseGrams: 18,
  yieldGrams: 36,
  timeSeconds: 28,
  resultDescription: '',
  cremaColour: 'Golden caramel',
  cremaThickness: CREMA_THICKNESS[0],
  cremaPersistence: CREMA_PERSISTENCE[0],
  cremaTexture: CREMA_TEXTURE[0],
  initialDrip: INITIAL_DRIP[0],
  blondingTiming: BLONDING_TIMING[0],
  aromaQuality: AROMA_QUALITY[0],
  aromaIntensity: AROMA_INTENSITY[0],
  sweetness: SWEETNESS[0],
  acidity: ACIDITY[0],
  bitterness: BITTERNESS[0],
  body: BODY[0],
  aftertaste: AFTERTASTE[0],
  advancedOpen: false,
};

/**
 * Espresso shot advisor. After API-key sign-in it renders a form describing a
 * shot (beans, configuration, extraction, result, and an optional Advanced
 * sensory section), POSTs it to `/api/coffee/recommendations`, and renders the
 * AI-generated markdown advice.
 */
@customElement('coffee-advisor-app')
export class CoffeeAdvisorApp extends LitElement {
  static styles = css`
    :host {
      display: block;
      max-width: 44rem;
      margin: 3rem auto;
      padding: 2rem;
      font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
      color: #1f2933;
      border: 1px solid #e4e7eb;
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
    }

    h1 {
      margin: 0 0 0.25rem;
      font-size: 1.5rem;
    }

    p.subtitle {
      margin: 0 0 1.5rem;
      color: #616e7c;
    }

    form {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    fieldset {
      border: 1px solid #e4e7eb;
      border-radius: 10px;
      padding: 1rem 1.25rem 1.25rem;
    }

    legend {
      font-weight: 700;
      padding: 0 0.4rem;
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(13rem, 1fr));
      gap: 1rem;
    }

    .field {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }

    label {
      font-weight: 600;
      font-size: 0.85rem;
    }

    .value {
      font-weight: 700;
      color: #3b5bdb;
    }

    input,
    select,
    textarea {
      font: inherit;
      padding: 0.5rem 0.65rem;
      border: 1px solid #cbd2d9;
      border-radius: 8px;
      background: #fff;
    }

    input[type='range'] {
      padding: 0;
    }

    input:focus,
    select:focus,
    textarea:focus {
      outline: 2px solid #3b5bdb;
      outline-offset: 1px;
      border-color: #3b5bdb;
    }

    textarea {
      resize: vertical;
      min-height: 4.5rem;
    }

    details {
      border: 1px solid #e4e7eb;
      border-radius: 10px;
      padding: 0.5rem 1rem;
    }

    details[open] {
      padding-bottom: 1rem;
    }

    summary {
      font-weight: 700;
      cursor: pointer;
      padding: 0.4rem 0;
    }

    details .grid {
      margin-top: 1rem;
    }

    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      align-items: center;
    }

    button[type='submit'] {
      font: inherit;
      font-weight: 600;
      padding: 0.7rem 1.4rem;
      color: #fff;
      background: #3b5bdb;
      border: none;
      border-radius: 8px;
      cursor: pointer;
    }

    button[type='submit']:hover:not(:disabled) {
      background: #364fc7;
    }

    button.secondary {
      font: inherit;
      font-weight: 600;
      padding: 0.7rem 1.4rem;
      color: #3b5bdb;
      background: #fff;
      border: 1px solid #3b5bdb;
      border-radius: 8px;
      cursor: pointer;
    }

    button.secondary:hover:not(:disabled) {
      background: #eef1fc;
    }

    button:disabled {
      opacity: 0.6;
      cursor: progress;
    }

    button.link {
      background: none;
      color: #616e7c;
      border: none;
      padding: 0;
      font: inherit;
      font-weight: 500;
      text-decoration: underline;
      cursor: pointer;
    }

    .toolbar {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-top: 1.5rem;
    }

    .result {
      margin-top: 1.5rem;
    }

    .err {
      color: #c92a2a;
      font-weight: 600;
    }

    .recommendations {
      background: #f7f9fc;
      border: 1px solid #e4e7eb;
      border-radius: 10px;
      padding: 1rem 1.25rem;
      line-height: 1.5;
    }

    .recommendations :first-child {
      margin-top: 0;
    }

    .recommendations h2 {
      font-size: 1.1rem;
    }

    /* Sign-in screen */
    .signin {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      max-width: 22rem;
    }
  `;

  @state() private _apiKey = localStorage.getItem(API_KEY_STORAGE_KEY) ?? '';
  @state() private _loading = false;
  @state() private _error = '';
  @state() private _recommendations = '';

  // All form settings, loaded from localStorage (merged over defaults) and
  // re-persisted on every change. `advancedOpen` lives here too so the
  // expanded/collapsed state survives a refresh.
  @state() private _settings: Settings = this._loadSettings();

  render() {
    return this._apiKey ? this._renderApp() : this._renderLogin();
  }

  private _renderLogin() {
    return html`
      <main>
        <h1>Sign in</h1>
        <p class="subtitle">Enter your API key to access the espresso advisor.</p>
        <form class="signin" @submit=${this._onLoginSubmit}>
          <div class="field">
            <label for="api-key">API key</label>
            <input
              id="api-key"
              name="apiKey"
              type="password"
              autocomplete="current-password"
              required
              placeholder="Enter your API key"
            />
          </div>
          <button type="submit">Continue</button>
          ${this._error ? html`<p class="err" role="alert">${this._error}</p>` : nothing}
        </form>
      </main>
    `;
  }

  private _renderApp() {
    return html`
      <main>
        <h1>☕ Espresso Shot Advisor</h1>
        <p class="subtitle">Describe your shot and get AI recommendations to dial it in.</p>

        <form @submit=${this._onSubmit}>
          <fieldset>
            <legend>1. Beans</legend>
            <div class="grid">
              <div class="field">
                <label for="roastDate">Roast date</label>
                <input
                  id="roastDate"
                  type="date"
                  .value=${this._settings.roastDate}
                  @input=${(e: Event) =>
                    this._updateSetting('roastDate', (e.target as HTMLInputElement).value)}
                />
              </div>
              ${this._select('roastLevel', 'Roast level', ROAST_LEVELS)}
            </div>
          </fieldset>

          <fieldset>
            <legend>2. Configuration</legend>
            <div class="grid">
              ${this._select('shots', 'Shots', ['1', '2'])}
              <div class="field">
                <label for="machine">Machine (brand / model)</label>
                <input
                  id="machine"
                  type="text"
                  placeholder="e.g. Breville Barista Pro"
                  .value=${this._settings.machine}
                  @input=${(e: Event) =>
                    this._updateSetting('machine', (e.target as HTMLInputElement).value)}
                />
              </div>
              ${this._slider('waterTemperatureC', 'Water temperature', 90, 95, 0.5, '°C')}
            </div>
          </fieldset>

          <fieldset>
            <legend>3. Extraction</legend>
            <div class="grid">
              ${this._slider('doseGrams', 'Dose', 6, 26, 0.1, 'g')}
              ${this._slider('yieldGrams', 'Yield', 0, 40, 0.5, 'g')}
              ${this._slider('timeSeconds', 'Time', 0, 40, 1, 's')}
            </div>
          </fieldset>

          <fieldset>
            <legend>4. Result</legend>
            <div class="field">
              <label for="resultDescription">What was the shot like?</label>
              <textarea
                id="resultDescription"
                required
                placeholder="e.g. Ran fast and tasted sour and thin, very little crema."
                .value=${this._settings.resultDescription}
                @input=${(e: Event) =>
                  this._updateSetting('resultDescription', (e.target as HTMLTextAreaElement).value)}
              ></textarea>
            </div>
          </fieldset>

          <details
            ?open=${this._settings.advancedOpen}
            @toggle=${(e: Event) =>
              this._updateSetting('advancedOpen', (e.target as HTMLDetailsElement).open)}
          >
            <summary>Advanced (optional sensory notes)</summary>

            <fieldset style="border:none;padding:0;margin:0;">
              <legend class="sr-only" style="font-weight:600;">5. Crema</legend>
              <div class="grid">
                ${this._select('cremaColour', 'Crema colour', CREMA_COLOURS)}
                ${this._select('cremaThickness', 'Crema thickness', CREMA_THICKNESS)}
                ${this._select('cremaPersistence', 'Crema persistence', CREMA_PERSISTENCE)}
                ${this._select('cremaTexture', 'Crema texture', CREMA_TEXTURE)}
              </div>
            </fieldset>

            <fieldset style="border:none;padding:0;margin:1rem 0 0;">
              <legend style="font-weight:600;padding:0;">6. Shot</legend>
              <div class="grid">
                ${this._select('initialDrip', 'Initial drip', INITIAL_DRIP)}
                ${this._select('blondingTiming', 'Blonding timing', BLONDING_TIMING)}
              </div>
            </fieldset>

            <fieldset style="border:none;padding:0;margin:1rem 0 0;">
              <legend style="font-weight:600;padding:0;">7. Aroma</legend>
              <div class="grid">
                ${this._select('aromaQuality', 'Aroma quality', AROMA_QUALITY)}
                ${this._select('aromaIntensity', 'Aroma intensity', AROMA_INTENSITY)}
              </div>
            </fieldset>

            <fieldset style="border:none;padding:0;margin:1rem 0 0;">
              <legend style="font-weight:600;padding:0;">8. Taste &amp; Mouthfeel</legend>
              <div class="grid">
                ${this._select('sweetness', 'Sweetness', SWEETNESS)}
                ${this._select('acidity', 'Acidity', ACIDITY)}
                ${this._select('bitterness', 'Bitterness', BITTERNESS)}
                ${this._select('body', 'Body / texture', BODY)}
                ${this._select('aftertaste', 'Aftertaste', AFTERTASTE)}
              </div>
            </fieldset>
          </details>

          <div class="actions">
            <button type="submit" ?disabled=${this._loading} aria-busy=${this._loading ? 'true' : 'false'}>
              ${this._loading ? 'Assessing…' : 'Get recommendations'}
            </button>
            <button type="button" class="secondary" ?disabled=${this._loading} @click=${this._resetDefaults}>
              Reset defaults
            </button>
          </div>
        </form>

        <div class="result" role="status" aria-live="polite">
          ${this._error ? html`<p class="err">${this._error}</p>` : nothing}
          ${this._recommendations
            ? html`<div class="recommendations">${this._renderMarkdown(this._recommendations)}</div>`
            : nothing}
        </div>

        <div class="toolbar">
          <button type="button" class="link" @click=${this._signOut}>Sign out</button>
        </div>
      </main>
    `;
  }

  /** Renders a labelled <select> bound to a setting. */
  private _select(name: keyof Settings, label: string, options: readonly string[]): TemplateResult {
    const value = String(this._settings[name]);
    return html`
      <div class="field">
        <label for=${name}>${label}</label>
        <select
          id=${name}
          .value=${value}
          @change=${(e: Event) => this._updateSetting(name, (e.target as HTMLSelectElement).value)}
        >
          ${options.map((opt) => html`<option value=${opt} ?selected=${opt === value}>${opt}</option>`)}
        </select>
      </div>
    `;
  }

  /** Renders a labelled range slider bound to a numeric setting; shows its live value. */
  private _slider(
    name: keyof Settings,
    label: string,
    min: number,
    max: number,
    step: number,
    unit: string,
  ): TemplateResult {
    const value = this._settings[name] as number;
    return html`
      <div class="field">
        <label for=${name}>${label}: <span class="value">${value} ${unit}</span></label>
        <input
          id=${name}
          type="range"
          min=${min}
          max=${max}
          step=${step}
          .value=${String(value)}
          @input=${(e: Event) => this._updateSetting(name, Number((e.target as HTMLInputElement).value))}
        />
      </div>
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
    this._recommendations = '';
    this._error = '';
  }

  private async _onSubmit(event: SubmitEvent) {
    event.preventDefault();
    const payload = this._buildPayload();

    this._loading = true;
    this._error = '';
    this._recommendations = '';

    try {
      const response = await fetch('/api/coffee/recommendations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this._apiKey,
        },
        body: JSON.stringify(payload),
      });

      if (response.status === 401) {
        localStorage.removeItem(API_KEY_STORAGE_KEY);
        this._apiKey = '';
        this._error = 'Unauthorized — your API key is invalid. Please sign in again.';
        return;
      }

      const body = await response.json().catch(() => null);

      if (!response.ok) {
        const detail = body?.details?.length ? `: ${body.details.join(', ')}` : '';
        throw new Error((body?.error ?? `Request failed (${response.status})`) + detail);
      }

      this._recommendations = body?.recommendations ?? 'No recommendations returned.';
    } catch (error) {
      this._error = error instanceof Error ? error.message : 'Unknown error.';
    } finally {
      this._loading = false;
    }
  }

  /** Shapes the current settings into the nested request the API expects. */
  private _buildPayload() {
    const s = this._settings;
    const opt = (value: string) => value.trim() || undefined;

    const advanced = {
      crema: {
        colour: opt(s.cremaColour),
        thickness: opt(s.cremaThickness),
        persistence: opt(s.cremaPersistence),
        texture: opt(s.cremaTexture),
      },
      shot: {
        initialDrip: opt(s.initialDrip),
        blondingTiming: opt(s.blondingTiming),
      },
      aroma: {
        quality: opt(s.aromaQuality),
        intensity: opt(s.aromaIntensity),
      },
      tasteAndMouthfeel: {
        sweetness: opt(s.sweetness),
        acidity: opt(s.acidity),
        bitterness: opt(s.bitterness),
        body: opt(s.body),
        aftertaste: opt(s.aftertaste),
      },
    };

    return {
      beans: {
        roastDate: opt(s.roastDate),
        roastLevel: opt(s.roastLevel),
      },
      configuration: {
        shots: Number(s.shots),
        machine: opt(s.machine),
        waterTemperatureC: s.waterTemperatureC,
      },
      extraction: {
        doseGrams: s.doseGrams,
        yieldGrams: s.yieldGrams,
        timeSeconds: s.timeSeconds,
      },
      result: {
        description: opt(s.resultDescription),
      },
      // Only send the advanced block when the section is expanded; otherwise
      // pass null so the API (and prompt) treat all advanced fields as absent.
      advanced: s.advancedOpen ? advanced : null,
    };
  }

  // --- Settings persistence ---------------------------------------------------

  /** Loads settings from localStorage, merged over defaults so new fields are filled in. */
  private _loadSettings(): Settings {
    try {
      const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (raw) {
        return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<Settings>) };
      }
    } catch {
      // Corrupt/unreadable storage — fall back to defaults.
    }
    return { ...DEFAULT_SETTINGS };
  }

  /** Updates one setting (immutably, so Lit re-renders) and persists everything. */
  private _updateSetting(name: keyof Settings, value: string | number | boolean) {
    this._settings = { ...this._settings, [name]: value };
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(this._settings));
  }

  /** Restores every field to its default value and persists the result. */
  private _resetDefaults() {
    this._settings = { ...DEFAULT_SETTINGS };
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(this._settings));
  }

  /**
   * Minimal, dependency-free markdown renderer for the subset the prompt emits
   * (headings, bold, and `-` bullet lists). Text is escaped first, so this is
   * safe to render as HTML.
   */
  private _renderMarkdown(markdown: string): TemplateResult {
    const escape = (s: string) =>
      s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    const lines = markdown.replace(/\r\n/g, '\n').split('\n');
    const blocks: string[] = [];
    let list: string[] = [];

    const flushList = () => {
      if (list.length) {
        blocks.push(`<ul>${list.join('')}</ul>`);
        list = [];
      }
    };

    const inline = (s: string) =>
      escape(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

    for (const raw of lines) {
      const line = raw.trimEnd();
      const heading = line.match(/^(#{1,6})\s+(.*)$/);
      const bullet = line.match(/^[-*]\s+(.*)$/);

      if (heading) {
        flushList();
        const level = Math.min(heading[1].length + 1, 6); // shift so # -> h2
        blocks.push(`<h${level}>${inline(heading[2])}</h${level}>`);
      } else if (bullet) {
        list.push(`<li>${inline(bullet[1])}</li>`);
      } else if (line === '') {
        flushList();
      } else {
        flushList();
        blocks.push(`<p>${inline(line)}</p>`);
      }
    }
    flushList();

    const template = document.createElement('template');
    template.innerHTML = blocks.join('');
    return html`${template.content.cloneNode(true)}`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'coffee-advisor-app': CoffeeAdvisorApp;
  }
}
