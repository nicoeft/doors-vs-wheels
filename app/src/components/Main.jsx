import React, {useEffect, useState} from "react";
import {useWallet} from "@solana/wallet-adapter-react";
import {Connection, PublicKey, SystemProgram} from "@solana/web3.js";
import * as anchor from "@project-serum/anchor";
import idl from "../idl.json";
import {Box, Container, Grid} from "@material-ui/core";
import Navbar from "./Navbar";
import VoteOption from "./VoteOption";
import VoteTally from "./VoteTally";
import Footer from "./Footer";
import Intro from "./Intro";
import {useSnackbar} from "notistack";
import VoteHistory from "./VoteHistory";
import {capitalize, preflightCommitment, programID} from "../utils";

export default function Main({network}) {
    const {enqueueSnackbar} = useSnackbar();
    const wallet = useWallet();

    const [votes, setVotes] = useState({
        wheels: null,
        doors: null,
    });
    const [voteTxHistory, setVoteTxHistory] = useState([]);
    const [votesCounterAddress, setVotesCounterAddress] = useState(null);

    useEffect(() => {
        const controller = new AbortController();
        findVotesCounterAddress();
        return () => controller.abort();
    }, []);

    useEffect(() => {
        console.log("getVotes useffect");
        const controller = new AbortController();

        // Call Solana program for vote count
        async function getVotes() {
            console.log("getVotes");
            try {
                const program = await getProgram();
                let votesCounterAccount = await program.account.votesCounter.fetch(votesCounterAddress);
                setVotes({
                    wheels: parseInt(votesCounterAccount.wheels.toString()),
                    doors: parseInt(votesCounterAccount.doors.toString()),
                });
            } catch (error) {
                console.log("could not getVotes: ", error);
            }
        }

        if (votesCounterAddress) {
            getVotes();
        }
        return () => controller.abort();
    }, [votesCounterAddress]);

    async function getProvider() {
        const connection = new Connection(network, preflightCommitment);
        return new anchor.AnchorProvider(connection,wallet,preflightCommitment);
    }

    async function getProgram() {
        const provider = await getProvider();
        return new anchor.Program(idl, programID, provider);
    }

    async function findVotesCounterAddress() {
        console.log("Finding votes counter PDA");
        const program = await getProgram();
        const [votesCounterPDA, _bumpVotesCounter] = await PublicKey.findProgramAddress(
            [
                anchor.utils.bytes.utf8.encode("votes_counter"),
            ],
            program.programId
        );
        setVotesCounterAddress(votesCounterPDA);
    }

    // Initialize the program if this is the first time its launched
    async function initializeVoting() {
        const provider = await getProvider();
        console.log("initializeVoting",programID.toString());
        const program = new anchor.Program(idl, programID, provider);
        try {
            const tx = program.methods.initialize().accounts({
                user: provider.wallet.publicKey,
                systemProgram: SystemProgram.programId,
            });
            // const keys = await tx.pubkeys()
            await tx.rpc();
            const votesCounterAccount = await program.account.votesCounter.fetch(votesCounterAddress);
            setVotes({
                wheels: parseInt(votesCounterAccount.wheels.toString()),
                doors: parseInt(votesCounterAccount.doors.toString()),
            });
            enqueueSnackbar("Vote account initialized", {variant: "success"});
        } catch (error) {
            console.log("Transaction error: ", error);
            console.log(error.toString());
            enqueueSnackbar(`Error: ${error.toString()}`, {variant: "error"});
        }
    }

    // Vote for either wheels or doors. Poll for updated vote count on completion
    async function handleVote(side) {
        const provider = await getProvider();
        const program = new anchor.Program(idl, programID, provider);
        try {
            const voteOption = side === "wheels" ? {wheels: {}} : {doors: {}};
            let tx = program.methods.vote(voteOption).accounts({
                user: provider.wallet.publicKey,
                systemProgram: SystemProgram.programId,
                votesCounter: votesCounterAddress,
            })
            const keys = await tx.pubkeys()
            tx = await tx.rpc();
            const votesCounterAccount = await program.account.votesCounter.fetch(keys.votesCounter);

            setVotes({
                wheels: parseInt(votesCounterAccount.wheels.toString()),
                doors: parseInt(votesCounterAccount.doors.toString()),
            });
            enqueueSnackbar(`Voted for ${capitalize(side)}!`, {variant: "success"});
            setVoteTxHistory((oldVoteTxHistory) => [...oldVoteTxHistory, tx]);
        } catch (error) {
            console.log("Transaction error: ", error);
            console.log(error.toString());
            enqueueSnackbar(`Error: ${error.toString()}`, {variant: "error"});
        }
    }

    return (
        <Box height="100%" display="flex" flexDirection="column">
            <Box flex="1 0 auto">
                <Navbar/>
                <Container>
                    <Grid container spacing={3}>
                        <Grid item xs={12}>
                            <Intro
                                votes={votes}
                                initializeVoting={initializeVoting}
                                programID={programID}
                                votesCounterAddress={votesCounterAddress}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <VoteTally votes={votes}/>
                        </Grid>
                        <Grid item xs={6}>
                            <VoteOption side="wheels" handleVote={handleVote}/>
                        </Grid>
                        <Grid item xs={6}>
                            <VoteOption side="doors" handleVote={handleVote}/>
                        </Grid>
                        <Grid item xs={12}>
                            <VoteHistory voteTxHistory={voteTxHistory}/>
                        </Grid>
                    </Grid>
                </Container>
            </Box>
            <Footer programID={programID} votesCounterAddress={votesCounterAddress}/>
        </Box>
    );
}
