# FS Cockpit - AI Coding Agent Instructions

## Project Overview

**FS Cockpit** is a production-ready IT diagnostics and monitoring platform built with React 18 + TypeScript + Vite. It provides unified ticket management with ServiceNow integration, Azure AD B2C authentication, and real-time diagnostics. The app includes fallback mechanisms for offline/demo mode when backend APIs are unavailable.

**Tech Stack**: React 18.2, TypeScript 5.3, Vite 6.0, MSAL 3.11, Axios 1.6, Radix UI, Tailwind CSS 3.4, React Router 6.8

## Architecture Patterns

### Authentication Flow

- **MSAL Integration**: Uses `@azure/msal-react` with popup-based auth (see `src/config/msalConfig.ts`)
  - Client ID: `64db8b2f-22ad-4ded-86b9-c91a43623f78`
  - Authority: `https://zenpoc.b2clogin.com/zenpoc.onmicrosoft.com/B2C_1_NTT_SIGNUP_SIGNIN`
  - Cache: `sessionStorage` with `storeAuthStateInCookie: true`
- **Demo Mode Fallback**: If Azure AD fails, app stores demo credentials in `localStorage` with `demo.mode=true` flag
- **Token Storage**: Access tokens stored in `localStorage` as `msal.token`, account data as `msal.account` (includes full account object + idTokenClaims)
- **Auth Hook**: `useAuth()` (`src/hooks/useAuth.ts`) normalizes MSAL account data extracting email from various claim fields (email, upn, preferred_username, mail, emails[0])
- **Initialization**: MSAL initialized in `src/index.tsx` with `handleRedirectPromise()` before app render
- **Logout**: Clears all storage (localStorage + sessionStorage), redirects to `/login` - skips MSAL popup to avoid hang

### State Management

- **Global Tickets Context**: `TicketsContext` (`src/screens/Frame/sections/shared/TicketsContext.tsx`) manages all ticket state
- **Context provides**: `myTickets`, `searchResults`, `isLoading`, `isSearching`, `error`, `selectedTicketId`, `activeTab`, `fetchTickets()`, `searchTickets()`, `clearSearchResults()`, `setSelectedTicketId()`, `setActiveTab()`
- **Context Hook**: Use `useTickets()` to access context - throws error if used outside TicketsProvider
- **Priority Mapping**: API returns numeric priorities (1=High, 2=Medium, 3=Low) which are transformed to text labels in `api.ts` using `mapPriorityToText()` helper
- **Fetch on Mount**: Tickets auto-fetch when context initializes via `useEffect`, don't manually refetch in components
- **Search Flow**: `searchTickets()` automatically calls appropriate API endpoint based on search type (User/Device/Ticket), updates `searchResults` state

### API Integration

- **Base Client**: `apiClient` in `src/services/api.ts` with Axios, 30s timeout, automatic bearer token injection from `localStorage.getItem('msal.token')`
- **Request Interceptor**: Auto-injects `Authorization: Bearer ${token}` header on all requests
- **Response Interceptor**: Catches 401 errors, clears auth data, redirects to `/login`
- **Environment Logger**: `logger` object with debug/info/warn/error methods, conditionally logs based on `import.meta.env.MODE !== 'production'`
- **Fallback Pattern**: All API calls gracefully handle failures, return mock/empty data with `success: false` flag
- **API Base URL**: Configured via `VITE_API_BASE_URL` env var (defaults to `http://127.0.0.1:8000/api/v1`)
  - Vite injects via `define` in `vite.config.ts` using `loadEnv()`
  - Prefers `import.meta.env.VITE_API_BASE_URL`, falls back to `process.env.VITE_API_BASE_URL`, then default
- **Response Transform**: Raw ServiceNow incidents transformed with helper functions:
  - `mapPriorityToText()`: 1→High, 2→Medium, 3→Low, handles "Critical"→High
  - `getPriorityColor()`: Maps priority to Tailwind badge classes (e.g., `bg-[#ffe2e2] text-[#c10007]`)
  - `getStatusColor()`: Maps status to badge classes
  - `getTimeAgo()`: Converts ISO timestamps to relative time (e.g., "3 hours ago")
- **Search Types**: Support "User", "Device", "Ticket" search with different API endpoints:
  - **User**: `getUserIncidents(userName)` → `/servicenow/user/{userName}/incidents`
  - **Device**: `getIncidentsByDevice(deviceName)` → `/servicenow/device/{deviceName}/incidents`
  - **Ticket**: `getIncidentByNumber(incidentNumber)` → `/servicenow/incident/{incident_number}/details`
- **Additional APIs**:

  - `knowledgeAPI.getKnowledgeArticles(incidentNumber, limit)` - Fetch related KB articles
  - `deviceAPI.getUserDevices(callerId)` - Get ServiceNow user devices
  - `deviceAPI.getDeviceDetails(deviceName)` - Get Intune device details
  - `deviceAPI.getDeviceDetailsOrchestrated()` - Auto-fetches device name from ServiceNow if missing, then gets Intune details
  - `remoteActionsAPI.getRecommendations(incidentNumber, deviceName?, callerId?, limit)` - POST to `/nextthink/recommendations` to get remote action recommendations with dynamic incident data
  - `healthAPI.checkServiceNowHealth()` - Check ServiceNow service health status
  - `healthAPI.checkIntuneHealth()` - Check Intune service health status
  - `healthAPI.checkNextThinkHealth()` - Check NextThink service health status
  - `healthAPI.getHealthMetrics(hours)` - Get uptime/downtime metrics for all services (default 24 hours)
  - `healthAPI.checkAllServicesHealth()` - Check all three services in parallel using Promise.allSettled

### System Health Monitoring

- **SystemStatusBar Component**: Reusable footer component (`src/components/SystemStatusBar.tsx`) that displays real-time health status
  - Shows ServiceNow, Intune, and NextThink with color-coded indicators (green=healthy, red=unhealthy)
  - Expandable view shows detailed metrics: uptime %, downtime %, total checks, downtime minutes
  - Auto-refreshes every 2 hours (7200000ms interval)
  - Fetches health status on mount and metrics when expanded
  - Uses parallel API calls with Promise.allSettled for resilient health checks
- **Health Status Colors**: `bg-[#00c950]` for healthy, `bg-[#dc2626]` for unhealthy
- **Polling Strategy**: Initial check on mount + 2-hour intervals, metrics fetched on-demand when details expanded
- **Used In**: All main screen sections (HomeSearchSection, IssueSearchSection, IssueDetailsSection)

- **Screens**: Top-level routes in `src/screens/Frame/sections/` (HomeSearchSection, IssueSearchSection, IssueDetailsSection, SignInSection)
- **Shared Components**: Reusable ticket components in `sections/shared/` (TicketsList, TicketDetailsView, StubbedTicketDetailsView, TicketsContext)
  - `TicketDetailsView`: Dynamic component that fetches real API data (device details, knowledge articles, remote actions) using Promise.allSettled for parallel loading
  - `StubbedTicketDetailsView`: Demo/stub component that displays pre-defined API responses without making actual API calls - used exclusively for Copilot tab demonstration
- **UI Components**: shadcn/ui-based components in `src/components/ui/` using Radix primitives + Tailwind + CVA
- **Icons**: Custom SVG icons in `src/components/icons/` exported via barrel index, inline SVG components with gradients/filters
- **Stub Data Pattern**:
  - Copilot tab uses stubbed data to demonstrate AI diagnostic capabilities without backend dependencies
  - Stubbed data includes: complete ticket object, device details (IntuneDevice), knowledge articles (KnowledgeArticle[]), remote actions (RemoteAction[])
  - Stubbed conversation mirrors realistic diagnostic Q&A with confidence levels, root cause analysis, action recommendations
  - My Tickets tab remains fully dynamic with real-time API calls

### Routing & Navigation

- **React Router**: BrowserRouter with routes: `/login`, `/home`, `/home/:id`, `/search`, `/issue/:id`
  - Root `/` redirects to `/login` via Navigate component
  - All routes wrapped in `MsalProvider` → `TicketsProvider` hierarchy (see `src/index.tsx`)
- **MSAL Initialization Sequence**: Critical order enforced in `src/index.tsx`:
  1. `msalInstance.initialize()` - Initialize MSAL client
  2. `msalInstance.handleRedirectPromise()` - Process any redirect responses (stores token/account in localStorage)
  3. Render React app - Only after auth initialization completes
- **Master-Detail**: `/home/:id` shows ticket list + details side-by-side, `:id` param controls right panel
- **Navigation Pattern**: Use `navigate('/home/INC123')` to show ticket details, not `setSelectedTicketId()` directly

## Styling Conventions

### Tailwind + CSS Variables

- **Design System**: Uses HSL CSS variables (defined in `tailwind.css` at project root) like `hsl(var(--primary))`
- **Color Classes**: Prefer semantic variables over hardcoded colors except for specific UI colors (e.g., status badges use `bg-[#dbeafe]`)
- **Class Utility**: Always use `cn()` from `lib/utils.ts` to merge Tailwind classes with conflict resolution via `tailwind-merge`
- **CVA Pattern**: Use `class-variance-authority` for component variants (see `button.tsx` for example with `buttonVariants` cva and `VariantProps` type)

### Component Patterns

- **Compound Components**: UI components use Radix compound patterns (e.g., `Card`, `CardHeader`, `CardContent`)
- **Props Forwarding**: Use `React.ComponentPropsWithoutRef` + spread props for extensible components
- **Ref Forwarding**: All UI primitives use `React.forwardRef` for DOM access

## Development Workflow

### Commands

```bash
npm run dev       # Dev server on port 3000 with --host flag (accessible on network)
npm run build     # Production build to dist/
npm run preview   # Preview production build
```

### Environment Setup

- **Env Variables**:
  - Development: Uses default `http://127.0.0.1:8000/api/v1` if `VITE_API_BASE_URL` not set
  - Production: Create `.env.production` with `VITE_API_BASE_URL=https://ntt-ai-wapp.azurewebsites.net/api/v1`
- **No .env file required**: Default config works out-of-box for local backend on port 8000
- **Vite Config**: Uses `loadEnv()` to read env vars, then injects via `define: { 'import.meta.env.VITE_API_BASE_URL': JSON.stringify(...) }`
- **Access in Code**: Use `import.meta.env.VITE_API_BASE_URL`, falls back to `process.env.VITE_API_BASE_URL`, then default
- **Static Assets**: Public files go in `./static` directory (configured via `publicDir` in vite.config.ts)

### Build Optimization

- **Manual Chunks**: Vendor code split into `vendor`, `msal`, `ui`, `icons` chunks for optimal caching (see `vite.config.ts` rollupOptions)
- **No Sourcemaps**: Production builds have `sourcemap: false` for security
- **ES2020 Target**: Modern JS output, no legacy browser support
- **Build Output**: Static files in `dist/`, served with relative paths (`base: './'`)
- **Dev Server**: Runs on port 3000 with `host: true` (network accessible), `cors: true`, `strictPort: false`

## Critical Patterns to Follow

1. **Don't fetch tickets in components** - Use `useTickets()` hook, data auto-fetches on context mount
2. **Demo mode checks** - Always check `localStorage.getItem('demo.mode')` before MSAL operations
3. **Priority mapping** - API returns numeric values (1=High, 2=Medium, 3=Low), automatically transformed by `mapPriorityToText()` in `api.ts`
4. **Error handling** - Log errors to console then provide graceful fallback (mock data or empty states)
5. **TypeScript strict mode** - Enabled, all code must pass `strict: true`, `noUnusedLocals: true`, `noUnusedParameters: true`
6. **Import paths** - Use relative imports (e.g., `../../../../services/api`), no path aliases configured
7. **Stubbed vs Dynamic Data** - Copilot tab uses `StubbedTicketDetailsView` with pre-defined responses, My Tickets tab uses `TicketDetailsView` with live API calls
8. **Logger Usage** - Use `logger` from `api.ts` for environment-aware logging (debug/info only in dev, errors always logged)

## API Endpoints Reference

- `/servicenow/user/{userName}/incidents` - Get tickets by username
- `/servicenow/device/{deviceName}/incidents` - Get tickets by device
- `/servicenow/incident/{incident_number}/details` - Get specific incident by ticket number (used for "Ticket" search type)
- `/servicenow/technician/FS_Cockpit_Integration/incidents` - Get all tickets assigned to technician
- `/servicenow/user/{callerId}/devices` - Get user's devices from ServiceNow
- `/intune/devices/name/{deviceName}` - Get device details from Intune
- `/servicenow/incident/{incidentNumber}/knowledge?limit={n}` - Get related KB articles
- `/nextthink/recommendations` (POST) - Get remote action recommendations with incident data
- `/servicenow/health` - Check ServiceNow health status (returns healthy/unhealthy)
- `/intune/health` - Check Intune health status (returns healthy/unhealthy)
- `/nextthink/health` - Check NextThink health status (returns healthy/unhealthy)
- `/health/metrics?hours={n}` - Get uptime/downtime metrics for all services over specified hours

## Deployment

- **Docker**: Multi-stage build with Node 23 Alpine, serves via `serve -s dist` on port 3000
- **Nginx Alternative**: Includes `nginx.conf` for SPA routing with health checks, gzip, security headers
- **Static Assets**: Build outputs to `dist/`, all paths are relative (`base: './'` in Vite config)

## Common Troubleshooting

### Auth Issues

- If MSAL hangs on logout, ensure you're clearing storage and redirecting directly (no popup) - see `useAuth.ts` logout implementation
- Token stored as `msal.token` in localStorage, account data as `msal.account` with full idTokenClaims
- Demo mode triggered by `demo.mode=true` in localStorage, bypasses MSAL entirely

### API Issues

- All API calls have graceful fallbacks - check `success: false` flag in responses
- Request interceptor auto-injects bearer token from localStorage
- Response interceptor catches 401s and auto-redirects to `/login`
- Use `logger` functions for debug output - they're environment-aware

### State Management

- `TicketsContext` auto-fetches on mount - don't call `fetchTickets()` in components unnecessarily
- `searchTickets()` automatically routes to correct API based on search type (User/Device/Ticket)
- Use `useTickets()` hook everywhere - throws error if used outside TicketsProvider

### Build Issues

- Vite uses `define` to inject env vars at build time - they become literal strings in bundle
- If env var changes don't apply, restart dev server (`npm run dev`)
- Production builds with `sourcemap: false` for security - no source maps in dist/
