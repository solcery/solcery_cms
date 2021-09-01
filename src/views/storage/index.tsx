import React, { useCallback, useState, useEffect } from "react";
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
import { Button, Table } from "antd";
import { TemplateData, TemplateField, SolcerySchema, Storage, TplObject } from "../../solcery/classes"
import { programId, projectPublicKey, projectStoragePublicKey } from "../../solcery/engine"
import { ValueRender } from "../../solcery/types"


export async function onWalletConnected() {}

type StorageViewParams = {
  storageId: string;
};

export const StorageView = () => {

  const { Column } = Table;
  const connection = useConnection();
  const { wallet, publicKey } = useWallet();
  let history = useHistory();
  let { storageId } = useParams<StorageViewParams>();
  var [ storage, setStorage ] = useState<Storage | undefined>(undefined);
  var [ template, setTemplate ] = useState<TemplateData | undefined>(undefined);
  var [ objects, setObjects ] = useState<{publicKey: PublicKey, object: TplObject}[] | undefined>([]);
  var [ objectsAmount, setObjectsAmount] = useState(0)
  var storagePublicKey = new PublicKey(storageId)

  const createObject = async () => {
    if (!publicKey) {
      return;
    }
    if (wallet === undefined) {
      return;
    }
    var storagePublicKey = new PublicKey(storageId)
    var storage = await Storage.get(connection, storagePublicKey)
    var objectAccount = new Account()
    var createObjectAccountIx = SystemProgram.createAccount({
      programId: programId,
      space: 3200, // TODO
      lamports: await connection.getMinimumBalanceForRentExemption(3200, 'singleGossip'),
      fromPubkey: publicKey,
      newAccountPubkey: objectAccount.publicKey,
    });
    const createObjectIx = new TransactionInstruction({
      keys: [
        { pubkey: projectPublicKey, isSigner: false, isWritable: false },
        { pubkey: storage.template, isSigner: false, isWritable: false },
        { pubkey: storagePublicKey, isSigner: false, isWritable: true },
        { pubkey: objectAccount.publicKey, isSigner: false, isWritable: true },
      ],
      programId: programId,
      data: Buffer.from([1, 0]),
    });
    sendTransaction(connection, wallet, [createObjectAccountIx, createObjectIx], [objectAccount]).then(() => {
      history.push('/object/' + objectAccount.publicKey.toBase58());
    })
  }

  const deleteObject = async(objectPublicKey: PublicKey) => {
    if (!publicKey || wallet === undefined) {
      return;
    }
    var storagePublicKey = new PublicKey(storageId)
    const popFromStorageIx = new TransactionInstruction({
      keys: [
        { pubkey: storagePublicKey, isSigner: false, isWritable: true },
        { pubkey: objectPublicKey, isSigner: false, isWritable: false },
      ],
      programId: programId,
      data: Buffer.from([2, 1]),
    });
    sendTransaction(connection, wallet, [popFromStorageIx], []).then(() => {
      history.push('/storage/' + storageId);
    })
  }

  const loadObject = async (objectPublicKey: PublicKey) => {
    var [obj, tpl] = await TplObject.get(connection, objectPublicKey)
    if (objects) {
      console.log(objects)
      objects?.push({
        publicKey: objectPublicKey, 
        object: obj
      })
      setObjectsAmount(objects?.length)
    }
  }


  useEffect(() => { 
    if (!storage) {
      (async () => {
        const strg = await Storage.get(connection, storagePublicKey)
        setStorage(strg)
        for (let objectPublicKey of strg.accounts) {
          loadObject(objectPublicKey)
        }
        const tpl = await TemplateData.get(connection, strg.template)
        setTemplate(tpl)
      })()
    }
  });

  if (storage && template && objects)
  {
    var tableData: any[] = []
    for (let objectInfo of objects) {
      var res = Object.fromEntries(objectInfo.object.fields)
      // var res = { "test" : "test", key: objectInfo.publicKey.toBase58() }
      res.key = objectInfo.publicKey.toBase58()
      res.objectId = res.key
      tableData.push(res)
    }

    const divStyle = {
      width: '100%',
    };
    return (
    <div style = {divStyle}>
      <Table dataSource={tableData} >
        <Column 
          title="Object" 
          key="objectId"
          render={(text, record: any) => (
              <a href={"/#/object/"+record.key}>{record.key}</a>
          )}
        />
        {template.fields.map((field: TemplateField) => { return <Column 
          title={field.name} 
          key={field.id} 
          render={(text, object: any) => (
              <ValueRender 
                type={field.fieldType}
                defaultValue={object[field.id]} 
                readonly={true}
              />
          )}
        />} )}
      </Table>
      <Button onClick={createObject}>Create new object</Button>
    </div>
    )
  }
  return (
    <div>
      Loading
    </div>
  );
};

