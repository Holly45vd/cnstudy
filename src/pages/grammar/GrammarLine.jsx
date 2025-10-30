import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  collection, collectionGroup, getDocs
} from "firebase/firestore";
import { db } from "../../firebase/config";
import {
  Stack, Typography, CircularProgress, Alert, TextField, Chip, Button, Divider,
  Accordion, AccordionSummary, AccordionDetails, FormControlLabel, Switch, Box,
  Card, CardContent, IconButton, Tooltip
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import SearchIcon from "@mui/icons-material/Search";
import RefreshIcon from "@mui/icons-material/Refresh";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import VisibilityIcon from "@mui/icons-material/Visibility";
import { freeTextPinyinToKorean } from "../../lib/pinyinKorean";
// (선택) 병음이 전혀 없을 때 zh→병음 생성까지 하려면 주석 해제
// import { pinyin as pinyinPro } from "pinyin-pro";

/* ========= 유틸 ========= */
const escapeRegExp = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
function Highlight({ text, query }) {
  if (!query) return <>{text}</>;
  const parts = String(text || "").split(new RegExp(`(${escapeRegExp(query)})`, "ig"));
  return (
    <>
      {parts.map((p, i) =>
        p.toLowerCase() === query.toLowerCase()
          ? <mark key={i} style={{ padding: 0, background: "transparent", color: "#1976d2" }}>{p}</mark>
          : <span key={i}>{p}</span>
      )}
    </>
  );
}

function deriveKoPron(ex) {
  // 1) 데이터에 한글발음 있으면 우선
  if (ex?.pronunciation?.trim()) return ex.pronunciation.trim();
  // 2) 병음→한글 변환
  if (ex?.py?.trim()) return freeTextPinyinToKorean(ex.py.trim());
  // 3) (선택) zh만 있을 때: 중국어→병음→한글
  // if (ex?.zh?.trim()) {
  //   const py = pinyinPro(ex.zh.trim(), { toneType: "mark", type: "string" });
  //   return freeTextPinyinToKorean(py);
  // }
  return "";
}

function speakSafe(text) {
  try {
    if (!window?.speechSynthesis || !text) return;
    const u = new SpeechSynthesisUtterance(text);
    // 간단 중국어 보이스 우선
    const zh = (window.speechSynthesis.getVoices() || []).find(v => (v.lang || "").toLowerCase().startsWith("zh"));
    if (zh) u.voice = zh;
    u.lang = "zh-CN";
    u.rate = 1.0;
    window.speechSynthesis.speak(u);
  } catch {}
}

/* ========= 예문 카드 ========= */
function ExampleCard({ ex, showPinyin, showPron, showMeaning, query }) {
  const [hideMeaning, setHideMeaning] = useState(false);
  const koPron = useMemo(() => deriveKoPron(ex), [ex]);

  return (
    <Box sx={{ p: 1.25, border: "1px solid rgba(0,0,0,0.08)", borderRadius: 1.5, bgcolor: "#fafafa" }}>
      {/* 중국어 + 액션 */}
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Typography sx={{ fontSize: 18 }}><Highlight text={ex.zh} query={query} /></Typography>
        <Stack direction="row" spacing={0.5}>
          <Tooltip title="듣기">
            <IconButton size="small" color="primary" onClick={() => speakSafe(ex.zh)}>
              <VolumeUpIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="복사">
            <IconButton
              size="small"
              onClick={() => {
                const t = `${ex.zh || ""}${ex.py ? ` (${ex.py})` : ""}${ex.ko ? ` - ${ex.ko}` : ""}`;
                navigator.clipboard.writeText(t).catch(() => {});
              }}
            >
              <ContentCopyIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title={hideMeaning ? "뜻 보이기" : "뜻 가리기"}>
            <IconButton size="small" onClick={() => setHideMeaning(v => !v)}>
              {hideMeaning ? <VisibilityIcon fontSize="small" /> : <VisibilityOffIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>

      {/* 병음/발음 줄 */}
      {(showPinyin || showPron) && (ex.py || koPron) && (
        <Typography variant="body2" sx={{ mt: 0.25 }}>
          {showPinyin && ex.py && <><strong>Pinyin:</strong> <Highlight text={ex.py} query={query} /></>}
          {showPron && koPron && (
            <span style={{ marginLeft: showPinyin && ex.py ? 8 : 0, color: "#666" }}>
              (<Highlight text={koPron} query={query} />)
            </span>
          )}
        </Typography>
      )}

      {/* 뜻 */}
      {showMeaning && ex.ko && !hideMeaning && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
          <Highlight text={ex.ko} query={query} />
        </Typography>
      )}
    </Box>
  );
}

/* ========= 개요 카드 ========= */
function Overview({ g, query }) {
  const title = g.title || g.rule || "문법";
  const summary = g.summary || g.description || "";
  const notes = Array.isArray(g.notes) ? g.notes : [];
  const patterns = Array.isArray(g.patterns) ? g.patterns : [];

  return (
    <Card variant="outlined" sx={{ borderRadius: 2, mb: 1 }}>
      <CardContent>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>
          <Highlight text={title} query={query} />
          <Typography component="span" sx={{ color: "text.secondary", ml: 1 }}>
            {`· Unit ${g.unitId}`}
          </Typography>
        </Typography>
        {summary && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1, whiteSpace: "pre-line" }}>
            <Highlight text={summary} query={query} />
          </Typography>
        )}
        {patterns.length > 0 && (
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 1 }}>
            {patterns.map((p, i) => <Chip key={i} size="small" label={<Highlight text={p} query={query} />} />)}
          </Stack>
        )}
        {g.negative && (
          <Typography variant="body2" sx={{ mb: 0.5 }}>
            <strong>부정 규칙:</strong> <Highlight text={g.negative} query={query} />
          </Typography>
        )}
        {notes.length > 0 && (
          <>
            <Typography variant="body2" color="text.secondary" gutterBottom>주의사항</Typography>
            {notes.map((n, i) => (
              <Typography key={i} variant="body2">• <Highlight text={n} query={query} /></Typography>
            ))}
          </>
        )}
      </CardContent>
    </Card>
  );
}

/* ========= 메인 ========= */
export default function GrammarAll() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // UI 상태
  const [showPinyin, setShowPinyin] = useState(true);
  const [showPron, setShowPron] = useState(true);
  const [showMeaning, setShowMeaning] = useState(true);
  const [query, setQuery] = useState("");
  const [expandAll, setExpandAll] = useState(false);

  // 검색 디바운스
  const [debouncedQuery, setDebounced] = useState("");
  const tRef = useRef(null);
  useEffect(() => {
    clearTimeout(tRef.current);
    tRef.current = setTimeout(() => setDebounced(query.trim()), 200);
    return () => clearTimeout(tRef.current);
  }, [query]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const out = [];

        // 1) units 문서의 배열필드 grammar
        const unitsSnap = await getDocs(collection(db, "units"));
        for (const u of unitsSnap.docs) {
          const data = u.data() || {};
          const arr = Array.isArray(data.grammar) ? data.grammar : [];
          for (const g of arr) out.push({ unitId: u.id, ...g });
        }

        // 2) 모든 유닛의 서브컬렉션 grammar (있다면)
        try {
          const cg = await getDocs(collectionGroup(db, "grammar"));
          cg.docs.forEach((d) => {
            const g = d.data() || {};
            const paths = d.ref.path.split("/");
            const unitIdx = paths.findIndex((p) => p === "units");
            const unitId = unitIdx >= 0 ? paths[unitIdx + 1] : "unknown";
            out.push({ unitId, ...g });
          });
        } catch (e) {
          console.warn("[GrammarAll] collectionGroup skip:", e?.message || e);
        }

        if (!mounted) return;
        out.sort((a, b) => String(a.unitId).localeCompare(String(b.unitId), "ko"));
        setItems(out);
      } catch (e) {
        console.error("[GrammarAll] load error:", e);
        if (mounted) setError("문법 데이터를 불러오지 못했습니다.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // 검색 필터
  const filtered = useMemo(() => {
    const q = debouncedQuery.toLowerCase();
    if (!q) return items;
    return items.filter((g) => {
      const hay = [
        g.title, g.summary, g.rule, g.description, g.negative,
        ...(Array.isArray(g.patterns) ? g.patterns : []),
        ...(Array.isArray(g.notes) ? g.notes : []),
        ...(Array.isArray(g.examples) ? g.examples.flatMap((e) => [e.zh, e.py, e.ko, e.pronunciation]) : []),
      ].filter(Boolean).join(" ").toLowerCase();
      return hay.includes(q);
    });
  }, [items, debouncedQuery]);

  if (loading) return <Stack alignItems="center" sx={{ py: 4 }}><CircularProgress size={32} /></Stack>;
  if (error) return <Alert severity="error">{error}</Alert>;
  if (!items.length) return <Typography variant="body2" color="text.secondary">문법 항목이 없습니다.</Typography>;

  return (
    <Stack spacing={2.5} sx={{ p: { xs: 2, md: 3 } }}>
      {/* 헤더/도구 */}
      <Stack direction="row" alignItems="center" spacing={2} flexWrap="wrap">
        <Typography variant="h6">📚 전체 문법</Typography>
        <Chip label={`결과: ${filtered.length} 문법 항목`} />
        <Box sx={{ flex: 1 }} />

        <FormControlLabel
          control={<Switch checked={showPinyin} onChange={(e) => setShowPinyin(e.target.checked)} />}
          label="병음 ON"
        />
        <FormControlLabel
          control={<Switch checked={showPron} onChange={(e) => setShowPron(e.target.checked)} />}
          label="발음 ON"
        />
        <FormControlLabel
          control={<Switch checked={showMeaning} onChange={(e) => setShowMeaning(e.target.checked)} />}
          label="뜻 ON"
        />

        <Button variant="text" startIcon={<RefreshIcon />} onClick={() => setExpandAll(v => !v)}>
          {expandAll ? "전체 접기" : "전체 펼침"}
        </Button>
      </Stack>

      {/* 검색 */}
      <TextField
        fullWidth size="small"
        placeholder="제목 / 요약 / 주의 / 예문 검색"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        InputProps={{ startAdornment: <SearchIcon sx={{ mr: 1, color: "text.secondary" }} /> }}
      />

      <Divider />

      {/* 리스트 */}
      <Stack spacing={1.25}>
        {filtered.map((g, idx) => {
          const examples = Array.isArray(g.examples) ? g.examples : [];
          return (
            <Accordion key={idx} defaultExpanded={expandAll} disableGutters
              sx={{ borderRadius: 2, overflow: "hidden", bgcolor: "#fff" }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Stack spacing={0.5} sx={{ width: "100%" }}>
                  {/* 헤더는 개요 카드에서 대체되지만, 열기 전엔 요약만 보이게 */}
                  <Typography>{g.title || g.rule || "문법"}
                    <Typography component="span" sx={{ color: "text.secondary", ml: 1 }}>
                      {`· Unit ${g.unitId}`}
                    </Typography>
                  </Typography>
                  {(g.summary || g.description) && (
                    <Typography variant="body2" color="text.secondary">
                      {g.summary || g.description}
                    </Typography>
                  )}
                </Stack>
              </AccordionSummary>

              <AccordionDetails>
                <Overview g={g} query={debouncedQuery} />

                <Stack spacing={1.25}>
                  {examples.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">예문이 없습니다.</Typography>
                  ) : examples.map((ex, i) => (
                    <ExampleCard
                      key={i}
                      ex={ex}
                      showPinyin={showPinyin}
                      showPron={showPron}
                      showMeaning={showMeaning}
                      query={debouncedQuery}
                    />
                  ))}
                </Stack>
              </AccordionDetails>
            </Accordion>
          );
        })}
      </Stack>
    </Stack>
  );
}
