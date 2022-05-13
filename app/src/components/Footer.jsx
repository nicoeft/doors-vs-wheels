import {
  AppBar,
  Box,
  Container,
  Link,
  makeStyles,
  Toolbar,
  Typography,
} from "@material-ui/core";
import React from "react";
import TwitterIcon from "@material-ui/icons/Twitter";
import GitHubIcon from "@material-ui/icons/GitHub";
import LinkedInIcon from "@material-ui/icons/LinkedIn";

const useStyles = makeStyles((theme) => ({
  root: {
    backgroundColor: "transparent",
    boxShadow: "none",
    borderTop: "1px solid #e6e6e5",
    flexShrink: 0,
    marginTop: theme.spacing(2),
  },
  toolbar: {
    justifyContent: "space-between",
  },
  socialIcons: {
    margin: theme.spacing(1),
  },
}));

export default function Footer({ programID, votesCounterAddress }) {
  const classes = useStyles();
  return (
    <AppBar position="static" className={classes.root}>
      <Container maxWidth="xl">
        <Toolbar className={classes.toolbar}>
          <Typography variant="caption">
            Version by {" "}
            <Link underline="always" href="https://brianfriel.xyz">
              Nicolas Francisquelo Tacca
            </Link>
            {" | "}
            Based on tutorials and code by {" "}
            <Link underline="always" href="https://brianfriel.xyz">
              Brian Friel
            </Link>
            {" | "}
            Powered by{" "}
            <Link underline="always" href="https://solana.com/">
              Solana
            </Link>
            {" | "}
            <Link
              underline="always"
              href={`https://explorer.solana.com/address/${programID.toString()}`}
            >
              Program ID
            </Link>
            {" | "}
            <Link
              underline="always"
              href={`https://explorer.solana.com/address/${votesCounterAddress}`}
            >
              Vote Account
            </Link>
          </Typography>
          <Box>
            <Link
              className={classes.socialIcons}
              href="https://twitter.com/nicoeft"
            >
              <TwitterIcon />
            </Link>
            <Link className={classes.socialIcons} href="https://github.com/nicoeft/doors-vs-wheels">
              <GitHubIcon />
            </Link>
            <Link className={classes.socialIcons} href="https://linkedin.com/in/nicolas-francisquelo">
              <LinkedInIcon />
            </Link>
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  );
}
