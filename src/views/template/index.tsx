import React, { useCallback, useState, useEffect } from "react";
import { useConnection, sendTransaction} from "../../contexts/connection";
import { useWallet } from "../../contexts/wallet";
import { LAMPORTS_PER_SOL, PublicKey, Account, TransactionInstruction } from "@solana/web3.js";
import { SystemProgram } from "@solana/web3.js";
import { useParams, useHistory } from "react-router-dom";
import { Button, Table, Input } from "antd";
import { TemplateData, TemplateField, SolcerySchema, Storage, TplObject } from "../../solcery/classes"
import { Template } from '../../content/template';
import { programId } from "../../solcery/engine"
import { useProject } from "../../contexts/project";
import Cookies from 'universal-cookie';


type TemplateViewParams = {
  templateKey: string;
};

export const TemplateView = () => {

  const cookies = new Cookies()
  const { Column } = Table;
  const connection = useConnection();
  const { wallet, publicKey } = useWallet();

  let history = useHistory();
  let { templateKey } = useParams<TemplateViewParams>();
  var [ template, setTemplate ] = useState<any>(undefined);
  var [ objects, setObjects ] = useState<any>(undefined);
  var [ storage, setStorage ] = useState<any>(undefined);
  var { project } = useProject();
  var [ revision, setRevision ] = useState(0)
  let [ filter, setFilter ] = useState<any>(undefined)


  const copyToAnotherProject = async (src: PublicKey ) => {
    if (!publicKey || !project || wallet === undefined) {
      return;
    }
    var instructions = [];

    let proj = new PublicKey("J2TDJcbUXev6SNJMqq5QAtvxsZdHDyjwnQdLSqJLL2kk")
    let otherTpl = await TemplateData.get(connection, new PublicKey("H5vre6xcj5wqRzASoToNV284vaXzxsBGVBYqPeLpFiwS"))
    var objectAccount = new Account()
    instructions.push(SystemProgram.createAccount({
      programId: programId,
      space: 3200, // TODO
      lamports: await connection.getMinimumBalanceForRentExemption(3200, 'singleGossip'),
      fromPubkey: publicKey,
      newAccountPubkey: objectAccount.publicKey,
    }));
    instructions.push(new TransactionInstruction({
      keys: [
        { pubkey: publicKey, isSigner: true, isWritable: false },
        { pubkey: proj, isSigner: false, isWritable: true },
        { pubkey: otherTpl.publicKey, isSigner: false, isWritable: false },
        { pubkey: otherTpl.storages[0], isSigner: false, isWritable: true },
        { pubkey: objectAccount.publicKey, isSigner: false, isWritable: true },
      ],
      programId: programId,
      data: Buffer.from([1, 0]),
    }));
    if (src) {
      instructions.push(new TransactionInstruction({
        keys: [
          { pubkey: publicKey, isSigner: true, isWritable: false },
          { pubkey: proj, isSigner: false, isWritable: false },
          { pubkey: objectAccount.publicKey, isSigner: false, isWritable: true },
          { pubkey: src, isSigner: false, isWritable: false },
        ],
        programId: programId,
        data: Buffer.from([1, 2]),
      }));
    }
    sendTransaction(connection, wallet, instructions, [objectAccount])
  }

  const createObject = async (src: PublicKey | undefined = undefined) => {
    if (!publicKey || !project || wallet === undefined || !template) {
      return;
    }
    var instructions = [];

    if (!template.storage)
      throw new Error("Template.createObject error - storage is empty")
    var objectAccount = new Account()
    instructions.push(SystemProgram.createAccount({
      programId: programId,
      space: 3200, // TODO
      lamports: await connection.getMinimumBalanceForRentExemption(3200, 'singleGossip'),
      fromPubkey: publicKey,
      newAccountPubkey: objectAccount.publicKey,
    }));
    instructions.push(new TransactionInstruction({
      keys: [
        { pubkey: publicKey, isSigner: true, isWritable: false },
        { pubkey: project.pubkey, isSigner: false, isWritable: true },
        { pubkey: template.pubkey, isSigner: false, isWritable: false },
        { pubkey: template.storage.pubkey, isSigner: false, isWritable: true },
        { pubkey: objectAccount.publicKey, isSigner: false, isWritable: true },
      ],
      programId: programId,
      data: Buffer.from([1, 0]),
    }));
    if (src) {
      instructions.push(new TransactionInstruction({
        keys: [
          { pubkey: publicKey, isSigner: true, isWritable: false },
          { pubkey: project.pubkey, isSigner: false, isWritable: false },
          { pubkey: objectAccount.publicKey, isSigner: false, isWritable: true },
          { pubkey: src, isSigner: false, isWritable: false },
        ],
        programId: programId,
        data: Buffer.from([1, 2]),
      }));
    }
    sendTransaction(connection, wallet, instructions, [objectAccount]).then(() => {
      history.push('/template/' + template.pubkey.toBase58() + '/' + objectAccount.publicKey.toBase58());
    })
  }


  const deleteObject = async(objectPublicKey: PublicKey) => {
    if (!publicKey || wallet === undefined) 
      return;
    if (!project || !template)
      return
    if (!template.storage)
      throw new Error("Template.createObject error - storage is empty")
    const popFromStorageIx = new TransactionInstruction({
      keys: [
        { pubkey: publicKey, isSigner: true, isWritable: false },
        { pubkey: project.pubkey, isSigner: false, isWritable: false },
        { pubkey: template.storage.pubkey, isSigner: false, isWritable: true },
        { pubkey: objectPublicKey, isSigner: false, isWritable: false },
      ],
      programId: programId,
      data: Buffer.from([2, 1]),
    });
    sendTransaction(connection, wallet, [popFromStorageIx], []).then(() => {
      history.push('/template/' + templateKey);
    })
  }

  const applyFilter = (value: string) => {
    setFilter(value)
    cookies.set(templateKey + '.filter.name', value)
  }

  useEffect(() => {
    setFilter(cookies.get(templateKey + '.filter.name'))
  }, [])

  useEffect(() => { 
    if (project) {
      let template = project.getTemplate(templateKey)
      setStorage(template.storage)
      setTemplate(template)
    }
  }, [ project, templateKey ]);

  useEffect(() => { 
    if (template) {
      setObjects(template.getObjects())
    }
  }, [ template ]);


  useEffect(() => {
    if (!storage)
      return
    let subscriptionId = storage.addEventSubscription('onLoaded', (storage: any) => {
      setObjects(template.getObjects())
    })
    // return () => {
    //   storage.removeEventSubscription('onLoad', subscriptionId)
    // };
  }, [ storage ])

  if (objects)
  {
    var tableData: any[] = []
    for (let objectInfo of objects) {
      let name = objectInfo.fields.name
      if (filter === undefined || (name && name.toLowerCase().includes(filter.toLowerCase()))) {
        tableData.push(objectInfo)
      }
    }

    const divStyle = {
      width: '100%',
    };
    return (
    <div style = {divStyle}>
      <Table dataSource={tableData} >
        <Column 
          title="Object" 
          key="objectKey"
          render={(text, record: any) => (
              <a href={"/#/template/"+ template.id + '/' + record.id}>{ record.id.substring(0,4) + ' . . . ' + record.id.substring(40)}</a>
          )}
        />
        {Object.values(template.fields).map((field: any) => { 
          return <Column 
            title = { field.name + ((field.id === 1 && filter) ? ' : [' + filter + ']' : '') } 
            key = { field.id } 
            filterDropdown={field.id === 1 && <Input defaultValue={filter} onChange={(event: any) => { applyFilter(event.target.value) }}/>}
            sorter = { field.fieldType.sorter && ((a: any, b: any) => { 
              return field.fieldType.sorter(a[field.id], b[field.id]) 
            }) }
            render = {
              (text, object: any) => {
                return React.createElement(
                  field.fieldType.valueRender,
                  { 
                    type: field.fieldType,
                    defaultValue: object.fields[field.code], 
                    readonly: true
                  }
                )
              }
            }
          />
        })}
        <Column 
          title="Actions"
          key="actions"
          render={(text, object: any) =>
          <div>
            <Button onClick={() => { createObject(new PublicKey(object.pubkey)) }}>Copy</Button>  
            <Button onClick={() => { deleteObject(new PublicKey(object.pubkey)) }}>Delete</Button>  
          </div>} //TODO: delete: accountCleanup, confirmation
        />
      </Table>
      <Button onClick={() => { createObject() }}>Create new object</Button>
    </div>
    )
  }
  return (
    <div>
      Loading
    </div>
  );
};

