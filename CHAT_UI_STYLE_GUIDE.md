# AlphaCode Chat UI Style Guide

## Design Principles

### 1. Modern & Clean
- Rounded corners for a softer, modern appearance
- Consistent spacing and alignment
- Clear visual hierarchy

### 2. Interactive & Responsive
- Smooth transitions and animations
- Clear hover and active states
- Visual feedback for all interactions

### 3. Accessible
- Adequate touch targets (minimum 28x28px)
- Clear focus indicators
- High contrast for readability

## Component Specifications

### Send Button
```css
Dimensions: min 28x28px
Padding: 6px 10px
Border Radius: 6px
Icon Size: 16px
Transition: 0.15s ease

States:
- Default: Button background color
- Hover: Lift effect (-1px) + shadow
- Active: Pressed effect (0px) + reduced shadow
- Disabled: 50% opacity, no interactions
```

### Input Container
```css
Border Radius: 8px
Padding: 8px
Border: 1px solid input border
Transition: 0.2s ease

States:
- Default: Subtle border
- Focused: Focus border + blue glow shadow
- Hover: Smooth transition
```

### Toolbar Buttons
```css
Padding: 4px 8px
Border Radius: 4px
Gap: 6px between items
Transition: 0.15s ease

States:
- Default: Transparent background
- Hover: Toolbar hover background
```

## Color Tokens Used

### Primary Colors
- `--vscode-button-background`: Send button background
- `--vscode-button-foreground`: Send button text/icon
- `--vscode-button-hoverBackground`: Send button hover state
- `--vscode-button-secondaryBackground`: Disabled button

### Input Colors
- `--vscode-input-background`: Input container background
- `--vscode-input-border`: Input container border
- `--vscode-focusBorder`: Focus state border

### Interactive Colors
- `--vscode-toolbar-hoverBackground`: Toolbar button hover

## Animation Specifications

### Hover Lift Effect
```css
transform: translateY(-1px)
box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15)
transition: all 0.15s ease
```

### Active Press Effect
```css
transform: translateY(0)
box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1)
```

### Focus Glow
```css
box-shadow: 0 0 0 2px rgba(0, 122, 204, 0.1)
transition: box-shadow 0.2s ease
```

## Spacing System

### Gaps
- Toolbar items: 6px
- Input padding: 8px
- Button padding: 6px 10px

### Border Radius
- Large containers: 8px
- Buttons: 6px
- Small elements: 4px
- Compact mode: 6px (increased from 2px)

## Typography

### Icon Sizes
- Send button icon: 16px
- Toolbar icons: 14px (default)
- Small icons: 12px

### Font Weights
- Send button: 500 (medium)
- Regular text: 400 (normal)

## Interaction States

### Button States Priority
1. **Disabled** (highest priority)
   - 50% opacity
   - No hover effects
   - Cursor: not-allowed

2. **Active** (click/press)
   - No lift effect
   - Reduced shadow
   - Immediate visual feedback

3. **Hover**
   - Lift effect
   - Enhanced shadow
   - Background color change

4. **Default**
   - Base styling
   - Ready for interaction

## Responsive Behavior

### Compact Mode
- Maintains modern styling
- Reduced padding where appropriate
- Consistent border-radius (6px)
- Proper toolbar alignment (4px padding)

### Regular Mode
- Full padding and spacing
- Maximum visual comfort
- Clear separation of elements

## Accessibility Features

### Keyboard Navigation
- Clear focus indicators
- Tab-friendly layout
- Visible focus states

### Touch Targets
- Minimum 28x28px for buttons
- Adequate spacing between interactive elements
- Clear hit areas

### Visual Feedback
- Hover states for all interactive elements
- Focus indicators for keyboard users
- Disabled states clearly indicated

## Best Practices

### DO ✅
- Use consistent border-radius values
- Apply smooth transitions (0.15-0.2s)
- Maintain adequate spacing (6-8px)
- Provide clear hover states
- Use semantic color tokens

### DON'T ❌
- Mix different transition durations randomly
- Use hard cuts without transitions
- Ignore disabled states
- Forget focus indicators
- Use fixed colors instead of theme tokens

## Theme Compatibility

All styles use VS Code theme tokens to ensure compatibility with:
- Light themes
- Dark themes
- High contrast themes
- Custom themes

## Performance Considerations

- Transitions limited to transform and opacity where possible
- Box-shadow used sparingly
- Hardware-accelerated properties (transform) preferred
- Minimal repaints and reflows
