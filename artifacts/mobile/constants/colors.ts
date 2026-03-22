/**
 * Salt Design System — JPM Brand Theme
 * Translated to React Native tokens.
 * Reference: https://www.saltdesignsystem.com/salt/foundations/color
 *
 * Primary accent: Teal (--salt-color-teal-*)
 * Dark surface:   Blue-900 (--salt-color-blue-900) — mastheads/hero cards
 * Page bg:        Gray-100 (--salt-color-gray-100)
 * Borders:        Gray-200 (--salt-color-gray-200)
 * Text:           Gray-900 / Gray-600 / Gray-400
 */

export default {
  light: {
    // ── Text ────────────────────────────────────────────────────────────────
    text:           "#292E33",   // gray-900
    textSecondary:  "#5F646A",   // gray-600
    textTertiary:   "#91959A",   // gray-400
    textInverse:    "#FFFFFF",

    // ── Backgrounds ─────────────────────────────────────────────────────────
    background:          "#E6E9EB",   // gray-100 — page background
    backgroundCard:      "#FFFFFF",   // white — card/surface
    backgroundSecondary: "#F0F2F4",   // between gray-100 and white

    // ── Primary — Teal (Salt accent) ────────────────────────────────────────
    tint:       "#1B7F9E",   // teal-500
    tintMid:    "#12647E",   // teal-600
    tintDark:   "#094A60",   // teal-700
    tintLight:  "#DBF5F7",   // teal-100

    // ── Dark surface (mastheads / hero cards) ────────────────────────────────
    surface:     "#001736",   // blue-900 — deep navy
    surfaceMid:  "#002D59",   // blue-800

    // ── Borders ─────────────────────────────────────────────────────────────
    border:      "#D3D5D8",   // gray-200
    borderLight: "#E6E9EB",   // gray-100

    // ── Semantic — Status ────────────────────────────────────────────────────
    // Draft
    statusDraft:    "#72777D",   // gray-500
    statusDraftBg:  "#E6E9EB",   // gray-100

    // Submitted — Blue (info)
    statusSubmitted:    "#0078CF",   // blue-500
    statusSubmittedBg:  "#EAF6FF",   // blue-100

    // Under Review — Orange (warning)
    statusReview:    "#C75300",   // orange-500
    statusReviewBg:  "#FFECDC",   // orange-100

    // Approved — Green (positive)
    statusApproved:    "#00875D",   // green-500
    statusApprovedBg:  "#EAF5F2",   // green-100

    // Declined — Red (negative)
    statusDeclined:    "#E52135",   // red-500
    statusDeclinedBg:  "#FFECEA",   // red-100

    // ── Semantic — Utility ───────────────────────────────────────────────────
    success:   "#00875D",   // green-500
    successBg: "#EAF5F2",   // green-100
    warning:   "#C75300",   // orange-500
    warningBg: "#FFECDC",   // orange-100
    error:     "#E52135",   // red-500
    errorBg:   "#FFECEA",   // red-100
    info:      "#0078CF",   // blue-500
    infoBg:    "#EAF6FF",   // blue-100

    // ── Accent (used sparingly for highlights) ───────────────────────────────
    accent:      "#C75300",   // orange-500 — used for special callouts
    accentLight: "#FFECDC",   // orange-100

    // ── Tab ─────────────────────────────────────────────────────────────────
    tabIconDefault:  "#91959A",   // gray-400
    tabIconSelected: "#1B7F9E",   // teal-500
  },
};
