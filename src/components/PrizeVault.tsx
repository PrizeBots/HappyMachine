import React from 'react';
import { Gift } from 'lucide-react';
import { COLORS } from '../constants/contracts';
import { Prize } from '../types/prize';
import { PrizeContainer } from './PrizeContainer';
import { organizePrizes } from '../utils/formatters';

export type PrizeVaultProps = {
  prizeData: Prize[] | undefined;
  onPrizeAwarded?: (prizeId: string) => void;
  removedPrizeIds: Set<string>;
  prizeContainerRef: React.MutableRefObject<{ removePrize: (prizeId: string) => void } | null>;
};

export function PrizeVault({ prizeData, onPrizeAwarded, removedPrizeIds, prizeContainerRef }: PrizeVaultProps) {
  // Filter out removed prizes
  const filteredPrizes = React.useMemo(() => {
    if (!prizeData) return undefined;
    return prizeData.filter(prize => !removedPrizeIds.has(prize.prizeId.toString()));
  }, [prizeData, removedPrizeIds]);

  const prizeInfo = organizePrizes(filteredPrizes);

  const handlePrizeRemoved = (prizeId: string) => {
    onPrizeAwarded?.(prizeId);
  };

  return (
    <div className="flex-1 bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-xl border border-white/20 relative min-h-0 flex flex-col">
      <div className="flex items-center gap-2 mb-4">
        <div className="flex items-center gap-2">
          <Gift className="w-6 h-6 text-white" />
          <h2 className="text-2xl font-bold text-white">Prize Vault</h2>
        </div>
        {prizeInfo && (
          <span className="text-white/80 text-sm ml-auto">
            Total: {prizeInfo.total}
          </span>
        )}
      </div>
      
      {!prizeData && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm rounded-2xl">
          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
      )}
      
      <div className="flex gap-4 mb-4">
        {['Common', 'Uncommon', 'Rare', 'Ultra Rare'].map((size) => (
          <div key={size} className="flex-1 bg-white/5 rounded-lg p-3 text-center">
            <div className="w-4 h-4 rounded-full mx-auto mb-2"
                 style={{ backgroundColor: COLORS[size as keyof typeof COLORS] }} />
            <span className="text-white/80 text-sm block">{size}</span>
            <span className="text-white font-bold block">
              {prizeInfo?.organized.get(size) || 0}
            </span>
          </div>
        ))}
      </div>

      <div className="flex-1 relative min-h-0">
        {filteredPrizes && (
          <PrizeContainer 
            prizes={filteredPrizes}
            ref={prizeContainerRef}
            onPrizeRemoved={handlePrizeRemoved}
          />
        )}
      </div>
    </div>
  );
}