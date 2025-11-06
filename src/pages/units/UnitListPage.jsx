// src/pages/units/UnitListPage.jsx
import React, { useEffect, useState } from "react";
import { listUnits } from "../../firebase/firestore";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import {
  Container, Grid, Card, CardActionArea, CardContent, Typography,
  Skeleton, Alert, Stack, Button, Box
} from "@mui/material";
import LibraryBooksIcon from "@mui/icons-material/LibraryBooks";
import RecordVoiceOverIcon from "@mui/icons-material/RecordVoiceOver";

const truncate = (text = "", max = 10) => {
  const t = String(text);
  return t.length > max ? t.slice(0, max) + "…" : t;
};

export default function UnitListPage() {
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const data = await listUnits();
        if (!alive) return;
        setUnits(Array.isArray(data) ? data : []);
      } catch (e) {
        if (!alive) return;
        setErr(e?.message || e?.code || String(e));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const skeletons = Array.from({ length: 6 });

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      {/* 헤더 */}
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", sm: "center" }}
        mb={3}
      >
        <Stack direction="row" spacing={1.5} alignItems="center">
          <LibraryBooksIcon color="primary" />
          <Typography variant="h4" fontWeight={800}>유닛 목록</Typography>
        </Stack>
        <Button
          variant="outlined"
          startIcon={<RecordVoiceOverIcon />}
          onClick={() => navigate("/pronunciation")}
          sx={{ borderRadius: 2, textTransform: "none", fontWeight: 600 }}
        >
          병음 발음하기
        </Button>
      </Stack>

      {/* 에러 */}
      {err && (
        <Alert severity="error" sx={{ borderRadius: 2, mb: 2 }}>
          초기 로드 에러: {err}
        </Alert>
      )}

      {/* 로딩 */}
      {loading && (
        <Grid container spacing={2} alignItems="stretch">
          {skeletons.map((_, i) => (
            <Grid key={i} item xs={12} sm={6} md={4}>
              <Card sx={{ borderRadius: 3, height: 220 }}>
                <CardContent>
                  <Skeleton width="70%" height={28} />
                  <Skeleton width="40%" height={18} sx={{ mt: 1 }} />
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* 비어 있음 */}
      {!loading && units.length === 0 && (
        <Alert severity="info" sx={{ borderRadius: 2 }}>
          등록된 유닛이 없습니다.
        </Alert>
      )}

      {/* 목록 */}
      {!loading && units.length > 0 && (
        <Grid container spacing={2} alignItems="stretch">
          {units.map((u) => {
            const title = u.title || `유닛 ${u.id}`;
            const themeShort = truncate(u.theme || "", 10);

            return (
              <Grid key={u.id} item xs={12} sm={6} md={4}>
                <Card
                  variant="outlined"
                  sx={{
                    height: 220, // ✅ 고정 높이
                    borderRadius: 3,
                    borderColor: "rgba(0,0,0,0.06)",
                    boxShadow: "0 4px 10px rgba(255,107,107,0.08)",
                    overflow: "hidden",
                    transition: "transform .2s ease, box-shadow .2s ease",
                    display: "flex",
                    flexDirection: "column",
                    "&:hover": {
                      transform: "translateY(-4px)",
                      boxShadow: "0 12px 24px rgba(255,107,107,0.18)",
                    },
                    "&::before": {
                      content: '""',
                      position: "absolute",
                      top: -36,
                      right: -36,
                      width: 110,
                      height: 110,
                      borderRadius: "50%",
                      background:
                        "linear-gradient(135deg, rgba(255,107,107,.22), rgba(165,230,200,.22))",
                      filter: "blur(6px)",
                    },
                  }}
                >
                  <CardActionArea
                    component={RouterLink}
                    to={`/units/${u.id}`}
                    sx={{
                      flex: 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <CardContent
                      sx={{
                        textAlign: "center",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "center",
                        alignItems: "center",
                        height: "100%",
                        width: "100%",
                        p: 2,
                      }}
                    >
                      <Typography
                        variant="h6"
                        fontWeight={800}
                        sx={{
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          color: "#0A0F29",
                        }}
                        title={title}
                      >
                        {title}
                      </Typography>

                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                          mt: 1,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                        title={u.theme || ""}
                      >
                        {themeShort}
                      </Typography>
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}
    </Container>
  );
}
