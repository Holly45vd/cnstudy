import React, { Suspense } from "react";
import { Outlet, ScrollRestoration } from "react-router-dom";
import CssBaseline from "@mui/material/CssBaseline";
import Container from "@mui/material/Container";
import Box from "@mui/material/Box";
import Navbar from "../components/Navbar";

function TopProgressBar() {
  return null; // 필요 시 MUI LinearProgress로 바꿔줄 수 있음
}

export default function App() {
  return (
    <>
      <CssBaseline />
      <TopProgressBar />
      <Navbar />
      <Container maxWidth="lg" sx={{ py: 3 }}>
        <Box component="main" id="main">
          <Suspense fallback={<Box sx={{ fontSize: 14, color: "text.secondary" }}>로딩 중…</Box>}>
            <Outlet />
          </Suspense>
        </Box>
      </Container>
      <Box component="footer" sx={{ borderTop: 1, borderColor: "divider", py: 2 }}>
        <Container maxWidth="lg" sx={{ fontSize: 12, color: "text.secondary" }}>
          © {new Date().getFullYear()} StudyNote · 중국어 학습
        </Container>
      </Box>
      <ScrollRestoration />
    </>
  );
}
