import React, { useCallback, useEffect, useState } from "react";
import ReactDOM from 'react-dom'
import { useConnection, sendTransaction} from "../../contexts/connection";
import { useWallet } from "../../contexts/wallet";
import { LAMPORTS_PER_SOL, PublicKey, Account, TransactionInstruction } from "@solana/web3.js";
import { SystemProgram } from "@solana/web3.js";
import { notify } from "../../utils/notifications";
import { ConnectButton } from "./../../components/ConnectButton";
import { LABELS } from "../../constants";
import './style.css';

import { useParams, useHistory } from "react-router-dom";
import { Button, Table } from "antd";

import { programId } from "../../solcery/engine"
import { TemplateData, SolcerySchema, TemplateField } from "../../solcery/classes"
import { AddFieldPopup } from "./AddFieldPopup";

import { deserializeUnchecked, serialize } from "borsh"

import 'reactjs-popup/dist/index.css';

export async function onWalletConnected() {}

type TemplateViewParams = {
  templateKey: string;
};

export const TemplateView = () => {

  const { Column } = Table;
  const connection = useConnection();
  const { wallet, publicKey } = useWallet();
  let history = useHistory();
  let { templateKey } = useParams<TemplateViewParams>();
  var templatePublicKey = new PublicKey(templateKey)
  var [ template, setTemplate ] = useState<TemplateData | undefined>()
  var [ addFieldMenu, setAddFieldMenu ] = useState(false)


  const deleteField = async (fieldId: number) => {
    if (!publicKey || wallet === undefined) {
      return;
    }
    var templatePublicKey = new PublicKey(templateKey)
    var buf = Buffer.allocUnsafe(4);
    buf.writeUInt32LE(fieldId);
    const deleteFieldIx = new TransactionInstruction({
      keys: [
        { pubkey: templatePublicKey, isSigner: false, isWritable: true },
      ],
      programId: programId,
      data: Buffer.concat([Buffer.from([0, 2,]), buf ]),
    });
    await sendTransaction(connection, wallet, [deleteFieldIx], [])
    load()
  }

  const sendChangeName = async(templateName: string, templatePublicKey: PublicKey) => {
    if (!publicKey || wallet === undefined) {
      return;
    }
    // var templateName = (document.getElementById('templateName') as HTMLInputElement).value
    var buf = Buffer.allocUnsafe(4)
    buf.writeInt32LE(templateName.length)
    const changeNameIx = new TransactionInstruction({
      keys: [
        { pubkey: templatePublicKey, isSigner: false, isWritable: true },
      ],
      programId: programId,
      data: Buffer.concat([Buffer.from([0, 3]), buf, Buffer.from(templateName)]),
    });
    await sendTransaction(connection, wallet, [changeNameIx], [])
    load()
  }

  function changeName() {
    var templatePublicKey = new PublicKey(templateKey)
    let name = prompt("Enter new name:", "New template name");
    if (name == null || name == "") {
      
    } else {
      sendChangeName(name, templatePublicKey)
    }
  }

  const sendChangeCode = async(templateCode: string, templatePublicKey: PublicKey) => {
    if (!publicKey || wallet === undefined) {
      return;
    }
    var buf = Buffer.allocUnsafe(4)
    buf.writeInt32LE(templateCode.length)
    const changeCodeIx = new TransactionInstruction({
      keys: [
        { pubkey: templatePublicKey, isSigner: false, isWritable: true },
      ],
      programId: programId,
      data: Buffer.concat([Buffer.from([0, 4]), buf, Buffer.from(templateCode)]),
    });
    await sendTransaction(connection, wallet, [changeCodeIx], [])
    load()
  }


  function changeCode() {
    var templatePublicKey = new PublicKey(templateKey)
    let code = prompt("Enter new code:", "newCode");
    if (code == null || code == "") {
      
    } else {
      sendChangeCode(code, templatePublicKey)
    }
  }

  const load = async () => {
    
  }

  useEffect(() => { 
    if (!template || template.publicKey.toBase58() != templateKey)
      (async () => {
        setTemplate(await TemplateData.get(connection, templatePublicKey))
      })()
  });

  if (template) {
    var tableData: any[] = []
    for (let field of template.fields) {
      tableData.push({
        key: field.id,
        id: field.id,
        fieldType: field.fieldType,
        name: field.name,
        code: field.code,
      })
    }

    return (
      <div style = { { width: '100%' } }>
        <h2 id="templateName" onClick = { changeName }>{template.name}</h2>
        <h1 id="templateCode" onClick = { changeCode }>{template.code}</h1>
        <a href={"/#/storage/" + template.storages[0].toBase58()}>Objects</a>
        <Table dataSource={tableData} pagination={false}>
          <Column title="ID" dataIndex="id" key="fieldId"/>
          <Column title="Name" dataIndex="name" key="fieldName"/>
          <Column title="Code" dataIndex="code" key="fieldCode"/>
          <Column
            title="Type"
            key="fieldType"
            render={(text, record: any) => record.fieldType.nameRender}
          />
          <Column
            title="Actions"
            key="actions"
            render={(text, record: any) => (
                <Button onClick={() => { deleteField(record.id)} }>Delete</Button>
            )}
          />
        </Table>
        <AddFieldPopup templateKey = {templateKey}/>
      </div>
    );
  }
  return (
    <div>
      Loading
    </div>
  );
};
