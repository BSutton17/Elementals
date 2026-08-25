# pixi — (folder unused)

**There is no code here.** The battlefield is currently drawn with **React +
SVG + CSS** ([`../components/BattlefieldView.tsx`](../components/BattlefieldView.tsx)
and the per-ability overlay components beside it), not with PixiJS.

The visual-effects framework — canvas particle systems, easing, camera, and the
per-ability effect specs — lives in [`../render/`](../render/); start with
`render/HANDOFF.md`.

PixiJS is still a dependency and remains the intended path for heavy particle
work. This folder is kept only so the path in older tickets and in
ARCHITECTURE.md history resolves somewhere.
