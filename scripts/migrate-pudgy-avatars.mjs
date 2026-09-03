import dotenv from "dotenv";
dotenv.config({ path: "/Users/carsenluna/dormdao-dashboard/.env.local" });
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs/promises";
import path from "node:path";

const OUT_DIR = "/private/tmp/claude-501/-Users-carsenluna-dormdao-dashboard/d55354ce-b9c8-403e-8fe8-fa569786f808/scratchpad/pudgy-avatars";
const BUCKET = "pudgy-avatars";
const IPFS_BASE = "https://ipfs.io/ipfs/QmNf1UsmdGaMbpatQ6toXSkzDpizaGmC9zfunCyoz1enD5/penguin";

const PUDGY_IDS = [
     0,  30,  59,  89, 119, 149, 178, 208, 238, 267,
   297, 327, 356, 386, 416, 446, 475, 505, 535, 564,
   594, 624, 653, 683, 713, 743, 772, 802, 832, 861,
   891, 921, 950, 980,1010,1040,1069,1099,1129,1158,
  1188,1218,1247,1277,1307,1337,1366,1396,1426,1455,
  1485,1515,1544,1574,1604,1634,1663,1693,1723,1752,
  1782,1812,1841,1871,1901,1931,1960,1990,2020,2049,
  2079,2109,2138,2168,2198,2228,2257,2287,2317,2346,
  2376,2406,2435,2465,2495,2525,2554,2584,2614,2643,
  2673,2703,2732,2762,2792,2822,2851,2881,2911,2940,
  2970,3000,3029,3059,3089,3119,3148,3178,3208,3237,
  3267,3297,3326,3356,3386,3416,3445,3475,3505,3534,
  3564,3594,3623,3653,3683,3713,3742,3772,3802,3831,
  3861,3891,3920,3950,3980,4010,4039,4069,4099,4128,
  4158,4188,4217,4247,4277,4307,4336,4366,4396,4425,
  4455,4485,4514,4544,4574,4604,4633,4663,4693,4722,
  4752,4782,4811,4841,4871,4901,4930,4960,4990,5019,
  5049,5079,5108,5138,5168,5198,5227,5257,5287,5316,
  5346,5376,5405,5435,5465,5495,5524,5554,5584,5613,
  5643,5673,5702,5732,5762,5792,5821,5851,5881,5910,
  5940,5970,5999,6029,6059,6089,6118,6148,6178,6207,
  6237,6267,6296,6326,6356,6386,6415,6445,6475,6504,
  6534,6564,6593,6623,6653,6683,6712,6742,6772,6801,
  6831,6861,6890,6920,6950,6980,7009,7039,7069,7098,
  7128,7158,7187,7217,7247,7277,7306,7336,7366,7395,
  7425,7455,7484,7514,7544,7574,7603,7633,7663,7692,
  7722,7752,7781,7811,7841,7871,7900,7930,7960,7989,
  8019,8049,8078,8108,8138,8168,8197,8227,8257,8286,
  8316,8346,8375,8405,8435,8465,8494,8524,8554,8583,
  8613,8643,8672,8702,8732,8762,8791,8821,8851,8880,
];

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function withConcurrency(items, limit, fn) {
  const results = [];
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      results[idx] = await fn(items[idx], idx);
    }
  }
  await Promise.all(Array.from({ length: limit }, worker));
  return results;
}

async function downloadOne(id) {
  const url = `${IPFS_BASE}/${id}.png`;
  const dest = path.join(OUT_DIR, `${id}.png`);
  try {
    await fs.access(dest);
    return { id, status: "cached" };
  } catch {}
  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
      if (res.status === 429) {
        const retryAfter = Number(res.headers.get("retry-after")) || 3;
        await new Promise((r) => setTimeout(r, retryAfter * 1000));
        continue;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      await fs.writeFile(dest, buf);
      return { id, status: "downloaded", bytes: buf.length };
    } catch (err) {
      if (attempt === 5) return { id, status: "failed", error: String(err) };
      await new Promise((r) => setTimeout(r, 1500));
    }
  }
  return { id, status: "failed", error: "rate-limited after retries" };
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });

  console.log(`Downloading ${PUDGY_IDS.length} images from ipfs.io...`);
  const downloadResults = await withConcurrency(PUDGY_IDS, 2, downloadOne);
  const failed = downloadResults.filter((r) => r.status === "failed");
  const ok = downloadResults.filter((r) => r.status !== "failed");
  console.log(`Downloaded/cached: ${ok.length}, failed: ${failed.length}`);
  if (failed.length) console.log("Failed IDs:", failed.map((f) => f.id));

  console.log(`\nEnsuring bucket "${BUCKET}" exists (public)...`);
  const { error: bucketErr } = await supabase.storage.createBucket(BUCKET, { public: true });
  if (bucketErr && !bucketErr.message.toLowerCase().includes("already")) {
    console.error("Bucket create error:", bucketErr.message);
    process.exit(1);
  }

  console.log(`Uploading ${PUDGY_IDS.length} images to Supabase Storage...`);
  const uploadResults = await withConcurrency(PUDGY_IDS, 2, async (id) => {
    const filePath = path.join(OUT_DIR, `${id}.png`);
    let buf;
    try {
      buf = await fs.readFile(filePath);
    } catch {
      return { id, status: "no-local-file" };
    }
    for (let attempt = 0; attempt < 5; attempt++) {
      const { error } = await supabase.storage.from(BUCKET).upload(`${id}.png`, buf, {
        contentType: "image/png",
        upsert: true,
      });
      if (!error) return { id, status: "uploaded" };
      if (attempt === 4) return { id, status: "upload-failed", error: error.message };
      await new Promise((r) => setTimeout(r, 1500));
    }
  });

  const uploadFailed = uploadResults.filter((r) => r.status !== "uploaded");
  console.log(`Uploaded: ${uploadResults.length - uploadFailed.length}, failed: ${uploadFailed.length}`);
  if (uploadFailed.length) console.log("Upload failures:", uploadFailed);

  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl("0.png");
  console.log("\nSample public URL:", pub.publicUrl);
}

main();
