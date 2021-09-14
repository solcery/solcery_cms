import React, { useState, useEffect } from "react";
import { Switch } from 'antd';
import { useConnection} from "../../contexts/connection";
import { SType, solceryTypes } from "./index";
import { BinaryReader, BinaryWriter } from 'borsh';


export const SBoolRender = (props: { 
  defaultValue?: any, 
  onChange?: (newValue: any) => void,
  readonly?: boolean,
}) => {

	var [value, setValue] = useState(props.defaultValue)
	if (props.readonly)
    return (<p>{ props.defaultValue ? "True" : "False" }</p>)
  return (<Switch defaultChecked={ props.defaultValue } onChange={props.onChange}/>);
}

export class SBool extends SType {
  id = 1;
  typeName = "Bool";
  nameRender = (<p>Bool</p>);
  valueRender = SBoolRender;
  static nested = true;
  readValue = (reader: BinaryReader) => { return reader.readBoolean() };
  writeValue = (value: boolean, writer: BinaryWriter) => { writer.writeBoolean(value) };
  static readType = (reader: any) => {
  	return new SBool()
  }
}
