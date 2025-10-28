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
  ListItemText,
  Divider,
} from "@mui/material";
import ViewModuleIcon from "@mui/icons-material/ViewModule";
import ViewListIcon from "@mui/icons-material/ViewList";
import VocabCardLite from "../../../components/VocabCardLite";
import WordDetailModal from "../../../components/WordDetailModal";
import { mapToEverydayWord } from "../../../lib/wordMapping";

export default function VocabularySection() {
  const { unit } = useOutletContext();

  // ids 메모이즈
  const ids = useMemo(
    () => (Array.isArray(unit?.vocabIds) ? unit.vocabIds : []),
    [unit]
  );
  const idsKey = useMemo(() => ids.join("|"), [ids]);

  const [words, setWords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  // 상세 모달
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(null);

  // 보기 모드: "card" | "list"
  const [viewMode, setViewMode] = useState("card");

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

  if (loading) return <Box sx={{ my: 1 }}><LinearProgress /></Box>;
  if (err) return <Alert severity="error">에러: {err}</Alert>;
  if (words.length === 0)
    return (
      <Typography variant="body2" color="text.secondary">
        등록된 단어가 없습니다.
      </Typography>
    );

  return (
    <>
      {/* 보기 전환 버튼 */}
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="flex-end"
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
      </Stack>

      {/* 카드형 보기 */}
      {viewMode === "card" && (
        <Grid container spacing={2}>
          {words.map((w) => (
            <Grid item xs={12} sm={6} md={4} key={w.id}>
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
            <React.Fragment key={w.id}>
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
                    py: 1.5,
                  }}
                >
                  <Stack direction="row" spacing={1} alignItems="baseline">
                    <Typography variant="h6" >
                      {w.zh}
                    </Typography>
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
