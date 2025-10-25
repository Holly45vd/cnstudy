// src/components/Navbar.jsx
import React, { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import BottomNavigation from "@mui/material/BottomNavigation";
import BottomNavigationAction from "@mui/material/BottomNavigationAction";
import Box from "@mui/material/Box";

/* Icons */
import MenuBookIcon from "@mui/icons-material/MenuBook";
import TodayIcon from "@mui/icons-material/Today";
import RecordVoiceOverIcon from "@mui/icons-material/RecordVoiceOver";
import SettingsIcon from "@mui/icons-material/Settings";
import StyleIcon from "@mui/icons-material/Style"; // ✅ 플래시카드

function today() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

export default function Navbar() {
  const nav = useNavigate();
  const { pathname } = useLocation();

  const value = useMemo(() => {
    if (pathname.startsWith("/everyday")) return "everyday";
    if (pathname.startsWith("/pronunciation")) return "pronunciation";
    if (pathname.startsWith("/flashcards")) return "flashcards"; // ✅ 추가
    if (pathname.startsWith("/admin")) return "admin";
    return "units";
  }, [pathname]);

  const handleChange = (_e, newValue) => {
    switch (newValue) {
      case "units":
        nav("/");
        break;
      case "everyday":
        nav(`/everyday/${today()}`);
        break;
      case "pronunciation":
        nav("/pronunciation");
        break;
      case "flashcards": // ✅ 추가
        nav("/flashcards");
        break;
      case "admin":
        nav("/admin");
        break;
      default:
        break;
    }
  };

  return (
    <AppBar
      position="sticky"
      color="default"
      elevation={0}
      sx={{
        borderBottom: 1,
        borderColor: "divider",
        bgcolor: "#fff",
      }}
    >
      <Toolbar disableGutters>
        <Box sx={{ width: "100%" }}>
          <BottomNavigation
            showLabels
            value={value}
            onChange={handleChange}
            sx={{
              width: "100%",
              bgcolor: "transparent",
              "& .Mui-selected": { color: "#1976d2 !important" },
              "& .MuiBottomNavigationAction-root": {
                color: "rgba(0,0,0,0.6)",
                minWidth: { xs: 60, sm: 80 },
                px: { xs: 1, sm: 2 },
              },
            }}
          >
            <BottomNavigationAction label="유닛" value="units" icon={<MenuBookIcon />} />
            <BottomNavigationAction label="데일리" value="everyday" icon={<TodayIcon />} />
            <BottomNavigationAction label="발음" value="pronunciation" icon={<RecordVoiceOverIcon />} />
            <BottomNavigationAction label="카드" value="flashcards" icon={<StyleIcon />} /> {/* ✅ 추가 */}
            <BottomNavigationAction label="Admin" value="admin" icon={<SettingsIcon />} />
          </BottomNavigation>
        </Box>
      </Toolbar>
    </AppBar>
  );
}
