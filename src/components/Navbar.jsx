import React, { useEffect, useState } from "react";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import { Link as RouterLink, NavLink, useNavigate } from "react-router-dom";
import { observeAuthState, signInWithGoogle, logout } from "../firebase/auth";

function today() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

export default function Navbar() {
  const nav = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => observeAuthState(setUser), []);

  const linkStyle = ({ isActive }) => ({
    textTransform: "none",
    fontWeight: isActive ? 700 : 500,
    color: isActive ? "#fff" : "#e3f2fd",
  });

  return (
    <AppBar position="sticky" color="primary" elevation={0}>
      <Toolbar sx={{ gap: 1 }}>

        <Stack direction="row" spacing={1}>
          <Button component={NavLink} to="/" sx={linkStyle} size="small">유닛</Button>
          <Button component={NavLink} to={`/everyday/${today()}`} sx={linkStyle} size="small">데일리</Button>
          <Button component={NavLink} to="/pronunciation" sx={linkStyle} size="small">발음</Button>
          <Button component={NavLink} to="/admin" sx={linkStyle} size="small">Admin</Button>
        </Stack>

    
      </Toolbar>
    </AppBar>
  );
}
