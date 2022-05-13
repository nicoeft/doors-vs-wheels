import * as anchor from "@project-serum/anchor";
import {Program} from "@project-serum/anchor";
import {PublicKey, SendTransactionError} from '@solana/web3.js';
import {DoorsVsWheels} from "../target/types/doors_vs_wheels";
import * as assert from "assert";
import {expect} from "chai";

const {SystemProgram} = anchor.web3;

describe("doors-vs-wheels", () => {
    // Configure the client to use the local cluster.
    const provider = anchor.AnchorProvider.local();
    anchor.setProvider(provider);
    const program = anchor.workspace.DoorsVsWheels as Program<DoorsVsWheels>;


    it("Initializes with 0 votes for doors and wheels", async () => {
        const tx = program.methods.initialize().accounts({
            user: provider.wallet.publicKey,
            systemProgram: SystemProgram.programId,
        });
        const keys = await tx.pubkeys()
        await tx.rpc()
        const votesCounterAccount = await program.account.votesCounter.fetch(keys.votesCounter)
        assert.equal(votesCounterAccount.doors.toString(), '0')
        assert.equal(votesCounterAccount.wheels.toString(), '0')
    });
    it("Votes correctly for wheels", async () => {

        const [votesCounterPDA, _bumpVotesCounter] = await PublicKey.findProgramAddress(
            [
                anchor.utils.bytes.utf8.encode("votes_counter"),
            ],
            program.programId
        );
        let votesCounterAccount = await program.account.votesCounter.fetch(votesCounterPDA)
        assert.equal(votesCounterAccount.doors.toString(), '0')
        assert.equal(votesCounterAccount.wheels.toString(), '0')
        const tx = program.methods.vote({wheels: {}}).accounts({
            user: provider.wallet.publicKey,
            systemProgram: SystemProgram.programId,
            votesCounter: votesCounterPDA
        })
        const keys = await tx.pubkeys()
        await tx.rpc();
        votesCounterAccount = await program.account.votesCounter.fetch(votesCounterPDA)
        assert.equal(votesCounterAccount.doors.toString(), '0')
        assert.equal(votesCounterAccount.wheels.toString(), '1')
        const userVoteAccount = await program.account.userVote.fetch(keys.userVote)
        assert.deepEqual(userVoteAccount.vote, {wheels: {}})
    });
    it("Fails to initialize if already initialized", async () => {
        try {
            const tx = await program.methods.initialize().accounts({
                user: provider.wallet.publicKey,
                systemProgram: SystemProgram.programId,
            }).rpc();
        } catch (err) {
            expect(err).to.be.instanceof(SendTransactionError);
            expect(err.toString()).to.contain("This transaction has already been processed")
        }
    });
    it("Fails to vote again", async () => {
        const [votesCounterPDA, _bumpVotesCounter] = await PublicKey.findProgramAddress(
            [
                anchor.utils.bytes.utf8.encode("votes_counter"),
            ],
            program.programId
        );
        try {
            const tx = await program.methods.vote({wheels: {}}).accounts({
                user: provider.wallet.publicKey,
                votesCounter: votesCounterPDA,
                systemProgram: SystemProgram.programId,
            }).rpc();
            assert.ok(false, "This code should have failed");
        } catch (err) {
            expect(err).to.be.instanceof(SendTransactionError)
            expect(err.toString()).to.contain("This transaction has already been processed")
        }

    });
    it("Fails to vote with wrong PDA", async () => {
        const [votesCounterPDA, _bumpVotesCounter] = await PublicKey.findProgramAddress(
            [
                anchor.utils.bytes.utf8.encode("votes_counter"),
            ],
            program.programId
        );
        const [userVotePDA, _bumpUserVote] = await PublicKey.findProgramAddress(
            [
                anchor.utils.bytes.utf8.encode("user_vote_ERROR"),
                provider.wallet.publicKey.toBuffer()
            ],
            program.programId
        );
        try {
            const tx = await program.methods.vote({wheels: {}}).accounts({
                user: provider.wallet.publicKey,
                votesCounter: votesCounterPDA,
                userVote: userVotePDA,
                systemProgram: SystemProgram.programId,
            }).rpc();
            assert.ok(false, "This code should have failed");
        } catch (err) {
            expect(err).to.be.instanceof(SendTransactionError)
            expect(err.programErrorStack.map((pk) => pk.toString())).to.deep.equal([
                program.programId.toString(),
            ]);
            expect(err.toString()).to.contain("Cross-program invocation with unauthorized signer or writable account")
        }

    });
});
