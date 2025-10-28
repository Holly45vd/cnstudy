// src/pages/units/sections/GrammarSection.jsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useOutletContext } from "react-router-dom";
import {
  Box,
  Stack,
  Typography,
  TextField,
  InputAdornment,
  Chip,
  Tooltip,
  IconButton,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Card,
  CardContent,
  Alert,
  Button,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import TuneIcon from "@mui/icons-material/Tune";
import RefreshIcon from "@mui/icons-material/Refresh";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { useSpeechSynthesisLite } from "../../../hooks/useSpeechSynthesisLite";

/* ---------- 유틸 ---------- */
const escapeRegExp = (str) => String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function Highlight({ text, query }) {
  if (!query) return <>{text}</>;
  const parts = String(text || "").split(new RegExp(`(${escapeRegExp(query)})`, "ig"));
  return (
    <>
      {parts.map((p, i) =>
        p.toLowerCase() === query.toLowerCase() ? (
          <mark
            key={i}
            style={{ padding: 0, backgroundColor: "transparent", color: "#1976d2" }}
          >
            {p}
          </mark>
        ) : (
          <span key={i}>{p}</span>
        )
      )}
    </>
  );
}

/** 문자열/객체 혼용 안전 정규화
 * - "제목: 설명" 형태 문자열 → {title, summary}
 * - "제목만" 문자열 → {title}
 * - 객체 키 다양성 대응(rule/description/desc/example/examples/notes 등)
 */
function normalizeGrammarArray(raw) {
  const arr = Array.isArray(raw) ? raw : raw ? Object.values(raw) : [];
  return arr.map((it) => {
    // 1) 문자열 처리
    if (typeof it === "string") {
      const idx = it.indexOf(":");
      if (idx >= 0) {
        const title = it.slice(0, idx).trim();
        const summary = it.slice(idx + 1).trim();
        return { title, summary, notes: [], examples: [] };
      }
      // "제목"만 있는 경우
      return { title: it.trim(), summary: "", notes: [], examples: [] };
    }

    // 2) 객체 처리
    const title = it.title || it.rule || it.name || it.header || "";
    const summary = it.summary ?? it.description ?? it.desc ?? it.note ?? "";

    // notes(문자열/배열 모두 지원)
    const notes =
      Array.isArray(it.notes) ? it.notes :
      it.notes ? [String(it.notes)] :
      [];

    // examples: 배열 또는 단일 example
    const mapEx = (ex) => ({
      chinese: ex.chinese || ex.zh || "",
      pinyin: ex.pinyin || ex.py || "",
      pronunciation: ex.pronunciation || ex.pron || "",
      meaning: ex.meaning || ex.ko || "",
    });
    const examples = Array.isArray(it.examples)
      ? it.examples.map(mapEx)
      : it.example
      ? [mapEx(it.example)]
      : [];

    return { title, summary, notes, examples };
  });
}

/* ---------- 보이스 ---------- */
function useChineseSpeaker() {
  const { speak, voices } = useSpeechSynthesisLite();

  const pickChineseVoice = useCallback(
    (list) => {
      const arr = Array.isArray(list) ? list : [];
      const kw = ["chinese", "中文", "普通话", "國語", "国语", "粵語", "粤語"];
      const cands = arr.filter((v) => {
        const lang = (v.lang || "").toLowerCase();
        const name = (v.name || "").toLowerCase();
        return lang.startsWith("zh") || lang.includes("cmn") || kw.some((k) => name.includes(k.toLowerCase()));
      });
      const score = (L) => {
        if (L.includes("zh-cn") || L.includes("cmn-hans")) return 3;
        if (L.includes("zh-tw") || L.includes("cmn-hant")) return 2;
        if (L.includes("zh-hk") || L.includes("yue")) return 1;
        return 0;
      };
      return cands.sort((a, b) => score((b.lang || "").toLowerCase()) - score((a.lang || "").toLowerCase()))[0] || null;
    },
    [voices]
  );

  const speakZh = useCallback(
    (text) => {
      if (!text) return;
      const v = pickChineseVoice(voices || []);
      speak({ text, voice: v, lang: "zh-CN", rate: 1.0, pitch: 1.0, volume: 1.0 });
    },
    [voices, pickChineseVoice, speak]
  );

  return { speakZh };
}

/* ---------- 섹션 ---------- */
export default function GrammarSection() {
  const { unit } = useOutletContext();
  const list = useMemo(() => normalizeGrammarArray(unit?.grammar), [unit]);
  const [query, setQuery] = useState("");
  const [show, setShow] = useState({ pinyin: true, pron: true, meaning: true });
  const [expanded, setExpanded] = useState({});
  const { speakZh } = useChineseSpeaker();

  // 디바운스 검색값
  const [debouncedQuery, setDebounced] = useState("");
  const tRef = useRef(null);
  useEffect(() => {
    clearTimeout(tRef.current);
    tRef.current = setTimeout(() => setDebounced(query.trim()), 250);
    return () => clearTimeout(tRef.current);
  }, [query]);

  const hasData = list.length > 0;

  const filtered = useMemo(() => {
    const q = debouncedQuery.toLowerCase();
    if (!q) return list;
    return list
      .map((g) => {
        const exFiltered = (g.examples || []).filter((ex) =>
          [ex.chinese, ex.pinyin, ex.pronunciation, ex.meaning]
            .filter(Boolean)
            .some((x) => String(x).toLowerCase().includes(q))
        );
        const matchedHeader =
          [g.title, g.summary, ...(g.notes || [])]
            .filter(Boolean)
            .some((x) => String(x).toLowerCase().includes(q));
        if (matchedHeader || exFiltered.length) {
          return { ...g, examples: exFiltered.length ? exFiltered : g.examples };
        }
        return null;
      })
      .filter(Boolean);
  }, [list, debouncedQuery]);

  const expandAll = () => {
    const next = {};
    filtered.forEach((_, i) => (next[i] = true));
    setExpanded(next);
  };
  const collapseAll = () => setExpanded({});
  const onToggle = (i) => (_, isExpanded) => setExpanded((prev) => ({ ...prev, [i]: isExpanded }));
  const resetControls = () => {
    setQuery("");
    setShow({ pinyin: true, pron: true, meaning: true });
    setExpanded({});
  };

  if (!hasData) {
    return <Typography variant="body2" color="text.secondary">문법 항목이 없습니다.</Typography>;
  }

  return (
    <Box>
      {/* 컨트롤 바 */}
      <Box
        sx={{
          position: "sticky",
          top: 0,
          zIndex: 1,
          bgcolor: "background.paper",
          borderBottom: 1,
          borderColor: "divider",
          py: 1.5,
          mb: 2,
        }}
      >
        <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} alignItems={{ xs: "stretch", md: "center" }}>
          <Typography variant="h6" sx={{ mr: 1 }}>
            문법
          </Typography>
          <Box sx={{ flexGrow: 1 }} />

          <TextField
            size="small"
            placeholder="제목 / 요약 / 주의 / 예문 검색"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            sx={{ minWidth: 240 }}
          />

          <Stack direction="row" spacing={1} alignItems="center">
            <Tooltip title="병음 표시 토글">
              <Chip
                size="small"
                label={`병음 ${show.pinyin ? "ON" : "OFF"}`}
                variant={show.pinyin ? "filled" : "outlined"}
                onClick={() => setShow((s) => ({ ...s, pinyin: !s.pinyin }))}
              />
            </Tooltip>
            <Tooltip title="발음(한글) 표시 토글">
              <Chip
                size="small"
                label={`발음 ${show.pron ? "ON" : "OFF"}`}
                variant={show.pron ? "filled" : "outlined"}
                onClick={() => setShow((s) => ({ ...s, pron: !s.pron }))}
              />
            </Tooltip>
            <Tooltip title="뜻(한국어) 표시 토글">
              <Chip
                size="small"
                label={`뜻 ${show.meaning ? "ON" : "OFF"}`}
                variant={show.meaning ? "filled" : "outlined"}
                onClick={() => setShow((s) => ({ ...s, meaning: !s.meaning }))}
              />
            </Tooltip>
          </Stack>

          <Divider flexItem sx={{ display: { xs: "none", md: "block" } }} />

          <Stack direction="row" spacing={1}>
            <Button size="small" onClick={expandAll}>전체 펼침</Button>
            <Button size="small" onClick={collapseAll}>전체 접기</Button>
            <Tooltip title="검색/토글 초기화">
              <IconButton onClick={resetControls}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>

        <Stack direction="row" spacing={1} alignItems="center" mt={1} sx={{ color: "text.secondary" }}>
          <TuneIcon fontSize="small" />
          <Typography variant="body2">결과: {filtered.length}개 문법 항목</Typography>
        </Stack>
      </Box>

      {/* 본문 */}
      {filtered.length === 0 && (
        <Alert severity="info" sx={{ mb: 2 }}>
          검색 결과가 없습니다.
        </Alert>
      )}

      {filtered.map((item, idx) => (
        <Accordion
          key={idx}
          expanded={!!expanded[idx]}
          onChange={onToggle(idx)}
          sx={{ mb: 1.5, borderRadius: 2, "&:before": { display: "none" } }}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle1">
              <Highlight text={item.title} query={debouncedQuery} />
            </Typography>
          </AccordionSummary>

          <AccordionDetails>
            <Card sx={{ borderRadius: 2 }} variant="outlined">
              <CardContent>
                {item.summary && (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, whiteSpace: "pre-line" }}>
                    <Highlight text={item.summary} query={debouncedQuery} />
                  </Typography>
                )}

                {item.notes?.length > 0 && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      주의사항
                    </Typography>
                    {item.notes.map((note, i) => (
                      <Typography key={i} variant="body2">
                        • <Highlight text={note} query={debouncedQuery} />
                      </Typography>
                    ))}
                  </Box>
                )}

                {item.examples?.length > 0 && (
                  <Box>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                      예문
                    </Typography>

                    {item.examples.map((ex, i) => (
                      <Box
                        key={i}
                        sx={{
                          mb: 1.5,
                          p: 1.5,
                          border: "1px solid",
                          borderColor: "divider",
                          borderRadius: 1.5,
                          bgcolor: "background.default",
                        }}
                      >
                        {/* 중국어 + 액션 */}
                        <Box display="flex" justifyContent="space-between" alignItems="center">
                          <Typography variant="body1">
                            <Highlight text={ex.chinese} query={debouncedQuery} />
                          </Typography>
                          <Stack direction="row" spacing={0.5}>
                            <Tooltip title="듣기">
                              <IconButton
                                size="small"
                                color="primary"
                                onClick={() => speakZh(ex.chinese)}
                              >
                                <VolumeUpIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="복사">
                              <IconButton
                                size="small"
                                onClick={() => {
                                  const t = `${ex.chinese}${ex.pinyin ? ` (${ex.pinyin})` : ""}${
                                    ex.meaning ? ` - ${ex.meaning}` : ""
                                  }`;
                                  navigator.clipboard.writeText(t).catch(() => {});
                                }}
                              >
                                <ContentCopyIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        </Box>

                        {/* 보조 줄 */}
                        {show.pinyin && (ex.pinyin || ex.pronunciation) && (
                          <Typography variant="body2" sx={{ mt: 0.5 }}>
                            <strong>Pinyin:</strong>{" "}
                            <Highlight text={ex.pinyin} query={debouncedQuery} />
                            {show.pron && ex.pronunciation && (
                              <span style={{ marginLeft: 8, color: "#666" }}>
                                (<Highlight text={ex.pronunciation} query={debouncedQuery} />)
                              </span>
                            )}
                          </Typography>
                        )}
                        {!show.pinyin && show.pron && ex.pronunciation && (
                          <Typography variant="body2" sx={{ mt: 0.5, color: "text.secondary.main" }}>
                            <strong>발음:</strong>{" "}
                            <Highlight text={ex.pronunciation} query={debouncedQuery} />
                          </Typography>
                        )}

                        {show.meaning && ex.meaning && (
                          <Typography variant="body2" color="text.secondary">
                            <strong>뜻:</strong>{" "}
                            <Highlight text={ex.meaning} query={debouncedQuery} />
                          </Typography>
                        )}

                        {i < item.examples.length - 1 && <Divider sx={{ mt: 1, mb: 1 }} />}
                      </Box>
                    ))}
                  </Box>
                )}
              </CardContent>
            </Card>
          </AccordionDetails>
        </Accordion>
      ))}
    </Box>
  );
}
