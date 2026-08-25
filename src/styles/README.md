# styles — Global Styles

App-wide styling and design tokens.

- `index.css` — global base styles, imported once in `main.tsx`

Component- and screen-scoped styles live next to their component or page rather
than here.

## Touch tuning lives here

`index.css` ends with the global touch rules that make the app feel native on a
phone — `touch-action: manipulation` (drops the ~300 ms double-tap-to-zoom
delay that otherwise reads as input lag when casting or swatting crawlers) and a
transparent `-webkit-tap-highlight-color`. They are set on the root and restated
for `button` / `[role="button"]`, because user-agent stylesheets give form
controls their own `touch-action`.

New interactive surfaces should fall inside those selectors or restate the rules.
