import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { FormField } from "@/components/FormField";
import { SelectField } from "@/components/SelectField";
import { SectionHeader } from "@/components/SectionHeader";
import Colors from "@/constants/colors";
import type {
  AmortizationType,
  InterestType,
  LoanType,
  PropertyType,
} from "@/services/core";
import { useCoreService } from "@/services/core";

const STEPS = ["Property", "Occupancy", "Loan Terms", "Borrower", "Review"];

const PROPERTY_TYPES: PropertyType[] = [
  "Office", "Retail", "Industrial", "Multifamily", "Mixed Use",
  "Hotel", "Self Storage", "Healthcare", "Land",
];
const LOAN_TYPES: LoanType[] = ["Acquisition", "Refinance", "Construction", "Bridge", "Permanent"];
const INTEREST_TYPES: InterestType[] = ["Fixed", "Floating", "Hybrid"];
const AMORT_TYPES: AmortizationType[] = ["Full Amortizing", "Interest Only", "Partial IO"];

export default function NewApplicationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getApplication, getBorrower, getProperty, updateApplication, updateBorrower, updateProperty } =
    useCoreService();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);

  const app = getApplication(id);
  const borrower = getBorrower(app?.borrowerId ?? "");
  const property = getProperty(app?.propertyId ?? "");

  const [propForm, setPropForm] = useState({
    streetAddress: property?.streetAddress ?? "",
    city: property?.city ?? "",
    state: property?.state ?? "",
    zipCode: property?.zipCode ?? "",
    propertyType: property?.propertyType ?? ("Office" as PropertyType),
    grossSqFt: property?.grossSqFt ?? "",
    numberOfUnits: property?.numberOfUnits ?? "",
    yearBuilt: property?.yearBuilt ?? "",
  });

  const [occForm, setOccForm] = useState({
    physicalOccupancyPct: property?.physicalOccupancyPct ?? "",
    economicOccupancyPct: property?.economicOccupancyPct ?? "",
  });

  const [loanForm, setLoanForm] = useState({
    loanType: app?.loanType ?? ("Acquisition" as LoanType),
    loanAmountUsd: app?.loanAmountUsd ?? "",
    loanTermYears: app?.loanTermYears ?? "",
    interestType: app?.interestType ?? ("Fixed" as InterestType),
    interestRatePct: app?.interestRatePct ?? "",
    amortizationType: app?.amortizationType ?? ("Full Amortizing" as AmortizationType),
    ltvPct: app?.ltvPct ?? "",
    dscrRatio: app?.dscrRatio ?? "",
    targetClosingDate: app?.targetClosingDate ?? "",
  });

  const [borForm, setBorForm] = useState({
    firstName: borrower?.firstName ?? "",
    lastName: borrower?.lastName ?? "",
    entityName: borrower?.entityName ?? "",
    email: borrower?.emails?.[0]?.value ?? "",
    phone: borrower?.phones?.[0]?.value ?? "",
    creExperienceYears: borrower?.creExperienceYears ?? "",
    netWorthUsd: borrower?.netWorthUsd ?? "",
    liquidityUsd: borrower?.liquidityUsd ?? "",
    creditScore: borrower?.creditScore ?? "",
  });

  if (!app || !borrower || !property) {
    return <View style={styles.center}><Text style={styles.loadingText}>Loading...</Text></View>;
  }

  const updateProp = (key: string) => (val: string) => setPropForm((f) => ({ ...f, [key]: val }));
  const updateOcc = (key: string) => (val: string) => setOccForm((f) => ({ ...f, [key]: val }));
  const updateLoan = (key: string) => (val: string) => setLoanForm((f) => ({ ...f, [key]: val }));
  const updateBor = (key: string) => (val: string) => setBorForm((f) => ({ ...f, [key]: val }));

  const saveAll = async () => {
    const hasAddress = Boolean(propForm.streetAddress || propForm.city);
    await Promise.all([
      updateProperty(property.id, {
        ...propForm,
        ...occForm,
        legalAddress: "",
        locations: hasAddress ? [{
          id: `loc_${property.id}_0`,
          label: "Main",
          streetAddress: propForm.streetAddress,
          city: propForm.city,
          state: propForm.state,
          zipCode: propForm.zipCode,
          latitude: "",
          longitude: "",
          googlePlaceId: "",
        }] : [],
      }),
      updateBorrower(borrower.id, {
        firstName: borForm.firstName,
        lastName: borForm.lastName,
        entityName: borForm.entityName,
        emails: borForm.email ? [{ label: "Primary", value: borForm.email }] : borrower.emails,
        phones: borForm.phone ? [{ label: "Primary", value: borForm.phone }] : borrower.phones,
        creExperienceYears: borForm.creExperienceYears,
        netWorthUsd: borForm.netWorthUsd,
        liquidityUsd: borForm.liquidityUsd,
        creditScore: borForm.creditScore,
      }),
      updateApplication(app.id, loanForm),
    ]);
    router.dismiss();
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: topPad + 8 }]}>
        <TouchableOpacity onPress={() => saveAll()} activeOpacity={0.7}>
          <Text style={styles.headerAction}>Save Draft</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>New Loan Application</Text>
          <Text style={styles.headerStep}>{STEPS[step]}</Text>
        </View>
        <TouchableOpacity onPress={() => saveAll()} activeOpacity={0.7}>
          <Feather name="x" size={20} color={Colors.light.textInverse} />
        </TouchableOpacity>
      </View>

      {/* ── Progress bar ── */}
      <View style={styles.progressBar}>
        <View
          style={[
            styles.progressFill,
            { width: `${((step + 1) / STEPS.length) * 100}%` },
          ]}
        />
      </View>

      {/* ── Step tabs ── */}
      <View style={styles.stepRow}>
        {STEPS.map((s, i) => (
          <TouchableOpacity
            key={s}
            style={[styles.stepTab, i === step && styles.stepTabActive, i < step && styles.stepTabDone]}
            onPress={() => i < step && setStep(i)}
            disabled={i >= step}
            activeOpacity={0.7}
          >
            <View style={[styles.stepCircle, i === step && styles.stepCircleActive, i < step && styles.stepCircleDone]}>
              {i < step
                ? <Feather name="check" size={10} color="#fff" />
                : <Text style={[styles.stepNum, i === step && styles.stepNumActive]}>{i + 1}</Text>
              }
            </View>
            <Text style={[styles.stepLabel, i === step && styles.stepLabelActive, i < step && styles.stepLabelDone]}>
              {s}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Form ── */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Step 0: Property Location */}
        {step === 0 && (
          <>
            <SectionHeader title="Location" subtitle="Physical address of the subject property" />
            <FormField label="Street Address" value={propForm.streetAddress} onChangeText={updateProp("streetAddress")} placeholder="123 Commerce Drive" required />
            <View style={styles.row}>
              <View style={styles.flex2}><FormField label="City" value={propForm.city} onChangeText={updateProp("city")} placeholder="Chicago" /></View>
              <View style={styles.gap} />
              <View style={styles.flex1}><FormField label="State" value={propForm.state} onChangeText={updateProp("state")} placeholder="IL" maxLength={2} autoCapitalize="characters" /></View>
              <View style={styles.gap} />
              <View style={styles.flex1}><FormField label="ZIP" value={propForm.zipCode} onChangeText={updateProp("zipCode")} placeholder="60601" keyboardType="number-pad" maxLength={5} /></View>
            </View>

            <SectionHeader title="Physical Attributes" subtitle="Building and structural characteristics" />
            <SelectField label="Property Type" value={propForm.propertyType} options={PROPERTY_TYPES} onChange={(v) => updateProp("propertyType")(v)} required />
            <View style={styles.row}>
              <View style={styles.flex1}><FormField label="Gross Sq Ft (SF)" value={propForm.grossSqFt} onChangeText={updateProp("grossSqFt")} placeholder="25,000" keyboardType="number-pad" hint="Rentable square footage" /></View>
              <View style={styles.gap} />
              <View style={styles.flex1}><FormField label="Rentable Units" value={propForm.numberOfUnits} onChangeText={updateProp("numberOfUnits")} placeholder="0" keyboardType="number-pad" hint="Multifamily / mixed use" /></View>
            </View>
            <FormField label="Year Built" value={propForm.yearBuilt} onChangeText={updateProp("yearBuilt")} placeholder="2005" keyboardType="number-pad" maxLength={4} />
          </>
        )}

        {/* Step 1: Occupancy */}
        {step === 1 && (
          <>
            <SectionHeader title="Occupancy Metrics" subtitle="Two distinct measures — do not conflate" />

            <View style={[styles.callout, { borderLeftColor: Colors.light.statusSubmitted }]}>
              <Text style={styles.calloutLabel}>Physical Occupancy</Text>
              <Text style={styles.calloutText}>
                Unit-based measure: percentage of rentable units currently occupied by a tenant, regardless of rent collection status.
              </Text>
            </View>
            <FormField
              label="Physical Occupancy (%)"
              value={occForm.physicalOccupancyPct}
              onChangeText={updateOcc("physicalOccupancyPct")}
              placeholder="95.0"
              keyboardType="decimal-pad"
              suffix="%"
              hint="= Occupied units ÷ Total rentable units × 100"
              required
            />

            <View style={[styles.callout, { borderLeftColor: Colors.light.accent, marginTop: 8 }]}>
              <Text style={styles.calloutLabel}>Economic Occupancy</Text>
              <Text style={styles.calloutText}>
                Revenue-based measure: percentage of scheduled gross potential rent actually collected — accounts for concessions, vacancy loss, and non-payment.
              </Text>
            </View>
            <FormField
              label="Economic Occupancy (%)"
              value={occForm.economicOccupancyPct}
              onChangeText={updateOcc("economicOccupancyPct")}
              placeholder="91.0"
              keyboardType="decimal-pad"
              suffix="%"
              hint="= Collected rent ÷ Gross potential rent × 100"
              required
            />
          </>
        )}

        {/* Step 2: Loan Terms */}
        {step === 2 && (
          <>
            <SectionHeader title="Loan Structure" subtitle="Terms and parameters of the requested financing" />
            <SelectField label="Loan Type" value={loanForm.loanType} options={LOAN_TYPES} onChange={(v) => updateLoan("loanType")(v)} required />
            <FormField label="Loan Amount (USD)" value={loanForm.loanAmountUsd} onChangeText={updateLoan("loanAmountUsd")} placeholder="5,000,000" keyboardType="number-pad" prefix="$" hint="Principal in US dollars" required />
            <View style={styles.row}>
              <View style={styles.flex1}><FormField label="LTV (%)" value={loanForm.ltvPct} onChangeText={updateLoan("ltvPct")} placeholder="65.0" keyboardType="decimal-pad" suffix="%" hint="Loan-to-value" /></View>
              <View style={styles.gap} />
              <View style={styles.flex1}><FormField label="DSCR (×)" value={loanForm.dscrRatio} onChangeText={updateLoan("dscrRatio")} placeholder="1.25" keyboardType="decimal-pad" suffix="×" hint="Debt service coverage" /></View>
            </View>
            <SelectField label="Interest Type" value={loanForm.interestType} options={INTEREST_TYPES} onChange={(v) => updateLoan("interestType")(v)} />
            <View style={styles.row}>
              <View style={styles.flex1}><FormField label="Interest Rate (% p.a.)" value={loanForm.interestRatePct} onChangeText={updateLoan("interestRatePct")} placeholder="6.50" keyboardType="decimal-pad" suffix="%" /></View>
              <View style={styles.gap} />
              <View style={styles.flex1}><FormField label="Loan Term (years)" value={loanForm.loanTermYears} onChangeText={updateLoan("loanTermYears")} placeholder="5" keyboardType="number-pad" suffix="yrs" /></View>
            </View>
            <SelectField label="Amortization" value={loanForm.amortizationType} options={AMORT_TYPES} onChange={(v) => updateLoan("amortizationType")(v)} />
            <FormField label="Target Closing Date" value={loanForm.targetClosingDate} onChangeText={updateLoan("targetClosingDate")} placeholder="MM/DD/YYYY" />
          </>
        )}

        {/* Step 3: Borrower */}
        {step === 3 && (
          <>
            <SectionHeader title="Borrower Identity" subtitle="Individual and entity information" />
            <View style={styles.row}>
              <View style={styles.flex1}><FormField label="First Name" value={borForm.firstName} onChangeText={updateBor("firstName")} placeholder="John" autoCapitalize="words" required /></View>
              <View style={styles.gap} />
              <View style={styles.flex1}><FormField label="Last Name" value={borForm.lastName} onChangeText={updateBor("lastName")} placeholder="Smith" autoCapitalize="words" required /></View>
            </View>
            <FormField label="Entity / Company Name" value={borForm.entityName} onChangeText={updateBor("entityName")} placeholder="ABC Holdings LLC" autoCapitalize="words" />
            <FormField label="Email Address" value={borForm.email} onChangeText={updateBor("email")} placeholder="john@company.com" keyboardType="email-address" autoCapitalize="none" />
            <FormField label="Phone Number" value={borForm.phone} onChangeText={updateBor("phone")} placeholder="(312) 555-0100" keyboardType="phone-pad" />

            <SectionHeader title="Financial Profile" subtitle="Used for underwriting and credit assessment" />
            <FormField label="CRE Experience (years)" value={borForm.creExperienceYears} onChangeText={updateBor("creExperienceYears")} placeholder="10" keyboardType="number-pad" suffix="yrs" hint="Commercial real estate experience" />
            <View style={styles.row}>
              <View style={styles.flex1}><FormField label="Net Worth (USD)" value={borForm.netWorthUsd} onChangeText={updateBor("netWorthUsd")} placeholder="5,000,000" keyboardType="number-pad" prefix="$" /></View>
              <View style={styles.gap} />
              <View style={styles.flex1}><FormField label="Liquid Assets (USD)" value={borForm.liquidityUsd} onChangeText={updateBor("liquidityUsd")} placeholder="500,000" keyboardType="number-pad" prefix="$" /></View>
            </View>
            <FormField label="FICO Credit Score" value={borForm.creditScore} onChangeText={updateBor("creditScore")} placeholder="740" keyboardType="number-pad" maxLength={3} hint="FICO score (300–850)" />
          </>
        )}

        {/* Step 4: Review */}
        {step === 4 && (
          <>
            <SectionHeader title="Review & Submit" subtitle="Confirm all details before submitting the LOA" />

            <ReviewCard title="Property">
              <ReviewRow label="Address" value={propForm.streetAddress} />
              <ReviewRow label="Location" value={[propForm.city, propForm.state, propForm.zipCode].filter(Boolean).join(", ")} />
              <ReviewRow label="Type" value={propForm.propertyType} />
              <ReviewRow label="Gross Sq Ft" value={propForm.grossSqFt ? `${propForm.grossSqFt} SF` : undefined} />
              <ReviewRow label="Units" value={propForm.numberOfUnits || undefined} />
              <ReviewRow label="Year Built" value={propForm.yearBuilt} />
              <ReviewRow label="Physical Occupancy" value={occForm.physicalOccupancyPct ? `${occForm.physicalOccupancyPct}% (unit-based)` : undefined} />
              <ReviewRow label="Economic Occupancy" value={occForm.economicOccupancyPct ? `${occForm.economicOccupancyPct}% (rent-based)` : undefined} last />
            </ReviewCard>

            <ReviewCard title="Loan Terms">
              <ReviewRow label="Type" value={loanForm.loanType} />
              <ReviewRow label="Amount (USD)" value={loanForm.loanAmountUsd ? `$${loanForm.loanAmountUsd}` : undefined} />
              <ReviewRow label="LTV / DSCR" value={[loanForm.ltvPct && `${loanForm.ltvPct}%`, loanForm.dscrRatio && `${loanForm.dscrRatio}×`].filter(Boolean).join(" / ") || undefined} />
              <ReviewRow label="Rate / Term" value={[loanForm.interestRatePct && `${loanForm.interestRatePct}%`, loanForm.loanTermYears && `${loanForm.loanTermYears} yrs`].filter(Boolean).join(" / ") || undefined} />
              <ReviewRow label="Amortization" value={loanForm.amortizationType} last />
            </ReviewCard>

            <ReviewCard title="Borrower">
              <ReviewRow label="Name" value={[borForm.firstName, borForm.lastName].filter(Boolean).join(" ")} />
              <ReviewRow label="Entity" value={borForm.entityName} />
              <ReviewRow label="Email" value={borForm.email} />
              <ReviewRow label="Phone" value={borForm.phone} />
              <ReviewRow label="CRE Experience" value={borForm.creExperienceYears ? `${borForm.creExperienceYears} years` : undefined} />
              <ReviewRow label="FICO Score" value={borForm.creditScore} last />
            </ReviewCard>
          </>
        )}
      </ScrollView>

      {/* ── Footer ── */}
      <View style={[styles.footer, { paddingBottom: bottomPad + 12 }]}>
        {step > 0 && (
          <TouchableOpacity style={styles.backBtn} onPress={() => setStep(step - 1)} activeOpacity={0.7}>
            <Feather name="arrow-left" size={16} color={Colors.light.tint} />
            <Text style={styles.backBtnText}>Back</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={styles.nextBtn}
          onPress={() => step < STEPS.length - 1 ? setStep(step + 1) : saveAll()}
          activeOpacity={0.8}
        >
          <Text style={styles.nextBtnText}>
            {step === STEPS.length - 1 ? "Submit Application" : "Continue"}
          </Text>
          {step < STEPS.length - 1 && <Feather name="arrow-right" size={16} color="#fff" />}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

// ── Review sub-components ────────────────────────────────────────────────────

function ReviewCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={rrStyles.card}>
      <View style={rrStyles.cardHeader}>
        <Text style={rrStyles.cardTitle}>{title}</Text>
      </View>
      <View style={rrStyles.cardBody}>{children}</View>
    </View>
  );
}

function ReviewRow({ label, value, last }: { label: string; value?: string; last?: boolean }) {
  return (
    <View style={[rrStyles.row, last && rrStyles.rowLast]}>
      <Text style={rrStyles.rowLabel}>{label}</Text>
      <Text style={rrStyles.rowValue}>{value || "—"}</Text>
    </View>
  );
}

const rrStyles = StyleSheet.create({
  card: {
    backgroundColor: Colors.light.backgroundCard,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 4,
    marginBottom: 12,
    overflow: "hidden",
  },
  cardHeader: {
    backgroundColor: Colors.light.surface,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  cardTitle: {
    fontSize: 11,
    fontFamily: "OpenSans_700Bold",
    color: Colors.light.tintLight,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  cardBody: {
    paddingHorizontal: 14,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
    gap: 12,
  },
  rowLast: { borderBottomWidth: 0 },
  rowLabel: {
    fontSize: 12,
    fontFamily: "OpenSans_400Regular",
    color: Colors.light.textSecondary,
    flex: 1,
  },
  rowValue: {
    fontSize: 12,
    fontFamily: "OpenSans_600SemiBold",
    color: Colors.light.text,
    flex: 1.5,
    textAlign: "right",
  },
});

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  loadingText: { fontSize: 14, fontFamily: "OpenSans_400Regular", color: Colors.light.textSecondary },

  header: {
    backgroundColor: Colors.light.surface,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerAction: {
    fontSize: 13,
    fontFamily: "OpenSans_600SemiBold",
    color: Colors.light.tintLight,
  },
  headerCenter: { alignItems: "center" },
  headerTitle: {
    fontSize: 15,
    fontFamily: "OpenSans_700Bold",
    color: "#fff",
  },
  headerStep: {
    fontSize: 11,
    fontFamily: "OpenSans_400Regular",
    color: "rgba(255,255,255,0.55)",
    marginTop: 1,
  },

  progressBar: {
    height: 3,
    backgroundColor: Colors.light.border,
  },
  progressFill: {
    height: 3,
    backgroundColor: Colors.light.tint,
  },

  stepRow: {
    flexDirection: "row",
    backgroundColor: Colors.light.backgroundCard,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  stepTab: {
    flex: 1,
    alignItems: "center",
    gap: 3,
  },
  stepTabActive: {},
  stepTabDone: {},
  stepCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: Colors.light.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.light.backgroundCard,
  },
  stepCircleActive: {
    borderColor: Colors.light.tint,
    backgroundColor: Colors.light.tint,
  },
  stepCircleDone: {
    borderColor: Colors.light.success,
    backgroundColor: Colors.light.success,
  },
  stepNum: {
    fontSize: 10,
    fontFamily: "OpenSans_700Bold",
    color: Colors.light.textTertiary,
  },
  stepNumActive: { color: "#fff" },
  stepLabel: {
    fontSize: 8,
    fontFamily: "OpenSans_600SemiBold",
    color: Colors.light.textTertiary,
    textAlign: "center",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  stepLabelActive: { color: Colors.light.tint },
  stepLabelDone: { color: Colors.light.success },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingVertical: 16 },

  row: { flexDirection: "row", alignItems: "flex-end" },
  flex1: { flex: 1 },
  flex2: { flex: 2 },
  gap: { width: 8 },

  callout: {
    borderLeftWidth: 3,
    backgroundColor: Colors.light.backgroundCard,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  calloutLabel: {
    fontSize: 11,
    fontFamily: "OpenSans_700Bold",
    color: Colors.light.text,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  calloutText: {
    fontSize: 12,
    fontFamily: "OpenSans_400Regular",
    color: Colors.light.textSecondary,
    lineHeight: 18,
  },

  footer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: Colors.light.backgroundCard,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
    gap: 8,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: Colors.light.tint,
    borderRadius: 4,
    paddingHorizontal: 14,
    height: 44,
  },
  backBtnText: {
    fontSize: 13,
    fontFamily: "OpenSans_700Bold",
    color: Colors.light.tint,
  },
  nextBtn: {
    flex: 1,
    height: 44,
    borderRadius: 4,
    backgroundColor: Colors.light.tint,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  nextBtnText: {
    fontSize: 14,
    fontFamily: "OpenSans_700Bold",
    color: "#fff",
  },
});
