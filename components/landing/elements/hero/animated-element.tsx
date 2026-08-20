'use client';

import { motion } from 'motion/react';

export function AnimatedElement({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.7, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  )
}