import React from 'react';
import { useAccount, useWriteContract, useContractRead } from 'wagmi';
import { avalancheFuji } from 'wagmi/chains';
import { Navigate, Link } from 'react-router-dom';
import { ADMIN_ADDRESS } from '../constants/admin';
import { Shield, Coins, Image, AlertCircle, ArrowLeft } from 'lucide-react';
import { PRIZE_VAULT_ADDRESS } from '../constants/contracts';
import { PRIZE_VAULT_ADMIN_ABI, ERC20_ABI } from '../constants/abis';

export function Admin() {
  const { address } = useAccount();
  const { writeContract, isPending } = useWriteContract();
  const [error, setError] = React.useState<string | null>(null);
  
  const [erc20Form, setERC20Form] = React.useState({
    tokenAddress: '',
    amountPerPrize: '',
    quantity: '1',
    size: '0'
  });
  
  const [nftForm, setNFTForm] = React.useState({
    tokenAddress: '',
    tokenIds: '',
    size: '0'
  });
  
  const { data: currentAllowance } = useContractRead({
    address: erc20Form.tokenAddress as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: [address || '0x0000000000000000000000000000000000000000', PRIZE_VAULT_ADDRESS],
    chainId: avalancheFuji.id,
    enabled: Boolean(erc20Form.tokenAddress && address)
  });

  if (!address || address.toLowerCase() !== ADMIN_ADDRESS.toLowerCase()) {
    return <Navigate to="/" replace />;
  }

  const handleERC20Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    try {
      const totalAmount = BigInt(erc20Form.amountPerPrize) * BigInt(erc20Form.quantity);
      
      // Check if we need approval
      if (!currentAllowance || currentAllowance < totalAmount) {
        await writeContract({
          address: erc20Form.tokenAddress as `0x${string}`,
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [PRIZE_VAULT_ADDRESS, totalAmount]
        });
      }

      await writeContract({
        address: PRIZE_VAULT_ADDRESS,
        abi: PRIZE_VAULT_ADMIN_ABI,
        functionName: 'depositERC20Prize',
        args: [
          erc20Form.tokenAddress as `0x${string}`,
          BigInt(erc20Form.amountPerPrize),
          BigInt(erc20Form.quantity),
          Number(erc20Form.size)
        ]
      });
      
      // Reset form after successful submission
      setERC20Form({
        tokenAddress: '',
        amountPerPrize: '',
        quantity: '1',
        size: '0'
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Failed to deposit ERC20 prize:', errorMessage);
    }
  };

  const handleNFTSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      const tokenIds = nftForm.tokenIds
        .split(',')
        .map(id => id.trim())
        .filter(Boolean)
        .map(id => BigInt(id));

      await writeContract({
        address: PRIZE_VAULT_ADDRESS,
        abi: PRIZE_VAULT_ADMIN_ABI,
        functionName: 'depositNFTPrizes',
        args: [
          nftForm.tokenAddress as `0x${string}`,
          tokenIds,
          Number(nftForm.size)
        ]
      });
      
      // Reset form after successful submission
      setNFTForm({
        tokenAddress: '',
        tokenIds: '',
        size: '0'
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Failed to deposit NFT prizes:', errorMessage);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 to-indigo-800 p-8">
      <div className="max-w-4xl mx-auto bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-xl border border-white/20">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-white" />
            <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
          </div>
          <Link
            to="/"
            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Game</span>
          </Link>
        </div>

        {error && (
          <div className="mb-6 bg-red-500/20 border border-red-500/20 rounded-lg p-4 text-red-300">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold mb-1">Transaction Failed</h3>
                <p className="text-sm opacity-80">{error}</p>
              </div>
            </div>
          </div>
        )}
        
        <div className="space-y-6">
          <div className="bg-white/5 rounded-lg p-4">
            <h2 className="text-xl font-semibold text-white mb-2">Prize Management</h2>
            <div className="grid grid-cols-2 gap-8">
              {/* ERC20 Prize Form */}
              <form onSubmit={handleERC20Submit} className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <Coins className="w-5 h-5 text-white/60" />
                  <h3 className="text-lg font-semibold text-white">Add ERC20 Prizes</h3>
                </div>
                
                <div>
                  <label className="block text-white/60 text-sm mb-1">Token Address</label>
                  <input
                    type="text"
                    value={erc20Form.tokenAddress}
                    onChange={e => setERC20Form(prev => ({ ...prev, tokenAddress: e.target.value }))}
                    placeholder="0x..."
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-white/60 text-sm mb-1">Amount Per Prize</label>
                  <input
                    type="number"
                    value={erc20Form.amountPerPrize}
                    onChange={e => setERC20Form(prev => ({ ...prev, amountPerPrize: e.target.value }))}
                    placeholder="Amount"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white"
                    required
                    min="1"
                  />
                </div>
                
                <div>
                  <label className="block text-white/60 text-sm mb-1">Quantity</label>
                  <input
                    type="number"
                    value={erc20Form.quantity}
                    onChange={e => setERC20Form(prev => ({ ...prev, quantity: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white"
                    required
                    min="1"
                  />
                </div>
                
                <div>
                  <label className="block text-white/60 text-sm mb-1">Size</label>
                  <select
                    value={erc20Form.size}
                    onChange={e => setERC20Form(prev => ({ ...prev, size: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white"
                  >
                    <option value="0">Small</option>
                    <option value="1">Medium</option>
                    <option value="2">Large</option>
                    <option value="3">XLarge</option>
                  </select>
                </div>
                
                <button
                  type="submit"
                  disabled={isPending}
                  className="w-full bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 font-semibold py-2 px-4 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed relative"
                >
                  {isPending ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      {!currentAllowance || currentAllowance < BigInt(erc20Form.amountPerPrize) * BigInt(erc20Form.quantity)
                        ? 'Approving...'
                        : 'Adding Prizes...'}
                    </span>
                  ) : (
                    !currentAllowance || currentAllowance < BigInt(erc20Form.amountPerPrize || '0') * BigInt(erc20Form.quantity)
                      ? 'Approve & Add ERC20 Prizes'
                      : 'Add ERC20 Prizes'
                  )}
                </button>
              </form>
              
              {/* NFT Prize Form */}
              <form onSubmit={handleNFTSubmit} className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <Image className="w-5 h-5 text-white/60" />
                  <h3 className="text-lg font-semibold text-white">Add NFT Prizes</h3>
                </div>
                
                <div>
                  <label className="block text-white/60 text-sm mb-1">NFT Contract Address</label>
                  <input
                    type="text"
                    value={nftForm.tokenAddress}
                    onChange={e => setNFTForm(prev => ({ ...prev, tokenAddress: e.target.value }))}
                    placeholder="0x..."
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-white/60 text-sm mb-1">Token IDs (comma-separated)</label>
                  <textarea
                    value={nftForm.tokenIds}
                    onChange={e => setNFTForm(prev => ({ ...prev, tokenIds: e.target.value }))}
                    placeholder="1, 2, 3"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white h-24"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-white/60 text-sm mb-1">Size</label>
                  <select
                    value={nftForm.size}
                    onChange={e => setNFTForm(prev => ({ ...prev, size: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white"
                  >
                    <option value="0">Small</option>
                    <option value="1">Medium</option>
                    <option value="2">Large</option>
                    <option value="3">XLarge</option>
                  </select>
                </div>
                
                <button
                  type="submit"
                  disabled={isPending}
                  className="w-full bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 font-semibold py-2 px-4 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isPending ? 'Adding Prizes...' : 'Add NFT Prizes'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}