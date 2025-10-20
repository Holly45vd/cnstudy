import React, { useEffect, useState } from "react";
import { listUnits } from "../../firebase/firestore";
import { Link as RouterLink } from "react-router-dom";

import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardActions from "@mui/material/CardActions";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import Skeleton from "@mui/material/Skeleton";
import Alert from "@mui/material/Alert";

export default function UnitListPage() {
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

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
        // 콘솔에도 남겨 디버깅
        // eslint-disable-next-line no-console
        console.error("listUnits error:", e);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const skeletons = Array.from({ length: 6 });

  return (
    <Stack spacing={2}>
      <Typography variant="h5" fontWeight={700}>
        유닛 목록
      </Typography>

      {err && <Alert severity="error">초기 로드 에러: {err}</Alert>}

      <Grid container spacing={2}>
        {loading
          ? skeletons.map((_, i) => (
              <Grid key={i} item xs={12} sm={6} lg={4}>
                <Card variant="outlined">
                  <CardContent>
                    <Skeleton width="60%" height={28} />
                    <Skeleton width="40%" height={18} />
                    <Skeleton width="30%" height={18} sx={{ mt: 1 }} />
                  </CardContent>
                  <CardActions>
                    <Skeleton width={80} height={32} />
                  </CardActions>
                </Card>
              </Grid>
            ))
          : units.length === 0
            ? (
              <Grid item xs={12}>
                <Alert severity="info">등록된 유닛이 없습니다.</Alert>
              </Grid>
            )
            : units.map((u) => (
                <Grid key={u.id} item xs={12} sm={6} lg={4}>
                  <Card variant="outlined" sx={{ height: "100%" }}>
                    <CardContent>
                      <Typography variant="h6">
                        {u.title || `유닛 ${u.id}`}
                      </Typography>
                      {u.theme && (
                        <Typography variant="body2" color="text.secondary">
                          {u.theme}
                        </Typography>
                      )}
                    </CardContent>
                    <CardActions>
                      <Button
                        component={RouterLink}
                        to={`/units/${u.id}`}
                        size="small"
                      >
                        바로가기 →
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
              ))}
      </Grid>
    </Stack>
  );
}
