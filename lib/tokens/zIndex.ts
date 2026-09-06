/**
 * Centralized Z-Index Scale
 *
 * Explicit token definitions for all layering across the application.
 * Never use arbitrary numbers in component code.
 */
export const Z_INDEX = {
  /** Base document flow: canvas, item cards, grid, note cards */
  base: 0,

  /** Elevated content: hover highlights, active focus outlines */
  elevated: 5,

  /** Sticky navigation chrome: Topbar, Sidebar, Floating breadcrumb bar */
  stickyChrome: 10,

  /** Floating contextual popovers: color pickers, action dropdowns (...), tooltips */
  dropdowns: 20,

  /** Backdrop veil for modals and dialogs */
  modalBackdrop: 35,

  /** Standard dialogs & modals: Note Editor, Share Modal, New Folder Modal */
  modals: 40,

  /** Slide-over drawers: Note Versions Drawer, Item Details Drawer */
  drawers: 45,

  /** Topmost alerts and notifications: Upload progress toast, toast banners */
  toasts: 50,

  /** Global viewport drag-and-drop file upload target */
  dragOverlay: 60,
} as const;

export type ZIndexLayer = keyof typeof Z_INDEX;
