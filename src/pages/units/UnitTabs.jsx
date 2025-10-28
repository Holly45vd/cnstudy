// src/pages/units/UnitTabs.jsx
import React, { useMemo } from "react";
import {
  Tabs,
  Tab,
  Box,
  Paper,
  useScrollTrigger,
  Divider,
  Slide,
  SpeedDial,
  SpeedDialAction,
  SpeedDialIcon,
} from "@mui/material";
import { useLocation, useNavigate, useParams } from "react-router-dom";

/* Tab 아이콘 */
import DashboardIcon from "@mui/icons-material/Dashboard"; // 요약
import ChatIcon from "@mui/icons-material/Chat";           // 대화
import TranslateIcon from "@mui/icons-material/Translate"; // 단어
import SchoolIcon from "@mui/icons-material/School";       // 문법
import BuildIcon from "@mui/icons-material/Build";         // 연습
import SwapHorizIcon from "@mui/icons-material/SwapHoriz"; // 교체연습

const items = [
  { key: "summary", label: "요약", icon: <DashboardIcon /> },
  { key: "conversation", label: "대화", icon: <ChatIcon /> },
  { key: "vocabulary", label: "단어", icon: <TranslateIcon /> },
  { key: "grammar", label: "문법", icon: <SchoolIcon /> },
  { key: "practice", label: "연습", icon: <BuildIcon /> },
  { key: "substitution", label: "교체연습", icon: <SwapHorizIcon /> },
];

export default function UnitTabs() {
  const { id } = useParams();
  const nav = useNavigate();
  const { pathname } = useLocation();
  const base = `/units/${id}`;

  const currentIdx = useMemo(() => {
    if (pathname === base || pathname === `${base}/`) {
      return items.findIndex((t) => t.key === "summary");
    }
    const i = items.findIndex((t) => pathname.startsWith(`${base}/${t.key}`));
    return i >= 0 ? i : items.findIndex((t) => t.key === "summary");
  }, [pathname, base]);

  const handleChange = (_e, idx) => {
    const key = items[idx].key;
    const target = key === "summary" ? base : `${base}/${key}`;
    nav(target);
  };

  // Tabs 숨길 스크롤 임계값 (헤더 높이 감안해서 약간 크게)
  const trigger = useScrollTrigger({ disableHysteresis: true, threshold: 140 });

  return (
    <>
      {/* 스크롤 시 위로 슬라이드 아웃 (남겨두고 싶으면 Slide 제거) */}
      <Slide appear={false} direction="down" in={!trigger}>
        <Paper
          elevation={trigger ? 4 : 0}
          sx={{
            position: "sticky",
            top: 72,
            zIndex: 10,
            borderRadius: 2,
            bgcolor: "background.paper",
            transition: "all 0.2s ease",
          }}
        >
          <Box sx={{ px: 2 }}>
            <Tabs
              value={currentIdx}
              variant="scrollable"
              scrollButtons
              onChange={handleChange}
              textColor="primary"
              indicatorColor="primary"
              sx={{
                "& .MuiTab-root": {
                  fontWeight: 700,
                  textTransform: "none",
                  minWidth: 100,
                },
              }}
            >
              {items.map((t) => (
                <Tab key={t.key} label={t.label} icon={t.icon} iconPosition="start" />
              ))}
            </Tabs>
          </Box>
          <Divider />
        </Paper>
      </Slide>

      {/* 유닛 전용 Speed Dial: 유닛 화면에서 스크롤 내렸을 때만 표시 */}
      {trigger && (
        <SpeedDial
          ariaLabel="unit quick nav"
          sx={{ position: "fixed", bottom: 16, right: 16, zIndex: 1500 }}
          icon={<SpeedDialIcon />}
          FabProps={{ color: "primary" }} // 🔵/🟣 구분: 유닛 전용은 primary
        >
          {items.map((t) => (
            <SpeedDialAction
              key={t.key}
              icon={t.icon}
              tooltipTitle={t.label}
              tooltipOpen
              onClick={() => {
                const target = t.key === "summary" ? base : `${base}/${t.key}`;
                nav(target);
              }}
            />
          ))}
        </SpeedDial>
      )}
    </>
  );
}
