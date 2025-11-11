import React, { useMemo, useState, useCallback, useEffect } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Stack,
  IconButton,
  Divider,
  Chip,
  Button,
  CircularProgress,
} from "@mui/material";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ShuffleIcon from "@mui/icons-material/Shuffle";
import LocalLibraryIcon from "@mui/icons-material/LocalLibrary";
import { useLocation, useNavigate } from "react-router-dom";

import { speakSafe } from "../lib/ttsHelper";
import { freeTextPinyinToKorean } from "../lib/pinyinKorean";
import { getWordsByIds, getUnit, listUnits } from "../firebase/firestore";
import { pinyin as pinyinPro } from "pinyin-pro";

/* ======================= 유틸 ======================= */

const isHan = (ch) => /\p{Script=Han}/u.test(ch);

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function tokenizePinyin(p) {
  if (!p) return [];
  return String(p).trim().split(/\s+/).filter(Boolean);
}

/** zh(문장) ↔ pinyin(문장병음) 1:1 매핑 (한자 수 === 병음 토큰 수일 때만) */
function makeHanziPinyinMap(zh, pinyin) {
  if (!zh || !pinyin) return null;
  const chars = Array.from(zh);
  const hanPositions = [];
  chars.forEach((ch, i) => {
    if (isHan(ch)) hanPositions.push({ ch, i });
  });
  const tokens = tokenizePinyin(pinyin);
  if (!hanPositions.length || !tokens.length) return null;
  if (hanPositions.length !== tokens.length) return null;
  return hanPositions.map((hp, idx) => ({
    char: hp.ch,
    hanIndex: hp.i,
    token: tokens[idx],
    tokenIndex: idx,
  }));
}

/** 병음 라인(토큰) 렌더: 맵 성공 시 사용 */
function renderPinyinWithHighlight_Token(pinyin, map, activeChar) {
  if (!pinyin) return "";
  const tokens = tokenizePinyin(pinyin);
  if (!map || !tokens.length || map.length !== tokens.length) return pinyin;

  const activeIdxSet = new Set(
    map.filter((m) => activeChar && m.char === activeChar).map((m) => m.tokenIndex)
  );

  return (
    <>
      {tokens.map((tk, i) => {
        const isActive = activeIdxSet.has(i);
        return (
          <React.Fragment key={`${tk}-${i}`}>
            {isActive ? (
              <mark
                style={{
                  background: "linear-gradient(180deg,#FFE082 0%,#FFD54F 100%)",
                  borderRadius: 6,
                  padding: "0 4px",
                  boxShadow: "inset 0 -2px 0 rgba(0,0,0,0.12)",
                }}
              >
                {tk}
              </mark>
            ) : (
              tk
            )}
            {i < tokens.length - 1 ? " " : ""}
          </React.Fragment>
        );
      })}
    </>
  );
}

/** 병음 라인(글자 배열) 렌더: 토큰 맵 실패 시 사용 */
function renderPinyinWithHighlight_PerChar(charPinyinArr, activeIdx) {
  if (!Array.isArray(charPinyinArr) || !charPinyinArr.length) return "";
  return (
    <>
      {charPinyinArr.map((tk, i) => {
        const isActive = i === activeIdx;
        return (
          <React.Fragment key={`${tk}-${i}`}>
            {isActive ? (
              <mark
                style={{
                  background: "linear-gradient(180deg,#FFE082 0%,#FFD54F 100%)",
                  borderRadius: 6,
                  padding: "0 4px",
                  boxShadow: "inset 0 -2px 0 rgba(0,0,0,0.12)",
                }}
              >
                {tk}
              </mark>
            ) : (
              tk
            )}
            {i < charPinyinArr.length - 1 ? " " : ""}
          </React.Fragment>
        );
      })}
    </>
  );
}

/** 간이 사전 인덱스 생성: [{zh, ko, pinyin}, ...] → Map */
function buildLexiconIndex(vocabList = []) {
  const map = new Map();
  for (const v of vocabList) {
    const key = v?.zh || v?.hanzi || v?.id;
    if (!key) continue;
    map.set(key, {
      zh: key,
      ko: v?.ko || v?.meaning || "",
      pinyin: v?.pinyin || "",
      sentence: v?.sentence || "",
      sentencePinyin: v?.sentencePinyin || "",
      sentenceKo: v?.sentenceKo || "",
    });
  }
  return map;
}

/** 가장 긴 매치 탐색(좌→우) */
function greedyFindWordAt(sentence, startIdx, lexIndex) {
  if (!sentence || !lexIndex || startIdx == null) return null;
  const chars = Array.from(sentence);
  if (!isHan(chars[startIdx])) return null;

  const MAX = 6;
  for (let len = Math.min(MAX, chars.length - startIdx); len >= 1; len--) {
    const piece = chars.slice(startIdx, startIdx + len).join("");
    if (lexIndex.has(piece)) {
      return { zh: piece, info: lexIndex.get(piece), start: startIdx, end: startIdx + len - 1 };
    }
  }
  const one = chars[startIdx];
  if (lexIndex.has(one)) return { zh: one, info: lexIndex.get(one), start: startIdx, end: startIdx };
  return null;
}

/** 배열 셔플 */
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ======================= 페이지 컴포넌트 ======================= */

export default function SentenceStudyPage() {
  const navigate = useNavigate();
  const { state } = useLocation();

  // 우선순위: state → query
  const params = new URLSearchParams(window.location.search);
  const stateSentence = state?.sentence ?? "";
  const stateSentencePinyin = state?.sentencePinyin ?? "";
  const stateSentenceKo = state?.sentenceKo ?? "";

  const [sentence, setSentence] = useState(
    stateSentence || params.get("sentence") || ""
  );
  const [sentencePinyin, setSentencePinyin] = useState(
    stateSentencePinyin || params.get("pinyin") || ""
  );
  const [sentenceKo, setSentenceKo] = useState(
    stateSentenceKo || params.get("sko") || ""
  );

  // 어떤 단어의 예문인지(상단 노출용)
  const [sourceWord, setSourceWord] = useState(null);

  // 단어/유닛 힌트
  const wordId = state?.wordId || state?.wordZh || "";
  const unitId = state?.unitId || "";

  // 사전(단어 목록)
  const initialVocabList = Array.isArray(state?.vocabList) ? state.vocabList : [];
  const [vocabList, setVocabList] = useState(initialVocabList);

  // 로딩
  const [loading, setLoading] = useState(false);

  /** 랜덤 문장 하나 로드 */
  const loadRandomSentence = useCallback(async () => {
    setLoading(true);
    try {
      // 0) 현 vocabList에서 예문 후보
      let candidates = vocabList.filter(v => v?.sentence && v?.sentencePinyin);

      // 1) unitId 기준
      if (!candidates.length && unitId) {
        const unit = await getUnit(String(unitId));
        const ids = Array.isArray(unit?.vocabIds) ? unit.vocabIds : [];
        const words = ids.length ? await getWordsByIds(shuffle(ids).slice(0, 40)) : [];
        candidates = words.filter(v => v?.sentence && v?.sentencePinyin);
        if (!vocabList.length && words.length) setVocabList(words);
      }

      // 2) 전체 유닛
      if (!candidates.length) {
        const units = await listUnits({ max: 120 });
        const ids = shuffle(units.flatMap(u => Array.isArray(u?.vocabIds) ? u.vocabIds : [])).slice(0, 160);
        let acc = [];
        for (let i = 0; i < ids.length; i += 10) {
          const words = await getWordsByIds(ids.slice(i, i + 10));
          acc = acc.concat(words.filter(v => v?.sentence && v?.sentencePinyin));
          if (acc.length >= 12) break;
        }
        candidates = acc;
        if (!vocabList.length && acc.length) setVocabList(acc);
      }

      if (candidates.length) {
        const pick = candidates[Math.floor(Math.random() * candidates.length)];
        setSentence(pick.sentence);
        setSentencePinyin(pick.sentencePinyin);
        setSentenceKo(pick.sentenceKo || "");
        setSourceWord({ zh: pick.zh, ko: pick.ko, pinyin: pick.pinyin }); // ✅ 상단 표시
        return true;
      }
      return false;
    } finally {
      setLoading(false);
    }
  }, [unitId, vocabList]);

  // 초기 하이드레이션
  useEffect(() => {
    let cancelled = false;
    async function hydrate() {
      // 이미 문장 있으면 소스 단어 추정
      if (sentence && sentencePinyin) {
        // 1) 현재 vocabList에서 동일 예문 단어 찾기
        const found = vocabList.find(v => v?.sentence === sentence && v?.sentencePinyin === sentencePinyin);
        if (found) setSourceWord({ zh: found.zh, ko: found.ko, pinyin: found.pinyin });

        // 2) 없고 unitId 있으면 보강
        if (!found && unitId) {
          try {
            setLoading(true);
            const unit = await getUnit(String(unitId));
            const ids = Array.isArray(unit?.vocabIds) ? unit.vocabIds : [];
            if (ids.length) {
              const words = await getWordsByIds(ids);
              if (!cancelled) {
                setVocabList(prev => prev.length ? prev : words);
                const hit = words.find(v => v?.sentence === sentence && v?.sentencePinyin === sentencePinyin);
                if (hit) setSourceWord({ zh: hit.zh, ko: hit.ko, pinyin: hit.pinyin });
              }
            }
          } finally {
            if (!cancelled) setLoading(false);
          }
        }
        return;
      }

      // 단어 힌트
      if (!sentence && wordId) {
        try {
          setLoading(true);
          const [w] = await getWordsByIds([String(wordId)]);
          if (!cancelled && w?.sentence && w?.sentencePinyin) {
            setSentence(w.sentence);
            setSentencePinyin(w.sentencePinyin);
            setSentenceKo(w.sentenceKo || "");
            setSourceWord({ zh: w.zh, ko: w.ko, pinyin: w.pinyin });
            if (!vocabList.length) setVocabList([w]);
            return;
          }
        } finally {
          if (!cancelled) setLoading(false);
        }
      }

      // 랜덤
      if (!sentence) await loadRandomSentence();
    }
    hydrate();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wordId, unitId]);

  // ===== 병음 보강: 글자 단위 병음 배열 생성(항상 가능) =====
  const charPinyinArr = useMemo(() => {
    if (!sentence) return [];
    // type=array → 글자 단위 병음. nonZh=consecutive 로 비한자 구간은 그대로 합치지 않고 분리됨.
    const arr = pinyinPro(sentence, { toneType: "mark", type: "array", multiple: false, nonZh: "consecutive" });
    // 길이 보정: 길이가 문장 글자 수와 다르면(구두점 등) 문장 글자 수 기준으로 재계산
    const chars = Array.from(sentence);
    if (arr.length !== chars.length) {
      // pinyin-pro는 비한자에 원문을 반환하므로 보통 길이가 맞는다. 혹시 다르면 간단히 per-char 다시 계산.
      return chars.map(ch => isHan(ch) ? pinyinPro(ch, { toneType: "mark", type: "array" })[0] : ch);
    }
    return arr;
  }, [sentence]);

  // 문장 매핑(토큰) 시도 → 실패 시 글자 배열로 하이라이트
  const sentenceMap = useMemo(
    () => makeHanziPinyinMap(sentence, sentencePinyin),
    [sentence, sentencePinyin]
  );

  // 사전 인덱스
  const lexIndex = useMemo(() => buildLexiconIndex(vocabList), [vocabList]);

  // 선택 상태
  const [hoverIdx, setHoverIdx] = useState(-1);
  const [lockedIdx, setLockedIdx] = useState(-1);
  const activeIdx = lockedIdx >= 0 ? lockedIdx : hoverIdx;

  // 선택된 글자/단어
  const activeChar = useMemo(() => {
    if (!sentence || activeIdx < 0) return "";
    const chars = Array.from(sentence);
    return chars[activeIdx] || "";
  }, [sentence, activeIdx]);

  const activeWord = useMemo(() => {
    if (activeIdx < 0) return null;
    return greedyFindWordAt(sentence, activeIdx, lexIndex);
  }, [sentence, activeIdx, lexIndex]);

  const play = useCallback(async (text) => {
    if (!text?.trim()) return;
    await speakSafe(text, { lang: "zh-CN", rate: 1.0 });
  }, []);

  const onCharClick = useCallback(async (idx) => {
    setLockedIdx(prev => (prev === idx ? -1 : idx));
    const toSpeak = activeWord?.start === idx ? activeWord.zh : Array.from(sentence)[idx];
    await play(toSpeak);
  }, [activeWord, sentence, play]);

  const chars = useMemo(() => Array.from(sentence || ""), [sentence]);
  const activeWordRange = activeWord ? { start: activeWord.start, end: activeWord.end } : null;

  // 다음 랜덤 문장
  const handleNextRandom = useCallback(async () => {
    setLockedIdx(-1);
    setHoverIdx(-1);
    await loadRandomSentence();
  }, [loadRandomSentence]);

  // ===== 뜻 보강: CEDICT 서브셋이 있으면 불러와 단어 뜻 채우기 =====
  const [cedict, setCedict] = useState(null);
  useEffect(() => {
    let mounted = true;
    // 파일이 없으면 조용히 실패하도록 try/catch
    import(/* webpackChunkName: "cedict-min" */ "../lib/cedict_min.json")
      .then(mod => { if (mounted) setCedict(mod.default || mod); })
      .catch(() => {});
    return () => { mounted = false; };
  }, []);

  const lookupMeaning = useCallback((hanzi) => {
    // 1) vocabList 우선
    const v = lexIndex.get(hanzi);
    if (v?.ko) return v.ko;
    // 2) cedict (영문 뜻) → ko 필드가 없으면 영문을 그대로 노출(원하면 번역 파이프 추가)
    if (cedict && cedict[hanzi] && Array.isArray(cedict[hanzi]) && cedict[hanzi].length) {
      return cedict[hanzi][0]; // 첫 항목
    }
    return "";
  }, [lexIndex, cedict]);

  // 패널 표기용 보강 값
  const panelKo =
    activeWord?.info?.ko ||
    (isHan(activeChar) ? lookupMeaning(activeWord?.zh || activeChar) : "");

  const panelPinyin =
    activeWord?.info?.pinyin ||
    (isHan(activeChar)
      ? (() => {
          // 글자 단위 병음에서 꺼내기
          const tk = charPinyinArr[activeIdx];
          return tk && tk !== activeChar ? tk : "";
        })()
      : "");

  return (
    <Box sx={{ maxWidth: 960, mx: "auto", p: { xs: 2, sm: 3 } }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
        <Button size="small" startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)}>
          뒤로
        </Button>
        <Typography variant="h6">문장 학습</Typography>
        {loading && (
          <Stack direction="row" alignItems="center" spacing={1} sx={{ ml: 1 }}>
            <CircularProgress size={16} />
            <Typography variant="caption" color="text.secondary">불러오는 중…</Typography>
          </Stack>
        )}
        <Box sx={{ flex: 1 }} />

        {/* 상단: 이 예문을 제공한 단어 */}
        {sourceWord?.zh && (
          <Chip
            icon={<LocalLibraryIcon />}
            color="primary"
            variant="outlined"
            label={`예문 단어: ${sourceWord.zh} (${sourceWord.pinyin || "-"}) · ${sourceWord.ko || "-"}`}
            sx={{ mr: 1 }}
            onClick={() => speakSafe(sourceWord.zh, { lang: "zh-CN", rate: 1.0 })}
          />
        )}

        <Button size="small" variant="outlined" startIcon={<ShuffleIcon />} onClick={handleNextRandom}>
          다음 문장
        </Button>
      </Stack>

      <Card elevation={4} sx={{ borderRadius: 3 }}>
        <CardContent>
          {!sentence ? (
            <Stack spacing={1} alignItems="flex-start">
              <Typography variant="body2" color="text.secondary">
                문장을 불러오지 못했습니다. 랜덤으로 다시 시도해보세요.
              </Typography>
              <Button size="small" variant="contained" startIcon={<ShuffleIcon />} onClick={handleNextRandom}>
                랜덤 문장 가져오기
              </Button>
            </Stack>
          ) : (
            <Stack spacing={2}>
              {/* 문장(한자) */}
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Typography variant="h6" sx={{ fontSize: { xs: 18, sm: 20 } }}>
                  {chars.map((ch, idx) => {
                    const isActiveChar = activeIdx === idx;
                    const isInWord =
                      activeWordRange &&
                      idx >= activeWordRange.start &&
                      idx <= activeWordRange.end;

                    const bg = isInWord
                      ? "linear-gradient(180deg,#FFF7ED 0%,#FFE0B2 100%)"
                      : isActiveChar
                        ? "linear-gradient(180deg,#FFFDE7 0%,#FFF59D 100%)"
                        : "transparent";

                    return (
                      <span
                        key={`${ch}-${idx}`}
                        onMouseEnter={() => setHoverIdx(idx)}
                        onMouseLeave={() => setHoverIdx(-1)}
                        onClick={() => onCharClick(idx)}
                        style={{
                          cursor: isHan(ch) ? "pointer" : "default",
                          display: "inline-block",
                          borderRadius: 8,
                          padding: "0 6px",
                          background: bg,
                          transition: "background 0.15s ease",
                        }}
                        aria-label={`${ch} 선택`}
                      >
                        {ch}
                      </span>
                    );
                  })}
                </Typography>

                <IconButton size="small" color="primary" onClick={() => speakSafe(sentence, { lang: "zh-CN", rate: 1.0 })} aria-label="문장 전체 듣기">
                  <VolumeUpIcon fontSize="small" />
                </IconButton>
              </Stack>

              {/* 병음 라인: 토큰 맵 우선, 실패 시 글자 배열 기반 */}
              <Typography variant="body2" color="text.secondary">
                {sentenceMap
                  ? renderPinyinWithHighlight_Token(sentencePinyin, sentenceMap, activeChar || "")
                  : renderPinyinWithHighlight_PerChar(charPinyinArr, activeIdx)}
              </Typography>

              {/* 병음 → 한글독음 (토큰/글자 어느 케이스든 표시 가능) */}
              {sentence && (
                <Typography variant="body2" color="text.secondary">
                  {sentencePinyin
                    ? freeTextPinyinToKorean(sentencePinyin)
                    : freeTextPinyinToKorean(charPinyinArr.join(" "))}
                </Typography>
              )}

              {/* 한국어 번역 */}
              {sentenceKo && <Typography variant="body2" color="text.secondary">{sentenceKo}</Typography>}

              <Divider sx={{ my: 1 }} />

              {/* 정보 패널 (선택된 글자/단어) */}
              <Box
                sx={{
                  p: 2,
                  border: "1px solid rgba(0,0,0,0.06)",
                  borderRadius: 2,
                  background: "rgba(250,250,250,0.8)",
                }}
              >
                <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
                  {/* 선택 표시 */}
                  {(() => {
                    const aw = activeWord;
                    const ac = activeChar;
                    if (aw?.zh) {
                      return (
                        <Chip
                          label={aw.zh}
                          color="primary"
                          variant="filled"
                          sx={{ fontSize: 16 }}
                          onClick={() => speakSafe(aw.zh, { lang: "zh-CN", rate: 1.0 })}
                          icon={<VolumeUpIcon />}
                        />
                      );
                    }
                    if (ac && isHan(ac)) {
                      return (
                        <Chip
                          label={ac}
                          variant="outlined"
                          sx={{ fontSize: 16 }}
                          onClick={() => speakSafe(ac, { lang: "zh-CN", rate: 1.0 })}
                          icon={<VolumeUpIcon />}
                        />
                      );
                    }
                    return null;
                  })()}

                  {/* 뜻/병음 (보강 반영) */}
                  <Stack spacing={0.25}>
                    <Typography variant="body2">
                      {panelKo ? `뜻: ${panelKo}` : "뜻: -"}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {panelPinyin ? `병음: ${panelPinyin}` : "병음: -"}
                    </Typography>
                  </Stack>
                </Stack>
              </Box>
            </Stack>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
