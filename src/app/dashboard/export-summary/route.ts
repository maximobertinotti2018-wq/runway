import PDFDocument from "pdfkit";
import { createClient } from "@/lib/supabase/server";
import { getDashboardData } from "../data";
import { aggregateSpend } from "@/lib/dashboard/aggregate";
import { foldTopCategories, type CategorySpend } from "@/lib/dashboard/spend";
import { computeRunway, type RunwayResult } from "@/lib/dashboard/runway";
import { detectSubscriptions, type DetectedSubscription } from "@/lib/subscriptions/detect";

const BAR_HUE = "#008300";
const STATUS_HEX: Record<RunwayResult["status"], string> = {
  good: "#0ca30c",
  warning: "#fab219",
  critical: "#d03b3b",
};

/**
 * A generated-numbers report (burn rate, runway, detected subscriptions),
 * not a screenshot — reuses the same pure aggregation/detection functions
 * DashboardClient renders on screen (via the shared getDashboardData query),
 * so the PDF can never drift from what the dashboard shows.
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const data = await getDashboardData(supabase, user.id);
  const money = new Intl.NumberFormat("en-US", { style: "currency", currency: data.currency });

  const summary = aggregateSpend(data.spendRows, "Uncategorized");
  const chartRows = foldTopCategories(summary.byCategory, 7, "Other");
  const runway = computeRunway(data.cashAvailable, summary.burnRate);
  const subscriptions = detectSubscriptions(data.transactions);

  const pdf = await renderSummaryPdf({
    email: user.email ?? "",
    money,
    cashAvailable: data.cashAvailable,
    burnRate: summary.burnRate,
    topCategory: summary.topCategory,
    runway,
    chartRows,
    subscriptions,
  });

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="runway-summary-${new Date().toISOString().slice(0, 10)}.pdf"`,
    },
  });
}

function renderSummaryPdf(input: {
  email: string;
  money: Intl.NumberFormat;
  cashAvailable: number;
  burnRate: number;
  topCategory: CategorySpend | null;
  runway: RunwayResult;
  chartRows: CategorySpend[];
  subscriptions: DetectedSubscription[];
}): Promise<Buffer> {
  const { email, money, cashAvailable, burnRate, topCategory, runway, chartRows, subscriptions } = input;

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.font("Helvetica-Bold").fontSize(22).fillColor("#18181b").text("Runway — Financial Summary");
    doc
      .font("Helvetica")
      .fontSize(10)
      .fillColor("#71717a")
      .text(`${email} · generated ${new Date().toISOString().slice(0, 10)}`);
    doc.moveDown(1.5);

    doc.font("Helvetica-Bold").fontSize(13).fillColor("#18181b").text("Overview");
    doc.moveDown(0.4);
    statLine(doc, "Cash available", money.format(cashAvailable));
    statLine(doc, "Monthly burn rate", `${money.format(burnRate)}/mo`);
    statLine(
      doc,
      "Runway",
      runway.months === null ? "Indefinite (no net burn)" : `${(Math.round(runway.months * 10) / 10).toString()} months (${runway.status})`,
      STATUS_HEX[runway.status],
    );
    statLine(doc, "Top spending category", topCategory ? topCategory.name : "—");
    doc.moveDown(1.2);

    doc.font("Helvetica-Bold").fontSize(13).fillColor("#18181b").text("Spend by category");
    doc.moveDown(0.4);
    if (chartRows.length === 0) {
      doc.font("Helvetica").fontSize(10).fillColor("#71717a").text("No categorized spend yet.");
    } else {
      const maxTotal = chartRows[0]?.total ?? 0;
      const barMaxWidth = 260;
      for (const row of chartRows) {
        const y = doc.y;
        doc.font("Helvetica").fontSize(10).fillColor("#3f3f46").text(row.name, 50, y, { width: 180 });
        doc
          .font("Helvetica")
          .fontSize(10)
          .fillColor("#3f3f46")
          .text(money.format(row.total), 460, y, { width: 85, align: "right" });
        const barWidth = maxTotal > 0 ? (row.total / maxTotal) * barMaxWidth : 0;
        doc.rect(230, y + 2, Math.max(barWidth, 1), 8).fill(BAR_HUE);
        doc.moveDown(0.9);
      }
    }
    doc.moveDown(1);

    doc.font("Helvetica-Bold").fontSize(13).fillColor("#18181b").text("Detected subscriptions");
    doc.moveDown(0.4);
    if (subscriptions.length === 0) {
      doc.font("Helvetica").fontSize(10).fillColor("#71717a").text("No recurring subscriptions detected.");
    } else {
      const colX = { merchant: 50, cadence: 240, amount: 320, hike: 430 };
      doc.font("Helvetica-Bold").fontSize(9).fillColor("#71717a");
      doc.text("Merchant", colX.merchant, doc.y, { continued: false, width: 180 });
      const headerY = doc.y - doc.currentLineHeight();
      doc.text("Cadence", colX.cadence, headerY, { width: 70 });
      doc.text("Amount", colX.amount, headerY, { width: 100 });
      doc.text("Price hike", colX.hike, headerY, { width: 100 });
      doc.moveDown(0.6);

      for (const sub of subscriptions) {
        const y = doc.y;
        doc.font("Helvetica").fontSize(10).fillColor("#3f3f46");
        doc.text(sub.merchantName, colX.merchant, y, { width: 180 });
        doc.text(sub.cadence, colX.cadence, y, { width: 70 });
        doc.text(money.format(sub.lastAmount), colX.amount, y, { width: 100 });
        doc
          .fillColor(sub.priceHike ? STATUS_HEX.critical : "#a1a1aa")
          .text(sub.priceHike ? `Yes (avg was ${money.format(sub.avgAmount)})` : "—", colX.hike, y, { width: 130 });
        doc.moveDown(0.7);
      }
    }

    doc.end();
  });
}

function statLine(doc: PDFKit.PDFDocument, label: string, value: string, valueColor = "#18181b") {
  const y = doc.y;
  doc.font("Helvetica").fontSize(10).fillColor("#71717a").text(label, 50, y, { width: 200 });
  doc.font("Helvetica-Bold").fontSize(10).fillColor(valueColor).text(value, 250, y, { width: 260 });
  doc.moveDown(0.6);
}
