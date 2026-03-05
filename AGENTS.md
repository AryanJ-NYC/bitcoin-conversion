# AGENTS.md

## Operating Model
- Humans steer. Agents execute.
- Optimize for leverage: specify intent clearly, then verify outcomes with tooling.
- Make decisions and context discoverable in-repo so agents can reason without hidden knowledge.

## Repository Principles
- Keep this file short. It is a map, not an encyclopedia.
- Treat `docs/` and code as the source of truth.
- Prefer progressive disclosure: start with high-level docs, then drill into specific files.
- Optimize for legibility over cleverness: explicit names, clear module boundaries, simple flows.

## Workflow Expectations
- For non-trivial changes, write a small executable plan before implementation.
- Build feedback loops into the work:
  - add/update tests
  - run validation commands
  - document behavior changes
- Evidence before claims: do not mark work complete without fresh verification output.

## Quality Bar
- Preserve API stability unless a change is intentional and documented.
- Add guardrails for known failure modes (timeouts, invalid input, retries, rate limits).
- Favor deterministic behavior and actionable error messages.
- Keep docs synchronized with real runtime behavior.

## Publishing Docs
- Release process: [docs/PUBLISHING.md](docs/PUBLISHING.md)
