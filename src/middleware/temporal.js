/**
 * Temporal middleware for Zustand — provides undo/redo with history snapshots.
 *
 * Only tracks changes to TRACKED_KEYS (nodes, edges, nodeMetadata).
 * UI-only state (selectedNodeIds, panelOpen, etc.) is never recorded.
 *
 * Supports batching: call beginBatch() before a drag starts and endBatch()
 * when it finishes so the entire drag collapses into a single undo step.
 *
 * History is capped at MAX_HISTORY entries.
 */

const TRACKED_KEYS = ['nodes', 'edges', 'nodeMetadata'];
const MAX_HISTORY = 50;

/**
 * Deep-clone a snapshot so mutations to the live state don't corrupt history.
 * Uses structuredClone where available, falling back to JSON round-trip.
 */
function clone(obj) {
  if (typeof structuredClone === 'function') return structuredClone(obj);
  return JSON.parse(JSON.stringify(obj));
}

function takeSnapshot(state) {
  const snap = {};
  for (const k of TRACKED_KEYS) {
    snap[k] = clone(state[k]);
  }
  return snap;
}

function hasTrackedKeys(partial) {
  return TRACKED_KEYS.some((k) => k in partial);
}

export function temporal(config) {
  return (set, get, api) => {
    let past = [];
    let future = [];
    let batching = false;
    let batchStart = null;

    /**
     * Wrapped set — intercepts calls that touch tracked keys and records
     * a snapshot *before* the mutation is applied.
     */
    const trackedSet = (partial, replace) => {
      // Resolve functional updaters so we can inspect keys
      const resolved = typeof partial === 'function' ? partial(get()) : partial;

      // Only record history when tracked keys change and _skipHistory is off
      if (hasTrackedKeys(resolved) && !get()._skipHistory) {
        if (batching) {
          // During a batch, capture state at the *start* only
          if (!batchStart) {
            batchStart = takeSnapshot(get());
          }
        } else {
          // Normal (non-batch) mutation — push snapshot to past
          past = [...past.slice(-(MAX_HISTORY - 1)), takeSnapshot(get())];
          future = [];
        }
      }

      // Apply the actual state change
      set(partial, replace);

      // Keep flags in sync (but skip history for this meta-update)
      if (hasTrackedKeys(resolved) && !get()._skipHistory) {
        set({ canUndo: past.length > 0, canRedo: future.length > 0 });
      }
    };

    // Build the original store config using our wrapped set
    const storeConfig = config(trackedSet, get, api);

    return {
      ...storeConfig,

      // ── Undo / Redo state ─────────────────────────────────────────
      canUndo: false,
      canRedo: false,
      _skipHistory: false,

      // ── Undo ──────────────────────────────────────────────────────
      undo: () => {
        if (past.length === 0) return;

        const previous = past[past.length - 1];
        past = past.slice(0, -1);

        // Save current tracked state to future
        future = [...future, takeSnapshot(get())];

        // Apply the previous snapshot without recording it as a new change
        set({ _skipHistory: true });
        set(previous);
        set({
          _skipHistory: false,
          canUndo: past.length > 0,
          canRedo: future.length > 0,
        });
      },

      // ── Redo ──────────────────────────────────────────────────────
      redo: () => {
        if (future.length === 0) return;

        const next = future[future.length - 1];
        future = future.slice(0, -1);

        // Save current tracked state to past
        past = [...past, takeSnapshot(get())];

        // Apply the next snapshot without recording it as a new change
        set({ _skipHistory: true });
        set(next);
        set({
          _skipHistory: false,
          canUndo: past.length > 0,
          canRedo: future.length > 0,
        });
      },

      // ── Batch helpers (for drag coalescing) ───────────────────────
      beginBatch: () => {
        batching = true;
        batchStart = null;
      },

      endBatch: () => {
        if (batchStart) {
          past = [...past.slice(-(MAX_HISTORY - 1)), batchStart];
          future = [];
        }
        batching = false;
        batchStart = null;
        set({ canUndo: past.length > 0, canRedo: false });
      },
    };
  };
}
