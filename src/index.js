// src/index.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { router } from "./app/routes";

// ✅ MUI 전역 테마 주입
import { ThemeProvider, CssBaseline, StyledEngineProvider } from "@mui/material";
import { theme } from "./styles/theme"; // ← 내가 제안한 theme.js

// 기존 전역 CSS 유지
import "./styles/global.css";
import "./index.css";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  // emotion 스타일 우선 적용(선택) — MUI 스타일이 사용자 CSS보다 먼저 들어가게 함
  <StyledEngineProvider injectFirst>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <RouterProvider router={router} />
    </ThemeProvider>
  </StyledEngineProvider>
);
