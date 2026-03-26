---
name: design-pro
description: Use when frontend design work needs routing between system-driven, creative-driven, or hybrid design approaches across product UI, design systems, landing pages, UX reviews, and component redesigns.
---

# Design Pro

## Overview
Design Pro is the router for frontend design work. It decides whether the task should use `ui-ux-pro-max`, `frontend-design`, or both in sequence.

## Routing Modes

### System-Driven
Use for enterprise UI, dashboards, design systems, accessibility-heavy work, and consistency-first component design.

**REQUIRED SUB-SKILL:** Use `ui-ux-pro-max` for system-driven design work.

### Creative-Driven
Use for branded interfaces, landing pages, expressive product surfaces, and requests for stronger visual personality.

**REQUIRED SUB-SKILL:** Use `frontend-design` for creative-driven visual work.

### Hybrid
Use when the task needs both strong structure and distinct visual identity.

Execution order:
1. **REQUIRED SUB-SKILL:** Use `ui-ux-pro-max`
2. **REQUIRED SUB-SKILL:** Use `frontend-design`
3. Return to `design-pro` and run the final integration checklist

## Final Integration Checklist
- Information hierarchy stays clear
- Tokens and visual language remain coherent
- Motion supports the concept instead of distracting
- Mobile and desktop both feel intentional
- Accessibility is preserved after visual enhancement
