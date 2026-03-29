import * as DocumentPicker from "expo-document-picker";
import { Feather } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import Colors from "@/constants/colors";
import type { AppliesToRef, Attachment, FileType } from "@/services/documents";
import { FILE_TYPES } from "@/services/documents";
import { formatFileSize, formatDate } from "@/utils/formatting";

// ─── Icons / Colors ───────────────────────────────────────────────────────────

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

// ─── Types ────────────────────────────────────────────────────────────────────

export type AppliesToOption = {
  kind: "borrower" | "property";
  id: string;
  label: string;
};

type PendingFile = {
  name: string;
  uri: string;
  mimeType: string;
  sizeBytes: number;
};

type Props = {
  attachments: Attachment[];
  onAdd: (attachment: Omit<Attachment, "id" | "applicationId" | "uploadedAt" | "uploadedBy">) => void;
  onDelete: (id: string) => void;
  /** Borrower + property options for the Applies To multi-select. */
  appliesToOptions?: AppliesToOption[];
};

// ─── Metadata Modal ───────────────────────────────────────────────────────────

type MetadataModalProps = {
  file: PendingFile;
  appliesToOptions: AppliesToOption[];
  onConfirm: (meta: { fileType: string; formNumber: string; appliesTo: AppliesToRef[] }) => void;
  onCancel: () => void;
};

function MetadataModal({ file, appliesToOptions, onConfirm, onCancel }: MetadataModalProps) {
  const [fileType, setFileType] = useState<string>("");
  const [formNumber, setFormNumber] = useState("");
  const [selectedRefs, setSelectedRefs] = useState<AppliesToRef[]>([]);

  const toggleRef = (opt: AppliesToOption) => {
    const exists = selectedRefs.some((r) => r.kind === opt.kind && r.id === opt.id);
    if (exists) {
      setSelectedRefs(selectedRefs.filter((r) => !(r.kind === opt.kind && r.id === opt.id)));
    } else {
      setSelectedRefs([...selectedRefs, { kind: opt.kind, id: opt.id }]);
    }
  };

  const isSelected = (opt: AppliesToOption) =>
    selectedRefs.some((r) => r.kind === opt.kind && r.id === opt.id);

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onCancel}>
      <View style={modal.overlay}>
        <View style={modal.sheet}>
          {/* Header */}
          <View style={modal.header}>
            <Text style={modal.title}>Document Details</Text>
            <TouchableOpacity onPress={onCancel} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Feather name="x" size={18} color={Colors.light.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* File name preview */}
          <View style={modal.fileRow}>
            <Feather name={mimeIcon(file.mimeType)} size={14} color={mimeColor(file.mimeType)} />
            <Text style={modal.fileName} numberOfLines={1}>{file.name}</Text>
            <Text style={modal.fileSize}>{formatFileSize(file.sizeBytes)}</Text>
          </View>

          <ScrollView style={modal.body} showsVerticalScrollIndicator={false}>

            {/* File Type */}
            <Text style={modal.label}>File Type</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={modal.typeRow}
            >
              {FILE_TYPES.map((ft) => {
                const active = fileType === ft;
                return (
                  <TouchableOpacity
                    key={ft}
                    onPress={() => setFileType(active ? "" : ft)}
                    style={[modal.typeChip, active && modal.typeChipActive]}
                    activeOpacity={0.7}
                  >
                    <Text style={[modal.typeChipText, active && modal.typeChipTextActive]}>
                      {ft}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Form Number */}
            <Text style={modal.label}>Form Number</Text>
            <TextInput
              style={modal.input}
              value={formNumber}
              onChangeText={setFormNumber}
              placeholder="e.g. IRS 4506-C, Fannie 1003"
              placeholderTextColor={Colors.light.textTertiary}
              autoCorrect={false}
              autoCapitalize="characters"
            />

            {/* Applies To */}
            {appliesToOptions.length > 0 && (
              <>
                <Text style={modal.label}>Applies To</Text>
                <View style={modal.appliesToList}>
                  {appliesToOptions.map((opt) => {
                    const sel = isSelected(opt);
                    const icon: React.ComponentProps<typeof Feather>["name"] =
                      opt.kind === "borrower" ? "user" : "home";
                    const color = opt.kind === "borrower" ? Colors.light.tint : Colors.light.success;
                    return (
                      <TouchableOpacity
                        key={`${opt.kind}:${opt.id}`}
                        style={[modal.appliesToRow, sel && { borderColor: color, backgroundColor: color + "10" }]}
                        onPress={() => toggleRef(opt)}
                        activeOpacity={0.7}
                      >
                        <View style={[modal.appliesToIcon, { backgroundColor: color + "20" }]}>
                          <Feather name={icon} size={12} color={color} />
                        </View>
                        <View style={modal.appliesToMeta}>
                          <Text style={modal.appliesToKind}>
                            {opt.kind === "borrower" ? "BORROWER" : "PROPERTY"}
                          </Text>
                          <Text style={modal.appliesToLabel} numberOfLines={1}>{opt.label}</Text>
                        </View>
                        <View style={[modal.checkbox, sel && { backgroundColor: color, borderColor: color }]}>
                          {sel && <Feather name="check" size={10} color="#fff" />}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            )}

          </ScrollView>

          {/* Actions */}
          <View style={modal.actions}>
            <TouchableOpacity style={modal.cancelBtn} onPress={onCancel} activeOpacity={0.7}>
              <Text style={modal.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={modal.confirmBtn}
              onPress={() => onConfirm({ fileType, formNumber: formNumber.trim(), appliesTo: selectedRefs })}
              activeOpacity={0.7}
            >
              <Feather name="paperclip" size={13} color="#fff" />
              <Text style={modal.confirmText}>Attach</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function AttachmentList({ attachments, onAdd, onDelete, appliesToOptions = [] }: Props) {
  const [pendingFile, setPendingFile] = useState<PendingFile | null>(null);

  const handlePick = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        multiple: false,
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      setPendingFile({
        name: asset.name,
        uri: asset.uri,
        mimeType: asset.mimeType ?? "application/octet-stream",
        sizeBytes: asset.size ?? 0,
      });
    } catch {
      Alert.alert("Error", "Could not pick document. Please try again.");
    }
  };

  const handleConfirmMeta = (meta: { fileType: string; formNumber: string; appliesTo: AppliesToRef[] }) => {
    if (!pendingFile) return;
    onAdd({
      name: pendingFile.name,
      uri: pendingFile.uri,
      mimeType: pendingFile.mimeType,
      sizeBytes: pendingFile.sizeBytes,
      serviceTag: "",
      uploadedBy: "You",
      fileType: meta.fileType,
      formNumber: meta.formNumber,
      appliesTo: meta.appliesTo,
    });
    setPendingFile(null);
  };

  const handleDelete = (id: string, name: string) => {
    Alert.alert("Remove Attachment", `Remove "${name}"?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: () => onDelete(id) },
    ]);
  };

  return (
    <View style={styles.container}>
      {/* Metadata modal */}
      {pendingFile && (
        <MetadataModal
          file={pendingFile}
          appliesToOptions={appliesToOptions}
          onConfirm={handleConfirmMeta}
          onCancel={() => setPendingFile(null)}
        />
      )}

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
              {/* Metadata tags */}
              {(att.fileType || att.formNumber || att.appliesTo?.length > 0) && (
                <View style={styles.tags}>
                  {att.fileType ? (
                    <View style={styles.tag}>
                      <Text style={styles.tagText}>{att.fileType}</Text>
                    </View>
                  ) : null}
                  {att.formNumber ? (
                    <View style={[styles.tag, styles.tagForm]}>
                      <Feather name="hash" size={9} color={Colors.light.info} />
                      <Text style={[styles.tagText, { color: Colors.light.info }]}>{att.formNumber}</Text>
                    </View>
                  ) : null}
                  {att.appliesTo?.map((ref) => {
                    const opt = appliesToOptions.find((o) => o.kind === ref.kind && o.id === ref.id);
                    if (!opt) return null;
                    const color = ref.kind === "borrower" ? Colors.light.tint : Colors.light.success;
                    const icon: React.ComponentProps<typeof Feather>["name"] =
                      ref.kind === "borrower" ? "user" : "home";
                    return (
                      <View key={`${ref.kind}:${ref.id}`} style={[styles.tag, { borderColor: color + "60", backgroundColor: color + "10" }]}>
                        <Feather name={icon} size={9} color={color} />
                        <Text style={[styles.tagText, { color }]} numberOfLines={1}>{opt.label}</Text>
                      </View>
                    );
                  })}
                </View>
              )}
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

// ─── Styles ───────────────────────────────────────────────────────────────────

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
    alignItems: "flex-start",
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
    flexShrink: 0,
    marginTop: 1,
  },
  itemMeta: { flex: 1, gap: 2 },
  itemName: {
    fontSize: 13,
    fontFamily: "OpenSans_600SemiBold",
    color: Colors.light.text,
  },
  itemSub: {
    fontSize: 11,
    fontFamily: "OpenSans_400Regular",
    color: Colors.light.textTertiary,
  },
  tags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    marginTop: 5,
  },
  tag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 3,
    paddingHorizontal: 5,
    paddingVertical: 2,
    backgroundColor: Colors.light.background,
  },
  tagForm: {
    borderColor: Colors.light.info + "60",
    backgroundColor: Colors.light.info + "10",
  },
  tagText: {
    fontSize: 10,
    fontFamily: "OpenSans_600SemiBold",
    color: Colors.light.textSecondary,
  },
  deleteBtn: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
});

const modal = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: Colors.light.backgroundCard,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    maxHeight: "85%",
    paddingBottom: 32,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  title: {
    fontSize: 15,
    fontFamily: "OpenSans_700Bold",
    color: Colors.light.text,
  },
  fileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: Colors.light.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  fileName: {
    flex: 1,
    fontSize: 12,
    fontFamily: "OpenSans_600SemiBold",
    color: Colors.light.text,
  },
  fileSize: {
    fontSize: 11,
    fontFamily: "OpenSans_400Regular",
    color: Colors.light.textTertiary,
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  label: {
    fontSize: 11,
    fontFamily: "OpenSans_700Bold",
    color: Colors.light.textSecondary,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: 8,
    marginTop: 16,
  },
  typeRow: {
    flexDirection: "row",
    gap: 6,
    paddingBottom: 4,
  },
  typeChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.light.border,
    backgroundColor: Colors.light.background,
  },
  typeChipActive: {
    backgroundColor: Colors.light.tint,
    borderColor: Colors.light.tint,
  },
  typeChipText: {
    fontSize: 12,
    fontFamily: "OpenSans_400Regular",
    color: Colors.light.textSecondary,
  },
  typeChipTextActive: {
    fontFamily: "OpenSans_600SemiBold",
    color: "#fff",
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    fontFamily: "OpenSans_400Regular",
    color: Colors.light.text,
    backgroundColor: Colors.light.background,
  },
  appliesToList: {
    gap: 8,
  },
  appliesToRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 4,
    padding: 10,
    backgroundColor: Colors.light.background,
  },
  appliesToIcon: {
    width: 28,
    height: 28,
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  appliesToMeta: { flex: 1 },
  appliesToKind: {
    fontSize: 9,
    fontFamily: "OpenSans_700Bold",
    color: Colors.light.textTertiary,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: 1,
  },
  appliesToLabel: {
    fontSize: 12,
    fontFamily: "OpenSans_600SemiBold",
    color: Colors.light.text,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 3,
    borderWidth: 1.5,
    borderColor: Colors.light.border,
    alignItems: "center",
    justifyContent: "center",
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
    marginTop: 4,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: Colors.light.border,
    alignItems: "center",
  },
  cancelText: {
    fontSize: 13,
    fontFamily: "OpenSans_600SemiBold",
    color: Colors.light.textSecondary,
  },
  confirmBtn: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 4,
    backgroundColor: Colors.light.tint,
  },
  confirmText: {
    fontSize: 13,
    fontFamily: "OpenSans_600SemiBold",
    color: "#fff",
  },
});
