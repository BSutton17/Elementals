// The Frozen ice cube (Ice, Epic 9). A translucent block of ice encasing a
// castle whose kingdom carries the `frozen` status — everyone sees it, the
// castle stays visible through the frosted slab. Rendered in the castle's local
// SVG space (the same `translate(0 24)` group as the sprite), so it lines up on
// the castle body. Forms in with a quick freeze, then shimmers for its duration.
export function FrozenOverlay() {
  return (
    <g className="kingdom-site__frozen" data-testid="frozen" aria-hidden="true">
      {/* The frosted ice block (castle shows through). */}
      <rect className="kingdom-site__frozen-body" x={-64} y={-80} width={128} height={120} rx={8} />
      {/* A brighter top face so it reads as a solid cube, not a flat pane. */}
      <path className="kingdom-site__frozen-top" d="M -64 -80 L 64 -80 L 50 -66 L -50 -66 Z" />
      {/* Internal fracture facets. */}
      <path className="kingdom-site__frozen-facet" d="M -28 -78 L -6 38" />
      <path className="kingdom-site__frozen-facet" d="M 26 -76 L 8 38" />
      <path className="kingdom-site__frozen-facet" d="M -62 -26 L 62 -12" />
      {/* Ice crystals growing from the corners. */}
      <path className="kingdom-site__frozen-crystal" d="M -64 -80 L -38 -80 L -64 -52 Z" />
      <path className="kingdom-site__frozen-crystal" d="M 64 -80 L 38 -80 L 64 -52 Z" />
      <path className="kingdom-site__frozen-crystal" d="M -64 40 L -38 40 L -64 14 Z" />
      <path className="kingdom-site__frozen-crystal" d="M 64 40 L 38 40 L 64 14 Z" />
      {/* A slow shimmering highlight. */}
      <path className="kingdom-site__frozen-sheen" d="M -30 -80 L -14 -80 L -44 40 L -58 40 Z" />
    </g>
  )
}
