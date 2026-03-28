import { useLocalSearchParams } from "expo-router";
import React from "react";
import { StyleSheet, View } from "react-native";

import { AttachmentList } from "@/components/AttachmentList";
import { SectionHeader } from "@/components/SectionHeader";
import { SectionScreenLayout } from "@/components/SectionScreenLayout";
import Colors from "@/constants/colors";
import { useDocumentsService } from "@/services/documents";
import { useCoreService } from "@/services/core";

export default function DocumentsSection() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getApplication } = useCoreService();
  const { getDocuments, addDocument, deleteDocument } = useDocumentsService();
  const app = getApplication(id);
  const docs = getDocuments(id);

  if (!app) return null;

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
