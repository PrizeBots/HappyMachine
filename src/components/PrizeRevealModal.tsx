import React from 'react';
import { Trophy } from 'lucide-react';
import { COLORS } from '../constants/contracts';

type PrizeRevealModalProps = {
  prizes: Array<{
    id: string;
    size: number;
    revealed: boolean;
  }>;
  onReveal: (prizeId: string) => void;
};

export function PrizeRevealModal({ prizes, onReveal }: PrizeRevealModalProps) {
  if (prizes.length === 0) return null;

  // Find the first unrevealed prize
  const currentPrize = prizes.find(p => !p.revealed);
  const remainingPrizes = prizes.filter(p => !p.revealed).length;
  const allRevealed = !currentPrize;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-white/10 backdrop-blur-xl rounded-2xl p-6 shadow-2xl border border-white/20 w-[480px] max-w-[calc(100vw-2rem)]">
      <div className="flex items-center gap-3 mb-4">
        <Trophy className="w-6 h-6 text-white" />
        <h2 className="text-xl font-bold text-white">
          {allRevealed ? 'All Prizes Revealed!' : `New Prize Won! (${remainingPrizes} remaining)`}
        </h2>
      </div>

      {currentPrize && (
        <div className="mb-4">
          <div
            onClick={() => onReveal(currentPrize.id)}
            className="aspect-square rounded-xl flex items-center justify-center transition-all transform hover:scale-105 cursor-pointer relative overflow-hidden bg-gradient-to-br from-white/20 to-white/5 hover:from-white/30 hover:to-white/10"
            style={{
              boxShadow: `0 0 20px ${COLORS[['Common', 'Uncommon', 'Rare', 'Ultra Rare'][currentPrize.size] as keyof typeof COLORS]}20`
            }}
          >
            <div
              className="w-24 h-24 rounded-full transition-all duration-500"
              style={{ backgroundColor: COLORS[['Common', 'Uncommon', 'Rare', 'Ultra Rare'][currentPrize.size] as keyof typeof COLORS] }}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-white/80 font-medium text-lg">Click to Reveal Your Prize!</p>
            </div>
          </div>
        </div>
      )}

      {allRevealed && (
        <div className="text-center">
          <button
            onClick={() => onReveal('close')}
            className="bg-white/10 hover:bg-white/20 text-white px-4 py-1.5 rounded-lg transition-all text-sm"
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
}