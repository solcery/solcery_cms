import React, { useState, useEffect } from "react";
import { Image, Input } from 'antd';
import { SType, solceryTypes } from "./index";
import { useConnection} from "../../contexts/connection";
import { BinaryReader, BinaryWriter } from 'borsh';

export const SUrlRender = (props: { 
  defaultValue?: any, 
  onChange?: (newValue: any) => void,
}) => {
	var [value, setValue] = useState(props.defaultValue)

  const onChange = (newValue: string) => {
    setValue(newValue)
    props.onChange && props.onChange(newValue)
  }

	if (!props.onChange) return (<Image src={value}/>);

  return (
    <div className="solcery-image-container">
      <Image src={value} />
      <Input type = "text" defaultValue={value}
             onChange={(event) => { onChange(event.target.value) } } />
    </div>
  );
}

export class SUrl extends SType {
  id = 4;
  typeName = "Image";
  nameRender = (<p>Image</p>);
  valueRender = SUrlRender;
  static nested = true;
  readValue = (reader: BinaryReader) => { return reader.readString() }
  writeValue = (value: string, writer: BinaryWriter) => { writer.writeString(value) }
  static readType = (reader: any) => {
  	return new SUrl()
  }
}