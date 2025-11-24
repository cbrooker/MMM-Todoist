# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MMM-Todoist is a MagicMirror² module that displays Todoist tasks. The module fetches tasks from the Todoist API and renders them with various configuration options including sorting, filtering, priority indicators, and due date displays.

**Note:** This module is not actively maintained by the original developer.

## Installation and Setup

```bash
npm install
```

No build step or tests are configured in this project.

## Architecture

This is a MagicMirror² module with a two-part architecture:

### Frontend Module (MMM-Todoist.js)
- Extends `Module` class from MagicMirror framework
- Handles DOM rendering, user configuration, and display logic
- Communicates with backend via socket notifications
- Key responsibilities:
  - Task filtering and sorting
  - UI rendering with CSS table layout
  - Smart update interval management (pauses when module hidden or PIR sensor detects no presence)
  - Date parsing and formatting for task due dates

### Backend Helper (node_helper.js)
- Extends `NodeHelper` class from MagicMirror framework
- Handles API communication with Todoist Sync API v9
- Converts markdown task content to HTML using showdown
- Returns task data to frontend via socket notifications

### Communication Flow
1. Frontend sends `FETCH_TODOIST` socket notification with config
2. Backend makes POST request to Todoist Sync API
3. Backend converts markdown content and sends `TASKS` notification back
4. Frontend filters, sorts, and renders tasks

## Key Components

### Task Filtering (MMM-Todoist.js:261-420)
The `filterTodoistData` function handles:
- Project-based filtering (whitelist or blacklist mode via `blacklistProjects`)
- Label-based filtering (tasks matching any configured label)
- Section-based filtering (tasks in specified sections within projects)
- Date range filtering (`displayTasksWithinDays`)
- Subtask visibility (`displaySubtasks`)
- Tasks without due dates (`displayTasksWithoutDue`)

**Section Filtering:** Sections are organizational units within Todoist projects (like headers that group tasks). When `sections` is configured, only tasks with a `section_id` matching the configured sections are displayed. This works in combination with project filtering.

### Sorting Methods (MMM-Todoist.js:366-469)
Five sort types available:
- `todoist`: Maintains Todoist order with parent-child task hierarchy
- `priority`: Descending priority (highest first)
- `dueDateAsc`: Oldest due date first
- `dueDateDesc`: Newest due date first
- `dueDateDescPriority`: By due date desc, then priority high to low

### Date Parsing (MMM-Todoist.js:405-414)
The `parseDueDate` function handles two Todoist date formats:
- `YYYY-MM-DD` (day only)
- `YYYY-MM-DDThh:mm:ssZ` (day and time, UTC if ends with Z)

Critical to handle timezone consistency - dates with "Z" suffix are UTC, others are local time.

### Smart Update Management (MMM-Todoist.js:143-183)
The module pauses API requests when:
- Module is hidden (carousel, Remote-Control, etc.)
- PIR sensor (MMM-PIR-Sensor) detects no user presence

Immediate update triggered when module becomes visible again.

## Configuration

Module configuration is passed through MagicMirror's `config/config.js`. Key config options:

**Required:**
- `accessToken`: Todoist API token
- `projects` and/or `labels`: At least one must be specified

**Common Options:**
- `maximumEntries`: Task limit (default: 10)
- `updateInterval`: Milliseconds between API calls (default: 10 minutes)
- `sortType`: Sort method (default: "todoist")
- `sections`: Array of section IDs to filter tasks (default: [])
- `showProject`: Display project names (default: true)
- `displaySubtasks`: Show/hide subtasks (default: true)
- `displayAvatar`: Show collaborator avatars (default: false)
- `inputTasks`: Array of button configurations for adding tasks via MMM-Keyboard (default: [])

## Todoist API

Uses Todoist Sync API v9:
- Endpoint: `https://todoist.com/API/v9/sync/`
- Authentication: Bearer token in Authorization header
- Resource types: items, projects, collaborators, user, labels, sections
- Returns comprehensive task data including project colors, collaborators, labels, and sections

## Styling

CSS uses custom div-based table layout (`.divTable`, `.divTableRow`, `.divTableCell`) instead of actual HTML tables for better MagicMirror compatibility.

Priority indicators use colored bars (priority1=red, priority2=orange, priority3=blue).

Project colors use Todoist's color palette mapped by color ID (30-49).

## Debugging

Set `debug: true` in config to:
- Log project names and IDs to browser console
- Log section names and IDs to browser console
- Display project IDs and section IDs on the mirror itself
- Log API response body
- Track update timestamps

This helps users identify project IDs and section IDs for configuration.

## Dependencies

- `request`: HTTP client for Todoist API calls
- `showdown`: Markdown to HTML converter for task content
- `moment`: Date formatting (from MagicMirror core)

## InputTask Buttons Feature

The module supports interactive task creation via on-screen buttons that integrate with MMM-Keyboard module.

### Button ID Format
Buttons use a multi-part ID format: `project-task-section` (section is optional)

### Button Behaviors
- **`task: "NEW"`**: Creates standalone tasks in the specified project/section
- **`task: "TaskName"`**: Creates subtasks under a parent task with that name
  - Parent task is auto-created if it doesn't exist (with due date "today")
  - Searches for existing parent by name and today's due date

### Section Support
InputTask buttons can optionally specify a `section` parameter:
- Standalone tasks (`task: "NEW"`): Created in the specified section
- Subtasks (parent task name): Both parent and subtasks created in the specified section

### Implementation Details (node_helper.js)
- `addItemToList`: Parses button ID and routes to appropriate function
- `addNewItemToList`: Creates standalone tasks (supports section_id)
- `addNewSubItemToList`: Creates subtasks under parent (supports section_id)
- Special handling for "inbox" project: omits project_id in API call

**Button ID Examples:**
- `"inbox-NEW"`: Creates standalone task in inbox
- `"166564794-NEW-123456789"`: Creates standalone task in project 166564794, section 123456789
- `"166564794-Groceries"`: Creates subtask under "Groceries" parent in project 166564794
- `"166564794-Groceries-123456789"`: Creates subtask under "Groceries" in section 123456789

## Known Behaviors

- Tasks without due dates are assigned fake date "2100-12-31" for sorting purposes
- Subtask indentation (when `sortType: "todoist"`) uses "- " prefix
- The `all_day` flag is inferred from date format (presence of time component)
- Update interval is managed per-module instance (multiple instances can have different intervals)
