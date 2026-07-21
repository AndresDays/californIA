# DICOM Stack Scroll Design

## Goal

Allow the selected **Scroll** tool to move through the images in the active DICOM series with the mouse wheel, while **Ampliar** continues to use the wheel for zoom.

## Interaction

- With **Scroll** selected, wheel down selects the next image and wheel up selects the previous image.
- Navigation is constrained to the active series: it stops at the first and last image and never wraps.
- With **Ampliar** selected, the existing wheel zoom remains unchanged.
- Each panel navigates independently using its current image and the active series, and navigation updates the thumbnail, image counter, and displayed image.

## Architecture

`VisorDicom` owns the active-series image IDs and the image displayed in each panel. It will pass the active-series IDs and a navigation callback to `PanelDicom`. `PanelDicom` will route wheel events by tool: `StackScroll` calls the callback with a signed direction; `Zoom` applies the existing viewport scale logic.

## Error Handling

The navigation callback is a no-op if the panel image is not in the active series, the series has fewer than two images, or the requested direction exceeds a boundary. A short wheel-event debounce prevents a single trackpad gesture from advancing through multiple images.

## Testing

Add focused viewer tests that establish wheel-down advance, wheel-up retreat, no wrapping at both bounds, and that **Ampliar** retains its existing zoom behavior.
