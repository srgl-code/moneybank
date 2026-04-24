import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAnimatedNumber } from '../../hooks/useAnimatedNumber.js';

const fmt = (n) => `M$ ${Number(n).toLocaleString('pt-BR')}`;

export default function AnimatedBalance({
  value,
  className = '',
  prefix = '',
  size = 'lg',
}) {
  const { displayValue, direction } = useAnimatedNumber(value);

  const sizeClasses = {
    sm: 'text-2xl',
    md: 'text-4xl md:text-5xl',
    lg: 'text-6xl md:text-8xl',
  };

  const flashColor = direction === 'up'
    ? 'text-primary'
    : direction === 'down'
      ? 'text-error'
      : 'text-on-surface';

  return (
    <div className={`font-headline font-bold tracking-tighter balance-text ${className}`}>
      <AnimatePresence mode="wait">
        <motion.span
          key={direction || 'idle'}
          className={`${sizeClasses[size]} ${flashColor} transition-colors duration-500`}
          initial={direction ? { scale: 1.05 } : false}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 15 }}
        >
          {prefix}{fmt(displayValue)}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}
