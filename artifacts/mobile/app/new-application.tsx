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
import { useApplications } from "@/context/ApplicationContext";
import type {
  PropertyType,
  LoanType,
  InterestType,
  AmortizationType,
} from "@/context/ApplicationContext";

const STEPS = ["Property", "Loan Terms", "Borrower", "Review"];

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

export default function NewApplicationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getApplication, updateApplication } = useApplications();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);

  const app = getApplication(id);

  if (!app) {
    return (
      <View style={styles.center}>
        <Text>Application not found</Text>
      </View>
    );
  }

  const [form, setForm] = useState({
    propertyAddress: app.propertyAddress,
    propertyCity: app.propertyCity,
    propertyState: app.propertyState,
    propertyZip: app.propertyZip,
    propertyType: app.propertyType,
    propertySquareFeet: app.propertySquareFeet,
    propertyUnits: app.propertyUnits,
    yearBuilt: app.yearBuilt,
    occupancyRate: app.occupancyRate,
    loanType: app.loanType,
    loanAmount: app.loanAmount,
    loanTerm: app.loanTerm,
    interestType: app.interestType,
    interestRate: app.interestRate,
    amortizationType: app.amortizationType,
    ltv: app.ltv,
    dscr: app.dscr,
    closingDate: app.closingDate,
    borrowerName: app.borrowerName,
    borrowerEntity: app.borrowerEntity,
    borrowerEmail: app.borrowerEmail,
    borrowerPhone: app.borrowerPhone,
    borrowerExperience: app.borrowerExperience,
    netWorth: app.netWorth,
    liquidity: app.liquidity,
    creditScore: app.creditScore,
  });

  const update = (key: string) => (val: string) => setForm((f) => ({ ...f, [key]: val }));

  const saveAndExit = async (status?: "Draft" | "Submitted") => {
    await updateApplication(id, {
      ...form,
      ...(status ? { status } : {}),
    });
    router.dismiss();
  };

  const handleNext = () => {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      saveAndExit("Submitted");
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
        <TouchableOpacity
          style={styles.cancelBtn}
          onPress={() => saveAndExit("Draft")}
          activeOpacity={0.7}
        >
          <Text style={styles.cancelText}>Save Draft</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New LOA</Text>
        <TouchableOpacity
          style={styles.closeBtn}
          onPress={() => saveAndExit("Draft")}
          activeOpacity={0.7}
        >
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
                  <Text
                    style={[
                      styles.stepNum,
                      i === step && styles.stepNumActive,
                    ]}
                  >
                    {i + 1}
                  </Text>
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

      {/* Form Content */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {step === 0 && (
          <>
            <SectionHeader title="Property Information" />
            <FormField
              label="Property Address"
              value={form.propertyAddress}
              onChangeText={update("propertyAddress")}
              placeholder="123 Main Street"
              required
            />
            <View style={styles.row}>
              <View style={styles.flex2}>
                <FormField
                  label="City"
                  value={form.propertyCity}
                  onChangeText={update("propertyCity")}
                  placeholder="New York"
                />
              </View>
              <View style={styles.gap} />
              <View style={styles.flex1}>
                <FormField
                  label="State"
                  value={form.propertyState}
                  onChangeText={update("propertyState")}
                  placeholder="NY"
                  maxLength={2}
                  autoCapitalize="characters"
                />
              </View>
              <View style={styles.gap} />
              <View style={styles.flex1}>
                <FormField
                  label="ZIP"
                  value={form.propertyZip}
                  onChangeText={update("propertyZip")}
                  placeholder="10001"
                  keyboardType="number-pad"
                  maxLength={5}
                />
              </View>
            </View>
            <SelectField
              label="Property Type"
              value={form.propertyType}
              options={PROPERTY_TYPES}
              onChange={(v) => update("propertyType")(v)}
              required
            />
            <View style={styles.row}>
              <View style={styles.flex1}>
                <FormField
                  label="Sq Footage"
                  value={form.propertySquareFeet}
                  onChangeText={update("propertySquareFeet")}
                  placeholder="25,000"
                  keyboardType="number-pad"
                  suffix="SF"
                />
              </View>
              <View style={styles.gap} />
              <View style={styles.flex1}>
                <FormField
                  label="Units"
                  value={form.propertyUnits}
                  onChangeText={update("propertyUnits")}
                  placeholder="0"
                  keyboardType="number-pad"
                />
              </View>
            </View>
            <View style={styles.row}>
              <View style={styles.flex1}>
                <FormField
                  label="Year Built"
                  value={form.yearBuilt}
                  onChangeText={update("yearBuilt")}
                  placeholder="2005"
                  keyboardType="number-pad"
                  maxLength={4}
                />
              </View>
              <View style={styles.gap} />
              <View style={styles.flex1}>
                <FormField
                  label="Occupancy"
                  value={form.occupancyRate}
                  onChangeText={update("occupancyRate")}
                  placeholder="95"
                  keyboardType="decimal-pad"
                  suffix="%"
                />
              </View>
            </View>
          </>
        )}

        {step === 1 && (
          <>
            <SectionHeader title="Loan Terms" />
            <SelectField
              label="Loan Type"
              value={form.loanType}
              options={LOAN_TYPES}
              onChange={(v) => update("loanType")(v)}
              required
            />
            <FormField
              label="Loan Amount"
              value={form.loanAmount}
              onChangeText={update("loanAmount")}
              placeholder="5,000,000"
              keyboardType="number-pad"
              prefix="$"
              required
            />
            <View style={styles.row}>
              <View style={styles.flex1}>
                <FormField
                  label="LTV"
                  value={form.ltv}
                  onChangeText={update("ltv")}
                  placeholder="65"
                  keyboardType="decimal-pad"
                  suffix="%"
                />
              </View>
              <View style={styles.gap} />
              <View style={styles.flex1}>
                <FormField
                  label="DSCR"
                  value={form.dscr}
                  onChangeText={update("dscr")}
                  placeholder="1.25"
                  keyboardType="decimal-pad"
                  suffix="x"
                />
              </View>
            </View>
            <SelectField
              label="Interest Type"
              value={form.interestType}
              options={INTEREST_TYPES}
              onChange={(v) => update("interestType")(v)}
            />
            <View style={styles.row}>
              <View style={styles.flex1}>
                <FormField
                  label="Interest Rate"
                  value={form.interestRate}
                  onChangeText={update("interestRate")}
                  placeholder="6.50"
                  keyboardType="decimal-pad"
                  suffix="%"
                />
              </View>
              <View style={styles.gap} />
              <View style={styles.flex1}>
                <FormField
                  label="Loan Term"
                  value={form.loanTerm}
                  onChangeText={update("loanTerm")}
                  placeholder="5"
                  keyboardType="number-pad"
                  suffix="yrs"
                />
              </View>
            </View>
            <SelectField
              label="Amortization"
              value={form.amortizationType}
              options={AMORT_TYPES}
              onChange={(v) => update("amortizationType")(v)}
            />
            <FormField
              label="Target Closing Date"
              value={form.closingDate}
              onChangeText={update("closingDate")}
              placeholder="MM/DD/YYYY"
            />
          </>
        )}

        {step === 2 && (
          <>
            <SectionHeader title="Borrower Information" />
            <FormField
              label="Borrower Name"
              value={form.borrowerName}
              onChangeText={update("borrowerName")}
              placeholder="John Smith"
              autoCapitalize="words"
              required
            />
            <FormField
              label="Entity / Company"
              value={form.borrowerEntity}
              onChangeText={update("borrowerEntity")}
              placeholder="ABC Holdings LLC"
              autoCapitalize="words"
            />
            <FormField
              label="Email"
              value={form.borrowerEmail}
              onChangeText={update("borrowerEmail")}
              placeholder="john@company.com"
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <FormField
              label="Phone"
              value={form.borrowerPhone}
              onChangeText={update("borrowerPhone")}
              placeholder="(212) 555-0100"
              keyboardType="phone-pad"
            />
            <SectionHeader title="Financial Profile" subtitle="Used for underwriting assessment" />
            <FormField
              label="CRE Experience"
              value={form.borrowerExperience}
              onChangeText={update("borrowerExperience")}
              placeholder="10 years"
            />
            <View style={styles.row}>
              <View style={styles.flex1}>
                <FormField
                  label="Net Worth"
                  value={form.netWorth}
                  onChangeText={update("netWorth")}
                  placeholder="5,000,000"
                  keyboardType="number-pad"
                  prefix="$"
                />
              </View>
              <View style={styles.gap} />
              <View style={styles.flex1}>
                <FormField
                  label="Liquidity"
                  value={form.liquidity}
                  onChangeText={update("liquidity")}
                  placeholder="500,000"
                  keyboardType="number-pad"
                  prefix="$"
                />
              </View>
            </View>
            <FormField
              label="Credit Score"
              value={form.creditScore}
              onChangeText={update("creditScore")}
              placeholder="740"
              keyboardType="number-pad"
              maxLength={3}
            />
          </>
        )}

        {step === 3 && (
          <>
            <SectionHeader title="Review & Submit" subtitle="Confirm your application details" />
            <View style={styles.reviewCard}>
              <Text style={styles.reviewSectionTitle}>Property</Text>
              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>Address</Text>
                <Text style={styles.reviewValue}>{form.propertyAddress || "—"}</Text>
              </View>
              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>City, State</Text>
                <Text style={styles.reviewValue}>
                  {[form.propertyCity, form.propertyState].filter(Boolean).join(", ") || "—"}
                </Text>
              </View>
              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>Type</Text>
                <Text style={styles.reviewValue}>{form.propertyType}</Text>
              </View>
              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>Sq Footage</Text>
                <Text style={styles.reviewValue}>
                  {form.propertySquareFeet ? `${form.propertySquareFeet} SF` : "—"}
                </Text>
              </View>
            </View>
            <View style={styles.reviewCard}>
              <Text style={styles.reviewSectionTitle}>Loan</Text>
              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>Type</Text>
                <Text style={styles.reviewValue}>{form.loanType}</Text>
              </View>
              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>Amount</Text>
                <Text style={styles.reviewValue}>
                  {form.loanAmount ? `$${form.loanAmount}` : "—"}
                </Text>
              </View>
              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>Rate / Term</Text>
                <Text style={styles.reviewValue}>
                  {[
                    form.interestRate ? `${form.interestRate}%` : null,
                    form.loanTerm ? `${form.loanTerm}yr` : null,
                  ]
                    .filter(Boolean)
                    .join(" / ") || "—"}
                </Text>
              </View>
              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>LTV / DSCR</Text>
                <Text style={styles.reviewValue}>
                  {[form.ltv ? `${form.ltv}%` : null, form.dscr ? `${form.dscr}x` : null]
                    .filter(Boolean)
                    .join(" / ") || "—"}
                </Text>
              </View>
            </View>
            <View style={styles.reviewCard}>
              <Text style={styles.reviewSectionTitle}>Borrower</Text>
              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>Name</Text>
                <Text style={styles.reviewValue}>{form.borrowerName || "—"}</Text>
              </View>
              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>Entity</Text>
                <Text style={styles.reviewValue}>{form.borrowerEntity || "—"}</Text>
              </View>
              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>Credit Score</Text>
                <Text style={styles.reviewValue}>{form.creditScore || "—"}</Text>
              </View>
            </View>
          </>
        )}
      </ScrollView>

      {/* Footer */}
      <View
        style={[
          styles.footer,
          { paddingBottom: bottomPad + 12 },
        ]}
      >
        {step > 0 && (
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => setStep(step - 1)}
            activeOpacity={0.7}
          >
            <Feather name="arrow-left" size={18} color={Colors.light.tint} />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={styles.nextBtn}
          onPress={handleNext}
          activeOpacity={0.8}
        >
          <Text style={styles.nextBtnText}>
            {step === STEPS.length - 1 ? "Submit Application" : "Continue"}
          </Text>
          {step < STEPS.length - 1 && (
            <Feather name="arrow-right" size={18} color="#fff" />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

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
  cancelBtn: {
    paddingVertical: 4,
  },
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
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: Colors.light.background,
  },
  stepItem: {
    alignItems: "center",
    gap: 4,
  },
  stepDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
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
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: Colors.light.textTertiary,
  },
  stepNumActive: {
    color: "#fff",
  },
  stepLabel: {
    fontSize: 9,
    fontFamily: "Inter_500Medium",
    color: Colors.light.textTertiary,
    textAlign: "center",
  },
  stepLabelActive: {
    color: Colors.light.tint,
    fontFamily: "Inter_600SemiBold",
  },
  stepLabelDone: {
    color: Colors.light.success,
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: Colors.light.border,
    marginBottom: 16,
    marginHorizontal: 4,
  },
  stepLineDone: {
    backgroundColor: Colors.light.success,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-end",
  },
  flex1: { flex: 1 },
  flex2: { flex: 2 },
  gap: { width: 10 },
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
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.light.tint,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 12,
  },
  reviewRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.borderLight,
  },
  reviewLabel: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.light.textSecondary,
    flex: 1,
  },
  reviewValue: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.light.text,
    flex: 1.5,
    textAlign: "right",
  },
});
