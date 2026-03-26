# Verification Record

## Scope

- Mirror parity
- OpenCode discovery
- OpenCode loading behavior

## Parity Checks

Command pattern used:

```text
git diff --no-index -- <source> <mirror>
```

Compared paths:

- `docs/skills-source/ui-ux-pro-max/SKILL.md`
  - `C:\Users\A\.claude\skills\ui-ux-pro-max\SKILL.md`
  - `C:\Users\A\.config\opencode\skills\ui-ux-pro-max\SKILL.md`
- `docs/skills-source/frontend-design/SKILL.md`
  - `C:\Users\A\.claude\skills\frontend-design\SKILL.md`
  - `C:\Users\A\.config\opencode\skills\frontend-design\SKILL.md`
- `docs/skills-source/design-pro/SKILL.md`
  - `C:\Users\A\.claude\skills\design-pro\SKILL.md`
  - `C:\Users\A\.config\opencode\skills\design-pro\SKILL.md`
- `docs/skills-source/design-pro/references/routing-guide.md`
  - `C:\Users\A\.claude\skills\design-pro\references\routing-guide.md`
  - `C:\Users\A\.config\opencode\skills\design-pro\references\routing-guide.md`

Result:

- No content differences were reported for any of the canonical-to-mirror pairs above.

## OpenCode Discovery

Command used:

```text
opencode run --print-logs "List skills available that match ui-ux-pro-max, frontend-design, or design-pro. Report only discovered skill names."
```

Observed user-facing result:

- `ui-ux-pro-max`
- `frontend-design`
- `design-pro`

Observed warning lines:

- `service=skill name=frontend-design existing=C:\Users\A\.claude\skills\frontend-design\SKILL.md duplicate=C:\Users\A\.config\opencode\skills\frontend-design\SKILL.md duplicate skill name`
- `service=skill name=ui-ux-pro-max existing=C:\Users\A\.claude\skills\ui-ux-pro-max\SKILL.md duplicate=C:\Users\A\.config\opencode\skills\ui-ux-pro-max\SKILL.md duplicate skill name`
- `service=skill name=design-pro existing=C:\Users\A\.claude\skills\design-pro\SKILL.md duplicate=C:\Users\A\.config\opencode\skills\design-pro\SKILL.md duplicate skill name`

## OpenCode Loading

Command used:

```text
opencode run --print-logs "Load the design-pro skill and report which child or related skills it requires or recommends using."
```

Observed evidence:

- `-> Skill "design-pro"`
- `` `design-pro` is the router skill. ``
- `` - It requires `ui-ux-pro-max` for system-driven work: enterprise UI, dashboards, design systems, accessibility-heavy work, consistency-first components. ``
- `` - It requires `frontend-design` for creative-driven work: branded interfaces, landing pages, expressive product surfaces, stronger visual personality. ``
- `` - For hybrid work, it requires both, in this order: ``
- ``   1. `ui-ux-pro-max` ``
- ``   2. `frontend-design` ``
- ``   3. then return to `design-pro` for the final integration checklist ``

## Warning Assessment

- Warning source: the same skill names exist in both `C:\Users\A\.claude\skills\` and `C:\Users\A\.config\opencode\skills\`.
- Impact: OpenCode emitted duplicate-skill warnings, but discovery and loading still succeeded.
- Outcome: verification passed with a non-blocking warning.
