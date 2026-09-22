# Equipment Dashboard: All Filter and Equipment Photography

## Scope

- Update only the Equipment Dashboard page and its seeded equipment data.
- Preserve existing statuses, routes, actions, search behavior, and category-specific views.

## Implementation

1. **Add equipment imagery**
   - Add optional `imageUrl` to the shared `Equipment` type.
   - Source a compact set of clean, royalty-free laboratory/equipment photographs matching the requested instrument concepts.
   - Store downloaded images through the project asset flow and assign the resulting URLs to all 23 seeded equipment records, reusing images for matching instrument types.
   - Add a neutral image placeholder for any missing or failed mapping.

2. **Render consistent images**
   - Add a fixed-height image area at the top of every equipment card without changing the content below it.
   - Add the same equipment image as a fixed-height banner above the existing drawer header and metadata.
   - Keep crop, radius, and fallback behavior consistent across all categories.

3. **Add the “All” filter**
   - Extend the page-local tab value type with `all` and make it the initial selection.
   - Place “All” before Upstream, Downstream, and Analytical.
   - Reuse the existing search, status filter, and status sort for the combined equipment list.
   - Show the combined filtered count in the All badge while leaving each category tab’s behavior unchanged.

## Validation

- Confirm every seeded equipment card and drawer displays its mapped image or fallback.
- Verify All is selected initially and combines all categories.
- Verify search and every status filter produce correct counts and results in All and category tabs.
- Check desktop and mobile layouts, card consistency, drawer rendering, and existing navigation actions.
- Confirm the preview builds without errors and no unrelated page files changed.