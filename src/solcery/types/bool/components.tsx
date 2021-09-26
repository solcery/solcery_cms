import React, { useState, useEffect } from "react";
import { Switch } from 'antd';
import { ValueRenderParams} from '../index'

export const ValueRender = (props: ValueRenderParams) => {

	var [value, setValue] = useState(props.defaultValue)
	if (!props.onChange)
    return (<p>{ props.defaultValue ? "True" : "False" }</p>)
  return (<Switch defaultChecked={props.defaultValue} onChange={props.onChange}/>);
}
