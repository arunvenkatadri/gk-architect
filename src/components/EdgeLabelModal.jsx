import React, { useState, useRef, useEffect } from 'react';

export default function EdgeLabelModal({ onSubmit, onCancel }) {
  const [label, setLabel] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(label);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <form
        onSubmit={handleSubmit}
        className="bg-panel border border-surface rounded-lg p-6 w-80 shadow-xl"
      >
        <h3 className="text-sm font-semibold mb-3">What data flows through this connection?</h3>
        <input
          ref={inputRef}
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="e.g., user events, API response, auth tokens..."
          className="w-full bg-canvas border border-surface rounded px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-accent"
        />
        <div className="flex gap-2 mt-4 justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1.5 text-xs rounded bg-surface hover:bg-gray-600 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-3 py-1.5 text-xs rounded bg-accent hover:bg-accent-hover transition-colors"
          >
            Add Connection
          </button>
        </div>
      </form>
    </div>
  );
}
