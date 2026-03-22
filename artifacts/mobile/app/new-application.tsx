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
} from "@/context/ApplicationContext";
import { useApplications } from "@/context/ApplicationContext";

// ─── Step definitions ────────────────────────────────────────────────────────

const STEPS = ["Property", "Occupancy", "Loan Terms", "Borrower", "Review"];

const PROPERTY_TYPES: PropertyType[] = [
  "Office",
  "Retail",
  "Industrial",
  "Multifamily",
  "Mixed Use",
  "Hotel",
  "Self Storage",
  "Healthcare",
  "Land",
];
const LOAN_TYPES: LoanType[] = [
  "Acquisition",
  "Refinance",
  "Construction",
  "Bridge",
  "Permanent",
];
const INTEREST_TYPES: InterestType[] = ["Fixed", "Floating", "Hybrid"];
const AMORT_TYPES: AmortizationType[] = [
  "Full Amortizing",
  "Interest Only",
  "Partial IO",
];

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function NewApplicationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getApplication, getBorrower, getProperty, updateApplication, updateBorrower, updateProperty } =
    useApplications();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);

  const app = getApplication(id);
  const borrower = getBorrower(app?.borrowerId ?? "");
  const property = getProperty(app?.propertyId ?? "");

  // ── Property form state ──────────────────────────────────────────────────
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

  // ── Occupancy form state (split from property for clarity) ───────────────
  const [occForm, setOccForm] = useState({
    physicalOccupancyPct: property?.physicalOccupancyPct ?? "",
    economicOccupancyPct: property?.economicOccupancyPct ?? "",
  });

  // ── Loan form state ──────────────────────────────────────────────────────
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

  // ── Borrower form state ──────────────────────────────────────────────────
  const [borForm, setBorForm] = useState({
    firstName: borrower?.firstName ?? "",
    lastName: borrower?.lastName ?? "",
    entityName: borrower?.entityName ?? "",
    email: borrower?.email ?? "",
    phone: borrower?.phone ?? "",
    creExperienceYears: borrower?.creExperienceYears ?? "",
    netWorthUsd: borrower?.netWorthUsd ?? "",
    liquidityUsd: borrower?.liquidityUsd ?? "",
    creditScore: borrower?.creditScore ?? "",
  });

  if (!app || !borrower || !property) {
    return (
      <View style={styles.center}>
        <Text>Loading...</Text>
      </View>
    );
  }

  const updateProp = (key: string) => (val: string) =>
    setPropForm((f) => ({ ...f, [key]: val }));
  const updateOcc = (key: string) => (val: string) =>
    setOccForm((f) => ({ ...f, [key]: val }));
  const updateLoan = (key: string) => (val: string) =>
    setLoanForm((f) => ({ ...f, [key]: val }));
  const updateBor = (key: string) => (val: string) =>
    setBorForm((f) => ({ ...f, [key]: val }));

  const saveAll = async (status?: "Draft" | "Submitted") => {
    await Promise.all([
      updateProperty(property.id, { ...propForm, ...occForm }),
      updateBorrower(borrower.id, borForm),
      updateApplication(app.id, {
        ...loanForm,
        ...(status ? { status } : {}),
      }),
    ]);
    router.dismiss();
  };

  const handleNext = () => {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      saveAll("Submitted");
    }
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 8 }]}>
        <TouchableOpacity style={styles.cancelBtn} onPress={() => saveAll("Draft")} activeOpacity={0.7}>
          <Text style={styles.cancelText}>Save Draft</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New LOA</Text>
        <TouchableOpacity style={styles.closeBtn} onPress={() => saveAll("Draft")} activeOpacity={0.7}>
          <Feather name="x" size={20} color={Colors.light.text} />
        </TouchableOpacity>
      </View>

      {/* Step Indicator */}
      <View style={styles.stepRow}>
        {STEPS.map((s, i) => (
          <React.Fragment key={s}>
            <TouchableOpacity
              style={styles.stepItem}
              onPress={() => i < step && setStep(i)}
              disabled={i >= step}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.stepDot,
                  i === step && styles.stepDotActive,
                  i < step && styles.stepDotDone,
                ]}
              >
                {i < step ? (
                  <Feather name="check" size={10} color="#fff" />
                ) : (
                  <Text style={[styles.stepNum, i === step && styles.stepNumActive]}>{i + 1}</Text>
                )}
              </View>
              <Text
                style={[
                  styles.stepLabel,
                  i === step && styles.stepLabelActive,
                  i < step && styles.stepLabelDone,
                ]}
              >
                {s}
              </Text>
            </TouchableOpacity>
            {i < STEPS.length - 1 && (
              <View style={[styles.stepLine, i < step && styles.stepLineDone]} />
            )}
          </React.Fragment>
        ))}
      </View>

      {/* Form Body */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Step 0: Property ── */}
        {step === 0 && (
          <>
            <SectionHeader
              title="Property Location"
              subtitle="Physical location of the subject property"
            />
            <FormField
              label="Street Address"
              value={propForm.streetAddress}
              onChangeText={updateProp("streetAddress")}
              placeholder="123 Commerce Drive"
              required
            />
            <View style={styles.row}>
              <View style={styles.flex2}>
                <FormField
                  label="City"
                  value={propForm.city}
                  onChangeText={updateProp("city")}
                  placeholder="Chicago"
                />
              </View>
              <View style={styles.gap} />
              <View style={styles.flex1}>
                <FormField
                  label="State"
                  value={propForm.state}
                  onChangeText={updateProp("state")}
                  placeholder="IL"
                  maxLength={2}
                  autoCapitalize="characters"
                />
              </View>
              <View style={styles.gap} />
              <View style={styles.flex1}>
                <FormField
                  label="ZIP Code"
                  value={propForm.zipCode}
                  onChangeText={updateProp("zipCode")}
                  placeholder="60601"
                  keyboardType="number-pad"
                  maxLength={5}
                />
              </View>
            </View>

            <SectionHeader
              title="Property Details"
              subtitle="Physical and structural characteristics"
            />
            <SelectField
              label="Property Type"
              value={propForm.propertyType}
              options={PROPERTY_TYPES}
              onChange={(v) => updateProp("propertyType")(v)}
              required
            />
            <View style={styles.row}>
              <View style={styles.flex1}>
                <FormField
                  label="Gross Sq Ft (SF)"
                  value={propForm.grossSqFt}
                  onChangeText={updateProp("grossSqFt")}
                  placeholder="25,000"
                  keyboardType="number-pad"
                  hint="Rentable square footage"
                />
              </View>
              <View style={styles.gap} />
              <View style={styles.flex1}>
                <FormField
                  label="Rentable Units"
                  value={propForm.numberOfUnits}
                  onChangeText={updateProp("numberOfUnits")}
                  placeholder="0"
                  keyboardType="number-pad"
                  hint="Multifamily/mixed use"
                />
              </View>
            </View>
            <FormField
              label="Year Built"
              value={propForm.yearBuilt}
              onChangeText={updateProp("yearBuilt")}
              placeholder="2005"
              keyboardType="number-pad"
              maxLength={4}
            />
          </>
        )}

        {/* ── Step 1: Occupancy ── */}
        {step === 1 && (
          <>
            <SectionHeader
              title="Occupancy Metrics"
              subtitle="Two distinct measures of property performance"
            />

            <View style={styles.infoBox}>
              <Feather name="info" size={14} color={Colors.light.statusSubmitted} />
              <Text style={styles.infoText}>
                <Text style={styles.infoBold}>Physical occupancy</Text> measures the percentage of rentable units that are currently occupied by a tenant, regardless of whether rent is being collected.
              </Text>
            </View>
            <FormField
              label="Physical Occupancy (%)"
              value={occForm.physicalOccupancyPct}
              onChangeText={updateOcc("physicalOccupancyPct")}
              placeholder="95.0"
              keyboardType="decimal-pad"
              suffix="%"
              hint="Unit-based: occupied units ÷ total rentable units"
            />

            <View style={[styles.infoBox, { marginTop: 4 }]}>
              <Feather name="info" size={14} color={Colors.light.accent} />
              <Text style={styles.infoText}>
                <Text style={styles.infoBold}>Economic occupancy</Text> measures the percentage of potential gross income actually collected — accounts for concessions, vacancies, and non-payment.
              </Text>
            </View>
            <FormField
              label="Economic Occupancy (%)"
              value={occForm.economicOccupancyPct}
              onChangeText={updateOcc("economicOccupancyPct")}
              placeholder="91.0"
              keyboardType="decimal-pad"
              suffix="%"
              hint="Rent-based: collected rent ÷ scheduled gross potential rent"
            />
          </>
        )}

        {/* ── Step 2: Loan Terms ── */}
        {step === 2 && (
          <>
            <SectionHeader title="Loan Structure" subtitle="Terms and parameters of the requested loan" />
            <SelectField
              label="Loan Type"
              value={loanForm.loanType}
              options={LOAN_TYPES}
              onChange={(v) => updateLoan("loanType")(v)}
              required
            />
            <FormField
              label="Loan Amount (USD)"
              value={loanForm.loanAmountUsd}
              onChangeText={updateLoan("loanAmountUsd")}
              placeholder="5,000,000"
              keyboardType="number-pad"
              prefix="$"
              hint="Principal amount in US dollars"
              required
            />
            <View style={styles.row}>
              <View style={styles.flex1}>
                <FormField
                  label="LTV (%)"
                  value={loanForm.ltvPct}
                  onChangeText={updateLoan("ltvPct")}
                  placeholder="65.0"
                  keyboardType="decimal-pad"
                  suffix="%"
                  hint="Loan-to-value ratio"
                />
              </View>
              <View style={styles.gap} />
              <View style={styles.flex1}>
                <FormField
                  label="DSCR (×)"
                  value={loanForm.dscrRatio}
                  onChangeText={updateLoan("dscrRatio")}
                  placeholder="1.25"
                  keyboardType="decimal-pad"
                  suffix="×"
                  hint="Debt service coverage"
                />
              </View>
            </View>
            <SelectField
              label="Interest Type"
              value={loanForm.interestType}
              options={INTEREST_TYPES}
              onChange={(v) => updateLoan("interestType")(v)}
            />
            <View style={styles.row}>
              <View style={styles.flex1}>
                <FormField
                  label="Interest Rate (%)"
                  value={loanForm.interestRatePct}
                  onChangeText={updateLoan("interestRatePct")}
                  placeholder="6.50"
                  keyboardType="decimal-pad"
                  suffix="%"
                  hint="Annual rate"
                />
              </View>
              <View style={styles.gap} />
              <View style={styles.flex1}>
                <FormField
                  label="Loan Term (years)"
                  value={loanForm.loanTermYears}
                  onChangeText={updateLoan("loanTermYears")}
                  placeholder="5"
                  keyboardType="number-pad"
                  suffix="yrs"
                />
              </View>
            </View>
            <SelectField
              label="Amortization"
              value={loanForm.amortizationType}
              options={AMORT_TYPES}
              onChange={(v) => updateLoan("amortizationType")(v)}
            />
            <FormField
              label="Target Closing Date"
              value={loanForm.targetClosingDate}
              onChangeText={updateLoan("targetClosingDate")}
              placeholder="MM/DD/YYYY"
            />
          </>
        )}

        {/* ── Step 3: Borrower ── */}
        {step === 3 && (
          <>
            <SectionHeader title="Borrower Identity" subtitle="Individual and entity details" />
            <View style={styles.row}>
              <View style={styles.flex1}>
                <FormField
                  label="First Name"
                  value={borForm.firstName}
                  onChangeText={updateBor("firstName")}
                  placeholder="John"
                  autoCapitalize="words"
                  required
                />
              </View>
              <View style={styles.gap} />
              <View style={styles.flex1}>
                <FormField
                  label="Last Name"
                  value={borForm.lastName}
                  onChangeText={updateBor("lastName")}
                  placeholder="Smith"
                  autoCapitalize="words"
                  required
                />
              </View>
            </View>
            <FormField
              label="Entity / Company Name"
              value={borForm.entityName}
              onChangeText={updateBor("entityName")}
              placeholder="ABC Holdings LLC"
              autoCapitalize="words"
            />
            <FormField
              label="Email Address"
              value={borForm.email}
              onChangeText={updateBor("email")}
              placeholder="john@company.com"
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <FormField
              label="Phone Number"
              value={borForm.phone}
              onChangeText={updateBor("phone")}
              placeholder="(312) 555-0100"
              keyboardType="phone-pad"
            />

            <SectionHeader
              title="Financial Profile"
              subtitle="Used for underwriting and credit assessment"
            />
            <FormField
              label="CRE Experience (years)"
              value={borForm.creExperienceYears}
              onChangeText={updateBor("creExperienceYears")}
              placeholder="10"
              keyboardType="number-pad"
              suffix="yrs"
              hint="Years of commercial real estate experience"
            />
            <View style={styles.row}>
              <View style={styles.flex1}>
                <FormField
                  label="Net Worth (USD)"
                  value={borForm.netWorthUsd}
                  onChangeText={updateBor("netWorthUsd")}
                  placeholder="5,000,000"
                  keyboardType="number-pad"
                  prefix="$"
                />
              </View>
              <View style={styles.gap} />
              <View style={styles.flex1}>
                <FormField
                  label="Liquid Assets (USD)"
                  value={borForm.liquidityUsd}
                  onChangeText={updateBor("liquidityUsd")}
                  placeholder="500,000"
                  keyboardType="number-pad"
                  prefix="$"
                />
              </View>
            </View>
            <FormField
              label="FICO Credit Score"
              value={borForm.creditScore}
              onChangeText={updateBor("creditScore")}
              placeholder="740"
              keyboardType="number-pad"
              maxLength={3}
              hint="FICO score, typically 300–850"
            />
          </>
        )}

        {/* ── Step 4: Review ── */}
        {step === 4 && (
          <>
            <SectionHeader title="Review & Submit" subtitle="Confirm all details before submitting" />

            <View style={styles.reviewCard}>
              <Text style={styles.reviewSectionTitle}>Property</Text>
              <ReviewRow label="Address" value={propForm.streetAddress} />
              <ReviewRow
                label="Location"
                value={[propForm.city, propForm.state, propForm.zipCode]
                  .filter(Boolean)
                  .join(", ")}
              />
              <ReviewRow label="Type" value={propForm.propertyType} />
              <ReviewRow
                label="Gross Sq Ft"
                value={propForm.grossSqFt ? `${propForm.grossSqFt} SF` : undefined}
              />
              <ReviewRow
                label="Units"
                value={propForm.numberOfUnits || undefined}
              />
              <ReviewRow label="Year Built" value={propForm.yearBuilt} />
              <ReviewRow
                label="Physical Occupancy"
                value={occForm.physicalOccupancyPct ? `${occForm.physicalOccupancyPct}% (unit-based)` : undefined}
              />
              <ReviewRow
                label="Economic Occupancy"
                value={occForm.economicOccupancyPct ? `${occForm.economicOccupancyPct}% (rent-based)` : undefined}
                last
              />
            </View>

            <View style={styles.reviewCard}>
              <Text style={styles.reviewSectionTitle}>Loan Terms</Text>
              <ReviewRow label="Type" value={loanForm.loanType} />
              <ReviewRow
                label="Amount (USD)"
                value={loanForm.loanAmountUsd ? `$${loanForm.loanAmountUsd}` : undefined}
              />
              <ReviewRow
                label="LTV / DSCR"
                value={
                  [
                    loanForm.ltvPct ? `${loanForm.ltvPct}%` : null,
                    loanForm.dscrRatio ? `${loanForm.dscrRatio}×` : null,
                  ]
                    .filter(Boolean)
                    .join(" / ") || undefined
                }
              />
              <ReviewRow
                label="Rate / Term"
                value={
                  [
                    loanForm.interestRatePct ? `${loanForm.interestRatePct}%` : null,
                    loanForm.loanTermYears ? `${loanForm.loanTermYears} yrs` : null,
                  ]
                    .filter(Boolean)
                    .join(" / ") || undefined
                }
              />
              <ReviewRow label="Amortization" value={loanForm.amortizationType} last />
            </View>

            <View style={styles.reviewCard}>
              <Text style={styles.reviewSectionTitle}>Borrower</Text>
              <ReviewRow
                label="Name"
                value={[borForm.firstName, borForm.lastName].filter(Boolean).join(" ")}
              />
              <ReviewRow label="Entity" value={borForm.entityName} />
              <ReviewRow label="Email" value={borForm.email} />
              <ReviewRow label="Phone" value={borForm.phone} />
              <ReviewRow
                label="CRE Experience"
                value={borForm.creExperienceYears ? `${borForm.creExperienceYears} years` : undefined}
              />
              <ReviewRow label="FICO Score" value={borForm.creditScore} last />
            </View>
          </>
        )}
      </ScrollView>

      {/* Footer */}
      <View style={[styles.footer, { paddingBottom: bottomPad + 12 }]}>
        {step > 0 && (
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => setStep(step - 1)}
            activeOpacity={0.7}
          >
            <Feather name="arrow-left" size={18} color={Colors.light.tint} />
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.nextBtn} onPress={handleNext} activeOpacity={0.8}>
          <Text style={styles.nextBtnText}>
            {step === STEPS.length - 1 ? "Submit Application" : "Continue"}
          </Text>
          {step < STEPS.length - 1 && <Feather name="arrow-right" size={18} color="#fff" />}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

// ─── Small helper component ───────────────────────────────────────────────────

function ReviewRow({ label, value, last }: { label: string; value?: string; last?: boolean }) {
  return (
    <View style={[rrStyles.row, last && rrStyles.last]}>
      <Text style={rrStyles.label}>{label}</Text>
      <Text style={rrStyles.value}>{value || "—"}</Text>
    </View>
  );
}

const rrStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.borderLight,
    gap: 12,
  },
  last: { borderBottomWidth: 0 },
  label: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.light.textSecondary,
    flex: 1,
  },
  value: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.light.text,
    flex: 1.5,
    textAlign: "right",
  },
});

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: Colors.light.background,
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: Colors.light.text,
  },
  cancelBtn: { paddingVertical: 4 },
  cancelText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.light.tint,
  },
  closeBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: Colors.light.background,
  },
  stepItem: { alignItems: "center", gap: 3 },
  stepDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.light.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.light.background,
  },
  stepDotActive: {
    borderColor: Colors.light.tint,
    backgroundColor: Colors.light.tint,
  },
  stepDotDone: {
    borderColor: Colors.light.success,
    backgroundColor: Colors.light.success,
  },
  stepNum: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    color: Colors.light.textTertiary,
  },
  stepNumActive: { color: "#fff" },
  stepLabel: {
    fontSize: 8,
    fontFamily: "Inter_500Medium",
    color: Colors.light.textTertiary,
    textAlign: "center",
  },
  stepLabelActive: {
    color: Colors.light.tint,
    fontFamily: "Inter_600SemiBold",
  },
  stepLabelDone: { color: Colors.light.success },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: Colors.light.border,
    marginBottom: 14,
    marginHorizontal: 3,
  },
  stepLineDone: { backgroundColor: Colors.light.success },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  row: { flexDirection: "row", alignItems: "flex-end" },
  flex1: { flex: 1 },
  flex2: { flex: 2 },
  gap: { width: 10 },
  infoBox: {
    flexDirection: "row",
    gap: 8,
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    alignItems: "flex-start",
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.light.textSecondary,
    lineHeight: 18,
  },
  infoBold: {
    fontFamily: "Inter_600SemiBold",
    color: Colors.light.text,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: Colors.light.backgroundCard,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
    gap: 12,
  },
  backBtn: {
    width: 46,
    height: 46,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.light.tint,
    alignItems: "center",
    justifyContent: "center",
  },
  nextBtn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    backgroundColor: Colors.light.tint,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  nextBtnText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
  reviewCard: {
    backgroundColor: Colors.light.backgroundCard,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  reviewSectionTitle: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: Colors.light.tint,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 10,
  },
});
