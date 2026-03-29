import { useLocalSearchParams } from "expo-router";
import React from "react";
import { StyleSheet, View } from "react-native";

import { AttachmentList } from "@/components/AttachmentList";
import type { AppliesToOption } from "@/components/AttachmentList";
import { SectionHeader } from "@/components/SectionHeader";
import { SectionScreenLayout } from "@/components/SectionScreenLayout";
import Colors from "@/constants/colors";
import { useDocumentsService } from "@/services/documents";
import { useCoreService } from "@/services/core";

export default function DocumentsSection() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getApplication, getBorrower, getProperty } = useCoreService();
  const { getDocuments, addDocument, deleteDocument } = useDocumentsService();
  const app = getApplication(id);
  const docs = getDocuments(id);

  if (!app) return null;

  // Build Applies To options from the application's linked borrower and property
  const appliesToOptions: AppliesToOption[] = [];

  const borrower = getBorrower(app.borrowerId);
  if (borrower) {
    const name = borrower.entityName?.trim()
      ? borrower.entityName
      : `${borrower.firstName} ${borrower.lastName}`.trim();
    appliesToOptions.push({ kind: "borrower", id: borrower.id, label: name });
  }

  const property = getProperty(app.propertyId);
  if (property) {
    const addr = property.streetAddress
      ? `${property.streetAddress}, ${property.city}, ${property.state}`
      : property.locations?.[0]
        ? `${property.locations[0].streetAddress}, ${property.locations[0].city}, ${property.locations[0].state}`
        : "Property";
    appliesToOptions.push({ kind: "property", id: property.id, label: addr });
  }

  return (
    <SectionScreenLayout
      title="Documents"
      subtitle="Attached files and supporting materials"
      badge={docs.length > 0 ? `${docs.length}` : undefined}
    >
      <View style={styles.card}>
        <SectionHeader
          title={`Documents (${docs.length})`}
          subtitle="Tap the attach button to add files"
        />
        <AttachmentList
          attachments={docs}
          appliesToOptions={appliesToOptions}
          onAdd={(att) => addDocument(id, { ...att, serviceTag: "", uploadedBy: "You" })}
          onDelete={(attId) => deleteDocument(attId)}
        />
      </View>
    </SectionScreenLayout>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.light.backgroundCard,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 4,
    padding: 16,
  },
});
