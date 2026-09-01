// Schools whose "HYPERLIQUID VAULT" (or similar) holding is actually one
// depositor's slice of a shared vault, not a token with a market price.
// Keyed by internal school name (see lib/schoolData.ts SCHOOL_NAMES), then by
// the ticker on that school's holding row this applies to.
//
// The vault's total AUM is NOT what a depositor owns — a vault can have
// multiple followers (see the leader + Berkeley's own stake in "Undergrad
// Capital"), so this must be indexed to the specific depositor wallet, via
// Hyperliquid's `userVaultEquities` API (lib/hyperliquid.ts), not the vault
// address alone.
export const HYPERLIQUID_VAULT_POSITIONS: Record<
  string,
  Record<string, { vaultAddress: string; userAddress: string }>
> = {
  Berkeley: {
    "HYPERLIQUID VAULT": {
      vaultAddress: "0xd1b96a909344d7a3e670b6383f03cc4bdbd36aca",
      userAddress: "0xCd3e688eBEffca8b4B7EB979e88afd2B65210eC0",
    },
  },
};
