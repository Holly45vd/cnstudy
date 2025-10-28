import React, { useEffect, useState } from "react";
import { listUnits } from "../../firebase/firestore";
import { Link as RouterLink, useNavigate } from "react-router-dom";

/* MUI */
import {
  Container,
  Grid,
  Card,
  CardActionArea,
  CardContent,
  Typography,
  Skeleton,
  Alert,
  Stack,
  Box,
  Button,
  Chip,
  Divider,
} from "@mui/material";
import LibraryBooksIcon from "@mui/icons-material/LibraryBooks";
import RecordVoiceOverIcon from "@mui/icons-material/RecordVoiceOver";

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
        const msg = e?.message || e?.code || String(e);
        setErr(msg);
        console.error("listUnits error:", e);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
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
          <Typography variant="h4" fontWeight={800}>
            유닛 목록
          </Typography>
        </Stack>

        <Button
          variant="outlined"
          startIcon={<RecordVoiceOverIcon />}
          onClick={() => navigate("/pronunciation")}
          sx={{
            borderRadius: 2,
            textTransform: "none",
            fontWeight: 600,
          }}
        >
          병음 발음하기
        </Button>
      </Stack>

      {/* 로딩/에러/데이터 */}
      {err && (
        <Alert severity="error" sx={{ borderRadius: 2, mb: 2 }}>
          초기 로드 에러: {err}
        </Alert>
      )}

      {loading ? (
        <Grid container spacing={2}>
          {skeletons.map((_, i) => (
            <Grid item xs={12} sm={6} key={i}>
              <Card sx={{ borderRadius: 3 }}>
                <CardContent>
                  <Skeleton width="60%" height={28} />
                  <Skeleton width="40%" height={20} sx={{ mt: 1 }} />
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      ) : units.length === 0 ? (
        <Alert severity="info" sx={{ borderRadius: 2 }}>
          등록된 유닛이 없습니다.
        </Alert>
      ) : (
        <Grid container spacing={2}>
          {units.map((u) => (
            <Grid key={u.id} item xs={12} sm={6}>
              <Card
                variant="outlined"
                sx={{
                  borderRadius: 3,
                  height: "100%",
                  transition: "0.25s",
                  "&:hover": {
                    boxShadow: 3,
                    borderColor: "primary.main",
                    transform: "translateY(-4px)",
                  },
                }}
              >
                <CardActionArea
                  component={RouterLink}
                  to={`/units/${u.id}`}
                  sx={{ height: "100%" }}
                >
                  <CardContent>
                    <Stack spacing={1}>
                      <Typography variant="h6" fontWeight={700}>
                        {u.title || `유닛 ${u.id}`}
                      </Typography>
                      {u.theme && (
                        <Typography variant="body2" color="text.secondary">
                          {u.theme}
                        </Typography>
                      )}
                      <Divider sx={{ my: 1 }} />
                      <Stack direction="row" spacing={1}>
                        <Chip
                          label={`ID: ${u.id}`}
                          size="small"
                          color="default"
                          variant="outlined"
                        />
                        {u.level && (
                          <Chip
                            label={`Level ${u.level}`}
                            size="small"
                            color="primary"
                            variant="outlined"
                          />
                        )}
                      </Stack>
                    </Stack>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Container>
  );
}
