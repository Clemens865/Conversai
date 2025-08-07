# ConversAI Mode Architecture

## Overview
This directory contains the modular architecture for different conversation modes. Each mode is completely self-contained and isolated from others.

## Mode Structure

Each mode follows this structure:
```
modes/
├── registry.ts              # Central mode registry
├── types.ts                 # Shared type definitions
├── base/                    # Base classes for modes
│   └── BaseMode.ts
├── memory-hierarchical/     # Mode 1: Original approach
│   ├── index.ts
│   ├── config.ts
│   ├── voice.ts
│   ├── ai.ts
│   └── storage.ts
├── claude-local-first/      # Mode 2: Privacy-focused
│   ├── index.ts
│   ├── config.ts
│   ├── voice.ts
│   ├── ai.ts
│   └── storage.ts
└── [future-mode]/          # Future modes...
```

## Adding New Modes

1. Create a new directory under `modes/`
2. Implement the `IConversationMode` interface
3. Register in `registry.ts`
4. Mode automatically appears in UI

## Mode Isolation

- Each mode has its own:
  - Voice processing pipeline
  - AI integration
  - Storage mechanism
  - Configuration
  - API endpoints
- No cross-mode dependencies
- Shared interfaces ensure compatibility