# Fonts Directory

This directory should contain font files used by the 3D WebGL components.

## Required Fonts

- `RobotoMono-Regular.ttf` - Used for holographic text rendering in 3D space

## Download Instructions

1. Download Roboto Mono from [Google Fonts](https://fonts.google.com/specimen/Roboto+Mono)
2. Extract the Regular weight TTF file
3. Place it in this directory as `RobotoMono-Regular.ttf`

## Usage

The 3D text components reference this font path:
```
font="/fonts/RobotoMono-Regular.ttf"
```

## Fallback

If fonts are not available, the 3D text components will use the browser's default monospace font.