# DICOM Stack Scroll Wheel Capture Design

## Goal

When the Scroll tool is active over a DICOM panel, the mouse wheel changes only the current image in its active series and never scrolls the browser page.

## Design

`PanelDicom` registers a native `wheel` listener on its wrapper element with `{ passive: false }`. The listener runs only while `StackScroll` is selected, prevents the browser default, stops propagation, and delegates the direction to the existing stack navigation handler. It is removed on unmount.

## Scope

Zoom and every other tool retain their current behavior. The browser may scroll normally when the pointer is outside an image panel.

## Testing

The viewer test verifies the native wheel event is prevented and that its direction still selects the next image.
