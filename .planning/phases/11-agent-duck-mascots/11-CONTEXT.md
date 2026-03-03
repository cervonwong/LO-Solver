# Phase 11: Agent Duck Mascots - Context

**Gathered:** 2026-03-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Agent cards in the trace panel get expressive, oversized duck mascot icons that visually distinguish agent types by role. The duck mascots use existing lex-*.png images with color tinting per role group. This phase covers the mascot rendering on agent cards only — it does not change the main Lex mascot in the left panel or add new mascot image assets.

</domain>

<decisions>
## Implementation Decisions

### Duck Visual Style
- Reuse existing `lex-thinking.png` (while agent runs) and `lex-happy.png` (when agent completes) as base images
- Size: ~56px, dramatic overflow — extends well above the agent card header, overlapping previous content
- Position: absolute-positioned in the top-left corner of the agent card, overflowing the top and left edges
- The duck image swaps from thinking to happy on agent completion

### Agent-to-Duck Mapping
- 5 role groups derived from agent name keywords (not hardcoded per-agent lookup):
  1. **Extractors** — names containing "extractor"
  2. **Hypothesizers** — names containing "hypothesizer", "synthesizer", "dispatcher"
  3. **Testers** — names containing "tester", "orchestrator"
  4. **Improvers** — names containing "improver"
  5. **Answerers** — names containing "answerer"
- Default neutral tint for agents that don't match any known keyword

### Color Tinting
- Mix-blend-mode overlay technique for precise color control from CSS variables
- Color palette reuses existing design system colors:
  - Extractors: `#66cccc` (trace-tool cyan)
  - Hypothesizers: `#cc99ff` (trace-agent purple)
  - Testers: `#ffd700` (status-warning gold)
  - Improvers: `#ff6666` (warm red)
  - Answerers: `#66ccaa` (trace-vocab green)
- Agent card left border (`border-l-2`) matches the duck's role color (replaces current uniform trace-agent purple)

### Animation & States
- **Entrance:** Pop/scale-in animation when agent card first renders (scale from 0 to full size)
- **Active state:** Gentle bounce/bob animation while agent is running
- **Completion:** Quick scale-pop (brief scale-up then back to normal) when image swaps from thinking to happy
- **Collapsed cards:** Duck shrinks to ~24px when card is collapsed, full ~56px when expanded
- Transition between collapsed/expanded size should be smooth

### Claude's Discretion
- Exact animation timing/easing curves
- Precise overflow offset amounts (how far beyond the card boundary)
- Whether to add subtle drop shadow or glow on the tinted duck
- Exact mix-blend-mode variant (color, multiply, etc.) — whichever produces the best visual result
- How to handle the existing 16px spinning duck indicator (replace, remove, or keep alongside)

</decisions>

<specifics>
## Specific Ideas

- The thinking/happy image swap gives each agent card a sense of progress — thinking while working, happy when done
- The dramatic 56px size should make the ducks feel like "characters" overseeing their work, not just icons
- Scale-pop on completion should feel satisfying — like a stamp of approval

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `lex-thinking.png`, `lex-happy.png`: Base images for the duck mascots (already in `/public/`)
- `lex-mascot.tsx`: Existing mascot component with image preloading pattern and state-dependent image swapping
- `animate-spin-duck`: Existing spinning animation for the 16px duck in agent cards
- `animate-fade-in`, `animate-checkmark-scale`: Existing animation patterns to reference
- CSS variables for all 5 role colors already defined in `globals.css`

### Established Patterns
- Agent cards are `Collapsible` components in `trace-event-card.tsx` (AgentCard function, line 640)
- Card header uses `border-l-2 border-l-trace-agent` for the left accent border
- Currently shows a 16px `lex-mascot.png` icon and a 12px spinning duck when active
- `AgentGroup` type provides `isActive` boolean and `agentStart.data.agentName` for role detection
- Agent names follow `[Step N] Descriptor Agent` format — keyword extraction targets the descriptor

### Integration Points
- `AgentCard` component in `trace-event-card.tsx` is the primary modification target
- `AgentGroup.isActive` determines running vs complete state
- `agentStart.data.agentName` provides the agent name for role keyword matching
- Depth-based indentation (`getIndentClass`) may need adjustment for the 56px overflow
- `next/image` `Image` component is already used in agent cards

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 11-agent-duck-mascots*
*Context gathered: 2026-03-03*
