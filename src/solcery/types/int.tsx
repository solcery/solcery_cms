import React, { useState, useEffect } from "react";
import { InputNumber } from 'antd';
import { useConnection} from "../../contexts/connection";
import { SType, solceryTypes } from "./index";
import { BinaryReader, BinaryWriter } from 'borsh';


export const SIntRender = (props: { 
  defaultValue?: any, 
  onChange?: (newValue: any) => void,
  readonly: boolean,
}) => {

	var [value, setValue] = useState(props.defaultValue)
	if (props.readonly)
    return (<p>{props.defaultValue}</p>)
  
  return (
    <InputNumber precision={0} defaultValue={ props.defaultValue } onChange={props.onChange} />
  );
}
export const SIntSubtypeRender = (props: { defaultValue?: any, onLoad: (newValue: any) => void, onChange?: (newValue: any) => void }) => {
	var [loaded, setLoaded] = useState(false)
	useEffect(() => {
		if (!loaded)
		{
			setLoaded(true)
			props.onLoad(new SInt())
		}
	})
	return (<div></div>)
}

export class SInt extends SType {
  id = 1;
  typeName = "Integer";
  nameRender = (<p>Integer</p>);
  render = SIntRender;
  readValue = (reader: BinaryReader) => { return reader.readU32() };
  writeValue = (value: number, writer: BinaryWriter) => { writer.writeU32(value) };
  static subtypeRender = SIntSubtypeRender;
  static read = (reader: any) => {
  	return new SInt()
  }

}
