# LangGraph Runtime Overview

This project now relies on a single LangGraph worker to orchestrate every agent turn. The legacy `AgentWorker` class and dual pipelines have been removed, so the browser worker is the source of truth for Observe → Plan → Act → Verify.

## Responsibilities

- **LLM Turn Dispatch** – `planNode` calls `generateChatResponse` with the serialized store context (columns, chat history, cards, timeline) and returns the streamed actions.
- **Guard Rails** – `enforceTurnGuards` still runs inside the worker. It verifies each response begins with `plan_state_update` followed by at most one atomic action.
- **Await Handling** – When the LLM emits `await_user`, the worker records the prompt snapshot. The UI answers via `graph/userReply`, and we immediately post another `graph/runPipeline` event with the new LLM payload, keeping the loop unified.
- **Busy Coordination** – The store tracks `graphActiveRunId` so the busy banner reflects LangGraph progress rather than ad‑hoc AgentWorker runs.

## Sequence

1. UI gathers the latest store snapshot (columns, cards, plan state, etc.) and posts `{ kind: 'llm_turn', ... }` to `graph/runPipeline`.
2. `planNode` calls the LLM, validates the response, and emits actions.
3. The worker updates its `GraphState` (phase, loop budget, await prompts) via the guard result and streams the actions back to the UI.
4. The main thread executes tool calls (`execute_js_code`, `dom_action`, `plan_creation`, etc.) and posts any tool results (`graph/tool_result`) so `verifyNode` can surface telemetry.
5. Await prompts are answered with `graph/userReply` followed by another `graph/runPipeline` carrying the new user message.

## Migration Notes

- JSON schemas are no longer passed to the LLM. We rely on textual conventions from `services/ai/phaseConventions.ts`.
- `ChatSlice.handleChatMessage` is the only entry point; it always routes through LangGraph, so there is no second planner path.
- Clarification helpers now just format the user selection and feed it back into the same LLM loop, keeping the state machine consistent.
