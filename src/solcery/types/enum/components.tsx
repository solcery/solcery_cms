import React, { useState, useEffect } from "react";
import { SType, ValueRenderParams } from "../index";
import { Select } from 'antd';
import { SEnum } from './index';
import { SArray, SString } from '../index'
import * as ArrayComponents from '../array/components';


export const ValueRender = (props: ValueRenderParams) => {
  const { Option } = Select;
  const enumType = props.type as SEnum
  if (!props.onChange) {
    var defaultValue = props.defaultValue ? props.defaultValue : 0;
    return (<p>{enumType.values[defaultValue]}</p>)
  }
  return (
    <>
      <Select defaultValue={ props.defaultValue ? props.defaultValue : 0 } onChange={(value) => { 
        props?.onChange && props.onChange(value)
      }}>
        {enumType.values.map((value, index) => {
          return (<Option key={index} value={index}>{value}</Option>)
        })} 
      </Select>
    </>
  );
}


export const TypedataRender = (props: {
  defaultValue?: any, 
  onChange?: (newValue: any) => void,
}) => {
  const type = new SArray({ subtype: new SString() })
  return (<ArrayComponents.ValueRender
    defaultValue={props.defaultValue && props.defaultValue.values}
    onChange={(values) => { props.onChange && props.onChange(new SEnum({ values })) }}
    type={type} 
  />)
}