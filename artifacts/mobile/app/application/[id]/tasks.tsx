import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Colors from "@/constants/colors";
import type { ApplicationStatus } from "@/services/core";
import type { LoanTask } from "@/services/tasks";
import { useTasksService } from "@/services/tasks";
import { useCoreService } from "@/services/core";
import { PHASE_INFO, PHASE_ORDER } from "@/utils/phases";

// ─── Types ────────────────────────────────────────────────────────────────────

type GroupedTasks = {
  phase: ApplicationStatus;
  tasks: LoanTask[];
  complete: number;
  total: number;
};


// ─── Progress bar ─────────────────────────────────────────────────────────────

function PhaseProgress({ complete, total }: { complete: number; total: number }) {
  const pct = total === 0 ? 0 : (complete / total) * 100;
  const color = pct === 100 ? "#00875D" : Colors.light.tint;
  return (
    <View style={prog.wrap}>
      <View style={[prog.track]}>
        <View style={[prog.fill, { width: `${pct}%` as any, backgroundColor: color }]} />
      </View>
      <Text style={[prog.label, { color }]}>
        {complete}/{total}
      </Text>
    </View>
  );
}

const prog = StyleSheet.create({
  wrap: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 2 },
  track: { flex: 1, height: 4, backgroundColor: "#E6E9EB", borderRadius: 2, overflow: "hidden" },
  fill: { height: 4, borderRadius: 2 },
  label: { fontSize: 11, fontFamily: "OpenSans_600SemiBold", minWidth: 30, textAlign: "right" },
});

// ─── Phase group card ─────────────────────────────────────────────────────────

function PhaseGroup({
  group,
  currentPhase,
  onToggle,
  onDelete,
  onAddCustom,
}: {
  group: GroupedTasks;
  currentPhase: ApplicationStatus;
  onToggle: (id: string) => void;
  onDelete: (id: LoanTask) => void;
  onAddCustom: (phase: ApplicationStatus) => void;
}) {
  const info = PHASE_INFO[group.phase];
  const isCurrent = group.phase === currentPhase;
  const isPast = PHASE_ORDER.indexOf(group.phase) < PHASE_ORDER.indexOf(currentPhase);
  const isFuture = PHASE_ORDER.indexOf(group.phase) > PHASE_ORDER.indexOf(currentPhase);

  return (
    <View style={[pg.card, isCurrent && { borderLeftColor: info.color, borderLeftWidth: 3 }]}>
      <View style={pg.header}>
        <View style={[pg.phaseDot, { backgroundColor: isFuture ? "#CCC" : info.color }]} />
        <View style={{ flex: 1 }}>
          <View style={pg.titleRow}>
            <Text style={[pg.phaseTitle, isFuture && { color: Colors.light.textTertiary }]}>
              Phase {info.phase} · {group.phase}
            </Text>
            {isCurrent && (
              <View style={[pg.currentBadge, { backgroundColor: info.bg }]}>
                <Text style={[pg.currentBadgeText, { color: info.color }]}>Active</Text>
              </View>
            )}
          </View>
          <PhaseProgress complete={group.complete} total={group.total} />
        </View>
      </View>

      {group.tasks.map((task) => (
        <View key={task.id} style={pg.taskRow}>
          <Pressable
            onPress={() => onToggle(task.id)}
            style={pg.checkbox}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: task.isComplete }}
          >
            <Feather
              name={task.isComplete ? "check-square" : "square"}
              size={18}
              color={task.isComplete ? "#00875D" : Colors.light.textTertiary}
            />
          </Pressable>
          <Text
            style={[
              pg.taskTitle,
              task.isComplete && pg.taskDone,
              isFuture && { color: Colors.light.textTertiary },
            ]}
          >
            {task.title}
          </Text>
          {task.isCustom && (
            <TouchableOpacity onPress={() => onDelete(task)} hitSlop={8}>
              <Feather name="x" size={14} color={Colors.light.textTertiary} />
            </TouchableOpacity>
          )}
        </View>
      ))}

      <TouchableOpacity style={pg.addBtn} onPress={() => onAddCustom(group.phase)}>
        <Feather name="plus" size={14} color={Colors.light.tint} />
        <Text style={pg.addBtnText}>Add task</Text>
      </TouchableOpacity>
    </View>
  );
}

const pg = StyleSheet.create({
  card: {
    backgroundColor: Colors.light.card,
    borderRadius: 10,
    marginBottom: 10,
    padding: 14,
    borderLeftWidth: 0,
    borderLeftColor: "transparent",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  header: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 10 },
  phaseDot: { width: 10, height: 10, borderRadius: 5, marginTop: 3 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  phaseTitle: { fontSize: 13, fontFamily: "OpenSans_700Bold", color: Colors.light.text },
  currentBadge: {
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4,
  },
  currentBadgeText: { fontSize: 10, fontFamily: "OpenSans_700Bold" },
  taskRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 5,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
  },
  checkbox: { padding: 2 },
  taskTitle: { flex: 1, fontSize: 13, fontFamily: "OpenSans_400Regular", color: Colors.light.text },
  taskDone: { textDecorationLine: "line-through", color: Colors.light.textTertiary },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingTop: 8,
    marginTop: 4,
  },
  addBtnText: { fontSize: 12, fontFamily: "OpenSans_600SemiBold", color: Colors.light.tint },
});

// ─── Add custom task modal ────────────────────────────────────────────────────

function AddTaskModal({
  visible,
  phase,
  onClose,
  onSave,
}: {
  visible: boolean;
  phase: ApplicationStatus | null;
  onClose: () => void;
  onSave: (phase: ApplicationStatus, title: string) => void;
}) {
  const [title, setTitle] = useState("");
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (visible) { setTitle(""); setTimeout(() => inputRef.current?.focus(), 200); }
  }, [visible]);

  const handleSave = () => {
    if (!phase || !title.trim()) return;
    onSave(phase, title.trim());
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={m.overlay} onPress={onClose}>
        <Pressable style={m.sheet} onPress={() => {}}>
          <Text style={m.title}>Add Custom Task</Text>
          {phase && (
            <Text style={m.sub}>Phase: {phase}</Text>
          )}
          <TextInput
            ref={inputRef}
            style={m.input}
            placeholder="Task title…"
            placeholderTextColor={Colors.light.textTertiary}
            value={title}
            onChangeText={setTitle}
            returnKeyType="done"
            onSubmitEditing={handleSave}
          />
          <View style={m.row}>
            <TouchableOpacity style={m.cancel} onPress={onClose}>
              <Text style={m.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[m.save, !title.trim() && { opacity: 0.4 }]}
              onPress={handleSave}
              disabled={!title.trim()}
            >
              <Text style={m.saveText}>Add Task</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const m = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center", alignItems: "center", padding: 24,
  },
  sheet: {
    backgroundColor: "#fff", borderRadius: 12, padding: 20, width: "100%", maxWidth: 400,
  },
  title: { fontSize: 16, fontFamily: "OpenSans_700Bold", color: Colors.light.text, marginBottom: 4 },
  sub: { fontSize: 12, fontFamily: "OpenSans_400Regular", color: Colors.light.textTertiary, marginBottom: 12 },
  input: {
    borderWidth: 1, borderColor: Colors.light.border, borderRadius: 6,
    paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 14, fontFamily: "OpenSans_400Regular", color: Colors.light.text,
    marginBottom: 14,
  },
  row: { flexDirection: "row", gap: 10 },
  cancel: {
    flex: 1, paddingVertical: 10, borderRadius: 6,
    borderWidth: 1, borderColor: Colors.light.border, alignItems: "center",
  },
  cancelText: { fontSize: 14, fontFamily: "OpenSans_600SemiBold", color: Colors.light.text },
  save: {
    flex: 1, paddingVertical: 10, borderRadius: 6,
    backgroundColor: Colors.light.tint, alignItems: "center",
  },
  saveText: { fontSize: 14, fontFamily: "OpenSans_600SemiBold", color: "#fff" },
});

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function TasksScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getApplication } = useCoreService();
  const { getTasksForApplication, seedTasksForPhase, toggleTask, addTask, deleteTask } = useTasksService();
  const insets = useSafeAreaInsets();

  const [seeded, setSeeded] = useState(false);
  const [modalPhase, setModalPhase] = useState<ApplicationStatus | null>(null);

  const app = getApplication(id);
  const allTasks = getTasksForApplication(id);

  useEffect(() => {
    if (!seeded && app && allTasks.length === 0) {
      setSeeded(true);
      Promise.all(
        PHASE_ORDER.map((phase, phaseIdx) => {
          const info = PHASE_INFO[phase];
          const items = info.checklist.map((title, i) => ({
            title,
            description: "",
            sortOrder: phaseIdx * 100 + i,
          }));
          return seedTasksForPhase(id, phase, items);
        })
      );
    } else if (!seeded) {
      setSeeded(true);
    }
  }, [seeded, app, allTasks.length]);

  if (!app) {
    return (
      <View style={s.center}>
        <Text style={s.notFound}>Application not found</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={s.backLink}>← Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const groups: GroupedTasks[] = PHASE_ORDER.map((phase) => {
    const phaseTasks = allTasks
      .filter((t) => t.phase === phase)
      .sort((a, b) => a.sortOrder - b.sortOrder);
    return {
      phase,
      tasks: phaseTasks,
      complete: phaseTasks.filter((t) => t.isComplete).length,
      total: phaseTasks.length,
    };
  });

  const totalComplete = allTasks.filter((t) => t.isComplete).length;
  const totalTasks = allTasks.length;

  const handleAddCustom = async (phase: ApplicationStatus, title: string) => {
    const phaseTasks = allTasks.filter((t) => t.phase === phase);
    const maxSort = phaseTasks.length > 0 ? Math.max(...phaseTasks.map((t) => t.sortOrder)) : 0;
    await addTask(id, phase, { title, description: "", isCustom: true, sortOrder: maxSort + 1 });
  };

  const handleDelete = (task: LoanTask) => {
    if (!task.isCustom) return;
    Alert.alert("Delete Task", `Delete "${task.title}"?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteTask(task.id) },
    ]);
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <>
      <View style={[s.header, { paddingTop: topPad + 8 }]}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Feather name="arrow-left" size={18} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Phase Checklist</Text>
          <Text style={s.headerSub}>{totalComplete}/{totalTasks} tasks complete</Text>
        </View>
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={[s.content, { paddingBottom: bottomPad + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {groups.map((group) => (
          <PhaseGroup
            key={group.phase}
            group={group}
            currentPhase={app.status}
            onToggle={toggleTask}
            onDelete={handleDelete}
            onAddCustom={(phase) => setModalPhase(phase)}
          />
        ))}
      </ScrollView>

      <AddTaskModal
        visible={modalPhase !== null}
        phase={modalPhase}
        onClose={() => setModalPhase(null)}
        onSave={handleAddCustom}
      />
    </>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  notFound: { fontSize: 15, fontFamily: "OpenSans_600SemiBold", color: Colors.light.text },
  backLink: { marginTop: 12, fontSize: 14, color: Colors.light.tint, fontFamily: "OpenSans_600SemiBold" },

  header: {
    backgroundColor: Colors.light.surface,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 14,
    gap: 12,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.08)",
    justifyContent: "center", alignItems: "center",
  },
  headerTitle: { fontSize: 17, fontFamily: "OpenSans_700Bold", color: "#fff" },
  headerSub: { fontSize: 12, fontFamily: "OpenSans_400Regular", color: "rgba(255,255,255,0.65)", marginTop: 2 },

  scroll: { flex: 1, backgroundColor: Colors.light.background },
  content: { padding: 14 },
});
