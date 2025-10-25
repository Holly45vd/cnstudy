// src/components/FlashcardCard.jsx
import React from "react";
import { Card, CardActionArea, CardContent, Stack, Typography, Divider, Box } from "@mui/material";

export default function FlashcardCard({ word, flipped, onFlip }) {
  if (!word) return null;

  const koPron =
    word.koPronunciation ||
    (Array.isArray(word.pronunciation) ? word.pronunciation.join(" · ") : "");

  return (
    <Card elevation={4} sx={{ maxWidth: 720, width: "100%", borderRadius: 3 }}>
      <CardActionArea onClick={onFlip}>
        <CardContent>
          {!flipped ? (
            <Stack spacing={1.25} alignItems="center" textAlign="center">
              <Typography variant="h2" component="div" sx={{ fontWeight: 700, lineHeight: 1 }}>
                {word.zh || "—"}
              </Typography>
              <Box>
                {koPron && (
                  <Typography variant="subtitle1" sx={{ opacity: 0.85 }}>
                    {koPron}
                  </Typography>
                )}
                <Typography variant="h6" sx={{ letterSpacing: 0.3 }}>
                  {word.pinyin || ""}
                </Typography>
              </Box>
              <Divider flexItem />
              <Typography variant="h5">{word.ko || ""}</Typography>
              <Typography variant="caption" sx={{ opacity: 0.6 }}>
                클릭(또는 Space)하면 뒷면이 보여요
              </Typography>
            </Stack>
          ) : (
            <Stack spacing={1.25} textAlign="left">
              <Typography variant="overline">예문 (ZH)</Typography>
              <Typography variant="h6">{word.sentence || "—"}</Typography>

              {(word.sentencePinyin || word.sentenceKo) && (
                <>
                  <Divider />
                  {word.sentencePinyin && (
                    <>
                      <Typography variant="overline">Pinyin</Typography>
                      <Typography variant="body1">{word.sentencePinyin}</Typography>
                    </>
                  )}
                  {word.sentenceKo && (
                    <>
                      <Typography variant="overline">Korean</Typography>
                      <Typography variant="body1">{word.sentenceKo}</Typography>
                    </>
                  )}
                </>
              )}

              <Typography variant="caption" sx={{ opacity: 0.6, mt: 1 }}>
                다시 클릭(또는 Space)하면 앞면으로
              </Typography>
            </Stack>
          )}
        </CardContent>
      </CardActionArea>
    </Card>
  );
}
