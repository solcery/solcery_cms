import React, { useState } from "react";
import { SType, TypeSelector, ValueRenderParams } from "../index";
import { Select, Button } from 'antd';
import { SArray } from './index';


export const ValueRender = (props: ValueRenderParams) => {

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

  if (!props.onChange)
    return (<p>Array</p>)
  var array = props.type as SArray
  return (
    <>
      {value.map((val: any, index: number) => <div key={index}><array.subtype.valueRender 
        defaultValue={val}
        type={array.subtype}
        onChange={ (newValue: any) => { onChange(newValue, index) }}
      /></div>)}
      <Button onClick={addNewElement}>+</Button>
    </>
  );
}


export const TypedataRender = (props: {
  defaultValue?: any, 
  onChange?: (newValue: any) => void,
}) => {
  const onChange = (newValue: SType) => {
    props.onChange && props.onChange(new SArray({ subtype: newValue }))
  }
  return (
    <TypeSelector defaultValue={props.defaultValue && props.defaultValue.subtype} onChange={onChange}/>
  )
}