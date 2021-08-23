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

export async function onWalletConnected() {
  

}


type AccountViewParams = {
  accountKey: string;
};

export const AccountView = () => {



  const connection = useConnection();
  const { wallet, publicKey } = useWallet();
  const history = useHistory();

  const createEmptyAccount = async (accountSize: number) => {
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
      programId: programId,
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
    window.location.replace("/#/account/" + await createEmptyAccount(size) );
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
        { pubkey: projectAccount.publicKey, isSigner: false, isWritable: true },
        { pubkey: storageAccount.publicKey, isSigner: false, isWritable: true },
        { pubkey: publicKey, isSigner: true, isWritable: false },
      ],
      programId: programId,
      data: Buffer.from([4, 0]),
    });
    await sendTransaction(connection, wallet, [createProjectAccountIx, createStorageAccountIx, createProjectIx], [projectAccount, storageAccount]).then(() => {
      history.push("/#/account/" + storageAccount.publicKey.toBase58());
    })
  }


  const saveAccount = async (key: string) => {
    if (!publicKey) {
      return;
    }
    if (wallet === undefined) {
      return;
    }
    const accountPublicKey = new PublicKey(key);
    var jsonData = JSON.parse((document.getElementById('accountData') as HTMLInputElement).value)
    var accountData = Buffer.from(jsonData.data);
    const saveAccountIx = new TransactionInstruction({
      keys: [
        { pubkey: accountPublicKey, isSigner: false, isWritable: true },
      ],
      programId: programId,
      data: Buffer.concat([ Buffer.from([3, 0]), accountData]),
    });
    sendTransaction(connection, wallet, [saveAccountIx], []);
  }

  let { accountKey } = useParams<AccountViewParams>();
  if (accountKey) {
    console.log(accountKey)
    loadAccount(accountKey);
  }

  return (
    <div>
      { accountKey ? 
        <div>
          <Button id = 'saveButton' onClick = { () => { saveAccount(accountKey) } }>Save</Button>
          <Input.TextArea id = 'accountData'></Input.TextArea>
        </div>
        : 
        <div>
          <Input id = "accountSize"></Input>
          <Button id = 'createButton' onClick = { () => { newProject() } }>New</Button>
        </div> }
      <table id = "templateTable"></table>
    </div>
  );
};
