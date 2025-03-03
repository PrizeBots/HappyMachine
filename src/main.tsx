import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { avalancheFuji } from 'wagmi/chains';
import { injected } from 'wagmi/connectors';
import App from './App.tsx';
import './index.css';

const customAvalancheFuji = {
  ...avalancheFuji,
  rpcUrls: {
    ...avalancheFuji.rpcUrls,
    default: { http: ['https://rpc.ankr.com/avalanche_fuji'] },
    public: { http: ['https://rpc.ankr.com/avalanche_fuji'] },
  }
};

const transport = http(customAvalancheFuji.rpcUrls.default.http[0], {
  onRequest({ method, params }) {
    // Only log non-polling requests
    if (!['eth_blockNumber', 'eth_getBlockByNumber'].includes(method)) {
      console.log('RPC Request:', { method, params });
    }
  },
  onResponse({ method, params, response, status }) {
    if (status !== 'success' && !['eth_blockNumber', 'eth_getBlockByNumber'].includes(method)) {
      console.error('RPC Error:', {
        method,
        params,
        response,
        status
      });
    }
  },
  fetchOptions: {
    headers: {
      'Content-Type': 'application/json'
    },
  },
  name: 'Avalanche Fuji',
  retryCount: 3,
  retryDelay: 3000,
  timeout: 30_000,
});

console.log('Initializing Wagmi with:', {
  chainId: customAvalancheFuji.id,
  rpcUrl: customAvalancheFuji.rpcUrls.default.http[0]
});

const config = createConfig({
  chains: [customAvalancheFuji],
  connectors: [injected()],
  transports: {
    [customAvalancheFuji.id]: transport,
  },
});

// Create root once
const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element not found');
const root = createRoot(rootElement);

function Root() {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

root.render(
  <StrictMode>
    <Root />
  </StrictMode>
);