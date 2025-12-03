# FS Cockpit - Unified Diagnostics Platform

Production-ready IT diagnostics and monitoring platform with Azure AD B2C authentication.

## Features

✅ **Azure AD B2C Authentication** - Secure enterprise login with fallback demo mode
✅ **Real-time Diagnostics** - System health monitoring
✅ **Ticket Management** - Track and resolve IT issues with mock data fallback
✅ **Unified Search** - Search across users, devices, and tickets
✅ **Root Cause Analysis** - AI-powered diagnostics
✅ **Responsive Design** - Works on all devices
✅ **Offline Mode** - Works with mock data when API is unavailable

## Setup

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Access at: http://localhost:3000

### Production Build

```bash
npm run build
npm run preview
```

## Azure AD B2C Configuration

The application is configured with:

- **Client ID**: `64db8b2f-22ad-4ded-86b9-c91a43623f78`
- **Authority**: `https://zenpoc.b2clogin.com/zenpoc.onmicrosoft.com/B2C_1_NTT_SIGNUP_SIGNIN`
- **Scopes**: `openid`, `profile`

## Environment Variables

Create a `.env` file:

```env
VITE_API_BASE_URL=http://127.0.0.1:8000/api/v1

Note: In development, the app checks `VITE_API_BASE_URL` from Vite's env; if not set, it falls back to `http://127.0.0.1:8000/api/v1`.
```

## Tech Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Azure MSAL** - Authentication
- **Tailwind CSS** - Styling
- **Lucide Icons** - Icon library
- **Radix UI** - Component primitives
- **React Router** - Navigation
- **Axios** - HTTP client

## Project Structure

```
src/
├── components/ui/      # Reusable UI components
├── config/            # Configuration files
├── hooks/             # Custom React hooks
├── screens/           # Page components
├── services/          # API services
└── lib/               # Utility functions
```

## Deployment

Build for production:

```bash
npm run build
```

The `dist/` folder contains the production build ready for deployment.

## License

Proprietary - All rights reserved
