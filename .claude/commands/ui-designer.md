---
name: ui-designer
description: Launch UI Designer agent for visual polish and UX improvements using Playwright
allowed-tools: Task, Read, Write, Edit, Bash, Glob, Grep
argument-hint: [page-url] [focus-area]
---

# UI Designer Agent Launcher

<background_information>
- **Mission**: Launch specialized UI Designer agent to refine and polish user interface using live browser testing
- **Agent Type**: ui-designer (defined in .claude/agents/ui-designer.md)
- **Capabilities**: Visual inspection, responsive design testing, component refinement, accessibility improvements
- **Technology Stack**: Playwright MCP, Tailwind CSS 4, shadcn/ui
</background_information>

<instructions>
## Core Task

Launch the UI Designer agent to improve the visual design and user experience of the application.

## Parameters

- **$1** (optional): Target page URL or path (e.g., "/login", "http://localhost:3000/dashboard")
  - If omitted, agent will start with the homepage or ask for target
- **$2** (optional): Focus area for improvements (e.g., "spacing", "colors", "responsive", "accessibility")
  - If omitted, agent will perform general UI assessment

## Agent Workflow

The UI Designer agent will:

1. **Setup & Navigate**
   - Ensure development server is running
   - Navigate to target page using Playwright
   - Take initial snapshot/screenshot

2. **Analyze Current State**
   - Review element hierarchy and accessibility tree
   - Identify visual inconsistencies
   - Check responsive behavior if needed
   - Test interactive elements

3. **Implement Improvements**
   - Make targeted changes to components and styles
   - Focus on Tailwind CSS utilities and shadcn/ui patterns
   - Ensure design system consistency

4. **Verify & Iterate**
   - Reload to see changes
   - Compare before/after states
   - Test functionality preservation
   - Gather feedback and repeat if needed

5. **Document Changes**
   - Summarize improvements made
   - Note any issues or recommendations

## Usage Examples

**Basic usage** (general UI review):
```
/ui-designer
```

**Specific page**:
```
/ui-designer /login
```

**Focused improvement**:
```
/ui-designer /dashboard spacing
```

**Full URL with focus**:
```
/ui-designer http://localhost:3000/profile responsive
```

## Prerequisites

- Development server must be running (typically `npm run dev`)
- Playwright MCP server should be available
- Target page should be accessible

## Common Focus Areas

- **spacing**: Padding, margins, gaps between elements
- **colors**: Color consistency, contrast, theme application
- **typography**: Font sizes, weights, line heights, readability
- **responsive**: Layout behavior across different screen sizes
- **accessibility**: Semantic HTML, ARIA labels, keyboard navigation
- **interactive**: Button states, hover effects, transitions
- **consistency**: Component styling uniformity across pages

## Output

The agent will provide:
- Current state analysis
- List of identified issues
- Changes implemented
- Before/after comparisons (via snapshots/screenshots)
- Recommendations for further improvements

</instructions>

## Task Tool Configuration

Launch the UI Designer agent with the following configuration:

```
subagent_type: general-purpose
prompt: You are the UI Designer agent. Load the instructions from .claude/agents/ui-designer.md and follow the workflow defined there.

Target: $1
Focus: $2

Your goal is to analyze and improve the UI/UX of the specified page using Playwright MCP server for live browser interaction. Follow the agent's workflow precisely and document all changes made.
```

## Safety Notes

- Agent will only modify UI-related code (components, styles)
- Business logic and functionality should remain unchanged
- All changes should be verified through live testing
- Agent should ask for confirmation before major structural changes

think
