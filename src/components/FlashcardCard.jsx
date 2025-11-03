import React, { useMemo } from "react";
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

function FlashcardCard({ word, flipped, onFlip, onGood, passed }) {
  const { zh, pinyin, ko, koPron, pos, tags, sentence, sentencePinyin, sentenceKo } = useNormalizedWord(word);

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

  const faceStyles = !flipped
    ? { bg: "transparent", border: "1px solid rgba(0,0,0,0.08)" }
    : { bg: "linear-gradient(180deg, #FFF7ED 0%, #FFEAD5 100%)", border: "1px solid #F6CDA0" };

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
        <CardContent sx={{ width: "100%", display: "flex", flexDirection: "column" }}>
          <Stack spacing={1.25} alignItems="center" sx={{ flex: 1 }}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Typography sx={{ letterSpacing: 0.5, lineHeight: 1.05, fontSize: { xs: 52, sm: 68, md: 76 } }}>
                {zh}
              </Typography>
              <IconButton size="large" color="primary" onClick={(e) => { e.stopPropagation(); playChinese(zh); }} aria-label="중국어(한자) 발음 듣기">
                <VolumeUpIcon fontSize="inherit" />
              </IconButton>
            </Stack>

            <Typography sx={{ color: "text.secondary", fontSize: { xs: 14, sm: 15 }, mt: 0.5 }}>
              {pinyin}{displayKoPron ? `  ${displayKoPron}` : ""}
            </Typography>

            {(pos || (tags && tags.length)) && (
              <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                {pos && <Chip size="small" label={pos} />}
                {tags?.slice(0, 4).map((t) => (<Chip key={t} size="small" variant="outlined" label={t} />))}
              </Stack>
            )}
          </Stack>

          <Stack direction="row" spacing={1} justifyContent="center" sx={{ mt: 2 }}>
            <Button variant={passed ? "contained" : "outlined"} color="primary" onClick={(e) => { e.stopPropagation(); onGood?.(); }} startIcon={passed ? <span>✓</span> : null}>
              {passed ? "통과됨" : "Good(통과)"}
            </Button>
          </Stack>
        </CardContent>
      ) : (
        // Back
        <CardContent sx={{ width: "100%", display: "flex", flexDirection: "column" }}>
          <Stack spacing={1.25} alignItems="center" sx={{ flex: 1 }}>
            <Typography sx={{ lineHeight: 1.15, fontSize: { xs: 28, sm: 32, md: 36 } }}>{ko}</Typography>

            {(sentence || sentencePinyin || sentenceKo) && (
              <Box onClick={(e) => e.stopPropagation()} sx={{ width: "100%", maxWidth: 720, bgcolor: "rgba(255,255,255,0.72)", p: 2, borderRadius: 2, textAlign: "left", border: "1px solid rgba(0,0,0,0.05)" }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <Typography variant="body1">{sentence || "예문 없음"}</Typography>
                  {sentence && (
                    <IconButton size="small" color="primary" onClick={() => playChinese(sentence)} aria-label="예문(중국어) 듣기">
                      <VolumeUpIcon fontSize="small" />
                    </IconButton>
                  )}
                </Stack>
                {(sentencePinyin || sentenceKo) && <Divider sx={{ my: 1 }} />}
                {sentencePinyin && (
                  <Stack spacing={0.5} alignItems="flex-start">
                    <Typography variant="body2" color="text.secondary">{sentencePinyin}</Typography>
                    <Typography variant="body2" color="text.secondary">{freeTextPinyinToKorean(sentencePinyin)}</Typography>
                  </Stack>
                )}
                {sentenceKo && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{sentenceKo}</Typography>
                )}
              </Box>
            )}
          </Stack>

          <Stack direction="row" spacing={1} justifyContent="center" sx={{ mt: 2 }}>
            <Button variant={passed ? "contained" : "outlined"} color="primary" onClick={(e) => { e.stopPropagation(); onGood?.(); }} startIcon={passed ? <span>✓</span> : null}>
              {passed ? "통과됨" : "Good(통과)"}
            </Button>
          </Stack>
        </CardContent>
      )}
    </Card>
  );
}

// ✅ default + named 동시 제공(바렐/개별 임포트 혼용 대비)
export default FlashcardCard;
export { FlashcardCard };