import React, { useState, useEffect } from "react";
import { InputNumber } from 'antd';
import { useConnection} from "../../contexts/connection";
import { SType, solceryTypes } from "./index";
import { BinaryReader, BinaryWriter } from 'borsh';


export const SIntRender = (props: { 
  defaultValue?: any, 
  onChange?: (newValue: any) => void,
  readonly?: boolean,
}) => {

	var [value, setValue] = useState(props.defaultValue)
	if (props.readonly)
    return (<p>{props.defaultValue}</p>)
  return (<InputNumber precision={0} defaultValue={ props.defaultValue } onChange={props.onChange} />);
}

export class SInt extends SType {
  id = 2;
  typeName = "Integer";
  nameRender = (<p>Integer</p>);
  valueRender = SIntRender;
  static nested = true;
  readValue = (reader: BinaryReader) => { return reader.readU32() };
  writeValue = (value: number, writer: BinaryWriter) => { writer.writeU32(value) };
  static readType = (reader: any) => {
  	return new SInt()
  }

}
