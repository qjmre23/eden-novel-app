import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function LoadingOverlay({ visible, message }: { visible: boolean; message?: string }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-50 bg-black/70 flex flex-col items-center justify-center gap-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          {message && <p className="text-gray-300 text-sm">{message}</p>}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
