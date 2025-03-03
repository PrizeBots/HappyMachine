export const PRIZE_VAULT_ABI = [
  {
    name: 'PrizeAwarded',
    type: 'event',
    inputs: [
      { indexed: true, name: 'winner', type: 'address' },
      { indexed: false, name: 'tokenAddress', type: 'address' },
      { indexed: false, name: 'tokenId', type: 'uint256' },
      { indexed: false, name: 'amount', type: 'uint256' },
      { indexed: false, name: 'size', type: 'uint8' },
      { indexed: false, name: 'prizeId', type: 'uint256' }
    ]
  },
  {
    name: 'redeemPrize',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'amount', type: 'uint256' }],
    outputs: []
  },
  {
    name: 'getAllPrizes',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [
      {
        type: 'tuple[]',
        components: [
          { name: 'tokenAddress', type: 'address' },
          { name: 'tokenId', type: 'uint256' },
          { name: 'amount', type: 'uint256' },
          { name: 'size', type: 'uint8' },
          { name: 'prizeId', type: 'uint256' }
        ]
      }
    ]
  },
  {
    name: 'gameToken',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'address' }]
  }
] as const;

export const PRIZE_VAULT_ADMIN_ABI = [
  {
    name: 'depositERC20Prize',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'tokenAddress', type: 'address' },
      { name: 'amountPerPrize', type: 'uint256' },
      { name: 'quantity', type: 'uint256' },
      { name: 'size', type: 'uint8' }
    ],
    outputs: []
  },
  {
    name: 'depositNFTPrizes',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'tokenAddress', type: 'address' },
      { name: 'tokenIds', type: 'uint256[]' },
      { name: 'size', type: 'uint8' }
    ],
    outputs: []
  }
] as const;
export const ERC20_ABI = [
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' }
    ],
    outputs: [{ type: 'uint256' }]
  },
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    outputs: [{ type: 'bool' }]
  }
] as const;