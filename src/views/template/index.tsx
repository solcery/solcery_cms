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

import { programId, projectPublicKey, projectStoragePublicKey } from "../../solcery/engine"
import { solceryTypes, TypeNameRender} from "../../solcery/types"
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
    const deleteFieldIx = new TransactionInstruction({
      keys: [
        { pubkey: templatePublicKey, isSigner: false, isWritable: true },
      ],
      programId: programId,
      data: Buffer.concat([Buffer.from([0, 3]), buf, Buffer.from(templateName)]),
    });
    await sendTransaction(connection, wallet, [deleteFieldIx], [])
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

  const load = async () => {
    setTemplate(await TemplateData.get(connection, templatePublicKey))
  }

  useEffect(() => { 
    if (!template) {
      load()
    }
  });

  if (template) {
    var tableData: any[] = []
    for (let field of template.fields) {
      tableData.push({
        key: field.id,
        id: field.id,
        fieldType: field.fieldType,
        name: field.name,
      })
    }

    return (
      <div style = { { width: '100%' } }>
        <h2 id="templateName" onClick = { changeName }>{template.name}</h2>
        <a href={"/#/storage/" + template.storages[0].toBase58()}>Objects</a>
        <Table dataSource={tableData} >
          <Column title="ID" dataIndex="id" key="fieldId"/>
          <Column title="Name" dataIndex="name" key="fieldName"/>
          <Column title="Type" dataIndex="fieldType" key="fieldType"/>
          <Column
            title="Type"
            key="fieldType"
            render={(text, record: any) => (
                <TypeNameRender type={record.fieldType} />
            )}
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
