// src/pages/units/sections/PracticeSection.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useOutletContext } from "react-router-dom";
import {
  Typography, Card, CardContent, Button, Box, Dialog,
  DialogTitle, DialogContent, DialogActions, IconButton,
  Stack, Chip, Divider, Paper, useTheme, Accordion,
  AccordionSummary, AccordionDetails, Grow, Tooltip
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import { useSpeechSynthesisLite } from "../../../hooks/useSpeechSynthesisLite";

const normalize = (s = "") =>
  s.replace(/\s+/g, "").replace(/[，。！？,.!?；;：:、“”"‘’'（）()]/g, "").trim();
const zhToCharTokens = (s = "") =>
  s.replace(/[，。！？,.!?；;：:、“”"‘’'（）()\s]/g, "").split("").filter(Boolean);
const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

export default function PracticeSection() {
  const theme = useTheme();
  const { unit } = useOutletContext();
  const practice = !Array.isArray(unit?.practice) ? unit?.practice || {} : {};
  const grammar = unit?.grammar || [];
  const { speak, voices } = useSpeechSynthesisLite();

  /* ===== 보이스 ===== */
  const pickVoice = useCallback((list, prefix) => {
    const arr = Array.isArray(list) ? list : [];
    return arr.find((v) => v.lang?.startsWith(prefix)) || null;
  }, []);
  const zhVoice = useMemo(() => {
    const list = (window.speechSynthesis?.getVoices?.() || voices) || [];
    return pickVoice(list, "zh") || null;
  }, [voices, pickVoice]);
  const speakZh = useCallback(
    (text) => {
      if (!text) return;
      speak({ text, voice: zhVoice, lang: "zh-CN", rate: 0.95 });
    },
    [speak, zhVoice]
  );

  /* ===== 상태 ===== */
  const [reorders, setReorders] = useState({});
  const [result, setResult] = useState("");
  const [open, setOpen] = useState(false);
  const [showMeanings, setShowMeanings] = useState(false);

  const convertWritingToReorder = (writing = []) =>
    writing.map((w) => {
      const ans = w.answer_zh || "";
      const items = shuffle(zhToCharTokens(ans));
      return { items, answer: ans, hint_ko: w.prompt_ko || "" };
    });

  useEffect(() => {
    const merged = [
      ...(practice.reorder || []),
      ...convertWritingToReorder(practice.writing || []),
    ];
    const init = {};
    merged.forEach((r, idx) => {
      init[idx] = { selected: [], remaining: [...(r.items || [])] };
    });
    setReorders(init);
  }, [practice]);

  /* ===== 액션 ===== */
  const pickToken = (idx, token) =>
    setReorders((prev) => {
      const cur = prev[idx];
      if (!cur) return prev;
      return {
        ...prev,
        [idx]: {
          selected: [...cur.selected, token],
          remaining: cur.remaining.filter((t) => t !== token),
        },
      };
    });

  const resetReorder = (idx, items) =>
    setReorders((prev) => ({ ...prev, [idx]: { selected: [], remaining: [...items] } }));

  const openResult = (text) => {
    setResult(text);
    setOpen(true);
    speakZh(text);
  };
  const handleClose = () => setOpen(false);

  /* ===== 문법 섹션 ===== */
  const renderGrammar = (list = []) =>
    list.length > 0 && (
      <Accordion defaultExpanded variant="outlined" sx={{ borderRadius: 2 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">📘 문법 요약</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={1.5}>
            {list.map((item, idx) => {
              let title = "";
              let desc = "";

              if (typeof item === "string") {
                const [t, ...rest] = item.split(":");
                title = t?.trim() || "";
                desc = rest.join(":").trim();
              } else if (typeof item === "object") {
                title = item.title || item.name || "문법 항목";
                desc = item.desc || item.description || item.content || "";
              }

              return (
                <Grow in key={idx}>
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 2,
                      borderRadius: 2,
                      bgcolor: "background.paper",
                      "&:hover": { bgcolor: "action.hover" },
                    }}
                  >
                    <Typography variant="subtitle1" >
                      {title}
                    </Typography>
                    {desc && (
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ mt: 0.5, whiteSpace: "pre-line" }}
                      >
                        {desc}
                      </Typography>
                    )}
                  </Paper>
                </Grow>
              );
            })}
          </Stack>
        </AccordionDetails>
      </Accordion>
    );

  /* ===== 읽기 연습 ===== */
  const renderReading = (list = []) =>
    list.length > 0 && (
      <Accordion defaultExpanded variant="outlined" sx={{ borderRadius: 2 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">📖 읽기 연습</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={1.5}>
            {list.map((it, i) => (
              <Paper key={i} variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Typography sx={{ fontFamily: "WDXL Lubrifont SC", fontSize: "20px" }}>
                    {it.zh}
                  </Typography>
                  <Tooltip title="중국어 듣기">
                    <IconButton size="small" onClick={() => speakZh(it.zh)}>
                      <VolumeUpIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  뜻: {it.ko}
                </Typography>
              </Paper>
            ))}
          </Stack>
        </AccordionDetails>
      </Accordion>
    );

  /* ===== 문장 만들기 ===== */
  const renderReorder = (practiceObj) => {
    const merged = [
      ...(practiceObj.reorder || []),
      ...convertWritingToReorder(practiceObj.writing || []),
    ];
    if (!merged.length) return null;
    return (
      <Accordion defaultExpanded variant="outlined" sx={{ borderRadius: 2 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">✏️ 문장 만들기</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={2}>
            {merged.map((r, idx) => {
              const state = reorders[idx] || { selected: [], remaining: [...(r.items || [])] };
              const built = state.selected.join("");
              const correct = normalize(built) === normalize(r.answer);
              return (
                <Card key={idx} variant="outlined" sx={{ borderRadius: 3 }}>
                  <CardContent>
                    {r.hint_ko && (
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        힌트: {r.hint_ko}
                      </Typography>
                    )}
                    <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 1, minHeight: 40 }}>
                      {state.selected.map((t, i) => (
                        <Chip key={`${t}-${i}`} label={t} color={correct ? "success" : "default"} />
                      ))}
                    </Stack>
                    <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 1 }}>
                      {state.remaining.map((t, i) => (
                        <Chip
                          key={`${t}-${i}`}
                          label={t}
                          variant="outlined"
                          onClick={() => pickToken(idx, t)}
                          clickable
                        />
                      ))}
                    </Stack>
                    <Stack direction="row" spacing={1}>
                      <Button
                        variant="contained"
                        onClick={() =>
                          openResult(
                            correct
                              ? `정답입니다! (${r.answer})`
                              : `틀렸습니다 😢 (정답: ${r.answer})`
                          )
                        }
                      >
                        제출
                      </Button>
                      <Button
                        variant="outlined"
                        startIcon={<RestartAltIcon />}
                        onClick={() => resetReorder(idx, r.items)}
                      >
                        초기화
                      </Button>
                      <IconButton onClick={() => speakZh(r.answer)}>
                        <VolumeUpIcon />
                      </IconButton>
                    </Stack>
                  </CardContent>
                </Card>
              );
            })}
          </Stack>
        </AccordionDetails>
      </Accordion>
    );
  };

  /* ===== 확장 표현 ===== */
  const renderExtension = (ext = []) =>
    ext.length > 0 && (
      <Accordion variant="outlined" sx={{ borderRadius: 2 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">💬 확장 표현</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
            <Button
              startIcon={showMeanings ? <VisibilityOffIcon /> : <VisibilityIcon />}
              onClick={() => setShowMeanings((v) => !v)}
              size="small"
            >
              {showMeanings ? "뜻 숨기기" : "뜻 보기"}
            </Button>
          </Stack>
          <Stack spacing={1.5}>
            {ext.map((e, i) => (
              <Paper key={i} variant="outlined" sx={{ p: 1.5 }}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Typography sx={{ fontFamily: "WDXL Lubrifont SC" }}>{e.zh}</Typography>
                  <IconButton size="small" onClick={() => speakZh(e.zh)}>
                    <VolumeUpIcon fontSize="small" />
                  </IconButton>
                </Stack>
                {e.py && (
                  <Typography variant="body2" color="text.secondary">
                    Pinyin: {e.py}
                  </Typography>
                )}
                {e.pron && (
                  <Typography variant="body2" color="text.secondary">
                    발음: {e.pron}
                  </Typography>
                )}
                {showMeanings && (
                  <Typography variant="body2" color="text.secondary">
                    {e.ko}
                  </Typography>
                )}
              </Paper>
            ))}
          </Stack>
        </AccordionDetails>
      </Accordion>
    );

  return (
    <Box>
      {renderGrammar(grammar)}
      <Divider sx={{ my: 2 }} />
      {renderReading(practice.reading || [])}
      {renderReorder(practice)}
      {renderExtension(practice.extension_phrases || [])}

      <Dialog open={open} onClose={handleClose}>
        <DialogTitle
          sx={{
            color: result.startsWith("정답")
              ? theme.palette.success.main
              : theme.palette.error.main,
          }}
        >
          {result.startsWith("정답") ? "✅ 정답" : "❌ 오답"}
        </DialogTitle>
        <DialogContent>
          <Typography>{result}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} variant="contained">
            확인
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
