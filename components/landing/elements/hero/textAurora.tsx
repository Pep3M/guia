'use client';

import { AuroraText } from "@/components/ui/aurora-text";
import { motion } from 'motion/react';

export function TextAurora() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.7, ease: "easeOut" }}
    >
      <AuroraText>
        Rápido, Inteligente y Controlado
      </AuroraText>
    </motion.div>
  )
}