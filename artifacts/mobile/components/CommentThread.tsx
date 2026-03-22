import { Feather } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  Pressable,
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
        <TouchableOpacity onPress={onCancel} style={styles.replyCancelBtn} activeOpacity={0.7}>
          <Text style={styles.replyCancelText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => {
            if (text.trim()) {
              onSubmit(text.trim());
              setText("");
            }
          }}
          style={[styles.replySubmitBtn, !text.trim() && styles.replySubmitDisabled]}
          disabled={!text.trim()}
          activeOpacity={0.8}
        >
          <Text style={styles.replySubmitText}>Reply</Text>
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
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const replies = getReplies(application, comment.id);

  return (
    <View style={[styles.commentItem, depth > 0 && styles.commentIndented]}>
      {/* Thread line for replies */}
      {depth > 0 && <View style={styles.threadLine} />}

      <View style={styles.commentContent}>
        {/* Avatar + author */}
        <View style={styles.commentHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{comment.author.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={styles.commentMeta}>
            <Text style={styles.commentAuthor}>{comment.author}</Text>
            <Text style={styles.commentTime}>{formatTimeAgo(comment.createdAt)}</Text>
          </View>
        </View>

        {/* Body */}
        <Text style={styles.commentText}>{comment.text}</Text>

        {/* Actions */}
        <View style={styles.commentActions}>
          <TouchableOpacity
            onPress={() => setShowReplyForm(!showReplyForm)}
            style={styles.commentAction}
            activeOpacity={0.6}
          >
            <Feather name="corner-down-right" size={12} color={Colors.light.textTertiary} />
            <Text style={styles.commentActionText}>Reply</Text>
          </TouchableOpacity>
          {replies.length > 0 && (
            <TouchableOpacity
              onPress={() => setExpanded(!expanded)}
              style={styles.commentAction}
              activeOpacity={0.6}
            >
              <Feather
                name={expanded ? "chevron-up" : "chevron-down"}
                size={12}
                color={Colors.light.tint}
              />
              <Text style={[styles.commentActionText, { color: Colors.light.tint }]}>
                {expanded ? "Collapse" : `${replies.length} repl${replies.length === 1 ? "y" : "ies"}`}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {showReplyForm && (
          <ReplyForm
            onSubmit={(text) => {
              onReply(comment.id, text);
              setShowReplyForm(false);
            }}
            onCancel={() => setShowReplyForm(false)}
          />
        )}

        {/* Nested replies */}
        {expanded &&
          replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
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
  const [newComment, setNewComment] = useState("");
  const topLevel = application.comments.filter((c) => c.parentCommentId === null);

  return (
    <View style={styles.container}>
      {/* New root comment */}
      <View style={styles.newCommentRow}>
        <View style={styles.newCommentAvatar}>
          <Text style={styles.avatarText}>Y</Text>
        </View>
        <View style={styles.newCommentInput}>
          <TextInput
            style={styles.newInput}
            placeholder="Add a comment..."
            placeholderTextColor={Colors.light.textTertiary}
            value={newComment}
            onChangeText={setNewComment}
            multiline
          />
          {newComment.trim().length > 0 && (
            <TouchableOpacity
              style={styles.submitBtn}
              onPress={() => {
                onAddComment(newComment.trim(), null);
                setNewComment("");
              }}
              activeOpacity={0.8}
            >
              <Feather name="send" size={14} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Thread list */}
      {topLevel.length === 0 ? (
        <View style={styles.emptyComments}>
          <Feather name="message-circle" size={28} color={Colors.light.textTertiary} />
          <Text style={styles.emptyText}>No comments yet</Text>
        </View>
      ) : (
        topLevel.map((comment) => (
          <CommentItem
            key={comment.id}
            comment={comment}
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
  container: {
    gap: 0,
  },
  newCommentRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
    alignItems: "flex-start",
  },
  newCommentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.light.tint,
    alignItems: "center",
    justifyContent: "center",
  },
  newCommentInput: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-end",
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  newInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.light.text,
    maxHeight: 80,
  },
  submitBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.light.tint,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyComments: {
    alignItems: "center",
    paddingVertical: 24,
    gap: 8,
  },
  emptyText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.light.textTertiary,
  },
  commentItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.borderLight,
  },
  commentIndented: {
    marginLeft: 16,
    borderBottomWidth: 0,
    paddingVertical: 8,
  },
  threadLine: {
    position: "absolute",
    left: -16,
    top: 16,
    bottom: 0,
    width: 2,
    backgroundColor: Colors.light.border,
    borderRadius: 1,
  },
  commentContent: {},
  commentHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.light.tint + "20",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: Colors.light.tint,
  },
  commentMeta: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
  },
  commentAuthor: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.light.text,
  },
  commentTime: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.light.textTertiary,
  },
  commentText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.light.text,
    lineHeight: 20,
    marginBottom: 6,
    marginLeft: 36,
  },
  commentActions: {
    flexDirection: "row",
    gap: 14,
    marginLeft: 36,
  },
  commentAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 2,
  },
  commentActionText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.light.textTertiary,
  },
  replyForm: {
    marginLeft: 36,
    marginTop: 8,
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: 10,
    padding: 10,
  },
  replyInput: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.light.text,
    minHeight: 48,
    textAlignVertical: "top",
  },
  replyActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 6,
  },
  replyCancelBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  replyCancelText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.light.textSecondary,
  },
  replySubmitBtn: {
    backgroundColor: Colors.light.tint,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  replySubmitDisabled: {
    opacity: 0.4,
  },
  replySubmitText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
});
