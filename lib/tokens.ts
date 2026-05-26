// Canonical token metadata for all known DormDAO holdings.
export interface TokenMeta {
  name: string;
  geckoId?: string;
  premarket?: boolean; // genuinely unlisted — show orange "Pre-market" badge
  subnet?: boolean;    // Bittensor subnet — show purple "Subnet" badge
  vault?: boolean;     // DeFi vault position — show blue "Vault" badge
}

export const TOKEN_META: Record<string, TokenMeta> = {
  AAVE:              { name: "Aave",                    geckoId: "aave" },
  AERO:              { name: "Aerodrome",               geckoId: "aerodrome-finance" },
  AGI:               { name: "Delysium",                geckoId: "delysium" },
  AIOZ:              { name: "AIOZ Network",            geckoId: "aioz-network" },
  ASTER:             { name: "Aster",                   geckoId: "aster-2" },
  AVAX:              { name: "Avalanche",               geckoId: "avalanche-2" },
  AXL:               { name: "Axelar",                  geckoId: "axelar" },
  BANANA:            { name: "Banana Gun",              geckoId: "banana-gun" },
  BNB:               { name: "BNB",                     geckoId: "binancecoin" },
  CBBTC:             { name: "Coinbase Wrapped BTC",    geckoId: "coinbase-wrapped-btc" },
  CC:                { name: "Canton Network",          geckoId: "canton-network" },
  CRV:               { name: "Curve DAO",               geckoId: "curve-dao-token" },
  DMT:               { name: "Dream Machine Token",     geckoId: "dream-machine-token" },
  ENA:               { name: "Ethena",                  geckoId: "ethena" },
  ETH:               { name: "Ethereum",                geckoId: "ethereum" },
  FET:               { name: "Fetch.ai",                geckoId: "fetch-ai" },
  FOREST:            { name: "Forest Protocol",         geckoId: "forest-protocol" },
  GRAIL:             { name: "Camelot",                 geckoId: "camelot-token" },
  GRASS:             { name: "Grass",                   geckoId: "grass" },
  HNT:               { name: "Helium",                  geckoId: "helium" },
  HYPE:              { name: "Hyperliquid",             geckoId: "hyperliquid" },
  "HYPERLIQUID VAULT": { name: "Hyperliquid Vault",     vault: true },
  IXS:               { name: "IX Swap",                 geckoId: "ix-swap" },
  JLP:               { name: "Jupiter LP",              geckoId: "jupiter-perpetuals-liquidity-provider-token" },
  JTO:               { name: "Jito",                    geckoId: "jito-governance-token" },
  JUP:               { name: "Jupiter",                 geckoId: "jupiter-exchange-solana" },
  LINK:              { name: "Chainlink",               geckoId: "chainlink" },
  META:              { name: "MetaDAO",                 geckoId: "meta-2-2" },
  MICHICOIN:         { name: "Michi",                   geckoId: "michi" },
  MORPHO:            { name: "Morpho",                  geckoId: "morpho" },
  OLAS:              { name: "Autonolas",               geckoId: "autonolas" },
  ONDO:              { name: "Ondo Finance",            geckoId: "ondo-finance" },
  PENDLE:            { name: "Pendle",                  geckoId: "pendle" },
  PLUME:             { name: "Plume",                   geckoId: "plume" },
  POWR:              { name: "Power Ledger",            geckoId: "power-ledger" },
  PUMPCADE:          { name: "Pumpcade",                geckoId: "pumpcade" },
  RAIL:              { name: "Railgun",                 geckoId: "railgun" },
  "REFLECT-BASE":    { name: "Reflect Base",            premarket: true },
  SAND:              { name: "The Sandbox",             geckoId: "the-sandbox" },
  SENT:              { name: "Sentient",                geckoId: "sentient" },
  SKL:               { name: "SKALE",                   geckoId: "skale" },
  SKY:               { name: "Sky",                     geckoId: "sky" },
  SN4:               { name: "Targon",                  geckoId: "targon" },
  SN9:               { name: "Iota",                    geckoId: "iota-2" },
  SN62:              { name: "Ridges",                  geckoId: "ridges-ai" },
  SN64:              { name: "Chutes",                  geckoId: "chutes" },
  SOL:               { name: "Solana",                  geckoId: "solana" },
  SYRUP:             { name: "Maple Finance",           geckoId: "syrup" },
  TAO:               { name: "Bittensor",               geckoId: "bittensor" },
  TIBBIR:            { name: "Ribbita by Virtuals",     geckoId: "ribbita-by-virtuals" },
  UMBRA:             { name: "Umbra",                   geckoId: "umbra" },
  VVAIFU:            { name: "Dasha",                   geckoId: "dasha" },
  XPL:               { name: "Plasma",                  geckoId: "plasma" },
  ZEC:               { name: "Zcash",                   geckoId: "zcash" },
  ZRO:               { name: "LayerZero",               geckoId: "layerzero" },
};

export const TICKER_TO_COINGECKO: Record<string, string> = Object.fromEntries(
  Object.entries(TOKEN_META)
    .filter(([, m]) => m.geckoId)
    .map(([t, m]) => [t, m.geckoId as string])
);
