import * as DocumentPicker from "expo-document-picker";
import { Feather } from "@expo/vector-icons";
import React from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import Colors from "@/constants/colors";
import type { Attachment } from "@/services/documents";
import { formatFileSize, formatDate } from "@/utils/formatting";

function mimeIcon(mimeType: string): React.ComponentProps<typeof Feather>["name"] {
  if (mimeType.includes("pdf")) return "file-text";
  if (mimeType.includes("image")) return "image";
  if (mimeType.includes("word") || mimeType.includes("doc")) return "file-text";
  if (mimeType.includes("excel") || mimeType.includes("sheet") || mimeType.includes("csv")) return "grid";
  return "paperclip";
}

function mimeColor(mimeType: string): string {
  if (mimeType.includes("pdf")) return Colors.light.error;
  if (mimeType.includes("image")) return Colors.light.statusSubmitted;
  if (mimeType.includes("word") || mimeType.includes("doc")) return Colors.light.info;
  if (mimeType.includes("excel") || mimeType.includes("sheet") || mimeType.includes("csv")) return Colors.light.success;
  return Colors.light.tint;
}

type Props = {
  attachments: Attachment[];
  onAdd: (attachment: Omit<Attachment, "id" | "applicationId" | "uploadedAt" | "uploadedBy">) => void;
  onDelete: (id: string) => void;
};

export function AttachmentList({ attachments, onAdd, onDelete }: Props) {
  const handlePick = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        multiple: false,
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      onAdd({
        name: asset.name,
        uri: asset.uri,
        mimeType: asset.mimeType ?? "application/octet-stream",
        sizeBytes: asset.size ?? 0,
      });
    } catch {
      Alert.alert("Error", "Could not pick document. Please try again.");
    }
  };

  const handleDelete = (id: string, name: string) => {
    Alert.alert("Remove Attachment", `Remove "${name}"?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: () => onDelete(id) },
    ]);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.uploadBtn} onPress={handlePick} activeOpacity={0.7}>
        <Feather name="upload" size={15} color={Colors.light.tint} />
        <Text style={styles.uploadText}>Attach Document</Text>
      </TouchableOpacity>

      {attachments.length === 0 ? (
        <View style={styles.empty}>
          <Feather name="folder" size={24} color={Colors.light.textTertiary} />
          <Text style={styles.emptyText}>No documents attached</Text>
        </View>
      ) : (
        attachments.map((att) => (
          <View key={att.id} style={styles.item}>
            <View style={[styles.iconBox, { borderColor: mimeColor(att.mimeType) + "40", backgroundColor: mimeColor(att.mimeType) + "12" }]}>
              <Feather name={mimeIcon(att.mimeType)} size={16} color={mimeColor(att.mimeType)} />
            </View>
            <View style={styles.itemMeta}>
              <Text style={styles.itemName} numberOfLines={1}>{att.name}</Text>
              <Text style={styles.itemSub}>
                {formatFileSize(att.sizeBytes)} · {formatDate(att.uploadedAt)} · {att.uploadedBy}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => handleDelete(att.id, att.name)}
              style={styles.deleteBtn}
              activeOpacity={0.6}
            >
              <Feather name="x" size={15} color={Colors.light.textTertiary} />
            </TouchableOpacity>
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8 },

  uploadBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.light.tint,
    borderStyle: "dashed",
    borderRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 4,
    backgroundColor: Colors.light.tintLight + "30",
  },
  uploadText: {
    fontSize: 13,
    fontFamily: "OpenSans_600SemiBold",
    color: Colors.light.tint,
  },

  empty: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
    gap: 8,
  },
  emptyText: {
    fontSize: 13,
    fontFamily: "OpenSans_400Regular",
    color: Colors.light.textTertiary,
  },

  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: Colors.light.backgroundCard,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 4,
    padding: 12,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 4,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  itemMeta: { flex: 1 },
  itemName: {
    fontSize: 13,
    fontFamily: "OpenSans_600SemiBold",
    color: Colors.light.text,
    marginBottom: 2,
  },
  itemSub: {
    fontSize: 11,
    fontFamily: "OpenSans_400Regular",
    color: Colors.light.textTertiary,
  },
  deleteBtn: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
});
