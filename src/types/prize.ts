export type Prize = {
  tokenAddress: string;
  tokenId: bigint;
  amount: bigint;
  size: number;
  prizeId: bigint;
};

export type Notification = {
  id: number;
  message: string;
  size: number;
};