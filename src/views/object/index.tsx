import React, { useEffect, useCallback, useState } from "react";
import ReactDOM from 'react-dom'
import { useConnection, sendTransaction} from "../../contexts/connection";
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


export async function onWalletConnected() {}

type ObjectViewParams = {
  objectId: string;
};


export const ObjectView = () => {

  const { Column } = Table;
  let { objectId } = useParams<ObjectViewParams>();
  const connection = useConnection();
  const { wallet, publicKey } = useWallet();
  var [ object, setObject ] = useState<TplObject | undefined>(undefined);
  var [ template, setTemplate ] = useState<TemplateData | undefined>(undefined);
  let history = useHistory();
  var objectPublicKey = new PublicKey(objectId)

  const saveObject = async () => {
    if (!publicKey || wallet === undefined)
      return;
    if (!object)
      return;
    var buf = await object.serialize(connection)

    const saveObjectIx = new TransactionInstruction({
      keys: [
        { pubkey: objectPublicKey, isSigner: false, isWritable: true },
      ],
      programId: programId,
      data: Buffer.concat([ Buffer.from([1, 1]), buf]),
    });
    sendTransaction(connection, wallet, [saveObjectIx], []).then(() => {
      history.push("/object/" + objectId);
    })
  }

  useEffect(() => { 
    if (!object) {
      (async () => {
        var tpl = await TplObject.getTemplate(connection, objectPublicKey)
        var obj = await tpl.getObject(connection, objectPublicKey)
        setObject(obj)
        setTemplate(tpl)
      })()
    }
  });

  const setFieldValue = (fieldId: number, value: any) => {
    if (!object)
      return;
    if (value) 
      object.fields.set(fieldId, value)
    else
      object.fields.delete(fieldId)
  }

  if (object && template) {
    type ObjectFieldData = {
      key: number,
      fieldId: number,
      fieldName: string,
      fieldType: SType,
      value: any,
    }
    var objectData: ObjectFieldData[] = []
    if (object != undefined && template != undefined) {
      for (let field of template.fields) {
        objectData.push({
          key: field.id,
          fieldId: field.id,
          fieldType: field.fieldType,
          fieldName: field.name,
          value: object.fields.get(field.id)
        })
      }
    }
    const divStyle = {
      width: '100%',
    };
    return (
    <div style={divStyle}>
      <a href={"/#/template/" + object.template.toBase58()}>Template: {template?.name}</a>
      <Table dataSource={objectData} pagination={false}>
          <Column title="Field" dataIndex="fieldName" key="fieldName"/>
          <Column
            title="Value"
            key="value"
            render={(text, record: ObjectFieldData) => React.createElement(
                record.fieldType.valueRender,
                { 
                  type: record.fieldType,
                  defaultValue: record.value, 
                  onChange: (newValue: any) => { 
                    setFieldValue(record.fieldId, newValue) 
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
