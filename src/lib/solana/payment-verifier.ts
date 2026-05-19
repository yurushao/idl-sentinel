import {
  Connection,
  PublicKey,
  type ParsedInstruction,
  type PartiallyDecodedInstruction,
} from "@solana/web3.js";
import bs58 from "bs58";

const MEMO_PROGRAM_ID = "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr";

type TransactionInstruction = ParsedInstruction | PartiallyDecodedInstruction;

interface ParsedTokenTransferInfo {
  authority?: unknown;
  destination?: unknown;
  mint?: unknown;
  amount?: unknown;
  tokenAmount?: {
    amount?: unknown;
  };
}

export interface ProgramActivationPaymentVerification {
  signature: string;
  payerWallet: string;
  amountAtomic: number;
  usdcMint: string;
  treasuryTokenAccount: string;
  paymentReference: string;
  paymentIntentId: string;
}

export async function verifyProgramActivationPayment(
  connection: Connection,
  params: ProgramActivationPaymentVerification
): Promise<{ ok: true } | { ok: false; error: string }> {
  let transaction;
  try {
    transaction = await connection.getParsedTransaction(params.signature, {
      commitment: "confirmed",
      maxSupportedTransactionVersion: 0,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown RPC error";
    return { ok: false, error: `Unable to fetch payment transaction: ${message}` };
  }

  if (!transaction) {
    return { ok: false, error: "Payment transaction was not found or is not confirmed yet" };
  }

  if (transaction.meta?.err) {
    return { ok: false, error: "Payment transaction failed on-chain" };
  }

  const payerSigned = transaction.transaction.message.accountKeys.some(
    (account) => account.pubkey.toBase58() === params.payerWallet && account.signer
  );

  if (!payerSigned) {
    return { ok: false, error: "Payment transaction was not signed by the authenticated wallet" };
  }

  const instructions = transaction.transaction.message.instructions as TransactionInstruction[];

  const hasMatchingTransfer = instructions.some((instruction) =>
    isMatchingUsdcTransfer(instruction, params)
  );

  if (!hasMatchingTransfer) {
    return {
      ok: false,
      error: `Payment transaction must transfer exactly ${params.amountAtomic} base units of USDC to the configured treasury account`,
    };
  }

  const hasMatchingMemo = instructions.some((instruction) =>
    isMatchingPaymentMemo(instruction, params.paymentIntentId, params.paymentReference)
  );

  if (!hasMatchingMemo) {
    return { ok: false, error: "Payment transaction is missing the payment intent memo/reference" };
  }

  return { ok: true };
}

function isMatchingUsdcTransfer(
  instruction: TransactionInstruction,
  params: ProgramActivationPaymentVerification
): boolean {
  if (!("parsed" in instruction) || typeof instruction.parsed !== "object") {
    return false;
  }

  const parsed = instruction.parsed as {
    type?: string;
    info?: ParsedTokenTransferInfo;
  };

  if (parsed.type !== "transferChecked" && parsed.type !== "transfer") {
    return false;
  }

  const info = parsed.info;
  if (!info) {
    return false;
  }

  const rawAmount = info.tokenAmount?.amount ?? info.amount;

  return (
    String(info.authority) === params.payerWallet &&
    String(info.destination) === params.treasuryTokenAccount &&
    String(info.mint) === params.usdcMint &&
    String(rawAmount) === String(params.amountAtomic)
  );
}

function isMatchingPaymentMemo(
  instruction: TransactionInstruction,
  paymentIntentId: string,
  paymentReference: string
): boolean {
  const programId = getInstructionProgramId(instruction);
  if (programId !== MEMO_PROGRAM_ID) {
    return false;
  }

  const memoText = getMemoText(instruction);
  if (!memoText.includes(paymentIntentId)) {
    return false;
  }

  const accounts = getInstructionAccounts(instruction);
  if (accounts.length === 0) {
    return true;
  }

  return accounts.includes(paymentReference);
}

function getInstructionProgramId(instruction: TransactionInstruction): string {
  const programId = instruction.programId;
  return typeof programId === "string" ? programId : programId.toBase58();
}

function getInstructionAccounts(instruction: TransactionInstruction): string[] {
  if (!("accounts" in instruction) || !instruction.accounts) {
    return [];
  }

  return instruction.accounts.map((account: PublicKey | string) =>
    typeof account === "string" ? account : account.toBase58()
  );
}

function getMemoText(instruction: TransactionInstruction): string {
  if ("parsed" in instruction) {
    if (typeof instruction.parsed === "string") {
      return instruction.parsed;
    }

    if (typeof instruction.parsed === "object" && instruction.parsed !== null) {
      const parsed = instruction.parsed as Record<string, unknown>;
      if (typeof parsed.memo === "string") {
        return parsed.memo;
      }
    }
  }

  if ("data" in instruction && typeof instruction.data === "string") {
    try {
      return Buffer.from(bs58.decode(instruction.data)).toString("utf8");
    } catch {
      return "";
    }
  }

  return "";
}
