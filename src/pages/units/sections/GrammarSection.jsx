import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useOutletContext } from "react-router-dom";
import {
  Box, Stack, Typography, TextField, InputAdornment, Chip, Tooltip, IconButton,
  Divider, Accordion, AccordionSummary, AccordionDetails, Card, CardContent,
  Alert, Button, Tabs, Tab
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import TuneIcon from "@mui/icons-material/Tune";
import RefreshIcon from "@mui/icons-material/Refresh";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import VisibilityIcon from "@mui/icons-material/Visibility";
import { useSpeechSynthesisLite } from "../../../hooks/useSpeechSynthesisLite";

/* ---------- 유틸(기존 함수 보강) ---------- */
const escapeRegExp = (str) => String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function Highlight({ text, query }) {
  if (!query) return <>{text}</>;
  const parts = String(text || "").split(new RegExp(`(${escapeRegExp(query)})`, "ig"));
  return (
    <>
      {parts.map((p, i) =>
        p.toLowerCase() === query.toLowerCase() ? (
          <mark key={i} style={{ padding: 0, backgroundColor: "transparent", color: "#1976d2" }}>
            {p}
          </mark>
        ) : (
          <span key={i}>{p}</span>
        )
      )}
    </>
  );
}

/** 문자열/객체 혼용 안전 정규화 */
function normalizeGrammarArray(raw) {
  const arr = Array.isArray(raw) ? raw : raw ? Object.values(raw) : [];
  return arr.map((it) => {
    if (typeof it === "string") {
      const idx = it.indexOf(":");
      if (idx >= 0) {
        const title = it.slice(0, idx).trim();
        const summary = it.slice(idx + 1).trim();
        return { title, summary, notes: [], examples: [], patterns: [], negative: "", qa_templates: [] };
      }
      return { title: it.trim(), summary: "", notes: [], examples: [], patterns: [], negative: "", qa_templates: [] };
    }
    const title = it.title || it.rule || it.name || it.header || "";
    const summary = it.summary ?? it.description ?? it.desc ?? it.note ?? "";
    const notes = Array.isArray(it.notes) ? it.notes : it.notes ? [String(it.notes)] : [];
    const negative = it.negative || "";
    const patterns = Array.isArray(it.patterns) ? it.patterns : it.patterns ? [String(it.patterns)] : [];
    const qa_templates = Array.isArray(it.qa_templates) ? it.qa_templates : [];
    const mapEx = (ex) => ({
      chinese: ex.chinese || ex.zh || "",
      pinyin: ex.pinyin || ex.py || "",
      pronunciation: ex.pronunciation || ex.pron || "",
      meaning: ex.meaning || ex.ko || "",
    });
    const examples = Array.isArray(it.examples) ? it.examples.map(mapEx) : it.example ? [mapEx(it.example)] : [];
    return { title, summary, notes, examples, patterns, negative, qa_templates };
  });
}

/* ---------- 보이스 ---------- */
function useChineseSpeaker() {
  const { speak, voices } = useSpeechSynthesisLite();
  const pickChineseVoice = useCallback((list) => {
    const arr = Array.isArray(list) ? list : [];
    const kw = ["chinese", "中文", "普通话", "國語", "国语", "粵語", "粤語"];
    const cands = arr.filter((v) => {
      const lang = (v.lang || "").toLowerCase();
      const name = (v.name || "").toLowerCase();
      return lang.startsWith("zh") || lang.includes("cmn") || kw.some((k) => name.includes(k.toLowerCase()));
    });
    const score = (L) => (L.includes("zh-cn") || L.includes("cmn-hans") ? 3 : L.includes("zh-tw") ? 2 : L.includes("yue") ? 1 : 0);
    return cands.sort((a, b) => score((b.lang || "").toLowerCase()) - score((a.lang || "").toLowerCase()))[0] || null;
  }, [voices]);

  const speakZh = useCallback((text) => {
    if (!text) return;
    const v = pickChineseVoice(voices || []);
    speak({ text, voice: v, lang: "zh-CN", rate: 1.0, pitch: 1.0, volume: 1.0 });
  }, [voices, pickChineseVoice, speak]);

  return { speakZh };
}

/* ---------- 작은 컴포넌트 ---------- */
function OverviewCard({ item, query }) {
  return (
    <Card variant="outlined" sx={{ borderRadius: 2, mb: 1.5 }}>
      <CardContent>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>
          <Highlight text={item.title} query={query} />
        </Typography>
        {item.summary && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1, whiteSpace: "pre-line" }}>
            <Highlight text={item.summary} query={query} />
          </Typography>
        )}
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 1 }}>
          {(item.patterns || []).map((p, i) => (
            <Chip key={i} size="small" label={<Highlight text={p} query={query} />} />
          ))}
        </Stack>
        {item.negative && (
          <Typography variant="body2" sx={{ mb: 1 }}>
            <strong>부정 규칙:</strong> <Highlight text={item.negative} query={query} />
          </Typography>
        )}
        {item.notes?.length > 0 && (
          <Box sx={{ mt: 0.5 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              주의사항
            </Typography>
            {item.notes.map((n, i) => (
              <Typography key={i} variant="body2">• <Highlight text={n} query={query} /></Typography>
            ))}
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

function ExampleRow({ ex, query, show, onSpeak }) {
  const [hideMeaning, setHideMeaning] = useState(false);
  return (
    <Box sx={{ mb: 1.25, p: 1.25, border: "1px solid", borderColor: "divider", borderRadius: 1.5, bgcolor: "background.default" }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
        <Typography variant="body1" sx={{ fontSize: 18 }}>
          <Highlight text={ex.chinese} query={query} />
        </Typography>
        <Stack direction="row" spacing={0.5}>
          <Tooltip title="듣기">
            <IconButton size="small" color="primary" onClick={() => onSpeak(ex.chinese)}><VolumeUpIcon fontSize="small" /></IconButton>
          </Tooltip>
          <Tooltip title="복사">
            <IconButton size="small" onClick={() => {
              const t = `${ex.chinese}${ex.pinyin ? ` (${ex.pinyin})` : ""}${ex.meaning ? ` - ${ex.meaning}` : ""}`;
              navigator.clipboard.writeText(t).catch(() => {});
            }}>
              <ContentCopyIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title={hideMeaning ? "뜻 보이기" : "뜻 가리기"}>
            <IconButton size="small" onClick={() => setHideMeaning((v) => !v)}>
              {hideMeaning ? <VisibilityIcon fontSize="small" /> : <VisibilityOffIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>

      {show.pinyin && (ex.pinyin || ex.pronunciation) && (
        <Typography variant="body2" sx={{ mt: 0.25 }}>
          <strong>Pinyin:</strong> <Highlight text={ex.pinyin} query={query} />
          {show.pron && ex.pronunciation && (
            <span style={{ marginLeft: 8, color: "#666" }}>(<Highlight text={ex.pronunciation} query={query} />)</span>
          )}
        </Typography>
      )}
      {!show.pinyin && show.pron && ex.pronunciation && (
        <Typography variant="body2" sx={{ mt: 0.25, color: "text.secondary.main" }}>
          <strong>발음:</strong> <Highlight text={ex.pronunciation} query={query} />
        </Typography>
      )}

      {show.meaning && ex.meaning && !hideMeaning && (
        <Typography variant="body2" color="text.secondary">
          <strong>뜻:</strong> <Highlight text={ex.meaning} query={query} />
        </Typography>
      )}
    </Box>
  );
}

/* ----- 간단 연습 생성기 ----- */
/** 1) 빈칸: 핵심 토큰 마스킹 */
const maskCore = (s, cores = ["有", "没有", "很", "的"]) => {
  let out = s;
  cores.forEach((c) => { out = out.replaceAll(c, "____"); });
  return out;
};
/** 2) QA 템플릿 변환: {N} 치환(간단 샘플) */
function makeQaPairs(item) {
  const nouns = ["电脑", "手机", "书", "时间", "照片"]; // 간단 기본 셋
  const qs = [];
  const tmpls = Array.isArray(item.qa_templates) ? item.qa_templates : [];
  if (!tmpls.length) return [];
  for (let i = 0; i < Math.min(5, nouns.length); i++) {
    const N = nouns[i];
    const q = tmpls[0]?.zh?.replace("{N}", N) || "";
    const a = tmpls[1]?.zh?.replace("{N}", N) || "";
    if (q && a) qs.push({ q, a });
  }
  return qs;
}

function PracticePanel({ item, speakZh }) {
  const [reveals, setReveals] = useState({}); // {idx:true}
  const qaPairs = useMemo(() => makeQaPairs(item), [item]);
  const masked = useMemo(
    () => (item.examples || []).map((ex) => ({ src: ex.chinese, masked: maskCore(ex.chinese) })),
    [item.examples]
  );

  return (
    <Card variant="outlined" sx={{ borderRadius: 2 }}>
      <CardContent>
        {/* 1) 빈칸 채우기 */}
        <Typography variant="subtitle2" gutterBottom>빈칸 채우기</Typography>
        {masked.slice(0, 3).map((m, i) => (
          <Box key={i} sx={{ mb: 1 }}>
            <Typography variant="body1" sx={{ mb: 0.5 }}>{m.masked}</Typography>
            <Stack direction="row" spacing={1}>
              <Button size="small" onClick={() => speakZh(m.src)}>듣기</Button>
              <Button size="small" variant="outlined" onClick={() => setReveals((r) => ({ ...r, ["m"+i]: true }))}>정답</Button>
            </Stack>
            {reveals["m"+i] && <Typography variant="body2" color="text.secondary">→ {m.src}</Typography>}
          </Box>
        ))}
        <Divider sx={{ my: 1.5 }} />

        {/* 2) Q↔A 변환 */}
        {qaPairs.length > 0 && (
          <>
            <Typography variant="subtitle2" gutterBottom>Q→A 연습</Typography>
            {qaPairs.map((qa, i) => (
              <Box key={i} sx={{ mb: 1 }}>
                <Typography variant="body1">Q. {qa.q}</Typography>
                <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                  <Button size="small" onClick={() => speakZh(qa.q)}>듣기</Button>
                  <Button size="small" variant="outlined" onClick={() => setReveals((r) => ({ ...r, ["q"+i]: !r["q"+i] }))}>
                    {reveals["q"+i] ? "가리기" : "정답"}
                  </Button>
                </Stack>
                {reveals["q"+i] && <Typography variant="body2" color="text.secondary">A. {qa.a}</Typography>}
              </Box>
            ))}
            <Divider sx={{ my: 1.5 }} />
          </>
        )}

        {/* 3) 따라읽기 */}
        <Typography variant="subtitle2" gutterBottom>따라읽기(뜻 가리고 말하기)</Typography>
        {(item.examples || []).slice(0, 3).map((ex, i) => (
          <Stack key={i} direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
            <Typography variant="body1">{ex.chinese}</Typography>
            <Button size="small" onClick={() => speakZh(ex.chinese)}>듣기</Button>
          </Stack>
        ))}
      </CardContent>
    </Card>
  );
}

/* ---------- 메인 섹션 ---------- */
export default function GrammarSection() {
  const { unit } = useOutletContext();
  const list = useMemo(() => normalizeGrammarArray(unit?.grammar), [unit]);
  const [query, setQuery] = useState("");
  const [show, setShow] = useState({ pinyin: false, pron: false, meaning: true }); // 기본: 중국어+뜻만
  const [expanded, setExpanded] = useState({});
  const [tabByIdx, setTabByIdx] = useState({}); // {idx:0|1}
  const { speakZh } = useChineseSpeaker();

  // 디바운스 검색
  const [debouncedQuery, setDebounced] = useState("");
  const tRef = useRef(null);
  useEffect(() => {
    clearTimeout(tRef.current);
    tRef.current = setTimeout(() => setDebounced(query.trim()), 200);
    return () => clearTimeout(tRef.current);
  }, [query]);

  const hasData = list.length > 0;

  const filtered = useMemo(() => {
    const q = debouncedQuery.toLowerCase();
    if (!q) return list;
    return list.map((g) => {
      const exFiltered = (g.examples || []).filter((ex) =>
        [ex.chinese, ex.pinyin, ex.pronunciation, ex.meaning].filter(Boolean).some((x) => String(x).toLowerCase().includes(q))
      );
      const matchedHeader = [g.title, g.summary, g.negative, ...(g.notes || []), ...(g.patterns || [])]
        .filter(Boolean).some((x) => String(x).toLowerCase().includes(q));
      if (matchedHeader || exFiltered.length) {
        return { ...g, examples: exFiltered.length ? exFiltered : g.examples };
      }
      return null;
    }).filter(Boolean);
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
    setShow({ pinyin: false, pron: false, meaning: true });
    setExpanded({});
  };

  if (!hasData) return <Typography variant="body2" color="text.secondary">문법 항목이 없습니다.</Typography>;

  return (
    <Box>
      {/* 컨트롤 바 */}
      <Box sx={{ position: "sticky", top: 0, zIndex: 1, bgcolor: "background.paper", borderBottom: 1, borderColor: "divider", py: 1.25, mb: 2 }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={1.25} alignItems={{ xs: "stretch", md: "center" }}>
          <Typography variant="h6" sx={{ mr: 1 }}>문법</Typography>
          <Box sx={{ flexGrow: 1 }} />
          <TextField
            size="small"
            placeholder="제목 / 요약 / 주의 / 예문 검색"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon /></InputAdornment>) }}
            sx={{ minWidth: 260 }}
          />
          <Stack direction="row" spacing={1} alignItems="center">
            <Tooltip title="병음 표시">
              <Chip size="small" label={`병음 ${show.pinyin ? "ON" : "OFF"}`} variant={show.pinyin ? "filled" : "outlined"}
                    onClick={() => setShow((s) => ({ ...s, pinyin: !s.pinyin }))} />
            </Tooltip>
            <Tooltip title="발음(한글) 표시">
              <Chip size="small" label={`발음 ${show.pron ? "ON" : "OFF"}`} variant={show.pron ? "filled" : "outlined"}
                    onClick={() => setShow((s) => ({ ...s, pron: !s.pron }))} />
            </Tooltip>
            <Tooltip title="뜻 표시">
              <Chip size="small" label={`뜻 ${show.meaning ? "ON" : "OFF"}`} variant={show.meaning ? "filled" : "outlined"}
                    onClick={() => setShow((s) => ({ ...s, meaning: !s.meaning }))} />
            </Tooltip>
          </Stack>
          <Stack direction="row" spacing={1}>
            <Button size="small" onClick={expandAll}>전체 펼침</Button>
            <Button size="small" onClick={collapseAll}>전체 접기</Button>
            <Tooltip title="검색/토글 초기화">
              <IconButton onClick={resetControls}><RefreshIcon /></IconButton>
            </Tooltip>
          </Stack>
        </Stack>
        <Stack direction="row" spacing={1} alignItems="center" mt={1} sx={{ color: "text.secondary" }}>
          <TuneIcon fontSize="small" />
          <Typography variant="body2">결과: {filtered.length}개 문법 항목</Typography>
        </Stack>
      </Box>

      {/* 본문 */}
      {filtered.length === 0 && <Alert severity="info" sx={{ mb: 2 }}>검색 결과가 없습니다.</Alert>}

      {filtered.map((item, idx) => {
        const tab = tabByIdx[idx] ?? 0; // 0=학습, 1=연습
        return (
          <Accordion key={idx} expanded={!!expanded[idx]} onChange={onToggle(idx)}
                     sx={{ mb: 1.5, borderRadius: 2, "&:before": { display: "none" } }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="subtitle1"><Highlight text={item.title} query={debouncedQuery} /></Typography>
            </AccordionSummary>

            <AccordionDetails>
              <OverviewCard item={item} query={debouncedQuery} />

              <Tabs
                value={tab}
                onChange={(_, v) => setTabByIdx((s) => ({ ...s, [idx]: v }))}
                sx={{ mb: 1 }}
              >
                <Tab label="학습" />
                <Tab label="연습" />
              </Tabs>

              {tab === 0 ? (
                <Card variant="outlined" sx={{ borderRadius: 2 }}>
                  <CardContent>
                    {(item.examples?.length ?? 0) === 0 && (
                      <Typography variant="body2" color="text.secondary">예문이 없습니다.</Typography>
                    )}
                    {(item.examples || []).map((ex, i) => (
                      <ExampleRow key={i} ex={ex} query={debouncedQuery} show={show} onSpeak={speakZh} />
                    ))}
                  </CardContent>
                </Card>
              ) : (
                <PracticePanel item={item} speakZh={speakZh} />
              )}
            </AccordionDetails>
          </Accordion>
        );
      })}
    </Box>
  );
}
