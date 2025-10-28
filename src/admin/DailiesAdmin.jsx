// src/admin/DailiesAdmin.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Container, Stack, Typography, TextField, Button, Paper,
  Grid, Box, Alert, LinearProgress, Chip, ButtonGroup, Tooltip,
} from "@mui/material";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import TodayIcon from "@mui/icons-material/Today";
import CleaningServicesIcon from "@mui/icons-material/CleaningServices";
import SaveIcon from "@mui/icons-material/Save";
import SaveAsIcon from "@mui/icons-material/SaveAs";
import PlaylistAddIcon from "@mui/icons-material/PlaylistAdd";

import {
  getDaily, setDailyWords, getWordsByIds, upsertWord
} from "../firebase/firestore";

/* ========== date helpers ========== */
function fmtYMD(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function addDays(dateStr, delta) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const nd = new Date(y, (m ?? 1) - 1, d ?? 1);
  nd.setDate(nd.getDate() + delta);
  return fmtYMD(nd);
}
function today() { return fmtYMD(new Date()); }

/* ========== parse / normalize ========== */
function parseIds(input) {
  const raw = String(input || "")
    .replace(/\u3000/g, " ")
    .replace(/[，、]/g, ",");
  const parts = raw.split(/[\s,]+/).map(s => s.trim()).filter(Boolean);
  const seen = new Set();
  const out = [];
  for (const p of parts) {
    if (!seen.has(p)) { seen.add(p); out.push(p); }
  }
  return out;
}
const joinIds = (ids) => ids.join(", ");

function normalizeWord(w) {
  const out = {
    id: w.id || w.zh,
    zh: w.zh,
    pinyin: w.pinyin,
    ko: w.ko,
    pos: w.pos || "",
    tags: Array.isArray(w.tags) ? w.tags : (w.tags ? String(w.tags).split(",").map(s=>s.trim()) : []),
    sentence: w.sentence || "",
    sentencePinyin: w.sentencePinyin || "",
    sentenceKo: w.sentenceKo || "",
    sentenceKoPronunciation: w.sentenceKoPronunciation || "",
    pronunciation: Array.isArray(w.pronunciation) ? w.pronunciation : [],
    extensions: Array.isArray(w.extensions) ? w.extensions : [],
    grammar: Array.isArray(w.grammar) ? w.grammar : [],
    keyPoints: Array.isArray(w.keyPoints) ? w.keyPoints : [],
    meta: { ...(w.meta || {}), updatedAt: new Date() },
  };
  if (!out.id || !out.zh || !out.pinyin || !out.ko) {
    const miss = ["id/zh", "pinyin", "ko"].filter(k =>
      (k === "id/zh" ? !out.id || !out.zh : !out[k])
    ).join(", ");
    throw new Error(`필수 누락: ${miss} (항목: ${JSON.stringify(w)})`);
  }
  return out;
}

/** JSON 에디터 직렬화: 핵심 필드만 */
function serializeWordsForEditor(words) {
  return words.map(w => ({
    id: w.id || w.zh,
    zh: w.zh,
    pinyin: w.pinyin,
    ko: w.ko,
    ...(w.pos ? { pos: w.pos } : {}),
    ...(w.tags?.length ? { tags: w.tags } : {}),
    ...(w.sentence ? { sentence: w.sentence } : {}),
    ...(w.sentencePinyin ? { sentencePinyin: w.sentencePinyin } : {}),
    ...(w.sentenceKo ? { sentenceKo: w.sentenceKo } : {}),
  }));
}

/** 단어 입력 파서: JSON → 실패 시 CSV/TSV(zh,pinyin,ko[,pos]) */
function parseWordsInput(raw) {
  const txt = String(raw || "").trim();
  if (!txt) return [];
  try {
    const arr = JSON.parse(txt);
    if (Array.isArray(arr)) return arr.map(normalizeWord);
  } catch {}
  const lines = txt.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const results = [];
  for (const line of lines) {
    const parts = line.split(/\s*[,\t]\s*/);
    if (parts.length < 3) throw new Error(`CSV/TSV 라인은 최소 zh,pinyin,ko 3개 필드가 필요합니다: "${line}"`);
    const [zh, pinyin, ko, pos = ""] = parts;
    results.push(normalizeWord({ zh, pinyin, ko, pos }));
  }
  return results;
}

export default function DailiesAdmin() {
  const [date, setDate] = useState(today());

  // 데일리 입력
  const [wordIdsInput, setWordIdsInput] = useState("工作, 愿意, 漂亮");
  const parsedIds = useMemo(() => parseIds(wordIdsInput), [wordIdsInput]);

  // 상태/미리보기
  const [status, setStatus] = useState("");
  const [preview, setPreview] = useState([]);
  const [loading, setLoading] = useState(false);

  // 하단 JSON 에디터 상태
  const [newWordsInput, setNewWordsInput] = useState("");
  const [newWordsParsed, setNewWordsParsed] = useState([]);

  // 날짜 변경 시 자동 로드
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [date]);

  // 데일리 미리보기
  useEffect(() => {
    let alive = true;
    (async () => {
      if (parsedIds.length === 0) { if (alive) setPreview([]); return; }
      try {
        const ws = await getWordsByIds(parsedIds);
        if (!alive) return;
        const map = new Map(ws.map(w => [String(w.id), w]));
        setPreview(parsedIds.map(i => map.get(String(i)) || { id: i, __missing: true }));
      } catch {
        if (alive) setPreview([]);
      }
    })();
    return () => { alive = false; };
  }, [parsedIds]);

  const missingIds = useMemo(
    () => preview.filter(w => w?.__missing).map(w => w.id),
    [preview]
  );

  /** 현재 날짜의 데일리 단어를 JSON 에디터에 채우기 (이미 등록된 경우 자동 노출) */
  async function fillEditorWithWordsOf(dateStr) {
    const d = await getDaily(dateStr);
    const ids = d?.wordIds?.map(String) || [];
    if (ids.length === 0) return false;
    const ws = await getWordsByIds(ids);
    const editable = serializeWordsForEditor(ws);
    setNewWordsInput(JSON.stringify(editable, null, 2));
    setNewWordsParsed(editable.map(normalizeWord));
    return true;
  }

  async function load() {
    try {
      setLoading(true);
      setStatus("로드 중…");
      const d = await getDaily(date);
      if (d?.wordIds?.length) {
        // 상단 ID 입력 채우기
        setWordIdsInput(joinIds(d.wordIds.map(String)));
        // 오늘이 이미 등록되어 있다면 하단 JSON 자동 채우기
        await fillEditorWithWordsOf(date);
      } else {
        setWordIdsInput("");
        // 하단 에디터는 사용자 입력 보존
      }
      setStatus("로드 완료");
    } catch (e) {
      setStatus("에러: " + (e.message || String(e)));
    } finally {
      setLoading(false);
    }
  }

  function normalizeIdsInput() {
    setWordIdsInput(joinIds(parsedIds));
  }

  async function parseEditorNow() {
    try {
      const items = parseWordsInput(newWordsInput);
      setNewWordsParsed(items);
      setStatus(`단어 파싱 OK (${items.length}건)`);
    } catch (e) {
      setNewWordsParsed([]);
      setStatus("에러: " + (e.message || String(e)));
    }
  }

  async function saveNewWordsOnly() {
    try {
      setLoading(true);
      setStatus("단어 저장 중…");
      const items = newWordsParsed.length ? newWordsParsed : parseWordsInput(newWordsInput);
      if (!items.length) throw new Error("단어 입력이 비어있습니다.");
      for (const w of items) await upsertWord(w);
      setStatus(`단어 저장 완료 (${items.length}건)`);
      await loadPreviewOnly();
    } catch (e) {
      setStatus("에러: " + (e.message || String(e)));
    } finally {
      setLoading(false);
    }
  }

  async function saveNewWordsThenDaily() {
    try {
      setLoading(true);
      setStatus("단어 저장 중…");
      const items = newWordsParsed.length ? newWordsParsed : parseWordsInput(newWordsInput);
      if (!items.length && missingIds.length > 0) {
        throw new Error("미등록 단어가 있는데 입력이 비어있습니다.");
      }
      for (const w of items) await upsertWord(w);
      setStatus("데일리 저장 중…");
      await setDailyWords(date, parsedIds);
      setStatus(`단어/데일리 저장 완료 (단어 ${items.length}건, 날짜 ${date})`);
      await loadPreviewOnly();
    } catch (e) {
      setStatus("에러: " + (e.message || String(e)));
    } finally {
      setLoading(false);
    }
  }

  async function saveDailyOnly() {
    try {
      setLoading(true);
      setStatus("데일리 저장 중…");
      await setDailyWords(date, parsedIds);
      setStatus(`데일리 저장 완료 (${date})`);
    } catch (e) {
      setStatus("에러: " + (e.message || String(e)));
    } finally {
      setLoading(false);
    }
  }

  async function loadPreviewOnly() {
    const ids = parseIds(wordIdsInput);
    if (!ids.length) { setPreview([]); return; }
    const ws = await getWordsByIds(ids);
    const map = new Map(ws.map(w => [String(w.id), w]));
    setPreview(ids.map(i => map.get(String(i)) || { id: i, __missing: true }));
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Stack spacing={2}>
        <Typography variant="h5" fontWeight={800}>데일리 + 단어 관리</Typography>

        {/* 상단 바: 날짜 이동 + 정규화 + 저장 */}
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            alignItems={{ xs: "stretch", sm: "center" }}
            justifyContent="space-between"
          >
            <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
              <ButtonGroup variant="outlined" size="small">
                <Button startIcon={<ChevronLeftIcon />} onClick={() => setDate(addDays(date, -1))}>
                  어제
                </Button>
                <Button startIcon={<TodayIcon />} onClick={() => setDate(today())}>
                  오늘
                </Button>
                <Button endIcon={<ChevronRightIcon />} onClick={() => setDate(addDays(date, +1))}>
                  내일
                </Button>
              </ButtonGroup>

              <TextField
                type="date"
                size="small"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                sx={{ ml: 1, minWidth: 180 }}
              />
            </Stack>

            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
              <Tooltip title="ID 정규화(중복 제거/공백 정리)">
                <Button variant="outlined" size="small" onClick={normalizeIdsInput} startIcon={<CleaningServicesIcon />}>
                  정규화
                </Button>
              </Tooltip>
              <Tooltip title="데일리만 저장">
                <Button variant="contained" size="small" onClick={saveDailyOnly} startIcon={<SaveIcon />}>
                  데일리 저장
                </Button>
              </Tooltip>
              <Tooltip title="단어 저장 후 데일리까지 저장">
                <Button variant="contained" color="secondary" size="small" onClick={saveNewWordsThenDaily} startIcon={<SaveAsIcon />}>
                  단어+데일리 저장
                </Button>
              </Tooltip>
            </Stack>
          </Stack>

          {loading && <LinearProgress sx={{ mt: 2 }} />}

          {!!status && (
            <Alert
              severity={status.startsWith("에러") ? "error" : (status.includes("완료") ? "success" : "info")}
              variant="outlined"
              sx={{ mt: 2, borderRadius: 2 }}
            >
              {status}
            </Alert>
          )}
        </Paper>

        {/* 입력: 데일리 ID */}
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
          <Stack spacing={1.5}>
            <Typography variant="subtitle2" color="text.secondary">
              데일리 wordIds (콤마/줄바꿈/공백 모두 구분자로 처리)
            </Typography>
            <TextField
              placeholder="예: 工作, 愿意, 漂亮"
              value={wordIdsInput}
              onChange={(e) => setWordIdsInput(e.target.value)}
              fullWidth multiline minRows={2}
            />
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
              <Chip label={`입력 ${parsedIds.length}개`} size="small" color="primary" />
              {preview.filter(w => !w.__missing).length > 0 && (
                <Chip label={`등록됨 ${preview.filter(w => !w.__missing).length}개`} size="small" sx={{ ml: 1 }} />
              )}
              {preview.filter(w => w.__missing).length > 0 && (
                <Chip label={`미등록 ${preview.filter(w => w.__missing).length}개`} size="small" color="error" variant="outlined" sx={{ ml: 1 }} />
              )}
            </Stack>
          </Stack>
        </Paper>

        {/* 미리보기 */}
        <Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            미리보기
          </Typography>
          {preview.length === 0 ? (
            <Paper variant="outlined" sx={{ p: 2, color: "text.secondary", borderRadius: 3 }}>
              해당 단어를 찾지 못했거나 비어있음.
            </Paper>
          ) : (
            <Grid container spacing={1.5}>
              {preview.map((w) => (
                <Grid item xs={12} sm={6} md={4} key={w.id}>
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 1.5,
                      borderRadius: 2,
                      ...(w.__missing ? { borderColor: "error.main" } : {}),
                    }}
                  >
                    <Stack spacing={0.5}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography fontWeight={700}>{w.zh || w.id}</Typography>
                        {w.__missing && <Chip size="small" label="미등록" color="error" variant="outlined" />}
                      </Stack>
                      {!w.__missing && (
                        <>
                          <Typography variant="body2" color="text.secondary">{w.pinyin}</Typography>
                          <Typography variant="body2">{w.ko}</Typography>
                        </>
                      )}
                    </Stack>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          )}
        </Box>

        {/* 하단 JSON 에디터: 편집 → 파싱 → 저장(단어/데일리) */}
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
          <Stack spacing={1}>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
              <Typography variant="subtitle1" fontWeight={700}>
                단어 JSON/CSV/TSV 입력 (편집 가능)
              </Typography>
              <Chip label="형식: JSON 배열 or CSV/TSV (zh,pinyin,ko[,pos])" size="small" />
              <Button
                size="small"
                variant="outlined"
                startIcon={<PlaylistAddIcon />}
                onClick={() => {
                  if (preview.filter(w => w.__missing).length === 0) return;
                  const template = preview
                    .filter(w => w.__missing)
                    .map(w => ({ zh: w.id, pinyin: "", ko: "", pos: "", tags: [] }));
                  setNewWordsInput(JSON.stringify(template, null, 2));
                  setNewWordsParsed([]);
                }}
                disabled={preview.filter(w => w.__missing).length === 0}
              >
                템플릿(미등록 ID) 자동생성
              </Button>
            </Stack>

            <TextField
              placeholder={`예1) JSON\n[\n  {"zh":"您好","pinyin":"Nín hǎo","ko":"안녕하십니까","pos":"감탄사"}\n]\n\n예2) CSV/TSV\n您好,Nín hǎo,안녕하십니까,감탄사\n工作\tgōngzuò\t일하다`}
              value={newWordsInput}
              onChange={(e) => setNewWordsInput(e.target.value)}
              fullWidth multiline minRows={8}
              InputProps={{ sx: { fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" } }}
            />

            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
              <Button variant="outlined" size="small" onClick={parseEditorNow}>
                파싱 확인
              </Button>
              <Button variant="contained" size="small" onClick={saveNewWordsOnly}>
                단어 먼저 저장
              </Button>
              <Button variant="contained" color="secondary" size="small" onClick={saveNewWordsThenDaily}>
                단어 저장 + 데일리 저장
              </Button>
              {newWordsParsed.length > 0 && (
                <Chip label={`파싱 ${newWordsParsed.length}건`} size="small" color="primary" sx={{ ml: 1 }} />
              )}
            </Stack>
          </Stack>
        </Paper>
      </Stack>
    </Container>
  );
}
