[README.md](https://github.com/user-attachments/files/23251014/README.md)
# COUTURE - Web3 Fashion Marketplace

A full-stack Next.js + TypeScript + Solana marketplace for handcrafted garments with on-chain traceability powered by Metaplex, state compression, and Anchor smart contracts.

## 🎨 Tech Stack

- **Frontend**: Next.js 15 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS with cyberpunk × pre-Hispanic Maya aesthetic
- **Web3 Stack**:
  - `@solana/web3.js` - RPC connection & transaction building
  - `@solana/wallet-adapter-react` - Wallet UI & state management
  - `@solana/wallet-adapter-react-ui` - Pre-built components
  - `@coral-xyz/anchor` - Program client generation from IDL
  - `@metaplex-foundation/umi` - Unified client for Metaplex programs
  - `@metaplex-foundation/mpl-token-metadata` - NFT certificate creation
  - `@solana/spl-account-compression` - State compression utilities

## 🏗️ Architecture

### Pages

- **`/`** - Home/Marketplace
  - Grid of handcrafted garments with on-chain certificates
  - Traceability verification UI
  - Mint NFT certificate functionality
  
- **`/feed`** - Social Feed
  - Posts signed by Solana wallets
  - Comments verified via wallet signatures
  - Likes tracked on-chain
  - Garment reference anchoring

- **`/blog`** - Blog/Articles
  - MDX-ready article structure
  - Web3 + fashion + sustainability content
  - Expandable to full article pages

### Core Utilities

#### `lib/solana-config.ts`
- Connection setup & RPC endpoint configuration
- Program IDs (Anchor, Metaplex, SPL Token, Compression)
- Network selection (devnet/testnet/mainnet)

#### `lib/anchor-client.ts`
- Mock Anchor IDL interface
- `callAnchorProcessRoot()` - Process Merkle roots
- `callMintGarmentCertificate()` - Mint NFT certificates
- `callVerifyTraceability()` - Verify evidence chains

#### `lib/compression-utils.ts`
- **Merkle tree functions**:
  - `createGarmentEvidenceProof()` - Create proof from garment data
  - `verifyMerkleProof()` - Verify proof against root
  - `buildMerkleRoot()` - Build root from evidence array
- **State compression**:
  - `generateCompressionInstruction()` - Generate instruction data
  - `mockAnchorProcessRoot()` - Call Anchor program method
- **Verification**:
  - `verifyGarmentTraceability()` - Full traceability chain verification

#### `lib/metaplex-utils.ts`
- **Token Metadata**:
  - `createGarmentMetadata()` - Format metadata object
  - `deriveMetadataAddress()` - PDA for Metadata account
  - `deriveMasterEditionAddress()` - PDA for Master Edition
- **NFT Certificate**:
  - `fetchGarmentCertificate()` - Fetch certificate from chain
  - `verifySignature()` - Verify wallet signature authenticity

#### `lib/wallet-utils.ts`
- `sendWalletTransaction()` - Send & confirm transactions
- `createTransferTransaction()` - SOL transfer helper
- `getWalletBalance()` - Fetch wallet balance
- `verifyWalletSignature()` - Signature verification

### Components

#### `WalletConnect`
Multi-wallet adapter setup (Phantom, Solflare, Torus) with themed buttons

#### `GarmentCard`
- Displays garment with image placeholder
- Shows origin, material, Merkle root
- "Verify" & "Mint NFT" buttons
- Traceability badge if verified

#### `SocialFeed`
- Posts signed by wallet keypair
- Comments verified with signatures
- Like counter
- Garment reference linking

#### `TraceabilityVerifier`
- Merkle proof verification UI
- Evidence chain display
- Root comparison
- Verification status badge

## 🔐 Key Features

### 1. On-Chain Traceability
Each garment has a Merkle root computed from an evidence chain:
```
- Source: Chiapas cotton field
- Processor: Textile mill
- Artisan: Weaver group
- QA: Final inspection
```

### 2. State Compression
Evidence is stored as compressed Merkle trees, reducing costs by ~95%:
- Concurrent Merkle trees for multiple garments
- Proofs verified off-chain before anchoring
- Single transaction per root update

### 3. NFT Certificates
Each garment can be minted as an NFT using Metaplex Token Metadata:
- Unique mint per certificate
- Metadata PDAs for immutable provenance
- Master Edition for collectibility

### 4. Wallet Signing
Social posts & comments are signed by wallet keypair:
- Verifies authorship on-chain
- Prevents spam/impersonation
- Enables reputation systems

### 5. Anchor Program Integration
Mock Anchor client demonstrates real program calls:
- `anchor_process_root` - Store Merkle root
- `mint_garment_certificate` - Create NFT
- `verify_traceability` - Validate evidence chain

## 🎯 WCAG AA Compliance

- **Text contrast**: 4.5:1+ for primary text on dark backgrounds
- **Interactive elements**: 3:1+ contrast ratio
- **Focus indicators**: 2px cyan outline
- **Color independence**: Not relying solely on color
- **Keyboard navigation**: Full support via tabbing

**Color System**:
- Obsidian `#0a0e27` - Base noir
- Neon Cyan `#00f0ff` - Cyberpunk accent
- Mayan Blue `#004B87` - Ceremonial depth
- Jade `#2d9e78` - Pre-Hispanic sacred green
- Cochineal Red `#e63946` - Ancient dye
- Gold `#d4a574` - Warm tone

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

```bash
cd fashion-marketplace
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Environment Variables

Create `.env.local`:
```env
NEXT_PUBLIC_SOLANA_NETWORK=devnet
NEXT_PUBLIC_RPC_ENDPOINT=https://api.devnet.solana.com
NEXT_PUBLIC_PROGRAM_ID=YourProgramIDHere
```

## 📡 Solana Integration Examples

### Mint Garment Certificate

```typescript
import { initializeAnchorClient, callMintGarmentCertificate } from '@/lib/anchor-client';

const program = initializeAnchorClient(connection, wallet);
const tx = await callMintGarmentCertificate(
  program,
  'garment-001',
  'https://metadata-uri.com/garment-001.json'
);
```

### Verify Traceability

```typescript
import { verifyGarmentTraceability, buildMerkleRoot } from '@/lib/compression-utils';

const evidenceChain = [
  'sourced:chiapas:2024-01-15',
  'spun:mill-001:2024-01-20',
  'woven:artisan-001:2024-02-10',
];

const result = verifyGarmentTraceability('garment-001', evidenceChain);
console.log(result.merkleRoot); // Hex string of root
console.log(result.isValid); // true/false
```

### Send Transaction

```typescript
import { sendWalletTransaction, createTransferTransaction } from '@/lib/wallet-utils';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';

const tx = createTransferTransaction(
  fromPubkey,
  toPubkey,
  1 // SOL amount
);

const signature = await sendWalletTransaction(connection, tx, wallet);
```

## 📦 Deployment

### Vercel (Recommended)

```bash
npm install -g vercel
vercel
```

### Self-hosted

```bash
npm run build
npm start
```

## 🔮 Future Enhancements

- [ ] Real Anchor program integration
- [ ] Mainnet deployment
- [ ] Seller/artisan onboarding flow
- [ ] Batched Merkle tree updates
- [ ] Off-chain indexing via Marinade/Helius
- [ ] Discord/Twitter OAuth social proof
- [ ] Reputation scoring system
- [ ] Auction/marketplace mechanics
- [ ] GraphQL API for queries

## 📚 Resources

- [Solana Docs](https://docs.solana.com)
- [Anchor Book](https://book.anchor-lang.com)
- [Metaplex Developer Docs](https://developers.metaplex.com)
- [State Compression Guide](https://docs.solana.com/learn/state-compression)
- [Wallet Adapter](https://github.com/solana-labs/wallet-adapter)

## 📄 License

MIT

---

Built with ❤️ for handcrafted fashion + Web3
