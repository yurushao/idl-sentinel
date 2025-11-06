import { NextRequest, NextResponse } from "next/server";
import { monitorPrograms } from "@/lib/monitoring/monitor";
import { sendPendingNotifications } from "@/lib/notifications/telegram";
import { sendWatchlistNotifications } from "@/lib/notifications/slack";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", {
      status: 401,
    });
  }

  // Run the monitoring process
  const result = await monitorPrograms();

  // Send Telegram notifications for any new changes (legacy/admin notifications)
  const telegramResult = await sendPendingNotifications();

  // Send Slack notifications to users based on their watchlists
  const slackResult = await sendWatchlistNotifications();

  console.log("Scheduled monitoring completed:", result);
  console.log("Telegram notification result:", telegramResult);
  console.log("Slack notification result:", slackResult);

  return NextResponse.json({
    success: true,
    message: "IDL monitoring and notifications completed",
    result,
    notifications: {
      telegram: telegramResult,
      slack: slackResult,
    },
  });
}
