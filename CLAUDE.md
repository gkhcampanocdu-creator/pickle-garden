@AGENTS.md

## 4. Web Animation Design Skill

> Source: segersniels/dotfiles — `.codex/skills/web-animation-design`

### Core Decision Framework

1. **Motion type → easing**
   - Entering/exiting UI → `ease-out`
   - On-screen movement → `ease-in-out`
   - Hover effects → `ease`
   - Constant-speed motion → `linear`
   - Never use `ease-in` for UI feedback — it starts slow and feels sluggish.

2. **Frequency check**
   - 100+ interactions/day → avoid or minimize animation
   - Occasional interactions → standard motion is fine

3. **Implementation choice**
   - Simple, predetermined motion → CSS transitions
   - Interruptible or gesture-driven → JavaScript / spring physics

### Key Constraints

- **UI motion must stay under 300ms.** Default range: 100–250ms.
- Always favor `transform` and `opacity` — they are GPU-composited and cheap.
- Always include `prefers-reduced-motion` support.
- Avoid overly bouncy springs in product UI — looks toy-like, not professional.
- Never animate keyboard interactions (arrow keys, shortcuts, tab/focus) — they repeat hundreds of times daily.

### Practical Rules

**Buttons & click feedback**
- Scale buttons on press: `button:active { transform: scale(0.97); }`
- Never animate from `scale(0)` — start from `scale(0.95)` + `opacity: 0` so the element has visible shape.

**Tooltips & popovers**
- First tooltip: delay + animation. Subsequent tooltips (while one is open): instant (`transition-duration: 0ms`).
- Scale from the trigger, not from center: use `transform-origin: var(--transform-origin)` (Radix: `--radix-dropdown-menu-content-transform-origin`).

**Hover states**
- Fix hover flicker by animating a child element, not the element with the hover area.
- Disable hover on touch devices:
  ```css
  @media (hover: hover) and (pointer: fine) { … }
  ```
  (Tailwind v4 `hover:` does this automatically.)

**Touch & accessibility**
- Minimum touch target: 44px. Use a pseudo-element to expand hit areas without changing layout.

**Easing curves**
- Built-in CSS curves are usually too weak. Prefer custom cubic-bezier curves. Reference: [easings.co](https://easings.co/).

**Visual tricks**
- When timing/easing adjustments aren't enough, add subtle `blur` to bridge visual gaps between states (keep under 20px, especially on Safari):
  ```css
  .button:active { transform: scale(0.97); filter: blur(2px); }
  ```

**Debugging**
- Record animations and play back frame-by-frame to catch issues invisible at normal speed.
- Fix shaky CSS transform animations with `will-change: transform` to keep the element on the GPU.
- Review animations with fresh eyes — step away, return later.

### Output Standards

When reviewing or writing animations, present "Before" and "After" comparisons in a markdown table — never as bulleted lists or separate lines.
