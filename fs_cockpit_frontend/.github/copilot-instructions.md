# FS Cockpit - AI Coding Agent Instructions

## Project Overview

**FS Cockpit** is a production-ready IT diagnostics and monitoring platform built with React 18 + TypeScript + Vite. It provides unified ticket management with ServiceNow integration, Azure AD B2C authentication, and real-time diagnostics. The app includes fallback mechanisms for offline/demo mode when backend APIs are unavailable.

## Architecture Patterns

### Authentication Flow

- **MSAL Integration**: Uses `@azure/msal-react` with popup-based auth (see `src/config/msalConfig.ts`)
- **Demo Mode Fallback**: If Azure AD fails, app stores demo credentials in `localStorage` with `demo.mode=true` flag
- **Token Storage**: Access tokens stored in `localStorage` as `msal.token`, account data as `msal.account`
- **Auth Hook**: `useAuth()` normalizes MSAL account data extracting email from various claim fields (email, upn, preferred_username, mail, emails[0])

### State Management

- **Global Tickets Context**: `TicketsContext` (`src/screens/Frame/sections/shared/TicketsContext.tsx`) manages all ticket state
- **Context provides**: `myTickets`, `searchResults`, `isLoading`, `selectedTicketId`, `fetchTickets()`, `searchTickets()`
- **Priority Mapping**: API returns numeric priorities (1=High, 2=Medium, 3=Low) which are transformed to text labels in `api.ts` using `mapPriorityToText()` helper
- **Fetch on Mount**: Tickets auto-fetch when context initializes, don't manually refetch in components

### API Integration

- **Base Client**: `apiClient` in `src/services/api.ts` with Axios, 30s timeout, automatic bearer token injection
- **Fallback Pattern**: All API calls return mock data if backend fails (see `ticketsAPI.getMyTickets()`)
- **API Base URL**: Configured via `VITE_API_BASE_URL` env var, defaults to `http://127.0.0.1:8005/api/v1`
- **Response Transform**: Raw ServiceNow incidents transformed to UI format with `statusColor`, `priorityColor`, `time` (relative)
- **Search Types**: Support "User", "Device", "Ticket" search with different API endpoints:
  - **User**: `getUserIncidents(userName)` - searches by username
  - **Device**: `getIncidentsByDevice(deviceName)` - searches by device name
  - **Ticket**: `getIncidentByNumber(incidentNumber)` - fetches specific incident by ticket number (e.g., INC0010148)

### Component Structure

- **Screens**: Top-level routes in `src/screens/Frame/sections/` (HomeSearchSection, IssueSearchSection, IssueDetailsSection, SignInSection)
- **Shared Components**: Reusable ticket components in `sections/shared/` (TicketsList, TicketDetailsView, TicketsContext)
- **UI Components**: shadcn/ui-based components in `src/components/ui/` using Radix primitives + Tailwind + CVA
- **Icons**: Custom SVG icons in `src/components/icons/` exported via barrel index, inline SVG components with gradients/filters

### Routing & Navigation

- **React Router**: BrowserRouter with routes: `/login`, `/home`, `/home/:id`, `/search`, `/issue/:id`
- **Master-Detail**: `/home/:id` shows ticket list + details side-by-side, `:id` param controls right panel
- **Navigation Pattern**: Use `navigate('/home/INC123')` to show ticket details, not `setSelectedTicketId()` directly

## Styling Conventions

### Tailwind + CSS Variables

- **Design System**: Uses HSL CSS variables (defined in global CSS) like `hsl(var(--primary))`
- **Color Classes**: Prefer semantic variables over hardcoded colors except for specific UI colors (e.g., status badges use `bg-[#dbeafe]`)
- **Class Utility**: Always use `cn()` from `lib/utils.ts` to merge Tailwind classes with conflict resolution via `tailwind-merge`
- **CVA Pattern**: Use `class-variance-authority` for component variants (see `button.tsx` for example)

### Component Patterns

- **Compound Components**: UI components use Radix compound patterns (e.g., `Card`, `CardHeader`, `CardContent`)
- **Props Forwarding**: Use `React.ComponentPropsWithoutRef` + spread props for extensible components
- **Ref Forwarding**: All UI primitives use `React.forwardRef` for DOM access

## Development Workflow

### Commands

```bash
npm run dev       # Dev server on port 3000
npm run build     # Production build to dist/
npm run preview   # Preview production build
```

### Environment Setup

- **Required Env**: `VITE_API_BASE_URL` (optional, has default)
- **No .env file**: Default config works out-of-box for local backend on port 8005
- **Vite Config**: Uses `loadEnv()` to inject env vars at build time via `define` (see `vite.config.ts`)

### Build Optimization

- **Manual Chunks**: Vendor code split into `vendor`, `msal`, `ui`, `icons` chunks for optimal caching
- **No Sourcemaps**: Production builds have `sourcemap: false` for security
- **ES2020 Target**: Modern JS output, no legacy browser support

## Critical Patterns to Follow

1. **Don't fetch tickets in components** - Use `useTickets()` hook, data auto-fetches on context mount
2. **Demo mode checks** - Always check `localStorage.getItem('demo.mode')` before MSAL operations
3. **Priority mapping** - API returns numeric values (1=High, 2=Medium, 3=Low), automatically transformed by `mapPriorityToText()` in `api.ts`
4. **Error handling** - Log errors to console then provide graceful fallback (mock data or empty states)
5. **TypeScript strict mode** - Enabled, all code must pass `strict: true`, `noUnusedLocals: true`, `noUnusedParameters: true`
6. **Import paths** - Use relative imports (e.g., `../../../../services/api`), no path aliases configured

## API Endpoints Reference

- `/servicenow/user/{userName}/incidents` - Get tickets by username
- `/servicenow/device/{deviceName}/incidents` - Get tickets by device
- `/servicenow/incident/{incident_number}/details` - Get specific incident by ticket number (used for "Ticket" search type)
- `/servicenow/technician/FS_Cockpit_Integration/incidents` - Get all tickets assigned to technician

## Deployment

- **Docker**: Multi-stage build with Node 23 Alpine, serves via `serve -s dist` on port 3000
- **Nginx Alternative**: Includes `nginx.conf` for SPA routing with health checks, gzip, security headers
- **Static Assets**: Build outputs to `dist/`, all paths are relative (`base: './'` in Vite config)
