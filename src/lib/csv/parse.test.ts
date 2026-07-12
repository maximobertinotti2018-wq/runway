import { describe, it, expect } from "vitest";
import { parseAmount } from "./amount";
import { parseDate } from "./date";
import { parseCsv, detectColumns } from "./parse";

describe("parseAmount", () => {
  it("parses common money formats", () => {
    expect(parseAmount("$1,234.56")).toBe(1234.56);
    expect(parseAmount("(12.34)")).toBe(-12.34);
    expect(parseAmount("-9.99")).toBe(-9.99);
    expect(parseAmount("9.99")).toBe(9.99);
    expect(parseAmount("USD 15.00")).toBe(15);
    expect(parseAmount(42)).toBe(42);
  });
  it("rejects junk", () => {
    expect(parseAmount("")).toBeNull();
    expect(parseAmount("abc")).toBeNull();
    expect(parseAmount(null)).toBeNull();
    expect(parseAmount(undefined)).toBeNull();
  });
});

describe("parseDate", () => {
  it("parses ISO and US formats to ISO", () => {
    expect(parseDate("2024-01-02")).toBe("2024-01-02");
    expect(parseDate("01/02/2024")).toBe("2024-01-02");
    expect(parseDate("1/2/24")).toBe("2024-01-02");
  });
  it("rejects invalid", () => {
    expect(parseDate("13/40/2024")).toBeNull();
    expect(parseDate("hello")).toBeNull();
    expect(parseDate("")).toBeNull();
  });
});

describe("detectColumns", () => {
  it("maps standard headers", () => {
    expect(detectColumns(["Date", "Description", "Amount"])).toEqual({
      date: "Date",
      description: "Description",
      amount: "Amount",
    });
  });
  it("maps alternate bank headers", () => {
    expect(detectColumns(["Posted Date", "Payee", "Debit"])).toEqual({
      date: "Posted Date",
      description: "Payee",
      amount: "Debit",
    });
  });
  it("returns null when a column is missing", () => {
    expect(detectColumns(["Date", "Notes"])).toBeNull();
  });
});

describe("parseCsv", () => {
  it("parses valid rows and reports bad ones", () => {
    const csv = [
      "Date,Description,Amount",
      "2024-01-02,SQ *COFFEE ROASTERS,-4.50",
      "01/03/2024,NETFLIX.COM,15.99",
      ",BAD ROW,10.00",
    ].join("\n");

    const { rows, errors } = parseCsv(csv);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({
      occurredOn: "2024-01-02",
      description: "SQ *COFFEE ROASTERS",
      amount: -4.5,
    });
    expect(rows[1].occurredOn).toBe("2024-01-03");
    expect(errors.some((e) => e.includes("bad date"))).toBe(true);
  });

  it("works with alternate headers via auto-detection", () => {
    const csv = ["Posted Date,Payee,Debit", "01/05/2024,UBER *EATS,20.00"].join("\n");
    const { rows, errors } = parseCsv(csv);
    expect(errors).toHaveLength(0);
    expect(rows).toEqual([{ occurredOn: "2024-01-05", description: "UBER *EATS", amount: 20 }]);
  });
});
