import {
  Avatar,
  Box,
  LinearProgress,
  makeStyles,
  Typography,
} from "@material-ui/core";
import React from "react";
import { formatWithCommas, percentize } from "../utils";

const useStyles = makeStyles((theme) => ({
  avatar: {
    height: 120,
    width: 120,
    borderRadius: "initial",
    "&.left": {
      marginRight: theme.spacing(0.5),
    },
    "&.right": {
      marginLeft: theme.spacing(0.5),
    },
  },
  progress: {
    backgroundColor: theme.palette.primary.main,
    height: 25,
  },
}));

// Show vote counts for each side
export default function VoteTally({ votes }) {
  const classes = useStyles();

  function getProgress() {
    if (
      typeof votes.wheels !== "number" ||
      typeof votes.doors !== "number" ||
      votes.wheels + votes.doors === 0
    ) {
      return 50;
    }
    return (votes.wheels / (votes.doors + votes.wheels)) * 100;
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" marginBottom="5px">
        <Box display="flex" alignItems="flex-end">
          <Avatar
            alt=""
            src="/images/wheels.png"
            className={[classes.avatar, "left"].join(" ")}
          />
          <Typography variant="h6" >Wheels</Typography>
        </Box>
        <Box display="flex" alignItems="flex-end" textAlign="right">
          <Typography variant="h6">Doors</Typography>
          <Avatar
            alt=""
            src="/images/doors.png"
            className={[classes.avatar, "right"].join(" ")}
          />
        </Box>
      </Box>
      <LinearProgress
        variant="determinate"
        value={getProgress()}
        color="secondary"
        className={classes.progress}
      />
      <Box display="flex" justifyContent="space-between">
        <Box>
          <Typography variant="h3">
            {formatWithCommas(votes.wheels)}
          </Typography>
          <Typography variant="h6">
            {percentize(votes.wheels / (votes.wheels + votes.doors))}
          </Typography>
        </Box>
        <Box textAlign="right">
          <Typography variant="h3">{formatWithCommas(votes.doors)}</Typography>
          <Typography variant="h6">
            {percentize(votes.doors / (votes.wheels + votes.doors))}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
