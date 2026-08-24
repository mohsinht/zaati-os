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

Set `preset` to `custom` and provide complete light and dark token sets. Validation rejects text pairs below WCAG AA contrast and essential borders or chart colors below 3:1. Snapshot producers never control these values.

```json
{
  "preset": "custom",
  "default_mode": "dark",
  "density": "compact",
  "radius": "0.7rem",
  "custom_tokens": {
    "light": {
      "primary": "#315D8A",
      "primary_foreground": "#FFFFFF",
      "accent": "#E3ECF5",
      "accent_foreground": "#1A3E62",
      "background": "#F7F9FB",
      "foreground": "#152332",
      "card": "#FFFFFF",
      "card_foreground": "#152332",
      "border": "#687580",
      "sidebar": "#EEF3F7",
      "sidebar_foreground": "#152332",
      "chart_1": "#315D8A",
      "chart_2": "#39705C",
      "chart_3": "#9B6338"
    },
    "dark": {
      "primary": "#89B9E8",
      "primary_foreground": "#102033",
      "accent": "#24384C",
      "accent_foreground": "#E7F2FC",
      "background": "#101820",
      "foreground": "#EDF4FA",
      "card": "#17222D",
      "card_foreground": "#EDF4FA",
      "border": "#74818D",
      "sidebar": "#121C25",
      "sidebar_foreground": "#EDF4FA",
      "chart_1": "#89B9E8",
      "chart_2": "#72C59F",
      "chart_3": "#E0A873"
    }
  }
}
```

Snapshot producers never control theme tokens. They may request a semantic tone such as `warning` or `positive`, and the user's theme decides how it appears.

The in-app Theme studio previews mode, palette, density, fonts, headings, and radius through local browser preferences. Copy the chosen values into `config/instance.local.json` to make them deployment defaults.
