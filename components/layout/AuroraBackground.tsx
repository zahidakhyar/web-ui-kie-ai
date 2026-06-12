'use client';

import React from 'react';
import { motion, useReducedMotion } from 'motion/react';

export function AuroraBackground() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden bg-background transition-colors duration-300">
      {/* Background Grid Pattern */}
      <div className="absolute inset-0 bg-grid opacity-30 dark:opacity-20" />

      {/* Aurora Blobs */}
      {!shouldReduceMotion ? (
        <div className="absolute inset-0 filter blur-[120px] saturate-150 opacity-15 dark:opacity-[0.18]">
          {/* Blob 1 */}
          <motion.div
            animate={{
              x: [0, 80, -40, 0],
              y: [0, -60, 40, 0],
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-gradient-to-br from-[var(--brand-from)] to-[var(--brand-to)]"
          />

          {/* Blob 2 */}
          <motion.div
            animate={{
              x: [0, -100, 60, 0],
              y: [0, 80, -60, 0],
            }}
            transition={{
              duration: 24,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-gradient-to-tr from-[var(--brand-to)] to-[var(--brand-from)]"
          />

          {/* Blob 3 */}
          <motion.div
            animate={{
              x: [0, 50, -50, 0],
              y: [0, 70, -70, 0],
            }}
            transition={{
              duration: 22,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className="absolute top-[30%] left-[25%] w-[40%] h-[40%] rounded-full bg-primary/30"
          />
        </div>
      ) : (
        /* Static fallbacks under reduced motion */
        <div className="absolute inset-0 filter blur-[120px] opacity-10 dark:opacity-15">
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-gradient-to-br from-[var(--brand-from)] to-[var(--brand-to)]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-gradient-to-tr from-[var(--brand-to)] to-[var(--brand-from)]" />
        </div>
      )}
    </div>
  );
}
