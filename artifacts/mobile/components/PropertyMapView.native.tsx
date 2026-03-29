import { Feather } from "@expo/vector-icons";
import React, { useState } from "react";
import { Linking, Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import WebView from "react-native-webview";

import Colors from "@/constants/colors";
import type { PropertyLocation } from "@/services/core";

const API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

// Build the Maps Embed API URL. Prefer lat/lng for precision; fall back to address.
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

  const parts = [
    loc.streetAddress,
    loc.city,
    loc.state,
    loc.zipCode,
  ].filter(Boolean);

  if (parts.length > 0) {
    const q = encodeURIComponent(parts.join(", "));
    return (
      `https://www.google.com/maps/embed/v1/place` +
      `?key=${API_KEY}` +
      `&q=${q}` +
      `&zoom=16`
    );
  }

  return null;
}

// Build a deep-link URL for opening the native Maps app.
function buildMapsDeepLink(loc: PropertyLocation): string {
  if (loc.latitude && loc.longitude) {
    const lat = parseFloat(loc.latitude);
    const lng = parseFloat(loc.longitude);
    if (!isNaN(lat) && !isNaN(lng)) {
      return Platform.OS === "ios"
        ? `maps://?ll=${lat},${lng}&q=${encodeURIComponent(loc.label ?? "Property")}`
        : `geo:${lat},${lng}?q=${lat},${lng}(${encodeURIComponent(loc.label ?? "Property")})`;
    }
  }
  const parts = [loc.streetAddress, loc.city, loc.state, loc.zipCode].filter(Boolean).join(", ");
  if (parts) {
    return Platform.OS === "ios"
      ? `maps://?address=${encodeURIComponent(parts)}`
      : `geo:0,0?q=${encodeURIComponent(parts)}`;
  }
  return "";
}

type Props = {
  loc: PropertyLocation;
  height?: number;
};

export function PropertyMapView({ loc, height = 200 }: Props) {
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const embedUrl = buildEmbedUrl(loc);
  const deepLink = buildMapsDeepLink(loc);

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

  if (error) {
    return (
      <View style={[s.placeholder, { height }]}>
        <Feather name="alert-circle" size={22} color="#C75300" />
        <Text style={s.placeholderText}>Map unavailable</Text>
        {deepLink ? (
          <TouchableOpacity onPress={() => Linking.openURL(deepLink)} style={s.openBtn}>
            <Feather name="external-link" size={13} color={Colors.light.tint} />
            <Text style={s.openBtnText}>Open in Maps</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    );
  }

  return (
    <View style={[s.container, { height }]}>
      {/* Loading shimmer */}
      {!loaded && (
        <View style={[s.shimmer, StyleSheet.absoluteFill]}>
          <Feather name="map" size={22} color={Colors.light.border} />
          <Text style={s.shimmerText}>Loading map…</Text>
        </View>
      )}

      <WebView
        source={{ uri: embedUrl }}
        style={s.webview}
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
        scrollEnabled={false}
        javaScriptEnabled
        // Required on Android to allow Google Maps embed
        mixedContentMode="always"
        // Suppress permission dialogs for geolocation
        geolocationEnabled={false}
      />

      {/* Overlay tap-target: opens native Maps app */}
      {deepLink ? (
        <TouchableOpacity
          style={s.openOverlay}
          onPress={() => Linking.openURL(deepLink)}
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
  webview: {
    flex: 1,
    backgroundColor: "transparent",
  },
  shimmer: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E6E9EB",
    gap: 6,
  },
  shimmerText: {
    fontSize: 12,
    color: Colors.light.textTertiary,
    fontFamily: "OpenSans_400Regular",
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
  openBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: Colors.light.tint,
  },
  openBtnText: {
    fontSize: 12,
    color: Colors.light.tint,
    fontFamily: "OpenSans_600SemiBold",
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
