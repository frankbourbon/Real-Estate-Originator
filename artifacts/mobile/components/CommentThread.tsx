import { Feather } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import Colors from "@/constants/colors";
import type { Comment, LOAApplication } from "@/context/ApplicationContext";
import { formatTimeAgo, getReplies } from "@/utils/formatting";

type ReplyFormProps = {
  onSubmit: (text: string) => void;
  onCancel: () => void;
};

function ReplyForm({ onSubmit, onCancel }: ReplyFormProps) {
  const [text, setText] = useState("");
  return (
    <View style={styles.replyForm}>
      <TextInput
        style={styles.replyInput}
        placeholder="Write a reply..."
        placeholderTextColor={Colors.light.textTertiary}
        value={text}
        onChangeText={setText}
        multiline
        autoFocus
      />
      <View style={styles.replyActions}>
        <TouchableOpacity onPress={onCancel} style={styles.cancelBtn} activeOpacity={0.7}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => {
            if (text.trim()) { onSubmit(text.trim()); setText(""); }
          }}
          style={[styles.replyBtn, !text.trim() && styles.replyBtnDisabled]}
          disabled={!text.trim()}
          activeOpacity={0.8}
        >
          <Text style={styles.replyBtnText}>Reply</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

type CommentItemProps = {
  comment: Comment;
  application: LOAApplication;
  depth?: number;
  onReply: (parentId: string, text: string) => void;
};

function CommentItem({ comment, application, depth = 0, onReply }: CommentItemProps) {
  const [showReply, setShowReply] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const replies = getReplies(application, comment.id);

  return (
    <View style={[styles.commentItem, depth > 0 && styles.commentNested]}>
      {depth > 0 && <View style={styles.threadLine} />}

      <View style={styles.commentInner}>
        {/* Header */}
        <View style={styles.commentHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{comment.author.charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={styles.authorName}>{comment.author}</Text>
          <Text style={styles.commentTime}>{formatTimeAgo(comment.createdAt)}</Text>
        </View>

        {/* Body */}
        <Text style={styles.commentText}>{comment.text}</Text>

        {/* Actions */}
        <View style={styles.commentFooter}>
          <TouchableOpacity
            style={styles.action}
            onPress={() => setShowReply(!showReply)}
            activeOpacity={0.6}
          >
            <Feather name="corner-down-right" size={12} color={Colors.light.tint} />
            <Text style={styles.actionText}>Reply</Text>
          </TouchableOpacity>
          {replies.length > 0 && (
            <TouchableOpacity
              style={styles.action}
              onPress={() => setCollapsed(!collapsed)}
              activeOpacity={0.6}
            >
              <Feather
                name={collapsed ? "chevron-down" : "chevron-up"}
                size={12}
                color={Colors.light.textTertiary}
              />
              <Text style={[styles.actionText, { color: Colors.light.textTertiary }]}>
                {collapsed ? `${replies.length} repl${replies.length === 1 ? "y" : "ies"}` : "Collapse"}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {showReply && (
          <ReplyForm
            onSubmit={(text) => { onReply(comment.id, text); setShowReply(false); }}
            onCancel={() => setShowReply(false)}
          />
        )}

        {!collapsed && replies.map((r) => (
          <CommentItem
            key={r.id}
            comment={r}
            application={application}
            depth={depth + 1}
            onReply={onReply}
          />
        ))}
      </View>
    </View>
  );
}

type Props = {
  application: LOAApplication;
  onAddComment: (text: string, parentId: string | null) => void;
};

export function CommentThread({ application, onAddComment }: Props) {
  const [newText, setNewText] = useState("");
  const topLevel = application.comments.filter((c) => c.parentCommentId === null);

  return (
    <View style={styles.container}>
      {/* New comment input */}
      <View style={styles.newCommentBox}>
        <View style={styles.newCommentAvatar}>
          <Text style={styles.avatarText}>Y</Text>
        </View>
        <View style={styles.newCommentField}>
          <TextInput
            style={styles.newCommentInput}
            placeholder="Add a comment..."
            placeholderTextColor={Colors.light.textTertiary}
            value={newText}
            onChangeText={setNewText}
            multiline
          />
          {newText.trim().length > 0 && (
            <TouchableOpacity
              style={styles.sendBtn}
              onPress={() => { onAddComment(newText.trim(), null); setNewText(""); }}
              activeOpacity={0.8}
            >
              <Feather name="send" size={14} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Thread */}
      {topLevel.length === 0 ? (
        <View style={styles.empty}>
          <Feather name="message-circle" size={24} color={Colors.light.textTertiary} />
          <Text style={styles.emptyText}>No comments yet. Start the discussion.</Text>
        </View>
      ) : (
        topLevel.map((c) => (
          <CommentItem
            key={c.id}
            comment={c}
            application={application}
            depth={0}
            onReply={(parentId, text) => onAddComment(text, parentId)}
          />
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 0 },

  newCommentBox: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
    alignItems: "flex-start",
  },
  newCommentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 2,
    backgroundColor: Colors.light.tint,
    alignItems: "center",
    justifyContent: "center",
  },
  newCommentField: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-end",
    backgroundColor: Colors.light.background,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 8,
  },
  newCommentInput: {
    flex: 1,
    fontSize: 13,
    fontFamily: "OpenSans_400Regular",
    color: Colors.light.text,
    maxHeight: 80,
  },
  sendBtn: {
    width: 28,
    height: 28,
    borderRadius: 4,
    backgroundColor: Colors.light.tint,
    alignItems: "center",
    justifyContent: "center",
  },

  empty: {
    alignItems: "center",
    paddingVertical: 24,
    gap: 8,
    flexDirection: "row",
    justifyContent: "center",
  },
  emptyText: {
    fontSize: 13,
    fontFamily: "OpenSans_400Regular",
    color: Colors.light.textTertiary,
  },

  commentItem: {
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
  },
  commentNested: {
    marginLeft: 20,
    borderTopWidth: 0,
    paddingVertical: 8,
    position: "relative",
  },
  threadLine: {
    position: "absolute",
    left: -12,
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: Colors.light.tintLight,
    borderRadius: 1,
  },
  commentInner: {},

  commentHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  avatar: {
    width: 26,
    height: 26,
    borderRadius: 2,
    backgroundColor: Colors.light.tintLight,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 11,
    fontFamily: "OpenSans_700Bold",
    color: Colors.light.tint,
  },
  authorName: {
    fontSize: 13,
    fontFamily: "OpenSans_700Bold",
    color: Colors.light.text,
  },
  commentTime: {
    fontSize: 11,
    fontFamily: "OpenSans_400Regular",
    color: Colors.light.textTertiary,
    marginLeft: "auto",
  },
  commentText: {
    fontSize: 13,
    fontFamily: "OpenSans_400Regular",
    color: Colors.light.text,
    lineHeight: 20,
    marginBottom: 8,
    marginLeft: 34,
  },
  commentFooter: {
    flexDirection: "row",
    gap: 16,
    marginLeft: 34,
  },
  action: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 2,
  },
  actionText: {
    fontSize: 12,
    fontFamily: "OpenSans_600SemiBold",
    color: Colors.light.tint,
  },

  replyForm: {
    marginLeft: 34,
    marginTop: 8,
    backgroundColor: Colors.light.background,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 4,
    padding: 10,
  },
  replyInput: {
    fontSize: 13,
    fontFamily: "OpenSans_400Regular",
    color: Colors.light.text,
    minHeight: 44,
    textAlignVertical: "top",
  },
  replyActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 6,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
    paddingTop: 8,
  },
  cancelBtn: { paddingHorizontal: 12, paddingVertical: 6 },
  cancelText: {
    fontSize: 13,
    fontFamily: "OpenSans_600SemiBold",
    color: Colors.light.textSecondary,
  },
  replyBtn: {
    backgroundColor: Colors.light.tint,
    borderRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  replyBtnDisabled: { opacity: 0.4 },
  replyBtnText: {
    fontSize: 13,
    fontFamily: "OpenSans_700Bold",
    color: "#fff",
  },
});
