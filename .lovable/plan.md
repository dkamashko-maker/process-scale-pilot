# Equipment Dashboard interaction fixes

## Changes
- Make every equipment card body open its detail drawer and remove the downstream page-link hover styling.
- Make card CTAs category-aware: upstream runs, downstream production-line routes or drawer fallback, and analytical data records.
- Make drawer primary actions category-aware, with production-line navigation only for mapped downstream equipment and monitoring only for upstream equipment with a real run.
- Clip card and drawer imagery to their parent boundaries and remove the mismatched card-image corner radius.

## Validation
- Check card body and CTA behavior for upstream, mapped downstream, unmapped downstream, and analytical equipment.
- Check drawer actions, image corners, TypeScript, and preview diagnostics.

## Technical details
- Reuse `DOWNSTREAM_ROUTE_MAP`, `getRunForEquipmentId`, and the existing drawer state; no routing or data-model changes.
