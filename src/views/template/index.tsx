import React, { useCallback, useEffect, useState } from "react";
import ReactDOM from 'react-dom'
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
import './style.css';

import { useParams, useHistory } from "react-router-dom";
import { Button, Input, Select, Table } from "antd";
import { Option } from 'rc-select';
import { programId, projectPublicKey, projectStoragePublicKey } from "../../solcery/engine"
import { TemplateData } from "../../solcery/classes"

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

  var toggleAddFieldMenu = () => {
    setAddFieldMenu(!addFieldMenu)
  }

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
    await sendTransaction(connection, wallet, [deleteFieldIx], []).then(() => {
      load()
    })
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

  const addField = async () => {
    if (!publicKey || wallet === undefined) {
      return;
    }
    var templatePublicKey = new PublicKey(templateKey)
    var fieldType = parseInt((document.getElementById('fieldType') as HTMLInputElement).value)

    console.log(document.getElementById('fieldType') as HTMLSelectElement)
    var fieldName = (document.getElementById('fieldName') as HTMLInputElement).value
    const fieldNameBuffer = Buffer.from(fieldName);
    const addFieldIx = new TransactionInstruction({
      keys: [
        { pubkey: templatePublicKey, isSigner: false, isWritable: true },
      ],
      programId: programId,
      data: Buffer.concat([Buffer.from([0, 1, fieldType]), fieldNameBuffer]),
    });
    await sendTransaction(connection, wallet, [addFieldIx], [])
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
    const tpl = await TemplateData.get(connection, templatePublicKey)
    setTemplate(tpl)
  }

  const Popup = (props: { handleClose: () => void, content: any}) => {
    return (
      <div className="popup-box">
        <div className="box">
          <span className="close-icon" onClick={props.handleClose}>x</span>
          {props.content}
        </div>
      </div>
    );
  };

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
        name: field.name
      })
    }

    const divStyle = {
      width: '100%',
    };

    const blackStyle = {
      backgroundColor: "#101010"
    }
    return (
      <div style = {divStyle}>
        <h2 id="templateName" onClick = { changeName }>{template.name}</h2>
        <a href={"/#/storage/" + template.storages[0].toBase58()}>Objects</a>
        <Table dataSource={tableData} >
          <Column title="ID" dataIndex="id" key="fieldId"/>
          <Column title="Name" dataIndex="name" key="fieldName"/>
          <Column title="Type" dataIndex="fieldType" key="fieldType"/>
        </Table>
      {/*  <Popup trigger={<Button>Add field</Button>} position="right center">
          <div style={popupStyle}>
            Add Field<br/>
            Field type (1 = Integer, 2 = String)<Input id="fieldType"></Input>
            Field name<Input id="fieldName"></Input>
            <Button onClick={addField}>Add</Button>
          </div>
        </Popup>*/}
        {addFieldMenu && <Popup
          content={
          <div style={blackStyle}>
            Add Field<br/>
            Field type (1 = Integer, 2 = String)<Input id="fieldType"></Input>
            Field name<Input id="fieldName"></Input>
            <Button onClick={addField}>Add</Button>
          </div>}
          handleClose={toggleAddFieldMenu}
        />}
        <Button onClick={toggleAddFieldMenu}>Add</Button>
      </div>
    );
  }
  return (
    <div>
      Loading
    </div>
  );
};
