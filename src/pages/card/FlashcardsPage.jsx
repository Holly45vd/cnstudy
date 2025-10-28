// src/pages/card/FlashcardsPage.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  Container, Stack, Typography, LinearProgress, Alert, Button,
  ToggleButton, ToggleButtonGroup, FormControlLabel, Switch, TextField, Paper, Chip, Box
} from "@mui/material";
import OutlinedInput from "@mui/material/OutlinedInput";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import FormControl from "@mui/material/FormControl";
import ListItemText from "@mui/material/ListItemText";
import Select from "@mui/material/Select";
import Checkbox from "@mui/material/Checkbox";

import FlashcardCard from "../../components/FlashcardCard";
import {
  listUnits, getUnit, getWordsByIds,
  getPassedSet, markPassed,
  listDailiesInRange
} from "../../firebase/firestore";
import { useParams, useNavigate } from "react-router-dom";
import { freeTextPinyinToKorean } from "../../lib/pinyinKorean";
import { getAuth, onAuthStateChanged } from "firebase/auth";

/* ========= UI constants ========= */
const ITEM_HEIGHT = 48;
const ITEM_PADDING_TOP = 8;
const MenuProps = {
  PaperProps: { style: { maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP, width: 260 } }
};

/* ========= Seeded Fisher–Yates ========= */
function shuffle(arr, seed = Date.now()) {
  const a = arr.slice();
  let s = seed >>> 0;
  const rand = () => (s = (s * 1664525 + 1013904223) >>> 0) / 0xffffffff;
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ========= Stable key for pass-tracking ========= */
function stableWordKey(w) {
  const id = w?.id ?? w?.zh ?? w?.hanzi ?? "";
  if (id) return String(id);
  const raw = [
    w?.zh ?? "", w?.hanzi ?? "",
    Array.isArray(w?.pinyin) ? w.pinyin.join(" ") : (w?.pinyin ?? ""),
    w?.sentence ?? ""
  ].join("|");
  // FNV-1a (simple 32-bit)
  let h = 2166136261 >>> 0;
  for (let i = 0; i < raw.length; i++) {
    h ^= raw.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return `anon_${h}`;
}

/** koPron/예문 발음 자동 보정 */
function normalizeKoPron(word) {
  if (!word || typeof word !== "object") return word;
  const zh = word.zh ?? word.hanzi ?? word.id ?? "";
  let koPron =
    word.koPron ||
    word.koPronunciation ||
    word.pronunciation_ko ||
    (() => {
      if (Array.isArray(word.pronunciation) && word.pronunciation.length) {
        const exact = word.pronunciation.find((p) => p?.label === zh && p?.ko);
        return exact?.ko || word.pronunciation[0]?.ko || "";
      }
      return "";
    })();
  if (!koPron && word.pinyin) {
    try {
      const pin = Array.isArray(word.pinyin) ? word.pinyin.join(" ") : String(word.pinyin);
      koPron = freeTextPinyinToKorean(pin);
    } catch {}
  }
  let sentenceKo = word.sentenceKo;
  if (!sentenceKo && word.sentencePinyin) {
    try {
      const sp = Array.isArray(word.sentencePinyin) ? word.sentencePinyin.join(" ") : String(word.sentencePinyin);
      sentenceKo = freeTextPinyinToKorean(sp);
    } catch {}
  }
  if (!koPron && !sentenceKo) return word;
  return {
    ...word,
    ...(koPron ? { koPron, pronunciation_ko: koPron } : {}),
    ...(sentenceKo ? { sentenceKo } : {}),
  };
}

/* ========= yyyy-mm-dd (로컬) ========= */
function fmtYMD(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function FlashcardsPage() {
  const { unitId: unitIdParam } = useParams();
  const navigate = useNavigate();

  const [user, setUser] = useState(null);

  /* 유닛 목록/선택(다중) */
  const [units, setUnits] = useState([]);
  const [unitsError, setUnitsError] = useState("");
  const [selectedUnitIds, setSelectedUnitIds] = useState(() =>
    unitIdParam ? [String(unitIdParam)] : []
  );

  /* 단어 소스 분리 */
  const [unitWordsAll, setUnitWordsAll] = useState([]);
  const [dailyWordsAll, setDailyWordsAll] = useState([]);

  /* 옵션 */
  const [includeDaily, setIncludeDaily] = useState(true);
  const [onlyWithSentence, setOnlyWithSentence] = useState(false);
  const [order, setOrder] = useState("shuffled");

  /* 뷰 상태 */
  const [queue, setQueue] = useState([]);
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [loadingUnit, setLoadingUnit] = useState(false);
  const [loadingDaily, setLoadingDaily] = useState(false);
  const [passedIds, setPassedIds] = useState(() => new Set());

  // 로그인 상태
  useEffect(() => {
    const auth = getAuth();
    return onAuthStateChanged(auth, (u) => setUser(u || null));
  }, []);

  // 유닛 목록
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const u = await listUnits({ max: 500 });
        if (!alive) return;
        setUnits(Array.isArray(u) ? u : []);
        setUnitsError("");
      } catch (e) {
        if (!alive) return;
        setUnitsError("유닛 목록을 불러오지 못했습니다.");
        console.error(e);
      }
    })();
    return () => { alive = false; };
  }, []);

  // 유닛(복수) 변경 시: 유닛 단어 로드 + 통과 이력 스코프 결정
  useEffect(() => {
    if (!selectedUnitIds.length) { setUnitWordsAll([]); setPassedIds(new Set()); return; }

    // URL은 첫 번째 선택값으로 동기화(편의상)
    const first = selectedUnitIds[0];
    if (first) navigate(`/flashcards/${first}`, { replace: true });

    let alive = true;
    setLoadingUnit(true);
    setFlipped(false);

    (async () => {
      try {
        // 여러 유닛 문서 → vocabIds 합치기
        const unitsDocs = await Promise.all(selectedUnitIds.map(id => getUnit(String(id))));
        if (!alive) return;

        const mergedIds = Array.from(
          new Set(
            unitsDocs.flatMap(u => Array.isArray(u?.vocabIds) ? u.vocabIds.map(String) : [])
          )
        );
        const raw = mergedIds.length ? await getWordsByIds(mergedIds) : [];
        if (!alive) return;

        // source 라벨 부여
        const words = raw.map(w => ({ ...normalizeKoPron(w), __source: "UNIT" }));
        setUnitWordsAll(words);

        // 통과 이력 스코프:
        // 1개 유닛 → 기존처럼 그 유닛 ID 사용(서버 저장 가능)
        // 복수 유닛 → 로컬 스코프 "mix:<id+id>" 로 저장(서버 저장은 생략)
        let passed = new Set();
        if (selectedUnitIds.length === 1 && user?.uid) {
          try {
            const s = await getPassedSet(user.uid, String(first));
            passed = s instanceof Set ? s : new Set(Array.from(s ?? []).map(String));
          } catch (e) {
            console.warn("getPassedSet 실패, localStorage 사용", e);
          }
        }
        if (passed.size === 0) {
          const scope = selectedUnitIds.length === 1
            ? String(first)
            : `mix:${[...selectedUnitIds].sort().join("+")}`;
          const key = `progress:${scope}`;
          try {
            const arr = JSON.parse(localStorage.getItem(key) || "[]");
            passed = new Set(arr.map(String));
          } catch {}
        }
        if (!alive) return;
        setPassedIds(passed);
      } catch (e) {
        if (!alive) return;
        console.error(e);
        setUnitWordsAll([]);
      } finally {
        if (alive) setLoadingUnit(false);
      }
    })();

    return () => { alive = false; };
  }, [selectedUnitIds, user?.uid, navigate]);

  // 최근 7일 데일리 로드
  useEffect(() => {
    let alive = true;
    if (!includeDaily) { setDailyWordsAll([]); return () => {}; }

    setLoadingDaily(true);
    (async () => {
      try {
        const end = new Date();
        const start = new Date(end);
        start.setDate(end.getDate() - 6);
        const dailyDocs = await listDailiesInRange({
          startDate: fmtYMD(start),
          endDate: fmtYMD(end),
          limit: 7
        });
        if (!alive) return;

        const ids = Array.from(
          new Set(dailyDocs.flatMap(d => Array.isArray(d?.wordIds) ? d.wordIds.map(String) : []))
        );
        if (!ids.length) { setDailyWordsAll([]); return; }

        const raw = await getWordsByIds(ids);
        if (!alive) return;
        setDailyWordsAll(raw.map(w => ({ ...normalizeKoPron(w), __source: "DAILY" })));
      } catch (e) {
        if (!alive) return;
        console.warn("[daily] 최근 7일 데일리 로드 실패:", e);
        setDailyWordsAll([]);
      } finally {
        if (alive) setLoadingDaily(false);
      }
    })();

    return () => { alive = false; };
  }, [includeDaily]);

  // 단어 합치기(+중복 제거) → 필터/정렬
  const wordsAll = useMemo(() => {
    const all = includeDaily ? [...unitWordsAll, ...dailyWordsAll] : [...unitWordsAll];
    const seen = new Set();
    const out = [];
    for (const w of all) {
      const k = stableWordKey(w);
      if (!seen.has(k)) {
        seen.add(k);
        out.push(w);
      }
    }
    return out;
  }, [unitWordsAll, dailyWordsAll, includeDaily]);

  const words = useMemo(() => {
    const base = onlyWithSentence
      ? wordsAll.filter(w => (w?.sentence || w?.sentenceKo || w?.sentencePinyin))
      : wordsAll.slice();
    if (order === "original") return base;
    return shuffle(base);
  }, [wordsAll, onlyWithSentence, order]);

  // words 변경 시 큐/인덱스/플립 초기화
  useEffect(() => {
    setQueue(words.map((_, i) => i));
    setIdx(0);
    setFlipped(false);
  }, [words]);

  // 현재 카드 + 키
  const current = words.length ? words[queue[idx]] : null;
  const currentKey = current ? stableWordKey(current) : "";

  // 액션들
  const flip = useCallback(() => setFlipped(f => !f), []);
  const next = useCallback(() => {
    setFlipped(false);
    setIdx(i => Math.min(i + 1, Math.max(words.length - 1, 0)));
  }, [words.length]);
  const prev = useCallback(() => {
    setFlipped(false);
    setIdx(i => Math.max(i - 1, 0));
  }, []);

  // Good: 통과 기록 + 영속화 + 다음
  const good = useCallback(async () => {
    if (!currentKey) return;
    setPassedIds(prev => {
      const n = new Set(prev);
      n.add(currentKey);
      return n;
    });
    try {
      // 저장 스코프 결정
      const scope = selectedUnitIds.length === 1
        ? String(selectedUnitIds[0])
        : `mix:${[...selectedUnitIds].sort().join("+")}`;

      if (selectedUnitIds.length === 1 && user?.uid) {
        // 단일 유닛 선택시에만 서버 저장
        await markPassed(user.uid, scope, String(currentKey));
      } else {
        // 복수 유닛 or 비로그인 → 로컬 저장
        const key = `progress:${scope}`;
        const prevArr = JSON.parse(localStorage.getItem(key) || "[]");
        const arr = Array.from(new Set([...(Array.isArray(prevArr) ? prevArr : []), String(currentKey)]));
        localStorage.setItem(key, JSON.stringify(arr));
      }
    } catch (e) {
      console.error("통과 저장 실패", e);
    }
    next();
  }, [currentKey, next, selectedUnitIds, user?.uid]);

  // 키보드 단축키: Space=flip, ←/→=prev/next, Enter=good
  useEffect(() => {
    const onKey = (e) => {
      if (e.repeat) return;
      if (e.key === " ") { e.preventDefault(); flip(); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); prev(); }
      else if (e.key === "ArrowRight") { e.preventDefault(); next(); }
      else if (e.key === "Enter") { e.preventDefault(); good(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [flip, prev, next, good]);

  // 진행 퍼센트 (현재 표시 집합 기준)
  const goodCountShown = useMemo(() => {
    const keysShown = new Set(words.map(w => stableWordKey(w)));
    let c = 0;
    passedIds.forEach(k => { if (keysShown.has(k)) c++; });
    return c;
  }, [words, passedIds]);
  const progressPercent = words.length ? (goodCountShown / words.length) * 100 : 0;

  const loading = loadingUnit || loadingDaily;

  return (
    <Container maxWidth="md" sx={{ py: 3 }}>
      <Stack spacing={2}>
        <Typography variant="h4" >Flashcards</Typography>

        {/* 유닛 선택: 다중 체크박스 Select */}
        {unitsError && <Alert severity="warning">{unitsError}</Alert>}
        <FormControl sx={{ width: 360 }}>
          <InputLabel id="unit-multi-label">Unit 선택(복수)</InputLabel>
          <Select
            labelId="unit-multi-label"
            id="unit-multi"
            multiple
            value={selectedUnitIds}
            onChange={(e) => {
              const v = typeof e.target.value === "string" ? e.target.value.split(",") : e.target.value;
              setSelectedUnitIds(v.map(String));
            }}
            input={<OutlinedInput label="Unit 선택(복수)" />}
            renderValue={(selected) => selected.map(id => `Unit ${id}`).join(", ")}
            MenuProps={MenuProps}
          >
            {units.map((u) => {
              const id = String(u?.id ?? "");
              return (
                <MenuItem key={id} value={id}>
                  <Checkbox checked={selectedUnitIds.includes(id)} />
                  <ListItemText primary={`Unit ${id}`} />
                </MenuItem>
              );
            })}
          </Select>
        </FormControl>

        {/* 진행바 + 소스 선택/라벨 */}
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Stack spacing={1}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="subtitle2" >오늘의 학습 진행</Typography>
              <Typography variant="caption" color="text.secondary">
                통과 {goodCountShown} · 총 {words.length}
              </Typography>
            </Stack>
            <LinearProgress variant="determinate" value={progressPercent} />

            <Stack direction="row" spacing={2} alignItems="center" sx={{ mt: 1 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={includeDaily}
                    onChange={(e) => setIncludeDaily(e.target.checked)}
                  />
                }
                label="최근 7일 데일리 포함"
              />
              <Chip label={`UNIT ${unitWordsAll.length}`} size="small" />
              <Chip label={`DAILY ${dailyWordsAll.length}`} size="small" color="default" />
            </Stack>
          </Stack>
        </Paper>

        {/* 옵션 */}
        <Stack direction="row" spacing={2} alignItems="center">
          <ToggleButtonGroup
            exclusive
            value={order}
            onChange={(_, v) => v && setOrder(v)}
            size="small"
          >
            <ToggleButton value="shuffled">랜덤</ToggleButton>
            <ToggleButton value="original">원래 순서</ToggleButton>
          </ToggleButtonGroup>

          <FormControlLabel
            control={
              <Switch
                checked={onlyWithSentence}
                onChange={(e) => setOnlyWithSentence(e.target.checked)}
              />
            }
            label="예문 있는 것만"
          />
        </Stack>

        {loading && <LinearProgress />}

        {/* 카드/경고 */}
        {(!words.length || !current) && !loading && (
          <Alert severity="info">표시할 단어가 없습니다. 유닛을 선택하거나 필터/데일리 옵션을 확인하세요.</Alert>
        )}

        {words.length > 0 && current && (
          <>
            {/* 현재 카드의 소스 라벨 */}
            <Box sx={{ display: "flex", justifyContent: "center" }}>
              <Chip
                label={current.__source === "DAILY" ? "DAILY" : "UNIT"}
                size="small"
                variant="outlined"
                sx={{ mb: 1 }}
              />
            </Box>

            <FlashcardCard
              word={current}
              flipped={flipped}
              onFlip={flip}
              onGood={good}
              passed={passedIds.has(currentKey)}
            />

            {/* 이동 컨트롤 */}
            <Stack direction="row" spacing={1} justifyContent="center">
              <Button variant="outlined" onClick={prev} disabled={idx === 0}>이전(←)</Button>
              <Button variant="contained" onClick={flip}>뒤집기(Space)</Button>
              <Button variant="outlined" onClick={next} disabled={idx >= words.length - 1}>다음(→)</Button>
            </Stack>
          </>
        )}
      </Stack>
    </Container>
  );
}
