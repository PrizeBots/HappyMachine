import token1 from '../assets/token1.png';
import token2 from '../assets/token2.png';
type PrizeInfo = {
  name: string;
  image: string;
};

const PRIZE_MAPPING: Record<string, PrizeInfo> = {
  '0x8777ef948Ff0c67283319f87E5e3338a0472c50c': {
    name: 'Token 1',
    image: token1
  },
  // Example of additional token mappings:
  '0x407307f2A857981f6e0d3E6D5E61a848eae696A3': {
    name: 'Token 2',
    image: token2  // Using token1 as placeholder, replace with actual image
  },
  '0x9876543210987654321098765432109876543210': {
    name: 'Token 3',
    image: token1  // Using token1 as placeholder, replace with actual image
  }
};

export function getPrizeInfo(tokenAddress: string): PrizeInfo | null {
  // Case-sensitive comparison since Ethereum addresses are case-sensitive for checksum
 // console.log('Looking up prize info for:', tokenAddress, 'Available mappings:', Object.keys(PRIZE_MAPPING));
  const info = PRIZE_MAPPING[tokenAddress];
 /// console.log('Found prize info:', info || 'null');
  return info;
}