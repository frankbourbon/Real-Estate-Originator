import AsyncStorage from "@react-native-async-storage/async-storage";
import createContextHook from "@nkzw/create-context-hook";
import React, { useCallback, useEffect, useState } from "react";

export type PropertyType =
  | "Office"
  | "Retail"
  | "Industrial"
  | "Multifamily"
  | "Mixed Use"
  | "Hotel"
  | "Self Storage"
  | "Healthcare"
  | "Land";

export type LoanType = "Acquisition" | "Refinance" | "Construction" | "Bridge" | "Permanent";
export type InterestType = "Fixed" | "Floating" | "Hybrid";
export type AmortizationType = "Full Amortizing" | "Interest Only" | "Partial IO";
export type ApplicationStatus = "Draft" | "Submitted" | "Under Review" | "Approved" | "Declined";

export type LOANote = {
  id: string;
  text: string;
  author: string;
  createdAt: string;
};

export type LOAApplication = {
  id: string;
  status: ApplicationStatus;
  createdAt: string;
  updatedAt: string;

  // Property
  propertyAddress: string;
  propertyCity: string;
  propertyState: string;
  propertyZip: string;
  propertyType: PropertyType;
  propertySquareFeet: string;
  propertyUnits: string;
  yearBuilt: string;
  occupancyRate: string;

  // Loan
  loanType: LoanType;
  loanAmount: string;
  loanTerm: string;
  interestType: InterestType;
  interestRate: string;
  amortizationType: AmortizationType;
  ltv: string;
  dscr: string;
  closingDate: string;

  // Borrower
  borrowerName: string;
  borrowerEntity: string;
  borrowerEmail: string;
  borrowerPhone: string;
  borrowerExperience: string;
  netWorth: string;
  liquidity: string;
  creditScore: string;

  // Notes
  notes: LOANote[];
};

const STORAGE_KEY = "loa_applications";

function generateId() {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

function emptyApplication(): Omit<LOAApplication, "id" | "createdAt" | "updatedAt"> {
  return {
    status: "Draft",
    propertyAddress: "",
    propertyCity: "",
    propertyState: "",
    propertyZip: "",
    propertyType: "Office",
    propertySquareFeet: "",
    propertyUnits: "",
    yearBuilt: "",
    occupancyRate: "",
    loanType: "Acquisition",
    loanAmount: "",
    loanTerm: "",
    interestType: "Fixed",
    interestRate: "",
    amortizationType: "Full Amortizing",
    ltv: "",
    dscr: "",
    closingDate: "",
    borrowerName: "",
    borrowerEntity: "",
    borrowerEmail: "",
    borrowerPhone: "",
    borrowerExperience: "",
    netWorth: "",
    liquidity: "",
    creditScore: "",
    notes: [],
  };
}

const [ApplicationProvider, useApplications] = createContextHook(() => {
  const [applications, setApplications] = useState<LOAApplication[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((data) => {
        if (data) setApplications(JSON.parse(data));
      })
      .finally(() => setLoading(false));
  }, []);

  const persist = useCallback(async (apps: LOAApplication[]) => {
    setApplications(apps);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(apps));
  }, []);

  const createApplication = useCallback(async (): Promise<LOAApplication> => {
    const now = new Date().toISOString();
    const app: LOAApplication = {
      id: generateId(),
      createdAt: now,
      updatedAt: now,
      ...emptyApplication(),
    };
    await persist([app, ...applications]);
    return app;
  }, [applications, persist]);

  const updateApplication = useCallback(
    async (id: string, updates: Partial<LOAApplication>) => {
      const updated = applications.map((a) =>
        a.id === id ? { ...a, ...updates, updatedAt: new Date().toISOString() } : a
      );
      await persist(updated);
    },
    [applications, persist]
  );

  const deleteApplication = useCallback(
    async (id: string) => {
      await persist(applications.filter((a) => a.id !== id));
    },
    [applications, persist]
  );

  const addNote = useCallback(
    async (id: string, text: string) => {
      const note: LOANote = {
        id: generateId(),
        text,
        author: "You",
        createdAt: new Date().toISOString(),
      };
      const app = applications.find((a) => a.id === id);
      if (!app) return;
      await updateApplication(id, { notes: [...app.notes, note] });
    },
    [applications, updateApplication]
  );

  const getApplication = useCallback(
    (id: string) => applications.find((a) => a.id === id),
    [applications]
  );

  const stats = {
    total: applications.length,
    draft: applications.filter((a) => a.status === "Draft").length,
    submitted: applications.filter((a) => a.status === "Submitted").length,
    underReview: applications.filter((a) => a.status === "Under Review").length,
    approved: applications.filter((a) => a.status === "Approved").length,
    declined: applications.filter((a) => a.status === "Declined").length,
    totalVolume: applications
      .filter((a) => a.loanAmount)
      .reduce((sum, a) => sum + parseFloat(a.loanAmount.replace(/[^0-9.]/g, "") || "0"), 0),
  };

  return {
    applications,
    loading,
    stats,
    createApplication,
    updateApplication,
    deleteApplication,
    addNote,
    getApplication,
  };
});

export { ApplicationProvider, useApplications };
