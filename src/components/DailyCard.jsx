import React from "react";
import { speakSafe } from "../lib/ttsHelper";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardActions from "@mui/material/CardActions";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";

export default function DailyCard({ word }) {
  if (!word) return null;
  const { id, zh, pinyin, ko, sentence, sentencePinyin, sentenceKo, sentenceKoPronunciation } = word;

  return (
    <Card variant="outlined" sx={{ height: "100%" }}>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <div>
            <Typography variant="h5">{zh || id}</Typography>
            <Typography variant="body2" color="text.secondary">{pinyin}</Typography>
            <Typography variant="body2">{ko}</Typography>
          </div>
        </Stack>

        {(sentence || sentenceKo) && (
          <Stack spacing={0.5} sx={{ mt: 1 }}>
            {sentence && <Typography variant="subtitle2">{sentence}</Typography>}
            {sentencePinyin && <Typography variant="caption" color="text.secondary">{sentencePinyin}</Typography>}
            {sentenceKo && <Typography variant="body2">{sentenceKo}</Typography>}
          </Stack>
        )}
      </CardContent>

    </Card>
  );
}
