# Azure Static Web App Starter — Lit + Vite frontend, C# Functions API

A minimal, deployable starter for [Azure Static Web Apps](https://learn.microsoft.com/azure/static-web-apps/) with:

- **Frontend:** [Lit](https://lit.dev/) web components built with [Vite](https://vitejs.dev/) (TypeScript).
- **API:** C# Azure Functions (.NET 8 isolated worker), exposed as the SWA managed API.
- **Endpoints:**
  - `GET /api/hello` → returns the plain string `Hello World`.
  - `POST /api/coffee/recommendations` → accepts a described espresso shot and returns AI advice (markdown) via **Azure OpenAI**.
- **Security:** **every** API request must include a valid `x-api-key` header, enforced by middleware.

## Espresso Shot Advisor

The frontend renders a form (`coffee-advisor-app`) describing a single espresso shot:
beans, machine configuration, extraction numbers, the result, and an optional **Advanced**
section of sensory notes (crema, shot flow, aroma, taste & mouthfeel). It POSTs the data to
`POST /api/coffee/recommendations`.

On the server, `CoffeeAdvisorService` validates the input and builds a barista prompt, then
`OpenAiService` (a thin wrapper over the `Azure.AI.OpenAI` chat client) calls your Azure OpenAI
deployment. The response is markdown advice on how to improve the next pull.

These settings are required (alongside `API_KEY`):

| Setting | Local file | Azure |
| ------- | ---------- | ----- |
| `AZURE_OPENAI_ENDPOINT` | `api/local.settings.json` | SWA → *Configuration* |
| `AZURE_OPENAI_API_KEY` | `api/local.settings.json` | SWA → *Configuration* |
| `AZURE_OPENAI_DEPLOYMENT` | `api/local.settings.json` | SWA → *Configuration* |

`AZURE_OPENAI_DEPLOYMENT` is the **deployment name** of a chat model (e.g. `gpt-4o`) in your
Azure OpenAI resource — not the model id.

### Smoke test

```bash
curl -i -X POST http://localhost:7071/api/coffee/recommendations \
  -H "x-api-key: local-dev-secret-change-me" \
  -H "Content-Type: application/json" \
  -d '{
    "beans": { "roastDate": "2026-06-20", "roastLevel": "Medium" },
    "configuration": { "shots": 2, "machine": "Breville Barista Pro", "waterTemperatureC": 93 },
    "extraction": { "doseGrams": 18, "yieldGrams": 36, "timeSeconds": 22 },
    "result": { "description": "Sour and thin, ran fast with pale crema." }
  }'
```

```
.
├─ api/                       # C# Azure Functions (managed API)
│  ├─ Functions/HelloWorld.cs        # GET /api/hello -> "Hello World"
│  ├─ Middleware/ApiKeyMiddleware.cs # x-api-key enforcement for ALL functions
│  ├─ Program.cs
│  ├─ host.json
│  ├─ local.settings.json            # local secrets (gitignored)
│  └─ HelloWorldApi.csproj
├─ app/                       # Vite + Lit frontend
│  ├─ src/coffee-advisor-app.ts
│  ├─ src/main.ts
│  ├─ index.html
│  └─ package.json
├─ .github/workflows/azure-static-web-apps.yml
└─ staticwebapp.config.json
```

## Prerequisites

- [Node.js](https://nodejs.org/) 18+ and npm
- [.NET SDK 8.0+](https://dotnet.microsoft.com/download)
- [Azure Functions Core Tools v4](https://learn.microsoft.com/azure/azure-functions/functions-run-local) (to run the API locally)
- Optional: [SWA CLI](https://azure.github.io/static-web-apps-cli/) for an integrated local experience

## How the API key works

`ApiKeyMiddleware` runs before every function. It compares the request's `x-api-key`
header (using a constant-time comparison) against the `API_KEY` application setting.
Missing or mismatched keys get a `401 Unauthorized`; there is no way to reach a function
without it. The HTTP trigger itself uses `AuthorizationLevel.Anonymous` because Static Web
Apps managed functions do not honor native Functions host keys — the middleware is the gate.

| Setting | Local file | Azure |
| ------- | ---------- | ----- |
| `API_KEY` (API) | `api/local.settings.json` | SWA → *Configuration* → Application settings |

The frontend no longer bakes the key in at build time. Instead it shows a **sign-in
screen**: the user enters the API key, it is saved to the browser's `localStorage`
(under the key `apiKey`), and the app sends it as the `x-api-key` header on every
request. The app is not usable until a key has been entered, and a `401` response
clears the stored key and returns the user to the sign-in screen.

> ⚠️ **Security note:** a key entered in the browser and held in `localStorage` is
> visible to anyone with access to that browser/device and is **not a server-side
> secret**. This approach is fine for gating a demo or an internal tool, but for real
> per-user access control, prefer SWA's
> [built-in auth](https://learn.microsoft.com/azure/static-web-apps/authentication-authorization)
> and reserve the `x-api-key` check for service-to-service callers, or front the API
> with a backend-for-frontend that injects the key.

## Run locally

### 1. Start the API

```bash
cd api
func start          # serves http://localhost:7071/api/hello
```

The `API_KEY` for local runs is in `api/local.settings.json` (`local-dev-secret-change-me`).

### 2. Start the frontend

```bash
cd app
npm install
npm run dev            # http://localhost:5173, proxies /api -> :7071
```

Open http://localhost:5173, enter the API key (`local-dev-secret-change-me`) on the
sign-in screen, then click **Call /api/hello**.

### Quick API smoke test

```bash
# 401 — no key
curl -i http://localhost:7071/api/hello

# 200 — "Hello World"
curl -i -H "x-api-key: local-dev-secret-change-me" http://localhost:7071/api/hello
```

## Deploy to Azure

1. Push this repo to GitHub.
2. Create a **Static Web App** in the Azure Portal and link it to the repo. Use:
   - **App location:** `app`
   - **Api location:** `api`
   - **Output location:** `dist`
3. Azure adds the deployment token as the `AZURE_STATIC_WEB_APPS_API_TOKEN` secret and the
   included workflow (`.github/workflows/azure-static-web-apps.yml`) builds and deploys on push.
4. In the Static Web App's **Configuration**, add an application setting `API_KEY` with your
   production key. Users enter this same value on the frontend sign-in screen.

## Build checks

```bash
# API
cd api && dotnet build

# Frontend
cd app && npm install && npm run build
```
