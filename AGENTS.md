<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## RoomVision product contracts

- Support both ordinary flat photos (`photo`) and complete 2:1 equirectangular panoramas (`panorama`) as first-class inputs. New image, mask, color, RAL, history and project features must work for both; validate with relevant tests for both modes.
- Ordinary photos must keep their aspect ratio, fit in the frame and support zoom/pan without spherical distortion. Photo mask edges clamp; only panorama mask edges wrap horizontally. Never silently convert a user's selected image kind.
- Keep the image kind in project files and retain compatibility with older panorama project formats.
- The user removed the eight generic preset color tiles. Do not reintroduce them unless explicitly requested; retain RAL, native custom color and HEX controls.

- Website branding follows the user-supplied Oosterbeek Schilderwerken screenshot: darkened accent blue `#103F86`, navy text `#142235`, cool near-white `#F5F7FB`, white panels and pale blue accents. Use the CSS theme tokens for interface colors. Keep RAL/paint data, uploaded images and saved surface colors independent from website branding.

- Own uploads must have a usable in-view selection route without requiring a pre-made ID mask: direct connected-color selection plus an explicit polygon outline fallback. Do not regress to a dead empty-mask upload flow. Test with uploads that have no predefined masks, in both image modes.
- Connected-color selection is not semantic AI recognition. Keep its limits visible, preserve the outline/gum correction workflow, and never claim guaranteed exclusion of same-colored furniture.
- Phase 3 provides up to eight shared-mask color variants and clean current-view PNG export. Retain project-format backward compatibility and verify exported image pixels, not just download events.
