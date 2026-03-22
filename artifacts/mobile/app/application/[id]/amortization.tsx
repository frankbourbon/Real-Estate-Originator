import { useLocalSearchParams } from "expo-router";
import React from "react";

import { AmortizationCalculator } from "@/components/AmortizationCalculator";
import { SectionScreenLayout } from "@/components/SectionScreenLayout";
import { useApplications } from "@/context/ApplicationContext";

export default function AmortizationSection() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getApplication } = useApplications();
  const app = getApplication(id);

  if (!app) return null;

  return (
    <SectionScreenLayout
      title="Amortization Calculator"
      subtitle="Rate build-up · Day count · Payment schedule"
    >
      <AmortizationCalculator application={app} />
    </SectionScreenLayout>
  );
}
