import React, { useState, useEffect } from "react";
import { Image, Input } from 'antd';
import { ValueRenderParams} from "../index"

export const ValueRender = (props: ValueRenderParams) => {
	var [value, setValue] = useState(props.defaultValue)

  const onChange = (newValue: string) => {
    setValue(newValue)
    props.onChange && props.onChange(newValue)
  }

	if (!props.onChange)
    return ( <Image
      width={100}
      src={props.defaultValue}
    />)

  return (<div>
    <Image
      width={200}
      src={value}
    />
    <Input 
      type = "text" 
      defaultValue={ value }
      onChange={(event) => { onChange(event.target.value) } }
    />
    </div>);
}
