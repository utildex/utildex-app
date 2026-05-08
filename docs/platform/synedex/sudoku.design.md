# Sudoku Design Target

This is the first concrete application of the Synedex design contract. It describes what Sudoku should become; the current implementation may not match every point yet.

## Role In Synedex

Sudoku is the first Synedex game and should set the standard for future puzzle games. It trains logic, pattern recognition, attention, and calm persistence.

The experience should feel like a quiet practice board, not a tool scaffold or developer demo.

## Player Promise

Practice Sudoku in a calm, local-first space with clear levels, resumable sessions, gentle feedback, and progress without pressure.

## Lifecycle

Sudoku follows:

```text
Discover -> Prepare -> Play -> Pause -> Complete -> Reflect -> Continue
```

## Prepare Screen

The Sudoku entry screen should include:

- title
- one-sentence promise
- resume saved game, when available
- start new session
- level or journey selection
- short training tags: Logic, Focus, Pattern recognition, Relaxed
- compact progress state

It should not show Developer, Diagnostics, runtime tests, benchmarks, raw migration tools, or implementation copy.

## Play Screen

The play screen should make the board dominant.

Expected structure:

```text
Header: back/pause, title or level, timer if enabled
Main: board + nearby keypad/input controls
Secondary: notes, undo, erase, hint, check, settings
Footer/status: progress, mistakes, calm feedback
```

The keypad should stay close to the board on every viewport. On mobile, the board should remain visible during normal play and frequent controls should not require long scrolling.

## Pause Screen

Pause should be simple:

- resume
- restart puzzle
- settings
- exit to game menu

Pause should not show detailed performance judgment.

## Completion And Reflection

Completion should move to a result state rather than only showing a transient message.

The result state should include:

- session complete message
- time
- moves
- mistakes
- level completed
- personal best or progress trend, when available
- one recommended next action

Recommended next actions:

- continue journey
- try again
- start next level
- return to games

Use practice-oriented language such as Session complete, Continue training, Try again, or New personal best.

## Journey Integrity

A Sudoku session must remember the level it was generated for. Completing, solving, or abandoning a puzzle should record outcomes against that generated level, not against a mutable level selector.

Journey progress should advance only when the player completes the generated level through normal play. Solver-assisted completion should be recorded separately and should not unlock journey progress unless intentionally designed otherwise.

## Settings Model

Sudoku settings should be grouped as:

- Difficulty: level, journey mode, new session
- Input: cell-first/number-first, notes, keyboard shortcuts, auto-advance
- Assistance: highlights, conflicts, candidates, hints
- Feedback: mistake checking, mistake limit, result detail
- Session: timer, pause behavior, progress display, undo/redo
- Accessibility: screen-reader notes, focus behavior, reduced motion, high-contrast options if needed
- Advanced: seed, export/import puzzle, reveal/solve if intentionally player-facing

Advanced player settings must be separate from developer diagnostics.

## Data And History

History should be a player progress surface, not a raw data panel.

Player history may show:

- sessions started/completed
- best time
- average successful time
- recent sessions
- level reached
- personal trends

Migration/import/export can exist, but should be secondary and framed as save management. It should not dominate the player-facing game menu.

## Developer Tools

Runtime tests, benchmarks, and grading diagnostics are useful during setup, but they should not appear in the normal player menu.

Allowed future placement:

- development-only debug route
- local QA page
- explicit dev build guard

## Accessibility Target

Sudoku should support:

- keyboard board navigation
- visible focus state
- screen-reader labels that distinguish givens, player entries, empty cells, selected cell, and notes
- candidate notes available to assistive tech
- color-independent conflict state
- focus management for settings and pause dialogs
- touch targets comfortable on mobile
- reduced-motion compliance

Known current risks to address before release:

- notes are visual-first
- settings dialog needs stronger focus handling
- conflict and selection states rely heavily on visual styling

## Performance Target

Board rendering should compute repeated state once per board change where practical. Conflict maps, same-number highlights, and remaining digit counts should be derived state rather than repeated template work.

Solver, grader, generator, diagnostics, and benchmarks should not freeze the player UI. Heavy work should move behind a worker, a cancellable task, or a development-only surface.

## Open Design Questions

- Should solver-assisted completion unlock journey progress?
- Should mistake limits be a hard limit or only a warning?
- Should seed entry be a player feature or a developer feature?
- Should save migration live inside each game or in a platform-level data area?
- How detailed should result metrics be for a calm practice experience?
