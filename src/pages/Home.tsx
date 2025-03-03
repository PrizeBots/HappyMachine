import React from 'react';
import { Link } from 'react-router-dom';
import { useAccount, useConnect, useDisconnect, useContractRead, useWriteContract, useChainId, useBalance, useWatchContractEvent, useWaitForTransactionReceipt, usePublicClient } from 'wagmi';
import { avalancheFuji } from 'wagmi/chains';
import { NotificationToast } from '../components/NotificationToast';
import { WalletSection } from '../components/WalletSection';
import { PrizeVault } from '../components/PrizeVault';
import { PrizeRevealModal } from '../components/PrizeRevealModal';
import { GAME_TOKEN_ADDRESS, PRIZE_VAULT_ADDRESS } from '../constants/contracts';
import { PRIZE_VAULT_ABI, ERC20_ABI } from '../constants/abis';
import { Notification, Prize } from '../types/prize';
import { ADMIN_ADDRESS } from '../constants/admin';
import { formatGameTokenBalance } from '../utils/formatters';
import token1 from '../assets/token1.png';

export function Home() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const [notifications, setNotifications] = React.useState<Notification[]>([]);
  const MAX_NOTIFICATIONS = 3; // Maximum number of concurrent notifications
  const notificationQueueRef = React.useRef<Notification[]>([]);
  const notificationTimeoutRef = React.useRef<NodeJS.Timeout>();
  const [removedPrizeIds, setRemovedPrizeIds] = React.useState<Set<string>>(new Set());
  const prizeContainerRef = React.useRef<{ removePrize: (prizeId: string) => void } | null>(null);
  const pendingPrizesRef = React.useRef<number>(0);
  const [redeemAmount, setRedeemAmount] = React.useState(1);
  const [showPrizeLoading, setShowPrizeLoading] = React.useState(false);
  const [pendingPrizes, setPendingPrizes] = React.useState<Array<{
    id: string;
    size: number;
    revealed: boolean;
  }>>([]);
  const pendingTxRef = React.useRef<{ hash: string; amount: number; timestamp: number } | null>(null);
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { writeContract, isPending: isWritePending } = useWriteContract();
  const [pendingTxHash, setPendingTxHash] = React.useState<`0x${string}` | null>(null);
  const publicClient = usePublicClient();
  const lastProcessedBlockRef = React.useRef<number>(0);
  const processedEventHashes = React.useRef<Set<string>>(new Set());
  const startingBlockRef = React.useRef<number | null>(null);
  const MAX_BLOCK_RANGE = 1000;
  const SCAN_INTERVAL = 3000;
  const RETRY_DELAY = 1000;
  const MAX_RETRIES = 3;

  const { data: avaxBalance } = useBalance({
    address,
    query: {
      enabled: isConnected && chainId === avalancheFuji.id,
      staleTime: 500,
      cacheTime: 1000,
      refetchInterval: 1000
    }
  });

  const { data: prizeData, refetch: refetchPrizes } = useContractRead({
    address: PRIZE_VAULT_ADDRESS,
    abi: PRIZE_VAULT_ABI,
    functionName: 'getAllPrizes',
    query: {
      enabled: true, // Always enabled
      staleTime: Infinity,
      cacheTime: Infinity
    }
  });

  // Calculate available prizes in vault
  const availablePrizes = React.useMemo(() => {
    if (!prizeData) return 0;
    return prizeData.length;
  }, [prizeData]);

  const { data: tokenBalance, refetch: refetchBalance } = useBalance({
    address,
    token: GAME_TOKEN_ADDRESS,
    query: {
      enabled: isConnected && chainId === avalancheFuji.id,
      staleTime: 500,
      cacheTime: 1000,
      refetchInterval: 1000
    }
  });

  const { data: currentAllowance } = useContractRead({
    address: GAME_TOKEN_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: [address || '0x0000000000000000000000000000000000000000', PRIZE_VAULT_ADDRESS],
    query: {
      enabled: isConnected && chainId === avalancheFuji.id,
      staleTime: 500,
      cacheTime: 1000,
      refetchInterval: 1000
    }
  });

  const addNotification = React.useCallback((message: string, size: number) => {
    const id = Date.now();
    const notification = { id, message, size };
    
    setNotifications(prev => {
      // If we're at the limit, queue the notification
      if (prev.length >= MAX_NOTIFICATIONS) {
        notificationQueueRef.current.push(notification);
        return prev;
      }
      return [...prev, notification];
    });

    // Process queue after notification expires
    if (notificationTimeoutRef.current) {
      clearTimeout(notificationTimeoutRef.current);
    }

    notificationTimeoutRef.current = setTimeout(() => {
      setNotifications(prev => {
        const next = prev.filter(n => n.id !== id);
        
        // Add next notification from queue if available
        if (notificationQueueRef.current.length > 0 && next.length < MAX_NOTIFICATIONS) {
          const nextNotification = notificationQueueRef.current.shift();
          if (nextNotification) {
            addNotification(nextNotification.message, nextNotification.size);
          }
        }
        
        return next;
      });
    }, 5000);
  }, []);

  const handlePrizeAwarded = React.useCallback((args: {
    winner: string;
    tokenAddress: string;
    tokenId: bigint;
    amount: bigint;
    size: number;
    prizeId: bigint;
    txHash?: string;
  }) => {
    // Create a unique hash for this event to prevent duplicates
    const eventHash = `${args.winner}-${args.prizeId.toString()}-${args.txHash || ''}`;
    
    // Skip if we've already processed this event
    if (processedEventHashes.current.has(eventHash)) {
      console.log('Skipping already processed event:', eventHash);
      return;
    }

    // Mark this event as processed
    processedEventHashes.current.add(eventHash);
    
    console.log('Prize awarded event:', {
      winner: args.winner,
      prizeId: args.prizeId.toString(),
      txHash: args.txHash,
      pendingTx: pendingTxRef.current?.hash,
      pendingPrizes: pendingPrizesRef.current,
      timestamp: new Date().toISOString()
    });

    // Add the prize to the removed set for all clients
    setRemovedPrizeIds(prev => new Set([...prev, args.prizeId.toString()]));

    // Only show notification if the winner is the current user
    if (args.winner.toLowerCase() === address?.toLowerCase()) {
      // Remove the prize from the container
      const prizeId = args.prizeId.toString();
      prizeContainerRef.current?.removePrize(prizeId);

      // If this is from our pending tx, update the counter
      if (args.txHash && pendingTxRef.current?.hash === args.txHash) {
        pendingPrizesRef.current = Math.max(0, pendingPrizesRef.current - 1);
        console.log('Updated pending prizes:', pendingPrizesRef.current);
      }

      // Always add to pending prizes modal for the current user
      setPendingPrizes(prev => {
        // Check if prize is already in the list
        if (prev.some(p => p.id === prizeId)) {
          return prev;
        }
        return [...prev, {
          id: prizeId,
          size: args.size,
          revealed: false
        }];
      });

      // Only refetch balance after winning
      refetchBalance();
    }
  }, [address, refetchBalance, prizeContainerRef]);

  const { isLoading: isConfirming } = useWaitForTransactionReceipt({
    hash: pendingTxHash,
    onSuccess: async (receipt) => {
      setShowPrizeLoading(true);
      console.log('Transaction confirmed, showing prize loading state');
      
      // Scan for events in this transaction
      const logs = await publicClient.getLogs({
        address: PRIZE_VAULT_ADDRESS,
        event: PRIZE_VAULT_ABI.find(x => x.name === 'PrizeAwarded'),
        fromBlock: receipt.blockNumber,
        toBlock: receipt.blockNumber
      });

      logs.forEach(log => {
        try {
          const event = log.eventName === 'PrizeAwarded' ? {
            winner: log.args.winner,
            tokenAddress: log.args.tokenAddress,
            tokenId: log.args.tokenId,
            amount: log.args.amount,
            size: log.args.size,
            prizeId: log.args.prizeId
          } : null;

          if (event) {
            handlePrizeAwarded({ ...event, txHash: receipt.transactionHash });
          }
        } catch (error) {
          console.error('Error decoding event log:', error);
        }
      });

      // Update last processed block
      lastProcessedBlockRef.current = receipt.blockNumber;
    },
  });

  // Periodically scan for missed events
  React.useEffect(() => {
    if (!address || !isConnected) return;
    
    // Initialize starting block if not set
    const initializeStartingBlock = async () => {
      try {
        // Always start from current block when connecting
        const currentBlock = await publicClient.getBlockNumber();
        startingBlockRef.current = Number(currentBlock);
        lastProcessedBlockRef.current = startingBlockRef.current;
        console.log('Starting to scan from current block:', startingBlockRef.current);
      } catch (error) {
        console.error('Failed to initialize starting block:', error);
      }
    };

    const scanForMissedEvents = async (retryCount = 0) => {
      if (!startingBlockRef.current) {
        await initializeStartingBlock();
        return;
      }

      try {
        const currentBlock = await publicClient.getBlockNumber();
        const fromBlock = BigInt(Math.max(0, lastProcessedBlockRef.current));
        let toBlock = currentBlock;
        
        // Skip if we're already at the current block or if fromBlock is invalid
        if (fromBlock >= currentBlock) {
          return;
        }

        // Process in smaller chunks for reliability
        const blockRange = Number(toBlock - fromBlock);
        if (blockRange > MAX_BLOCK_RANGE) {
          toBlock = fromBlock + BigInt(MAX_BLOCK_RANGE);
        }

        console.log('Scanning for missed events:', {
          fromBlock: fromBlock.toString(),
          toBlock: toBlock.toString(),
          blockRange: Number(toBlock - fromBlock),
          timestamp: new Date().toISOString()
        });

        // Prepare event filter
        const prizeAwardedEvent = PRIZE_VAULT_ABI.find(x => x.name === 'PrizeAwarded');
        if (!prizeAwardedEvent) {
          throw new Error('PrizeAwarded event not found in ABI');
        }

        // Get logs with retry mechanism
        const logs = await Promise.race([
          publicClient.getLogs({
            address: PRIZE_VAULT_ADDRESS,
            event: prizeAwardedEvent,
            fromBlock,
            toBlock
          }),
          // Timeout after 5 seconds
          new Promise((_, reject) => setTimeout(() => reject(new Error('getLogs timeout')), 5000))
        ]);

        logs.forEach(log => {
          try {
            const event = log.eventName === 'PrizeAwarded' ? {
              winner: log.args.winner,
              tokenAddress: log.args.tokenAddress,
              tokenId: log.args.tokenId,
              amount: log.args.amount,
              size: log.args.size,
              prizeId: log.args.prizeId
            } : null;

            if (event) {
              handlePrizeAwarded({ ...event, txHash: log.transactionHash });
            }
          } catch (error) {
            console.error('Error processing event log:', error);
            throw error;
          }
        });

        // Update last processed block
        lastProcessedBlockRef.current = Number(toBlock);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('Error scanning for missed events:', { 
          error: errorMessage,
          lastProcessedBlock: lastProcessedBlockRef.current,
          retryCount,
          timestamp: new Date().toISOString()
        });

        // Retry logic for recoverable errors
        if (retryCount < MAX_RETRIES) {
          console.log(`Retrying scan (${retryCount + 1}/${MAX_RETRIES})...`);
          setTimeout(() => {
            scanForMissedEvents(retryCount + 1);
          }, RETRY_DELAY * (retryCount + 1));
        } else if (error instanceof Error && error.message === 'getLogs timeout') {
          // If timeout, adjust the block range for next scan
          const newToBlock = BigInt(lastProcessedBlockRef.current) + BigInt(MAX_BLOCK_RANGE / 2);
          lastProcessedBlockRef.current = Number(newToBlock);
        }
      }
    };

    // Initialize and perform initial scan
    initializeStartingBlock().then(() => {
      scanForMissedEvents();
    });
    
    // Set up interval for subsequent scans
    const interval = setInterval(scanForMissedEvents, SCAN_INTERVAL);
    
    return () => {
      clearInterval(interval);
      // Clean up notification timeouts
      if (notificationTimeoutRef.current) {
        clearTimeout(notificationTimeoutRef.current);
      }
      notificationQueueRef.current = [];
      // Clear the processed events set when unmounting
      processedEventHashes.current.clear();
      startingBlockRef.current = null;
      // Clear any pending prizes when disconnecting
      setPendingPrizes([]);
    };
  }, [address, isConnected, publicClient, handlePrizeAwarded]);

  const maxRedeemAmount = tokenBalance ? Number(formatGameTokenBalance(tokenBalance.value)) : 0;
  // Limit max redeem to either token balance or available prizes, whichever is lower
  const adjustedMaxRedeem = Math.min(maxRedeemAmount, availablePrizes);
  const needsApproval = !currentAllowance || currentAllowance < BigInt(redeemAmount) * BigInt('1000000000000000000');

  const buttonDisabledReason = !isConnected ? 'Not connected' :
    chainId !== avalancheFuji.id ? 'Wrong network' :
    isWritePending ? 'Transaction pending' :
    maxRedeemAmount < 1 ? 'Insufficient tokens' :
    availablePrizes < 1 ? 'No prizes available' :
    null;

  const handlePrizeReveal = (prizeId: string) => {
    if (prizeId === 'close') {
      setPendingPrizes([]);
      // Clear any pending notifications
      notificationQueueRef.current = [];
      if (notificationTimeoutRef.current) {
        clearTimeout(notificationTimeoutRef.current);
      }
      setNotifications([]);
      setShowPrizeLoading(false);
      return;
    }

    setPendingPrizes(prev => {
      const prize = prev.find(p => p.id === prizeId);
      if (!prize) return prev;

      // Show notification when prize is revealed
      const sizeName = ['Small', 'Medium', 'Large', 'XLarge'][prize.size];
      addNotification(
        `Congratulations! You won a ${sizeName} prize! 🎉\nPrize ID: ${prizeId}`,
        prize.size
      );

      return prev.map(p => 
        p.id === prizeId ? { ...p, revealed: true } : p
      );
    });
  };

  const handlePrizeRemoved = React.useCallback((prizeId: string) => {
    // Just add the prizeId to our removed set
    setRemovedPrizeIds(prev => new Set([...prev, prizeId]));
  }, []);


  useWatchContractEvent({
    address: PRIZE_VAULT_ADDRESS,
    abi: PRIZE_VAULT_ABI,
    eventName: 'PrizeAwarded',
    pollingInterval: 500,
    batch: false,
    strict: true,
    onLogs: (logs) => {
      console.log('PrizeAwarded event logs:', logs.map(log => ({
        winner: log.args.winner,
        prizeId: log.args.prizeId.toString(),
        txHash: log.transactionHash,
        blockNumber: log.blockNumber
      })));
      
      logs.forEach(log => {
        handlePrizeAwarded({ ...log.args, txHash: log.transactionHash });
      });
    }
  });

  const handleTransaction = async () => {
    if (!isConnected) {
      connect({ connector: connectors[0] });
      return;
    }

    if (!address || chainId !== avalancheFuji.id) return;

    setShowPrizeLoading(false); // Reset loading state at start
    setPendingTxHash(null); // Reset pending tx hash

    try {
      if (needsApproval) {
        await writeContract({
          address: GAME_TOKEN_ADDRESS,
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [PRIZE_VAULT_ADDRESS, BigInt(redeemAmount) * BigInt('1000000000000000000')]
        });
      }

      pendingPrizesRef.current = redeemAmount;
      
      const result = await writeContract({
        address: PRIZE_VAULT_ADDRESS,
        abi: PRIZE_VAULT_ABI,
        functionName: 'redeemPrize',
        args: [BigInt(redeemAmount)],
        gas: 1000000n
      });

      if (result) {
        setPendingTxHash(result);

        pendingTxRef.current = {
          hash: result,
          amount: redeemAmount,
          timestamp: Date.now(),
          processed: false
        };
      
        // Set a timeout to check for missed events
        setTimeout(() => {
          if (pendingTxRef.current?.hash === result) {
            console.log('Timeout reached, forcing refresh:', {
              pendingTx: pendingTxRef.current,
              pendingPrizes: pendingPrizesRef.current,
              hash: result,
              timestamp: new Date().toISOString()
            });
            
            // Only force a refresh if we haven't processed this transaction yet
            if (!pendingTxRef.current.processed) {
              console.log('Transaction not processed, forcing refresh');
              refetchBalance();
              publicClient.getTransactionReceipt({ hash: result }).then(receipt => {
                if (receipt) {
                  console.log('Found receipt, scanning for events');
                  publicClient.getLogs({
                    address: PRIZE_VAULT_ADDRESS,
                    event: PRIZE_VAULT_ABI.find(x => x.name === 'PrizeAwarded'),
                    fromBlock: receipt.blockNumber,
                    toBlock: receipt.blockNumber
                  }).then(logs => {
                    logs.forEach(log => {
                      try {
                        const event = log.eventName === 'PrizeAwarded' ? {
                          winner: log.args.winner,
                          tokenAddress: log.args.tokenAddress,
                          tokenId: log.args.tokenId,
                          amount: log.args.amount,
                          size: log.args.size,
                          prizeId: log.args.prizeId
                        } : null;

                        if (event) {
                          handlePrizeAwarded({ ...event, txHash: log.transactionHash });
                        }
                      } catch (error) {
                        console.error('Error decoding event log:', error);
                      }
                    });
                  });
                }
              });
            }
            
            pendingTxRef.current = null;
            pendingPrizesRef.current = 0;
            setShowPrizeLoading(false);
          }
        }, 10000);
      }
    } catch (error) {
      console.log('Transaction error, clearing pending state');
      pendingTxRef.current = null;
      setPendingTxHash(null);
      setShowPrizeLoading(false);
      
      // Add more detailed error logging
      if (error instanceof Error &&
          !error.message.includes('User rejected') &&
          !error.message.includes('Transaction was rejected')) {
        const errorMessage = error.message;
        console.error('Redeem transaction failed:', {
          error: errorMessage,
          redeemAmount,
          needsApproval,
          currentAllowance: currentAllowance?.toString(),
        });
        
        // Show user-friendly error notification
        addNotification(
          `Failed to redeem prizes: ${
            errorMessage.includes('insufficient funds') 
              ? 'Insufficient funds for gas'
              : 'Transaction failed'
          }`,
          0
        );
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 to-indigo-800 flex flex-col">
      <div className="bg-black/20 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-2 flex justify-between items-center">
          <p className="text-white/80 text-sm">
            By connecting your wallet, you agree to our{' '}
            <Link to="/terms" className="text-white hover:text-white/80 underline underline-offset-2">
              Terms and Conditions
            </Link>
          </p>
          <div className="flex items-center gap-2">
            {!isConnected ? (
              <button
                onClick={() => connect({ connector: connectors[0] })}
                className="bg-white/20 hover:bg-white/30 text-white text-sm font-semibold py-1.5 px-4 rounded-lg transition-all"
              >
                Connect Wallet
              </button>
            ) : (
              <div className="flex items-center gap-2">
                {address?.toLowerCase() === ADMIN_ADDRESS.toLowerCase() && (
                  <Link
                    to="/admin"
                    className="bg-red-500/20 hover:bg-red-500/30 text-red-300 text-sm font-semibold py-1.5 px-4 rounded-lg transition-all"
                  >
                    Admin Panel
                  </Link>
                )}
                <button
                  onClick={() => disconnect()}
                  className="bg-white/20 hover:bg-white/30 text-white text-sm font-semibold py-1.5 px-4 rounded-lg transition-all"
                >
                  Disconnect
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto w-full px-4 py-6">
        <h1 className="text-4xl font-bold text-white tracking-tight">Capsule Machine 9000</h1>
      </div>
      
      <div className="flex-1 p-4 flex gap-4 min-h-0">
        <div className="fixed top-4 right-4 z-50 space-y-4 pointer-events-none">
          {notifications.map((notification) => (
            <NotificationToast key={notification.id} notification={notification} />
          ))}
        </div>

        {pendingPrizes.length > 0 && (
          <PrizeRevealModal
            prizes={pendingPrizes}
            onReveal={handlePrizeReveal}
          />
        )}

        <PrizeVault 
          prizeData={prizeData}
          onPrizeAwarded={handlePrizeRemoved}
          removedPrizeIds={removedPrizeIds}
          prizeContainerRef={prizeContainerRef}
        />
        
        <div className="flex-none">
          <WalletSection
            redeemAmount={redeemAmount}
            maxRedeemAmount={adjustedMaxRedeem}
            setRedeemAmount={setRedeemAmount}
            handleTransaction={handleTransaction}
            isWritePending={isWritePending || isConfirming}
            needsApproval={needsApproval}
            showPrizeLoading={showPrizeLoading}
            buttonDisabledReason={buttonDisabledReason}
            availablePrizes={availablePrizes}
          />
        </div>
      </div>
    </div>
  );
}