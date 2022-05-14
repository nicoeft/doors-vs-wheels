import * as anchor from "@project-serum/anchor";
import {Program} from "@project-serum/anchor";
import {PublicKey, SendTransactionError, LAMPORTS_PER_SOL} from '@solana/web3.js';
import {DoorsVsWheels} from "../target/types/doors_vs_wheels";
import * as assert from "assert";
import {expect, use} from "chai";

const {SystemProgram} = anchor.web3;
const VOTING_FEE = 201612;


describe("doors-vs-wheels", () => {

    const ANCHOR_PROGRAM = anchor.workspace.DoorsVsWheels as Program<DoorsVsWheels>;
    const {user: base_user, program: base_program, provider: base_provider} = getNewProgramInteraction();
    let votes_counter_initial_balance = null

    // Workaround for simulating multiple wallet interactions with the solana program, probably not the best way to do it.
    function getNewProgramInteraction(): { user: anchor.web3.Keypair, program: Program<DoorsVsWheels>, provider: anchor.Provider } {
        /**
         * Creates a new user and instantiates the program on behalf of the user.
         * Returns the needed variables to interact with the solana program.
         * */
        const user = anchor.web3.Keypair.generate();
        // Configure the client to use the local cluster and our newly created user
        const provider = new anchor.AnchorProvider(anchor.AnchorProvider.local().connection, new anchor.Wallet(user), {});
        const program = new anchor.Program(ANCHOR_PROGRAM.idl as anchor.Idl, ANCHOR_PROGRAM.programId, provider) as Program<DoorsVsWheels>
        return {user: user, program: program, provider: provider};
    }

    async function addFunds(user: anchor.web3.Keypair, amount: number) {
        /**
         * Adds funds to the given user's account.
         * */
        const airdrop_tx = await base_provider.connection.requestAirdrop(user.publicKey, amount)
        await base_provider.connection.confirmTransaction(airdrop_tx);
    }

    it("Base user: Initialize OK - counter with 0 votes for doors and wheels", async () => {
        // Need to add funds to the user to pay for transaction fees.
        // Added more SOL than needed to make sure base_user never runs out of funds.
        await addFunds(base_user, LAMPORTS_PER_SOL * 100);
        const tx = base_program.methods.initialize().accounts({
            user: base_user.publicKey,
            systemProgram: SystemProgram.programId,
        });
        const keys = await tx.pubkeys()
        await tx.rpc()
        const votesCounterAccount = await base_program.account.votesCounter.fetch(keys.votesCounter)
        assert.equal(votesCounterAccount.doors.toString(), '0')
        assert.equal(votesCounterAccount.wheels.toString(), '0')
        votes_counter_initial_balance = await base_provider.connection.getBalance(keys.votesCounter)
    });
    it("Base user: Initialize ERROR - to initialize if already initialized", async () => {
        // Need to add funds to the user to pay for transaction fees as base_user is already super well funded.
        try {
            const tx = await base_program.methods.initialize().accounts({
                user: base_user.publicKey,
                systemProgram: SystemProgram.programId,
            }).rpc();
        } catch (err) {
            expect(err).to.be.instanceof(SendTransactionError);
        }
    });
    it("New user: Initialize ERROR - to initialize if already initialized", async () => {
        const {user, program, provider} = getNewProgramInteraction();
        await addFunds(user, LAMPORTS_PER_SOL * 100);
        try {
            const tx = await program.methods.initialize().accounts({
                user: user.publicKey,
                systemProgram: SystemProgram.programId,
            }).rpc();
        } catch (err) {
            expect(err).to.be.instanceof(SendTransactionError);
        }
    });
    it("New user: Vote ERROR - no prior credit for paying transaction fee", async () => {
        const {user, program, provider} = getNewProgramInteraction();
        let wallet_balance = await provider.connection.getBalance(user.publicKey)
        assert.equal(wallet_balance, 0)

        const [votesCounterPDA, _bumpVotesCounter] = await PublicKey.findProgramAddress(
            [
                anchor.utils.bytes.utf8.encode("votes_counter"),
            ],
            program.programId
        );
        let votesCounterAccount = await program.account.votesCounter.fetch(votesCounterPDA)
        assert.equal(votesCounterAccount.doors.toString(), '0')
        assert.equal(votesCounterAccount.wheels.toString(), '0')
        try {
            const tx = await program.methods.vote({wheels: {}}).accounts({
                user: user.publicKey,
                systemProgram: SystemProgram.programId,
                votesCounter: votesCounterPDA
            }).rpc();
            assert.ok(false, "This code should have failed");
        } catch (err) {
            expect(err).to.be.instanceOf(SendTransactionError)
            expect(err.message).to.contain('Attempt to debit an account but found no record of a prior credit')
        }
    });
    it("New user: Vote ERROR - insufficient funds for paying voting service fee", async () => {
        const {user, program, provider} = getNewProgramInteraction();
        let wallet_balance = await provider.connection.getBalance(user.publicKey)
        assert.equal(wallet_balance, 0)
        await addFunds(user, VOTING_FEE / 2);
        wallet_balance = await provider.connection.getBalance(user.publicKey)
        assert.equal(wallet_balance, VOTING_FEE / 2)
        const [votesCounterPDA, _bumpVotesCounter] = await PublicKey.findProgramAddress(
            [
                anchor.utils.bytes.utf8.encode("votes_counter"),
            ],
            program.programId
        );
        let votesCounterAccount = await program.account.votesCounter.fetch(votesCounterPDA)
        assert.equal(votesCounterAccount.doors.toString(), '0')
        assert.equal(votesCounterAccount.wheels.toString(), '0')
        try {
            const tx = await program.methods.vote({wheels: {}}).accounts({
                user: user.publicKey,
                systemProgram: SystemProgram.programId,
                votesCounter: votesCounterPDA
            }).rpc();
            assert.ok(false, "This code should have failed");
        } catch (err) {
            expect(err).to.be.instanceOf(SendTransactionError)
            assert.ok(err.logs.some(log =>
                log.includes("Transfer: insufficient lamports")
            ))
        }
    });
    it("Base user: Vote OK - votes for wheels and pays voting service fee", async () => {
        const [votesCounterPDA, _bumpVotesCounter] = await PublicKey.findProgramAddress(
            [
                anchor.utils.bytes.utf8.encode("votes_counter"),
            ],
            base_program.programId
        );
        let votesCounterAccount = await base_program.account.votesCounter.fetch(votesCounterPDA)
        assert.equal(votesCounterAccount.doors.toString(), '0')
        assert.equal(votesCounterAccount.wheels.toString(), '0')
        const tx = base_program.methods.vote({wheels: {}}).accounts({
            user: base_user.publicKey,
            systemProgram: SystemProgram.programId,
            votesCounter: votesCounterPDA
        })
        const keys = await tx.pubkeys()
        await tx.rpc();
        votesCounterAccount = await base_program.account.votesCounter.fetch(votesCounterPDA)
        assert.equal(votesCounterAccount.doors.toString(), '0')
        assert.equal(votesCounterAccount.wheels.toString(), '1')
        const userVoteAccount = await base_program.account.userVote.fetch(keys.userVote)
        assert.deepEqual(userVoteAccount.vote, {wheels: {}})
        const updated_balance = await base_provider.connection.getBalance(keys.votesCounter)
        // First valid vote, paid voting service fee to the votes counter account
        const expected_balance = votes_counter_initial_balance + VOTING_FEE
        assert.equal(updated_balance, expected_balance)
    });
    it("New user: Vote OK - votes for doors and pays voting service fee", async () => {
        const {user, program, provider} = getNewProgramInteraction();
        await addFunds(user, 2 * VOTING_FEE);
        const [votesCounterPDA, _bumpVotesCounter] = await PublicKey.findProgramAddress(
            [
                anchor.utils.bytes.utf8.encode("votes_counter"),
            ],
            program.programId
        );
        let votesCounterAccount = await program.account.votesCounter.fetch(votesCounterPDA)
        assert.equal(votesCounterAccount.doors.toString(), '0')
        assert.equal(votesCounterAccount.wheels.toString(), '1')
        const tx = program.methods.vote({doors: {}}).accounts({
            user: user.publicKey,
            systemProgram: SystemProgram.programId,
            votesCounter: votesCounterPDA
        })
        const keys = await tx.pubkeys()
        await tx.rpc();
        votesCounterAccount = await program.account.votesCounter.fetch(votesCounterPDA)
        assert.equal(votesCounterAccount.doors.toString(), '1')
        assert.equal(votesCounterAccount.wheels.toString(), '1')
        const userVoteAccount = await program.account.userVote.fetch(keys.userVote)
        assert.deepEqual(userVoteAccount.vote, {doors: {}})
        const updated_balance = await provider.connection.getBalance(keys.votesCounter)
        // Second valid vote, paid voting service fee to the votes counter account
        const expected_balance = votes_counter_initial_balance + 2 * VOTING_FEE
        assert.equal(updated_balance, expected_balance)
    });
    it("Base user: Vote ERROR - Fails to vote again", async () => {
        const [votesCounterPDA, _bumpVotesCounter] = await PublicKey.findProgramAddress(
            [
                anchor.utils.bytes.utf8.encode("votes_counter"),
            ],
            base_program.programId
        );
        try {
            const tx = await base_program.methods.vote({wheels: {}}).accounts({
                user: base_user.publicKey,
                votesCounter: votesCounterPDA,
                systemProgram: SystemProgram.programId,
            }).rpc();
            assert.ok(false, "This code should have failed");
        } catch (err) {
            expect(err).to.be.instanceof(SendTransactionError)
        }

    });
    it("New user: Vote ERROR - Fails to vote with wrong PDA", async () => {
        const {user, program, provider} = getNewProgramInteraction();
        await addFunds(user, 2 * VOTING_FEE)
        const [votesCounterPDA, _bumpVotesCounter] = await PublicKey.findProgramAddress(
            [
                anchor.utils.bytes.utf8.encode("votes_counter"),
            ],
            program.programId
        );
        const [userVotePDA, _bumpUserVote] = await PublicKey.findProgramAddress(
            [
                anchor.utils.bytes.utf8.encode("user_vote_ERROR"),
                user.publicKey.toBuffer()
            ],
            program.programId
        );
        try {
            const tx = await program.methods.vote({wheels: {}}).accounts({
                user: user.publicKey,
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
