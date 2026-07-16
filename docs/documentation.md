# Documentation

Read when creating or editing Markdown.

## Purpose

- Docs are instructions for agents.
- Start from what the agent must do or decide.
- Prefer rules over explanation.
- Keep rationale only when it prevents a wrong choice.
- Update docs when code establishes a convention.
- Update docs when a correction repeats.
- Fix stale docs when you find them.

## Placement

- Put guidance in the narrow guide agents already read.
- Add a new guide only for a new durable topic.
- Add new guides to `AGENTS.md`.
- Cross-link only when another guide must be read.
- Keep examples near the rule they clarify.

## Style

- Be concise.
- One idea per sentence.
- One topic per paragraph.
- Prefer bullets.
- Use concrete file paths, APIs, and names.
- Say what to use.
- Say what to avoid.
- Delete vague advice.
- Delete duplicated advice.
- Delete historical notes unless they change current work.

## Conflicts

- If guides conflict, choose one pattern.
- Prefer current code when it is intentional.
- Prefer `AGENTS.md` and narrow guides over README prose.
- Prefer Effect patterns for Effect-owned code.
- Prefer Datastar/server TSX patterns for UI flows.
- Patch every doc that would send agents the wrong way.

## Checks

- New docs should be useful without surrounding chat.
- Node-branch docs should not require readers to consult another branch.
- Verify documented commands, environment variables, routes, and paths against the current code.
- Headings should name the decision area.
- Rules should survive copy-paste into a task prompt.
- Run `nub run check` before handoff.
