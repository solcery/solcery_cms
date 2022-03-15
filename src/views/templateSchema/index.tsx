import React, { useCallback, useEffect, useState } from "react"; 
import ReactDOM from 'react-dom'
import { useConnection, sendTransaction} from "../../contexts/connection";
import { useProject } from "../../contexts/project";
import { useWallet } from "../../contexts/wallet";
import { PublicKey, Account, TransactionInstruction, SystemProgram } from "@solana/web3.js";
import './style.css';

import { useParams, useHistory } from "react-router-dom";
import { Button, Table, Input } from "antd";

import { programId } from "../../solcery/engine"
import { TemplateData, SolcerySchema, TemplateField } from "../../solcery/classes"
import { TypeSelector } from "../../solcery/types/base/components"
import { SType, SInt } from "../../solcery/types"

import { deserializeUnchecked, serialize } from "borsh"

import 'reactjs-popup/dist/index.css';


const { TextArea } = Input;
const { Column } = Table;

export async function onWalletConnected() {}

type TemplateSchemaViewParams = {
  templateKey: string;
};



export const TemplateSchemaView = () => {

  const connection = useConnection();
  const { wallet, publicKey } = useWallet();
  let { templateKey } = useParams<TemplateSchemaViewParams>();
  let { project } = useProject();
  
  var [ template, setTemplate ] = useState<any>(undefined)
  var [ templateData, setTemplateData ] = useState<any>(undefined)
  var [ revision, setRevision ] = useState(0)

  const newStorage = async () => {
    if (!project || !template)
      return
    if (!publicKey || wallet === undefined) 
      return;
    const STORAGE_ACCOUNT_SIZE = 3200
    var storageAccount = new Account()
    var createStorageAccountIx = SystemProgram.createAccount({
      programId: programId,
      space: STORAGE_ACCOUNT_SIZE, // TODO
      lamports: await connection.getMinimumBalanceForRentExemption(STORAGE_ACCOUNT_SIZE, 'singleGossip'),
      fromPubkey: publicKey,
      newAccountPubkey: storageAccount.publicKey,
    });
    const setStorageIx = new TransactionInstruction({
      keys: [
        { pubkey: publicKey, isSigner: true, isWritable: false },
        { pubkey: project.publicKey, isSigner: false, isWritable: false },
        { pubkey: template.publicKey, isSigner: false, isWritable: true },
        { pubkey: storageAccount.publicKey, isSigner: false, isWritable: true },
      ],
      programId: programId,
      data: Buffer.from([0, 6]),
    });
    sendTransaction(connection, wallet, [createStorageAccountIx, setStorageIx], [storageAccount])
  }

  const update = () => {
    if (!project || !template || !templateData)
      return
    if (!publicKey || wallet === undefined) {
      return;
    }
    let oldValues = {
      name: template.name,
      code: template.code,
      customData: template.customData,
      fields: template.fields,
      maxFieldIndex: template.maxFieldIndex,
    }
    Object.assign(template, templateData)
    try { JSON.parse(templateData.customDataJSON) } catch { throw new Error("Custom data is not a valid JSON") }
    template.customData = template.customDataJSON
    var buf = template.toBinary()
    Object.assign(template, oldValues)
      // let newProjectKey = new PublicKey("J5kfxFrjjouSb3MmScWXMUAYRqkjnbZ8zzaCokVdAv2h")
    const changeNameIx = new TransactionInstruction({
      keys: [
        { pubkey: publicKey, isSigner: true, isWritable: false },
        { pubkey: project.pubkey, isSigner: false, isWritable: false },
        { pubkey: template.pubkey, isSigner: false, isWritable: true },
      ],
      programId: programId,
      data: Buffer.concat([ Buffer.from([0, 5]), Buffer.from(buf) ]),
    });
    sendTransaction(connection, wallet, [changeNameIx], [])
  }

  const addField = async() => {
    if (!templateData)
      return
    let id = templateData.maxFieldIndex + 1
    templateData.fields[id] = {
       id: id,
       code: 'field' + id, 
       fieldType: new SInt(), 
       name: 'Field ' + id, 
    };
    templateData.maxFieldIndex++;
    console.log(templateData)
    setRevision(revision + 1)
  }

  const deleteField = (fieldId: number) => {
    if (!template)
      return
    for (let i = 0; i < template.fields.length; i++) {
      if (template.fields[i].id == fieldId) {
        template.fields.splice(i, 1)
        setRevision(revision + 1)
        return
      }
    }
  }

  const setFieldParam = (fieldId: number, param: string, value: any) => {
    if (!templateData)
      return
    let field = templateData.fields[fieldId]
    if (!field)
      return
    field[param] = value
    setRevision(revision + 1)
  }

  useEffect(() => { 
    if (!project) return;
    setTemplate(project.getTemplate(templateKey))
  }, [ project ]);

  useEffect(() => {
    if (!template) return;
    console.log(template)
    setTemplateData({
      name:template.name,
      code: template.code,
      maxFieldIndex: template.maxFieldIndex,
      fields: Object.assign({}, template.fields),
      customDataJSON: JSON.stringify(template.customData),
    })
  }, [ template ]);

  if (templateData) {
    let tableData = Object.values(templateData.fields).map((field: any) => {
      return {
        key: field.id,
        id: field.id,
        fieldType: field.fieldType,
        name: field.name,
        code: field.code,
      }
    })

    return (
      <div style = { { width: '100%' } }>
        Name: <Input defaultValue={templateData.name} onChange={(e) => { if (templateData) templateData.name = e.target.value }}/>
        Code: <Input defaultValue={templateData.code} onChange={(e) => { if (templateData) templateData.code = e.target.value }}/>
        <Table dataSource={tableData} pagination={false}>
          <Column title="ID" dataIndex="id" key="fieldId"/>
          <Column 
            title="Name" 
            key="name" 
            render={(text, record: any) => <Input 
              defaultValue={record.name}
              onChange={(event) => { 
                setFieldParam(record.id, 'name', event.target.value)
              }}
            />}
          />
          <Column 
            title="Code" 
            key="code" 
            render={(text, record: any) => <Input 
              defaultValue={record.code}
              onChange={(event) => { 
                setFieldParam(record.id, 'code', event.target.value)
              }}
            />}
          />
          <Column
            title="Type"
            key="fieldType"
            render={(text, record: any) => <TypeSelector defaultValue={record.fieldType} onChange={(value) => { 
              setFieldParam(record.id, 'fieldType', value)
            }}/>}
          />
          <Column
            title="Actions"
            key="actions"
            render={(text, record: any) => (
                <Button onClick={() => { deleteField(record.id)} }>Delete</Button>
            )}
          />
        </Table>
        <TextArea rows={4} defaultValue={templateData && templateData.customDataJSON} onChange={(e) => { 
          if (templateData) {
            templateData.customDataJSON = e.target.value
          }
        }} />
        <Button onClick={addField}>Add field</Button>
        <Button onClick={update}>Save</Button>
        <Button onClick={newStorage}>New storage</Button>
      </div>
    );
  }
  return (
    <div>
      Loading
    </div>
  );
};
