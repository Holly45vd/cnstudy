import React, { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  AppBar,
  Toolbar,
  BottomNavigation,
  BottomNavigationAction,
  Box,
  useScrollTrigger,
  Slide,
  SpeedDial,
  SpeedDialAction,
  SpeedDialIcon,
} from "@mui/material";

/* Icons */
import MenuBookIcon from "@mui/icons-material/MenuBook";
import TodayIcon from "@mui/icons-material/Today";
import SchoolIcon from "@mui/icons-material/School";
import SettingsIcon from "@mui/icons-material/Settings";
import StyleIcon from "@mui/icons-material/Style";

function today() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

export default function Navbar() {
  const nav = useNavigate();
  const { pathname } = useLocation();

  // 어떤 탭이 활성인지 계산
  const value = useMemo(() => {
    if (pathname.startsWith("/grammar") || pathname.startsWith("/sentence")) return "grammar";
    if (pathname.startsWith("/everyday")) return "everyday";
    if (pathname.startsWith("/flashcards")) return "flashcards";
    if (pathname.startsWith("/admin")) return "admin";
    return "units";
  }, [pathname]);

  const handleChange = (_e, newValue) => {
    switch (newValue) {
      case "units": nav("/"); break;
      case "everyday": nav(`/everyday/${today()}`); break;
      case "grammar": nav("/grammar"); break;               // 허브로 이동
      case "flashcards": nav("/flashcards"); break;
      case "admin": nav("/admin"); break;
      default: break;
    }
  };

  // 스크롤 내리면 AppBar 숨김
  const trigger = useScrollTrigger({ disableHysteresis: true, threshold: 80 });

  // 유닛 상세 페이지에선 글로벌 SpeedDial 숨김
  const onUnitDetail = /^\/units\/[^/]+/.test(pathname);

  return (
    <>
      {/* 스크롤 시 위로 슬라이드 아웃 */}
      <Slide appear={false} direction="down" in={!trigger}>
        <AppBar
          position="sticky"
          color="default"
          elevation={0}
          sx={{ borderBottom: 1, borderColor: "divider", bgcolor: "#fff" }}
        >
          <Toolbar disableGutters>
            <Box sx={{ width: "100%" }}>
              <BottomNavigation
                showLabels
                value={value}
                onChange={handleChange}
                sx={{
                  width: "100%",
                  bgcolor: "transparent",
                  "& .Mui-selected": { color: "primary.main !important" },
                  "& .MuiBottomNavigationAction-root": {
                    color: "rgba(0,0,0,0.6)",
                    minWidth: { xs: 60, sm: 80 },
                    px: { xs: 1, sm: 2 },
                  },
                }}
              >
                <BottomNavigationAction value="units" icon={<MenuBookIcon />} />
                <BottomNavigationAction value="everyday" icon={<TodayIcon />} />
                <BottomNavigationAction value="grammar" icon={<SchoolIcon />} />
                <BottomNavigationAction value="flashcards" icon={<StyleIcon />} />
                <BottomNavigationAction value="admin" icon={<SettingsIcon />} />
              </BottomNavigation>
            </Box>
          </Toolbar>
        </AppBar>
      </Slide>

      {/* 글로벌 Speed Dial: 유닛 상세 화면이 아닐 때만, 스크롤 내렸을 때만 표시 */}
      {!onUnitDetail && trigger && (
        <SpeedDial
          ariaLabel="global quick nav"
          sx={{ position: "fixed", bottom: 16, right: 16, zIndex: 1500 }}
          icon={<SpeedDialIcon />}
          FabProps={{ color: "secondary" }}
        >
          <SpeedDialAction
            icon={<MenuBookIcon />}
            tooltipTitle=""
            onClick={() => nav("/")}
          />
          <SpeedDialAction
            icon={<TodayIcon />}
            tooltipTitle=""
            onClick={() => nav(`/everyday/${today()}`)}
          />
          <SpeedDialAction
            icon={<SchoolIcon />}
            tooltipTitle=""
            onClick={() => nav("/grammar")}
          />
          <SpeedDialAction
            icon={<StyleIcon />}
            tooltipTitle=""
            onClick={() => nav("/flashcards")}
          />
          <SpeedDialAction
            icon={<SettingsIcon />}
            tooltipTitle=""
            onClick={() => nav("/admin")}
          />
        </SpeedDial>
      )}
    </>
  );
}
