import { useLocalSearchParams } from "expo-router";
import React from "react";
import { StyleSheet, View } from "react-native";

import { CommentThread } from "@/components/CommentThread";
import { SectionHeader } from "@/components/SectionHeader";
import { SectionScreenLayout } from "@/components/SectionScreenLayout";
import { AccessDenied } from "@/components/AccessDenied";
import Colors from "@/constants/colors";
import { useCommentsService } from "@/services/comments";
import { useCoreService } from "@/services/core";
import { usePermission } from "@/hooks/usePermission";

export default function CommentsSection() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getApplication } = useCoreService();
  const { getComments, addComment } = useCommentsService();
  const { canView, canEdit } = usePermission("comments.main");

  const app = getApplication(id);
  const comments = getComments(id);

  if (!app) return null;
  if (!canView) return <AccessDenied screenLabel="Comments" />;

  return (
    <SectionScreenLayout
      title="Comments"
      subtitle="Threaded discussion on this application"
      badge={comments.length > 0 ? `${comments.length}` : undefined}
    >
      <View style={styles.card}>
        <SectionHeader
          title={`Comments (${comments.length})`}
          subtitle="Replies are threaded below each root comment"
        />
        <CommentThread
          comments={comments}
          onAddComment={(text, parentId) => addComment(id, text, "You", parentId)}
          readOnly={!canEdit}
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
