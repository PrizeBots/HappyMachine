import React from 'react';
import { Wallet, Sparkles, CreditCard } from 'lucide-react';
import { useAccount, useConnect, useBalance, useChainId, useContractRead, useSendTransaction, useWaitForTransactionReceipt } from 'wagmi';
import { avalancheFuji } from 'wagmi/chains';
import { GAME_TOKEN_ADDRESS, PAYMENT_CONTRACT_ADDRESS } from '../constants/contracts';
import { ERC20_ABI } from '../constants/abis';
import { formatAvaxBalance, formatGameTokenBalance } from '../utils/formatters';

type WalletSectionProps = {
  redeemAmount: number;
  maxRedeemAmount: number;
  setRedeemAmount: (amount: number) => void;
  handleTransaction: () => void;
  isWritePending: boolean;
  needsApproval: boolean;
  showPrizeLoading: boolean;
  buttonDisabledReason: string | null;
  availablePrizes: number;
};

function getButtonText(props: {
  isConnected: boolean;
  chainId: number;
  isWritePending: boolean;
  needsApproval: boolean;
  showPrizeLoading: boolean;
  maxRedeemAmount: number;
  availablePrizes: number;
  redeemAmount: number;
}) {
  const {
    isConnected,
    chainId,
    isWritePending,
    needsApproval,
    showPrizeLoading,
    maxRedeemAmount,
    availablePrizes,
    redeemAmount
  } = props;

  if (!isConnected) {
    return 'Connect Wallet to Redeem';
  }

  if (chainId !== avalancheFuji.id) {
    return 'Switch to Avalanche Fuji';
  }

  if (availablePrizes < 1) {
    return 'No Prizes Available';
  }

  if (maxRedeemAmount < 1) {
    return 'Insufficient Game Tokens';
  }

  if (isWritePending) {
    return (
      <span className="flex items-center justify-center gap-2">
        <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        {needsApproval ? 'Approving Tokens...' : showPrizeLoading ? 'Getting your prize now!' : 'Processing transaction...'}
      </span>
    );
  }

  if (needsApproval) {
    return `Approve ${redeemAmount} Token${redeemAmount > 1 ? 's' : ''} for Redeeming`;
  }
  
  return `Get ${redeemAmount} Prize${redeemAmount > 1 ? 's' : ''}`;
}

export function WalletSection({
  redeemAmount,
  maxRedeemAmount,
  setRedeemAmount,
  handleTransaction,
  isWritePending,
  needsApproval,
  showPrizeLoading,
  buttonDisabledReason,
  availablePrizes
}: WalletSectionProps) {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { connect, connectors } = useConnect();
  const [txHash, setTxHash] = React.useState<`0x${string}` | null>(null);
  const { sendTransaction, isPending: isSendingAvax } = useSendTransaction();
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);
  const [purchaseAmount, setPurchaseAmount] = React.useState(1);
  const refreshTimeoutRef = React.useRef<NodeJS.Timeout>();
  const [highlightAvax, setHighlightAvax] = React.useState(false);
  const [highlightGame, setHighlightGame] = React.useState(false);
  const prevAvaxRef = React.useRef<bigint | undefined>();
  const prevGameRef = React.useRef<bigint | undefined>();

  const avaxBalance = useBalance({
    address,
  });

  const tokenBalance = useBalance({
    address,
    token: GAME_TOKEN_ADDRESS,
  });

  // Check for balance changes and trigger animations
  React.useEffect(() => {
    if (prevAvaxRef.current !== undefined && avaxBalance.data?.value !== prevAvaxRef.current) {
      setHighlightAvax(true);
      setTimeout(() => setHighlightAvax(false), 1000);
    }
    prevAvaxRef.current = avaxBalance.data?.value;
  }, [avaxBalance.data?.value]);

  React.useEffect(() => {
    if (prevGameRef.current !== undefined && tokenBalance.data?.value !== prevGameRef.current) {
      setHighlightGame(true);
      setTimeout(() => setHighlightGame(false), 1000);
    }
    prevGameRef.current = tokenBalance.data?.value;
  }, [tokenBalance.data?.value]);

  // Watch for transaction confirmation
  const { isLoading: isWaitingForTx } = useWaitForTransactionReceipt({
    hash: txHash,
    onSuccess: () => {
      // Show success message
      setSuccessMessage(`Successfully purchased ${expectedTokens} GAME tokens!`);
      setTimeout(() => setSuccessMessage(null), 5000);
      setTxHash(null);
      
      // Initial balance refresh
      avaxBalance.refetch();
      tokenBalance.refetch();
      
      // Clear any existing timeout
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
      
      // Set up a 10-second refresh
      refreshTimeoutRef.current = setTimeout(() => {
        console.log('Performing 10-second balance refresh');
        avaxBalance.refetch();
        tokenBalance.refetch();
      }, 10000);
    },
  });

  // Cleanup timeout on unmount
  React.useEffect(() => {
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, []);

  // Fixed token rate: 1 AVAX = 2 tokens
  const tokenRate = 2n;

  const handlePurchase = async () => {
    if (!isConnected || !address) return;
    
    // Use a regular EOA address for payment
    const paymentAddress = '0x173d4a0d5cc398D1420d5FB619Fa1B292B0Cd8eC';
    
    try {
      const result = await sendTransaction({
        to: paymentAddress as `0x${string}`,
        account: address,
        value: BigInt(purchaseAmount) * BigInt('1000000000000000000')
      });
      if (result) {
        console.log('AVAX transfer sent:', result);
        setTxHash(result);
      }
    } catch (error) {
      if (error instanceof Error) {
        console.error('Purchase error:', error.message);
      }
    }
  };

  const expectedTokens = purchaseAmount * Number(tokenRate);

  return (
    <div className={`w-96 bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-xl border border-white/20 ${!isConnected ? 'h-fit' : ''}`}>
      <div className="flex items-center gap-3 mb-6">
        <Wallet className="w-7 h-7 text-white" />
        <h1 className="text-2xl font-bold text-white">
        Wallet Balance
        </h1>
      </div>

      {!isConnected && (
        <button
          onClick={() => connect({ connector: connectors[0] })}
          className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white font-semibold py-3 px-6 rounded-lg transition-all"
        >
          Connect Wallet to Start
        </button>
      )}
      {successMessage && (
        <div className="mb-4 bg-emerald-500/20 border border-emerald-500/20 rounded-lg p-3 text-emerald-300 text-sm animate-fade-in">
          {successMessage}
        </div>
      )}
      {isConnected && (
        <div className="space-y-1">
          <div className="bg-white/5 rounded-lg p-3">
            <p className="text-white/60 text-xs mb-1">Wallet</p>
            <p className="text-white font-mono text-sm truncate">{address}</p>
          </div>

          <div className={`rounded-lg p-3 transition-all ${highlightAvax ? 'animate-highlight' : 'bg-white/5'}`}>
            <p className="text-white/60 text-xs mb-1">AVAX Balance</p>
            <p className="text-white text-xl font-bold">
              {formatAvaxBalance(avaxBalance.data?.value)} AVAX
            </p>
          </div>

          <div className={`rounded-lg p-3 transition-all ${highlightGame ? 'animate-highlight' : 'bg-white/5'}`}>
            <p className="text-white/60 text-xs mb-1">Game Token Balance</p>
            <p className="text-white text-xl font-bold">
              {formatGameTokenBalance(tokenBalance.data?.value)} GAME
            </p>
          </div>

          <div className="mt-4 pt-4 border-t border-white/10">
            <div className="flex items-center gap-2 mb-3">
              <CreditCard className="w-5 h-5 text-white/60" />
              <h3 className="text-lg font-semibold text-white">Buy Game Tokens</h3>
            </div>

            <div className="bg-white/5 rounded-lg p-3 mb-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-white/60 text-sm">AVAX</span>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={purchaseAmount}
                  onChange={(e) => setPurchaseAmount(Number(e.target.value))}
                  className="bg-transparent text-white font-mono w-12 text-right"
                />
              </div>
              <input
                type="range"
                min="1"
                max="10"
                value={purchaseAmount}
                onChange={(e) => setPurchaseAmount(Number(e.target.value))}
                className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer"
              />
              <div className="mt-1.5 text-center text-white/60 text-xs">
                You will receive: {expectedTokens} GAME
              </div>
            </div>

            <button
              onClick={handlePurchase}
              disabled={!isConnected || chainId !== avalancheFuji.id || isSendingAvax || isWaitingForTx || (avaxBalance.data && avaxBalance.data.value < BigInt(purchaseAmount) * BigInt('1000000000000000000'))}
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold py-2 px-4 rounded-lg transition-all mb-4 disabled:opacity-50 disabled:cursor-not-allowed relative"
            >
              {isSendingAvax || isWaitingForTx ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {isSendingAvax ? 'Sending AVAX...' : 'Processing Purchase...'}
                </span>
              ) : avaxBalance.data && avaxBalance.data.value < BigInt(purchaseAmount) * BigInt('1000000000000000000') ? (
                'Insufficient AVAX Balance'
              ) : (
                `Buy ${expectedTokens} Game Tokens`
              )}
            </button>
          </div>

          <div className="pt-4 border-t border-white/10">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-white/60" />
              <h3 className="text-lg font-semibold text-white">Redeem Prizes</h3>
            </div>

            <div className="bg-white/5 rounded-lg p-3 mb-3">
              <div className="flex justify-between mb-2">
                <span className="text-white/60 text-sm">Amount to Redeem</span>
                <div className="text-right">
                  <span className="text-white font-mono">{redeemAmount}</span>
                  <span className="text-white/60 text-xs ml-1">({availablePrizes} prizes available)</span>
                </div>
              </div>
              <input
                type="range"
                min="1"
                max={maxRedeemAmount}
                value={redeemAmount}
                onChange={(e) => setRedeemAmount(Number(e.target.value))}
                className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer"
                disabled={maxRedeemAmount < 1}
              />
              <div className="flex justify-between mt-1">
                <span className="text-white/40 text-xs">1</span>
                <span className="text-white/40 text-xs">{maxRedeemAmount}</span>
              </div>
            </div>

            <button
              onClick={handleTransaction}
              className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white font-semibold py-2 px-4 rounded-lg transition-all"
              disabled={Boolean(buttonDisabledReason) || isWritePending}
            >
              {getButtonText({
                isConnected,
                chainId,
                isWritePending,
                needsApproval,
                showPrizeLoading,
                maxRedeemAmount,
                redeemAmount
              })}
              availablePrizes={availablePrizes}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}