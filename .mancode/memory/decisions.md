# Decisions Log

## 2026-07-11

### D001: Multi-Agent Architecture
- **Decision**: Use 5 specialized agents (Router, Assessor, Tutor, Examiner, Planner)
- **Rationale**: Avoid context pollution, enable specialization, support dynamic routing
- **Status**: Approved

### D002: LLM Configuration
- **Decision**: User-configurable LLM (OpenAI/Anthropic/local)
- **Rationale**: Flexibility, cost control, privacy options
- **Status**: Approved

### D003: Development Tool
- **Decision**: Use mancode for workflow management
- **Rationale**: YAGNI enforcement, multi-mode workflow, project health scanning
- **Status**: Approved

### D004: Database
- **Decision**: Supabase (pgvector + PostgreSQL)
- **Rationale**: Free tier sufficient, integrated vector search, PostgreSQL ecosystem
- **Status**: Approved

### D005: UI Framework
- **Decision**: shadcn/ui + Tailwind CSS
- **Rationale**: Rapid development, consistent design, good component library
- **Status**: Approved
