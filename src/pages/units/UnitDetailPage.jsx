import React, { useEffect, useState } from "react";
import { Outlet, useParams } from "react-router-dom";
import { getUnit } from "../../firebase/firestore";
import UnitTabs from "./UnitTabs";

/* MUI */
import {
  Container,
  Paper,
  Typography,
  CircularProgress,
  Alert,
  Stack,
  Divider,
  Chip,
} from "@mui/material";
import BookIcon from "@mui/icons-material/Book";

export default function UnitDetailPage() {
  const { id } = useParams();
  const [unit, setUnit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const u = await getUnit(id);
        if (!alive) return;
        setUnit(u);
      } catch (e) {
        if (!alive) return;
        setErr(e.message || String(e));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [id]);

  if (loading)
    return (
      <Stack alignItems="center" sx={{ py: 6 }}>
        <CircularProgress />
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          유닛 로드 중…
        </Typography>
      </Stack>
    );

  if (err)
    return (
      <Alert severity="error" sx={{ borderRadius: 2 }}>
        에러: {err}
      </Alert>
    );

  if (!unit)
    return (
      <Alert severity="info" sx={{ borderRadius: 2 }}>
        유닛을 찾을 수 없습니다.
      </Alert>
    );

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      {/* ===== 상단 유닛 정보 카드 ===== */}
      <Paper
        elevation={0}
        variant="outlined"
        sx={{
          p: 3,
          mb: 3,
          borderRadius: 3,
          bgcolor: "background.paper",
        }}
      >
        <Stack spacing={1.5}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <BookIcon color="primary" />
            <Typography variant="h5" fontWeight={800}>
              {unit.title || `유닛 ${unit.id}`}
            </Typography>
            <Chip
              label={`ID: ${unit.id}`}
              size="small"
              color="default"
              variant="outlined"
              sx={{ ml: 1 }}
            />
          </Stack>

          {unit.theme && (
            <Typography variant="subtitle1" color="text.secondary">
              {unit.theme}
            </Typography>
          )}

          <Divider sx={{ my: 1 }} />

          <Typography variant="body2" color="text.secondary">
            이 단원에서는 <strong>단어, 문법, 회화, 연습, 교체연습</strong> 등 다양한 학습 콘텐츠를 제공합니다.
          </Typography>
        </Stack>
      </Paper>

      {/* ===== 탭 내비게이션 ===== */}
      <UnitTabs />

      {/* ===== 하위 섹션 렌더링 ===== */}
      <Outlet context={{ unit }} />
    </Container>
  );
}
