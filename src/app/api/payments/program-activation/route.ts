import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/middleware";
import { getProgramByAddress } from "@/lib/db/programs";
import {
  createProgramActivationPaymentIntent,
  getProgramActivationPaymentConfig,
} from "@/lib/db/payments";
import { createSolanaConnection, fetchIdlFromChain } from "@/lib/solana/idl-fetcher";
import { isValidProgramId } from "@/lib/utils";

function validateProgramActivationInput(body: unknown): {
  programId: string;
  name: string;
  description: string | null;
} {
  const input = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const programId = typeof input.program_id === "string" ? input.program_id.trim() : "";
  const name = typeof input.name === "string" ? input.name.trim() : "";
  const description =
    typeof input.description === "string" && input.description.trim().length > 0
      ? input.description.trim()
      : null;

  if (!programId) {
    throw new Error("program_id is required");
  }

  if (!isValidProgramId(programId)) {
    throw new Error("Invalid Solana program ID format");
  }

  if (!name) {
    throw new Error("Program name is required");
  }

  if (name.length < 3 || name.length > 100) {
    throw new Error("Program name must be between 3 and 100 characters");
  }

  if (description && description.length > 500) {
    throw new Error("Description must be less than 500 characters");
  }

  return { programId, name, description };
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await request.json();
    const { programId, name, description } = validateProgramActivationInput(body);

    const existingProgram = await getProgramByAddress(programId);
    if (existingProgram) {
      return NextResponse.json(
        {
          error: "Program is already monitored",
          already_monitored: true,
          program: existingProgram,
        },
        { status: 409 }
      );
    }

    const connection = createSolanaConnection();
    const idl = await fetchIdlFromChain(connection, programId);
    if (!idl) {
      return NextResponse.json(
        { error: "No Anchor IDL was found on-chain for this program" },
        { status: 404 }
      );
    }

    const payment = await createProgramActivationPaymentIntent({
      userId: user.userId,
      payerWallet: user.walletAddress,
      programAddress: programId,
      programName: name,
      description,
    });
    const config = getProgramActivationPaymentConfig();

    return NextResponse.json({
      payment_intent: {
        id: payment.id,
        amount_usdc: config.feeUsdc,
        amount_atomic: config.amountAtomic,
        decimals: config.decimals,
        usdc_mint: config.usdcMint,
        treasury_wallet: config.treasuryWallet,
        treasury_token_account: config.treasuryTokenAccount,
        payment_reference: payment.payment_reference,
        memo: `idl-sentinel:${payment.id}`,
        expires_at: payment.expires_at,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create payment intent";
    const status =
      message.includes("required") || message.includes("Invalid") || message.includes("must be")
        ? 400
        : 500;

    console.error("Error creating program activation payment intent:", error);
    return NextResponse.json({ error: message }, { status });
  }
}
