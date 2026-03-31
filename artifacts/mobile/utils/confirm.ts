import { Alert, Platform } from "react-native";

/**
 * Web-compatible destructive confirmation dialog.
 * On web: window.confirm (synchronous).
 * On native: Alert.alert with Cancel + destructive action.
 */
export function confirmDestructive(
  title: string,
  message: string,
  actionLabel: string,
  onConfirm: () => void,
) {
  if (Platform.OS === "web") {
    const msg = message ? `${title}\n\n${message}` : title;
    if (window.confirm(msg)) onConfirm();
  } else {
    Alert.alert(title, message, [
      { text: "Cancel", style: "cancel" },
      { text: actionLabel, style: "destructive", onPress: onConfirm },
    ]);
  }
}

/**
 * Web-compatible informational alert (validation errors, etc.)
 */
export function showAlert(title: string, message?: string) {
  if (Platform.OS === "web") {
    window.alert(message ? `${title}\n\n${message}` : title);
  } else {
    Alert.alert(title, message);
  }
}
