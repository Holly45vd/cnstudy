import React, { useEffect, useMemo, useState } from "react";
import {
  Container, Typography, Paper, Stack, Grid, TextField, Button, Alert,
  LinearProgress, Box, Chip, IconButton, List, ListItem, ListItemText,
  Divider, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import SaveIcon from "@mui/icons-material/Save";
import CloudDownloadIcon from "@mui/icons-material/CloudDownload";

import {
  getUnit, createUnit, updateUnit, getWordsByIds, upsertWord
} from "../firebase/firestore";

/* ========= JSON 유틸 ========= */
function parseJsonSafe(s, fallback) {
  try { return JSON.parse(s || ""); } catch { return fallback; }
}
function toPretty(v) {
  try { return JSON.stringify(v ?? null, null, 2); } catch { return ""; }
}
const mono = { fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" };

/* ========= 섹션 템플릿 ========= */
const TEMPLATES = {
  conversationItem: { chinese: "", pinyin: "", meaning: "" },
  grammarItem: { title: "", note: "" },
  practice: { questions: [], notes: "" },
  summary: { vocabulary: [], grammar: [] },
};

/* ========= 요약 ========= */
function summarizeConversation(arr) {
  if (!Array.isArray(arr) || arr.length === 0) return "대화 없음";
  const first = arr[0];
  const text = [first?.chinese || first?.zh || "", first?.meaning || first?.ko || ""]
    .filter(Boolean).join(" | ");
  return `${arr.length}줄 · ${text || "..."}`;
}
function summarizeGrammar(arr) {
  if (!Array.isArray(arr) || arr.length === 0) return "문법 없음";
  const first = arr[0];
  const title =
    typeof first === "string" ? first : (first?.title || first?.rule || "");
  return `${arr.length}항목 · ${title || "..."}`;
}
function summarizePractice(obj) {
  if (!obj || typeof obj !== "object") return "연습 없음";
  const keys = ["writing","extension_phrases","reorder","reading","substitution","practice_mcq","questions"];
  const parts = [];
  for (const k of keys) {
    const v = Array.isArray(obj[k]) ? obj[k].length : 0;
    if (v > 0) parts.push(`${k}:${v}`);
  }
  return parts.length ? parts.join(" · ") : "연습 없음";
}
function summarizeSummary(obj) {
  if (!obj || typeof obj !== "object") return "요약 없음";
  const v = Array.isArray(obj.vocabulary) ? obj.vocabulary.length : 0;
  const g = Array.isArray(obj.grammar) ? obj.grammar.length : 0;
  return `단어 ${v} · 문법 ${g}`;
}

/* ========= 단어 미리보기 ========= */
function serializeWordsForPreview(words) {
  return words.map(w => ({
    id: w.id || w.zh,
    zh: w.zh,
    pinyin: w.pinyin,
    ko: w.ko,
  }));
}

export default function UnitsAdmin() {
  const [id, setId] = useState("");
  const [title, setTitle] = useState("");
  const [theme, setTheme] = useState("");
  const [goals, setGoals] = useState("");
  const [objectives, setObjectives] = useState("");
  const [vocabIds, setVocabIds] = useState("");

  const [conversation, setConversation] = useState([]);
  const [grammar, setGrammar] = useState([]);
  const [practice, setPractice] = useState({});
  const [summary, setSummary] = useState({ vocabulary: [], grammar: [] });

  const [newWordsText, setNewWordsText] = useState("[]");
  const [wordStatus, setWordStatus] = useState("");
  const [status, setStatus] = useState("");
  const [previewWords, setPreviewWords] = useState([]);
  const [loading, setLoading] = useState(false);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editorSection, setEditorSection] = useState("");
  const [editorText, setEditorText] = useState("");

  /* ===== 유닛 로드 ===== */
  async function loadUnit() {
    if (!id) return;
    try {
      setLoading(true);
      setStatus("로드 중…");
      const u = await getUnit(id);
      if (!u) { setStatus("존재하지 않음"); return; }
      setTitle(u.title || "");
      setTheme(u.theme || "");
      setGoals((u.goals || []).join(", "));
      setObjectives((u.objectives || []).join(", "));
      setVocabIds((u.vocabIds || []).join(", "));
      setConversation(Array.isArray(u.conversation) ? u.conversation : []);
      setGrammar(Array.isArray(u.grammar) ? u.grammar : []);
      setPractice(u.practice && typeof u.practice === "object" ? u.practice : {});
      setSummary(u.summary && typeof u.summary === "object" ? u.summary : { vocabulary: [], grammar: [] });
      setStatus("로드 완료");
    } catch (e) {
      setStatus("에러: " + (e.message || String(e)));
    } finally {
      setLoading(false);
    }
  }

  /* ===== 단어 미리보기 ===== */
  useEffect(() => {
    let alive = true;
    (async () => {
      const ids = vocabIds.split(",").map(s => s.trim()).filter(Boolean);
      if (ids.length === 0) { if (alive) setPreviewWords([]); return; }
      try {
        const ws = await getWordsByIds(ids);
        if (!alive) return;
        const map = new Map(ws.map(w => [String(w.id), w]));
        const ordered = ids.map(i => map.get(String(i))).filter(Boolean);
        setPreviewWords(ordered);
      } catch {
        if (alive) setPreviewWords([]);
      }
    })();
    return () => { alive = false; };
  }, [vocabIds]);

  /* ===== 저장 ===== */
  async function handleSave(isCreate) {
    try {
      if (!id) throw new Error("id 필수");
      const doc = {
        id,
        title,
        theme,
        goals: goals ? goals.split(",").map(s => s.trim()).filter(Boolean) : [],
        objectives: objectives ? objectives.split(",").map(s => s.trim()).filter(Boolean) : [],
        vocabIds: vocabIds ? vocabIds.split(",").map(s => s.trim()).filter(Boolean) : [],
        conversation,
        grammar,
        practice,
        summary,
        updatedAt: new Date(),
      };
      setLoading(true);
      setStatus(isCreate ? "생성 중…" : "수정 중…");
      if (isCreate) await createUnit(doc);
      else await updateUnit(id, doc);
      setStatus("저장 완료");
    } catch (e) {
      setStatus("에러: " + (e.message || String(e)));
    } finally {
      setLoading(false);
    }
  }

  /* ===== 새 단어 JSON 추가 ===== */
  async function handleAddWords() {
    try {
      setWordStatus("단어 저장 중…");
      const arr = parseJsonSafe(newWordsText, []);
      if (!Array.isArray(arr) || arr.length === 0) throw new Error("JSON 배열 필요");
      const savedIds = [];
      for (const w of arr) {
        if (!w.zh || !w.pinyin || !w.ko) throw new Error(`필수 누락: ${JSON.stringify(w)}`);
        await upsertWord({
          id: w.id || w.zh,
          zh: w.zh, pinyin: w.pinyin, ko: w.ko,
          pos: w.pos || "",
          tags: Array.isArray(w.tags) ? w.tags : (w.tags ? String(w.tags).split(",").map(s=>s.trim()) : []),
          sentence: w.sentence || "",
          sentencePinyin: w.sentencePinyin || "",
          sentenceKo: w.sentenceKo || "",
        });
        savedIds.push(w.id || w.zh);
      }
      const current = vocabIds.split(",").map(s => s.trim()).filter(Boolean);
      const merged = [...new Set([...current, ...savedIds])];
      setVocabIds(merged.join(", "));
      setWordStatus(`단어 ${savedIds.length}건 저장 완료`);
    } catch (e) {
      setWordStatus("에러: " + (e.message || String(e)));
    }
  }

  /* ===== JSON 모달 ===== */
  function openEditor(section) {
    setEditorSection(section);
    const map = {
      conversation: toPretty(conversation),
      grammar: toPretty(grammar),
      practice: toPretty(practice),
      summary: toPretty(summary),
    };
    setEditorText(map[section] || "");
    setEditorOpen(true);
  }
  function applyEditor() {
    try {
      const obj = JSON.parse(editorText || "");
      switch (editorSection) {
        case "conversation": setConversation(Array.isArray(obj) ? obj : []); break;
        case "grammar": setGrammar(Array.isArray(obj) ? obj : []); break;
        case "practice": setPractice(obj && typeof obj === "object" ? obj : {}); break;
        case "summary": setSummary(obj && typeof obj === "object" ? obj : { vocabulary: [], grammar: [] }); break;
      }
      setEditorOpen(false);
      setStatus(`${editorSection} 업데이트 완료`);
    } catch (e) {
      setStatus("에러: JSON 파싱 실패 — " + (e.message || String(e)));
    }
  }

  /* ===== 섹션 항목 관리 ===== */
  function addConversationItem() { setConversation(prev => [...prev, { ...TEMPLATES.conversationItem }]); }
  function removeConversationItem(idx) { setConversation(prev => prev.filter((_, i) => i !== idx)); }
  function addGrammarItem() { setGrammar(prev => [...prev, { ...TEMPLATES.grammarItem }]); }
  function removeGrammarItem(idx) { setGrammar(prev => prev.filter((_, i) => i !== idx)); }

  const previewList = useMemo(() => serializeWordsForPreview(previewWords), [previewWords]);

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>유닛 관리</Typography>

      <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
        <Stack spacing={3}>

          {/* ==== 상단 ==== */}
          <Stack direction="row" spacing={1.5} alignItems="center">
            <TextField label="Unit ID" value={id} onChange={e=>setId(e.target.value)} size="small" sx={{width:240}}/>
            <Button variant="outlined" onClick={loadUnit} startIcon={<CloudDownloadIcon/>}>불러오기</Button>
            <Box flex={1}/>
            <Stack direction="row" spacing={1}>
              <Button variant="contained" startIcon={<SaveIcon/>} onClick={()=>handleSave(true)}>새로 만들기</Button>
              <Button variant="outlined" onClick={()=>handleSave(false)}>수정 저장</Button>
            </Stack>
          </Stack>
          {loading && <LinearProgress/>}

          {/* ==== 기본 정보 ==== */}
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}><TextField label="Title" value={title} onChange={e=>setTitle(e.target.value)} fullWidth/></Grid>
            <Grid item xs={12} sm={6}><TextField label="Theme" value={theme} onChange={e=>setTheme(e.target.value)} fullWidth/></Grid>
            <Grid item xs={12}><TextField label="Goals (콤마)" value={goals} onChange={e=>setGoals(e.target.value)} fullWidth/></Grid>
            <Grid item xs={12}><TextField label="Objectives (콤마)" value={objectives} onChange={e=>setObjectives(e.target.value)} fullWidth/></Grid>
            <Grid item xs={12}><TextField label="Vocab IDs (콤마)" value={vocabIds} onChange={e=>setVocabIds(e.target.value)} fullWidth/></Grid>
          </Grid>

          {/* ==== 단어 추가 ==== */}
          <Paper variant="outlined" sx={{p:2, borderRadius:2}}>
            <Stack spacing={1}>
              <Typography variant="subtitle1">새 단어 JSON 추가</Typography>
              <TextField value={newWordsText} onChange={e=>setNewWordsText(e.target.value)} multiline minRows={6} fullWidth InputProps={{sx:mono}}/>
              <Stack direction="row" spacing={1}>
                <Button variant="contained" size="small" onClick={handleAddWords}>단어 추가</Button>
                {wordStatus && <Alert severity={wordStatus.startsWith("에러")?"error":"success"} variant="outlined">{wordStatus}</Alert>}
              </Stack>
            </Stack>
          </Paper>

          {/* ==== 단어 미리보기 ==== */}
          <Box>
            <Typography variant="body2" color="text.secondary">단어 미리보기</Typography>
            {previewList.length === 0 ? (
              <Paper variant="outlined" sx={{p:2, borderRadius:2}}>단어 없음</Paper>
            ) : (
              <Grid container spacing={1.5}>
                {previewList.map(w=>(
                  <Grid item xs={12} sm={6} md={4} key={w.id}>
                    <Paper variant="outlined" sx={{p:1.5,borderRadius:2}}>
                      <Typography>{w.zh}</Typography>
                      <Typography variant="body2" color="text.secondary">{w.pinyin}</Typography>
                      <Typography variant="body2">{w.ko}</Typography>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            )}
          </Box>

          <Divider/>

          {/* ==== 대화 ==== */}
          <Paper variant="outlined" sx={{p:2,borderRadius:2}}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="subtitle1">대화 (Conversation)</Typography>
              <Stack direction="row" spacing={1}>
                <IconButton size="small" onClick={addConversationItem}><AddIcon/></IconButton>
                <Button size="small" variant="outlined" onClick={()=>openEditor("conversation")}>JSON 편집</Button>
              </Stack>
            </Stack>
            <Typography variant="body2" color="text.secondary">{summarizeConversation(conversation)}</Typography>
            <List dense disablePadding>
              {conversation.map((c,idx)=>(
                <ListItem key={idx}
                  secondaryAction={<IconButton edge="end" onClick={()=>removeConversationItem(idx)}><DeleteIcon/></IconButton>}>
                  <ListItemText primary={`${c?.chinese||""} (${c?.pinyin||""})`} secondary={c?.meaning||c?.ko}/>
                </ListItem>
              ))}
            </List>
          </Paper>

          {/* ==== 문법 ==== */}
          <Paper variant="outlined" sx={{p:2,borderRadius:2}}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="subtitle1">문법 (Grammar)</Typography>
              <Stack direction="row" spacing={1}>
                <IconButton size="small" onClick={addGrammarItem}><AddIcon/></IconButton>
                <Button size="small" variant="outlined" onClick={()=>openEditor("grammar")}>JSON 편집</Button>
              </Stack>
            </Stack>
            <Typography variant="body2" color="text.secondary">{summarizeGrammar(grammar)}</Typography>
            <List dense disablePadding>
              {grammar.map((g,idx)=>(
                <ListItem key={idx}
                  secondaryAction={<IconButton edge="end" onClick={()=>removeGrammarItem(idx)}><DeleteIcon/></IconButton>}>
                  <ListItemText
                    primary={typeof g==="string"?g:(g?.title||g?.rule||"(제목 없음)")}
                    secondary={g?.note||g?.description||""}/>
                </ListItem>
              ))}
            </List>
          </Paper>

          {/* ==== 연습 ==== */}
          <Paper variant="outlined" sx={{p:2,borderRadius:2}}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="subtitle1">연습 (Practice)</Typography>
              <Button size="small" variant="outlined" onClick={()=>openEditor("practice")}>JSON 편집</Button>
            </Stack>
            <Typography variant="body2" color="text.secondary">{summarizePractice(practice)}</Typography>
          </Paper>

          {/* ==== 요약 ==== */}
          <Paper variant="outlined" sx={{p:2,borderRadius:2}}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="subtitle1">요약 (Summary)</Typography>
              <Button size="small" variant="outlined" onClick={()=>openEditor("summary")}>JSON 편집</Button>
            </Stack>
            <Typography variant="body2" color="text.secondary">{summarizeSummary(summary)}</Typography>
          </Paper>

          {!!status && <Alert severity={status.startsWith("에러")?"error":status.includes("완료")?"success":"info"} variant="outlined">{status}</Alert>}
        </Stack>
      </Paper>

      {/* ==== JSON 모달 ==== */}
      <Dialog open={editorOpen} onClose={()=>setEditorOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{({conversation:"대화",grammar:"문법",practice:"연습",summary:"요약"}[editorSection]||"JSON")} 편집</DialogTitle>
        <DialogContent dividers>
          <TextField value={editorText} onChange={e=>setEditorText(e.target.value)} multiline fullWidth minRows={14} InputProps={{sx:mono}}/>
          <Box sx={{mt:1}}><Alert severity="info" variant="outlined">JSON 형식이 유효해야 저장됩니다.</Alert></Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={()=>setEditorOpen(false)}>취소</Button>
          <Button variant="contained" onClick={applyEditor}>저장</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
