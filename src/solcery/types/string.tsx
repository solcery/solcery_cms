import React, { useState, useEffect } from "react";
import { Input } from 'antd';
import { SType, solceryTypes } from "./index";
import { useConnection} from "../../contexts/connection";
import { BinaryReader, BinaryWriter } from 'borsh';

export const SStringRender = (props: { 
  defaultValue?: any, 
  onChange?: (newValue: any) => void,
}) => {
	var [value, setValue] = useState(props.defaultValue)

	if (!props.onChange)
    return (<p>{props.defaultValue}</p>)
  
    return (<Input 
      type = "text" 
      defaultValue={ props.defaultValue }
      onChange={(event) => { props.onChange && props.onChange(event.target.value) } }
     />);
}

export class SString extends SType {
  id = 3;
  typeName = "String";
  nameRender = (<p>String</p>);
  valueRender = SStringRender;
  static nested = true;
  readValue = (reader: BinaryReader) => { return reader.readString() }
  writeValue = (value: string, writer: BinaryWriter) => { writer.writeString(value) }
  static readType = (reader: any) => {
  	return new SString()
  }
}