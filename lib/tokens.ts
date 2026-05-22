// Canonical token metadata for all known DormDAO holdings.
// Tokens without a geckoId will show "Price unavailable".
export interface TokenMeta {
  name: string;
  geckoId?: string;
}

export const TOKEN_META: Record<string, TokenMeta> = {
  AAVE:              { name: "Aave",                    geckoId: "aave" },
  AERO:              { name: "Aerodrome",               geckoId: "aerodrome-finance" },
  AGI:               { name: "AGI" },
  AIOZ:              { name: "AIOZ Network",            geckoId: "aioz-network" },
  ASTER:             { name: "Aster" },
  AVAX:              { name: "Avalanche",               geckoId: "avalanche-2" },
  AXL:               { name: "Axelar",                  geckoId: "axelar" },
  BANANA:            { name: "Banana Gun",              geckoId: "banana-gun" },
  BNB:               { name: "BNB",                     geckoId: "binancecoin" },
  CBBTC:             { name: "Coinbase Wrapped BTC",    geckoId: "coinbase-wrapped-btc" },
  CC:                { name: "CC" },
  CRV:               { name: "Curve DAO",               geckoId: "curve-dao-token" },
  DMT:               { name: "DMT" },
  ENA:               { name: "Ethena",                  geckoId: "ethena" },
  ETH:               { name: "Ethereum",                geckoId: "ethereum" },
  FET:               { name: "Fetch.ai",                geckoId: "fetch-ai" },
  FOREST:            { name: "Forest" },
  GRAIL:             { name: "Camelot",                 geckoId: "camelot-token" },
  GRASS:             { name: "Grass",                   geckoId: "grass" },
  HNT:               { name: "Helium",                  geckoId: "helium" },
  HYPE:              { name: "Hyperliquid",             geckoId: "hyperliquid" },
  "HYPERLIQUID VAULT": { name: "Hyperliquid Vault" },
  IXS:               { name: "IX Swap" },
  JLP:               { name: "Jupiter LP",              geckoId: "jupiter-perpetuals-liquidity-provider-token" },
  JTO:               { name: "Jito",                    geckoId: "jito-governance-token" },
  JUP:               { name: "Jupiter",                 geckoId: "jupiter-exchange-solana" },
  LINK:              { name: "Chainlink",               geckoId: "chainlink" },
  META:              { name: "Meta" },
  MICHICOIN:         { name: "MichiCoin" },
  MORPHO:            { name: "Morpho",                  geckoId: "morpho" },
  OLAS:              { name: "Autonolas",               geckoId: "autonolas" },
  ONDO:              { name: "Ondo Finance",            geckoId: "ondo-finance" },
  PENDLE:            { name: "Pendle",                  geckoId: "pendle" },
  PLUME:             { name: "Plume",                   geckoId: "plume-network" },
  POWR:              { name: "Power Ledger",            geckoId: "power-ledger" },
  PUMPCADE:          { name: "Pumpcade" },
  RAIL:              { name: "Railgun",                 geckoId: "railgun" },
  "REFLECT-BASE":    { name: "Reflect Base" },
  SAND:              { name: "The Sandbox",             geckoId: "the-sandbox" },
  SENT:              { name: "Sent" },
  SKL:               { name: "SKALE",                   geckoId: "skale" },
  SKY:               { name: "Sky",                     geckoId: "sky" },
  SN4:               { name: "Bittensor SN4" },
  SN9:               { name: "Bittensor SN9" },
  SN62:              { name: "Bittensor SN62" },
  SN64:              { name: "Bittensor SN64" },
  SOL:               { name: "Solana",                  geckoId: "solana" },
  SYRUP:             { name: "Maple Finance",           geckoId: "syrup" },
  TAO:               { name: "Bittensor",               geckoId: "bittensor" },
  TIBBIR:            { name: "Tibbir" },
  UMBRA:             { name: "Umbra" },
  VVAIFU:            { name: "vvaifu" },
  XPL:               { name: "XPL" },
  ZEC:               { name: "Zcash",                   geckoId: "zcash" },
  ZRO:               { name: "LayerZero",               geckoId: "layerzero" },
};

export const TICKER_TO_COINGECKO: Record<string, string> = Object.fromEntries(
  Object.entries(TOKEN_META)
    .filter(([, m]) => m.geckoId)
    .map(([t, m]) => [t, m.geckoId as string])
);
