import React, { useEffect, useMemo, useState } from "react";
import {
  collection, collectionGroup, getDocs
} from "firebase/firestore";
import { db } from "../../firebase/config";
import {
  Stack, Typography, CircularProgress, Alert, TextField, Chip, Button, Divider,
  Accordion, AccordionSummary, AccordionDetails, FormControlLabel, Switch, Box
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import SearchIcon from "@mui/icons-material/Search";
import RefreshIcon from "@mui/icons-material/Refresh";
import { freeTextPinyinToKorean } from "../../lib/pinyinKorean";

/**
 * GrammarAll.jsx
 * - 모든 유닛의 문법을 "유닛 그래머"와 유사한 UX로 한 페이지에 나열
 * - 데이터 소스 2가지 모두 지원:
 *   1) units/{id} 문서의 배열필드 grammar: []
 *   2) units/{id}/grammar 서브컬렉션
 */
export default function GrammarAll() {
  const [items, setItems] = useState([]); // [{unitId, title, summary, notes, examples, rule, description}]
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // UI 상태
  const [showPinyin, setShowPinyin] = useState(true);
  const [showPron, setShowPron] = useState(true);
  const [showMeaning, setShowMeaning] = useState(true);
  const [query, setQuery] = useState("");
  const [expandAll, setExpandAll] = useState(false);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        setLoading(true);
        const out = [];

        // 1) units 전체 문서 읽어서 배열필드 grammar 수집
        const unitsSnap = await getDocs(collection(db, "units"));
        for (const u of unitsSnap.docs) {
          const data = u.data() || {};
          const arr = Array.isArray(data.grammar) ? data.grammar : [];
          for (const g of arr) {
            out.push({ unitId: u.id, ...g });
          }
        }

        // 2) (있다면) 모든 유닛의 서브컬렉션 grammar도 합치기
        try {
          const cg = await getDocs(collectionGroup(db, "grammar"));
          cg.docs.forEach((d) => {
            const g = d.data() || {};
            // parent 유닛 id 추출(경로: units/{id}/grammar/{doc})
            const paths = d.ref.path.split("/");
            const unitIdx = paths.findIndex((p) => p === "units");
            const unitId = unitIdx >= 0 ? paths[unitIdx + 1] : "unknown";
            out.push({ unitId, ...g });
          });
        } catch (e) {
          // 인덱스/권한 미설정이어도 전체 동작은 가능해야 하므로 무시
          console.warn("[GrammarAll] collectionGroup skip:", e?.message || e);
        }

        if (!mounted) return;
        // 간단 정렬: unitId 오름차순, 제목/룰 유사값 기준
        out.sort((a, b) => String(a.unitId).localeCompare(String(b.unitId), "ko"));
        setItems(out);
      } catch (e) {
        console.error("[GrammarAll] load error:", e);
        if (mounted) setError("문법 데이터를 불러오지 못했습니다.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => { mounted = false; };
  }, []);

  // 검색 필터
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((g) => {
      const hay = [
        g.title, g.summary, g.rule, g.description,
        ...(Array.isArray(g.notes) ? g.notes : []),
        ...(Array.isArray(g.examples) ? g.examples.flatMap((e) => [e.zh, e.py, e.ko]) : []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [items, query]);

  if (loading) return <Stack alignItems="center" sx={{ py: 4 }}><CircularProgress size={32} /></Stack>;
  if (error) return <Alert severity="error">{error}</Alert>;
  if (!items.length)
    return <Typography variant="body2" color="text.secondary">문법 항목이 없습니다.</Typography>;

  return (
    <Stack spacing={2.5} sx={{ p: { xs: 2, md: 3 } }}>
      {/* 헤더/도구 */}
      <Stack direction="row" alignItems="center" spacing={2} flexWrap="wrap">
        <Typography variant="h6" >📚 전체 문법</Typography>
        <Chip label={`결과: ${filtered.length} 문법 항목`} />
        <Box sx={{ flex: 1 }} />

        <FormControlLabel
          control={<Switch checked={showPinyin} onChange={(e) => setShowPinyin(e.target.checked)} />}
          label="병음 ON"
        />
        <FormControlLabel
          control={<Switch checked={showPron} onChange={(e) => setShowPron(e.target.checked)} />}
          label="발음 ON"
        />
        <FormControlLabel
          control={<Switch checked={showMeaning} onChange={(e) => setShowMeaning(e.target.checked)} />}
          label="뜻 ON"
        />

        <Button
          variant="text"
          startIcon={<RefreshIcon />}
          onClick={() => setExpandAll((v) => !v)}
        >
          {expandAll ? "전체 접기" : "전체 펼침"}
        </Button>
      </Stack>

      {/* 검색 */}
      <TextField
        fullWidth
        size="small"
        placeholder="제목 / 요약 / 주의 / 예문 검색"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        InputProps={{ startAdornment: <SearchIcon sx={{ mr: 1, color: "text.secondary" }} /> }}
      />

      <Divider />

      {/* 리스트 */}
      <Stack spacing={1.25}>
        {filtered.map((g, idx) => {
          const title = g.title || g.rule || "문법";
          const notes = Array.isArray(g.notes) ? g.notes : [];
          const examples = Array.isArray(g.examples) ? g.examples : [];
          const summary = g.summary || g.description || "";

          return (
            <Accordion key={idx} defaultExpanded={expandAll} disableGutters sx={{ borderRadius: 2, overflow: "hidden", bgcolor: "#fff" }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Stack spacing={0.5} sx={{ width: "100%" }}>
                  <Typography>
                    {title}
                    <Typography component="span" sx={{ color: "text.secondary", ml: 1 }}>
                      {` · Unit ${g.unitId}`}
                    </Typography>
                  </Typography>
                  {summary ? (
                    <Typography variant="body2" color="text.secondary">
                      {summary}
                    </Typography>
                  ) : null}
                  {notes.length ? (
                    <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mt: 0.5 }}>
                      {notes.map((n, i) => <Chip key={i} size="small" variant="outlined" label={n} />)}
                    </Stack>
                  ) : null}
                </Stack>
              </AccordionSummary>

              <AccordionDetails>
                <Stack spacing={1.25}>
                  {examples.map((ex, i) => (
                    <Box key={i} sx={{ p: 1.25, border: "1px solid rgba(0,0,0,0.08)", borderRadius: 1.5, bgcolor: "#fafafa" }}>
                      {/* 중국어 문장 */}
                      <Typography >{ex.zh}</Typography>

                      {/* 병음 / 한국식 발음 */}
                      {(showPinyin || showPron) && (ex.py || ex.pronunciation) ? (
                        <Stack direction="row" spacing={2} sx={{ mt: 0.25 }}>
                          {showPinyin && ex.py && (
                            <Typography variant="body2" color="text.secondary">
                              {ex.py}
                            </Typography>
                          )}
                          {showPron && (ex.pronunciation || ex.py) && (
                            <Typography variant="body2" color="text.secondary">
                              {ex.pronunciation || freeTextPinyinToKorean(String(ex.py || ""))}
                            </Typography>
                          )}
                        </Stack>
                      ) : null}

                      {/* 뜻 */}
                      {showMeaning && ex.ko && (
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                          {ex.ko}
                        </Typography>
                      )}
                    </Box>
                  ))}
                </Stack>
              </AccordionDetails>
            </Accordion>
          );
        })}
      </Stack>
    </Stack>
  );
}
