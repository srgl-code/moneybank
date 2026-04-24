import React from 'react';
import { motion } from 'framer-motion';

export default function SegmentedControl({ options, value, onChange }) {
  return (
    <div className="flex p-1 rounded-2xl bg-surface-container border border-outline-variant">
      {options.map((opt) => {
        const isActive = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`
              relative flex-1 flex items-center justify-center gap-2 py-3 px-4
              rounded-xl text-sm font-bold transition-colors duration-200 z-10
              ${isActive ? 'text-on-surface' : 'text-on-surface-variant hover:text-on-surface'}
            `}
          >
            {isActive && (
              <motion.div
                layoutId="segmentedPill"
                className="absolute inset-0 bg-surface rounded-xl shadow-sm"
                transition={{ type: 'spring', stiffness: 350, damping: 30 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              {opt.icon}
              {opt.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
