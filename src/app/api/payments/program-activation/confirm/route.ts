import { NextRequest, NextResponse } from "next/server";
import bs58 from "bs58";
import { getAuthUser } from "@/lib/auth/middleware";
import { createProgram, getProgramByAddress } from "@/lib/db/programs";
import {
  getProgramActivationPaymentIntent,
  markProgramActivationPaymentConfirmed,
  markProgramActivationPaymentConsumed,
  markProgramActivationPaymentExpired,
} from "@/lib/db/payments";
import { addProgramToUserWatchlist } from "@/lib/db/watchlist";
import { fetchInitialIdl } from "@/lib/monitoring/monitor";
import { createSolanaConnection } from "@/lib/solana/idl-fetcher";
import { verifyProgramActivationPayment } from "@/lib/solana/payment-verifier";

function isLikelyTransactionSignature(signature: string): boolean {
  try {
    const decoded = bs58.decode(signature);
    return decoded.length === 64;
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  let paymentIntentId: string | null = null;

  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await request.json();
    paymentIntentId = typeof body.payment_intent_id === "string" ? body.payment_intent_id : null;
    const signature = typeof body.signature === "string" ? body.signature.trim() : "";

    if (!paymentIntentId) {
      return NextResponse.json({ error: "payment_intent_id is required" }, { status: 400 });
    }

    if (!signature || !isLikelyTransactionSignature(signature)) {
      return NextResponse.json(
        { error: "A valid Solana transaction signature is required" },
        { status: 400 }
      );
    }

    const payment = await getProgramActivationPaymentIntent(paymentIntentId);
    if (!payment) {
      return NextResponse.json({ error: "Payment intent not found" }, { status: 404 });
    }

    if (payment.user_id !== user.userId || payment.payer_wallet !== user.walletAddress) {
      return NextResponse.json(
        { error: "Payment intent does not belong to the authenticated wallet" },
        { status: 403 }
      );
    }

    if (payment.status === "consumed") {
      const existingProgram = await getProgramByAddress(payment.program_address);
      return NextResponse.json({
        program: existingProgram,
        payment_status: payment.status,
        already_consumed: true,
      });
    }

    if (payment.status !== "pending" && payment.status !== "confirmed") {
      return NextResponse.json({ error: `Payment intent is ${payment.status}` }, { status: 409 });
    }

    if (payment.status === "pending" && new Date(payment.expires_at).getTime() < Date.now()) {
      await markProgramActivationPaymentExpired(payment.id);
      return NextResponse.json(
        { error: "Payment intent expired. Please create a new payment." },
        { status: 410 }
      );
    }

    if (payment.status === "pending") {
      const connection = createSolanaConnection();
      const verification = await verifyProgramActivationPayment(connection, {
        signature,
        payerWallet: payment.payer_wallet,
        amountAtomic: Number(payment.amount_atomic),
        usdcMint: payment.usdc_mint,
        treasuryTokenAccount: payment.treasury_token_account,
        paymentReference: payment.payment_reference,
        paymentIntentId: payment.id,
      });

      if (!verification.ok) {
        return NextResponse.json({ error: verification.error }, { status: 400 });
      }

      await markProgramActivationPaymentConfirmed(payment.id, signature);
    } else if (payment.payment_signature && payment.payment_signature !== signature) {
      return NextResponse.json(
        { error: "Signature does not match the confirmed payment intent" },
        { status: 409 }
      );
    }

    const existingProgram = await getProgramByAddress(payment.program_address);
    if (existingProgram) {
      await addProgramToUserWatchlist(user.userId, existingProgram.id);
      await markProgramActivationPaymentConsumed(payment.id);

      return NextResponse.json({
        program: existingProgram,
        already_monitored: true,
        watchlist_added: true,
        payment_status: "consumed",
      });
    }

    const program = await createProgram(
      payment.program_address,
      payment.program_name,
      user.userId,
      payment.description || undefined
    );

    const idlFetch = await fetchInitialIdl(program);
    await addProgramToUserWatchlist(user.userId, program.id);
    await markProgramActivationPaymentConsumed(payment.id);

    return NextResponse.json(
      {
        program,
        idl_fetch: {
          attempted: true,
          success: idlFetch.success,
          snapshot_created: idlFetch.snapshotCreated,
          idl_found: idlFetch.idlFound,
          error: idlFetch.error || null,
        },
        watchlist_added: true,
        payment_status: "consumed",
      },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to confirm payment";
    console.error("Error confirming program activation payment:", error);

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
