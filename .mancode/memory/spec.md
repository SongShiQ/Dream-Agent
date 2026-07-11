# Project Specifications

## Code Style
- TypeScript with strict mode
- ESLint + Prettier
- Conventional Commits

## Component Patterns
- Use shadcn/ui components
- Tailwind CSS for styling
- Avoid inline styles

## API Design
- RESTful endpoints under `/api/`
- Streaming responses for AI chat
- Zod for schema validation

## Testing
- Vitest for unit tests
- Test files in `tests/` directory
- Co-locate tests with source files

## File Structure
```
app/          - Next.js App Router
lib/          - Core libraries (agents, tools, llm)
prisma/       - Database schema
data/         - Static data files
tests/        - Test files
```

## Naming Conventions
- Files: kebab-case (`search-knowledge.ts`)
- Components: PascalCase (`ChatPanel.tsx`)
- Functions: camelCase (`generateQuestion`)
- Constants: UPPER_SNAKE_CASE (`DEFAULT_CONFIGS`)

## Active Plans

- 20260711-152730-task-1-next-js | in_progress | plan v1 | .mancode/workflows/20260711-152730-task-1-next-js/plan.md | 2026-07-11T07:28:48.188Z