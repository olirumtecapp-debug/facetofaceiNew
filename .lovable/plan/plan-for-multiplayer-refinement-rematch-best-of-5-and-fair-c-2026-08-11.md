# Plan for Multiplayer Refinement: Rematch, Best of 5, and Fair Character Distribution

I will implement the requested multiplayer improvements, focusing on synchronization, fair character distribution, and the Best of 5 flow.

## User Review Required

> [!IMPORTANT]
> The current implementation uses a "Guest ID" system. I will ensure all new logic (rematch, abandonment) respects this system to maintain compatibility with your existing working infrastructure.

## Proposed Changes

### 1. Fair Character Distribution (Server-side)
- Modify `startGame` and `handleRematchResponse` in `src/lib/online.functions.ts`.
- Implement a single shuffle of all 24 characters and assign the first to Player A and the second to Player B.
- This guarantees that Player A and Player B never get the same character in the same round.

### 2. Best of 5 Match Flow
- Refine `declareWinner` in `src/lib/online.functions.ts` to check if a player reached 3 wins.
- Set `match_winner_id` in the `rooms` table when the match is completed.
- Update `GameBoard.tsx` to hide the "Rematch" button when the match is officially over.

### 3. Rematch System
- Synchronize `rematch_status` ('requested', 'accepted', 'declined') via Supabase Realtime.
- Show "Rematch requested by opponent" with "Accept" or "Decline" buttons for the winner.
- If declined, show the requested ironic message: "Seu adversário decidiu parar por aqui. Parece que a revanche ficou para a próxima! 😏"

### 4. Match Abandonment Logic
- Create a new Server Function `abandonMatch` in `src/lib/online.functions.ts`.
- Implement a confirmation modal in `GameBoard.tsx` when clicking "Voltar ao Menu" during an active game.
- If a player confirms abandonment, the server will immediately declare the opponent as the match winner.

### 5. UI Improvements and Bug Fixes
- Change "Cardápio e Menu" text to "Voltar ao Menu".
- Ensure reconnection (refreshing the page) preserves all match states (score, round, characters) by reading the source of truth from the database.

## Technical Details

### Server Functions (`src/lib/online.functions.ts`)
- Update character assignment logic to prevent duplicates using an array shuffle.
- Add `abandonMatch` endpoint to handle authoritative forfeit.

### Game State Hook (`src/hooks/use-game-state.ts`)
- Add Realtime listeners for `match_winner_id` and `rematch_status`.
- Ensure round resets clear local ephemeral state but preserve overall scores.

### Components (`src/components/GameBoard.tsx`)
- Add confirmation modal for exit.
- Update endgame screens to handle Match vs Round victory.
- Fix button labels.

## Verification Plan

### Automated Tests
- Run Playwright scripts to simulate:
  - Round end -> Rematch request -> Accept -> New unique characters.
  - Round end -> Rematch request -> Decline -> Ironic message and end.
  - Mid-game abandonment -> Opponent wins immediately.
  - Best of 5 completion (3-0, 3-1, 3-2).

### Manual Verification
- Verify text changes in the UI.
- Check responsiveness on mobile viewports for the new modals.
