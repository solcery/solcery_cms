import React, { useCallback } from "react";
import { useConnection, sendTransaction} from "../../contexts/connection";
import { useWallet } from "../../contexts/wallet";
import { LAMPORTS_PER_SOL, PublicKey, Account, TransactionInstruction } from "@solana/web3.js";
import { SystemProgram } from "@solana/web3.js";
import { notify } from "../../utils/notifications";
import { ConnectButton } from "./../../components/ConnectButton";
import { LABELS } from "../../constants";
import {
  deserializeUnchecked, BinaryReader, BinaryWriter, serialize
} from 'borsh';

import { useParams, useHistory } from "react-router-dom";
import { getAccountObject, programId, projectPublicKey, projectStoragePublicKey, getAccountData } from "../../solcery/engine";
import { Button, Input } from "antd";
import Cookies from 'universal-cookie';


export async function onWalletConnected() {
  
}


type AccountViewParams = {
  accountKey: string;
};

export const AccountView = () => {

  var cookies = new Cookies()
  const connection = useConnection();
  const { connected, wallet, publicKey } = useWallet();
  const history = useHistory();

  const createEmptyAccount = async (accountSize: number, ownerProgramId: PublicKey = programId) => {
    if (!publicKey) {
      return;
    }
    if (wallet === undefined) {
      return;
    }
    var accountCost = await connection.getMinimumBalanceForRentExemption(accountSize, 'singleGossip')
    var newAccount = new Account()
    connection.requestAirdrop(publicKey, accountCost)
    var createAccountIx = SystemProgram.createAccount({
      programId: ownerProgramId,
      space: accountSize, // TODO
      lamports: accountCost,
      fromPubkey: publicKey,
      newAccountPubkey: newAccount.publicKey,
    });
    await sendTransaction(connection, wallet, [createAccountIx], [newAccount])
    return(newAccount.publicKey)
  }

  const loadAccount = async (key: string) => {
    const accountPublicKey = new PublicKey(key);
    var data = await getAccountData(connection, accountPublicKey)
    if (data) {
      (document.getElementById('accountData') as HTMLInputElement).value = JSON.stringify(data);
    }
  }

  const createAccount = async () => {
    var size = parseInt((document.getElementById('accountSize') as HTMLInputElement).value)
    var programPublicKey = new PublicKey((document.getElementById('programId') as HTMLInputElement).value)
    history.push("/account/" + await createEmptyAccount(size, programPublicKey))
  }

  const newProject = async () => {
    if (!publicKey) {
      return;
    }
    if (wallet === undefined) {
      return;
    }
    const PROJECT_ACCOUNT_SIZE = 1000
    const STORAGE_ACCOUNT_SIZE = 3200
    var projectAccount = new Account()
    var storageAccount = new Account()
    var createProjectAccountIx = SystemProgram.createAccount({
      programId: programId,
      space: PROJECT_ACCOUNT_SIZE, // TODO
      lamports: await connection.getMinimumBalanceForRentExemption(PROJECT_ACCOUNT_SIZE, 'singleGossip'),
      fromPubkey: publicKey,
      newAccountPubkey: projectAccount.publicKey,
    });
    var createStorageAccountIx = SystemProgram.createAccount({
      programId: programId,
      space: STORAGE_ACCOUNT_SIZE, // TODO
      lamports: await connection.getMinimumBalanceForRentExemption(STORAGE_ACCOUNT_SIZE, 'singleGossip'),
      fromPubkey: publicKey,
      newAccountPubkey: storageAccount.publicKey,
    });
    const createProjectIx = new TransactionInstruction({
      keys: [
        { pubkey: publicKey, isSigner: true, isWritable: false },
        { pubkey: projectAccount.publicKey, isSigner: false, isWritable: true },
        { pubkey: storageAccount.publicKey, isSigner: false, isWritable: true },
        { pubkey: publicKey, isSigner: false, isWritable: false },
      ],
      programId: programId,
      data: Buffer.from([4, 0]),
    });
    await sendTransaction(connection, wallet, [createProjectAccountIx, createStorageAccountIx, createProjectIx], [projectAccount, storageAccount]).then(() => {
      cookies.set('projectKey', projectAccount.publicKey.toBase58())
      history.push("/#/account/" + storageAccount.publicKey.toBase58());
    })
  }

  const setAccountData = async (accountPublicKey: PublicKey, data: Buffer, offset: number = 0) => {
    console.log(offset)
    const MAX_DATA_SIZE = 1000
    if (wallet === undefined || !wallet.publicKey)
      return
    if (data.length <= MAX_DATA_SIZE) {
      console.log('small')
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
      console.log('sending')
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
      console.log('sending')
      await sendTransaction(connection, wallet, [saveAccountIx], [], false).then(async () => {
        console.log('new')
        await setAccountData(accountPublicKey, data.slice(MAX_DATA_SIZE), offset + MAX_DATA_SIZE)
      })
    }
  }

  const saveAccount = async (key: string) => {
    if (!publicKey) {
      return;
    }
    if (wallet === undefined) {
      return;
    }
    let writer = new BinaryWriter()
    const accountPublicKey = new PublicKey(key);
    var jsonData = JSON.parse((document.getElementById('accountData') as HTMLInputElement).value)
    var accountData = Buffer.from(jsonData.data);
    setAccountData(accountPublicKey, accountData, 0)

    // const saveAccountIx = new TransactionInstruction({
    //   keys: [
    //     { pubkey: accountPublicKey, isSigner: false, isWritable: true },
    //   ],
    //   programId: programId,
    //   data: Buffer.concat([ Buffer.from([3, 0]), accountData]),
    // });
    // sendTransaction(connection, wallet, [saveAccountIx], []);
  }

  const airdrop = () => {
    if (!publicKey || wallet === undefined) {
      return;
    }
    connection.requestAirdrop(publicKey, 5 * LAMPORTS_PER_SOL)
  }


  let { accountKey } = useParams<AccountViewParams>();
  if (accountKey) {
    loadAccount(accountKey);
  }



  return (
    <div>
      {!connected && <ConnectButton />}
      { accountKey ? 
        <div>
          <Button id = 'saveButton' onClick = { () => { saveAccount(accountKey) } }>Save</Button>
          <Input.TextArea id = 'accountData'></Input.TextArea>
        </div>
        : 
        <div>
          Program: <Input defaultValue={programId.toBase58()} id="programId"/>
          Size: <Input id="accountSize"/>
          <Button id = 'createButton' onClick = { () => { createAccount() } }>New</Button>
          <Button id = 'newProject' onClick = { () => { newProject() } }>New project</Button>
        </div> }
      <Button onClick={airdrop}>Airdrop</Button>
    </div>
  );
};
