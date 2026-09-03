// Client-supplied position fields, shared by the create and update routes.
// Rejects negative tokens/cost-basis (which would distort a school's return
// math on the public leaderboard) and non-string/oversized ticker or
// blockchain values (which would otherwise reach `.trim()` unguarded and
// throw a raw 500 instead of a clean 400).
export interface PositionFieldsInput {
  ticker?: unknown;
  blockchain?: unknown;
  tokens?: unknown;
  costBasisEth?: unknown;
  purchasePriceUsd?: unknown;
  investmentDate?: unknown;
}

const MAX_TICKER_LEN = 20;
const MAX_BLOCKCHAIN_LEN = 40;

export function validatePositionFields(body: PositionFieldsInput): string | null {
  if (body.ticker !== undefined) {
    if (typeof body.ticker !== "string" || body.ticker.trim().length === 0 || body.ticker.trim().length > MAX_TICKER_LEN) {
      return `ticker must be a non-empty string up to ${MAX_TICKER_LEN} characters`;
    }
  }
  if (body.blockchain !== undefined) {
    if (typeof body.blockchain !== "string" || body.blockchain.length > MAX_BLOCKCHAIN_LEN) {
      return `blockchain must be a string up to ${MAX_BLOCKCHAIN_LEN} characters`;
    }
  }
  if (body.tokens !== undefined) {
    if (typeof body.tokens !== "number" || !Number.isFinite(body.tokens) || body.tokens < 0) {
      return "tokens must be a non-negative number";
    }
  }
  if (body.costBasisEth !== undefined) {
    if (typeof body.costBasisEth !== "number" || !Number.isFinite(body.costBasisEth) || body.costBasisEth < 0) {
      return "costBasisEth must be a non-negative number";
    }
  }
  if (body.purchasePriceUsd !== undefined && body.purchasePriceUsd !== null) {
    if (typeof body.purchasePriceUsd !== "number" || !Number.isFinite(body.purchasePriceUsd) || body.purchasePriceUsd < 0) {
      return "purchasePriceUsd must be a non-negative number or null";
    }
  }
  if (body.investmentDate !== undefined && typeof body.investmentDate !== "string") {
    return "investmentDate must be a string";
  }
  return null;
}
