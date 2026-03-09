import React, { useState, useEffect } from 'react';

const STORAGE_KEY = 'gk-onboarding-complete';

const steps = [
  {
    title: 'Welcome',
    body: 'Welcome to GK Architect! Visual architecture builder for Claude Code.',
  },
  {
    title: 'Add Components',
    body: 'Use the toolbar to add services, APIs, databases, and more to your architecture.',
  },
  {
    title: 'Connect',
    body: 'Drag between node handles to create data flow connections.',
  },
  {
    title: 'Build',
    body: "Select a component and click 'Build with Claude' to generate code in the terminal.",
  },
  {
    title: 'Save',
    body: 'Save your architecture and it auto-syncs to ARCHITECTURE.md for Claude to reference.',
  },
];

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY) !== 'true') {
      setVisible(true);
    }
  }, []);

  const dismiss = () => {
    setVisible(false);
    localStorage.setItem(STORAGE_KEY, 'true');
  };

  const next = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      dismiss();
    }
  };

  const prev = () => {
    if (step > 0) setStep(step - 1);
  };

  if (!visible) return null;

  const current = steps[step];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-panel border border-gray-700 rounded-xl shadow-2xl max-w-md w-full mx-4 p-6">
        {/* Step indicator */}
        <div className="flex items-center gap-1.5 mb-4">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                i <= step ? 'bg-indigo-500' : 'bg-gray-700'
              }`}
            />
          ))}
        </div>

        {/* Content */}
        <h2 className="text-lg font-semibold text-white mb-2">{current.title}</h2>
        <p className="text-gray-300 text-sm leading-relaxed mb-6">{current.body}</p>

        {/* Step count */}
        <p className="text-gray-500 text-xs mb-4">
          Step {step + 1} of {steps.length}
        </p>

        {/* Buttons */}
        <div className="flex items-center justify-between">
          <button
            onClick={dismiss}
            className="text-gray-500 hover:text-gray-300 text-xs transition-colors"
          >
            Skip
          </button>

          <div className="flex items-center gap-2">
            {step > 0 && (
              <button
                onClick={prev}
                className="px-3 py-1.5 rounded text-xs bg-surface hover:bg-gray-600 text-gray-300 transition-colors"
              >
                Prev
              </button>
            )}
            <button
              onClick={next}
              className="px-4 py-1.5 rounded text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-colors"
            >
              {step < steps.length - 1 ? 'Next' : 'Get Started'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
