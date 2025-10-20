import React, { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { getWordsByIds } from "../../../firebase/firestore";
import { Grid, Typography, LinearProgress, Alert, Box } from "@mui/material";
import VocabCardLite from "../../../components/VocabCardLite";
import WordDetailModal from "../../../components/WordDetailModal";
import { mapToEverydayWord } from "../../../lib/wordMapping";

export default function VocabularySection() {
  const { unit } = useOutletContext();

  // ids 메모이즈 (ESLint 경고 방지)
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
  }, [idsKey, ids]); // ids도 포함

  if (loading) return <Box sx={{ my: 1 }}><LinearProgress /></Box>;
  if (err) return <Alert severity="error">에러: {err}</Alert>;
  if (words.length === 0)
    return <Typography variant="body2" color="text.secondary">등록된 단어가 없습니다.</Typography>;

  return (
    <>
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

      <WordDetailModal open={open} onClose={() => setOpen(false)} word={selected} />
    </>
  );
}
