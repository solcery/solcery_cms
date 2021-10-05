import React, { useCallback, useEffect, useState } from "react";
import ReactDOM from 'react-dom'
import { useConnection, sendTransaction} from "../../contexts/connection";
import { useWallet } from "../../contexts/wallet";
import { PublicKey, Account, TransactionInstruction } from "@solana/web3.js";
import './style.css';

import { useParams, useHistory } from "react-router-dom";
import { Button, Table, Input } from "antd";

import { programId } from "../../solcery/engine"
import { TemplateData, SolcerySchema, TemplateField } from "../../solcery/classes"
import { TypeSelector } from "../../solcery/types/base/components"
import { SType, SInt } from "../../solcery/types"
import { AddFieldPopup } from "./AddFieldPopup";

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

  var [ template, setTemplate ] = useState<TemplateData | undefined>()
  var [ revision, setRevision ] = useState(0)

  const update = () => {
    if (!template)
      return
    if (!publicKey || wallet === undefined) {
      return;
    }
    var buf = Buffer.from(serialize(SolcerySchema, template))
    const changeNameIx = new TransactionInstruction({
      keys: [
        { pubkey: template.publicKey, isSigner: false, isWritable: true },
      ],
      programId: programId,
      data: Buffer.concat([Buffer.from([0, 5]), buf]),
    });
    sendTransaction(connection, wallet, [changeNameIx], [])
  }

  const addField = async() => {
    if (!template)
      return
    template.fields.push(new TemplateField({
       id: template.maxFieldIndex + 1, 
       code: 'newTemplateField', 
       fieldType: new SInt(), 
       name: 'New template field'
    }));
    template.maxFieldIndex++;
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
    if (!template)
      return
    let field = template.getField(fieldId)
    if (!field)
      return
    if (param === 'code')
      field.code = value
    if (param === 'name')
      field.name = value
    if (param === 'fieldType')
      field.fieldType = value
    setRevision(revision + 1)
  }

  useEffect(() => { 
    var templatePublicKey = new PublicKey(templateKey)
    if (!template || template.publicKey.toBase58() != templateKey)
      (async () => {
        setTemplate(await TemplateData.get(connection, templatePublicKey))
      })()
  });

  if (template) {
    let tableData: any[] = []
    for (let field of template.fields) {
      tableData.push({
        key: '' + template.id + '.' + field.id,
        id: field.id,
        fieldType: field.fieldType,
        name: field.name,
        code: field.code,
      })
    }

    return (
      <div style = { { width: '100%' } }>
        Name: <Input defaultValue={template.name} onChange={(e) => { if (template) template.name = e.target.value }}/>
        Code: <Input defaultValue={template.code} onChange={(e) => { if (template) template.code = e.target.value }}/>
        <a href={"/#/storage/" + template.storages[0].toBase58()}>Objects</a>
        <Table dataSource={tableData} pagination={false}>
          <Column title="ID" dataIndex="id" key="fieldId"/>
          <Column 
            title="Name" 
            key="name" 
            render={(text, record: any) => <Input 
              defaultValue={record.name}
              onChange={(event) => { 
                if (template) {
                  let field = template?.getField(record.id); 
                  if (field)
                    field.name = event.target.value 
                }
              }}
            />}
          />
          <Column 
            title="Code" 
            key="code" 
            render={(text, record: any) => <Input 
              defaultValue={record.code}
              onChange={(event) => { 
                if (template) {
                  let field = template?.getField(record.id); 
                  if (field)
                    field.code = event.target.value 
                }
              }}
            />}
          />
          <Column
            title="Type"
            key="fieldTyp"
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
        <TextArea rows={4} defaultValue={template && template.customData} onChange={(e) => { 
          if (template) {
            template.customData = e.target.value
            console.log(template)
          }
        }} />
        <Button onClick={addField}>Add field</Button>
        <Button onClick={update}>Save</Button>
      </div>
    );
  }
  return (
    <div>
      Loading
    </div>
  );
};
