import React from "react";
import { useConnection, sendTransaction } from "../../contexts/connection";
import { useProject } from "../../contexts/project";
import { useWallet } from "../../contexts/wallet";
import { LAMPORTS_PER_SOL, Account, TransactionInstruction, PublicKey } from "@solana/web3.js";
import { SystemProgram } from "@solana/web3.js";
import { BinaryWriter, BinaryReader } from "borsh";
import { programId } from "../../solcery/engine"
import { Project, TemplateData, SolcerySchema, Storage} from "../../solcery/classes"
import { useHistory } from "react-router-dom";
import { Button } from "antd";
import { ConstructedContent } from "../../solcery/content"
import { GameState } from "../../solcery/game"

export const HomeView = () => {


  const connection = useConnection();
  const { wallet, publicKey } = useWallet();
  const history = useHistory();
  const { project } = useProject();

  const setAccountData = async (accountPublicKey: PublicKey, data: Buffer, offset: number = 0) => {
    const MAX_DATA_SIZE = 1000
    if (wallet === undefined || !wallet.publicKey)
      return

    if (data.length <= MAX_DATA_SIZE) {
      let writer = new BinaryWriter()
      writer.writeU8(3)
      writer.writeU8(0)
      writer.writeU64(offset) 
      const saveAccountIx = new TransactionInstruction({
        keys: [
          { pubkey: wallet.publicKey, isSigner: true, isWritable: false },
          { pubkey: accountPublicKey, isSigner: false, isWritable: true },
        ],
        programId: programId,
        data: Buffer.concat([ 
          writer.buf.slice(0, writer.length),
          data,
        ]),
      });
      sendTransaction(connection, wallet, [saveAccountIx], [])
    }
    else {
      let writer = new BinaryWriter()
      writer.writeU8(3)
      writer.writeU8(0)
      writer.writeU64(offset)
      const saveAccountIx = new TransactionInstruction({
        keys: [
          { pubkey: wallet.publicKey, isSigner: true, isWritable: false },
          { pubkey: accountPublicKey, isSigner: false, isWritable: true },
        ],
        programId: programId,
        data: Buffer.concat([ 
          writer.buf.slice(0, writer.length),
          data.slice(0, MAX_DATA_SIZE),
        ]),
      });
      await sendTransaction(connection, wallet, [saveAccountIx], [], false).then(async () => {
        await setAccountData(accountPublicKey, data.slice(MAX_DATA_SIZE), offset + MAX_DATA_SIZE)
      })
    }
  }

  const airdrop = async () => {
    if (!publicKey)
      return
    connection.requestAirdrop(publicKey, LAMPORTS_PER_SOL * 1)
  }

  const constructContent = async () => {
    if (!project)
      return
    if (wallet === undefined || !wallet.publicKey)
      return
    let constructed = await project.сonstructContent(connection)
    let writer = new BinaryWriter()

    let gameState = new GameState(constructed)
    let gameStateBuf = gameState.toBuffer()

    var gameStateAccount = new Account()
    var createGameStateAccountIx = SystemProgram.createAccount({
      programId: programId,
      space: gameStateBuf.length, // TODO
      lamports: await connection.getMinimumBalanceForRentExemption(gameStateBuf.length, 'singleGossip'),
      fromPubkey: wallet.publicKey,
      newAccountPubkey: gameStateAccount.publicKey,
    });

    constructed.get('projectSettings')[0].gameStateAccount = gameStateAccount.publicKey.toBase58() // TODO: remove hardcode, publish
    constructed.write(writer)
    let contentBuf = writer.buf.slice(0, writer.length)

    var contentAccount = new Account()
    var createContentAccountIx = SystemProgram.createAccount({
      programId: programId,
      space: contentBuf.length, // TODO
      lamports: await connection.getMinimumBalanceForRentExemption(contentBuf.length, 'singleGossip'),
      fromPubkey: wallet.publicKey,
      newAccountPubkey: contentAccount.publicKey,
    });


    await sendTransaction(connection, wallet, [createContentAccountIx, createGameStateAccountIx], [contentAccount, gameStateAccount]).then(async () => {
      await setAccountData(contentAccount.publicKey, contentBuf)
      await setAccountData(gameStateAccount.publicKey, gameStateBuf)
      console.log('CONSTRUCTED!')
      console.log('Content account: ' + contentAccount.publicKey.toBase58())
    })
  }

  const createTemplate = async () => {
    if (!publicKey) 
      return;
    if (wallet === undefined) 
      return;
    if (!project)
      return;
    

    var accounts = [];
    var instructions = []
    var templateAccount = new Account();
    var createTemplateAccountIx = SystemProgram.createAccount({
      programId: programId,
      space: 3200, // TODO
      lamports: await connection.getMinimumBalanceForRentExemption(3200, 'singleGossip'),
      fromPubkey: publicKey,
      newAccountPubkey: templateAccount.publicKey,
    });
    accounts.push(templateAccount);
    instructions.push(createTemplateAccountIx);

    var storageAccount = new Account();
    var createStorageAccountIx = SystemProgram.createAccount({
      programId: programId,
      space: 3200, // TODO
      lamports: await connection.getMinimumBalanceForRentExemption(3200, 'singleGossip'),
      fromPubkey: publicKey,
      newAccountPubkey: storageAccount.publicKey,
    });
    accounts.push(storageAccount);
    instructions.push(createStorageAccountIx);


    const createTemplateIx = new TransactionInstruction({
      keys: [
        { pubkey: publicKey, isSigner: true, isWritable: false },
        { pubkey: project.publicKey, isSigner: false, isWritable: true },
        { pubkey: templateAccount.publicKey, isSigner: false, isWritable: true },
        { pubkey: storageAccount.publicKey, isSigner: false, isWritable: true },
        { pubkey: project.templateStorage, isSigner: false, isWritable: true },
      ],
      programId: programId,
      data: Buffer.from([0, 0]),
    });
    instructions.push(createTemplateIx);
    await sendTransaction(connection, wallet, instructions, accounts).then(() => {
      history.push("/template/" + templateAccount.publicKey);
    })
  }

  return (
    <div>
      <Button onClick = { createTemplate }>NEW TEMPLATE</Button>
      <Button onClick = { constructContent }>CONSTRUCT</Button>
      <Button onClick = { airdrop }>Airdrop</Button>
    </div>
  );
};
