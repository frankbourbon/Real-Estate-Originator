import { Feather } from "@expo/vector-icons";
import React from "react";
import { Linking, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import Colors from "@/constants/colors";
import type { PropertyLocation } from "@/services/core";

const API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

function buildEmbedUrl(loc: PropertyLocation): string | null {
  if (!API_KEY) return null;

  if (loc.latitude && loc.longitude) {
    const lat = parseFloat(loc.latitude);
    const lng = parseFloat(loc.longitude);
    if (!isNaN(lat) && !isNaN(lng)) {
      return (
        `https://www.google.com/maps/embed/v1/view` +
        `?key=${API_KEY}` +
        `&center=${lat},${lng}` +
        `&zoom=16` +
        `&maptype=roadmap`
      );
    }
  }

  const parts = [loc.streetAddress, loc.city, loc.state, loc.zipCode].filter(Boolean);
  if (parts.length > 0) {
    return (
      `https://www.google.com/maps/embed/v1/place` +
      `?key=${API_KEY}` +
      `&q=${encodeURIComponent(parts.join(", "))}` +
      `&zoom=16`
    );
  }

  return null;
}

function buildMapsUrl(loc: PropertyLocation): string {
  if (loc.latitude && loc.longitude) {
    const lat = parseFloat(loc.latitude);
    const lng = parseFloat(loc.longitude);
    if (!isNaN(lat) && !isNaN(lng)) {
      return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    }
  }
  const parts = [loc.streetAddress, loc.city, loc.state, loc.zipCode].filter(Boolean).join(", ");
  return parts ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(parts)}` : "";
}

type Props = {
  loc: PropertyLocation;
  height?: number;
};

export function PropertyMapView({ loc, height = 200 }: Props) {
  const embedUrl = buildEmbedUrl(loc);
  const mapsUrl = buildMapsUrl(loc);

  if (!API_KEY) {
    return (
      <View style={[s.placeholder, { height }]}>
        <Feather name="map" size={22} color={Colors.light.border} />
        <Text style={s.placeholderText}>Google Maps API key not configured</Text>
      </View>
    );
  }

  if (!embedUrl) {
    return (
      <View style={[s.placeholder, { height }]}>
        <Feather name="map-pin" size={22} color={Colors.light.border} />
        <Text style={s.placeholderText}>Add an address to see the map</Text>
      </View>
    );
  }

  return (
    <View style={[s.container, { height }]}>
      {/* On web, render a real iframe — Expo Web runs in the browser DOM */}
      <iframe
        src={embedUrl}
        width="100%"
        height="100%"
        style={{ border: "none", display: "block" } as React.CSSProperties}
        allowFullScreen
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        title={`Map — ${loc.label ?? loc.streetAddress ?? "Property"}`}
      />
      {/* Open in Google Maps button */}
      {mapsUrl ? (
        <TouchableOpacity
          style={s.openOverlay}
          onPress={() => Linking.openURL(mapsUrl)}
          activeOpacity={0.85}
        >
          <View style={s.openPill}>
            <Feather name="external-link" size={12} color="#fff" />
            <Text style={s.openPillText}>Open in Maps</Text>
          </View>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    borderRadius: 8,
    overflow: "hidden",
    position: "relative",
    backgroundColor: "#E6E9EB",
    marginTop: 10,
  },
  placeholder: {
    borderRadius: 8,
    backgroundColor: "#F0F2F4",
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 10,
  },
  placeholderText: {
    fontSize: 12,
    color: Colors.light.textTertiary,
    fontFamily: "OpenSans_400Regular",
    textAlign: "center",
    paddingHorizontal: 16,
  },
  openOverlay: {
    position: "absolute",
    bottom: 10,
    right: 10,
  },
  openPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: Colors.light.tint,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  openPillText: {
    fontSize: 11,
    color: "#fff",
    fontFamily: "OpenSans_600SemiBold",
  },
});
