import { supabaseAdmin } from "../supabase";

export async function addProgramToUserWatchlist(
  userId: string,
  programDbId: string
): Promise<void> {
  const { error } = await supabaseAdmin.from("user_watchlist").upsert(
    {
      user_id: userId,
      program_id: programDbId,
    },
    {
      onConflict: "user_id,program_id",
      ignoreDuplicates: true,
    }
  );

  if (error) {
    console.error("Error adding program to user watchlist:", error);
    throw new Error(`Failed to add program to watchlist: ${error.message}`);
  }
}
