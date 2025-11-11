import React, { useMemo, useState, useEffect } from "react";
import { Box, Tabs, Tab } from "@mui/material";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";

/** 기존 페이지 그대로 재사용 */
import GrammarLine from "./GrammarLine";
import SentenceStudyPage from "../SentenceStudyPage";

/**
 * 네브바 "Grammar" 경로에서 열리는 허브 페이지
 * - 상단 탭: 문법 / 문장
 * - ?tab=grammar | sentence 로 딥링크 지원
 * - Flashcard에서 상태(state)로 넘긴 sentence/pinyin도 그대로 전달됨
 */
export default function GrammarSentenceHub() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // URL ?tab=sentence 지원 (기본값: grammar)
  const initialTab = useMemo(() => {
    const t = (searchParams.get("tab") || "").toLowerCase();
    return t === "sentence" ? 1 : 0;
  }, [searchParams]);

  const [tab, setTab] = useState(initialTab);

  // URL 변경 시 탭 동기화 (뒤로가기 등)
  useEffect(() => {
    const t = new URLSearchParams(location.search).get("tab");
    if (t === "sentence" && tab !== 1) setTab(1);
    if ((!t || t === "grammar") && tab !== 0) setTab(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  const handleChange = (_e, newValue) => {
    setTab(newValue);
    const next = new URLSearchParams(location.search);
    next.set("tab", newValue === 1 ? "sentence" : "grammar");
    navigate({ pathname: location.pathname, search: next.toString() }, { replace: true });
  };

  return (
    <Box>
      <Tabs
        value={tab}
        onChange={handleChange}
        aria-label="문법/문장 탭"
        sx={{ mb: 2 }}
      >
        <Tab label="문법" id="tab-grammar" aria-controls="panel-grammar" />
        <Tab label="문장" id="tab-sentence" aria-controls="panel-sentence" />
      </Tabs>

      {/* 문법 탭 */}
      <Box
        role="tabpanel"
        id="panel-grammar"
        aria-labelledby="tab-grammar"
        hidden={tab !== 0}
      >
        {tab === 0 && <GrammarLine />}
      </Box>

      {/* 문장 탭 */}
      <Box
        role="tabpanel"
        id="panel-sentence"
        aria-labelledby="tab-sentence"
        hidden={tab !== 1}
      >
        {tab === 1 && (
          /**
           * SentenceStudyPage는 useLocation 기반으로 state/query를 읽음.
           * (FlashcardCard에서 navigate("/grammar?tab=sentence", { state: { sentence, sentencePinyin, ... } }))
           * 으로 진입하면 그대로 렌더링됨.
           * state 없이 직접 들어오면 빈 상태 UI가 보임(해당 컴포넌트 내 안내 문구 유지).
           */
          <SentenceStudyPage />
        )}
      </Box>
    </Box>
  );
}
