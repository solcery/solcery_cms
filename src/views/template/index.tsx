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
import { notify } from "../../utils/notifications";
import { SString } from "../../solcery/types";


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
  let [ filter, setFilter ] = useState<any>()


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
        data: Buffer.from([1, 3]),
      }));
    }
    sendTransaction(connection, wallet, instructions, [objectAccount], true).then(() => {
      notify({ 
        message: "Object created", 
        description: 'CLICK TO OPEN', 
        url: '/#/template/' + template.pubkey.toBase58() + '/' + objectAccount.publicKey.toBase58()
      })
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
    sendTransaction(connection, wallet, [popFromStorageIx], [], true).then(() => {
      notify({ 
        message: "Object deleted",
        color: "#FFDDDD"
      })
    })
  }

  const applyFilter = (value: string, field: any) => {
    if (!filter) filter = {};
    filter[field.code] = value;
    let code: string = field.code;
    cookies.set(`${templateKey}.filter.${code}`, value);
    setFilter(JSON.parse(JSON.stringify(filter)));
  }

  useEffect(() => { 
    if (project) {
      let template = project.getTemplate(templateKey)
      setStorage(template.storage)
      setTemplate(template)
    }
  }, [ project, templateKey ]);

  useEffect(() => { 
    if (!template) return;
    let objects = template.getObjects()
    setObjects(objects)
    let flt: any = {}
    for (let fld of Object.values(template.fields)) {
      let field: any = fld as any;
      let code: string = field.code
      let fltValue = cookies.get(`${templateKey}.filter.${code}`)
      if (fltValue) flt[code] = fltValue;
    }
    setFilter(flt);
    

    let subscriptions: any[] = []
    for (let object of template.getObjects()) {
      subscriptions.push({
        object,
        id: object.addEventSubscription('onLoad', (storage: any) => {
          setRevision(revision + 1)
        })
      })
    }
    return () => {
      subscriptions.forEach((subscription: any) => {
        subscription.object.removeEventSubscription('onLoad', subscription.id)
      })
    };

  }, [ template ]);


  useEffect(() => {

  })

  useEffect(() => {
    if (!storage)
      return
    let storageReloadSubscriptionId = storage.addEventSubscription('onStorageFullyLoaded', (storage: any) => {
      setObjects(template.getObjects())
    })
    let objectReloadSubscriptionId = storage.addEventSubscription('onObjectReload', (storage: any, object: any) => {
      setObjects(template.getObjects())
    })
    return () => {
      storage.removeEventSubscription('onStorageFullyLoaded', storageReloadSubscriptionId)
      storage.removeEventSubscription('onObjectReload', objectReloadSubscriptionId)
    };
  }, [ storage ])

  if (objects)
  {
    let tableData: any[] = [ ...objects ];
    if (filter) {
      for (let code of Object.keys(filter)) {
        tableData = tableData.filter((objectInfo: any) => {
          let val = objectInfo.fields[code]
          let filterValue: string = filter[code] as string;
          if (filterValue === '') return true;
          if (!val) return false;
          return val && val.toLowerCase().includes(filterValue.toLowerCase())
        })
      }
    }


    const divStyle = {
      width: '100%',
    };
    return (
    <div style = {divStyle}>
      <Table 
        dataSource={tableData} 
        rowKey={(record: any) => record.pubkey.toBase58()}
        onRow={(record: any) => {
          return {
            onDoubleClick: event => { history.push('/template/'+ templateKey +'/' + record.id) }, 
          };
        }}
      >
        <Column 
          title="Object" 
          key="objectKey"
          render={(text, record: any) => (
              <a href={"/#/template/"+ template.id + '/' + record.id}>{ '[' + record.intId + ']'}</a>
          )}
        />
        {Object.values(template.fields).map((field: any) => { 
          return <Column 
            title = { `${field.name}${ filter[field.code] ? ' [ ' + filter[field.code] + ' ] ' : '' }` } 
            key = { field.id } 
            filterDropdown={field.fieldType instanceof SString && 
              <Input defaultValue={filter[field.code]} onChange={(event: any) => { applyFilter(event.target.value, field) }}/>
            }
            sorter = { field.fieldType.sorter && ((a: any, b: any) => { 
              return field.fieldType.sorter(a.fields[field.code], b.fields[field.code]) 
            }) }
            render = {(text, object: any) => <field.fieldType.valueRender 
                type={field.fieldType}
                defaultValue={object.fields[field.code]}
                readonly={true}
              />
            }
          />
        })}
        <Column 
          title="Actions"
          key="actions"
          render={(text, object: any) =>
          <div key={ 'actions.' + object.pubkey.toBase58() }>
            <Button key={ 'copy.' + object.pubkey.toBase58() } onClick={() => { createObject(new PublicKey(object.pubkey)) }}>Copy</Button>  
            <Button key={ 'delete.' + object.pubkey.toBase58() } onClick={() => { 
              if (window.confirm('Deleting object [' + object.intId + '] ' + object.fields.name + '. Are you sure?'))
                deleteObject(new PublicKey(object.pubkey)) 
            }}>Delete</Button>  
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

