import { useLocalSearchParams } from "expo-router";
import React from "react";
import { StyleSheet, View } from "react-native";

import { CommentThread } from "@/components/CommentThread";
import { SectionHeader } from "@/components/SectionHeader";
import { SectionScreenLayout } from "@/components/SectionScreenLayout";
import Colors from "@/constants/colors";
import { useApplications } from "@/context/ApplicationContext";

export default function CommentsSection() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getApplication, addComment } = useApplications();
  const app = getApplication(id);

  if (!app) return null;

  return (
    <SectionScreenLayout
      title="Comments"
      subtitle="Threaded discussion on this application"
      badge={app.comments.length > 0 ? `${app.comments.length}` : undefined}
    >
      <View style={styles.card}>
        <SectionHeader
          title={`Comments (${app.comments.length})`}
          subtitle="Replies are threaded below each root comment"
        />
        <CommentThread
          application={app}
          onAddComment={(text, parentId) => addComment(app.id, text, parentId)}
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
