/**
 * Labeled merchant → category dataset for the alias-matching eval
 * (eval.test.ts). Raw descriptors are realistic bank/card export noise, run
 * through the same normalizeMerchant() the real import pipeline uses —
 * exercising alias matching exactly as it runs in production, not on
 * pre-cleaned brand names.
 *
 * expectedSlug: null means the alias layer should correctly find nothing —
 * these are long-tail merchants that only the embedding fallback (untestable
 * offline — see eval.test.ts) can resolve. A null case that starts matching
 * something is as much a regression as a wrong slug: it's exactly how the
 * historical bug here happened (a "Uber" keyword in Transport's category
 * text pulled "uber eats" away from Food & Dining on lexical overlap).
 */
export interface EvalCase {
  raw: string;
  expectedSlug: string | null;
  note?: string;
}

export const EVAL_DATASET: EvalCase[] = [
  // Food & Dining
  { raw: "SQ *COFFEE ROASTERS", expectedSlug: "food_dining" },
  { raw: "UBER *EATS 8005928996", expectedSlug: "food_dining", note: "the historical uber/uber-eats regression" },
  { raw: "UBER EATS ORDER #4471", expectedSlug: "food_dining", note: "the historical uber/uber-eats regression" },
  { raw: "DOORDASH*ORDER 4471", expectedSlug: "food_dining" },
  { raw: "GRUBHUB HOLDINGS", expectedSlug: "food_dining" },
  { raw: "STARBUCKS STORE 05128", expectedSlug: "food_dining" },
  { raw: "DAILY GRIND CAFE", expectedSlug: "food_dining" },
  { raw: "BLUE BOTTLE COFFEE", expectedSlug: "food_dining" },
  { raw: "PORTLAND ROASTERS LLC", expectedSlug: "food_dining" },

  // Groceries
  { raw: "WHOLEFDS MKT #10234", expectedSlug: "groceries" },
  { raw: "TRADER JOE'S #421", expectedSlug: "groceries" },
  { raw: "KROGER #0512 FUEL", expectedSlug: "groceries" },
  { raw: "SAFEWAY STORE 1872", expectedSlug: "groceries" },
  { raw: "COSTCO WHSE #0123 SEATTLE WA", expectedSlug: "groceries" },

  // Dev Tools & Hosting
  { raw: "DIGITALOCEAN.COM", expectedSlug: "dev_tools_hosting" },
  { raw: "AMAZON WEB SERVICES", expectedSlug: "dev_tools_hosting" },
  { raw: "VERCEL INC", expectedSlug: "dev_tools_hosting" },
  { raw: "NETLIFY INC", expectedSlug: "dev_tools_hosting" },
  { raw: "HEROKU HTTPS://HEROKU.COM", expectedSlug: "dev_tools_hosting" },
  { raw: "GITHUB, INC.", expectedSlug: "dev_tools_hosting" },

  // AI Tools
  { raw: "OPENAI *CHATGPT SUBSCR", expectedSlug: "ai_tools" },
  { raw: "ANTHROPIC", expectedSlug: "ai_tools" },

  // Entertainment
  { raw: "NETFLIX.COM", expectedSlug: "entertainment" },
  { raw: "PAYPAL *SPOTIFY", expectedSlug: "entertainment" },
  { raw: "HULU 855-720-4858", expectedSlug: "entertainment" },
  { raw: "DISNEY PLUS", expectedSlug: "entertainment" },

  // Transport
  { raw: "UBER TRIP HELP.UBER.COM", expectedSlug: "transport" },
  { raw: "LYFT *RIDE THU 3PM", expectedSlug: "transport" },

  // Travel
  { raw: "AIRBNB * HMABC123", expectedSlug: "travel" },

  // Hardware
  { raw: "APPLE STORE #R234", expectedSlug: "hardware" },
  { raw: "BEST BUY 00012345", expectedSlug: "hardware" },

  // Long tail — correctly unresolved by aliases, deferred to the embedding
  // fallback (or a user rule, in practice).
  { raw: "AMZN MKTP US*2X4Y11", expectedSlug: null, note: "genuinely ambiguous without item-level data" },
  { raw: "FIGMA INC", expectedSlug: null },
  { raw: "NOTION LABS INC", expectedSlug: null },
  { raw: "ZOOM.US 888-799-9666", expectedSlug: null },
  { raw: "SLACK TECHNOLOGIES", expectedSlug: null },
  { raw: "VENMO PAYMENT JOHN DOE", expectedSlug: null },
  { raw: "CHECK #1042", expectedSlug: null },
  { raw: "ATM WITHDRAWAL", expectedSlug: null },
  { raw: "WIRE TRANSFER FEE", expectedSlug: null },
  { raw: "IRS USATAXPYMT", expectedSlug: null },
  { raw: "CITY OF SEATTLE UTIL", expectedSlug: null },
];
