# Agent Worker Overview

This document explains how the agent pipeline is structured after introducing the `AgentWorker` abstraction. Use it as a reference when adding new tools, middlewares, or planner behaviors.

## Responsibilities

- Build the planner context (memory snapshot, card context, dataset sample, etc.) and call `generateChatResponse` with the correct scaffolding.
- Validate every AI multi-action response via schema + payload guards before executing anything. Invalid payloads trigger structured telemetry and a retry instruction.
- Dispatch actions sequentially, wrapping each executor with the core middleware stack (`chainOfThoughtGuard`, `thoughtLogging`, `telemetry`).
- Record traces, observations, and plan-state updates back into the global store so the UI can surface progress.
- Manage busy state + cancellation signals, ensuring we halt cleanly when clarification requests or user cancels occur.

## Key Entry Points

| Surface | Description |
| --- | --- |
| `AgentWorker.handleMessage` | Entry used by `createChatSlice`. It appends the user message, spins up a busy run, loads planner context, and starts the workflow loop. |
| `runPlannerWorkflow` | Core loop: requests an AI response, validates it, dispatches actions, auto-retries when code execution fails, and stops on halt or clarification. |
| `agentSdk` | Exposes executors/middlewares so tests (or power users) can hook into the registry. |

## Adding A New Action Type

1. Extend the `AiAction` union + schema in `services/ai/schemas.ts`.
2. Create a new executor in `AgentWorker` and register it inside `actionExecutorRegistry`.
3. (Optional) Add middleware if the action requires pre/post hooks.
4. Update tests under `tests/chatActionExecutors.test.ts` and `tests/chatPlannerIntegration.test.ts` to cover validation + execution paths.

## Lifecycle Notes

- Plan-state enforcement: The first action must be `plan_state_update`; the validator rejects responses that skip this requirement.
- Observations: Each executor returns an `ActionObservationPayload`; we convert it into an `AgentObservation` and store it so future prompts can cite previous steps.
- Clarifications: Clarification requests halt the planner and rely on the slice’s `handleClarificationResponse` to resume (after the user provides input).

Keeping these rules in sync between prompts, schemas, and the worker is crucial—tweak all three layers together when evolving the agent.
