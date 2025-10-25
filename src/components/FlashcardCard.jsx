import React, { useMemo } from "react";
import {
  Card, CardContent, Typography, Stack, IconButton, Chip, Box, Divider, Button
} from "@mui/material";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import TranslateIcon from "@mui/icons-material/Translate";

// ⬇️ 추가
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

export default function FlashcardCard({ word, flipped, onFlip }) {
  const { zh, pinyin, ko, koPron, pos, tags, sentence, sentencePinyin, sentenceKo } =
    useNormalizedWord(word);

  // ⬇️ 추가: 재생 핸들러
  const playChinese = async (text) => {
    if (!text?.trim()) return;
    await speakSafe(text, { lang: "zh-CN", rate: 1.0 });
  };

  const playPinyin = async (py) => {
    if (!py?.trim()) return;
    const kor = freeTextPinyinToKorean(py);      // 띄어쓰기/구두점 유지한 한국어 표기로 변환
    if (!kor) return;
    await speakSafe(kor, { lang: "ko-KR", rate: 1.0 });
  };

  return (
    <Card
      onClick={onFlip}
      elevation={3}
      sx={{
        borderRadius: 3,
        p: 2,
        mb: 2,
        cursor: "pointer",
        userSelect: "none",
        transition: "transform 0.2s ease, box-shadow 0.2s ease",
        "&:hover": { transform: "translateY(-2px)", boxShadow: 6 },
        minHeight: 280,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
      }}
    >
      {!flipped ? (
        <CardContent sx={{ width: "100%" }}>
          <Stack spacing={1.25} alignItems="center">
            <Stack direction="row" alignItems="center" spacing={1}>
              <Typography variant="h3" sx={{ fontWeight: 900, letterSpacing: 1 }}>
                {zh}
              </Typography>
              {/* 중국어(한자) 재생 */}
              <IconButton
                size="large"
                color="primary"
                onClick={(e) => { e.stopPropagation(); playChinese(zh); }}
                aria-label="중국어(한자) 발음 듣기"
              >
                <VolumeUpIcon fontSize="inherit" />
              </IconButton>
            </Stack>

            <Typography variant="h6" color="text.secondary">
              {pinyin}{koPron ? `  ${koPron}` : ""}
            </Typography>

            {/* 병음(TTS: 한국어 음성으로 변환된 표기 읽기) */}
            <Button
              size="small"
              variant="outlined"
              startIcon={<TranslateIcon />}
              onClick={(e) => { e.stopPropagation(); playPinyin(pinyin); }}
              disabled={!pinyin}
              aria-label="병음 읽기(한글표기로 TTS)"
            >
              병음 ▶
            </Button>

            {(pos || (tags && tags.length)) && (
              <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                {pos && <Chip size="small" label={pos} />}
                {tags?.slice(0, 4).map((t) => (
                  <Chip key={t} size="small" variant="outlined" label={t} />
                ))}
              </Stack>
            )}

            <Typography variant="body2" sx={{ mt: 1 }}>
              (카드 클릭: 뜻 보기)
            </Typography>
          </Stack>
        </CardContent>
      ) : (
        <CardContent sx={{ width: "100%" }}>
          <Stack spacing={1.25} alignItems="center">
            <Typography variant="h5" sx={{ fontWeight: 800 }}>
              {ko}
            </Typography>

            {(sentence || sentencePinyin || sentenceKo) && (
              <Box
                sx={{
                  width: "100%",
                  maxWidth: 680,
                  bgcolor: "#f9fafb",
                  p: 2,
                  borderRadius: 2,
                  textAlign: "left",
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <Typography variant="body1" sx={{ fontWeight: 700 }}>
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

                {sentencePinyin && (
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="body2" color="text.secondary">
                      {sentencePinyin}
                    </Typography>
                    <Button
                      size="small"
                      variant="text"
                      startIcon={<TranslateIcon />}
                      onClick={() => playPinyin(sentencePinyin)}
                    >
                      병음 ▶
                    </Button>
                  </Stack>
                )}

                {sentenceKo && (
                  <Typography variant="body2" color="text.secondary">
                    {sentenceKo}
                  </Typography>
                )}
              </Box>
            )}

            <Typography variant="body2" color="text.secondary">
              (카드 클릭: 앞면으로)
            </Typography>
          </Stack>
        </CardContent>
      )}
    </Card>
  );
}
