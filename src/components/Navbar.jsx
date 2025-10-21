// src/components/Navbar.jsx
import React, { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import BottomNavigation from "@mui/material/BottomNavigation";
import BottomNavigationAction from "@mui/material/BottomNavigationAction";
import Box from "@mui/material/Box";

/* Icons */
import MenuBookIcon from "@mui/icons-material/MenuBook";      // 유닛
import TodayIcon from "@mui/icons-material/Today";             // 데일리
import RecordVoiceOverIcon from "@mui/icons-material/RecordVoiceOver"; // 발음
import SettingsIcon from "@mui/icons-material/Settings";       // Admin

function today() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

export default function Navbar() {
  const nav = useNavigate();
  const { pathname } = useLocation();

  // 라우트 → 네비 값 매핑
  const value = useMemo(() => {
    if (pathname.startsWith("/everyday")) return "everyday";
    if (pathname.startsWith("/pronunciation")) return "pronunciation";
    if (pathname.startsWith("/admin")) return "admin";
    // 기본: 유닛 목록/유닛 상세
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
      color="primary"
      elevation={0}
      sx={{
        // 상단 바에 BottomNavigation을 자연스럽게 얹기 위한 스타일
        borderBottom: 1,
        borderColor: "divider",
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
              // 상단용 톤 보정: 선택/비선택 색 대비 높이기
              "& .Mui-selected": { color: "#fff !important" },
              "& .MuiBottomNavigationAction-root": {
                color: "rgba(255,255,255,0.75)",
                minWidth: { xs: 60, sm: 80 },
                px: { xs: 1, sm: 2 },
              },
            }}
          >
            <BottomNavigationAction
              label="유닛"
              value="units"
              icon={<MenuBookIcon />}
            />
            <BottomNavigationAction
              label="데일리"
              value="everyday"
              icon={<TodayIcon />}
            />
            <BottomNavigationAction
              label="발음"
              value="pronunciation"
              icon={<RecordVoiceOverIcon />}
            />
            <BottomNavigationAction
              label="Admin"
              value="admin"
              icon={<SettingsIcon />}
            />
          </BottomNavigation>
        </Box>
      </Toolbar>
    </AppBar>
  );
}
