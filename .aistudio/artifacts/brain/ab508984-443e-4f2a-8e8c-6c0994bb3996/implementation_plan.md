# Collaborative Sketch Whiteboard (SketchBoard)

A real-time collaborative whiteboard featuring an organic hand-drawn sketch aesthetic, open shared board access, rich spatial drawing tools, image paste/drop, live multi-user cursors, version tracking with autosave & named releases, and vector/raster export (PDF and PNG).

### User Review & Critical Decisions

> [!IMPORTANT]
> The following architectural and aesthetic choices were confirmed through clarifying answers:
> - **Open Shared Board**: Instant frictionless access without mandatory room codes. Anyone opening the whiteboard immediately joins the live collaborative space with real-time peer cursors and synchronized canvas mutations.
> - **Hand-Drawn Sketch Aesthetic (Strict Zero-Purple Palette)**: Organic drafting canvas with textured paper tone, hand-drawn wobbly borders, sketch cross-hatching, and natural ink colors (graphite, terracotta, warm amber, forest green, blueprint blue, slate charcoal—completely free of purple/violet hues).
> - **Version Tracking**: Automatic debounced autosave checkpoints combined with user-created named milestone releases (e.g. "Sprint 1 Architecture", "Client Review v1"), with side-by-side snapshot preview, diff summaries, and one-click rollback.

---

### 1. Overview & Core Concept

- **What It Does**: A tactile, responsive virtual canvas for remote product teams, engineers, and designers to brainstorm ideas, sketch diagrams, place sticky notes, paste UI screenshots, and track versioned progress collaboratively in real time.
- **Target Audience / Persona**: Designers, software architects, product managers, and distributed engineering teams who value the freedom and expressive warmth of paper sketching paired with digital superpowers (instant syncing, infinite panning/zooming, version rollback, and publication-ready exports).
- **Key Value**: Low-barrier open brainstorming where team members jump right onto the canvas together without friction, sketch with natural hand-drawn lines, paste screenshots with clipboard shortcuts, and never lose work thanks to continuous milestone tracking.

---

### 2. User Experience & Visual Design

#### Key User Flows
1. **Board Entrance & Presence**: User opens the app, assigns their display name and cursor color (picked from organic hues: Ochre, Terracotta, Forest Green, Slate Blue, Amber, Charcoal). The user instantly sees connected teammates' cursor positions and active selections in real time.
2. **Infinite Canvas Navigation**: Fluid pan (Space + Drag or Middle Click / Trackpad) and zoom (wheel / pinch / zoom controls from 10% to 500%), with a "Reset View" and "Fit to Content" affordance.
3. **Drawing & Object Creation**:
   - **Pen / Marker / Highlighter**: Smooth freehand drawing with configurable stroke thickness, pressure emulation, and smoothing.
   - **Hand-Drawn Shapes**: Rectangles, circles/ellipses, diamonds, lines, and directional arrows rendered with double-pass sketch strokes and rough fills.
   - **Sticky Notes**: Tactile paper notes with folded corner details, paper tape accents, editable text, and warm pastel backgrounds (canary yellow, soft mint, peach, sky blue, parchment beige—strictly no purple).
   - **Text**: Rich typography with double-click in-place editing, font scaling, alignment, and sketch styling.
   - **Image Pasting & Dropping**: Drag and drop any image file directly onto the canvas, or press `Ctrl+V`/`Cmd+V` to paste from clipboard at current mouse coordinates. Full support for resize handles, rotation, and aspect lock.
4. **Real-time Team Collaboration**:
   - Live multiplayer cursors showing team members' names and positions.
   - Real-time synchronization of added, modified, moved, and deleted elements over server WebSockets with optimistic local rendering.
   - Teammate active selection halos to prevent conflicting concurrent edits.
5. **Version History & Releases**:
   - **Autosave Timeline**: Automatic background checkpoints recorded on every batch of canvas changes.
   - **Named Releases**: Modal to create milestone tags (e.g., "Initial Brainstorm", "Wireframe v1", "Final Spec").
   - **Version Drawer**: Interactive timeline showing timestamped entries, author, object counts, thumbnail preview, and a non-destructive "Restore This Version" action.
6. **Export Suite**:
   - **PNG Export**: Customizable options for transparent background vs paper texture, full canvas vs selection bounds, with high-DPI scaling.
   - **PDF Export**: Clean vector-rendered multi-page or single fit-to-page PDF document download with project metadata header.

#### Visual Identity & Theme
- **Aesthetic Direction**: Hand-drawn drafting studio / warm architect sketchbook. Tactile, thoughtful, human-made, and anti-corporate.
- **Color Palette (Strictly Zero Purple)**:
  - Canvas Background: Warm drafting paper `#F7F5F0` (light) / `#1A1B1E` charcoal slate (dark)
  - Grid / Texture: Subtle drafting dot grid `#E5E0D8` / `#2C2D31`
  - Inks & Strokes: Deep Graphite `#1F2421`, Charcoal `#33373B`, Sepia `#4A3E3D`
  - Accent Inks: Terracotta `#C2410C`, Warm Amber `#D97706`, Forest Green `#15803D`, Blueprint Cyan `#0369A1`
  - Note Hues: Canary Yellow (`#FEF08A`), Soft Mint (`#BBF7D0`), Warm Peach (`#FED7AA`), Sky Pale (`#BAE6FD`), Kraft Tan (`#E2D9C8`)
- **Typography & Hierarchy**:
  - Display & Headings: `Plus Jakarta Sans` / `Outfit` for clean UI chrome and tools
  - Canvas Handwriting: Casual sketch fonts (`Caveat` / `Architects Daughter` or styled sans) for sticky notes and free text
  - Monospace Figures: `font-mono tabular-nums` for coordinates, zoom percentage, timestamps, and version hashes
- **Component Styling & Layout**:
  - Floating pill-free toolbar pinned cleanly to the bottom or top center with tactile active indicators
  - Contextual floating action toolbar for selected elements (stroke color, fill, thickness, delete, duplicate, layer order)
  - Compact collapsible sidebar drawer for Version History and Connected Team Members

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Real-Time Sync Engine via Built-in WebSocket Server**
  - *Chosen Approach*: A real Node/Next.js custom WebSocket server handling room connections, authoritative canvas state, incremental delta broadcasts, and cursor presence.
  - *Why*: Satisfies the strict real-time requirement with zero simulation. Clients receive sub-50ms updates and sync state across tabs or different browsers seamlessly.
  - *Alternatives Considered*: Firebase Firestore listeners (requires external cloud credentials); local storage polling (forbidden for multi-user).
- **Decision 2: Canvas Rendering Architecture (SVG + Canvas Hybrid or Canvas 2D with Rough.js)**
  - *Chosen Approach*: State-driven React canvas with HTML5 Canvas 2D + Rough.js sketching engine. All elements (paths, shapes, notes, images, text) exist as declarative objects in a central state store (`BoardElement[]`).
  - *Why*: State-driven objects enable undo/redo, version serialization, real-time delta broadcasting, JSON export/import, and flawless PDF/PNG generation. Rough.js provides gorgeous, authentic hand-drawn strokes and fills.
  - *Alternatives Considered*: DOM-only elements (poor performance with 500+ strokes); Fabric.js (heavy, API version quirks, hard to get authentic rough sketch look).
- **Decision 3: Version History Architecture**
  - *Chosen Approach*: Immutable snapshot records containing timestamp, optional release tag, author name, element count, and serialized snapshot data. Autosaves trigger on debounced idle (5 seconds after user stops drawing), while user can create named milestone releases at any time.
  - *Why*: Balances storage efficiency with instant rollback safety. Named releases let teams track progress across sprints.
- **Decision 4: Image Handling & Performance**
  - *Chosen Approach*: Pasted and dropped images are converted to optimized client-side compressed base64 / blob URLs and stored in the element payload. Bounding boxes retain natural aspect ratios with interactive corner drag handles.
  - *Why*: Works out of the box with zero external storage friction; clipboard paste (`navigator.clipboard` or `paste` event) works instantly.

---

### 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                          Collaborative Whiteboard                       │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  ┌─────────────────────── Top Header Bar ───────────────────────────┐  │
│  │ Brand Wordmark  │  Active Tool Info  │ Live Peers  │ History │ Export │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                    Infinite Sketch Canvas Viewport                │  │
│  │                                                                  │  │
│  │   ┌──────────────┐     ┌──────────────┐    ┌──────────────┐      │  │
│  │   │ Sticky Note  │     │  Rough Rect  │    │ Pasted Image │      │  │
│  │   │  (No Purple) │     │  & Arrow     │    │  (Resized)   │      │  │
│  │   └──────────────┘     └──────────────┘    └──────────────┘      │  │
│  │                                                                  │  │
│  │         ✎ Freehand Pen Stroke         ↗ Remote Cursor (Alex)     │  │
│  │                                                                  │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  ┌────────────────── Floating Action Dock (Bottom) ──────────────────┐  │
│  │  Select │ Hand │ Pen │ Rect │ Circle │ Arrow │ Sticky │ Text │ Img │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  ┌───────────────── Version History Drawer (Right) ─────────────────┐  │
│  │ • Current State (Autosaved 2m ago)                               │  │
│  │ • [Release] "Sprint 1 Final Architecture" (Restore)              │  │
│  │ • [Autosave] 12:45 PM (8 items added)                            │  │
│  │ + Create Named Milestone Release Button                          │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
                                    │
                         WebSocket (ws://... /api/ws)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│               Authoritative Node Server & State Manager                │
│   - Peer Roster & Cursor Positions Broadcast                           │
│   - Canvas Element Deltas (create, update, delete, order)             │
│   - Version History Checkpoint Store (Memory + Disk Persistence)       │
└────────────────────────────────────────────────────────────────────────┘
```

#### Core Data Entities
```typescript
interface BoardElement {
  id: string;
  type: 'pen' | 'rectangle' | 'ellipse' | 'diamond' | 'arrow' | 'line' | 'sticky' | 'text' | 'image';
  x: number;
  y: number;
  width: number;
  height: number;
  points?: Array<{ x: number; y: number }>; // for pen & arrows
  text?: string;
  src?: string; // base64 / blob for images
  strokeColor: string; // strict zero-purple palette
  fillColor: string;
  strokeWidth: number;
  roughness: number; // 0 (crisp) to 2.5 (sketchy)
  opacity: number;
  zIndex: number;
  updatedAt: number;
  updatedBy: string;
}

interface PeerCursor {
  id: string;
  name: string;
  color: string;
  x: number;
  y: number;
  selectedElementId?: string | null;
  lastActive: number;
}

interface VersionSnapshot {
  id: string;
  timestamp: number;
  title: string;
  isNamedRelease: boolean;
  author: string;
  elementCount: number;
  elements: BoardElement[];
}
```

#### Verification & Delivery Checklist
1. Verify freehand pen tool with buttery smoothing and pressure scaling.
2. Verify all hand-drawn shapes (rectangles, ellipses, diamonds, lines, arrows) with sketch borders.
3. Verify sticky notes with text editing, color switching (strictly no purple), and tactile folding.
4. Verify clipboard paste (`Ctrl+V`) and drag-and-drop file upload for images with boundary transformation handles.
5. Verify real-time multi-user cursor tracking, active selection flags, and state sync over WebSockets.
6. Verify version history drawer with autosave timestamps, named release tagging, and non-destructive restore.
7. Verify high-resolution PNG export (with canvas background or transparent) and PDF export.
8. Verify light and dark mode support with Tailwind v4 `@custom-variant dark`.
