import React, { useState, useEffect } from "react";
import { Input } from 'antd';
import { SType, solceryTypes } from "./index";
import { useConnection} from "../../contexts/connection";
import { BinaryReader, BinaryWriter } from 'borsh';

export const SStringRender = (props: { 
  defaultValue?: any, 
  onChange?: (newValue: any) => void,
  readonly?: boolean,
}) => {
	var [value, setValue] = useState(props.defaultValue)

	if (props.readonly)
    return (<p>{props.defaultValue}</p>)
  
    return (
      <Input type = "text" defaultValue={ props.defaultValue } onChange={(event) => { if (props && props.onChange) props.onChange(event.target.value)} } /> //TODO
    );
}
export const SStringSubtypeRender = (props: { 
	defaultValue?: any, 
	onLoad: (newValue: any) => void, 
	onChange: (newValue: any) => void } 
) => {
	var [loaded, setLoaded] = useState(false)
	useEffect(() => {
		if (!loaded)
		{
			setLoaded(true)
			props.onLoad(new SString())
		}
	})
	return (<div></div>)
}
export class SString extends SType {
  id = 2;
  typeName = "String";
  nameRender = (<p>String</p>);
  render = SStringRender;
  readValue = (reader: BinaryReader) => { return reader.readString() }
  writeValue = (value: string, writer: BinaryWriter) => { writer.writeString(value) }
  static subtypeRender = SStringSubtypeRender;
  static read = (reader: any) => {
  	return new SString()
  }
}