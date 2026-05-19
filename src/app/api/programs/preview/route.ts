import { NextRequest, NextResponse } from "next/server";
import { getProgramByAddress } from "@/lib/db/programs";
import { getProgramActivationFeeQuote } from "@/lib/db/payments";
import {
  createSolanaConnection,
  fetchIdlFromChain,
  type SolanaIdl,
} from "@/lib/solana/idl-fetcher";
import { isValidProgramId } from "@/lib/utils";

function summarizeIdl(idl: SolanaIdl) {
  return {
    name: idl.name || idl.metadata?.name || null,
    version: idl.version || idl.metadata?.version || null,
    instructions: idl.instructions?.length || 0,
    accounts: idl.accounts?.length || 0,
    types: idl.types?.length || 0,
    errors: idl.errors?.length || 0,
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const programId = typeof body.program_id === "string" ? body.program_id.trim() : "";

    if (!programId) {
      return NextResponse.json({ error: "program_id is required" }, { status: 400 });
    }

    if (!isValidProgramId(programId)) {
      return NextResponse.json({ error: "Invalid Solana program ID format" }, { status: 400 });
    }

    const existingProgram = await getProgramByAddress(programId);
    if (existingProgram) {
      return NextResponse.json({
        already_monitored: true,
        idl_found: true,
        payment_required: false,
        program: existingProgram,
      });
    }

    const connection = createSolanaConnection();
    const idl = await fetchIdlFromChain(connection, programId);

    if (!idl) {
      return NextResponse.json(
        {
          already_monitored: false,
          idl_found: false,
          payment_required: false,
          error: "No Anchor IDL was found on-chain for this program",
        },
        { status: 404 }
      );
    }

    const paymentConfig = getProgramActivationFeeQuote();

    return NextResponse.json({
      already_monitored: false,
      idl_found: true,
      payment_required: true,
      idl_summary: summarizeIdl(idl),
      activation_fee: {
        amount_usdc: paymentConfig.feeUsdc,
        amount_atomic: paymentConfig.amountAtomic,
        decimals: paymentConfig.decimals,
        usdc_mint: paymentConfig.usdcMint,
      },
    });
  } catch (error) {
    console.error("Error previewing program activation:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to preview program" },
      { status: 500 }
    );
  }
}
