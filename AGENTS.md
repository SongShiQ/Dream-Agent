# AGENTS.md - Project Configuration

## Project: OpenCamp AI Agent

Multi-agent AI assistant for OS Training Camp.

## mancode Modes

### solo (default)
- Lightweight practice mode
- YAGNI checks enabled
- Style-aware development

### /man (playoffs)
- Full 9-step workflow
- Research → Plan → Implement → Validate → Review
- For production or high-risk changes

### /mamba (diagnosis)
- Bug reproduction and root cause analysis
- Real user flow validation
- Regression checks

### /manteam (team)
- Shared memory and decisions
- Conventional Commits
- Coordination across sessions

## YAGNI Priority
1. Reuse existing implementation
2. Use standard library
3. Use native platform feature
4. Use installed dependency
5. Prefer one-line fix
6. Only then write minimal new code

## Project Stack
- **Framework**: Next.js 14 (App Router)
- **AI SDK**: Vercel AI SDK
- **Database**: Supabase (pgvector + PostgreSQL)
- **UI**: shadcn/ui + Tailwind CSS
- **Testing**: Vitest
