# Fonts

Both families are self-hosted under the SIL Open Font License 1.1. Keep each license file next to its font.

- `schibsted-grotesk-latin.woff2` — Schibsted Grotesk, Latin subset, weights 400–900. Used for the name, navigation, headings, labels, and buttons. License: `OFL-Schibsted-Grotesk.txt`.
- `literata-text-latin.woff2` — Literata, Latin subset, used for reading text. License: `OFL-Literata.txt`. The Literata license declares no Reserved Font Name, so the derived file keeps the family name.

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

Neither subset contains U+0101 (ā), so "Mānoa" draws that letter from a fallback font.
