# Architecture & Technical Deep Dive

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Next.js Frontend                         │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐ │
│  │  Marketplace   │  │  Social Feed   │  │     Blog       │ │
│  │   (Listings)   │  │  (Comments)    │  │  (MDX Ready)   │ │
│  └────────────────┘  └────────────────┘  └────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
  │ Wallet Adapter│   │ Anchor Client │   │ Compression │
  │   (React UI)  │   │   (IDL-based) │   │   Utils     │
  └──────────────┘   └──────────────┘   └──────────────┘
        │                   │                   │
        └───────────────────┼───────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
  │  Solana RPC  │   │ Token Program│   │ Compression │
  │  Connection  │   │  (Metaplex)  │   │   Program   │
  └──────────────┘   └──────────────┘   └──────────────┘
```

## Core Data Flows

### 1. Garment Certification Flow

```
User Uploads Garment
    │
    ▼
Create Evidence Chain
  - Origin location
  - Material sourcing
  - Processing steps
  - Artisan/creator
  - QA checkpoints
    │
    ▼
Build Merkle Root
  (Hash evidence items → Merkle tree → Root)
    │
    ▼
State Compression
  (Reduce root storage via concurrent tree)
    │
    ▼
Call anchor_process_root()
  (Anchor program stores root on-chain)
    │
    ▼
Mint NFT Certificate
  (Create Metaplex token metadata)
    │
    ▼
Publish to Marketplace
  (Display with verification badge)
```

### 2. Traceability Verification Flow

```
User Clicks "Verify"
    │
    ▼
Load Evidence Chain
    │
    ▼
Compute Merkle Root
  (Off-chain verification)
    │
    ▼
Verify Proof
  (Compare computed root to on-chain root)
    │
    ▼
Display Results
  ✓ Valid / ✗ Invalid
```

### 3. Social Posting Flow

```
User Types Comment
    │
    ▼
Wallet Signs Message
  (useWallet().signMessage() or similar)
    │
    ▼
Create Signed Post
  {
    content: "...",
    author: wallet.publicKey,
    signature: "...",
    garmentId: "...",
    timestamp: Date.now()
  }
    │
    ▼
Post to Feed
  (Client state update + optional backend)
    │
    ▼
Display with Badge
  ✓ Signed by Author
```

## Technology Decisions

### Why Anchor + IDL?

- **Type Safety**: IDL generates TypeScript types automatically
- **Developer Experience**: No manual instruction encoding
- **Maintainability**: Single source of truth (IDL)
- **Real-world Example**: Shows production pattern

### Why State Compression?

- **Cost**: Reduce storage costs by 95%+
- **Scalability**: Enable per-item certificates
- **Efficiency**: Concurrent Merkle trees batch updates
- **Use Case**: Perfect for high-volume fashion marketplace

### Why Metaplex Token Metadata?

- **Standard**: Industry-standard for NFT metadata
- **Compatibility**: Works with all wallets & explorers
- **PDAs**: Guaranteed deterministic addresses
- **Master Edition**: Support collectibility & editions

### Why Multiple Wallets?

- **Accessibility**: Phantom, Solflare, Torus, etc.
- **Mobile**: Support mobile wallets (Saga, SMS)
- **UX**: Let users choose their preferred wallet

## Component Architecture

### Smart Components (Client-side)

```typescript
// Uses hooks, state, effects
<WalletConnect />        // Wraps entire app
<GarmentCard />          // Handles likes, clicks
<SocialFeed />           // Manages comments, likes
<TraceabilityVerifier /> // Verifies proofs
```

### Dumb Components (Presentational)

```typescript
// Pure functions, no state
<Navigation />           // Routes display
<BlogPost />             // Static rendering
```

## State Management

### Local State (React Hooks)

- `selectedGarment` - Current verification target
- `verifying` - Loading state
- `txHash` - Transaction confirmation
- `expandedComments` - UI toggling

### Global State (Wallet Adapter)

- `wallet.publicKey` - Current user
- `wallet.connected` - Connection status
- `wallet.signTransaction()` - TX signing

### Server State (Future)

- Garment listings (SWR/React Query)
- Social feed posts (pagination)
- Blog articles (ISR)

## Database Schema (Conceptual)

### Garments Table

```sql
CREATE TABLE garments (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  price DECIMAL,
  creator_pubkey TEXT NOT NULL,
  merkle_root BYTEA NOT NULL,
  nft_mint TEXT,
  evidence_chain JSONB,
  created_at TIMESTAMP,
  verified BOOLEAN DEFAULT false
);
```

### Social Posts Table

```sql
CREATE TABLE posts (
  id UUID PRIMARY KEY,
  author_pubkey TEXT NOT NULL,
  content TEXT NOT NULL,
  garment_id UUID REFERENCES garments(id),
  signature TEXT NOT NULL,
  likes INT DEFAULT 0,
  created_at TIMESTAMP
);

CREATE TABLE comments (
  id UUID PRIMARY KEY,
  post_id UUID REFERENCES posts(id),
  author_pubkey TEXT NOT NULL,
  content TEXT NOT NULL,
  signature TEXT NOT NULL,
  created_at TIMESTAMP
);
```

## Security Considerations

### Wallet Signatures

```typescript
// Sign message
const message = "Authenticate COUTURE";
const signature = await wallet.signMessage(
  Buffer.from(message)
);

// Verify (server-side)
const recoveredPublicKey = nacl.sign.detached.verify(
  Buffer.from(message),
  signature,
  publicKey.toBuffer()
);
```

### Merkle Proof Verification

```typescript
// Ensure proof can't be replayed
const proofWithNonce = sha256(proof + nonce);

// Verify against anchored root
const isValid = verifyMerkleProof(
  leaf,
  proof,
  anchoredRoot,
  index
);
```

### Anchor Program Security

```rust
// In your Anchor program
#[program]
pub mod fashion_marketplace {
  pub fn anchor_process_root(
    ctx: Context<ProcessRoot>,
    root: [u8; 32],
  ) -> Result<()> {
    // Verify signer is authority
    require_eq!(ctx.signer.key(), ctx.accounts.authority.key());
    
    // Store root in PDA
    // Emit event for indexing
    
    Ok(())
  }
}
```

## Performance Optimization

### Frontend

- ISR for blog posts
- Image optimization (next/image)
- Code splitting (dynamic imports)
- Memoization (useMemo for wallets)

### Blockchain

- Batch Merkle root updates
- Use state compression for storage
- Off-chain verification where possible
- Index events with Marinade/Helius

### Caching

- SWR for garment listings
- Browser cache for metadata
- Redis for feed pagination

## Deployment Architecture

### Development

```
localhost:3000
  ↓
Devnet RPC
  ↓
Mock Anchor program
```

### Production

```
Vercel Edge
  ↓
Mainnet RPC (Helius/QuickNode)
  ↓
Your Deployed Anchor Program
```

## Testing Strategy

### Unit Tests

```typescript
// lib/compression-utils.test.ts
test('buildMerkleRoot', () => {
  const evidence = ['a', 'b', 'c'];
  const root = buildMerkleRoot(evidence);
  expect(root).toHaveLength(32);
});
```

### Integration Tests

```typescript
// __tests__/traceability.test.ts
test('verify garment traceability', async () => {
  const result = verifyGarmentTraceability(
    'garment-001',
    mockEvidenceChain
  );
  expect(result.isValid).toBe(true);
});
```

### E2E Tests

```typescript
// e2e/marketplace.spec.ts
test('mint garment certificate', async ({ page }) => {
  await page.click('[data-testid="mint-btn"]');
  await page.waitForSelector('[data-testid="tx-hash"]');
});
```

## Future Architecture

### Phase 1 (Current)

- Mock programs
- Client-side verification
- Devnet only

### Phase 2 (Near-term)

- Real Anchor program
- Server-side indexing
- Testnet deployment

### Phase 3 (Long-term)

- Mainnet deployment
- Seller dashboard
- Admin/moderation UI
- Analytics & reporting

---

For implementation questions, see `README.md` or create an issue.
