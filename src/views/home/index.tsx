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
import { Project, TemplateData, SolcerySchema, Storage} from "../../solcery/classes"
import { getAccountObject, programId, projectPublicKey, projectStoragePublicKey} from "../../solcery/engine";
import { useParams, useHistory } from "react-router-dom";
import { Button, Input } from "antd";



export async function onWalletConnected() {
  

}
type HomeViewParams = {
  accountKey: string;
};

export const HomeView = () => {




  const connection = useConnection();
  const { wallet, publicKey } = useWallet();
  const history = useHistory();

  const getAccountData = async (publicKey: PublicKey) => {
    var accountInfo = await connection.getAccountInfo(publicKey);
    return accountInfo?.data
  }

  const createTemplate = async () => {
    if (!publicKey) {
      return;
    }
    if (wallet === undefined) {
      return;
    }

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
        { pubkey: projectPublicKey, isSigner: false, isWritable: true },
        { pubkey: templateAccount.publicKey, isSigner: false, isWritable: true },
        { pubkey: storageAccount.publicKey, isSigner: false, isWritable: true },
        { pubkey: projectStoragePublicKey, isSigner: false, isWritable: true },
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
    </div>
  );
};
