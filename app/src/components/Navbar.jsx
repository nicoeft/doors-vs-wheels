import { AppBar, Container, makeStyles, Toolbar } from "@material-ui/core";
import { WalletMultiButton } from "@solana/wallet-adapter-material-ui";
import React from "react";

const useStyles = makeStyles((theme) => ({
  root: {
    backgroundColor: "transparent",
    boxShadow: "none",
  },
  toolbar: {
    marginTop: theme.spacing(3),
    marginBottom: theme.spacing(3),
    justifyContent: "space-between",
  },
}));

export default function Navbar(props) {
  const classes = useStyles();
  return (
    <AppBar position="static" className={classes.root}>
      <Container maxWidth="xl">
        <Toolbar className={classes.toolbar}>
          <img src="/images/doors-vs-wheels.png" alt="DoorsVsWheels Vote" height={80} />
          <WalletMultiButton />
        </Toolbar>
      </Container>
    </AppBar>
  );
}
