import Unity, { UnityContext } from "react-unity-webgl";
import React, { useState, useEffect } from "react";
import { useConnection} from "../../contexts/connection";
import { SType, TypeSelector, solceryTypes } from "./index";
import { Select, Button } from 'antd';
import { BinaryReader, BinaryWriter } from 'borsh';


export const SArrayRender = (props: { 
  subtype: SType,
  defaultValue?: any, 
  onChange?: (newValue: any) => void,
  readonly?: boolean,
}) => {


  var [value, setValue] = useState(props.defaultValue || [])
  var [valueSize, setValueSize] = useState(props.defaultValue?.length || 0);
  const onChange = (newValue: any, index: number) => {
    value[index] = newValue;
    setValue(value)
    var res = value.filter((value: any) => value != undefined)
    props.onChange && props.onChange(res)
  }

  const addNewElement = () => {
    value.push(undefined)
    setValueSize(valueSize + 1)
    setValue(value)
  }

  if (props.readonly)
    return (<p>Array</p>) // TODO
  return (
    <div>
      {value.map((val: any, index: number) => <div key={index}>
        {
          React.createElement(props.subtype.valueRender, 
            {
              defaultValue: val,
              onChange: (newValue: any) => { onChange(newValue, index) }, readonly: props.readonly,
            }
          )
        }
      </div>)}
      <Button onClick={addNewElement}>+</Button>
    </div>
  );
}


export const SArraySubtypeRender = (props: {
  defaultValue?: any, 
  onChange?: (newValue: any) => void,
}) => {
  const onChange = (newValue: SType) => {
    props.onChange && props.onChange(new SArray({ subtype: newValue }))
  }
  return (
    <TypeSelector onChange={onChange}/>
  )
}


export class SArray extends SType {
  id = 7;
  typeName = "Array";
  nameRender = (<p>Array</p>);
  valueRender = SArrayRender;
  subtype: SType;

  static typedataRender = SArraySubtypeRender;
   constructor(src: { subtype: SType }) {
    super()
    this.subtype = src.subtype;
    this.nameRender = <p>Array: {this.subtype.typeName}</p>; //TOD: name
    this.valueRender = (props: { readonly?: boolean, defaultValue?: any,  onChange?: (newValue: any) => void  }) => { return(<SArrayRender 
      onChange={props.onChange} 
      defaultValue={props.defaultValue} 
      subtype={this.subtype}
      readonly={props?.readonly}
    />)}
  }

  readValue = (reader: BinaryReader) => { 
    var arrayLength = reader.readU32();
    var result = []
    for (let i = 0; i < arrayLength; i++) {
      result.push(this.subtype.readValue(reader))
    }
    return result
  }
  writeValue = (value: any[], writer: BinaryWriter) => { 
    writer.writeU32(value.length)
    value.forEach((val) => this.subtype.writeValue(val, writer))
  }

  static readType = (reader: BinaryReader) => {
    return new SArray({ subtype: reader.readSType() })
  }

  writeType = (writer: BinaryWriter) => {
    console.log('array writeType')
    writer.writeSType(this.subtype)
  }
}

