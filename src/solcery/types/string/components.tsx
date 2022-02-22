import React, { useState } from "react";
import { Input } from 'antd';
import { ValueRenderParams} from '../index'

export const ValueRender = (props: ValueRenderParams) => {

	if (!props.onChange)
    return (<p>{props.defaultValue}</p>)
  
    return (<Input 
      type = "text" 
      defaultValue={ props.defaultValue }
      onChange={(event) => { props.onChange && props.onChange(event.target.value) } }
     />);
}
