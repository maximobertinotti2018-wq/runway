import { describe, it, expect } from "vitest";
import { normalizeMerchant } from "./normalize";

describe("normalizeMerchant", () => {
  const cases: [string, string][] = [
    ["SQ *COFFEE ROASTERS", "coffee roasters"],
    ["TST* THE DAILY GRIND", "the daily grind"],
    ["PAYPAL *SPOTIFY", "spotify"],
    ["PP*SPOTIFY", "spotify"],
    ["NETFLIX.COM", "netflix"],
    ["UBER   *EATS 8005928996", "uber eats"],
    ["SP DIGITALOCEAN.COM", "digitalocean"],
    ["POS DEBIT WHOLEFDS MKT #123", "wholefds mkt"],
    ["GOOGLE *GSUITE_ABCD12", "google gsuite"],
    ["  Starbucks Store 00123  ", "starbucks store"],
    ["", ""],
  ];

  for (const [input, expected] of cases) {
    it(`"${input}" -> "${expected}"`, () => {
      expect(normalizeMerchant(input)).toBe(expected);
    });
  }

  it("does not strip 'sp' from real names starting with sp", () => {
    expect(normalizeMerchant("Spotify")).toBe("spotify");
    expect(normalizeMerchant("Sports Authority")).toBe("sports authority");
  });

  it("is idempotent", () => {
    for (const [input] of cases) {
      const once = normalizeMerchant(input);
      expect(normalizeMerchant(once)).toBe(once);
    }
  });
});
