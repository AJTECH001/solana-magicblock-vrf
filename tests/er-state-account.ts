import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { GetCommitmentSignature } from "@magicblock-labs/ephemeral-rollups-sdk";
import { ErStateAccount } from "../target/types/er_state_account";

describe("er-state-account", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const providerEphemeralRollup = new anchor.AnchorProvider(
    new anchor.web3.Connection(process.env.EPHEMERAL_PROVIDER_ENDPOINT || "https://devnet.magicblock.app/", {wsEndpoint: process.env.EPHEMERAL_WS_ENDPOINT || "wss://devnet.magicblock.app/"}
    ),
    anchor.Wallet.local()
  );
  console.log("Base Layer Connection: ", provider.connection.rpcEndpoint);
  console.log("Ephemeral Rollup Connection: ", providerEphemeralRollup.connection.rpcEndpoint);
  console.log(`Current SOL Public Key: ${anchor.Wallet.local().publicKey}`)

  before(async function () {
    const balance = await provider.connection.getBalance(anchor.Wallet.local().publicKey)
    console.log('Current balance is', balance / LAMPORTS_PER_SOL, ' SOL','\n')
  })

  const program = anchor.workspace.erStateAccount as Program<ErStateAccount>;

  const userAccount = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("user"), anchor.Wallet.local().publicKey.toBuffer()],
    program.programId
  )[0];

  const vrfProgramId = new PublicKey("Vrf1RNUjXmQGjmQrQLvJHs9SNkvDJEsRVFPkfSQUwGz");
  const oracleQueue = new PublicKey("Cuj97ggrhhidhbu39TijNVqE74xvKJ69gDervRUXAxGh");
  const [programIdentity] = PublicKey.findProgramAddressSync(
    [Buffer.from("identity")],
    program.programId
  );

  it("Is initialized!", async () => {
    // Add your test here.
    const tx = await program.methods.initialize().accountsPartial({
      user: anchor.Wallet.local().publicKey,
      userAccount: userAccount,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .rpc();
    console.log("User Account initialized: ", tx);
  });

  it("Update State!", async () => {
    const tx = await program.methods.update(new anchor.BN(42)).accountsPartial({
      user: anchor.Wallet.local().publicKey,
      userAccount: userAccount,
    })
    .rpc();
    console.log("\nUser Account State Updated: ", tx);
  });

  it("Request Randomness (Base Layer)!", async () => {
    const tx = await program.methods.requestRandomness().accountsPartial({
      user: anchor.Wallet.local().publicKey,
      userAccount: userAccount,
      oracleQueue: oracleQueue,
      programIdentity: programIdentity,
      vrfProgram: vrfProgramId,
      slotHashes: anchor.web3.SYSVAR_SLOT_HASHES_PUBKEY,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .rpc();
    console.log("\nVRF Randomness Requested (Base Layer): ", tx);

    let account = await program.account.userAccount.fetch(userAccount);
    console.log("User Account Status: ", account.status);
  });
 
   it("Consume Randomness (Base Layer) - Wait and Verify!", async () => {
     // Wait for the VRF program to call back
     console.log("Waiting for VRF callback...");
     await new Promise(resolve => setTimeout(resolve, 10000)); // 10 seconds
 
     const account = await program.account.userAccount.fetch(userAccount);
     console.log("User Account Status: ", account.status);
     console.log("User Account Random Number: ", account.randomNumber.toString());
     console.log("User Account Score: ", account.score.toString());
   });

   it("Delegate to Ephemeral Rollup!", async () => {

    let tx = await program.methods.delegate().accountsPartial({
      user: anchor.Wallet.local().publicKey,
      userAccount: userAccount,
      validator: new PublicKey("MAS1Dt9qreoRMQ14YQuhg8UTZMMzDdKhmkZMECCzk57"),
      systemProgram: anchor.web3.SystemProgram.programId,
    }).rpc({skipPreflight: true});

    console.log("\nUser Account Delegated to Ephemeral Rollup: ", tx);
  });

  it("Update State and Commit to Base Layer!", async () => {
    let tx = await program.methods.updateCommit(new anchor.BN(43)).accountsPartial({
      user: anchor.Wallet.local().publicKey,
      userAccount: userAccount,
    })
    .transaction();

    tx.feePayer = anchor.Wallet.local().publicKey;

    tx.recentBlockhash = (await providerEphemeralRollup.connection.getLatestBlockhash()).blockhash;
    tx = await provider.wallet.signTransaction(tx);
    const txHash = await providerEphemeralRollup.sendAndConfirm(tx, [], {skipPreflight: false});
    const txCommitSgn = await GetCommitmentSignature(
      txHash,
      providerEphemeralRollup.connection
  );

    console.log("\nUser Account State Updated: ", txHash);
  });

  it("Request Randomness (Ephemeral Rollup)!", async () => {
    let tx = await program.methods.requestRandomness().accountsPartial({
      user: anchor.Wallet.local().publicKey,
      userAccount: userAccount,
      oracleQueue: oracleQueue,
      programIdentity: programIdentity,
      vrfProgram: vrfProgramId,
      slotHashes: anchor.web3.SYSVAR_SLOT_HASHES_PUBKEY,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .transaction();

    tx.feePayer = anchor.Wallet.local().publicKey;
    tx.recentBlockhash = (await providerEphemeralRollup.connection.getLatestBlockhash()).blockhash;
    tx = await provider.wallet.signTransaction(tx);
    const txHash = await providerEphemeralRollup.sendAndConfirm(tx, [], {skipPreflight: false});
    
    console.log("\nVRF Randomness Requested (Ephemeral Rollup): ", txHash);

    // In ER, the callback should be almost instantaneous
    await new Promise(resolve => setTimeout(resolve, 2000));

    let account = await program.account.userAccount.fetch(userAccount);
    console.log("User Account Status in ER: ", account.status);
    console.log("User Account Random Number in ER: ", account.randomNumber.toString());
  });

  it("Commit and undelegate from Ephemeral Rollup!", async () => {
    let info = await providerEphemeralRollup.connection.getAccountInfo(userAccount);

    console.log("User Account Info: ", info);

    console.log("User account", userAccount.toBase58());

    let tx = await program.methods.undelegate().accountsPartial({
      user: anchor.Wallet.local().publicKey,
      userAccount: userAccount,
    })
    .transaction();

    tx.feePayer = anchor.Wallet.local().publicKey;

    tx.recentBlockhash = (await providerEphemeralRollup.connection.getLatestBlockhash()).blockhash;
    tx = await provider.wallet.signTransaction(tx);
    const txHash = await providerEphemeralRollup.sendAndConfirm(tx, [], {skipPreflight: false});
    const txCommitSgn = await GetCommitmentSignature(
      txHash,
      providerEphemeralRollup.connection
  );

    console.log("\nUser Account Undelegated: ", txHash);
  });

  it("Update State!", async () => {
    let tx = await program.methods.update(new anchor.BN(45)).accountsPartial({
      user: anchor.Wallet.local().publicKey,
      userAccount: userAccount,
    })
    .rpc();

    console.log("\nUser Account State Updated: ", tx);
  });

  it("Close Account!", async () => {
    const tx = await program.methods.close().accountsPartial({
      user: anchor.Wallet.local().publicKey,
      userAccount: userAccount,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .rpc();
    console.log("\nUser Account Closed: ", tx);
  });
});
