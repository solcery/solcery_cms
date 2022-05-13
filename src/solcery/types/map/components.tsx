import React, { useState, useEffect } from "react";
import { SType, TypeSelector, ValueRenderParams } from "../index";
import { Select, Button } from 'antd';
import { SMap } from './index';
import { SInt } from '../index';

export const ValueRender = (props: ValueRenderParams) => {

  var [value, setValue] = useState(props.defaultValue || [])
  var [valueSize, setValueSize] = useState(props.defaultValue?.length || 0);

  const onChange = (newValue: any, index: number, type: 'key'|'value') => {
    value[index][type] = newValue;
    setValue(value) // WHY?
    var res = value.filter((entry: any) => (entry.key != undefined) && (entry.value != undefined))
    props.onChange && props.onChange(res)
  }

  const addNewElement = () => {
    value.push({})
    setValueSize(valueSize + 1)
    setValue(value)
  }

  if (!props.onChange)
    return (<p>Map</p>)
  var mapType = props.type as SMap
  return (
    <>
      {value.map((entry: any, index: number) => <div key={index}>
        <mapType.keyType.valueRender 
          defaultValue={entry.key}
          type={mapType.keyType}
          onChange={ (newValue: any) => { onChange(newValue, index, 'key') }}
        />
        <mapType.valueType.valueRender 
          defaultValue={entry.value}
          type={mapType.valueType}
          onChange={ (newValue: any) => { onChange(newValue, index, 'value') }}
        />
      </div>)}
      <Button onClick={addNewElement}>+</Button>
    </>
  );
}


export const TypedataRender = (props: {
  defaultValue?: any, 
  onChange?: (newValue: any) => void,
}) => {
  const [ keyType, setKeyType ] = useState<any>(props.defaultValue ? props.defaultValue.keyType : new SInt())
  const [ valueType, setValueType ] = useState<any>(props.defaultValue ? props.defaultValue.valueType : new SInt())


  useEffect(() => {
    if (props.onChange) 
      props.onChange(new SMap({ keyType, valueType }))
  }, [ keyType, valueType ])

  const onChangeKey = (newValue: SType) => {
    setKeyType(newValue)
  }
  const onChangeValue = (newValue: SType) => {
    setValueType(newValue)
  }

  return (
    <>
      <TypeSelector defaultValue={props.defaultValue && props.defaultValue.keyType} onChange={onChangeKey}/>
      <TypeSelector defaultValue={props.defaultValue && props.defaultValue.valueType} onChange={onChangeValue}/>
    </>
  )
}