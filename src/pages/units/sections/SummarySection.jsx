import React from "react";
import { useOutletContext } from "react-router-dom";
import {
  Stack,
  Paper,
  Typography,
  Chip,
  Box,
  Divider,
} from "@mui/material";

export default function SummarySection() {
  const { unit } = useOutletContext();
  const vocab = unit?.summary?.vocabulary || [];
  const grammar = unit?.summary?.grammar || [];

  const hasData = vocab.length > 0 || grammar.length > 0;

  if (!hasData) {
    return (
      <Typography variant="body2" color="text.secondary">
        요약 데이터가 없습니다.
      </Typography>
    );
  }

  return (
    <Stack spacing={2}>
      {/* 핵심 어휘 */}
      {vocab.length > 0 && (
        <Box>
          <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
            핵심 어휘
          </Typography>
          <Stack spacing={1}>
            {vocab.map((v, i) => (
              <Paper
                key={i}
                variant="outlined"
                sx={{
                  p: 1.5,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Typography variant="body1">{v}</Typography>
                <Chip label="어휘" size="small" color="primary" variant="outlined" />
              </Paper>
            ))}
          </Stack>
        </Box>
      )}

      <Divider />

      {/* 핵심 문법 */}
      {grammar.length > 0 && (
        <Box>
          <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
            핵심 문법
          </Typography>
          <Stack spacing={1}>
            {grammar.map((g, i) => (
              <Paper
                key={i}
                variant="outlined"
                sx={{
                  p: 1.5,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Typography variant="body1">{g}</Typography>
                <Chip label="문법" size="small" color="secondary" variant="outlined" />
              </Paper>
            ))}
          </Stack>
        </Box>
      )}
    </Stack>
  );
}
