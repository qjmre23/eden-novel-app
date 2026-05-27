import React from 'react';
import { motion } from 'framer-motion';

interface Props {
  locationName: string;
  imageUrl?: string | null;
}

export default function EnvironmentBubble({ locationName, imageUrl }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 340, damping: 28 }}
      className="mx-2 my-3 rounded-xl overflow-hidden relative h-48"
    >
      {imageUrl ? (
        <img src={imageUrl} alt={locationName} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full bg-gray-800/60 flex items-center justify-center">
          <span className="text-gray-600 text-sm">🗺</span>
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 px-3 py-2 flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
        <span className="text-white text-xs font-semibold truncate">{locationName}</span>
      </div>
    </motion.div>
  );
}
