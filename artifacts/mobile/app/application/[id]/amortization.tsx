import { useLocalSearchParams } from "expo-router";
import React from "react";

import { AmortizationCalculator } from "@/components/AmortizationCalculator";
import { SectionScreenLayout } from "@/components/SectionScreenLayout";
import { useCoreService } from "@/services/core";
import type { PhaseKey } from "@/services/phase-data";
import { usePhaseDataService } from "@/services/phase-data";
import { AccessDenied } from "@/components/AccessDenied";
import { usePermission } from "@/hooks/usePermission";

export default function AmortizationSection() {
  const { id, phase: phaseParam } = useLocalSearchParams<{ id: string; phase: string }>();
  const phase = (phaseParam as PhaseKey) ?? "inquiry";

  const { getApplication } = useCoreService();
  const { getLoanTermsSnapshot } = usePhaseDataService();
  const { canView } = usePermission(`${phase}.amortization` as any);

  const app = getApplication(id);
  const snap = getLoanTermsSnapshot(id, phase);

  if (!app) return null;
  if (!canView) return <AccessDenied screenLabel="Amortization Calculator" />;

  // Merge phase snapshot over app record so calculator uses this phase's terms
  const merged = {
    ...app,
    loanType:        snap?.loanType        ?? app.loanType,
    loanAmountUsd:   snap?.loanAmountUsd   ?? app.loanAmountUsd,
    loanTermYears:   snap?.loanTermYears   ?? app.loanTermYears,
    interestType:    snap?.interestType    ?? app.interestType,
    interestRatePct: snap?.interestRatePct ?? app.interestRatePct,
    amortizationType:snap?.amortizationType?? app.amortizationType,
    ltvPct:          snap?.ltvPct          ?? app.ltvPct,
    dscrRatio:       snap?.dscrRatio       ?? app.dscrRatio,
    targetClosingDate: snap?.targetClosingDate ?? app.targetClosingDate,
  };

  return (
    <SectionScreenLayout
      title="Amortization Calculator"
      subtitle="Rate build-up · Day count · Payment schedule"
    >
      <AmortizationCalculator application={merged} />
    </SectionScreenLayout>
  );
}
