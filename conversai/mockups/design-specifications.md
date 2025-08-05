# ConversAI Visual Design Specifications
## Minimal Pure Enhanced Theme

### Layout Structure

#### Grid System
- **Main Layout**: CSS Grid with 3 columns
  - Left Sidebar: `80px` fixed width
  - Center Area: `1fr` (flexible)
  - Right Chat Area: `400px` fixed width
  - Gap: `0px`
  - Height: `100vh`

#### Viewport
- Full height: `100vh`
- Overflow: `hidden` on body
- Position: `relative` with z-index layering

---

### Color Palette

#### Background Colors
- **Primary Background**: `#000000` (pure black)
- **Gradient Background**: `radial-gradient(circle at center, #0a0a0a 0%, #000 70%)`
- **Surface Level 1**: `rgba(255, 255, 255, 0.02)` (subtle white overlay)
- **Surface Level 2**: `rgba(255, 255, 255, 0.03)`
- **Surface Level 3**: `rgba(255, 255, 255, 0.05)`

#### Accent Colors
- **Primary Red**: `#ff0000`
- **Secondary Red**: `#ff3333`
- **Red Alpha 5%**: `rgba(255, 0, 0, 0.05)`
- **Red Alpha 8%**: `rgba(255, 0, 0, 0.08)`
- **Red Alpha 10%**: `rgba(255, 0, 0, 0.1)`
- **Red Alpha 15%**: `rgba(255, 0, 0, 0.15)`
- **Red Alpha 20%**: `rgba(255, 0, 0, 0.2)`
- **Red Alpha 30%**: `rgba(255, 0, 0, 0.3)`

#### Border Colors
- **Subtle Border**: `rgba(255, 255, 255, 0.05)`
- **Medium Border**: `rgba(255, 255, 255, 0.08)`
- **Active Border**: `rgba(255, 255, 255, 0.15)`
- **Red Border Light**: `rgba(255, 0, 0, 0.1)`
- **Red Border Medium**: `rgba(255, 0, 0, 0.2)`
- **Red Border Strong**: `rgba(255, 0, 0, 0.3)`

#### Text Colors
- **Primary Text**: `#ffffff`
- **Secondary Text**: `rgba(255, 255, 255, 0.9)`
- **Tertiary Text**: `rgba(255, 255, 255, 0.8)`
- **Muted Text**: `rgba(255, 255, 255, 0.6)`
- **Disabled Text**: `rgba(255, 255, 255, 0.5)`
- **Placeholder Text**: `rgba(255, 255, 255, 0.3)`

---

### Typography

#### Font Stack
```css
font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif;
```

#### Font Sizes
- **Large Heading**: `16px`
- **Body Text**: `14px`
- **Small Text**: `12px`
- **Micro Text**: `11px`

#### Font Weights
- **Light**: `300`
- **Medium**: `500`

#### Text Properties
- **Letter Spacing (Status)**: `2px`
- **Letter Spacing (Title)**: `0.5px`
- **Line Height**: `1.6`
- **Text Transform (Status)**: `uppercase`

---

### Spacing System

#### Padding Values
- **Micro**: `4px`
- **Small**: `8px`
- **Medium**: `12px`
- **Large**: `16px`
- **X-Large**: `20px`
- **XX-Large**: `24px`
- **XXX-Large**: `60px`

#### Margin Values
- **Small**: `6px`
- **Medium**: `12px`
- **Large**: `20px`
- **X-Large**: `40px`

#### Gap Values
- **Small**: `4px`
- **Medium**: `12px`
- **Large**: `16px`
- **X-Large**: `20px`
- **XX-Large**: `40px`

---

### Border Radius System

#### Standard Radius Values
- **Micro**: `3px` (scrollbar thumb)
- **Small**: `4px` (voice segments)
- **Medium**: `8px` (tooltips)
- **Large**: `10px` (send button)
- **X-Large**: `12px` (buttons, inputs)
- **XX-Large**: `16px` (messages)
- **Circle**: `50%` (voice control button, particles)

---

### Component Specifications

#### Left Sidebar
- **Width**: `80px`
- **Background**: `rgba(255, 255, 255, 0.02)`
- **Border**: `1px solid rgba(255, 255, 255, 0.05)` (right side)
- **Padding**: `24px 0`
- **Gap**: `20px`

#### Sidebar Buttons
- **Size**: `48px × 48px`
- **Background**: `rgba(255, 255, 255, 0.03)`
- **Background (Hover)**: `rgba(255, 255, 255, 0.06)`
- **Background (Active)**: `rgba(255, 0, 0, 0.1)`
- **Border**: `1px solid rgba(255, 255, 255, 0.08)`
- **Border (Hover)**: `rgba(255, 255, 255, 0.15)`
- **Border (Active)**: `rgba(255, 0, 0, 0.3)`
- **Border Radius**: `12px`
- **Transform (Hover)**: `translateY(-2px)`

#### Sidebar Button Icons
- **Size**: `24px × 24px`
- **Stroke Width**: `1.5px`
- **Color**: `rgba(255, 255, 255, 0.5)`
- **Color (Hover)**: `rgba(255, 255, 255, 0.8)`
- **Color (Active)**: `#ff3333`

#### Tooltips
- **Background**: `rgba(0, 0, 0, 0.9)`
- **Border**: `1px solid rgba(255, 255, 255, 0.1)`
- **Border Radius**: `8px`
- **Padding**: `8px 12px`
- **Font Size**: `12px`
- **Position**: `left: 100%; margin-left: 12px`

#### Sidebar Divider
- **Width**: `32px`
- **Height**: `1px`
- **Background**: `rgba(255, 255, 255, 0.1)`
- **Margin**: `12px 0`

#### Voice Modulator
- **Container Padding**: `60px`
- **Column Gap**: `40px`
- **Segment Gap**: `4px`

#### Voice Segments
- **Width**: `8px`
- **Height**: `20px`
- **Background**: `rgba(255, 255, 255, 0.05)`
- **Border Radius**: `4px`
- **Active Gradient**: `linear-gradient(to top, #ff0000, #ff3333)`

#### Voice Control Button
- **Size**: `80px × 80px`
- **Border Radius**: `50%`
- **Background**: `rgba(255, 255, 255, 0.03)`
- **Background (Hover)**: `rgba(255, 255, 255, 0.05)`
- **Background (Active)**: `rgba(255, 0, 0, 0.08)`
- **Border**: `2px solid rgba(255, 255, 255, 0.08)`
- **Border (Hover)**: `rgba(255, 255, 255, 0.15)`
- **Border (Active)**: `rgba(255, 0, 0, 0.3)`
- **Transform (Hover)**: `scale(1.05)`

#### Voice Control Icon
- **Size**: `32px × 32px`
- **Fill**: `rgba(255, 255, 255, 0.6)`
- **Fill (Hover)**: `rgba(255, 255, 255, 0.8)`
- **Fill (Active)**: `#ff3333`

#### Status Text
- **Font Size**: `14px`
- **Font Weight**: `300`
- **Letter Spacing**: `2px`
- **Text Transform**: `uppercase`
- **Color**: `rgba(255, 255, 255, 0.3)`
- **Color (Active)**: `rgba(255, 255, 255, 0.8)`
- **Margin Top**: `40px`

#### Chat Area
- **Width**: `400px`
- **Background**: `rgba(255, 255, 255, 0.02)`
- **Border**: `1px solid rgba(255, 255, 255, 0.05)` (left side)

#### Chat Header
- **Padding**: `24px`
- **Border**: `1px solid rgba(255, 255, 255, 0.05)` (bottom)

#### Chat Title
- **Font Size**: `16px`
- **Font Weight**: `500`
- **Color**: `rgba(255, 255, 255, 0.9)`
- **Letter Spacing**: `0.5px`

#### Chat Messages Container
- **Padding**: `24px`
- **Gap**: `16px`
- **Scrollbar Width**: `6px`
- **Scrollbar Thumb**: `rgba(255, 255, 255, 0.1)`
- **Scrollbar Thumb (Hover)**: `rgba(255, 255, 255, 0.15)`
- **Scrollbar Thumb Radius**: `3px`

#### Message Bubbles
- **Max Width**: `80%`
- **Background**: `rgba(255, 255, 255, 0.03)`
- **Background (User)**: `rgba(255, 0, 0, 0.05)`
- **Border**: `1px solid rgba(255, 255, 255, 0.06)`
- **Border (User)**: `rgba(255, 0, 0, 0.1)`
- **Border Radius**: `16px`
- **Padding**: `12px 16px`
- **Font Size**: `14px`
- **Line Height**: `1.6`

#### Message Time
- **Font Size**: `11px`
- **Color**: `rgba(255, 255, 255, 0.3)`
- **Margin Top**: `6px`
- **Padding**: `0 4px`

#### Chat Input Container
- **Padding**: `20px`
- **Border**: `1px solid rgba(255, 255, 255, 0.05)` (top)
- **Gap**: `12px`

#### Chat Input Field
- **Background**: `rgba(255, 255, 255, 0.03)`
- **Background (Focus)**: `rgba(255, 255, 255, 0.05)`
- **Border**: `1px solid rgba(255, 255, 255, 0.08)`
- **Border (Focus)**: `rgba(255, 255, 255, 0.15)`
- **Border Radius**: `12px`
- **Padding**: `12px 16px`
- **Font Size**: `14px`
- **Color**: `#ffffff`

#### Send Button
- **Size**: `40px × 40px`
- **Background**: `rgba(255, 0, 0, 0.1)`
- **Background (Hover)**: `rgba(255, 0, 0, 0.15)`
- **Border**: `1px solid rgba(255, 0, 0, 0.2)`
- **Border (Hover)**: `rgba(255, 0, 0, 0.3)`
- **Border Radius**: `10px`

#### Send Button Icon
- **Size**: `20px × 20px`
- **Fill**: `#ff3333`

---

### Shadow Specifications

#### Voice Segment Active Shadow
```css
box-shadow: 
    0 0 20px rgba(255, 0, 0, 0.8),
    inset 0 0 10px rgba(255, 255, 255, 0.2);
```

#### Pulse Animation Shadow
```css
/* Start/End State */
box-shadow: 0 0 0 0 rgba(255, 0, 0, 0.4);

/* Middle State */
box-shadow: 0 0 0 20px rgba(255, 0, 0, 0);
```

---

### Animation Specifications

#### Transitions
- **Standard Duration**: `0.3s`
- **Quick Duration**: `0.15s`
- **Slow Duration**: `0.5s`
- **Easing**: `cubic-bezier(0.4, 0, 0.2, 1)` (voice segments)
- **Standard Easing**: `ease-out` (fade in)
- **Pulse Easing**: `ease-in-out` (pulse animation)

#### Keyframe Animations

##### Rotate Animation
```css
@keyframes rotate {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}
```
- **Duration**: `3s`
- **Timing**: `linear infinite`

##### Pulse Animation
```css
@keyframes pulse {
    0%, 100% { box-shadow: 0 0 0 0 rgba(255, 0, 0, 0.4); }
    50% { box-shadow: 0 0 0 20px rgba(255, 0, 0, 0); }
}
```
- **Duration**: `2s`
- **Timing**: `ease-in-out infinite`

##### Fade In Animation
```css
@keyframes fadeIn {
    from {
        opacity: 0;
        transform: translateY(10px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}
```
- **Duration**: `0.5s`
- **Timing**: `ease-out forwards`

##### Float Animation (Particles)
```css
@keyframes float {
    0% {
        transform: translateY(100vh) translateX(0);
        opacity: 0;
    }
    10% { opacity: 1; }
    90% { opacity: 1; }
    100% {
        transform: translateY(-100vh) translateX(50px);
        opacity: 0;
    }
}
```
- **Duration**: `20s-28s` (variable)
- **Timing**: `linear infinite`
- **Delays**: `0s-20s` (staggered)

#### Transform Properties
- **Hover Lift**: `translateY(-2px)` (sidebar buttons)
- **Scale**: `scale(1.05)` (voice control hover)
- **Scale Origin**: `bottom` (voice segments)

---

### Particle System

#### Particle Properties
- **Size**: `1px × 1px`
- **Background**: `rgba(255, 255, 255, 0.3)`
- **Border Radius**: `50%`
- **Positions**: `10%, 30%, 50%, 70%, 90%` (horizontal)
- **Animation Durations**: `20s, 22s, 24s, 25s, 28s`
- **Animation Delays**: `0s, 5s, 10s, 15s, 20s`

---

### Interactive States

#### Hover States
- **Opacity Changes**: Various alpha increases
- **Transform**: `translateY(-2px)`, `scale(1.05)`
- **Border Color**: Lighter variants
- **Background**: Lighter variants

#### Active States
- **Red Theme**: Applied to active elements
- **Glowing Effects**: Box shadows with red
- **Pulsing**: Animation on voice control

#### Focus States
- **Input Focus**: Lighter background and border
- **Outline**: None (custom styling)

---

### Responsive Considerations

#### Fixed Dimensions
- **Left Sidebar**: `80px` (fixed)
- **Right Chat**: `400px` (fixed)
- **Center**: `1fr` (flexible)

#### Breakpoint Notes
The current design uses fixed dimensions and may need responsive adjustments for mobile devices.

---

### Browser Compatibility

#### CSS Features Used
- **CSS Grid**: Modern browser support required
- **CSS Custom Properties**: Not used (could be added)
- **Backdrop Filter**: Not used
- **CSS Animations**: Widely supported
- **Flexbox**: Widely supported

#### Vendor Prefixes
- **Webkit Scrollbar**: Used for custom scrollbars
- **System Fonts**: Apple system font stack

---

### Performance Considerations

#### Animation Performance
- **Transform-based animations**: Hardware accelerated
- **Avoid layout-triggering properties**: Using transform instead of position changes
- **RequestAnimationFrame**: Used for voice modulator animation

#### Rendering Optimization
- **Z-index layering**: Proper stacking context
- **Overflow hidden**: Prevents unnecessary repaints
- **Transition timing**: Reasonable durations to avoid jank

---

This specification provides exact values for implementing the ConversAI interface design with pixel-perfect accuracy and consistent visual behavior across all components.