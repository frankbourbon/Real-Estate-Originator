import AsyncStorage from "@react-native-async-storage/async-storage";
import createContextHook from "@nkzw/create-context-hook";
import React, { useCallback, useEffect, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * Initial Credit Review MS — owns the credit box evaluation and Letter of Interest
 * issued to the borrower. One record per applicationId.
 */
export type ICRRecord = {
  applicationId: string;
  updatedAt: string;
  creditBoxNotes: string;
  loiRecommended: boolean;
  loiIssuedDate: string;
  loiExpirationDate: string;
};

// ─── Storage Key ──────────────────────────────────────────────────────────────

const KEY = "svc_icr_v1";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function now(): string { return new Date().toISOString(); }
function d(y: number, m: number, day: number): string { return new Date(y, m - 1, day).toISOString(); }
function ds(y: number, m: number, day: number): string {
  return `${String(m).padStart(2, "0")}/${String(day).padStart(2, "0")}/${y}`;
}

// ─── Seed Data ────────────────────────────────────────────────────────────────

const SEED_RECORDS: ICRRecord[] = [
  { applicationId: "seed_a02", updatedAt: d(2026,3,5),
    creditBoxNotes: "Deal fits credit box well. Cap rate of 5.2% aligns with market. Anchor tenant NNN lease provides strong debt service coverage. IO period justified given lease term remaining. Recommend LOI.",
    loiRecommended: true, loiIssuedDate: ds(2026,3,5), loiExpirationDate: ds(2026,4,5) },
  { applicationId: "seed_a03", updatedAt: d(2026,3,10),
    creditBoxNotes: "Strong industrial fundamentals. 95% physical occupancy with long-term tenants. Fits core credit box. DSCR well above 1.35x floor. Recommend LOI.",
    loiRecommended: true, loiIssuedDate: ds(2026,2,15), loiExpirationDate: ds(2026,3,15) },
  { applicationId: "seed_a04", updatedAt: d(2026,3,18),
    creditBoxNotes: "96% occupancy well above 90% hurdle. DSCR of 1.60x provides strong cushion. LA multifamily fundamentals remain robust. Recommend LOI.",
    loiRecommended: true, loiIssuedDate: ds(2026,2,1), loiExpirationDate: ds(2026,3,1) },
  { applicationId: "seed_a05", updatedAt: d(2026,3,19),
    creditBoxNotes: "Mixed-use with residential majority qualifies under multifamily program. Floating rate with 3yr IO is appropriate for value-add business plan. Recommend LOI with conditions.",
    loiRecommended: true, loiIssuedDate: ds(2026,1,20), loiExpirationDate: ds(2026,2,20) },
  { applicationId: "seed_a06", updatedAt: d(2026,3,20),
    creditBoxNotes: "Single tenant risk noted but offset by strong covenant. DSCR above floor. Recommend LOI.",
    loiRecommended: true, loiIssuedDate: ds(2025,12,28), loiExpirationDate: ds(2026,1,28) },
  { applicationId: "seed_a07", updatedAt: d(2026,3,15),
    creditBoxNotes: "Hotel sector exception required. Post-renovation performance data reviewed. Revenue trending above underwriting. IO approved for 5yr term.",
    loiRecommended: true, loiIssuedDate: ds(2025,11,25), loiExpirationDate: ds(2025,12,25) },
  { applicationId: "seed_a08", updatedAt: d(2026,3,18),
    creditBoxNotes: "Best-in-class Buckhead multifamily. 97% occupancy, strong rent growth trajectory. DSCR of 1.58x well above floor.",
    loiRecommended: true, loiIssuedDate: ds(2025,11,5), loiExpirationDate: ds(2025,12,5) },
  { applicationId: "seed_a09", updatedAt: d(2026,3,20),
    creditBoxNotes: "Trophy retail asset on premier US shopping corridor. 100% occupancy, all national credit tenants. Very low risk profile.",
    loiRecommended: true, loiIssuedDate: ds(2025,10,20), loiExpirationDate: ds(2025,11,20) },
  { applicationId: "seed_a10", updatedAt: d(2026,3,21),
    creditBoxNotes: "Top-tier institutional-quality asset. IG-rated tenant covenant. DSCR of 1.62x substantially above floor. Very strong deal.",
    loiRecommended: true, loiIssuedDate: ds(2025,10,1), loiExpirationDate: ds(2025,11,1) },
  { applicationId: "seed_a12", updatedAt: d(2026,3,16),
    creditBoxNotes: "Self-storage sector performing well nationally. NOI growth 8% YoY. DSCR comfortably above 1.35x floor. Recommend LOI.",
    loiRecommended: true, loiIssuedDate: ds(2026,2,14), loiExpirationDate: ds(2026,3,14) },
  // ── Gap fills: a01 (Office Chicago), a11 (Industrial Houston) ────────────
  { applicationId: "seed_a01", updatedAt: d(2026,3,22),
    creditBoxNotes: "Class A trophy office in Chicago Loop. Financial services / legal tenant mix. DSCR of 1.58x at underwritten rents, well above 1.35x floor. LTV of 62% within policy. Recommend LOI.",
    loiRecommended: true, loiIssuedDate: ds(2025,9,18), loiExpirationDate: ds(2025,10,18) },
  { applicationId: "seed_a11", updatedAt: d(2026,3,20),
    creditBoxNotes: "Single-tenant NNN industrial near IAH. Investment-grade logistics company with 8 years remaining on lease. DSCR of 1.72x. LTV at 55%. Essentially bond-equivalent credit. Recommend LOI.",
    loiRecommended: true, loiIssuedDate: ds(2025,10,5), loiExpirationDate: ds(2025,11,5) },
  // ── a26–a34: ICR phase (LOI issued / under active credit review) ──────────
  { applicationId: "seed_a26", updatedAt: d(2026,3,18),
    creditBoxNotes: "North Raleigh suburban office. Healthcare anchor tenant 7 years remaining on NNN lease provides strong base coverage. DSCR of 1.44x at 65% LTV. Submarket vacancy trending down. Recommend LOI.",
    loiRecommended: true, loiIssuedDate: ds(2026,3,14), loiExpirationDate: ds(2026,4,14) },
  { applicationId: "seed_a27", updatedAt: d(2026,3,15),
    creditBoxNotes: "Kansas City Plaza-area retail. 91% occupied, local/regional restaurant and service tenants. DSCR of 1.38x at 65% LTV within policy range. Recommend LOI with stabilization covenant.",
    loiRecommended: true, loiIssuedDate: ds(2026,3,10), loiExpirationDate: ds(2026,4,10) },
  { applicationId: "seed_a28", updatedAt: d(2026,3,12),
    creditBoxNotes: "Columbus industrial park at I-70/I-270 interchange. Two NNN tenants, combined WALE of 6.4 years. DSCR of 1.55x at 60% LTV. Strong Columbus industrial fundamentals. Recommend LOI.",
    loiRecommended: true, loiIssuedDate: ds(2026,3,8), loiExpirationDate: ds(2026,4,8) },
  { applicationId: "seed_a29", updatedAt: d(2026,3,10),
    creditBoxNotes: "Scott's Addition mixed-use. Retail 100% leased, residential 96% occupied. Construction takeout at reasonable leverage. DSCR of 1.42x. Richmond urban infill dynamics supportive. Recommend LOI.",
    loiRecommended: true, loiIssuedDate: ds(2026,3,6), loiExpirationDate: ds(2026,4,6) },
  { applicationId: "seed_a30", updatedAt: d(2026,3,8),
    creditBoxNotes: "Indianapolis Meridian-Kessler 240-unit MF. 96% occupied, stable workforce housing market. DSCR of 1.49x. 10-year fixed rate request aligns with cash-out refinance business plan. Recommend LOI.",
    loiRecommended: true, loiIssuedDate: ds(2026,3,4), loiExpirationDate: ds(2026,4,4) },
  { applicationId: "seed_a31", updatedAt: d(2026,3,6),
    creditBoxNotes: "Louisville CBD office. Government/healthcare tenant base provides stable income. DSCR of 1.40x at 65% LTV. Below-market rents provide upside on rollover. Recommend LOI.",
    loiRecommended: true, loiIssuedDate: ds(2026,3,2), loiExpirationDate: ds(2026,4,2) },
  { applicationId: "seed_a32", updatedAt: d(2026,3,4),
    creditBoxNotes: "Memphis 420K SF industrial park. National food distributor and FedEx NNN tenants. Combined DSCR of 1.62x. Strong Memphis logistics submarket. Acquisition LTV at 62%. Recommend LOI.",
    loiRecommended: true, loiIssuedDate: ds(2026,2,28), loiExpirationDate: ds(2026,3,28) },
  { applicationId: "seed_a33", updatedAt: d(2026,3,2),
    creditBoxNotes: "Clayton MO specialty retail — construction financing. Healthcare and dining anchor tenants on long-term NNN leases. Pro forma DSCR of 1.38x on completion at 65% LTC. Recommend LOI with completion guarantee.",
    loiRecommended: true, loiIssuedDate: ds(2026,2,26), loiExpirationDate: ds(2026,3,26) },
  { applicationId: "seed_a34", updatedAt: d(2026,2,28),
    creditBoxNotes: "Pittsburgh Squirrel Hill 96-unit MF. 98% occupancy in stable academic submarket. DSCR of 1.52x at 68% LTV. Bridge financing suitable at conservative leverage. Recommend LOI.",
    loiRecommended: true, loiIssuedDate: ds(2026,2,24), loiExpirationDate: ds(2026,3,24) },
  // ── a35–a43: Application Start ────────────────────────────────────────────
  { applicationId: "seed_a35", updatedAt: d(2026,3,14),
    creditBoxNotes: "Baltimore Inner Harbor Class A office. Law firm anchor with 12 years remaining provides exceptional lease security. DSCR of 1.56x at 63% LTV. 10-year fixed rate appropriate for long WALE. Recommend LOI.",
    loiRecommended: true, loiIssuedDate: ds(2026,2,20), loiExpirationDate: ds(2026,3,20) },
  { applicationId: "seed_a36", updatedAt: d(2026,3,12),
    creditBoxNotes: "Detroit Midtown retail — value-add play. 86% occupied with near-term rollover on in-line tenants. Bridge at 65% LTV. Borrower track record solid. DSCR of 1.36x sufficient. Recommend LOI.",
    loiRecommended: true, loiIssuedDate: ds(2026,2,18), loiExpirationDate: ds(2026,3,18) },
  { applicationId: "seed_a37", updatedAt: d(2026,3,10),
    creditBoxNotes: "San Antonio I-35 industrial. AutoZone distribution (investment grade) NNN lease with 8 years remaining. DSCR of 1.58x at 60% LTV. Permanent financing well-supported by single strong credit tenant. Recommend LOI.",
    loiRecommended: true, loiIssuedDate: ds(2026,2,16), loiExpirationDate: ds(2026,3,16) },
  { applicationId: "seed_a38", updatedAt: d(2026,3,8),
    creditBoxNotes: "Sacramento Midtown mixed-use bridge. Retail 100% leased, residential 97% occupied. DSCR of 1.44x at construction takeout leverage. Sacramento market demand remains stable. Recommend LOI.",
    loiRecommended: true, loiIssuedDate: ds(2026,2,14), loiExpirationDate: ds(2026,3,14) },
  { applicationId: "seed_a39", updatedAt: d(2026,3,6),
    creditBoxNotes: "Oakland Uptown 88-unit MF — stabilizing. 91% occ improving monthly. DSCR of 1.40x on stabilized basis. Construction takeout at 68% LTV. Oakland demand fundamentals strong post-COVID recovery. Recommend LOI.",
    loiRecommended: true, loiIssuedDate: ds(2026,2,12), loiExpirationDate: ds(2026,3,12) },
  { applicationId: "seed_a40", updatedAt: d(2026,3,4),
    creditBoxNotes: "North San Jose 92K SF Class A office. Tech/healthcare tenants, 94% leased. DSCR of 1.53x at 65% LTV. Note acquisition at below-replacement cost. Recommend LOI.",
    loiRecommended: true, loiIssuedDate: ds(2026,2,10), loiExpirationDate: ds(2026,3,10) },
  { applicationId: "seed_a41", updatedAt: d(2026,3,2),
    creditBoxNotes: "Valley View OH cold storage — critical infrastructure. Single Sysco Foods tenant, WALE 7 years remaining. DSCR of 1.61x at 62% LTV. NNN structure removes operational risk. Recommend LOI.",
    loiRecommended: true, loiIssuedDate: ds(2026,2,8), loiExpirationDate: ds(2026,3,8) },
  { applicationId: "seed_a42", updatedAt: d(2026,2,28),
    creditBoxNotes: "Orlando I-Drive power strip. National tenant mix (Dick's, HomeGoods). 92% occupied. DSCR of 1.46x at 65% LTV. Refinance to pull equity — well-executed asset. Recommend LOI.",
    loiRecommended: true, loiIssuedDate: ds(2026,2,6), loiExpirationDate: ds(2026,3,6) },
  { applicationId: "seed_a43", updatedAt: d(2026,2,25),
    creditBoxNotes: "Riverside CA 132-unit luxury MF. 95% occupied. DSCR of 1.48x at 63% LTV. Hybrid rate structure acceptable given institutional-quality asset. Acquisition at reasonable basis. Recommend LOI.",
    loiRecommended: true, loiIssuedDate: ds(2026,2,4), loiExpirationDate: ds(2026,3,4) },
  // ── a44–a50: Application Processing ──────────────────────────────────────
  { applicationId: "seed_a44", updatedAt: d(2026,3,20),
    creditBoxNotes: "Cincinnati CBD 56K SF office. P&G sublease plus financial services. 93% occ, DSCR 1.46x at 65% LTV. CMBS balloon refinance — clean title history. Recommend LOI.",
    loiRecommended: true, loiIssuedDate: ds(2026,1,28), loiExpirationDate: ds(2026,2,28) },
  { applicationId: "seed_a45", updatedAt: d(2026,3,18),
    creditBoxNotes: "Jacksonville 340K SF industrial. Cold-chain logistics tenant 100% leased, NNN. DSCR of 1.62x at 60% LTV. Port-adjacent location provides irreplaceable competitive advantage. Recommend LOI.",
    loiRecommended: true, loiIssuedDate: ds(2026,1,26), loiExpirationDate: ds(2026,2,26) },
  { applicationId: "seed_a46", updatedAt: d(2026,3,16),
    creditBoxNotes: "Nashville Germantown retail. 100% occupied, boutique restaurant and home décor tenants on NNN leases. DSCR of 1.44x at 65% LTV. Bridge financing for acquisition with excellent tenancy. Recommend LOI.",
    loiRecommended: true, loiIssuedDate: ds(2026,1,24), loiExpirationDate: ds(2026,2,24) },
  { applicationId: "seed_a47", updatedAt: d(2026,3,14),
    creditBoxNotes: "Minneapolis North Loop mixed-use. Retail 100%, residential 96% occupied. DSCR of 1.47x at 65% LTV. Construction takeout into strong submarket. Permanent financing appropriate. Recommend LOI.",
    loiRecommended: true, loiIssuedDate: ds(2026,1,22), loiExpirationDate: ds(2026,2,22) },
  { applicationId: "seed_a48", updatedAt: d(2026,3,12),
    creditBoxNotes: "Cleveland suburban east medical office. Healthcare tenants — sticky, long-term leases typical. 88% occ, DSCR 1.38x at 60% LTV. Conservative leverage request well within policy. Recommend LOI.",
    loiRecommended: true, loiIssuedDate: ds(2026,1,20), loiExpirationDate: ds(2026,2,20) },
  { applicationId: "seed_a49", updatedAt: d(2026,3,10),
    creditBoxNotes: "Tucson University area 176-unit MF. 94% occ, student/workforce mix. DSCR of 1.46x at 65% LTV. Experienced Tucson operator with 12-year track record. Recommend LOI.",
    loiRecommended: true, loiIssuedDate: ds(2026,1,18), loiExpirationDate: ds(2026,2,18) },
  { applicationId: "seed_a50", updatedAt: d(2026,3,8),
    creditBoxNotes: "St. Louis suburban office campus. 85% occ with Centene Corp as anchor. Construction of pre-leased additional building de-risked. DSCR of 1.40x on stabilized basis. Recommend LOI.",
    loiRecommended: true, loiIssuedDate: ds(2026,1,16), loiExpirationDate: ds(2026,2,16) },
  // ── a51–a58: Final Credit Review ──────────────────────────────────────────
  { applicationId: "seed_a51", updatedAt: d(2026,3,22),
    creditBoxNotes: "Columbus I-70/I-270 industrial park. Three NNN tenants: Amazon, AutoNation, Tyson. Combined WALE 7 years. DSCR of 1.61x at 62% LTV. Acquisition at strong basis. Recommend LOI.",
    loiRecommended: true, loiIssuedDate: ds(2026,1,8), loiExpirationDate: ds(2026,2,8) },
  { applicationId: "seed_a52", updatedAt: d(2026,3,20),
    creditBoxNotes: "Augusta GA grocery-anchored retail. Publix (investment grade) anchor 16 years remaining NNN. 94% occ, DSCR 1.45x at 65% LTV. Stable grocery anchor drives strong center performance. Recommend LOI.",
    loiRecommended: true, loiIssuedDate: ds(2026,1,6), loiExpirationDate: ds(2026,2,6) },
  { applicationId: "seed_a53", updatedAt: d(2026,3,18),
    creditBoxNotes: "Tampa Ybor City mixed-use. F&B retail fully leased on NNN, residential 96% occupied. Construction takeout at 65% LTV. DSCR 1.48x. Strong Tampa fundamentals support credit. Recommend LOI.",
    loiRecommended: true, loiIssuedDate: ds(2026,1,4), loiExpirationDate: ds(2026,2,4) },
  { applicationId: "seed_a54", updatedAt: d(2026,3,16),
    creditBoxNotes: "Mesa AZ 152-unit Class A MF. 97% occupied, Mesa East Valley fundamentals strong. DSCR of 1.51x at 65% LTV. Institutional sponsor — experienced operations team. Recommend LOI.",
    loiRecommended: true, loiIssuedDate: ds(2026,1,2), loiExpirationDate: ds(2026,2,2) },
  { applicationId: "seed_a55", updatedAt: d(2026,3,14),
    creditBoxNotes: "North Phoenix Camelback corridor office. Nationwide Insurance NNN anchor, 4 years remaining. DSCR 1.57x on NNN structure at 62% LTV. Recommend LOI.",
    loiRecommended: true, loiIssuedDate: ds(2025,12,28), loiExpirationDate: ds(2026,1,28) },
  { applicationId: "seed_a56", updatedAt: d(2026,3,12),
    creditBoxNotes: "Louisville Riverport industrial. Amazon 3PL single tenant, NNN, IG-equivalent covenant. DSCR of 1.62x at 60% LTV. Essential fulfillment infrastructure with 6 years remaining. Recommend LOI.",
    loiRecommended: true, loiIssuedDate: ds(2025,12,24), loiExpirationDate: ds(2026,1,24) },
  { applicationId: "seed_a57", updatedAt: d(2026,3,10),
    creditBoxNotes: "Denver Capitol Hill 112-unit boutique MF. 95% occ, in-place rents at market. DSCR 1.51x at 63% LTV. Existing relationship borrower — clean credit history. Recommend LOI.",
    loiRecommended: true, loiIssuedDate: ds(2025,12,20), loiExpirationDate: ds(2026,1,20) },
  { applicationId: "seed_a58", updatedAt: d(2026,3,8),
    creditBoxNotes: "Knoxville CBD office — distressed acquisition. 87% occ, DSCR 1.38x on bridge. Baker Donelson anchor on long-term lease provides coverage floor. Bridge at 65% LTV appropriate given value-add thesis. Recommend LOI.",
    loiRecommended: true, loiIssuedDate: ds(2025,12,16), loiExpirationDate: ds(2026,1,16) },
  // ── a59–a65: Pre-close ────────────────────────────────────────────────────
  { applicationId: "seed_a59", updatedAt: d(2026,3,25),
    creditBoxNotes: "Akron grocery-anchored retail. Giant Eagle 20-year ground lease anchor with high renewal probability. 96% occ, DSCR 1.44x at 65% LTV. Balloon refinance at maturity — clean 10-year history. Recommend LOI.",
    loiRecommended: true, loiIssuedDate: ds(2025,12,8), loiExpirationDate: ds(2026,1,8) },
  { applicationId: "seed_a60", updatedAt: d(2026,3,22),
    creditBoxNotes: "Fresno Central Valley industrial park. Gallo Wine and Pacific Cold Storage NNN tenants. Combined WALE 9 years. DSCR 1.66x at 60% LTV. Off-market acquisition at compelling basis. Recommend LOI.",
    loiRecommended: true, loiIssuedDate: ds(2025,12,4), loiExpirationDate: ds(2026,1,4) },
  { applicationId: "seed_a61", updatedAt: d(2026,3,20),
    creditBoxNotes: "Long Beach 2nd Street mixed-use. Retail fully NNN leased, 68 residential units at 97% occ. DSCR 1.50x at 63% LTV. Construction takeout in strong infill location. Recommend LOI.",
    loiRecommended: true, loiIssuedDate: ds(2025,11,30), loiExpirationDate: ds(2025,12,30) },
  { applicationId: "seed_a62", updatedAt: d(2026,3,18),
    creditBoxNotes: "Spokane Valley 58K SF suburban office. Medical/financial tenants, 89% occ. DSCR 1.40x at 65% LTV. Balloon refinance of 7-year loan. Borrower track record since 2019 solid. Recommend LOI.",
    loiRecommended: true, loiIssuedDate: ds(2025,11,26), loiExpirationDate: ds(2025,12,26) },
  { applicationId: "seed_a63", updatedAt: d(2026,3,16),
    creditBoxNotes: "Colorado Springs Briargate 200-unit MF. 96% occ, USAFA and tech sector tenant mix. DSCR 1.52x at 65% LTV. Bridge takeout into permanent — stabilized performance demonstrated. Recommend LOI.",
    loiRecommended: true, loiIssuedDate: ds(2025,11,22), loiExpirationDate: ds(2025,12,22) },
  { applicationId: "seed_a64", updatedAt: d(2026,3,14),
    creditBoxNotes: "Lexington KY 128-unit workforce MF near UK. 95% occ, stable university market. DSCR 1.46x at 64% LTV. Syndicator exit acquisition — clean property with no deferred maintenance noted. Recommend LOI.",
    loiRecommended: true, loiIssuedDate: ds(2025,11,18), loiExpirationDate: ds(2025,12,18) },
  { applicationId: "seed_a65", updatedAt: d(2026,3,12),
    creditBoxNotes: "Des Moines Waukee 52K SF suburban office. Principal Financial and Iowa Insurance tenants. 92% occ, DSCR 1.42x at 65% LTV. Partial IO on 10-year fixed appropriate for stabilized income. Recommend LOI.",
    loiRecommended: true, loiIssuedDate: ds(2025,11,14), loiExpirationDate: ds(2025,12,14) },
  // ── a66–a72: Ready for Docs ───────────────────────────────────────────────
  { applicationId: "seed_a66", updatedAt: d(2026,3,28),
    creditBoxNotes: "Little Rock suburban retail — 6 units, 100% occupied. Sonic and State Farm NNN anchor tenants. DSCR 1.48x at 65% LTV. Maturing balloon — long hold with clean payment history. Recommend LOI.",
    loiRecommended: true, loiIssuedDate: ds(2025,11,6), loiExpirationDate: ds(2025,12,6) },
  { applicationId: "seed_a67", updatedAt: d(2026,3,26),
    creditBoxNotes: "Shreveport 220K SF industrial. Oilfield services and manufacturing NNN tenants. DSCR 1.50x at 62% LTV. Experienced industrial operator acquiring below replacement cost. Recommend LOI.",
    loiRecommended: true, loiIssuedDate: ds(2025,11,2), loiExpirationDate: ds(2025,12,2) },
  { applicationId: "seed_a68", updatedAt: d(2026,3,24),
    creditBoxNotes: "Birmingham Avondale mixed-use. Brewery/restaurant NNN retail, 36 residential at 97% occ. DSCR 1.44x at 65% LTV. Construction takeout — Avondale gentrification trend supportive. Recommend LOI.",
    loiRecommended: true, loiIssuedDate: ds(2025,10,28), loiExpirationDate: ds(2025,11,28) },
  { applicationId: "seed_a69", updatedAt: d(2026,3,22),
    creditBoxNotes: "Aurora CO 160-unit garden MF. 94% occ, workforce housing with stable demand drivers. DSCR 1.46x at 65% LTV. Syndicator liquidation provides below-market entry. Recommend LOI.",
    loiRecommended: true, loiIssuedDate: ds(2025,10,24), loiExpirationDate: ds(2025,11,24) },
  { applicationId: "seed_a70", updatedAt: d(2026,3,20),
    creditBoxNotes: "Tempe Hayden Ferry Lakeside Class A office. GoDaddy and ASU tenants. 89% occ, DSCR 1.45x at 65% LTV. CMBS balloon refinance at favorable current rate environment. Recommend LOI.",
    loiRecommended: true, loiIssuedDate: ds(2025,10,20), loiExpirationDate: ds(2025,11,20) },
  { applicationId: "seed_a71", updatedAt: d(2026,3,18),
    creditBoxNotes: "Scottsdale Old Town 108-unit luxury MF. 96% occ, premium rents well above submarket. DSCR 1.52x at 62% LTV. Existing borrower cash-out refi — strong operating track record. Recommend LOI.",
    loiRecommended: true, loiIssuedDate: ds(2025,10,16), loiExpirationDate: ds(2025,11,16) },
  { applicationId: "seed_a72", updatedAt: d(2026,3,16),
    creditBoxNotes: "Chandler AZ Price Rd retail. LA Fitness and Aspen Dental tenants. 88% occ, DSCR 1.40x at 65% LTV. Part of larger portfolio disposition — clean asset with no deferred maintenance. Recommend LOI.",
    loiRecommended: true, loiIssuedDate: ds(2025,10,12), loiExpirationDate: ds(2025,11,12) },
  // ── a73–a76: Docs Drawn ───────────────────────────────────────────────────
  { applicationId: "seed_a73", updatedAt: d(2026,3,30),
    creditBoxNotes: "Plano Legacy Town Center Class A office. Ericsson and Capital One tech tenants. 91% occ, DSCR 1.49x at 64% LTV. CMBS balloon refinance with well-capitalized sponsor. Recommend LOI.",
    loiRecommended: true, loiIssuedDate: ds(2025,10,4), loiExpirationDate: ds(2025,11,4) },
  { applicationId: "seed_a74", updatedAt: d(2026,3,28),
    creditBoxNotes: "Garland TX 195K SF industrial. Raytheon (IG defense contractor) anchor, 20-year NNN lease. DSCR 1.58x at 60% LTV. Defense tenant provides exceptional covenant quality. Recommend LOI.",
    loiRecommended: true, loiIssuedDate: ds(2025,9,30), loiExpirationDate: ds(2025,10,30) },
  { applicationId: "seed_a75", updatedAt: d(2026,3,26),
    creditBoxNotes: "Fort Worth South Hulen 144-unit garden MF. 95% occ, workforce profile with strong demand drivers. DSCR 1.50x at 63% LTV. Balloon refinance — well-maintained asset. Recommend LOI.",
    loiRecommended: true, loiIssuedDate: ds(2025,9,26), loiExpirationDate: ds(2025,10,26) },
  { applicationId: "seed_a76", updatedAt: d(2026,3,24),
    creditBoxNotes: "Arlington TX suburban office. BNSF Railway and Tarrant County government tenants. 88% occ, DSCR 1.41x at 65% LTV. Maturing 10-year fixed — clean 10-year payment history. Recommend LOI.",
    loiRecommended: true, loiIssuedDate: ds(2025,9,22), loiExpirationDate: ds(2025,10,22) },
  // ── a77–a80: Docs Back ────────────────────────────────────────────────────
  { applicationId: "seed_a77", updatedAt: d(2026,3,31),
    creditBoxNotes: "Irving TX DFW-adjacent retail strip. Whataburger and Chase Bank NNN tenants. 86% occ, DSCR 1.40x at 65% LTV. Borrower 12-year hold with clean payment history. Recommend LOI.",
    loiRecommended: true, loiIssuedDate: ds(2025,9,14), loiExpirationDate: ds(2025,10,14) },
  { applicationId: "seed_a78", updatedAt: d(2026,3,29),
    creditBoxNotes: "Frisco TX 240K SF industrial. Panasonic North America single NNN tenant, 15 years remaining. IG-rated covenant. DSCR 1.61x at 60% LTV. Bond-equivalent deal with excellent lease security. Recommend LOI.",
    loiRecommended: true, loiIssuedDate: ds(2025,9,10), loiExpirationDate: ds(2025,10,10) },
  { applicationId: "seed_a79", updatedAt: d(2026,3,27),
    creditBoxNotes: "McKinney TX 180-unit garden MF. 97% occ, strong DFW suburban fundamentals. DSCR 1.54x at 65% LTV. Bridge into permanent at balloon maturity — well-stabilized asset. Recommend LOI.",
    loiRecommended: true, loiIssuedDate: ds(2025,9,6), loiExpirationDate: ds(2025,10,6) },
  { applicationId: "seed_a80", updatedAt: d(2026,3,25),
    creditBoxNotes: "San Marcos TX 44K SF suburban office. Texas State University and Hays County government tenants. 91% occ, DSCR 1.45x at 65% LTV. Government/education tenant stability provides strong base coverage. Recommend LOI.",
    loiRecommended: true, loiIssuedDate: ds(2025,9,2), loiExpirationDate: ds(2025,10,2) },
  // ── a81–a84: Closing ──────────────────────────────────────────────────────
  { applicationId: "seed_a81", updatedAt: d(2026,3,31),
    creditBoxNotes: "Laredo TX grocery-anchored retail. H-E-B Express anchor NNN through 2031. 84% occ on remaining in-line tenants creates minor vacancy risk — offset by below-replacement-cost basis. DSCR 1.38x at 64% LTV. Recommend LOI.",
    loiRecommended: true, loiIssuedDate: ds(2025,8,22), loiExpirationDate: ds(2025,9,22) },
  { applicationId: "seed_a82", updatedAt: d(2026,3,30),
    creditBoxNotes: "Lubbock TX 295K SF industrial. Plains Cotton Cooperative and regional supply chain NNN tenants. 96% occ, DSCR 1.60x at 62% LTV. Agricultural / supply chain tenant base stable in Lubbock market. Recommend LOI.",
    loiRecommended: true, loiIssuedDate: ds(2025,8,18), loiExpirationDate: ds(2025,9,18) },
  { applicationId: "seed_a83", updatedAt: d(2026,3,29),
    creditBoxNotes: "Fort Lauderdale Las Olas office — value-add bridge. 72% occ with 3 signed LOIs pending. Greenberg Traurig anchor provides coverage floor. DSCR 1.37x on in-place NOI, 1.52x on stabilized basis at 65% LTV. Bridge financing appropriate. Recommend LOI.",
    loiRecommended: true, loiIssuedDate: ds(2025,8,14), loiExpirationDate: ds(2025,9,14) },
  { applicationId: "seed_a84", updatedAt: d(2026,3,28),
    creditBoxNotes: "Boulder Pearl Street retail — value-add. 75% occ with below-market in-place rents. Mark-to-market potential substantial given premier Pearl Street location. DSCR 1.36x in-place, 1.58x stabilized at 62% LTV. Bridge at conservative leverage. Recommend LOI.",
    loiRecommended: true, loiIssuedDate: ds(2025,8,10), loiExpirationDate: ds(2025,9,10) },
];

// ─── Context ──────────────────────────────────────────────────────────────────

const [ICRServiceProvider, useICRService] = createContextHook(() => {
  const [records, setRecords] = useState<ICRRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(KEY).then((raw) => {
      if (raw) setRecords(JSON.parse(raw));
      setLoading(false);
    });
  }, []);

  const persist = useCallback(async (data: ICRRecord[]) => {
    setRecords(data);
    await AsyncStorage.setItem(KEY, JSON.stringify(data));
  }, []);

  const getOrCreateICR = useCallback((applicationId: string): ICRRecord => {
    return records.find((r) => r.applicationId === applicationId) ??
      { applicationId, updatedAt: now(), creditBoxNotes: "",
        loiRecommended: false, loiIssuedDate: "", loiExpirationDate: "" };
  }, [records]);

  const updateICR = useCallback(async (applicationId: string, patch: Partial<ICRRecord>) => {
    const existing = records.find((r) => r.applicationId === applicationId);
    if (existing) {
      await persist(records.map((r) => r.applicationId === applicationId
        ? { ...r, ...patch, updatedAt: now() } : r));
    } else {
      await persist([...records, {
        applicationId, updatedAt: now(), creditBoxNotes: "",
        loiRecommended: false, loiIssuedDate: "", loiExpirationDate: "", ...patch,
      }]);
    }
  }, [records, persist]);

  const loadSeedData = useCallback(async () => { await persist(SEED_RECORDS); }, [persist]);
  const clearData = useCallback(async () => { await persist([]); }, [persist]);
  const clearForApplication = useCallback(async (applicationId: string) => {
    await persist(records.filter((r) => r.applicationId !== applicationId));
  }, [records, persist]);

  return {
    loading,
    getOrCreateICR, updateICR,
    loadSeedData, clearData, clearForApplication,
  };
});

export { ICRServiceProvider, useICRService };
