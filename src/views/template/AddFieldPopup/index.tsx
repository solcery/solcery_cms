import React, { useCallback, useEffect, useState } from "react";
import ReactDOM from 'react-dom';
import { useConnection, sendTransaction} from "../../../contexts/connection";
import { useWallet } from "../../../contexts/wallet";
import { PublicKey, Account, TransactionInstruction } from "@solana/web3.js";
import { Popup } from "../../../components/Popup";

import { Button, Select, Input } from "antd";
import { BinaryWriter } from "borsh";

import { programId } from "../../../solcery/engine";
import { solceryTypes, SType, TypeSelector } from "../../../solcery/types";

export const AddFieldPopup = (props: {
  onAdd: (fieldType : SType | undefined, fieldName: string) => void
}) => {
  const { Option } = Select;
  const { TextArea } = Input;
  var [ visible, setVisible ] = useState(false);

  var [ fieldType, setFieldType ] = useState <SType | undefined> (undefined); //TODO: new field component
  var [ fieldName, setFieldName ] = useState('Unnamed field');
  var [ customData, setFieldCustomData ] = useState('');
  const connection = useConnection();
  const { wallet, publicKey } = useWallet();

  const onAddClicked = () => {
    setVisible(false);
    props.onAdd(fieldType, fieldName);
  };

  const toggleAddFieldMenu = () => {
    setVisible(!visible);
  };

  return ( // TODO: edit field
    <div>
      {visible
      ? <Popup handleClose={toggleAddFieldMenu} content={
          <div>
            <h2>Add field</h2>
            <TypeSelector onChange={setFieldType} />
            <div>Name</div>
            <Input defaultValue='Unnamed field' onChange={(event) => { setFieldName(event.target.value) }} />
            <Button onClick={onAddClicked}>Add</Button>
          </div>} />
      : <Button onClick={toggleAddFieldMenu}>Add field</Button>}
    </div>
  );
};

//<TextArea rows={10} defaultValue='' onChange={(event) => { setFieldCustomData(event.target.value) } }/>