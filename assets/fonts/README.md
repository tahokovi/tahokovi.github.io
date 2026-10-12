# Fonts

The website uses Schibsted Grotesk only. The retained font files are licensed under the SIL Open Font License 1.1. Keep each license file next to its font.

- `schibsted-grotesk-latin.woff2` — Schibsted Grotesk, Latin subset, weights 400–900. Retained original subset; no longer loaded by the website. License: `OFL-Schibsted-Grotesk.txt`.
- `literata-text-latin.woff2` — Literata, Latin subset, retained for earlier designs; no longer loaded by the website. License: `OFL-Literata.txt`. The Literata license declares no Reserved Font Name, so the derived file keeps the family name.

## How `literata-text-latin.woff2` was made

Source: `design-explorations/01-long-series/assets/fonts/literata-var.woff2` (Latin subset, `opsz` 7–72, `wght` 200–900, 110 KB).

The site sets Literata only at text sizes (about 15–23 px) and weights 400–650, so the optical-size axis is pinned at 16 and the weight axis narrowed. The result is 36.6 KB with the same 230 code points and OpenType features.

```python
# pip install fonttools brotli
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

font = TTFont("literata-var.woff2")
text = instancer.instantiateVariableFont(font, {"opsz": 16, "wght": (400, 400, 650)})
text.flavor = "woff2"
text.save("literata-text-latin.woff2")
```

The original Latin subsets do not contain U+0101 (ā). The approved option 4 uses `schibsted-grotesk-latin-haw.woff2`, copied unchanged from the typography exploration, whose extended subset was prepared for Hawaiian text. CSS declares its weight range as 400–800. This is the only font preloaded and used by the current website.
