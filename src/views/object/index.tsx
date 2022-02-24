import React, { useEffect, useCallback, useState } from "react";
import ReactDOM from 'react-dom'
import { useConnection, sendTransaction } from "../../contexts/connection";
import { useProject } from "../../contexts/project";
import { useWallet } from "../../contexts/wallet";
import { PublicKey, Account, TransactionInstruction } from "@solana/web3.js";
import { SystemProgram } from "@solana/web3.js";
import { notify } from "../../utils/notifications";
import {
  deserializeUnchecked, BinaryReader, BinaryWriter, serialize
} from 'borsh';
import { SType } from "../../solcery/types"

import { Form, Button, Input, Table } from "antd";

import { useParams, useHistory } from "react-router-dom";
import { TplObject, TemplateField, TemplateData, SolcerySchema, Storage } from "../../solcery/classes"
import { programId, projectPublicKey } from "../../solcery/engine"

const { Column } = Table;

export async function onWalletConnected() {}

type ObjectViewParams = {
  templateKey: string;
  objectId: string;
};


export const ObjectView = () => {

  const { project } = useProject();
  let { templateKey, objectId } = useParams<ObjectViewParams>();
  const connection = useConnection();
  const { wallet, publicKey } = useWallet();
  var [ object, setObject ] = useState<any>(undefined);
  const [ fields, setFields ] = useState<any>(undefined)
  var [ template, setTemplate ] = useState<any>(undefined);
  let history = useHistory();
  var objectPublicKey = new PublicKey(objectId)


  const setAccountData = async (accountPublicKey: PublicKey, data: Buffer, offset: number = 0) => {
    const MAX_DATA_SIZE = 700
    if (wallet === undefined || !wallet.publicKey)
      return
    if (data.length <= MAX_DATA_SIZE) {
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
      await sendTransaction(connection, wallet, [saveAccountIx], [], true).then(() => {  // TODO: remove hardcode
        notify({ message: "Object saved successfully", description: objectId })
      },
      () => {
        notify({ message: "Object saving error", description: objectId })
      })

      return true
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
      return await sendTransaction(connection, wallet, [saveAccountIx], [], false).then(async () => {
        await setAccountData(accountPublicKey, data.slice(MAX_DATA_SIZE), offset + MAX_DATA_SIZE)
      })
    }
  }


  const saveObject = async () => {
    if (!object || !template || !project)
      return;
    let oldFields = object.fields
    object.fields = fields
    let data = object.toBinary()
    object.fields = oldFields
    if (data.length < 700) {
      if (!publicKey || wallet === undefined)
        return;
        const saveObjectIx = new TransactionInstruction({
          keys: [
            { pubkey: publicKey, isSigner: true, isWritable: false },
            { pubkey: project.pubkey, isSigner: false, isWritable: false },
            { pubkey: objectPublicKey, isSigner: false, isWritable: true },
          ],
          programId: programId,
          data: Buffer.concat([ Buffer.from([1, 1]), data]),
        });
        await sendTransaction(connection, wallet, [saveObjectIx], [], true).then(() => {
          notify({ message: "Object saved successfully", description: objectId })
        },
        () => {
          notify({ message: "Object saving error", description: objectId })
        })
    } else {
      setAccountData(objectPublicKey, data, 33 + 36)
    }
  }

  useEffect(() => { 
    if (!project)
      return;
    setTemplate(project.getTemplate(templateKey))
  }, [ project ]);

  useEffect(() => {
    if (!template)
      return;
    setObject(template.getObject(objectId))
  }, [ template ]);

  useEffect(() => {
    if (!object)
      return;
    setFields(JSON.parse(JSON.stringify(object.fields)))
  }, [ object ]);

  const setFieldValue = (code: string, value: any) => {
    if (!object)
      return;
    fields[code] = value;
  }

  if (object && template && fields) {
    var objectData = Object.values(template.fields).map((field: any) => {
      return { 
        key: field.id,
        fieldName: field.name,
        field: field,
      }
    })
    return (
      <div style={ { width: '100%' } } >
        <p>{ 'Object [ ' + object.id + ' ]' }</p>
        <Table dataSource={objectData} pagination={false}>
            <Column title="Field" dataIndex="fieldName" key="fieldName"/>
            <Column
              title="Value"
              key="value"
              render={(text, record: any) => React.createElement(
                  record.field.fieldType.valueRender,
                  { 
                    type: record.field.fieldType,
                    defaultValue: fields[record.field.code], 
                    onChange: (newValue: any) => {
                      setFieldValue(record.field.code, newValue) 
                    } 
                  }
                )
              }
            />
          </Table>
          <Button onClick={saveObject}>Save</Button>
      </div>
    )
  }

  return (
    <div>
      Loading
    </div>
  );
};
