// One-time data migration: rewrites any profiles.avatar_url still pointing
// at the old ipfs.io gateway to the new self-hosted Supabase Storage URL for
// the same penguin id, so already-saved avatars pick up the fix too — not
// just future picker selections. See scripts/migrate-pudgy-avatars.mjs
// (image upload) and lib/penguins.ts (new URL scheme).
import dotenv from "dotenv";
dotenv.config({ path: "/Users/carsenluna/dormdao-dashboard/.env.local" });
import { createClient } from "@supabase/supabase-js";

const OLD_PREFIX = "https://ipfs.io/ipfs/QmNf1UsmdGaMbpatQ6toXSkzDpizaGmC9zfunCyoz1enD5/penguin/";
const NEW_BASE = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/pudgy-avatars`;

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, avatar_url")
    .like("avatar_url", `${OLD_PREFIX}%`);

  if (error) {
    console.error("Query error:", error.message);
    process.exit(1);
  }

  console.log(`Found ${profiles.length} profile(s) with an ipfs.io avatar_url.`);

  for (const p of profiles) {
    const file = p.avatar_url.slice(OLD_PREFIX.length); // "<id>.png"
    const newUrl = `${NEW_BASE}/${file}`;
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ avatar_url: newUrl })
      .eq("id", p.id);
    if (updateError) {
      console.error(`Failed to update profile ${p.id}:`, updateError.message);
    } else {
      console.log(`Updated ${p.id}: ${p.avatar_url} -> ${newUrl}`);
    }
  }

  console.log("Done.");
}

main();
