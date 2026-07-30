# DICOM Series Card Preview Design

## Goal

Show one visual card per DICOM series in the viewer sidebar, matching the reference layout for TAC and resonancia studies.

## Interaction

Each card renders the first image of its series as a DICOM preview, then shows the series name, series number, and total image count. Clicking a card selects the series and displays its first image; Stack Scroll then navigates its remaining images. Individual image cards are removed from the sidebar.

## Rendering

A lightweight Cornerstone preview component loads only the first `imageId` of each series into its own disabled-on-cleanup canvas. Cards preserve the sidebar's vertical scrolling and mark the selected series with a blue border.

## Testing

Viewer tests cover one card per series, display of its count and label, first-image preview loading, and selecting a card.
