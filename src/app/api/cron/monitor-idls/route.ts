import { NextRequest, NextResponse } from "next/server";
import { monitorPrograms } from "@/lib/monitoring/monitor";
import { sendPendingNotifications } from "@/lib/notifications/telegram";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", {
      status: 401,
    });
  }

  // Run the monitoring process
  const result = await monitorPrograms();

  // Send notifications for any new changes
  const notificationResult = await sendPendingNotifications();

  console.log("Scheduled monitoring completed:", result);
  console.log("Notification result:", notificationResult);

  return NextResponse.json({
    success: true,
    message: "IDL monitoring and notifications completed",
    result,
    notifications: notificationResult,
  });
}
