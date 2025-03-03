import { formatEther, formatUnits } from 'viem';

export function formatAvaxBalance(balance: bigint | undefined): string {
  if (!balance) return '0.00';
  const formatted = formatEther(balance);
  return formatted.slice(0, formatted.indexOf('.') + 3);
}

export function formatGameTokenBalance(balance: bigint | undefined): string {
  if (!balance) return '0';
  return formatUnits(balance, 0);
}

export function organizePrizes(prizeData: Prize[] | undefined) {
  if (!prizeData) return null;
  
  const sizeNames = ['Common', 'Uncommon', 'Rare', 'Ultra Rare'];
  const organized = new Map<string, number>();
  let total = 0;
  
  sizeNames.forEach(size => {
    organized.set(size, 0);
  });
  
  prizeData.forEach(prize => {
    const sizeName = sizeNames[prize.size];
    organized.set(sizeName, (organized.get(sizeName) || 0) + 1);
    total += 1;
  });
  
  return { organized, total };
}