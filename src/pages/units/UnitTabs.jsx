import React from "react";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Box from "@mui/material/Box";
import { useLocation, useNavigate, useParams } from "react-router-dom";

const items = [
  { key: "summary", label: "요약" },
  { key: "conversation", label: "대화" },
  { key: "vocabulary", label: "단어" },
  { key: "grammar", label: "문법" },
  { key: "practice", label: "연습" },
  { key: "substitution", label: "교체연습" }
];

export default function UnitTabs() {
  const { id } = useParams();
  const nav = useNavigate();
  const { pathname } = useLocation();

  const base = `/units/${id}`;
  // 현재 탭 계산: base(=요약) 또는 /<key> 시작 여부로 판단
  const currentIdx = (() => {
    if (pathname === base || pathname === `${base}/`) return items.findIndex(t => t.key === "summary");
    const i = items.findIndex(t => pathname.startsWith(`${base}/${t.key}`));
    return i >= 0 ? i : items.findIndex(t => t.key === "summary");
  })();

  const handleChange = (_e, idx) => {
    const key = items[idx].key;
    const target = key === "summary" ? base : `${base}/${key}`;
    nav(target);
  };

  return (
    <Box sx={{ position: "sticky", top: 64, zIndex: 1, bgcolor: "background.paper" }}>
      <Tabs
        value={currentIdx}
        variant="scrollable"
        scrollButtons
        onChange={handleChange}
      >
        {items.map(t => <Tab key={t.key} label={t.label} />)}
      </Tabs>
    </Box>
  );
}
