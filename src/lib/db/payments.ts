import { Keypair, PublicKey } from "@solana/web3.js";
import { supabaseAdmin, type ProgramActivationPayment } from "../supabase";

const USDC_DECIMALS = 6;
const DEFAULT_MAINNET_USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const PAYMENT_EXPIRY_MINUTES = 10;

export interface ProgramActivationPaymentConfig {
  feeUsdc: number;
  amountAtomic: number;
  decimals: number;
  usdcMint: string;
  treasuryWallet: string | null;
  treasuryTokenAccount: string;
}

export type ProgramActivationFeeQuote = Pick<
  ProgramActivationPaymentConfig,
  "feeUsdc" | "amountAtomic" | "decimals" | "usdcMint"
>;

export function getProgramActivationFeeQuote(): ProgramActivationFeeQuote {
  const feeUsdc = Number(process.env.PROGRAM_ACTIVATION_FEE_USDC || "5");
  if (!Number.isFinite(feeUsdc) || feeUsdc <= 0) {
    throw new Error("PROGRAM_ACTIVATION_FEE_USDC must be a positive number");
  }

  const usdcMint = process.env.SOLANA_USDC_MINT || DEFAULT_MAINNET_USDC_MINT;
  new PublicKey(usdcMint);

  return {
    feeUsdc,
    amountAtomic: Math.round(feeUsdc * 10 ** USDC_DECIMALS),
    decimals: USDC_DECIMALS,
    usdcMint,
  };
}

export function getProgramActivationPaymentConfig(): ProgramActivationPaymentConfig {
  const quote = getProgramActivationFeeQuote();
  const treasuryWallet = process.env.PAYMENT_TREASURY_WALLET || null;
  const treasuryTokenAccount = process.env.PAYMENT_TREASURY_USDC_ACCOUNT;

  if (!treasuryTokenAccount) {
    throw new Error("PAYMENT_TREASURY_USDC_ACCOUNT is required");
  }

  // Validate configured public keys at startup/use time so payment routes fail closed.
  new PublicKey(treasuryTokenAccount);
  if (treasuryWallet) {
    new PublicKey(treasuryWallet);
  }

  return {
    ...quote,
    treasuryWallet,
    treasuryTokenAccount,
  };
}

export async function createProgramActivationPaymentIntent(input: {
  userId: string;
  payerWallet: string;
  programAddress: string;
  programName: string;
  description?: string | null;
}): Promise<ProgramActivationPayment> {
  const config = getProgramActivationPaymentConfig();
  const expiresAt = new Date(Date.now() + PAYMENT_EXPIRY_MINUTES * 60 * 1000).toISOString();
  const paymentReference = Keypair.generate().publicKey.toBase58();

  const { data, error } = await supabaseAdmin
    .from("program_activation_payments")
    .insert({
      user_id: input.userId,
      payer_wallet: input.payerWallet,
      program_address: input.programAddress,
      program_name: input.programName,
      description: input.description || null,
      amount_usdc: config.feeUsdc,
      amount_atomic: config.amountAtomic,
      usdc_mint: config.usdcMint,
      treasury_token_account: config.treasuryTokenAccount,
      payment_reference: paymentReference,
      status: "pending",
      expires_at: expiresAt,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating program activation payment intent:", error);
    throw new Error(`Failed to create payment intent: ${error.message}`);
  }

  return data;
}

export async function getProgramActivationPaymentIntent(
  id: string
): Promise<ProgramActivationPayment | null> {
  const { data, error } = await supabaseAdmin
    .from("program_activation_payments")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    console.error("Error fetching program activation payment intent:", error);
    throw new Error(`Failed to fetch payment intent: ${error.message}`);
  }

  return data;
}

export async function markProgramActivationPaymentConfirmed(
  id: string,
  signature: string
): Promise<void> {
  const { error } = await supabaseAdmin
    .from("program_activation_payments")
    .update({
      status: "confirmed",
      payment_signature: signature,
      confirmed_at: new Date().toISOString(),
      error_message: null,
    })
    .eq("id", id);

  if (error) {
    console.error("Error confirming program activation payment:", error);
    throw new Error(`Failed to confirm payment intent: ${error.message}`);
  }
}

export async function markProgramActivationPaymentConsumed(id: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from("program_activation_payments")
    .update({
      status: "consumed",
      consumed_at: new Date().toISOString(),
      error_message: null,
    })
    .eq("id", id);

  if (error) {
    console.error("Error consuming program activation payment:", error);
    throw new Error(`Failed to consume payment intent: ${error.message}`);
  }
}

export async function markProgramActivationPaymentFailed(
  id: string,
  message: string
): Promise<void> {
  const { error } = await supabaseAdmin
    .from("program_activation_payments")
    .update({
      status: "failed",
      error_message: message,
    })
    .eq("id", id);

  if (error) {
    console.error("Error marking program activation payment failed:", error);
  }
}

export async function markProgramActivationPaymentExpired(id: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from("program_activation_payments")
    .update({
      status: "expired",
      error_message: "Payment intent expired",
    })
    .eq("id", id)
    .eq("status", "pending");

  if (error) {
    console.error("Error expiring program activation payment:", error);
  }
}
