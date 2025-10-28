import React, { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { getWordsByIds } from "../../../firebase/firestore";
import {
  Grid,
  Typography,
  LinearProgress,
  Alert,
  Box,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  List,
  ListItem,
  ListItemButton,
  Divider,
  TextField,
  Button,
  Paper,
} from "@mui/material";
import ViewModuleIcon from "@mui/icons-material/ViewModule";
import ViewListIcon from "@mui/icons-material/ViewList";
import UploadIcon from "@mui/icons-material/Upload";
import DownloadIcon from "@mui/icons-material/Download";
import AddIcon from "@mui/icons-material/Add";
import VocabCardLite from "../../../components/VocabCardLite";
import WordDetailModal from "../../../components/WordDetailModal";
import { mapToEverydayWord } from "../../../lib/wordMapping";

export default function VocabularySection() {
  const { unit } = useOutletContext();

  const ids = useMemo(
    () => (Array.isArray(unit?.vocabIds) ? unit.vocabIds : []),
    [unit]
  );
  const idsKey = useMemo(() => ids.join("|"), [ids]);

  const [words, setWords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [viewMode, setViewMode] = useState("card");

  // JSON 입력 영역 상태
  const [jsonInput, setJsonInput] = useState("");
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        if (ids.length === 0) {
          if (alive) {
            setWords([]);
            setLoading(false);
          }
          return;
        }
        const ws = await getWordsByIds(ids);
        const map = new Map(ws.map((w) => [w.id, w]));
        const ordered = ids.map((id) => map.get(id)).filter(Boolean);
        if (!alive) return;
        setWords(ordered);
      } catch (e) {
        if (!alive) return;
        setErr(e.message || String(e));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [idsKey, ids]);

  const handleImportJSON = () => {
    try {
      const parsed = JSON.parse(jsonInput);
      if (!Array.isArray(parsed)) throw new Error("JSON은 배열 형태여야 합니다.");
      setWords(parsed);
      alert("JSON 데이터를 불러왔습니다 (임시 적용).");
    } catch (e) {
      alert("JSON 파싱 오류: " + e.message);
    }
  };

  const handleExportJSON = () => {
    const blob = new Blob([JSON.stringify(words, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vocabulary_unit${unit?.id || ""}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <Box sx={{ my: 1 }}><LinearProgress /></Box>;
  if (err) return <Alert severity="error">에러: {err}</Alert>;
  if (words.length === 0 && !editMode)
    return (
      <Typography variant="body2" color="text.secondary">
        등록된 단어가 없습니다.
      </Typography>
    );

  return (
    <>
      {/* 보기 전환 + JSON 관리 버튼 */}
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1.5}
        alignItems="center"
        justifyContent="space-between"
        sx={{ mb: 2 }}
      >
        <ToggleButtonGroup
          value={viewMode}
          exclusive
          onChange={(e, v) => v && setViewMode(v)}
          size="small"
        >
          <ToggleButton value="card" aria-label="card view">
            <ViewModuleIcon fontSize="small" />
          </ToggleButton>
          <ToggleButton value="list" aria-label="list view">
            <ViewListIcon fontSize="small" />
          </ToggleButton>
        </ToggleButtonGroup>

        <Stack direction="row" spacing={1}>
          <Button
            startIcon={<UploadIcon />}
            size="small"
            variant="outlined"
            onClick={handleImportJSON}
          >
            JSON 불러오기
          </Button>
          <Button
            startIcon={<DownloadIcon />}
            size="small"
            variant="outlined"
            onClick={handleExportJSON}
          >
            JSON 내보내기
          </Button>
          <Button
            startIcon={<AddIcon />}
            size="small"
            variant={editMode ? "contained" : "outlined"}
            onClick={() => setEditMode((v) => !v)}
          >
            {editMode ? "입력 닫기" : "JSON 추가"}
          </Button>
        </Stack>
      </Stack>

      {/* JSON 입력 영역 */}
      {editMode && (
        <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>
            단어 JSON 입력 (배열 형식)
          </Typography>
          <TextField
            multiline
            minRows={5}
            fullWidth
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
            placeholder={`예시:\n[\n  {"zh": "漂亮", "pinyin": "piàoliang", "ko": "예쁘다"},\n  {"zh": "饿", "pinyin": "è", "ko": "배고프다"}\n]`}
          />
        </Paper>
      )}

      {/* 카드형 보기 */}
      {viewMode === "card" && (
        <Grid container spacing={2}>
          {words.map((w) => (
            <Grid item xs={12} sm={6} md={4} key={w.id || w.zh}>
              <VocabCardLite
                word={w}
                onClick={(v) => {
                  setSelected(mapToEverydayWord(v || w));
                  setOpen(true);
                }}
              />
            </Grid>
          ))}
        </Grid>
      )}

      {/* 리스트형 보기 */}
      {viewMode === "list" && (
        <List disablePadding>
          {words.map((w, i) => (
            <React.Fragment key={w.id || w.zh}>
              <ListItem disablePadding>
                <ListItemButton
                  onClick={() => {
                    setSelected(mapToEverydayWord(w));
                    setOpen(true);
                  }}
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-start",
                    py: 1.2,
                  }}
                >
                  <Stack direction="row" spacing={1} alignItems="baseline">
                    <Typography variant="h6">{w.zh}</Typography>
                    {w.pinyin && (
                      <Typography variant="body2" color="text.secondary">
                        {w.pinyin}
                      </Typography>
                    )}
                  </Stack>
                  {w.ko && (
                    <Typography
                      variant="body2"
                      sx={{ mt: 0.25 }}
                      color="text.primary"
                    >
                      {w.ko}
                    </Typography>
                  )}
                </ListItemButton>
              </ListItem>
              {i < words.length - 1 && <Divider component="li" />}
            </React.Fragment>
          ))}
        </List>
      )}

      <WordDetailModal open={open} onClose={() => setOpen(false)} word={selected} />
    </>
  );
}
