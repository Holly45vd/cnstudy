// src/pages/App.jsx
import React, { Suspense, useEffect } from "react";
import { Outlet, ScrollRestoration } from "react-router-dom";
import CssBaseline from "@mui/material/CssBaseline";
import Container from "@mui/material/Container";
import Box from "@mui/material/Box";
import Navbar from "../components/Navbar";

// TTS 등록/워밍업
import { registerTranscribers, warmUpVoices } from "../lib/ttsHelper";
import { pinyin as pinyinPro } from "pinyin-pro";
import { freeTextPinyinToKorean } from "../lib/pinyinKorean";

function TopProgressBar() {
  return null; // 필요 시 MUI LinearProgress로 대체 가능
}

export default function App() {
  useEffect(() => {
    // 병음/한글발음 변환기 주입
    registerTranscribers({
      toPinyin: (zh) => pinyinPro(zh, { toneType: "mark", type: "string" }),
      toKoPron: (s) => freeTextPinyinToKorean(s),
    });
    // 보이스 미리 로드(웹킷 지연 방지)
    warmUpVoices();
  }, []);

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
