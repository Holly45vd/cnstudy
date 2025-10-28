// src/pages/everyday/EverydayPage.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getDaily, getWordsByIds } from "../../firebase/firestore";
import VocabCardLite from "../../components/VocabCardLite";
import WordDetailModal from "../../components/WordDetailModal";
import { mapToEverydayWord } from "../../lib/wordMapping";

/* ==== MUI ==== */
import {
  Container, Stack, Typography, IconButton, TextField, Grid,
  Paper, Divider, ButtonGroup, Button, ToggleButtonGroup, ToggleButton, Chip
} from "@mui/material";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import TodayIcon from "@mui/icons-material/Today";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";

/* ========== 로컬 타임존 yyyy-mm-dd ========== */
function fmtYMDLocal(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function addDaysLocal(dateStr, delta) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const nd = new Date(y, (m ?? 1) - 1, d ?? 1);
  nd.setDate(nd.getDate() + delta);
  return fmtYMDLocal(nd);
}
function getWeek(dateStr) {
  // 월요일 시작 주
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, (m ?? 1) - 1, d ?? 1);
  const day = dt.getDay(); // 0=Sun
  const diffToMon = day === 0 ? -6 : 1 - day;
  const monday = addDaysLocal(fmtYMDLocal(dt), diffToMon);
  return Array.from({ length: 7 }, (_, i) => addDaysLocal(monday, i));
}
const WD_LABEL = ["월", "화", "수", "목", "금", "토", "일"];

export default function EverydayPage() {
  const { date: paramDate } = useParams();
  const nav = useNavigate();

  const [date, setDate] = useState(paramDate || fmtYMDLocal());
  const [loading, setLoading] = useState(true);
  const [wordIds, setWordIds] = useState([]);
  const [words, setWords] = useState([]);
  const [err, setErr] = useState(null);

  // 상세 모달
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(null);

  // URL → 상태 동기화
  useEffect(() => {
    if (paramDate && paramDate !== date) setDate(paramDate);
  }, [paramDate]); // eslint-disable-line

  // 데이터 로드
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const daily = await getDaily(date); // doc id == "yyyy-mm-dd"
        const ids = Array.isArray(daily?.wordIds) ? daily.wordIds : [];
        if (!alive) return;
        setWordIds(ids);

        if (ids.length === 0) {
          setWords([]);
        } else {
          const ws = await getWordsByIds(ids.map(String));
          if (!alive) return;
          setWords(ws);
        }
      } catch (e) {
        if (!alive) return;
        setErr(e?.message || String(e));
        setWords([]);
        setWordIds([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [date]);

  // 네비게이션 핸들러
  const prevDate = useMemo(() => addDaysLocal(date, -1), [date]);
  const nextDate = useMemo(() => addDaysLocal(date, +1), [date]);
  const goPrev = useCallback(() => nav(`/everyday/${prevDate}`), [nav, prevDate]);
  const goNext = useCallback(() => nav(`/everyday/${nextDate}`), [nav, nextDate]);
  const goToday = useCallback(() => nav(`/everyday/${fmtYMDLocal()}`), [nav]);

  // 주(요일) 토글
  const thisWeek = useMemo(() => getWeek(date), [date]);
  const selectedIdx = thisWeek.findIndex((d) => d === date);
  const handlePickDay = (_e, val) => {
    if (val) nav(`/everyday/${val}`);
  };

  // 키보드 ← / → 이동
  useEffect(() => {
    const onKey = (e) => {
      if (e.repeat) return;
      if (e.key === "ArrowLeft") { e.preventDefault(); goPrev(); }
      else if (e.key === "ArrowRight") { e.preventDefault(); goNext(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goPrev, goNext]);

  const handleOpen = (w) => { setSelected(mapToEverydayWord(w)); setOpen(true); };
  const handleClose = () => setOpen(false);

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Stack spacing={2}>
        {/* 상단 헤더 카드 */}
        <Paper elevation={0} variant="outlined" sx={{ p: 2.5, borderRadius: 3 }}>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            alignItems={{ xs: "stretch", sm: "center" }}
          >
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ minWidth: 250 }}>
              <CalendarMonthIcon fontSize="medium" />
              <Typography variant="h5" fontWeight={800}>데일리 단어</Typography>
              <Chip
                label={loading ? "로드 중…" : `단어 ${words.length}개`}
                size="small"
                sx={{ ml: 1 }}
              />
            </Stack>

            <Divider flexItem orientation="vertical" sx={{ display: { xs: "none", sm: "block" } }} />

            {/* 날짜 컨트롤: 좌/오늘/우 + Date input */}
            <Stack direction="row" spacing={1} alignItems="center" sx={{ flex: 1 }} justifyContent="flex-end">
              <ButtonGroup variant="outlined" size="small" sx={{ borderRadius: 2 }}>
                <Button onClick={goPrev} startIcon={<ChevronLeftIcon />}>어제</Button>
                <Button onClick={goToday} startIcon={<TodayIcon />}>오늘</Button>
                <Button onClick={goNext} endIcon={<ChevronRightIcon />}>내일</Button>
              </ButtonGroup>
              <TextField
                type="date"
                size="small"
                value={date}
                onChange={(e) => nav(`/everyday/${e.target.value}`)}
                InputProps={{ sx: { borderRadius: 2 } }}
              />
            </Stack>
          </Stack>

        </Paper>

        {/* 카드 그리드: 반응형 1/2/3/4열 */}
        <Grid container spacing={2}>
          {words.map((w) => (
            <Grid key={w.id || w.zh} item xs={12} sm={6} md={4} lg={3}>
              <div onClick={() => handleOpen(w)} style={{ cursor: "pointer" }}>
                <VocabCardLite word={w} />
              </div>
            </Grid>
          ))}
        </Grid>
      </Stack>

      {/* 상세 모달 */}
      <WordDetailModal open={open} onClose={handleClose} word={selected} />
    </Container>
  );
}
