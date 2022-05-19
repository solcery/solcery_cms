import React, { useEffect, useCallback, useState } from "react";
import ReactDOM from 'react-dom'
import { useConnection, sendTransaction } from "../../contexts/connection";
import { useProject } from "../../contexts/project";
import { useWallet } from "../../contexts/wallet";
import { PublicKey, Account, TransactionInstruction } from "@solana/web3.js";
import { SystemProgram } from "@solana/web3.js";
import { notify } from "../../utils/notifications";

import { useInterval } from "../../utils/utils";
import {
  deserializeUnchecked, BinaryReader, BinaryWriter, serialize
} from 'borsh';
import { SType } from "../../solcery/types"

import { Form, Button, Input, Table, Spin } from "antd";

import { useParams, useHistory } from "react-router-dom";
import { TplObject, TemplateField, TemplateData, SolcerySchema, Storage } from "../../solcery/classes"
import { programId, projectPublicKey } from "../../solcery/engine"

const { Column } = Table;

export async function onWalletConnected() {}

type ObjectViewParams = {
  templateKey: string;
  objectId: string;
};

const MAX_DATA_SIZE = 700


export const ObjectView = () => {

  const { project } = useProject();
  let { templateKey, objectId } = useParams<ObjectViewParams>();
  const connection = useConnection();
  const { wallet, publicKey } = useWallet();
  var [ object, setObject ] = useState<any>(undefined);
  const [ fields, setFields ] = useState<any>(undefined)
  const [ revision, setRevision ] = useState(0)
  var [ template, setTemplate ] = useState<any>(undefined);
  var [ brickTreeActive, setBrickTreeActive ] = useState(false);
  let history = useHistory();
  var objectPublicKey = new PublicKey(objectId)

  const sendTransactionChain = async (
    transactionChain: any[], 
    onAllSigned?: () => void,
  ) => {
    if (!publicKey || wallet === undefined) return;
    return (async () => {
      let transactionNumber = 0;
      for (let transactionData of transactionChain) {
        transactionNumber ++;
        if (transactionNumber < transactionChain.length) {
          await sendTransaction(connection, wallet, transactionData.instructions, transactionData.accounts, true)
        } else {
          return sendTransaction(connection, wallet, transactionData.instructions, transactionData.accounts, true, onAllSigned)
        }
      }
    })();
  }

  const setAccountDataWithNonce = async (accountPublicKey: PublicKey, data: Buffer, onAllSigned?: () => void) => {
    if (!publicKey || wallet === undefined)
      return;

    var nonceAccount = new Account()
    let transactions: any[] = []

    let instructions: TransactionInstruction[] = []
    instructions.push(SystemProgram.createAccount({
      programId: programId,
      space: 3200 - 69, // TODO
      lamports: await connection.getMinimumBalanceForRentExemption(3200-69, 'singleGossip'),
      fromPubkey: publicKey,
      newAccountPubkey: nonceAccount.publicKey,
    }));
    transactions.push({
      instructions: instructions, 
      accounts: [ nonceAccount ]
    })

    let pos = 0
    while (pos < data.length) {
      let pos2 = Math.min(data.length, pos + MAX_DATA_SIZE)
      let writer = new BinaryWriter()
      writer.writeU8(3) // crud
      writer.writeU8(0) // write
      writer.writeU64(pos)
      const saveAccountIx = new TransactionInstruction({
        keys: [
          { pubkey: publicKey, isSigner: true, isWritable: false },
          { pubkey: nonceAccount.publicKey, isSigner: false, isWritable: true },
        ],
        programId: programId,
        data: Buffer.concat([ 
          writer.buf.slice(0, writer.length),
          data.slice(pos, pos2),
        ]),
      });
      transactions.push({
        instructions: [ saveAccountIx ],
        accounts: [ nonceAccount ]
      })
      pos = pos2
    }

    let copyIx = new TransactionInstruction({
      keys: [
        { pubkey: publicKey, isSigner: true, isWritable: false },
        { pubkey: project.pubkey, isSigner: false, isWritable: false },
        { pubkey: accountPublicKey, isSigner: false, isWritable: true },
        { pubkey: nonceAccount.publicKey, isSigner: false, isWritable: false },
      ],
      programId: programId,
      data: Buffer.from([1, 2]),
    });
    transactions.push({
      instructions: [ copyIx ],
      accounts: [ nonceAccount ]
    })

    return sendTransactionChain(transactions, onAllSigned)
  }

  const saveObject = async () => {
    if (!object || !template || !project)
      return;

    let newFields: any = {}
    Object.values(fields).forEach((field:any) => {
      if (field.value) {
        newFields[field.field.code] = field.value
      }
    })
    let oldFields = object.fields
    object.fields = newFields
    let data = object.toBinary()

    object.fields = oldFields

    if (data.length < MAX_DATA_SIZE) {
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
      await sendTransaction(connection, wallet, [saveObjectIx], [], true, () => { 
        history.push('/template/' + templateKey) 
      }).then(async () => {
        await object.load(connection)
        notify({ message: "Object saved successfully", description: objectId })
      },
      () => {
        notify({ message: "Object saving error", description: objectId })
      })
    } else {
      setAccountDataWithNonce(objectPublicKey, data, () => {
        history.push('/template/' + templateKey) 
      }).then(async () => {
        await object.load(connection)
        notify({ message: "Object saved successfully", description: objectId })
      }, () => {
        notify({ message: "Object saving error", description: objectId })
      })
    }
  }

  useEffect(() => { 
    if (!project) return;
    setTemplate(project.getTemplate(templateKey))
  }, [ project ]);

  useEffect(() => {
    if (!template) return;
    if (object) return;
    let obj = template.getObject(objectId)
    if (obj) {
      setObject(obj)
      setRevision(0)
    } else {
      new Promise(resolve => setTimeout(resolve, 50)).then(() => { setRevision(revision - 1) })
    }
    setObject(template.getObject(objectId))
  }, [ template, revision ]);

  const loadObjectFields = (obj: any) => {
    let fields: any = {}
    Object.values(template.fields).forEach((field: any) => {
      let value = obj.fields[field.code]
      fields[field.code] = {
        field: field,
        value: value ? field.fieldType.cloneValue(value) : undefined,
        valid: true,
      }
    })
    setFields(fields)
  }

  useEffect(() => {
    if (!object) return;
    if (!object.isLoaded) {
      object.await(connection).then((object: any) => {
        loadObjectFields(object)
      })
      return;
    }
    loadObjectFields(object)

  }, [ object, project ]);

  useEffect(() => {
    if (brickTreeActive) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.keyCode === 27) { //Escape
        if (revision == 0) {
          history.push('/template/' + templateKey)
        } else {
          if (window.confirm('You have unsaved changes. Sure to exit?')) {
            history.push('/template/' + templateKey)
          }
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [ brickTreeActive ]);

  const onActivate = (newValue: any) => {
    setBrickTreeActive(newValue);
  }

  const setFieldValue = (code: string, value: any) => {
    if (!object)
      return;
    fields[code] = {
      key: code,
      value: value,
      field: fields[code].field,
      valid: fields[code].field.fieldType.validate(value, object),
    }
    setRevision(revision + 1)
  }

  if (fields) {
    var objectData = Object.values(fields).map((objField: any) => objField)
    return (
      <div style={ { width: '100%' } } >
        <h3>{'[ ' + object.intId + ' ] ' + object.id}</h3>
        <Table dataSource={objectData} pagination={false} rowKey={(record: any) => record.field.code}>
            <Column
              title="Field" key="field"
              render={(text, record: any) => <p style = {!record.valid ? { color: 'red' } : undefined}>{record.field.name}</p>}
            />
            <Column
              title="Value" key="value"
              render={(text, record: any) => <record.field.fieldType.valueRender  
                type={record.field.fieldType}
                defaultValue={record.value} 
                onChange= {(newValue: any) => {
                  setFieldValue(record.field.code, newValue) 
                }}
                onActivate={ (record.field.fieldType instanceof SType) && onActivate }
              />     
              }
            />
          </Table>
          <Button onClick={saveObject}>Save</Button>
      </div>
    )
  }

  return (<div><Spin size='large'/></div>);
};
