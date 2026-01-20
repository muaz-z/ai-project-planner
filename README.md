# AI Project Planner

An intelligent project planning application that transforms high-level ideas into actionable execution plans using AI. Built with React Router 7, TypeScript, and OpenAI.

## 🚀 Live Demo

**Try it now:** [https://ai-project-planner-eta.vercel.app/](https://ai-project-planner-eta.vercel.app/)

## The Problem

Starting a complex project is overwhelming. You have a vague goal like "build a mobile app" but don't know where to start, what to learn first, or how to break it down into manageable steps.

- **Traditional todo apps** require YOU to figure out the breakdown
- **AI chat assistants** give text walls without structure
- **Generic project templates** don't adapt to your skill level or timeline

## The Solution

AI Project Planner gives you a structured, actionable plan in seconds:

1. **Describe your goal** in plain English
2. **Get a phase-by-phase execution plan** tailored to your skill level and time availability
3. **Track progress** with an interactive task board
4. **Get AI explanations** when you need context on why the plan is structured this way

## Features

- 🤖 AI-powered project plan generation
- 📋 Interactive task management with drag-and-drop
- 📊 Progress tracking across phases and tasks
- 💾 Local storage persistence
- 🎨 Modern, responsive UI with TailwindCSS
- 🔒 Type-safe with TypeScript and Zod validation
- ⚡️ Real-time AI explanations with streaming responses
- 🚦 Rate limiting to prevent API abuse

## Scope & Tradeoffs (4–8 Hour MVP)

This project was intentionally scoped to be a polished MVP rather than a fully featured planner.

**What I prioritized:**

- Clear goal → structured plan → actionable tasks
- Human-in-the-loop control (regenerate, reorder, explain)
- Strong UX for understanding and executing a plan

**What I intentionally deferred:**

- User accounts and cloud persistence
- Multiple plan tabs/sessions (single active plan keeps UX simple)
- Per-task AI explanations (kept explanations holistic to avoid UI clutter)
- Long-running autonomous agents (user stays in control)

These tradeoffs allowed me to ship a complete, testable product within the given time frame.

## Prerequisites

- Node.js 18+
- OpenAI API key ([Get one here](https://platform.openai.com/api-keys))

## Getting Started

### 1. Installation

Install the dependencies:

```bash
npm install
```

### 2. Environment Configuration

Create a `.env` file in the root directory with the following variables:

```bash
# Required: Your OpenAI API key
OPENAI_API_KEY=sk-your-openai-api-key-here

# Required: OpenAI model to use
# Options: gpt-3.5-turbo, gpt-4, gpt-4o, gpt-4o-mini
OPENAI_MODEL=gpt-4o-mini
```

> **Note:** The application will fail to start if these environment variables are not properly configured.

### 3. Development

Start the development server with HMR:

```bash
npm run dev
```

Your application will be available at `http://localhost:5173`.

## Code Quality

Run type checking, linting, and formatting:

```bash
# Check formatting
npm run format:check

# Format code
npm run format

# Type check
npm run typecheck

# Lint
npm run lint

# Run all checks
npm run check
```

## Building for Production

Create a production build:

```bash
npm run build
```

Run the production server:

```bash
npm run start
```

## Security

### Rate Limiting

Rate limiting is implemented to prevent API abuse and control OpenAI costs:

**Generate Plan Endpoint:**

- 5 requests per 2 minutes per client

**Explain Plan Endpoint:**

- 10 requests per 5 minutes per client

Rate limit information is returned in response headers:

- `X-RateLimit-Limit` - Maximum requests allowed
- `X-RateLimit-Remaining` - Requests remaining in current window
- `X-RateLimit-Reset` - Unix timestamp when the limit resets
- `Retry-After` - Seconds until retry (on 429 responses)

### Request Timeouts

OpenAI API requests have a 30-second timeout with 2 automatic retries to prevent hanging requests.

## Deployment

### Environment Variables

Ensure the following environment variables are set in your production environment:

- `OPENAI_API_KEY` - Your OpenAI API key (required)
- `OPENAI_MODEL` - Model to use: `gpt-3.5-turbo`, `gpt-4`, `gpt-4o`, or `gpt-4o-mini` (required)
- `NODE_ENV` - Set to `production` for production builds

### Docker Deployment

To build and run using Docker:

```bash
docker build -t ai-project-planner .

# Run the container with environment variables
docker run -p 3000:3000 \
  -e OPENAI_API_KEY=your-key-here \
  -e OPENAI_MODEL=gpt-4o-mini \
  -e VITE_APP_ENV=production \
  ai-project-planner
```

The containerized application can be deployed to any platform that supports Docker, including:

- AWS ECS
- Google Cloud Run
- Azure Container Apps
- Digital Ocean App Platform
- Fly.io
- Railway

### DIY Deployment

If you're familiar with deploying Node applications, the built-in app server is production-ready.

Make sure to deploy the output of `npm run build`

```
├── package.json
├── package-lock.json
├── build/
│   ├── client/    # Static assets
│   └── server/    # Server-side code
```

## Tech Stack

- **Framework:** React Router 7
- **Language:** TypeScript
- **Styling:** TailwindCSS
- **UI Components:** Radix UI / Shadcn
- **State Management:** React Query
- **Validation:** Zod
- **AI:** OpenAI API
- **Forms:** React Hook Form

## Technical Decisions

### Why React Router 7?

- Fast builds and simpler than Next.js for this scope
- Built-in streaming support for AI responses
- Single server deployment (no separate API)
- Excellent TypeScript integration

### Why localStorage instead of a database?

- **Zero setup** - works immediately, no backend needed
- **Privacy by default** - data never leaves the user's device
- **Offline-first** - works without internet connection
- **Perfect for MVP** - sufficient for single-device use
- **Trade-off**: No cross-device sync (could add in v2 with auth + cloud storage)

### Why streaming responses?

- **Better UX** - users see progress immediately, not waiting 10+ seconds
- **Builds trust** - transparency in how AI generates the plan
- **Feels responsive** - perception of speed even for slower models

### Why in-memory rate limiting?

- **Good enough for MVP** - handles <1000 concurrent users
- **No dependencies** - no Redis or external service needed
- **Easy to test** - works locally without setup
- **Trade-off**: Resets on server restart (acceptable for demo/MVP)

### Why Zod for validation?

- **Type safety** - schemas generate TypeScript types
- **Runtime validation** - catches errors from user input and AI responses
- **Single source of truth** - same schema for client and server

## Security Features

- Input sanitization to prevent prompt injection
- Environment variable validation at startup
- Type-safe schemas with runtime validation
- Secure localStorage handling with quota checks
- UUID-based request tracking for better audit trails
- Rate limiting to prevent API abuse and control costs

## Troubleshooting

### OpenAI API Issues

This project uses the OpenAI **Responses API** (not Chat Completions). Make sure:

1. You're using a compatible model (e.g.,`gpt-3.5-turbo`, `gpt-4o`, `gpt-4o-mini`, `gpt-4-turbo`)
2. Your OpenAI API key has access to the Responses API
3. Your `OPENAI_MODEL` environment variable is set correctly

If you encounter issues, you can verify your setup:

```bash
# Check your environment variables
npm run dev
# The app will fail to start if OpenAI credentials are invalid
```

### Common Issues

**"Rate limit exceeded"**: Wait for the cooldown period (shown in the error message) or use a different API key.

**"Failed to generate plan"**: Check your OpenAI API key has sufficient credits and the model name is correct.

**localStorage quota exceeded**: Your plan is too large. Try generating a simpler plan or clear your browser's localStorage.
