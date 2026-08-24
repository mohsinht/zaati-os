# Theming

Run `npm run instance:configure` to create ignored instance settings.

## Presets

Zaati OS includes `sage`, `ocean`, `plum`, and `sand`. The interface also supports light, dark, and system defaults plus compact or comfortable density.

```json
{
  "theme": {
    "preset": "ocean",
    "default_mode": "system",
    "density": "comfortable",
    "radius": "0.9rem",
    "custom_tokens": {}
  }
}
```

## Custom palette

Set `preset` to `custom` and provide any of the allowlisted six-digit hex tokens:

```json
{
  "preset": "custom",
  "default_mode": "dark",
  "density": "compact",
  "radius": "0.7rem",
  "custom_tokens": {
    "primary": "#315D8A",
    "primary_foreground": "#FFFFFF",
    "accent": "#E3ECF5",
    "accent_foreground": "#1A3E62"
  }
}
```

Snapshot producers never control theme tokens. They may request a semantic tone such as `warning` or `positive`, and the user's theme decides how it appears.
