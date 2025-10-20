import React from "react";
import { Link as RouterLink } from "react-router-dom";
import {
  Container, Grid, Card, CardContent, CardActions,
  Typography, Button, Box, Alert
} from "@mui/material";

export default function AdminHome() {
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 2 }}>
        <Typography variant="h5" fontWeight={700}>관리자</Typography>
        <Typography variant="body2" color="text.secondary">
          words / units / dailies 데이터 관리. 아래에서 필요한 화면으로 이동해.
        </Typography>
      </Box>

      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} md={4}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle1" fontWeight={600}>단어 관리</Typography>
              <Typography variant="body2" color="text.secondary">단어 단건/일괄 업로드</Typography>
            </CardContent>
            <CardActions>
              <Button size="small" component={RouterLink} to="/admin/words">이동 →</Button>
            </CardActions>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle1" fontWeight={600}>유닛 관리</Typography>
              <Typography variant="body2" color="text.secondary">유닛 생성/수정, vocabIds 연결</Typography>
            </CardContent>
            <CardActions>
              <Button size="small" component={RouterLink} to="/admin/units">이동 →</Button>
            </CardActions>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle1" fontWeight={600}>데일리 관리</Typography>
              <Typography variant="body2" color="text.secondary">날짜별 3개 단어 묶음</Typography>
            </CardContent>
            <CardActions>
              <Button size="small" component={RouterLink} to="/admin/dailies">이동 →</Button>
            </CardActions>
          </Card>
        </Grid>
      </Grid>

      <Alert severity="info" sx={{ mt: 2 }} variant="outlined">
        원칙: 단어 원본은 <code>/words</code> 하나. 유닛/데일리는 <code>id 배열</code>만 참조.
      </Alert>
    </Container>
  );
}
