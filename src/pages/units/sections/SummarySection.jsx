import React from "react";
import { useOutletContext } from "react-router-dom";
import {
  Stack,
  Paper,
  Typography,
  Chip,
  Box,
  Divider,
  Tooltip,
} from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";

export default function SummarySection() {
  const { unit } = useOutletContext();
  const vocab = unit?.summary?.vocabulary || [];
  const grammar = unit?.summary?.grammar || [];

  const hasData = vocab.length > 0 || grammar.length > 0;

  // 복사 기능
  const handleCopy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (e) {
      console.error("복사 실패:", e);
    }
  };

  if (!hasData) {
    return (
      <Typography variant="body2" color="text.secondary">
        요약 데이터가 없습니다.
      </Typography>
    );
  }

  // 텍스트가 "제목: 내용" 형식일 경우 분리
  const parseText = (str = "") => {
    const [title, ...rest] = str.split(":");
    return {
      title: title.trim(),
      content: rest.join(":").trim(),
    };
  };

  return (
    <Stack spacing={3}>
      {/* 핵심 어휘 */}
      {vocab.length > 0 && (
        <Box>
          <Typography variant="h6" sx={{ mb: 1 }}>
            📘 핵심 어휘
          </Typography>
          <Stack spacing={1}>
            {vocab.map((v, i) => {
              const { title, content } = parseText(v);
              return (
                <Paper
                  key={i}
                  variant="outlined"
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                  }}
                >
                  <Box>
                    <Typography variant="body1" >
                      {title}
                    </Typography>
                    {content && (
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ mt: 0.5 }}
                      >
                        {content}
                      </Typography>
                    )}
                  </Box>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Chip label="어휘" size="small" color="primary" variant="outlined" />
                    <Tooltip title="복사">
                      <ContentCopyIcon
                        fontSize="small"
                        sx={{ cursor: "pointer", opacity: 0.6 }}
                        onClick={() => handleCopy(v)}
                      />
                    </Tooltip>
                  </Stack>
                </Paper>
              );
            })}
          </Stack>
        </Box>
      )}

      <Divider />

      {/* 핵심 문법 */}
      {grammar.length > 0 && (
        <Box>
          <Typography variant="h6" sx={{ mb: 1 }}>
            📙 핵심 문법
          </Typography>
          <Stack spacing={1}>
            {grammar.map((g, i) => {
              const { title, content } = parseText(g);
              return (
                <Paper
                  key={i}
                  variant="outlined"
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                  }}
                >
                  <Box>
                    <Typography variant="body1" >
                      {title}
                    </Typography>
                    {content && (
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ mt: 0.5 }}
                      >
                        {content}
                      </Typography>
                    )}
                  </Box>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Chip label="문법" size="small" color="secondary" variant="outlined" />
                    <Tooltip title="복사">
                      <ContentCopyIcon
                        fontSize="small"
                        sx={{ cursor: "pointer", opacity: 0.6 }}
                        onClick={() => handleCopy(g)}
                      />
                    </Tooltip>
                  </Stack>
                </Paper>
              );
            })}
          </Stack>
        </Box>
      )}
    </Stack>
  );
}
