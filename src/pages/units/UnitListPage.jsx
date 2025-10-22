// src/pages/UnitListPage.jsx
import React, { useEffect, useState } from "react";
import { listUnits } from "../../firebase/firestore";
import { Link as RouterLink } from "react-router-dom";

/* MUI */
import {
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  Typography,
  Skeleton,
  Alert,
  Stack,
  Divider,
  Box,
} from "@mui/material";

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

      {loading ? (
        <List>
          {skeletons.map((_, i) => (
            <ListItem key={i} divider>
              <ListItemText
                primary={<Skeleton width="60%" height={28} />}
                secondary={<Skeleton width="40%" height={20} />}
              />
            </ListItem>
          ))}
        </List>
      ) : units.length === 0 ? (
        <Alert severity="info">등록된 유닛이 없습니다.</Alert>
      ) : (
        <Box sx={{ border: 1, borderColor: "divider", borderRadius: 2 }}>
          <List disablePadding>
            {units.map((u, idx) => (
              <React.Fragment key={u.id}>
                <ListItem disablePadding>
                  <ListItemButton
                    component={RouterLink}
                    to={`/units/${u.id}`}
                    sx={{
                      py: 1.5,
                      "&:hover": { bgcolor: "action.hover" },
                    }}
                  >
                    <ListItemText
                      primary={
                        <Typography variant="subtitle1" fontWeight={600}>
                          {u.title || `유닛 ${u.id}`}
                        </Typography>
                      }
                      secondary={
                        u.theme && (
                          <Typography variant="body2" color="text.secondary">
                            {u.theme}
                          </Typography>
                        )
                      }
                    />
                  </ListItemButton>
                </ListItem>
                {idx < units.length - 1 && <Divider component="li" />}
              </React.Fragment>
            ))}
          </List>
        </Box>
      )}
    </Stack>
  );
}
