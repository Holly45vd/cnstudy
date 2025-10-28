import React, { useMemo } from "react";
import {
  Card, CardContent, Typography, Stack, IconButton, Chip, Box, Divider, Button
} from "@mui/material";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import TranslateIcon from "@mui/icons-material/Translate";

import { freeTextPinyinToKorean } from "../lib/pinyinKorean";
import { speakSafe } from "../lib/ttsHelper";

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
    koPron = koPron || raw?.koPron || raw?.koPronunciation || raw?.pronunciation_ko || "";

    const sentence = raw?.sentence || "";
    const sentencePinyin = raw?.sentencePinyin || "";
    const sentenceKo = raw?.sentenceKo || "";

    return { zh, pinyin, ko, koPron, pos, tags, sentence, sentencePinyin, sentenceKo };
  }, [raw]);
}

export default function FlashcardCard({ word, flipped, onFlip, onGood, passed }) {
  const { zh, pinyin, ko, koPron, pos, tags, sentence, sentencePinyin, sentenceKo } =
    useNormalizedWord(word);

  const displayKoPron = useMemo(() => {
    if (koPron && String(koPron).trim()) return koPron;
    if (pinyin && String(pinyin).trim()) {
      try { return freeTextPinyinToKorean(String(pinyin)); } catch {}
    }
    return "";
  }, [koPron, pinyin]);

  const playChinese = async (text) => {
    if (!text?.trim()) return;
    await speakSafe(text, { lang: "zh-CN", rate: 1.0 });
  };
  const playPinyin = async (py) => {
    if (!py?.trim()) return;
    const kor = freeTextPinyinToKorean(py);
    if (!kor) return;
    await speakSafe(kor, { lang: "ko-KR", rate: 1.0 });
  };

  // 앞/뒤 스타일: 앞면은 기본 배경(파란 그라데이션 제거), 뒷면만 약간 톤
  const faceStyles = !flipped
    ? { bg: "transparent", border: "1px solid rgba(0,0,0,0.08)" } // 앞면: 기본
    : { bg: "linear-gradient(180deg, #FFF3E7 0%, #FFE6CF 100%)", border: "1px solid #F6CDA0" }; // 뒷면만 컬러

  return (
    <Card
      onClick={onFlip}
      elevation={4}
      sx={{
        position: "relative",
        borderRadius: 4,
        p: 2,
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
      {/* 통과 스티커 */}
      {passed && (
        <Box
          onClick={(e) => e.stopPropagation()}
          sx={{
            position: "absolute",
            right: 16,
            transform: "rotate(-12deg)",
            px: 1.25,
            py: 0.5,
            borderRadius: 1.1,
            
            fontSize: 12,
            letterSpacing: 1,
            bgcolor: "#1976d2",
            color: "white",
            boxShadow: "0 4px 12px rgba(25,118,210,0.35)",
          }}
        >
          통과됨 ✓
        </Box>
      )}

      {/* 앞면 */}
      {!flipped ? (
        <CardContent sx={{ width: "100%", display: "flex", flexDirection: "column" }}>
          <Stack spacing={1.25} alignItems="center" sx={{ flex: 1 }}>
            <Stack direction="row" alignItems="center" spacing={1}>
              {/* 한자 */}
              <Typography
                sx={{  letterSpacing: 0.5, lineHeight: 1.05, fontSize: { xs: 48, sm: 64, md: 72 } }}
              >
                {zh}
              </Typography>
              <IconButton
                size="large"
                color="primary"
                onClick={(e) => { e.stopPropagation(); playChinese(zh); }}
                aria-label="중국어(한자) 발음 듣기"
              >
                <VolumeUpIcon fontSize="inherit" />
              </IconButton>
            </Stack>

            {/* 병음 + 한글발음 */}
            <Typography sx={{ color: "text.secondary", fontSize: { xs: 14, sm: 15 }, mt: 0.5 }}>
              {pinyin}{displayKoPron ? `  ${displayKoPron}` : ""}
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

          {/* 통과 버튼 */}
          <Stack direction="row" spacing={1} justifyContent="center" sx={{ mt: 2 }}>
            <Button
              variant={passed ? "contained" : "outlined"}
              color="primary"
              onClick={(e) => { e.stopPropagation(); onGood?.(); }}
              startIcon={passed ? <span>✓</span> : null}
            >
              {passed ? "통과됨" : "Good(통과)"}
            </Button>
          </Stack>
        </CardContent>
      ) : (
        /* 뒷면 */
        <CardContent sx={{ width: "100%", display: "flex", flexDirection: "column" }}>
          <Stack spacing={1.25} alignItems="center" sx={{ flex: 1 }}>
            {/* 뜻 크게 */}
            <Typography
              sx={{  lineHeight: 1.15, fontSize: { xs: 28, sm: 32, md: 36 } }}
            >
              {ko}
            </Typography>

            {/* 예문 */}
            {(sentence || sentencePinyin || sentenceKo) && (
              <Box
                sx={{
                  width: "100%",
                  maxWidth: 680,
                  bgcolor: "rgba(255,255,255,0.72)",
                  p: 2,
                  borderRadius: 2,
                  textAlign: "left",
                  border: "1px solid rgba(0,0,0,0.05)"
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <Typography variant="body1" sx={{ }}>
                    {sentence || "예문 없음"}
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

                {/* ✅ 병음 + 한국어 발음 표시 */}
                {sentencePinyin && (
                  <Stack direction="column" spacing={0.5} alignItems="flex-start">
                    <Typography variant="body2" color="text.secondary">
                      {sentencePinyin}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {freeTextPinyinToKorean(sentencePinyin)}
                    </Typography>
                  </Stack>
                )}

                {/* 예문 해석 */}
                {sentenceKo && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    {sentenceKo}
                  </Typography>
                )}
              </Box>
            )}
          </Stack>

          {/* 통과 버튼 */}
          <Stack direction="row" spacing={1} justifyContent="center" sx={{ mt: 2 }}>
            <Button
              variant={passed ? "contained" : "outlined"}
              color="primary"
              onClick={(e) => { e.stopPropagation(); onGood?.(); }}
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
