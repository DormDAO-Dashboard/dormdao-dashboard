// Usage: node scripts/upload-pitches.js ./pitches
// Reads PDFs recursively, uploads to Supabase Storage, indexes in token_documents.

const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = "token-documents";

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

// ── Path parsing ─────────────────────────────────────────────────────────────

function parseSchool(schoolFolder) {
  return schoolFolder.replace(/\s+Pitches\s+\[Public\]/i, "").trim();
}

function parseTokenFolder(tokenFolder) {
  // Date: "(MM.DD.YYYY)" or "(M.D.YYYY)"
  const dateMatch = tokenFolder.match(/\((\d{1,2})\.(\d{1,2})\.(\d{4})\)/);
  const docDate = dateMatch
    ? `${dateMatch[3]}-${String(dateMatch[1]).padStart(2, "0")}-${String(dateMatch[2]).padStart(2, "0")}`
    : null;

  // 1. Standard: $TICKER — e.g. "Oregon_ Hyperliquid, $HYPE (11.15.2024)"
  const dollarMatch = tokenFolder.match(/\$([A-Z0-9]+)/i);
  if (dollarMatch) {
    const ticker = dollarMatch[1].toUpperCase();
    const nameMatch = tokenFolder.match(/_\s+(.+?),\s*\$/);
    const tokenName = nameMatch ? nameMatch[1].trim() : null;
    return { ticker, tokenName, docDate };
  }

  // Strip date parenthetical for remaining parsing
  const withoutDate = tokenFolder.replace(/\s*\(\d{1,2}\.\d{1,2}\.\d{4}\)/, "").trim();

  // 2. Comma fallback: "Name, TICKER" where ticker is the last word after the last comma
  //    Handles: "Lifinity, LFNTY", "Friend.tech, KEYS", "IX Swap, IXS", "Balance DAO, BAI"
  const lastCommaIdx = withoutDate.lastIndexOf(",");
  if (lastCommaIdx !== -1) {
    const afterComma = withoutDate.slice(lastCommaIdx + 1).trim();
    // Take the last whitespace-separated token, strip non-alphanumeric chars
    const candidate = afterComma.split(/\s+/).pop()?.replace(/[^A-Z0-9]/gi, "").toUpperCase() ?? "";
    if (candidate.length >= 2 && candidate.length <= 12 && /^[A-Z]/.test(candidate)) {
      const nameMatch = withoutDate.match(/_\s+(.+?),/);
      const tokenName = nameMatch ? nameMatch[1].trim() : null;
      return { ticker: candidate, tokenName, docDate };
    }
  }

  // 3. Derive ticker from first meaningful word of the token name
  //    Handles NFTs and compound names: "Hyperliquid Vault Strategy", "Milady & DMT", "Imaginary Ones (NFT)"
  const namePart = withoutDate
    .replace(/^[^_]+_\s*/, "")       // strip "School_ " prefix
    .replace(/^\[[^\]]+\]\s*/, "")   // strip "[Sell] " etc.
    .replace(/\(.*?\)/g, "")         // strip (NFT), (Moonbirds & LilNouns)
    .replace(/,.*$/, "")             // strip trailing ", ..." after name
    .trim();
  const firstWord = namePart.split(/[\s&.]+/)[0]?.replace(/[^A-Z0-9]/gi, "").toUpperCase() ?? "";
  const ticker = firstWord.length >= 2 ? firstWord.slice(0, 10) : null;
  const tokenName = namePart || null;

  return { ticker, tokenName, docDate };
}

function docTypeLabel(type) {
  if (type === "pitch_deck") return "Pitch Deck";
  if (type === "exec_summary") return "Executive Summary";
  return "Fund Report";
}

function getDocType(filename) {
  const f = filename.toLowerCase();
  if (f.includes("pitch deck") || f.includes("pitchdeck")) return "pitch_deck";
  if (f.includes("executive summary")) return "exec_summary";
  if (f.includes("fundamental report")) return "report";
  if (f.includes("fund report")) return "report";
  if (f.includes("investment report")) return "report";
  if (f.includes("investment proposal")) return "report";
  return "report";
}

// ── File walker ───────────────────────────────────────────────────────────────

function walkPdfs(dir, results = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkPdfs(full, results);
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".pdf")) {
      results.push(full);
    }
  }
  return results;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const inputDir = process.argv[2];
  if (!inputDir) {
    console.error("Usage: node scripts/upload-pitches.js <path-to-pitches-folder>");
    process.exit(1);
  }

  const resolvedDir = path.resolve(inputDir);
  if (!fs.existsSync(resolvedDir)) {
    console.error(`Directory not found: ${resolvedDir}`);
    process.exit(1);
  }

  console.log(`Scanning ${resolvedDir}…`);
  const allPdfs = walkPdfs(resolvedDir);
  const total = allPdfs.length;
  console.log(`Found ${total} PDF(s)\n`);

  // Pre-fetch all existing file_urls to avoid duplicate inserts
  const { data: existingRows, error: fetchErr } = await supabase
    .from("token_documents")
    .select("file_url");
  if (fetchErr) {
    console.error("Failed to fetch existing token_documents:", fetchErr.message);
    process.exit(1);
  }
  const existingUrls = new Set((existingRows ?? []).map((r) => r.file_url));
  console.log(`${existingUrls.size} existing record(s) in token_documents\n`);

  let uploaded = 0;
  let skipped = 0;
  let errors = 0;

  for (let i = 0; i < allPdfs.length; i++) {
    const absPath = allPdfs[i];
    const relPath = path.relative(resolvedDir, absPath);
    const parts = relPath.split(path.sep);

    console.log(`Processing ${i + 1}/${total}: ${relPath}`);

    if (parts.length < 3) {
      console.error(`  ✗ Unexpected path depth — skipping`);
      errors++;
      continue;
    }

    const [schoolFolder, tokenFolder, filename] = parts;

    const school = parseSchool(schoolFolder);
    const { ticker, tokenName, docDate } = parseTokenFolder(tokenFolder);
    const docType = getDocType(filename);

    if (!ticker) {
      console.error(`  ✗ Could not parse ticker from: ${tokenFolder}`);
      errors++;
      continue;
    }

    // Storage path: sanitize school + filename (keep .pdf extension intact)
    const safeSchool = school.replace(/[^a-zA-Z0-9_-]/g, "_");
    const safeFilename = filename
      .replace(/\.pdf$/i, "")
      .replace(/[^a-zA-Z0-9_\-. ]/g, "_")
      .trim() + ".pdf";
    const storagePath = `${safeSchool}/${ticker}/${safeFilename}`;

    // Public URL is deterministic — compute before upload
    const { data: { publicUrl } } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(storagePath);

    // Skip if already indexed in DB
    if (existingUrls.has(publicUrl)) {
      console.log(`  → Skipped (already in DB)`);
      skipped++;
      continue;
    }

    // Upload to storage
    const fileBuffer = fs.readFileSync(absPath);
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, fileBuffer, {
        contentType: "application/pdf",
        upsert: false,
      });

    if (uploadError) {
      const alreadyExists =
        uploadError.message?.toLowerCase().includes("already exists") ||
        uploadError.message?.toLowerCase().includes("duplicate") ||
        String(uploadError.statusCode) === "409";

      if (!alreadyExists) {
        console.error(`  ✗ Upload failed: ${uploadError.message}`);
        errors++;
        continue;
      }
      // File exists in storage but not DB — fall through to insert
      console.log(`  → File already in storage, indexing in DB`);
    }

    // Insert DB row
    const { error: insertError } = await supabase.from("token_documents").insert({
      token_ticker: ticker,
      title: tokenName ? `${tokenName} — ${docTypeLabel(docType)}` : filename.replace(/\.pdf$/i, ""),
      school,
      document_date: docDate,
      file_url: publicUrl,
      document_type: docType,
    });

    if (insertError) {
      console.error(`  ✗ DB insert failed: ${insertError.message}`);
      errors++;
      continue;
    }

    existingUrls.add(publicUrl);
    console.log(`  ✓ Done — ${school} / $${ticker} / ${docType}`);
    uploaded++;
  }

  console.log("\n─────────────────────────────────");
  console.log(`✓ Uploaded : ${uploaded}`);
  console.log(`→ Skipped  : ${skipped}`);
  console.log(`✗ Errors   : ${errors}`);
  console.log(`  Total    : ${total}`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
