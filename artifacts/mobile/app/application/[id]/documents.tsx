import { useLocalSearchParams } from "expo-router";
import React from "react";
import { StyleSheet, View } from "react-native";

import { AttachmentList } from "@/components/AttachmentList";
import { SectionHeader } from "@/components/SectionHeader";
import { SectionScreenLayout } from "@/components/SectionScreenLayout";
import Colors from "@/constants/colors";
import { useApplications } from "@/context/ApplicationContext";

export default function DocumentsSection() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getApplication, addAttachment, deleteAttachment } = useApplications();
  const app = getApplication(id);

  if (!app) return null;

  return (
    <SectionScreenLayout
      title="Documents"
      subtitle="Attached files and supporting materials"
      badge={app.attachments.length > 0 ? `${app.attachments.length}` : undefined}
    >
      <View style={styles.card}>
        <SectionHeader
          title={`Documents (${app.attachments.length})`}
          subtitle="Tap the attach button to add files"
        />
        <AttachmentList
          attachments={app.attachments}
          onAdd={(att) => addAttachment(app.id, att)}
          onDelete={(attId) => deleteAttachment(app.id, attId)}
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
