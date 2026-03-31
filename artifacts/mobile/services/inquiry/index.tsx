import AsyncStorage from "@react-native-async-storage/async-storage";
import createContextHook from "@nkzw/create-context-hook";
import React, { useCallback, useEffect, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type UnitType =
  | "Studio" | "1BR/1BA" | "1BR/1BA+Den"
  | "2BR/1BA" | "2BR/2BA" | "2BR/2BA+Den"
  | "3BR/2BA" | "3BR/3BA" | "Penthouse"
  | "Office" | "Retail" | "Industrial" | "Other";

export type LeaseStatusType = "Occupied" | "Vacant" | "Notice" | "Model" | "Down";
export type LeaseType = "NNN" | "NN" | "Gross" | "Modified Gross" | "Absolute Net" | "Full Service";

export type OperatingPeriodType =
  | "Actual Year 1" | "Actual Year 2" | "T12 (Trailing 12)"
  | "YTD" | "Proforma";

/** Inquiry notes record — one per applicationId. Created lazily on first open. */
export type InquiryRecord = {
  applicationId: string;
  inquiryNotes: string;
  updatedAt: string;
};

/** Per-unit rent roll record. Keyed by applicationId (not propertyId). MISMO: RentRollItemType */
export type RentRollUnit = {
  id: string;
  applicationId: string;
  createdAt: string;
  updatedAt: string;
  unitIdentifier: string;
  unitType: UnitType;
  bedroomCount: string;
  bathroomCount: string;
  squareFeet: string;
  tenantName: string;
  leaseBeginDate: string;
  leaseEndDate: string;
  leaseStatus: LeaseStatusType;
  monthlyRentAmount: string;
  marketRentAmount: string;
  annualBaseRentAmount: string;
  baseRentPsf: string;
  leaseType: LeaseType | "";
  renewalOptions: string;
  tenantIndustry: string;
};

/** Annual operating statement per application. MISMO: IncomeExpenseStatementType */
export type OperatingYear = {
  id: string;
  applicationId: string;
  createdAt: string;
  updatedAt: string;
  periodType: OperatingPeriodType;
  periodYear: string;
  ytdMonths: string;
  grossPotentialRent: string;
  vacancyAndCreditLoss: string;
  otherIncome: string;
  effectiveGrossIncome: string;
  realEstateTaxes: string;
  insurance: string;
  utilities: string;
  repairsAndMaintenance: string;
  managementFee: string;
  administrative: string;
  replacementReserves: string;
  otherExpenses: string;
  totalOperatingExpenses: string;
  netOperatingIncome: string;
};

// ─── Storage Keys ─────────────────────────────────────────────────────────────

const KEYS = {
  notes: "svc_inquiry_notes_v2",
  rentRoll: "svc_inquiry_rent_roll_v2",
  opHistory: "svc_inquiry_op_history_v2",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}
function now(): string { return new Date().toISOString(); }
function d(y: number, m: number, day: number): string { return new Date(y, m - 1, day).toISOString(); }

/**
 * Parse a locale-formatted numeric string (e.g. "1,234,567") → number.
 * Only digits, dots, and minus signs are used; all other characters are stripped.
 * This is intentionally strict so that no user-supplied string can influence
 * the result beyond its numeric value.
 */
function parseNum(v: string | undefined): number {
  if (!v) return 0;
  return parseFloat(v.replace(/[^0-9.\-]/g, "")) || 0;
}

function fmtNum(n: number): string {
  return n ? n.toLocaleString("en-US", { maximumFractionDigits: 0 }) : "";
}

/**
 * Server-side computation of all derived Operating Year fields.
 *
 * EGI  = Gross Potential Rent − Vacancy & Credit Loss + Other Income
 * TOE  = Σ all expense line items
 * NOI  = EGI − TOE
 *
 * The caller's supplied values for effectiveGrossIncome, totalOperatingExpenses,
 * and netOperatingIncome are ignored — only the raw input fields are used.
 * This prevents any client-side manipulation of calculated totals from
 * reaching persistent storage.
 */
export function computeOpYearCalcs(
  data: Partial<OperatingYear>
): Pick<OperatingYear, "effectiveGrossIncome" | "totalOperatingExpenses" | "netOperatingIncome"> {
  // Income
  const gpr = parseNum(data.grossPotentialRent);
  const vac = parseNum(data.vacancyAndCreditLoss);
  const oth = parseNum(data.otherIncome);
  const egi = gpr - vac + oth;

  // Expenses
  const toe = [
    parseNum(data.realEstateTaxes),
    parseNum(data.insurance),
    parseNum(data.utilities),
    parseNum(data.repairsAndMaintenance),
    parseNum(data.managementFee),
    parseNum(data.administrative),
    parseNum(data.replacementReserves),
    parseNum(data.otherExpenses),
  ].reduce((a, b) => a + b, 0);

  // NOI
  const noi = egi - toe;

  return {
    effectiveGrossIncome:    fmtNum(egi),
    totalOperatingExpenses:  fmtNum(toe),
    netOperatingIncome:      fmtNum(noi),
  };
}
function ds(y: number, m: number, day: number): string {
  return `${String(m).padStart(2, "0")}/${String(day).padStart(2, "0")}/${y}`;
}

// ─── Seed Data ────────────────────────────────────────────────────────────────

const SEED_NOTES: InquiryRecord[] = [
  { applicationId: "seed_a01", updatedAt: d(2026,3,14),
    inquiryNotes: "Borrower is exploring acquisition of stabilized office building in Center City. Has toured the property twice. Asking price $13M. Looking for 65% LTV conventional financing. Market is recovering post-COVID — occupancy trending up from 82% to 88%." },
  { applicationId: "seed_a02", updatedAt: d(2026,3,5),
    inquiryNotes: "Borrower seeking cash-out refinance on flagship retail property in Midtown. Current loan maturity in August. Strong anchor tenant (national pharmacy chain) with 9 years remaining on NNN lease." },
  { applicationId: "seed_a03", updatedAt: d(2026,3,10),
    inquiryNotes: "Class A industrial acquisition near Hartsfield-Jackson. Two NNN tenants — logistics company and e-commerce fulfillment. Excellent location fundamentals." },
  { applicationId: "seed_a04", updatedAt: d(2026,3,18),
    inquiryNotes: "Multifamily refinance of 120-unit complex in Koreatown. Current loan at 5.5% maturing in June. Borrower wants to lock in current rate before further market movement." },
  { applicationId: "seed_a05", updatedAt: d(2026,3,19),
    inquiryNotes: "Mixed-use asset in Streeterville. Ground floor retail (2 units) + 48 residential apartments above. Strong River North submarket fundamentals." },
  { applicationId: "seed_a06", updatedAt: d(2026,3,20),
    inquiryNotes: "Tech-leased office building in downtown Austin. Single tenant NNN — 5 years remaining. Borrower has existing relationship with bank." },
  { applicationId: "seed_a07", updatedAt: d(2026,3,15),
    inquiryNotes: "Boutique hotel refinance on Brickell Avenue. Post-renovation stabilization complete. Strong ADR and RevPAR metrics for the submarket." },
  { applicationId: "seed_a08", updatedAt: d(2026,3,18),
    inquiryNotes: "224-unit garden-style multifamily in Buckhead. Class A property, 2018 vintage. Seller has accepted offer at $53.5M." },
  { applicationId: "seed_a09", updatedAt: d(2026,3,20),
    inquiryNotes: "Iconic Michigan Avenue retail — 100% occupied with mix of luxury and fashion tenants. National credit tenants on long-term leases." },
  { applicationId: "seed_a10", updatedAt: d(2026,3,21),
    inquiryNotes: "Class A office tower in Financial District. Single institutional tenant (financial services firm) with 12 years remaining on lease. Trophy asset." },
  { applicationId: "seed_a11", updatedAt: d(2026,3,20),
    inquiryNotes: "Single-tenant NNN industrial near Bush Intercontinental Airport. 100% leased to publicly-traded logistics company, 8 years remaining on lease. Asking $40M. Excellent credit tenant." },
  { applicationId: "seed_a12", updatedAt: d(2026,3,16),
    inquiryNotes: "Class A self-storage facility in growing Arcadia submarket. 480 climate-controlled units, 88% physical occupancy. Digital-native operation with strong NOI." },
  // a13–a15 gaps
  { applicationId: "seed_a13", updatedAt: d(2026,2,22),
    inquiryNotes: "Borrower was exploring acquisition of small office building in Midtown Manhattan. Inquiry canceled after due diligence revealed significant deferred maintenance and below-market rents. No further action." },
  { applicationId: "seed_a14", updatedAt: d(2026,3,3),
    inquiryNotes: "Mixed-use building in Denver LoDo submarket. Borrower withdrew application mid-process citing partnership dispute. Strong underlying asset with 32 residential units above ground-floor retail." },
  { applicationId: "seed_a15", updatedAt: d(2026,2,14),
    inquiryNotes: "Class B office tower in Century City. Loan denied — LTV exceeded policy at 72% combined with DSCR of 1.09. High lease rollover risk with 40% of leases expiring within 18 months. Borrower declined to restructure." },
  // a16–a25: Inquiry
  { applicationId: "seed_a16", updatedAt: d(2026,3,28),
    inquiryNotes: "168-unit Class A multifamily complex in Uptown Dallas. 2019 vintage with luxury amenities. Borrower seeking acquisition financing at 65% LTV. Strong rent growth market — average rents up 8% YoY. Occupancy running at 95%." },
  { applicationId: "seed_a17", updatedAt: d(2026,3,26),
    inquiryNotes: "Class A office building in South Lake Union, Seattle. 85,000 SF, 2016 vintage. Tech-weighted tenant base. Borrower seeking refinance as current CMBS loan matures in September. 91% occupied with strong in-place rents." },
  { applicationId: "seed_a18", updatedAt: d(2026,3,24),
    inquiryNotes: "8-unit neighborhood retail strip in Nashville's West End corridor. National credit anchored with pharmacy and fitness tenants. Bridge loan requested to facilitate acquisition ahead of long-term permanent financing." },
  { applicationId: "seed_a19", updatedAt: d(2026,3,22),
    inquiryNotes: "Construction financing sought for 280,000 SF Class A industrial/distribution center in Sacramento MSA. Pre-leased at 100% to regional e-commerce fulfillment operator. Completion expected Q3 2027." },
  { applicationId: "seed_a20", updatedAt: d(2026,3,20),
    inquiryNotes: "52-unit mixed-use building in Portland Pearl District. Ground-floor restaurant and retail, 48 apartments above. 2017 vintage in strong infill location. Permanent takeout financing sought." },
  { applicationId: "seed_a21", updatedAt: d(2026,3,18),
    inquiryNotes: "144-unit garden-style apartment community in South End Charlotte. 2018 vintage. Borrower exploring acquisition at $40M. Strong submarket fundamentals with limited new supply pipeline in immediate area." },
  { applicationId: "seed_a22", updatedAt: d(2026,3,15),
    inquiryNotes: "112,000 SF Class A office tower in Minneapolis CBD. Partial IO bridge loan requested to bridge to stabilization. Currently 88% occupied with renewal negotiations underway for largest tenant (22,000 SF). Seeking 5-year term." },
  { applicationId: "seed_a23", updatedAt: d(2026,3,12),
    inquiryNotes: "156-room select-service hotel on Las Vegas Strip corridor. 2011 vintage, recently renovated. Strong RevPAR performance, trailing ADR of $189. Refinance to capture equity after renovation." },
  { applicationId: "seed_a24", updatedAt: d(2026,3,10),
    inquiryNotes: "380-unit self-storage facility in Kearny Mesa submarket, San Diego. 2021 vintage, climate-controlled. Physical occupancy 91%, strong revenue per available square foot. Bridge loan to reposition for long-term sale." },
  { applicationId: "seed_a25", updatedAt: d(2026,3,8),
    inquiryNotes: "192-unit institutional-grade multifamily community in Tampa Westshore district. 2017 vintage. Existing borrower with established bank relationship. Seeking permanent financing on stabilized asset at 55% LTV." },
  // a26–a34: Initial Credit Review
  { applicationId: "seed_a26", updatedAt: d(2026,3,18),
    inquiryNotes: "68,000 SF Class A suburban office in North Raleigh. 2015 vintage, 89% occupied. Anchor tenant (regional healthcare system) has 7 years remaining on NNN lease. Acquisition at $20M." },
  { applicationId: "seed_a27", updatedAt: d(2026,3,15),
    inquiryNotes: "10-unit retail strip center in Kansas City Plaza submarket. 91% occupied, mix of local restaurants and service retailers. Refinance of maturing acquisition loan." },
  { applicationId: "seed_a28", updatedAt: d(2026,3,12),
    inquiryNotes: "320,000 SF industrial distribution center near Port of Columbus. 100% leased to two NNN tenants — logistics company (8 years remaining) and regional wholesale distributor (4 years remaining). Acquisition at $28M." },
  { applicationId: "seed_a29", updatedAt: d(2026,3,10),
    inquiryNotes: "38-unit mixed-use in Richmond's Scott's Addition. 2014 vintage. Ground retail (100% leased, 3 tenants) and 34 residential apartments above (96% occupied). Refinance of construction loan." },
  { applicationId: "seed_a30", updatedAt: d(2026,3,8),
    inquiryNotes: "240-unit institutional multifamily complex in Indianapolis Meridian-Kessler. 2016 vintage. Borrower seeks to cash-out refinance and lock in 10-year fixed rate ahead of maturing bridge. 96% occupied." },
  { applicationId: "seed_a31", updatedAt: d(2026,3,6),
    inquiryNotes: "75,000 SF Class B+ office in Louisville CBD. 2010 vintage, 88% leased. Mixed government/private tenants. Borrower exploring partial IO refinance. In-place rents slightly below market — upside on renewals." },
  { applicationId: "seed_a32", updatedAt: d(2026,3,4),
    inquiryNotes: "420,000 SF industrial park in Memphis — 4 buildings. 97% leased with 3 NNN tenants including national food distributor. Acquisition at $33M. Strong Memphis logistics submarket fundamentals." },
  { applicationId: "seed_a33", updatedAt: d(2026,3,2),
    inquiryNotes: "9-unit specialty retail center in Clayton, MO (St. Louis inner suburb). National and regional tenants, mix of medical office and upscale dining. 94% leased. Construction financing for $35M project." },
  { applicationId: "seed_a34", updatedAt: d(2026,2,28),
    inquiryNotes: "96-unit garden apartment community in Pittsburgh Squirrel Hill. 2015 vintage. 98% occupied with strong in-place cash flow. Bridge financing requested to facilitate acquisition — seller has accepted $20M offer." },
  // a35–a43: Application Start
  { applicationId: "seed_a35", updatedAt: d(2026,3,14),
    inquiryNotes: "130,000 SF Class A office building in Baltimore Inner Harbor. 2008 vintage, 91% occupied. Anchor tenant is law firm with 12 years remaining. Refinance on maturity. Borrower seeking 10-year fixed rate." },
  { applicationId: "seed_a36", updatedAt: d(2026,3,12),
    inquiryNotes: "7-unit strip retail center in Detroit Midtown. 2006 vintage, 86% occupied. Mix of local dining and service tenants. Borrower seeking acquisition financing at 64% LTV." },
  { applicationId: "seed_a37", updatedAt: d(2026,3,10),
    inquiryNotes: "250,000 SF industrial distribution campus near San Antonio I-35 corridor. 2017 vintage. Single NNN tenant — national auto parts retailer with 8 years remaining. Strong credit lease. Permanent financing sought." },
  { applicationId: "seed_a38", updatedAt: d(2026,3,8),
    inquiryNotes: "44-unit mixed-use building in Sacramento Midtown. 2013 vintage. Ground retail (3 tenants, 95% leased) and 40 residential apartments above (97% occupied). Borrower seeking bridge to refi maturing loan." },
  { applicationId: "seed_a39", updatedAt: d(2026,3,6),
    inquiryNotes: "88-unit mid-rise multifamily in Oakland Uptown. 2020 vintage. Stabilizing — currently 91% occupied. Refinance of construction loan into permanent. Strong rent growth in submarket." },
  { applicationId: "seed_a40", updatedAt: d(2026,3,4),
    inquiryNotes: "92,000 SF Class A suburban office in North San Jose. 2014 vintage, 94% leased. Mix of tech and healthcare tenants. Acquisition at $16.5M — current lender selling note. Borrower has existing equity in property." },
  { applicationId: "seed_a41", updatedAt: d(2026,3,2),
    inquiryNotes: "185,000 SF cold storage industrial facility in Valley View, OH. 2009 vintage. 100% leased to food distribution company. Critical facility with no equivalent local competition. NNN lease with 6 years remaining." },
  { applicationId: "seed_a42", updatedAt: d(2026,2,28),
    inquiryNotes: "14-unit power strip retail in Orlando International Drive area. 2004 vintage. Strong mix of national tenants (sporting goods, home goods, fast casual). 92% occupied. Refinance to pull equity." },
  { applicationId: "seed_a43", updatedAt: d(2026,2,25),
    inquiryNotes: "132-unit luxury apartment community in Riverside CA. 2016 vintage. 95% occupied with strong in-place rents. Borrower acquiring from institutional seller at $26.5M. Hybrid rate structure requested." },
  // a44–a50: Application Processing
  { applicationId: "seed_a44", updatedAt: d(2026,3,20),
    inquiryNotes: "56,000 SF Class A office building in Cincinnati Downtown. 2011 vintage, 93% occupied. Mix of professional services and financial tenants. Refinance of 7-year CMBS loan maturing July 2026." },
  { applicationId: "seed_a45", updatedAt: d(2026,3,18),
    inquiryNotes: "340,000 SF Class A industrial logistics hub near Jacksonville port. 2015 vintage. 100% leased to single NNN tenant — regional cold-chain logistics company. Acquisition at $31M, seller motivated." },
  { applicationId: "seed_a46", updatedAt: d(2026,3,16),
    inquiryNotes: "7-unit neighborhood retail in Nashville Germantown. 2007 vintage, 100% occupied. Mix of boutique restaurants and local services. Bridge financing for acquisition — existing owner retiring." },
  { applicationId: "seed_a47", updatedAt: d(2026,3,14),
    inquiryNotes: "62-unit mixed-use building in Minneapolis North Loop. 2018 vintage. Ground retail (3 tenants, 100% leased) + 58 apartments (96% occupied). Permanent financing sought to replace construction loan." },
  { applicationId: "seed_a48", updatedAt: d(2026,3,12),
    inquiryNotes: "48,000 SF Class B office in Cleveland Suburban East. 2009 vintage, 88% occupied. Medical office dominant — 3 tenants. Refinance at maturity. Conservative underwriting — lower LTV requested." },
  { applicationId: "seed_a49", updatedAt: d(2026,3,10),
    inquiryNotes: "176-unit multifamily in Tucson University area. 2016 vintage. 94% occupied — student/workforce mix. Acquisition at $23M. Borrower has owned similar properties in Tucson for 12 years." },
  { applicationId: "seed_a50", updatedAt: d(2026,3,8),
    inquiryNotes: "82,000 SF Class A suburban office campus in suburban St. Louis. 2007 vintage, 85% occupied. Construction financing for 42,000 SF additional building on same campus — fully pre-leased." },
  // a51–a58: Final Credit Review
  { applicationId: "seed_a51", updatedAt: d(2026,3,22),
    inquiryNotes: "270,000 SF industrial park near Columbus I-70/I-270 interchange. 2011 vintage. Three NNN tenants — e-commerce, auto parts, food processing. 97% leased. Acquisition at $38M." },
  { applicationId: "seed_a52", updatedAt: d(2026,3,20),
    inquiryNotes: "12-unit power center retail in Augusta, GA. 2006 vintage. Strong grocery anchor (national chain) + 11 in-line tenants, 94% occupied. Refinance of 10-year balloon maturity." },
  { applicationId: "seed_a53", updatedAt: d(2026,3,18),
    inquiryNotes: "54-unit mixed-use in Tampa Ybor City. 2019 vintage. Ground-floor restaurant and bar tenants (100% leased) + 50 high-end apartments above (96% occupied). Refinance of construction loan." },
  { applicationId: "seed_a54", updatedAt: d(2026,3,16),
    inquiryNotes: "152-unit Class A multifamily in Mesa, AZ East Valley. 2017 vintage. 97% occupied. Acquisition at $91M by institutional buyer. Borrower is equity sponsor bringing in bank financing for senior portion." },
  { applicationId: "seed_a55", updatedAt: d(2026,3,14),
    inquiryNotes: "64,000 SF suburban office in North Phoenix Camelback corridor. 2013 vintage, 91% occupied. Anchor tenant is national insurance company (NNN, 4 years remaining). Refinance at competitive rate." },
  { applicationId: "seed_a56", updatedAt: d(2026,3,12),
    inquiryNotes: "310,000 SF distribution center in Louisville Riverport Industrial Park. 2016 vintage. 100% leased to national e-commerce tenant (Amazon 3PL) with 6 years remaining. Strong covenant. Refinance." },
  { applicationId: "seed_a57", updatedAt: d(2026,3,10),
    inquiryNotes: "112-unit boutique multifamily in Denver Capitol Hill. 2014 vintage. 95% occupied, in-place rents at market. Existing borrower — refinance of balance sheet loan. Straightforward 10-year fixed rate request." },
  { applicationId: "seed_a58", updatedAt: d(2026,3,8),
    inquiryNotes: "72,000 SF Class B office in Knoxville CBD. 2011 vintage. 87% leased, mix of legal and government tenants. Bridge financing to facilitate purchase — current loan in maturity default, seller wants clean exit." },
  // a59–a65: Pre-close
  { applicationId: "seed_a59", updatedAt: d(2026,3,25),
    inquiryNotes: "9-unit grocery-anchored retail center in Akron Summit County. 2005 vintage. National grocery anchor with 8 years remaining NNN, plus 8 in-line tenants. 96% leased. Refinance at maturing balloon. Strong performance throughout cycle." },
  { applicationId: "seed_a60", updatedAt: d(2026,3,22),
    inquiryNotes: "380,000 SF Class A industrial park in Fresno Central Valley. 2013 vintage. 100% leased to two food processing and cold-storage tenants. NNN leases. Acquisition at $26M — off-market transaction from family office." },
  { applicationId: "seed_a61", updatedAt: d(2026,3,20),
    inquiryNotes: "72-unit mixed-use in Long Beach 2nd Street corridor. 2018 vintage. Street-level restaurant and boutique retail, 68 apartments above (97% occupied). Refinance of agency bridge at favorable rate." },
  { applicationId: "seed_a62", updatedAt: d(2026,3,18),
    inquiryNotes: "58,000 SF suburban office park in Spokane Valley. 2010 vintage. 89% leased — medical, legal, insurance tenants. Refinance of 7-year loan maturing Q3 2026. Borrower has held since 2019 acquisition." },
  { applicationId: "seed_a63", updatedAt: d(2026,3,16),
    inquiryNotes: "200-unit garden apartment community in Colorado Springs Briargate. 2015 vintage. 96% occupied. Strong rent growth driven by USAFA and tech sector expansion. Refinance of maturing bridge loan." },
  { applicationId: "seed_a64", updatedAt: d(2026,3,14),
    inquiryNotes: "128-unit mid-rise multifamily in Lexington, KY near University of Kentucky. 2017 vintage. 95% occupied, workforce housing profile. Acquisition at $17.5M — seller is syndicator exiting LP structure." },
  { applicationId: "seed_a65", updatedAt: d(2026,3,12),
    inquiryNotes: "52,000 SF suburban office in Des Moines Waukee submarket. 2012 vintage. 92% leased — dominated by insurance and financial services tenants. Partial IO structure requested for 10-year fixed." },
  // a66–a72: Ready for Docs
  { applicationId: "seed_a66", updatedAt: d(2026,3,28),
    inquiryNotes: "6-unit unanchored retail strip in Little Rock west suburbs. 2009 vintage. 100% leased to service and QSR tenants. Strong trailing NOI. Refinance of 10-year balloon maturing in June." },
  { applicationId: "seed_a67", updatedAt: d(2026,3,26),
    inquiryNotes: "220,000 SF industrial park in Shreveport LA. 2010 vintage. 100% leased to three NNN tenants — oilfield services, manufacturing, freight forwarding. Acquisition at $22M by experienced industrial operator." },
  { applicationId: "seed_a68", updatedAt: d(2026,3,24),
    inquiryNotes: "40-unit mixed-use in Birmingham Avondale neighborhood. 2016 vintage. Ground floor brewery and restaurant tenants (NNN, 5+ years remaining) + 36 apartments above (97% occupied). Refinance of construction loan." },
  { applicationId: "seed_a69", updatedAt: d(2026,3,22),
    inquiryNotes: "160-unit garden multifamily in Aurora CO Havana/Mississippi corridor. 2016 vintage. 94% occupied, workforce housing with strong fundamentals. Acquisition at $25M — seller is syndicator liquidating." },
  { applicationId: "seed_a70", updatedAt: d(2026,3,20),
    inquiryNotes: "78,000 SF Class A office in Tempe AZ Hayden Ferry Lakeside. 2015 vintage. 89% leased. Mix of ASU-affiliated and technology tenants. Refinance of CMBS loan at balloon." },
  { applicationId: "seed_a71", updatedAt: d(2026,3,18),
    inquiryNotes: "108-unit luxury multifamily in Scottsdale Old Town area. 2019 vintage. 96% occupied, premium rents. Existing borrower — pulling equity from stabilized asset. 10-year fixed rate." },
  { applicationId: "seed_a72", updatedAt: d(2026,3,16),
    inquiryNotes: "8-unit retail center in Chandler AZ Price Rd corridor. 2007 vintage. National tenant mix — fitness, dental, QSR. 88% occupied. Acquisition at $3.4M — part of larger portfolio disposition." },
  // a73–a76: Docs Drawn
  { applicationId: "seed_a73", updatedAt: d(2026,3,30),
    inquiryNotes: "86,000 SF Class A office campus in Plano TX Legacy Town Center. 2014 vintage. 91% occupied, strong corporate tenant base. Refinance of CMBS balloon at favorable rate. Well-capitalized borrower." },
  { applicationId: "seed_a74", updatedAt: d(2026,3,28),
    inquiryNotes: "195,000 SF industrial distribution center in Garland TX. 2012 vintage. 97% leased to two NNN tenants. National manufacturing company (anchor, 10 years remaining) + regional wholesaler (secondary, 3 years). Acquisition." },
  { applicationId: "seed_a75", updatedAt: d(2026,3,26),
    inquiryNotes: "144-unit garden multifamily in Fort Worth South Hulen area. 2018 vintage. 95% occupied. Strong Fort Worth fundamentals — workforce housing with good walkability scores. Refinance at balloon." },
  { applicationId: "seed_a76", updatedAt: d(2026,3,24),
    inquiryNotes: "68,000 SF suburban office in Arlington TX near AT&T Stadium. 2013 vintage. 88% occupied — legal, medical, professional services tenants. Refinance of maturing 10-year fixed rate loan." },
  // a77–a80: Docs Back
  { applicationId: "seed_a77", updatedAt: d(2026,3,31),
    inquiryNotes: "7-unit strip retail in Irving TX near DFW Airport. 2008 vintage. 86% occupied, travel-related and QSR tenants. Refinance of balloon. Borrower has held 12 years — clean operating history." },
  { applicationId: "seed_a78", updatedAt: d(2026,3,29),
    inquiryNotes: "240,000 SF Class A industrial in Frisco TX. 2017 vintage. 100% leased — single national tenant, electronics manufacturer, NNN with 8 years remaining. Strong credit. Acquisition at $39M." },
  { applicationId: "seed_a79", updatedAt: d(2026,3,27),
    inquiryNotes: "180-unit garden multifamily in McKinney TX. 2020 vintage. 97% occupied. Strong DFW suburban fundamentals. Bridge financing — existing construction loan balloon imminent. Refinance into longer-term permanent." },
  { applicationId: "seed_a80", updatedAt: d(2026,3,25),
    inquiryNotes: "44,000 SF suburban office in San Marcos TX. 2016 vintage. 91% leased, dominated by healthcare and university-affiliated tenants. Refinance. Borrower is local owner-operator with 20+ year track record." },
  // a81–a84: Closing
  { applicationId: "seed_a81", updatedAt: d(2026,3,31),
    inquiryNotes: "5-unit grocery-anchored retail strip in Laredo TX. 2010 vintage. 84% occupied — regional grocery anchor + 4 in-line service tenants. Acquisition at $4.8M. Motivated seller at below-replacement-cost pricing." },
  { applicationId: "seed_a82", updatedAt: d(2026,3,30),
    inquiryNotes: "295,000 SF Class A industrial in Lubbock TX. 2014 vintage. 96% leased to two tenants — national food distribution company (anchor) and regional agriculture equipment supplier. Refinance." },
  { applicationId: "seed_a83", updatedAt: d(2026,3,29),
    inquiryNotes: "55,000 SF Class B office in Fort Lauderdale Las Olas. 2006 vintage. 72% occupied. Bridge financing to bridge to stabilization — major lease-up in progress with 3 signed LOIs. Value-add opportunity." },
  { applicationId: "seed_a84", updatedAt: d(2026,3,28),
    inquiryNotes: "4-unit boutique retail in Boulder Pearl Street corridor. 2002 vintage. 75% occupied — premium Boulder retail location, below-market rents. Acquisition at $5.5M. Borrower plans to mark rents to market on rollover." },
  // a85–a100: Terminal apps
  { applicationId: "seed_a85", updatedAt: d(2026,3,20),
    inquiryNotes: "96-unit multifamily in Fort Collins CO. Inquiry canceled — borrower was unable to agree on purchase price with seller. Property went under contract with all-cash buyer." },
  { applicationId: "seed_a86", updatedAt: d(2026,3,10),
    inquiryNotes: "65,000 SF office in Pasadena CA. Inquiry canceled — environmental phase II report revealed soil contamination requiring remediation. Borrower elected not to proceed." },
  { applicationId: "seed_a87", updatedAt: d(2026,2,5),
    inquiryNotes: "140,000 SF industrial in New Haven CT. Inquiry canceled — anchor tenant provided notice of non-renewal (lease expiring in 8 months). Collateral risk unacceptable at current leverage." },
  { applicationId: "seed_a88", updatedAt: d(2025,12,28),
    inquiryNotes: "28-unit mixed-use in Wilmington DE. Inquiry canceled — property failed to appraise at contract price. Seller unwilling to renegotiate. Transaction terminated." },
  { applicationId: "seed_a89", updatedAt: d(2025,11,22),
    inquiryNotes: "88-unit multifamily in Savannah GA. Inquiry canceled — borrower failed to provide financial statements within required timeframe. Opportunity lost to competing lender." },
  { applicationId: "seed_a90", updatedAt: d(2026,3,15),
    inquiryNotes: "48,000 SF office in Tallahassee FL. Borrower withdrew inquiry — decided to pursue sale of asset rather than refinance. Currently listing with commercial broker at $7.2M." },
  { applicationId: "seed_a91", updatedAt: d(2026,1,28),
    inquiryNotes: "6-unit retail strip in Pensacola FL. Borrower withdrew — decided to sell asset. Accepted offer from 1031 exchange buyer. Relationship maintained for future financing opportunities." },
  { applicationId: "seed_a92", updatedAt: d(2025,12,10),
    inquiryNotes: "104-unit multifamily in Knoxville TN. Borrower withdrew — chose to recapitalize with existing equity partner rather than introduce bank debt. May return in 12-18 months for refinance." },
  { applicationId: "seed_a93", updatedAt: d(2025,11,5),
    inquiryNotes: "42,000 SF office in Columbia SC. Borrower withdrew — decided to take competing offer from life insurance company lender at slightly lower rate. Good relationship maintained." },
  { applicationId: "seed_a94", updatedAt: d(2026,3,1),
    inquiryNotes: "Multifamily acquisition in Jackson MS. Inquiry denied — appraisal came in 18% below contract price. LTV would exceed 85% at appraised value. Borrower declined to put additional equity in." },
  { applicationId: "seed_a95", updatedAt: d(2026,1,20),
    inquiryNotes: "Office building acquisition in Providence RI. Inquiry denied — DSCR of 0.88 well below 1.20 minimum at underwritten rents. Significant vacancy and below-market in-place rents made deal infeasible." },
  { applicationId: "seed_a96", updatedAt: d(2025,12,15),
    inquiryNotes: "Multifamily in Baton Rouge LA. Application withdrawn by borrower — deal fell through after seller discovered a competing off-market offer. Borrower may re-engage on similar assets." },
  { applicationId: "seed_a97", updatedAt: d(2025,11,20),
    inquiryNotes: "Bridge loan on mixed-use in Tulsa OK. Borrower withdrew application — cash-flow issues at another property in portfolio created concerns about guarantor financial strength. Will re-engage when resolved." },
  { applicationId: "seed_a98", updatedAt: d(2025,12,20),
    inquiryNotes: "Construction financing for office development in Omaha NE. Application canceled — anchor pre-lease tenant backed out of letter of intent. Project cancelled pending new pre-lease anchor." },
  { applicationId: "seed_a99", updatedAt: d(2025,10,30),
    inquiryNotes: "Multifamily acquisition in Birmingham AL. Application denied — sponsor financial review revealed undisclosed federal tax liens totaling $2.8M. Borrower unable to cure within transaction timeline." },
  { applicationId: "seed_a100", updatedAt: d(2025,9,15),
    inquiryNotes: "Office refinance in Albuquerque NM. Application denied — property operating at 77% occupancy with DSCR of 1.02, well below policy minimums. Significant upcoming lease expirations further weakened the credit." },
];

const SEED_RENT_ROLL: RentRollUnit[] = [
  // a04 — Multifamily LA (120 units, p04→a04)
  { id: "seed_rr_a04_01", applicationId: "seed_a04", createdAt: d(2026,1,1), updatedAt: d(2026,1,1),
    unitIdentifier: "101", unitType: "Studio", bedroomCount: "0", bathroomCount: "1",
    squareFeet: "550", tenantName: "Rodriguez, M.", leaseStatus: "Occupied",
    leaseBeginDate: ds(2025,6,1), leaseEndDate: ds(2026,5,31),
    monthlyRentAmount: "2,150", marketRentAmount: "2,200",
    annualBaseRentAmount: "", baseRentPsf: "", leaseType: "", renewalOptions: "", tenantIndustry: "" },
  { id: "seed_rr_a04_02", applicationId: "seed_a04", createdAt: d(2026,1,1), updatedAt: d(2026,1,1),
    unitIdentifier: "102", unitType: "1BR/1BA", bedroomCount: "1", bathroomCount: "1",
    squareFeet: "720", tenantName: "Park, J.", leaseStatus: "Occupied",
    leaseBeginDate: ds(2025,3,1), leaseEndDate: ds(2026,2,28),
    monthlyRentAmount: "2,850", marketRentAmount: "2,950",
    annualBaseRentAmount: "", baseRentPsf: "", leaseType: "", renewalOptions: "", tenantIndustry: "" },
  { id: "seed_rr_a04_03", applicationId: "seed_a04", createdAt: d(2026,1,1), updatedAt: d(2026,1,1),
    unitIdentifier: "201", unitType: "1BR/1BA", bedroomCount: "1", bathroomCount: "1",
    squareFeet: "720", tenantName: "", leaseStatus: "Vacant",
    leaseBeginDate: "", leaseEndDate: "",
    monthlyRentAmount: "", marketRentAmount: "2,950",
    annualBaseRentAmount: "", baseRentPsf: "", leaseType: "", renewalOptions: "", tenantIndustry: "" },
  { id: "seed_rr_a04_04", applicationId: "seed_a04", createdAt: d(2026,1,1), updatedAt: d(2026,1,1),
    unitIdentifier: "205", unitType: "2BR/2BA", bedroomCount: "2", bathroomCount: "2",
    squareFeet: "1,050", tenantName: "Williams, T. & S.", leaseStatus: "Occupied",
    leaseBeginDate: ds(2024,9,1), leaseEndDate: ds(2026,8,31),
    monthlyRentAmount: "3,850", marketRentAmount: "4,000",
    annualBaseRentAmount: "", baseRentPsf: "", leaseType: "", renewalOptions: "", tenantIndustry: "" },
  { id: "seed_rr_a04_05", applicationId: "seed_a04", createdAt: d(2026,1,1), updatedAt: d(2026,1,1),
    unitIdentifier: "310", unitType: "2BR/2BA+Den", bedroomCount: "2", bathroomCount: "2",
    squareFeet: "1,220", tenantName: "Kim, A.", leaseStatus: "Occupied",
    leaseBeginDate: ds(2025,1,1), leaseEndDate: ds(2026,12,31),
    monthlyRentAmount: "4,400", marketRentAmount: "4,500",
    annualBaseRentAmount: "", baseRentPsf: "", leaseType: "", renewalOptions: "", tenantIndustry: "" },
  { id: "seed_rr_a04_06", applicationId: "seed_a04", createdAt: d(2026,1,1), updatedAt: d(2026,1,1),
    unitIdentifier: "401", unitType: "3BR/2BA", bedroomCount: "3", bathroomCount: "2",
    squareFeet: "1,480", tenantName: "Johnson, R.", leaseStatus: "Notice",
    leaseBeginDate: ds(2024,4,1), leaseEndDate: ds(2026,3,31),
    monthlyRentAmount: "5,200", marketRentAmount: "5,500",
    annualBaseRentAmount: "", baseRentPsf: "", leaseType: "", renewalOptions: "", tenantIndustry: "" },
  // a08 — Multifamily Atlanta (224 units, p08→a08)
  { id: "seed_rr_a08_01", applicationId: "seed_a08", createdAt: d(2026,1,1), updatedAt: d(2026,1,1),
    unitIdentifier: "1A", unitType: "Studio", bedroomCount: "0", bathroomCount: "1",
    squareFeet: "490", tenantName: "Patel, S.", leaseStatus: "Occupied",
    leaseBeginDate: ds(2025,8,1), leaseEndDate: ds(2026,7,31),
    monthlyRentAmount: "1,750", marketRentAmount: "1,800",
    annualBaseRentAmount: "", baseRentPsf: "", leaseType: "", renewalOptions: "", tenantIndustry: "" },
  { id: "seed_rr_a08_02", applicationId: "seed_a08", createdAt: d(2026,1,1), updatedAt: d(2026,1,1),
    unitIdentifier: "2B", unitType: "1BR/1BA", bedroomCount: "1", bathroomCount: "1",
    squareFeet: "680", tenantName: "Thompson, C.", leaseStatus: "Occupied",
    leaseBeginDate: ds(2025,2,1), leaseEndDate: ds(2026,1,31),
    monthlyRentAmount: "2,200", marketRentAmount: "2,300",
    annualBaseRentAmount: "", baseRentPsf: "", leaseType: "", renewalOptions: "", tenantIndustry: "" },
  { id: "seed_rr_a08_03", applicationId: "seed_a08", createdAt: d(2026,1,1), updatedAt: d(2026,1,1),
    unitIdentifier: "4C", unitType: "2BR/2BA", bedroomCount: "2", bathroomCount: "2",
    squareFeet: "980", tenantName: "Garcia, M. & L.", leaseStatus: "Occupied",
    leaseBeginDate: ds(2024,11,1), leaseEndDate: ds(2026,10,31),
    monthlyRentAmount: "3,100", marketRentAmount: "3,250",
    annualBaseRentAmount: "", baseRentPsf: "", leaseType: "", renewalOptions: "", tenantIndustry: "" },
  { id: "seed_rr_a08_04", applicationId: "seed_a08", createdAt: d(2026,1,1), updatedAt: d(2026,1,1),
    unitIdentifier: "5D", unitType: "2BR/2BA", bedroomCount: "2", bathroomCount: "2",
    squareFeet: "980", tenantName: "Lee, H.", leaseStatus: "Occupied",
    leaseBeginDate: ds(2025,5,1), leaseEndDate: ds(2026,4,30),
    monthlyRentAmount: "3,200", marketRentAmount: "3,250",
    annualBaseRentAmount: "", baseRentPsf: "", leaseType: "", renewalOptions: "", tenantIndustry: "" },
  { id: "seed_rr_a08_05", applicationId: "seed_a08", createdAt: d(2026,1,1), updatedAt: d(2026,1,1),
    unitIdentifier: "7A", unitType: "3BR/2BA", bedroomCount: "3", bathroomCount: "2",
    squareFeet: "1,380", tenantName: "Brown, K.", leaseStatus: "Occupied",
    leaseBeginDate: ds(2025,7,1), leaseEndDate: ds(2027,6,30),
    monthlyRentAmount: "4,100", marketRentAmount: "4,300",
    annualBaseRentAmount: "", baseRentPsf: "", leaseType: "", renewalOptions: "", tenantIndustry: "" },
  { id: "seed_rr_a08_06", applicationId: "seed_a08", createdAt: d(2026,1,1), updatedAt: d(2026,1,1),
    unitIdentifier: "8B", unitType: "1BR/1BA", bedroomCount: "1", bathroomCount: "1",
    squareFeet: "680", tenantName: "", leaseStatus: "Vacant",
    leaseBeginDate: "", leaseEndDate: "",
    monthlyRentAmount: "", marketRentAmount: "2,300",
    annualBaseRentAmount: "", baseRentPsf: "", leaseType: "", renewalOptions: "", tenantIndustry: "" },
  // a05 — Mixed Use Chicago (48 units, p05→a05)
  { id: "seed_rr_a05_01", applicationId: "seed_a05", createdAt: d(2026,1,1), updatedAt: d(2026,1,1),
    unitIdentifier: "2A", unitType: "1BR/1BA", bedroomCount: "1", bathroomCount: "1",
    squareFeet: "750", tenantName: "Walsh, D.", leaseStatus: "Occupied",
    leaseBeginDate: ds(2025,4,1), leaseEndDate: ds(2026,3,31),
    monthlyRentAmount: "2,600", marketRentAmount: "2,700",
    annualBaseRentAmount: "", baseRentPsf: "", leaseType: "", renewalOptions: "", tenantIndustry: "" },
  { id: "seed_rr_a05_02", applicationId: "seed_a05", createdAt: d(2026,1,1), updatedAt: d(2026,1,1),
    unitIdentifier: "3B", unitType: "2BR/2BA", bedroomCount: "2", bathroomCount: "2",
    squareFeet: "1,100", tenantName: "Chen, W. & Y.", leaseStatus: "Occupied",
    leaseBeginDate: ds(2024,10,1), leaseEndDate: ds(2026,9,30),
    monthlyRentAmount: "3,700", marketRentAmount: "3,850",
    annualBaseRentAmount: "", baseRentPsf: "", leaseType: "", renewalOptions: "", tenantIndustry: "" },
  { id: "seed_rr_a05_03", applicationId: "seed_a05", createdAt: d(2026,1,1), updatedAt: d(2026,1,1),
    unitIdentifier: "Suite 101", unitType: "Retail", bedroomCount: "0", bathroomCount: "0",
    squareFeet: "4,200", tenantName: "Lakeside Coffee Co.", leaseStatus: "Occupied",
    leaseBeginDate: ds(2023,1,1), leaseEndDate: ds(2028,12,31),
    monthlyRentAmount: "", marketRentAmount: "",
    annualBaseRentAmount: "210,000", baseRentPsf: "50.00",
    leaseType: "NNN", renewalOptions: "Two 5-year options at 3% annual escalation", tenantIndustry: "Food & Beverage" },
  { id: "seed_rr_a05_04", applicationId: "seed_a05", createdAt: d(2026,1,1), updatedAt: d(2026,1,1),
    unitIdentifier: "Suite 102", unitType: "Office", bedroomCount: "0", bathroomCount: "0",
    squareFeet: "2,800", tenantName: "Midwest Financial Group", leaseStatus: "Occupied",
    leaseBeginDate: ds(2022,6,1), leaseEndDate: ds(2027,5,31),
    monthlyRentAmount: "", marketRentAmount: "",
    annualBaseRentAmount: "168,000", baseRentPsf: "60.00",
    leaseType: "Modified Gross", renewalOptions: "One 3-year option", tenantIndustry: "Financial Services" },
  // a02 — Retail NY (12 units, p02→a02)
  { id: "seed_rr_a02_01", applicationId: "seed_a02", createdAt: d(2026,1,1), updatedAt: d(2026,1,1),
    unitIdentifier: "G-01", unitType: "Retail", bedroomCount: "0", bathroomCount: "0",
    squareFeet: "8,500", tenantName: "National Pharmacy Partners", leaseStatus: "Occupied",
    leaseBeginDate: ds(2017,3,1), leaseEndDate: ds(2035,2,28),
    monthlyRentAmount: "", marketRentAmount: "",
    annualBaseRentAmount: "1,275,000", baseRentPsf: "150.00",
    leaseType: "NNN", renewalOptions: "Four 5-year options at fixed rent", tenantIndustry: "Pharmacy / Healthcare Retail" },
  { id: "seed_rr_a02_02", applicationId: "seed_a02", createdAt: d(2026,1,1), updatedAt: d(2026,1,1),
    unitIdentifier: "G-02", unitType: "Retail", bedroomCount: "0", bathroomCount: "0",
    squareFeet: "4,200", tenantName: "Luxe Apparel NYC", leaseStatus: "Occupied",
    leaseBeginDate: ds(2021,9,1), leaseEndDate: ds(2028,8,31),
    monthlyRentAmount: "", marketRentAmount: "",
    annualBaseRentAmount: "756,000", baseRentPsf: "180.00",
    leaseType: "NNN", renewalOptions: "One 5-year option", tenantIndustry: "Luxury Retail" },
  { id: "seed_rr_a02_03", applicationId: "seed_a02", createdAt: d(2026,1,1), updatedAt: d(2026,1,1),
    unitIdentifier: "G-03", unitType: "Retail", bedroomCount: "0", bathroomCount: "0",
    squareFeet: "3,100", tenantName: "", leaseStatus: "Vacant",
    leaseBeginDate: "", leaseEndDate: "",
    monthlyRentAmount: "", marketRentAmount: "",
    annualBaseRentAmount: "", baseRentPsf: "175.00",
    leaseType: "NNN", renewalOptions: "", tenantIndustry: "" },
];

const SEED_OP_HISTORY: OperatingYear[] = [
  // a04 — Multifamily LA (p04→a04)
  { id: "seed_oh_a04_1", applicationId: "seed_a04", createdAt: d(2026,1,1), updatedAt: d(2026,1,1),
    periodType: "Actual Year 1", periodYear: "2023", ytdMonths: "",
    grossPotentialRent: "3,888,000", vacancyAndCreditLoss: "311,040", otherIncome: "72,000",
    effectiveGrossIncome: "3,648,960", realEstateTaxes: "268,000", insurance: "88,000",
    utilities: "172,000", repairsAndMaintenance: "228,000", managementFee: "182,448",
    administrative: "80,000", replacementReserves: "36,000", otherExpenses: "38,000",
    totalOperatingExpenses: "1,092,448", netOperatingIncome: "2,556,512" },
  { id: "seed_oh_a04_2", applicationId: "seed_a04", createdAt: d(2026,1,1), updatedAt: d(2026,1,1),
    periodType: "Actual Year 2", periodYear: "2024", ytdMonths: "",
    grossPotentialRent: "4,032,000", vacancyAndCreditLoss: "282,240", otherIncome: "80,000",
    effectiveGrossIncome: "3,829,760", realEstateTaxes: "278,000", insurance: "92,000",
    utilities: "176,000", repairsAndMaintenance: "236,000", managementFee: "191,488",
    administrative: "83,000", replacementReserves: "36,000", otherExpenses: "40,000",
    totalOperatingExpenses: "1,132,488", netOperatingIncome: "2,697,272" },
  { id: "seed_oh_a04_3", applicationId: "seed_a04", createdAt: d(2026,1,1), updatedAt: d(2026,1,1),
    periodType: "T12 (Trailing 12)", periodYear: "2025", ytdMonths: "",
    grossPotentialRent: "4,176,000", vacancyAndCreditLoss: "292,320", otherIncome: "85,000",
    effectiveGrossIncome: "3,968,680", realEstateTaxes: "285,000", insurance: "95,000",
    utilities: "180,000", repairsAndMaintenance: "242,000", managementFee: "198,434",
    administrative: "86,000", replacementReserves: "36,000", otherExpenses: "42,000",
    totalOperatingExpenses: "1,164,434", netOperatingIncome: "2,804,246" },
  // a08 — Multifamily Atlanta (p08→a08)
  { id: "seed_oh_a08_1", applicationId: "seed_a08", createdAt: d(2026,1,1), updatedAt: d(2026,1,1),
    periodType: "Actual Year 1", periodYear: "2024", ytdMonths: "",
    grossPotentialRent: "7,526,400", vacancyAndCreditLoss: "376,320", otherIncome: "145,000",
    effectiveGrossIncome: "7,295,080", realEstateTaxes: "510,000", insurance: "196,000",
    utilities: "324,000", repairsAndMaintenance: "448,000", managementFee: "364,754",
    administrative: "158,000", replacementReserves: "67,200", otherExpenses: "72,000",
    totalOperatingExpenses: "2,139,954", netOperatingIncome: "5,155,126" },
  { id: "seed_oh_a08_2", applicationId: "seed_a08", createdAt: d(2026,1,1), updatedAt: d(2026,1,1),
    periodType: "T12 (Trailing 12)", periodYear: "2025", ytdMonths: "",
    grossPotentialRent: "7,795,200", vacancyAndCreditLoss: "233,856", otherIncome: "158,000",
    effectiveGrossIncome: "7,719,344", realEstateTaxes: "525,000", insurance: "204,000",
    utilities: "332,000", repairsAndMaintenance: "462,000", managementFee: "385,967",
    administrative: "164,000", replacementReserves: "67,200", otherExpenses: "76,000",
    totalOperatingExpenses: "2,216,167", netOperatingIncome: "5,503,177" },
  // a03 — Industrial Atlanta (p03→a03)
  { id: "seed_oh_a03_1", applicationId: "seed_a03", createdAt: d(2026,1,1), updatedAt: d(2026,1,1),
    periodType: "T12 (Trailing 12)", periodYear: "2025", ytdMonths: "",
    grossPotentialRent: "4,368,000", vacancyAndCreditLoss: "218,400", otherIncome: "24,000",
    effectiveGrossIncome: "4,173,600", realEstateTaxes: "312,000", insurance: "145,000",
    utilities: "48,000", repairsAndMaintenance: "186,000", managementFee: "208,680",
    administrative: "72,000", replacementReserves: "62,400", otherExpenses: "28,000",
    totalOperatingExpenses: "1,062,080", netOperatingIncome: "3,111,520" },
  // a02 — Retail NY (p02→a02)
  { id: "seed_oh_a02_1", applicationId: "seed_a02", createdAt: d(2026,1,1), updatedAt: d(2026,1,1),
    periodType: "T12 (Trailing 12)", periodYear: "2025", ytdMonths: "",
    grossPotentialRent: "2,356,200", vacancyAndCreditLoss: "235,620", otherIncome: "18,000",
    effectiveGrossIncome: "2,138,580", realEstateTaxes: "188,000", insurance: "72,000",
    utilities: "0", repairsAndMaintenance: "62,000", managementFee: "106,929",
    administrative: "38,000", replacementReserves: "18,250", otherExpenses: "22,000",
    totalOperatingExpenses: "507,179", netOperatingIncome: "1,631,401" },
];

// ─── Context ──────────────────────────────────────────────────────────────────

const [InquiryServiceProvider, useInquiryService] = createContextHook(() => {
  const [notes, setNotes] = useState<InquiryRecord[]>([]);
  const [rentRoll, setRentRoll] = useState<RentRollUnit[]>([]);
  const [opHistory, setOpHistory] = useState<OperatingYear[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(KEYS.notes),
      AsyncStorage.getItem(KEYS.rentRoll),
      AsyncStorage.getItem(KEYS.opHistory),
    ]).then(([n, rr, oh]) => {
      if (n) setNotes(JSON.parse(n));
      if (rr) setRentRoll(JSON.parse(rr));
      if (oh) setOpHistory(JSON.parse(oh));
      setLoading(false);
    });
  }, []);

  const persistNotes = useCallback(async (data: InquiryRecord[]) => {
    setNotes(data);
    await AsyncStorage.setItem(KEYS.notes, JSON.stringify(data));
  }, []);

  const persistRentRoll = useCallback(async (data: RentRollUnit[]) => {
    setRentRoll(data);
    await AsyncStorage.setItem(KEYS.rentRoll, JSON.stringify(data));
  }, []);

  const persistOpHistory = useCallback(async (data: OperatingYear[]) => {
    setOpHistory(data);
    await AsyncStorage.setItem(KEYS.opHistory, JSON.stringify(data));
  }, []);

  // ── Notes ──────────────────────────────────────────────────────────────────

  const getOrCreateNotes = useCallback((applicationId: string): InquiryRecord => {
    return notes.find((n) => n.applicationId === applicationId) ??
      { applicationId, inquiryNotes: "", updatedAt: now() };
  }, [notes]);

  const updateNotes = useCallback(async (applicationId: string, inquiryNotes: string) => {
    const existing = notes.find((n) => n.applicationId === applicationId);
    if (existing) {
      await persistNotes(notes.map((n) => n.applicationId === applicationId
        ? { ...n, inquiryNotes, updatedAt: now() } : n));
    } else {
      await persistNotes([...notes, { applicationId, inquiryNotes, updatedAt: now() }]);
    }
  }, [notes, persistNotes]);

  // ── Rent Roll ──────────────────────────────────────────────────────────────

  const getRentRoll = useCallback((applicationId: string) =>
    rentRoll.filter((u) => u.applicationId === applicationId), [rentRoll]);

  const addUnit = useCallback(async (applicationId: string, data: Omit<RentRollUnit, "id" | "applicationId" | "createdAt" | "updatedAt">): Promise<RentRollUnit> => {
    const unit: RentRollUnit = { id: uid(), applicationId, createdAt: now(), updatedAt: now(), ...data };
    await persistRentRoll([...rentRoll, unit]);
    return unit;
  }, [rentRoll, persistRentRoll]);

  const updateUnit = useCallback(async (id: string, patch: Partial<RentRollUnit>) => {
    await persistRentRoll(rentRoll.map((u) => u.id === id ? { ...u, ...patch, updatedAt: now() } : u));
  }, [rentRoll, persistRentRoll]);

  const deleteUnit = useCallback(async (id: string) => {
    await persistRentRoll(rentRoll.filter((u) => u.id !== id));
  }, [rentRoll, persistRentRoll]);

  // ── Operating History ──────────────────────────────────────────────────────

  const getOpHistory = useCallback((applicationId: string) =>
    opHistory.filter((y) => y.applicationId === applicationId), [opHistory]);

  const addYear = useCallback(async (applicationId: string, data: Omit<OperatingYear, "id" | "applicationId" | "createdAt" | "updatedAt">): Promise<OperatingYear> => {
    // Always recompute derived fields server-side; ignore any client-supplied values.
    const calcs = computeOpYearCalcs(data);
    const year: OperatingYear = { id: uid(), applicationId, createdAt: now(), updatedAt: now(), ...data, ...calcs };
    await persistOpHistory([...opHistory, year]);
    return year;
  }, [opHistory, persistOpHistory]);

  const updateYear = useCallback(async (id: string, patch: Partial<OperatingYear>) => {
    await persistOpHistory(opHistory.map((y) => {
      if (y.id !== id) return y;
      // Merge patch with existing record, then recompute derived fields.
      const merged = { ...y, ...patch };
      const calcs = computeOpYearCalcs(merged);
      return { ...merged, ...calcs, updatedAt: now() };
    }));
  }, [opHistory, persistOpHistory]);

  const deleteYear = useCallback(async (id: string) => {
    await persistOpHistory(opHistory.filter((y) => y.id !== id));
  }, [opHistory, persistOpHistory]);

  // ── Seed / Clear ───────────────────────────────────────────────────────────

  const loadSeedData = useCallback(async () => {
    await Promise.all([
      persistNotes(SEED_NOTES),
      persistRentRoll(SEED_RENT_ROLL),
      persistOpHistory(SEED_OP_HISTORY),
    ]);
  }, [persistNotes, persistRentRoll, persistOpHistory]);

  const clearData = useCallback(async () => {
    await Promise.all([persistNotes([]), persistRentRoll([]), persistOpHistory([])]);
  }, [persistNotes, persistRentRoll, persistOpHistory]);

  const clearForApplication = useCallback(async (applicationId: string) => {
    await Promise.all([
      persistNotes(notes.filter((n) => n.applicationId !== applicationId)),
      persistRentRoll(rentRoll.filter((u) => u.applicationId !== applicationId)),
      persistOpHistory(opHistory.filter((y) => y.applicationId !== applicationId)),
    ]);
  }, [notes, rentRoll, opHistory, persistNotes, persistRentRoll, persistOpHistory]);

  return {
    loading,
    getOrCreateNotes, updateNotes,
    getRentRoll, addUnit, updateUnit, deleteUnit,
    getOpHistory, addYear, updateYear, deleteYear,
    loadSeedData, clearData, clearForApplication,
  };
});

export { InquiryServiceProvider, useInquiryService };
