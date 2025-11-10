import React, { useMemo, useState, useCallback } from "react";
// ⚠️ 개별 컴포넌트 경로로 임포트하여 undefined 이슈 방지
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import IconButton from "@mui/material/IconButton";
import Chip from "@mui/material/Chip";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import Button from "@mui/material/Button";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";

import { freeTextPinyinToKorean } from "../lib/pinyinKorean";
import { speakSafe } from "../lib/ttsHelper";

/* ============================== 유틸 ============================== */

// CJK 한자 여부 (문장 내 공백/구두점 제외용)
const isHan = (ch) => /\p{Script=Han}/u.test(ch);

// 특수문자 이스케이프
function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// <mark>로 감싸는 베이스 렌더
function renderMarked(text, targets = [], active = "", strong = false) {
  if (!text || !targets?.length) return text;
  const uniq = Array.from(new Set(targets.filter(Boolean)));
  if (!uniq.length) return text;

  const pattern = new RegExp(`(${uniq.map(escapeRegExp).join("|")})`, "g");
  const parts = String(text).split(pattern);

  return parts.map((part, i) => {
    if (uniq.includes(part)) {
      const isActive = active && part === active;
      return (
        <mark
          key={i}
          style={{
            background: isActive
              ? "linear-gradient(180deg,#FFE082 0%,#FFD54F 100%)"
              : "#FFF59D",
            borderRadius: 6,
            padding: "0 4px",
            boxShadow: isActive ? "inset 0 -2px 0 rgba(0,0,0,0.12)" : "none",
          }}
        >
          {part}
        </mark>
      );
    }
    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
}

// 병음 토큰화(공백 기준)
function tokenizePinyin(p) {
  if (!p) return [];
  return String(p)
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

/**
 * 한자 문자열(zh)과 병음(pinyin)을 1:1 매핑 시도
 * - 규칙: "한자 글자 수(한자만 카운트) === 병음 토큰 수"일 때만 매핑
 * - 반환: [{char, token, hanIndex, tokenIndex}]
 */
function makeHanziPinyinMap(zh, pinyin) {
  if (!zh || !pinyin) return null;

  const chars = Array.from(zh || "");
  // 한자만 매핑 대상으로 분리(구두점/공백 제외)
  const hanPositions = [];
  chars.forEach((ch, i) => {
    if (isHan(ch)) hanPositions.push({ ch, i });
  });

  const tokens = tokenizePinyin(pinyin);

  if (!hanPositions.length || !tokens.length) return null;
  if (hanPositions.length !== tokens.length) return null; // 불일치 시 매핑 포기(안전)

  return hanPositions.map((hp, idx) => ({
    char: hp.ch,
    hanIndex: hp.i,
    token: tokens[idx],
    tokenIndex: idx,
  }));
}

/**
 * 매핑을 이용해 병음 문자열을 렌더
 * - activeChar가 매핑상 특정 token과 연결되면 그 token만 강조
 * - 매핑 불가/실패 시 원문 반환
 */
function renderPinyinWithHighlight(pinyin, map, activeChar) {
  if (!pinyin) return "";
  const tokens = tokenizePinyin(pinyin);
  if (!map || !tokens.length) return pinyin;

  // activeChar에 해당하는 tokenIndex 집합
  const activeTokenIdx = new Set(
    map.filter((m) => activeChar && m.char === activeChar).map((m) => m.tokenIndex)
  );

  // 매핑 길이 불일치 시 안전하게 원문 반환
  const hanCount = map.length;
  if (hanCount !== tokens.length) return pinyin;

  return (
    <>
      {tokens.map((tk, i) => {
        const isActive = activeTokenIdx.has(i);
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

// 문장(병음)도 동일 로직 사용
const renderSentencePinyinWithHighlight = renderPinyinWithHighlight;

/* ========================== 데이터 정규화 훅 ========================== */

function useNormalizedWord(raw) {
  return useMemo(() => {
    const zh = raw?.zh ?? raw?.hanzi ?? raw?.id ?? "";
    const pinyin = raw?.pinyin ?? "";
    const ko = raw?.ko ?? raw?.meaning ?? "";
    const pos = raw?.pos ?? raw?.partOfSpeech ?? "";
    const tags = Array.isArray(raw?.tags) ? raw.tags : [];

    let koPron = "";
    if (Array.isArray(raw?.pronunciation) && raw.pronunciation.length) {
      const exact = raw.pronunciation.find((p) => p?.label === zh && p?.ko);
      koPron = exact?.ko || raw.pronunciation[0]?.ko || "";
    }
    koPron =
      koPron ||
      raw?.koPron ||
      raw?.koPronunciation ||
      raw?.pronunciation_ko ||
      "";

    const sentence = raw?.sentence || "";
    const sentencePinyin = raw?.sentencePinyin || "";
    const sentenceKo = raw?.sentenceKo || "";

    return {
      zh,
      pinyin,
      ko,
      koPron,
      pos,
      tags,
      sentence,
      sentencePinyin,
      sentenceKo,
    };
  }, [raw]);
}

/* ============================ 메인 컴포넌트 ============================ */

function FlashcardCard({ word, flipped, onFlip, onGood, passed }) {
  const {
    zh,
    pinyin,
    ko,
    koPron,
    pos,
    tags,
    sentence,
    sentencePinyin,
    sentenceKo,
  } = useNormalizedWord(word);

  const [hoverChar, setHoverChar] = useState("");
  const [lockedChar, setLockedChar] = useState("");

  // 한자↔병음 매핑 (앞면 단어용, 뒷면 문장용 각각)
  const wordMap = useMemo(() => makeHanziPinyinMap(zh, pinyin), [zh, pinyin]);
  const sentenceMap = useMemo(
    () => makeHanziPinyinMap(sentence, sentencePinyin),
    [sentence, sentencePinyin]
  );

  const displayKoPron = useMemo(() => {
    if (koPron && String(koPron).trim()) return koPron;
    if (pinyin && String(pinyin).trim()) {
      try {
        return freeTextPinyinToKorean(String(pinyin));
      } catch {}
    }
    return "";
  }, [koPron, pinyin]);

  const playChinese = async (text) => {
    if (!text?.trim()) return;
    await speakSafe(text, { lang: "zh-CN", rate: 1.0 });
  };

  const onCharClick = useCallback(
    async (ch, e) => {
      e.stopPropagation();
      setLockedChar((prev) => (prev === ch ? "" : ch));
      await playChinese(ch);
    },
    [playChinese]
  );

  const activeChar = lockedChar || hoverChar;

  const faceStyles = !flipped
    ? { bg: "transparent", border: "1px solid rgba(0,0,0,0.08)" }
    : {
        bg: "linear-gradient(180deg, #FFF7ED 0%, #FFEAD5 100%)",
        border: "1px solid #F6CDA0",
      };

  return (
    <Card
      onClick={onFlip}
      elevation={4}
      sx={{
        position: "relative",
        borderRadius: 4,
        p: { xs: 1.5, sm: 2 },
        mb: 2,
        cursor: "pointer",
        userSelect: "none",
        transition: "transform 0.2s ease, box-shadow 0.2s ease",
        "&:hover": { transform: "translateY(-2px)", boxShadow: 8 },
        minHeight: 360,
        display: "flex",
        alignItems: "stretch",
        justifyContent: "center",
        textAlign: "center",
        background: faceStyles.bg,
        border: faceStyles.border,
      }}
    >
      {/* Passed sticker */}
      {passed && (
        <Box
          onClick={(e) => e.stopPropagation()}
          sx={{
            position: "absolute",
            right: 16,
            top: 14,
            transform: "rotate(-10deg)",
            px: 1.25,
            py: 0.5,
            borderRadius: 1.1,
            fontSize: 12,
            letterSpacing: 1,
            bgcolor: "primary.main",
            color: "primary.contrastText",
            boxShadow: 3,
          }}
        >
          통과됨 ✓
        </Box>
      )}

      {/* Front */}
      {!flipped ? (
        <CardContent
          sx={{ width: "100%", display: "flex", flexDirection: "column" }}
        >
          <Stack spacing={1.25} alignItems="center" sx={{ flex: 1 }}>
            {/* 한자(문자 단위 인터랙션) */}
            <Stack direction="row" alignItems="center" spacing={1}>
              <Typography
                sx={{
                  letterSpacing: 0.5,
                  lineHeight: 1.05,
                  fontSize: { xs: 52, sm: 68, md: 76 },
                }}
              >
                {Array.from(zh || "").map((ch, idx) => (
                  <span
                    key={`${ch}-${idx}`}
                    onMouseEnter={(e) => {
                      e.stopPropagation();
                      setHoverChar(ch);
                    }}
                    onMouseLeave={(e) => {
                      e.stopPropagation();
                      setHoverChar("");
                    }}
                    onClick={(e) => onCharClick(ch, e)}
                    style={{
                      cursor: "pointer",
                      display: "inline-block",
                      borderRadius: 8,
                      padding: "0 6px",
                      background:
                        (lockedChar === ch || hoverChar === ch)
                          ? "linear-gradient(180deg,#FFF7ED 0%,#FFE0B2 100%)"
                          : "transparent",
                      transition: "background 0.15s ease",
                    }}
                    aria-label={`${ch} 하이라이트`}
                  >
                    {ch}
                  </span>
                ))}
              </Typography>

              <IconButton
                size="large"
                color="primary"
                onClick={(e) => {
                  e.stopPropagation();
                  playChinese(zh);
                }}
                aria-label="중국어(한자) 발음 듣기"
              >
                <VolumeUpIcon fontSize="inherit" />
              </IconButton>
            </Stack>

            {/* 병음 + (한글독음) : 매핑되면 병음 토큰 하이라이트 */}
            <Typography
              sx={{ color: "text.secondary", fontSize: { xs: 14, sm: 15 }, mt: 0.5 }}
            >
              {pinyin
                ? renderPinyinWithHighlight(pinyin, wordMap, activeChar)
                : ""}
              {displayKoPron ? `  ${displayKoPron}` : ""}
            </Typography>

            {(pos || (tags && tags.length)) && (
              <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                {pos && <Chip size="small" label={pos} />}
                {tags?.slice(0, 4).map((t) => (
                  <Chip key={t} size="small" variant="outlined" label={t} />
                ))}
              </Stack>
            )}
          </Stack>

          <Stack direction="row" spacing={1} justifyContent="center" sx={{ mt: 2 }}>
            <Button
              variant={passed ? "contained" : "outlined"}
              color="primary"
              onClick={(e) => {
                e.stopPropagation();
                onGood?.();
              }}
              startIcon={passed ? <span>✓</span> : null}
            >
              {passed ? "통과됨" : "Good(통과)"}
            </Button>
          </Stack>
        </CardContent>
      ) : (
        // Back
        <CardContent
          sx={{ width: "100%", display: "flex", flexDirection: "column" }}
        >
          <Stack spacing={1.25} alignItems="center" sx={{ flex: 1 }}>
            <Typography sx={{ lineHeight: 1.15, fontSize: { xs: 28, sm: 32, md: 36 } }}>
              {ko}
            </Typography>

            {(sentence || sentencePinyin || sentenceKo) && (
              <Box
                onClick={(e) => e.stopPropagation()}
                sx={{
                  width: "100%",
                  maxWidth: 720,
                  bgcolor: "rgba(255,255,255,0.72)",
                  p: 2,
                  borderRadius: 2,
                  textAlign: "left",
                  border: "1px solid rgba(0,0,0,0.05)",
                }}
              >
                {/* 문장(한자): 선택된 문자만 하이라이트 */}
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <Typography variant="body1">
                    {activeChar
                      ? renderMarked(sentence || "예문 없음", [activeChar], activeChar)
                      : (sentence || "예문 없음")}
                  </Typography>
                  {sentence && (
                    <IconButton
                      size="small"
                      color="primary"
                      onClick={() => playChinese(sentence)}
                      aria-label="예문(중국어) 듣기"
                    >
                      <VolumeUpIcon fontSize="small" />
                    </IconButton>
                  )}
                </Stack>

                {(sentencePinyin || sentenceKo) && <Divider sx={{ my: 1 }} />}

                {/* 문장 병음: 매핑되면 해당 토큰만 하이라이트 */}
                {sentencePinyin && (
                  <Typography variant="body2" color="text.secondary">
                    {renderSentencePinyinWithHighlight(
                      sentencePinyin,
                      sentenceMap,
                      activeChar
                    )}
                  </Typography>
                )}

                {/* 문장 병음 → 한글 독음(참고용, 하이라이트는 미적용) */}
                {sentencePinyin && (
                  <Typography variant="body2" color="text.secondary">
                    {freeTextPinyinToKorean(sentencePinyin)}
                  </Typography>
                )}

                {sentenceKo && (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mt: 0.5 }}
                  >
                    {sentenceKo}
                  </Typography>
                )}
              </Box>
            )}
          </Stack>

          <Stack direction="row" spacing={1} justifyContent="center" sx={{ mt: 2 }}>
            <Button
              variant={passed ? "contained" : "outlined"}
              color="primary"
              onClick={(e) => {
                e.stopPropagation();
                onGood?.();
              }}
              startIcon={passed ? <span>✓</span> : null}
            >
              {passed ? "통과됨" : "Good(통과)"}
            </Button>
          </Stack>
        </CardContent>
      )}
    </Card>
  );
}

// ✅ default + named 동시 제공
export default FlashcardCard;
export { FlashcardCard };
