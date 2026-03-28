import { Feather } from "@expo/vector-icons";
import React, { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import Colors from "@/constants/colors";

// ─── Types ────────────────────────────────────────────────────────────────────

export type PlaceResult = {
  streetAddress: string;
  city: string;
  state: string;
  zipCode: string;
  latitude: string;
  longitude: string;
  googlePlaceId: string;
};

type Suggestion = {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
};

// ─── API proxy helpers ────────────────────────────────────────────────────────

function placesBase(): string {
  const domain = process.env.EXPO_PUBLIC_DOMAIN ?? "";
  if (!domain) return "";
  return `https://${domain}/api/places`;
}

async function fetchSuggestions(input: string): Promise<Suggestion[]> {
  const base = placesBase();
  if (!base || input.length < 3) return [];
  try {
    const res = await fetch(`${base}/autocomplete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input }),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.suggestions ?? []).map((s: any) => ({
      placeId: s.placePrediction?.placeId ?? "",
      description: s.placePrediction?.text?.text ?? "",
      mainText: s.placePrediction?.structuredFormat?.mainText?.text ?? "",
      secondaryText: s.placePrediction?.structuredFormat?.secondaryText?.text ?? "",
    })).filter((s: Suggestion) => s.placeId);
  } catch {
    return [];
  }
}

async function fetchPlaceDetails(placeId: string): Promise<PlaceResult | null> {
  const base = placesBase();
  if (!base) return null;
  try {
    const res = await fetch(`${base}/${placeId}`);
    if (!res.ok) return null;
    const data = await res.json();

    let streetNumber = "", route = "", city = "", state = "", zip = "";
    for (const comp of data.addressComponents ?? []) {
      const types: string[] = comp.types ?? [];
      if (types.includes("street_number")) streetNumber = comp.longText ?? "";
      if (types.includes("route")) route = comp.shortText ?? comp.longText ?? "";
      if (types.includes("locality")) city = comp.longText ?? "";
      if (types.includes("administrative_area_level_1")) state = comp.shortText ?? "";
      if (types.includes("postal_code")) zip = comp.longText ?? "";
    }

    return {
      streetAddress: [streetNumber, route].filter(Boolean).join(" "),
      city,
      state,
      zipCode: zip,
      latitude: String(data.location?.latitude ?? ""),
      longitude: String(data.location?.longitude ?? ""),
      googlePlaceId: placeId,
    };
  } catch {
    return null;
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

type Props = {
  value: string;
  onSelect: (result: PlaceResult) => void;
  placeholder?: string;
};

export function AddressLookup({ value, onSelect, placeholder = "Search address…" }: Props) {
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hasProxy = Boolean(placesBase());

  const handleChange = useCallback((text: string) => {
    setQuery(text);
    if (!hasProxy) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (text.length < 3) { setSuggestions([]); setOpen(false); return; }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      const results = await fetchSuggestions(text);
      setSuggestions(results);
      setOpen(results.length > 0);
      setLoading(false);
    }, 350);
  }, [hasProxy]);

  const handleSelect = useCallback(async (s: Suggestion) => {
    setOpen(false);
    setQuery(s.mainText);
    setLoading(true);
    const details = await fetchPlaceDetails(s.placeId);
    setLoading(false);
    if (details) {
      setQuery(details.streetAddress || s.mainText);
      onSelect(details);
    }
  }, [onSelect]);

  return (
    <View style={styles.wrapper}>
      <View style={styles.inputRow}>
        <Feather name="map-pin" size={14} color={Colors.light.textTertiary} style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          value={query}
          onChangeText={handleChange}
          placeholder={placeholder}
          placeholderTextColor={Colors.light.textTertiary}
          autoCapitalize="words"
          returnKeyType="search"
        />
        {loading && <ActivityIndicator size="small" color={Colors.light.tint} style={styles.spinner} />}
      </View>

      {open && suggestions.length > 0 && (
        <View style={styles.dropdown}>
          {suggestions.map((s, i) => (
            <TouchableOpacity
              key={s.placeId}
              style={[styles.suggestion, i < suggestions.length - 1 && styles.suggestionBorder]}
              onPress={() => handleSelect(s)}
              activeOpacity={0.75}
            >
              <Feather name="map-pin" size={12} color={Colors.light.tint} style={styles.suggIcon} />
              <View style={styles.suggText}>
                <Text style={styles.suggMain} numberOfLines={1}>{s.mainText}</Text>
                <Text style={styles.suggSub} numberOfLines={1}>{s.secondaryText}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  wrapper: { position: "relative", zIndex: 10 },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.light.background,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 4,
    paddingHorizontal: 10,
  },
  inputIcon: { marginRight: 6 },
  input: {
    flex: 1,
    paddingVertical: Platform.OS === "ios" ? 12 : 10,
    fontSize: 14,
    fontFamily: "OpenSans_400Regular",
    color: Colors.light.text,
  },
  spinner: { marginLeft: 6 },
  dropdown: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    backgroundColor: Colors.light.backgroundCard,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 4,
    marginTop: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 100,
  },
  suggestion: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  suggestionBorder: { borderBottomWidth: 1, borderBottomColor: Colors.light.borderLight },
  suggIcon: { marginRight: 8, marginTop: 2 },
  suggText: { flex: 1 },
  suggMain: {
    fontSize: 13,
    fontFamily: "OpenSans_600SemiBold",
    color: Colors.light.text,
  },
  suggSub: {
    fontSize: 11,
    fontFamily: "OpenSans_400Regular",
    color: Colors.light.textSecondary,
    marginTop: 1,
  },
});
