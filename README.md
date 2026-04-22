# Experiment Scheduler

A polished desktop MVP for scheduling syringe and peristaltic pump commands on a horizontal timeline, inspired by a simplified FL Studio playlist for lab devices.

## Stack

- React
- TypeScript
- Vite
- Tailwind CSS
- shadcn-style UI primitives
- Zustand
- Tauri

## Features

- Pump rows with per-row device selection
- Timeline blocks with inline device, direction, and flow-rate display
- Drag, resize, delete, and snap-to-grid interactions
- Cross-row dragging restricted to matching device types
- Right-click quick-edit menu for blocks
- Inspector panel for full block editing
- Sticky desktop toolbar with experiment controls, zoom, and schedule minimap

## Project Structure

- `src/components`: layout, scheduler, inspector, minimap, and UI primitives
- `src/store`: Zustand scheduler store
- `src/lib`: timeline math, layout constants, and shared utilities
- `src/types`: simple MVP data interfaces
- `src-tauri`: desktop wrapper configuration

## Run

1. Install dependencies with `npm install`
2. Start the web app with `npm run dev`
3. Start the desktop shell with `npm run tauri dev`

## Notes

- The local sandbox did not expose a working Node or Rust toolchain, so this repo was scaffolded and reviewed statically rather than executed here.
- The implementation keeps the data model intentionally simple: blocks derive device behavior and styling from their assigned row.
