import { NextRequest, NextResponse } from "next/server";
import { monitorPrograms } from "@/lib/monitoring/monitor";
import { sendWatchlistNotifications } from "@/lib/notifications/slack";
import { sendTelegramWatchlistNotifications } from "@/lib/notifications/telegram-user";
import { cleanupExpiredTokens } from "@/lib/telegram/connection-tokens";
import { acquireCronLock, releaseCronLock } from "@/lib/cron/lock";
import { generateUUID } from "@/lib/utils";

const MONITOR_CRON_LOCK = "monitor-idls";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", {
      status: 401,
    });
  }

  const lockRunId = generateUUID();
  const lockAcquired = await acquireCronLock(MONITOR_CRON_LOCK, lockRunId);

  if (!lockAcquired) {
    return NextResponse.json(
      {
        success: true,
        skipped: true,
        message: "IDL monitoring already in progress",
      },
      { status: 202 }
    );
  }

  try {
    // Run the monitoring process
    const result = await monitorPrograms();

    // Send Slack notifications to users based on their watchlists
    const slackResult = await sendWatchlistNotifications();

    // Send Telegram notifications to users based on their watchlists
    const telegramUserResult = await sendTelegramWatchlistNotifications();

    // Clean up expired Telegram connection tokens
    await cleanupExpiredTokens();

    console.log("Scheduled monitoring completed:", result);
    console.log("Slack notification result:", slackResult);
    console.log("Telegram user notification result:", telegramUserResult);

    return NextResponse.json({
      success: true,
      message: "IDL monitoring and notifications completed",
      result,
      notifications: {
        telegram_user: telegramUserResult,
        slack: slackResult,
      },
    });
  } finally {
    await releaseCronLock(MONITOR_CRON_LOCK, lockRunId);
  }
}
