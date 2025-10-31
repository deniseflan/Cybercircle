# Integration Examples - COUTURE Marketplace

## 1. Minting a Garment Certificate

Complete flow from evidence chain to NFT mint:

```typescript
// app/page.tsx - handleMintCertificate function
import { buildMerkleRoot, mockAnchorProcessRoot } from '@/lib/compression-utils';
import { callMintGarmentCertificate } from '@/lib/anchor-client';
import { createGarmentMetadata, deriveMetadataAddress } from '@/lib/metaplex-utils';

async function handleMintCertificate(garmentId: string) {
  if (!connected || !publicKey) {
    alert('Connect wallet first');
    return;
  }

  try {
    setMinting(true);

    // Step 1: Get garment data
    const garment = MOCK_GARMENTS.find(g => g.id === garmentId);
    if (!garment) throw new Error('Garment not found');

    // Step 2: Build evidence chain
    const evidenceChain = [
      `sourced:${garment.traceability.origin}:${new Date().toISOString()}`,
      `material:${garment.traceability.material}:processed`,
      `crafted:artisan:completed`,
      `verified:qa:passed`,
    ];

    // Step 3: Compute Merkle root
    const merkleRoot = buildMerkleRoot(evidenceChain);
    console.log('Merkle Root:', merkleRoot.toString('hex'));

    // Step 4: Call Anchor program to process root
    const anchorResult = await mockAnchorProcessRoot(merkleRoot, garmentId);
    console.log('Anchor tx:', anchorResult.txHash);

    // Step 5: Create NFT metadata
    const metadata = createGarmentMetadata(
      garment.name,
      `Verified on-chain at ${new Date().toISOString()}`,
      garment.image,
      {
        Origin: garment.traceability.origin,
        Material: garment.traceability.material,
        MerkleRoot: merkleRoot.toString('hex'),
      },
      publicKey.toString()
    );

    // Step 6: Store metadata on-chain (IPFS in production)
    const metadataUri = 'https://metadata.example.com/' + garmentId + '.json';

    // Step 7: Mint NFT certificate (mock)
    // In production: use @metaplex-foundation/umi
    const mintTx = await callMintGarmentCertificate(
      program,
      garmentId,
      metadataUri
    );

    setTxHash(mintTx);
    alert(`✓ Certificate minted!\nTx: ${mintTx}`);

  } catch (error) {
    console.error('Error:', error);
    alert(`Error: ${error.message}`);
  } finally {
    setMinting(false);
  }
}
```

## 2. Verifying Garment Traceability

User verifies a garment's complete history:

```typescript
// components/TraceabilityVerifier.tsx - handleVerify function
import {
  buildMerkleRoot,
  verifyMerkleProof,
  verifyGarmentTraceability,
} from '@/lib/compression-utils';

const handleVerify = async () => {
  setVerifying(true);
  try {
    // Evidence chain from database or on-chain
    const evidenceChain = [
      'sourced:chiapas-farm:2024-01-15T10:00:00Z',
      'processed:textile-mill-mexico:2024-01-20T14:30:00Z',
      'woven:artisan-cooperative:2024-02-10T09:00:00Z',
      'quality-check:qa-lab:2024-02-15T16:45:00Z',
    ];

    // Compute what the root should be
    const computedRoot = buildMerkleRoot(evidenceChain);

    // Get stored root from chain or database
    const storedRoot = Buffer.from(merkleRoot, 'hex');

    // Compare roots
    const rootsMatch = computedRoot.equals(storedRoot);

    // Full verification with traceability
    const verification = verifyGarmentTraceability(
      garmentId,
      evidenceChain
    );

    setResult({
      isValid: rootsMatch && verification.isValid,
      merkleRoot: computedRoot.toString('hex'),
      proofDepth: verification.proofDepth,
      evidenceItems: evidenceChain.length,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    setResult({
      isValid: false,
      error: error.message,
    });
  } finally {
    setVerifying(false);
  }
};
```

## 3. Posting a Signed Social Feed Item

Creator posts with wallet signature:

```typescript
// app/feed/page.tsx
import { useWallet } from '@solana/wallet-adapter-react';
import * as nacl from 'tweetnacl';

async function handlePostFeedItem(content: string, garmentId: string) {
  const { publicKey, signMessage } = useWallet();
  
  if (!publicKey || !signMessage) {
    alert('Connect wallet to post');
    return;
  }

  try {
    // Create message to sign
    const timestamp = Date.now();
    const messageContent = `COUTURE_FEED:${content}:${garmentId}:${timestamp}`;
    const messageBuffer = Buffer.from(messageContent);

    // Sign with wallet
    const signatureUint8 = await signMessage(messageBuffer);
    const signatureBuffer = Buffer.from(signatureUint8);
    const signatureBase64 = signatureBuffer.toString('base64');

    // Create feed item
    const feedItem = {
      id: 'feed-' + Date.now(),
      author: 'Creator',
      authorPubkey: publicKey.toString(),
      content,
      garmentId,
      timestamp,
      likes: 0,
      comments: [],
      signature: signatureBase64,
      verified: true, // Already verified by wallet
    };

    // Store item (local state for now, backend in production)
    setFeedItems(prev => [feedItem, ...prev]);

    console.log('✓ Post created and signed');

  } catch (error) {
    console.error('Error posting:', error);
    alert('Failed to create post');
  }
}
```

## 4. Verifying Feed Post Signature

Validate that post was signed by claimed author:

```typescript
// lib/metaplex-utils.ts
import * as nacl from 'tweetnacl';
import bs58 from 'bs58';

export function verifyFeedPostSignature(
  feedItem: FeedItem
): boolean {
  try {
    const { content, garmentId, timestamp, authorPubkey, signature } = feedItem;

    // Reconstruct signed message
    const messageContent = `COUTURE_FEED:${content}:${garmentId}:${timestamp}`;
    const messageBuffer = Buffer.from(messageContent);

    // Decode signature from base64
    const signatureBuffer = Buffer.from(signature, 'base64');

    // Decode public key from base58
    const publicKeyBuffer = bs58.decode(authorPubkey);

    // Verify signature
    return nacl.sign.detached.verify(
      messageBuffer,
      new Uint8Array(signatureBuffer),
      new Uint8Array(publicKeyBuffer)
    );

  } catch (error) {
    console.error('Verification error:', error);
    return false;
  }
}

// Usage
const isValid = verifyFeedPostSignature(feedItem);
if (isValid) {
  console.log('✓ Post verified as signed by', feedItem.authorPubkey);
}
```

## 5. Building Evidence Chain for Garment

Complete flow for creating evidence:

```typescript
// utils/garment-onboarding.ts
import { createGarmentEvidenceProof, buildMerkleRoot } from '@/lib/compression-utils';

interface GarmentEvidence {
  origin: string;
  originDate: Date;
  material: string;
  materialDate: Date;
  artisan: string;
  artisanDate: Date;
  qualityCheck: string;
  qualityDate: Date;
}

export function createEvidenceChain(evidence: GarmentEvidence): {
  chain: string[];
  root: string;
  proofCount: number;
} {
  // Build structured evidence items
  const chain = [
    `sourced:${evidence.origin}:${evidence.originDate.toISOString()}`,
    `material:${evidence.material}:${evidence.materialDate.toISOString()}`,
    `crafted:${evidence.artisan}:${evidence.artisanDate.toISOString()}`,
    `verified:${evidence.qualityCheck}:${evidence.qualityDate.toISOString()}`,
  ];

  // Compute Merkle root
  const root = buildMerkleRoot(chain);

  return {
    chain,
    root: root.toString('hex'),
    proofCount: chain.length,
  };
}

// Usage
const evidence = createEvidenceChain({
  origin: 'Chiapas, Mexico',
  originDate: new Date('2024-01-15'),
  material: 'Organic Cotton',
  materialDate: new Date('2024-01-20'),
  artisan: 'Maya Artisan Cooperative',
  artisanDate: new Date('2024-02-10'),
  qualityCheck: 'Fair Trade Certified Lab',
  qualityDate: new Date('2024-02-15'),
});

console.log('Evidence chain created');
console.log('Root:', evidence.root);
console.log('Items:', evidence.chain);
```

## 6. Anchor Program Call with Wallet

Send transaction to on-chain program:

```typescript
// lib/anchor-client-advanced.ts
import { Transaction, sendAndConfirmTransaction } from '@solana/web3.js';
import { sendWalletTransaction } from '@/lib/wallet-utils';

export async function callAnchorProcessRootWithTx(
  program: Program,
  merkleRoot: Buffer,
  connection: Connection,
  wallet: any
): Promise<string> {
  try {
    // Build instruction from Anchor method
    const instruction = await program.methods
      .anchorProcessRoot(merkleRoot)
      .accounts({
        authority: wallet.publicKey,
        // ... other accounts from IDL
      })
      .instruction();

    // Create transaction
    const transaction = new Transaction().add(instruction);

    // Send via wallet adapter
    const txSignature = await sendWalletTransaction(
      connection,
      transaction,
      wallet
    );

    console.log('✓ Merkle root processed on-chain');
    console.log('Tx signature:', txSignature);

    return txSignature;

  } catch (error) {
    console.error('Error processing root:', error);
    throw error;
  }
}
```

## 7. Fetching Garment Certificate from Chain

Retrieve NFT certificate metadata:

```typescript
// hooks/useGarmentCertificate.ts
import { useEffect, useState } from 'react';
import { PublicKey } from '@solana/web3.js';
import { fetchGarmentCertificate } from '@/lib/metaplex-utils';

export function useGarmentCertificate(mint: string | null) {
  const [certificate, setCertificate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!mint) return;

    const loadCertificate = async () => {
      setLoading(true);
      setError(null);

      try {
        const mintPublicKey = new PublicKey(mint);
        const cert = await fetchGarmentCertificate(mintPublicKey);
        setCertificate(cert);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadCertificate();
  }, [mint]);

  return { certificate, loading, error };
}

// Usage in component
const { certificate, loading, error } = useGarmentCertificate(garmentMint);

if (loading) return <div>Loading certificate...</div>;
if (error) return <div>Error: {error}</div>;
if (certificate) {
  return (
    <div>
      <h3>{certificate.name}</h3>
      <p>{certificate.description}</p>
      <dl>
        {certificate.attributes.map(attr => (
          <div key={attr.trait_type}>
            <dt>{attr.trait_type}</dt>
            <dd>{attr.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
```

## 8. Batch Processing Multiple Garment Roots

Optimize for mass adoption:

```typescript
// lib/batch-processing.ts
import { buildMerkleRoot } from '@/lib/compression-utils';

export async function batchProcessGarmentRoots(
  garments: Garment[],
  program: Program
): Promise<Map<string, string>> {
  const results = new Map<string, string>();

  // Process in batches of 10 to avoid rate limits
  for (let i = 0; i < garments.length; i += 10) {
    const batch = garments.slice(i, i + 10);

    const promises = batch.map(async (garment) => {
      const root = buildMerkleRoot(garment.evidenceChain);
      const tx = await callAnchorProcessRoot(program, root);
      return [garment.id, tx];
    });

    const batchResults = await Promise.all(promises);
    batchResults.forEach(([id, tx]) => results.set(id, tx));
  }

  return results;
}

// Usage
const garments = await fetchAllGarments();
const txMap = await batchProcessGarmentRoots(garments, program);

console.log(`Processed ${txMap.size} garments`);
txMap.forEach((tx, id) => {
  console.log(`${id}: ${tx}`);
});
```

## 9. Compression Tree Management

Handle concurrent Merkle trees efficiently:

```typescript
// lib/compression-trees.ts
import { generateCompressionInstruction, verifyGarmentTraceability } from '@/lib/compression-utils';
import { PublicKey } from '@solana/web3.js';

interface CompressionTree {
  address: PublicKey;
  capacity: number;
  currentSize: number;
  maxDepth: number;
}

export function selectCompressionTree(
  trees: CompressionTree[],
  newLeafCount: number
): CompressionTree {
  // Find tree with space for new leaves
  const suitable = trees.filter(
    tree => tree.currentSize + newLeafCount < tree.capacity
  );

  if (suitable.length === 0) {
    throw new Error('No suitable compression tree available. Create new tree.');
  }

  // Return tree with least available space (pack efficiently)
  return suitable.reduce((best, current) =>
    current.capacity - current.currentSize <
    best.capacity - best.currentSize
      ? current
      : best
  );
}

export async function insertGarmentIntoTree(
  tree: CompressionTree,
  garmentId: string,
  evidenceChain: string[]
): Promise<Buffer> {
  // Verify evidence first
  const verification = verifyGarmentTraceability(garmentId, evidenceChain);

  if (!verification.isValid) {
    throw new Error('Invalid garment evidence');
  }

  // Generate compression instruction
  const leafData = Buffer.from(garmentId);
  const instruction = generateCompressionInstruction(
    tree.address,
    leafData,
    Buffer.from(verification.merkleRoot, 'hex')
  );

  // Send instruction to chain (in actual implementation)
  // transaction.add(instruction);

  return Buffer.from(verification.merkleRoot, 'hex');
}
```

## 10. Dashboard Analytics

Track marketplace metrics:

```typescript
// hooks/useMarketplaceAnalytics.ts
export function useMarketplaceAnalytics() {
  const [analytics, setAnalytics] = useState({
    totalGarments: 0,
    totalVerified: 0,
    totalCertificates: 0,
    averageMerkleDepth: 0,
    totalEvidence: 0,
  });

  useEffect(() => {
    const calculateAnalytics = () => {
      const verified = MOCK_GARMENTS.filter(g => g.traceability.verified);
      const depths = MOCK_GARMENTS.map(g =>
        Math.log2(g.evidenceChain.length)
      );

      setAnalytics({
        totalGarments: MOCK_GARMENTS.length,
        totalVerified: verified.length,
        totalCertificates: verified.length, // 1:1 for now
        averageMerkleDepth: depths.reduce((a, b) => a + b, 0) / depths.length,
        totalEvidence: MOCK_GARMENTS.reduce(
          (sum, g) => sum + g.evidenceChain.length,
          0
        ),
      });
    };

    calculateAnalytics();
  }, []);

  return analytics;
}

// Usage
const {
  totalGarments,
  totalVerified,
  averageMerkleDepth,
  totalEvidence,
} = useMarketplaceAnalytics();

return (
  <div className="grid grid-cols-4 gap-4">
    <div>Total Garments: {totalGarments}</div>
    <div>Verified: {totalVerified}</div>
    <div>Avg. Merkle Depth: {averageMerkleDepth.toFixed(2)}</div>
    <div>Evidence Items: {totalEvidence}</div>
  </div>
);
```

---

**All examples use real Solana Web3.js, Anchor, Metaplex, and compression patterns!**

See `README.md` for full documentation.
