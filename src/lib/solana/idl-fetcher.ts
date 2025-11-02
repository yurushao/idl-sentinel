import { Connection, PublicKey, AccountInfo } from "@solana/web3.js";
import { inflate } from "pako";
import bs58 from "bs58";

export interface IdlAccount {
  authority: PublicKey;
  data: Buffer;
}

export interface SolanaIdl {
  version: string;
  name: string;
  instructions: Array<{
    name: string;
    accounts: Array<{
      name: string;
      isMut: boolean;
      isSigner: boolean;
    }>;
    args: Array<{
      name: string;
      type: any;
    }>;
  }>;
  accounts?: Array<{
    name: string;
    type: {
      kind: string;
      fields: Array<{
        name: string;
        type: any;
      }>;
    };
  }>;
  types?: Array<{
    name: string;
    type: {
      kind: string;
      fields?: Array<{
        name: string;
        type: any;
      }>;
      variants?: Array<{
        name: string;
        fields?: Array<{
          name: string;
          type: any;
        }>;
      }>;
    };
  }>;
  errors?: Array<{
    code: number;
    name: string;
    msg: string;
  }>;
  metadata?: {
    address: string;
    [key: string]: any;
  };
}

/**
 * Derives the IDL account address for a given program
 */
export async function deriveIdlAddress(
  programId: PublicKey
): Promise<PublicKey> {
  const base = PublicKey.findProgramAddressSync([], programId)[0];
  const idlAddress = await PublicKey.createWithSeed(
    base,
    "anchor:idl",
    programId
  );

  return idlAddress;
}

/**
 * Fetches and parses IDL from a Solana program's on-chain account
 */
export async function fetchIdlFromChain(
  connection: Connection,
  programId: string,
  maxRetries: number = 3
): Promise<SolanaIdl | null> {
  const programPubkey = new PublicKey(programId);
  const idlAddress = await deriveIdlAddress(programPubkey);

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(
        `Fetching IDL for program ${programId}, attempt ${attempt}/${maxRetries}`
      );

      const accountInfo = await connection.getAccountInfo(idlAddress);

      if (!accountInfo) {
        console.log(`No IDL account found for program ${programId}`);
        return null;
      }

      // Parse the IDL account data
      const idl = parseIdlAccount(accountInfo);

      if (!idl) {
        console.log(`Failed to parse IDL for program ${programId}`);
        return null;
      }

      console.log(`Successfully fetched IDL for program ${programId}`);
      return idl;
    } catch (error) {
      lastError = error as Error;
      console.warn(
        `Attempt ${attempt} failed for program ${programId}:`,
        error
      );

      if (attempt < maxRetries) {
        // Exponential backoff
        const delay = Math.pow(2, attempt) * 1000;
        console.log(`Retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  console.error(
    `Failed to fetch IDL for program ${programId} after ${maxRetries} attempts:`,
    lastError
  );
  throw (
    lastError || new Error(`Failed to fetch IDL after ${maxRetries} attempts`)
  );
}

/**
 * Parses the IDL account data
 */
function parseIdlAccount(accountInfo: AccountInfo<Buffer>): SolanaIdl | null {
  try {
    const data = accountInfo.data;

    // Skip the first 8 bytes (discriminator)
    const idlData = data.slice(8);

    // The IDL data structure:
    // - 32 bytes: authority (PublicKey)
    // - 4 bytes: data length
    // - remaining: compressed IDL data

    if (idlData.length < 36) {
      throw new Error("IDL account data too short");
    }

    // Skip authority (32 bytes)
    const authorityBytes = idlData.slice(0, 32);

    // Read data length (4 bytes, little endian)
    const dataLengthBytes = idlData.slice(32, 36);
    const dataLength = dataLengthBytes.readUInt32LE(0);

    // Extract compressed IDL data
    const compressedData = idlData.slice(36, 36 + dataLength);

    // Decompress the IDL data
    const decompressedData = inflate(compressedData);

    // Parse JSON
    const idlString = Buffer.from(decompressedData).toString("utf8");
    const idl = JSON.parse(idlString) as SolanaIdl;

    return idl;
  } catch (error) {
    console.error("Error parsing IDL account:", error);
    return null;
  }
}

/**
 * Validates that an IDL has the expected structure
 */
export function validateIdl(idl: any): idl is SolanaIdl {
  if (!idl || typeof idl !== "object") {
    return false;
  }

  // Check required fields
  if (!idl.name || typeof idl.name !== "string") {
    return false;
  }

  if (!idl.instructions || !Array.isArray(idl.instructions)) {
    return false;
  }

  // Validate instruction structure
  for (const instruction of idl.instructions) {
    if (!instruction.name || typeof instruction.name !== "string") {
      return false;
    }
    if (!instruction.accounts || !Array.isArray(instruction.accounts)) {
      return false;
    }
    if (!instruction.args || !Array.isArray(instruction.args)) {
      return false;
    }
  }

  return true;
}

/**
 * Creates a connection to Solana RPC
 */
export function createSolanaConnection(rpcUrl?: string): Connection {
  const url =
    rpcUrl ||
    process.env.SOLANA_RPC_URL ||
    "https://api.mainnet-beta.solana.com";
  return new Connection(url, "confirmed");
}
