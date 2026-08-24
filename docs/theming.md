# Theming

Run `npm run instance:configure` to create ignored instance settings.

## Presets

Zaati OS includes `sage`, `ocean`, `plum`, and `sand`. The interface also supports light, dark, and system defaults, compact or comfortable density, five local font stacks, three heading styles, a short brand mark, and configurable radius.

```json
{
  "theme": {
    "preset": "ocean",
    "default_mode": "system",
    "density": "comfortable",
    "radius": "0.9rem",
    "font_family": "humanist",
    "heading_style": "plain",
    "custom_tokens": {}
  }
}
```

## Custom palette

Set `preset` to `custom` and provide allowlisted six-digit hex tokens. Snapshot producers never control these values.

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
    "accent_foreground": "#1A3E62",
    "background": "#F7F9FB",
    "foreground": "#152332",
    "card": "#FFFFFF",
    "border": "#D9E1E8",
    "sidebar": "#EEF3F7",
    "chart_1": "#315D8A",
    "chart_2": "#39705C",
    "chart_3": "#9B6338"
  }
}
```

Snapshot producers never control theme tokens. They may request a semantic tone such as `warning` or `positive`, and the user's theme decides how it appears.

The in-app Theme studio previews mode, palette, density, fonts, headings, and radius through local browser preferences. Copy the chosen values into `config/instance.local.json` to make them deployment defaults.
