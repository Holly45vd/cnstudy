import { createTheme } from "@mui/material/styles";

const coral = "#FF6B6B";
const mint = "#A5E6C8";
const navy = "#0A0F29";

export const theme = createTheme({
  palette: {
    primary: { main: coral },
    secondary: { main: mint },
    text: { primary: navy, secondary: "#4A4A4A" },
    background: {
      default: "#FFFFFF",
      paper: "#FFFFFF",
    },
  },
  shape: { borderRadius: 16 },
  typography: {
    fontFamily: [
      "Pretendard Variable",
      "ZCOOL KuaiLe",
      "sans-serif",
    ].join(","),
    h5: { fontWeight: 700 },
    body1: { fontSize: 16 },
    body2: { fontSize: 14 },
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          backdropFilter: "blur(8px)",
          boxShadow: "0 4px 12px rgba(255,107,107,0.15)",
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 20,
          textTransform: "none",
          fontWeight: 600,
        },
      },
    },
  },
});
