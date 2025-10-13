# AlphaCode Setup Wizard

## Overview

The AlphaCode Setup Wizard provides a modern, intuitive first-time user experience for new installations of AlphaCodeIDE. It guides users through essential configuration steps to customize their development environment.

## Features

### Welcome Screen
- Clean, minimal design with AlphaCode branding
- Welcoming message to new users
- "Get Started" button to begin setup

### Keybindings Configuration
- **VS Code keybindings** (default)
- **Vim keybindings** (installs Vim extension automatically)
- Optional `surf` terminal command installation

### Theme Selection
- Light theme
- Dark theme (default)
- Monokai theme
- Option to browse additional themes
- Live preview of selected theme

## Architecture

### Files

- **`setupWizard.ts`** - Main wizard component with UI rendering and state management
- **`setupWizardService.ts`** - Service for managing setup state and preferences
- **`setupWizard.contribution.ts`** - Registers the wizard as a workbench contribution
- **`media/setupWizard.css`** - Styles for the setup wizard UI

### Storage

The wizard uses `IStorageService` to persist:
- Setup completion status (`alphacode.setup.wizard.completed`)
- Keybindings preference (`alphacode.setup.keybindings`)
- Surf command installation preference (`alphacode.setup.installSurfCommand`)

### Integration Points

1. **Workbench Contribution** - Registered at `LifecyclePhase.Restored` to show on first launch
2. **Configuration Service** - Saves user preferences to workspace/user settings
3. **Theme Service** - Applies selected theme
4. **Command Service** - Installs extensions (Vim) when needed

## User Flow

```
Welcome Screen
     ↓
Keybindings Selection
     ↓
Theme Selection
     ↓
Setup Complete → Main Application
```

## Development

### Testing the Wizard

To test the setup wizard during development:

1. Run the command: **"AlphaCode: Reset Setup Wizard"** (F1)
2. Reload the window
3. The wizard will appear again

Alternatively, clear the storage manually:
```typescript
storageService.remove('alphacode.setup.wizard.completed', StorageScope.PROFILE);
```

### Customizing Steps

To add a new step to the wizard:

1. Add a new `ISetupStep` object to the `steps` array in `initializeSteps()`
2. Implement the `render()` function for your step's UI
3. Optionally implement `onNext()` to save settings when proceeding

Example:
```typescript
{
    id: 'my-step',
    title: localize('setupWizard.myStep.title', 'My Step'),
    subtitle: localize('setupWizard.myStep.subtitle', 'Configure something'),
    render: (container) => this.renderMyStep(container),
    onNext: () => this.applyMyStepSettings()
}
```

### Styling

The wizard uses VS Code's CSS variables for theming:
- `--vscode-editor-background`
- `--vscode-foreground`
- `--vscode-descriptionForeground`
- `--vscode-focusBorder`
- `--vscode-panel-border`

This ensures the wizard adapts to all VS Code themes automatically.

## API

### ISetupWizardService

```typescript
interface ISetupWizardService {
    isSetupCompleted(): boolean;
    markSetupCompleted(): void;
    resetSetup(): void;
    getKeybindingsPreference(): 'vscode' | 'vim' | undefined;
    shouldInstallSurfCommand(): boolean;
}
```

## Telemetry

The wizard logs the following telemetry events:
- `setupWizard.stepCompleted` - When each step is completed
- `setupWizard.completed` - When the entire setup is finished

Data collected:
- Selected keybindings
- Selected theme
- Whether surf command installation was chosen
- Step index and ID

## Accessibility

The setup wizard follows accessibility best practices:
- Keyboard navigation support
- High contrast theme support
- Semantic HTML structure
- ARIA labels where appropriate

## Future Enhancements

Potential improvements for future versions:
- AI provider setup integration
- Extension recommendations based on usage patterns
- Import settings from other editors
- Workspace templates
- Multi-language support for localization
