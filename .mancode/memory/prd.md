# Project Memory

## Project Overview
- **Name**: OpenCamp AI Agent (Dream Agent)
- **Type**: Web Application (Next.js)
- **Purpose**: OS Training Camp AI Assistant with multi-agent architecture
- **Repository**: https://github.com/SongShiQ/Dream-Agent

## Key Decisions
- 2026-07-11: Chose multi-agent architecture (Router + Assessor + Tutor + Examiner + Planner)
- 2026-07-11: Selected mancode as development workflow tool
- 2026-07-11: Tech stack: Next.js 14 + Vercel AI SDK + Supabase + shadcn/ui
- 2026-07-11: All 15 tasks completed, project ready for deployment

## Architecture
- **Agents**: Router, Assessor, Tutor, Examiner, Planner
- **Database**: Supabase (pgvector + PostgreSQL)
- **LLM**: User-configurable (OpenAI/Anthropic/local)

## Current Status
- Phase: All phases complete
- Tasks: 15/15 completed
- Tests: 12 tests passing
- Build: Successful
- GitHub: Pushed to main branch

## Next Steps
1. Configure environment variables (.env.local)
2. Initialize database (npx prisma migrate dev)
3. Deploy to Vercel
4. Test with real LLM API keys
