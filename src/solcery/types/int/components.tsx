import React, { useState } from "react";
import { InputNumber } from 'antd';
import { ValueRenderParams} from "../index"

export const ValueRender = (props: ValueRenderParams) => {
	if (!props.onChange) return (<p>{props.defaultValue}</p>)
	return (<InputNumber precision={0} defaultValue={ props.defaultValue } onChange={props.onChange} />);
}
