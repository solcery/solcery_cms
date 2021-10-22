import React from "react";
import { useConnection, sendTransaction } from "../../contexts/connection";
import { useProject } from "../../contexts/project";
import { useWallet } from "../../contexts/wallet";
import { LAMPORTS_PER_SOL, Account, TransactionInstruction } from "@solana/web3.js";
import { SystemProgram } from "@solana/web3.js";
import { BinaryWriter, BinaryReader } from "borsh";
import { programId } from "../../solcery/engine"
import { Project, TemplateData, SolcerySchema, Storage} from "../../solcery/classes"
import { useHistory } from "react-router-dom";
import { Button } from "antd";
import { ConstructedContent } from "../../solcery/content"

export const HomeView = () => {


  const connection = useConnection();
  const { wallet, publicKey } = useWallet();
  const history = useHistory();
  const { project } = useProject();

  const airdrop = async () => {
    if (!publicKey)
      return
    connection.requestAirdrop(publicKey, LAMPORTS_PER_SOL * 1)
  }

  const constructContent = async () => {
    if (!project)
      return
    let constructed = await project.сonstructContent(connection)
    let writer = new BinaryWriter()
    constructed.write(writer)
    let buf = writer.buf.slice(0, writer.length)
    console.log(JSON.stringify(buf))
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
