import React, { useCallback, useEffect, useState } from "react";
import ReactDOM from 'react-dom'
import { useConnection, sendTransaction} from "../../../contexts/connection";
import { useWallet } from "../../../contexts/wallet";
import { PublicKey, Account, TransactionInstruction } from "@solana/web3.js";
import { Popup } from "../../../components/Popup";

import { Button, Select, Input } from "antd";
import { BinaryWriter } from "borsh";

import { programId } from "../../../solcery/engine"
import { solceryTypes, SType, SubtypeRender } from "../../../solcery/types"

export const AddFieldPopup = (props: { templateKey: string }) => {

  const { Option } = Select;
  var [ visible, setVisible ] = useState(false)

  var [ fieldType, setFieldType ] = useState<SType>(new SType()) //TODO: new field component
  var [ fieldTypeNum, setFieldTypeNum ] = useState(1);
  var [ fieldSubtype, setFieldSubtype ] = useState<any|undefined>(undefined)
  var [ fieldName, setFieldName ] = useState('')
  const connection = useConnection();
  const { wallet, publicKey } = useWallet();

  var toggleAddFieldMenu = () => {
    setVisible(!visible)
  }

  var onFieldTypeChange = (typeId: number) => {
    setFieldTypeNum(typeId)
  }

  var onFieldSubtypeChange = (newValue: any) => {
    console.log(newValue)
    setFieldType(newValue)
  }

  const addField = async () => {
    if (!publicKey || wallet === undefined) {
      return;
    }
    var templatePublicKey = new PublicKey(props.templateKey)
    var data = Buffer.concat([
      Buffer.from([0, 1]), 
      fieldType.toBuffer(),
      Buffer.from([fieldName.length, 0, 0, 0]), //TODO
      Buffer.from(fieldName),
      Buffer.from([1, 1]), 
    ])
    console.log(data)
    const addFieldIx = new TransactionInstruction({
      keys: [
        { pubkey: templatePublicKey, isSigner: false, isWritable: true },
      ],
      programId: programId,
      data: data,
    });
    await sendTransaction(connection, wallet, [addFieldIx], [])
  }
  return (
    <div>
    {visible && <Popup
      content={
      <div>
        Add Field<br/>
        <Select id="fieldType" defaultValue={1} onChange={onFieldTypeChange}>
        {Array.from(solceryTypes().values()).map((solceryType) => 
          <Option key={solceryType.id} value={solceryType.id}>{solceryType.name}</Option>
        )}
        </Select>
        <SubtypeRender typeId={fieldTypeNum} onLoad={onFieldSubtypeChange} onChange={onFieldSubtypeChange}/>
        <Input onChange={(event) => { setFieldName(event.target.value) } }></Input>
        <Button onClick={addField}>Add</Button>
      </div>}
      handleClose={toggleAddFieldMenu}
    />}
    <Button onClick={toggleAddFieldMenu}>Add field</Button>
    </div>
  );
};