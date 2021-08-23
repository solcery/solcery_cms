import React, { useState, useCallback } from "react";
import ReactDOM from 'react-dom'
import { Input, InputNumber} from 'antd';

type SolceryTypeId = number;
type SolceryType = {
	id: number,
	name: string
}

export const types: SolceryType[] = [
	{ id: 1, name: "Integer"},
	{ id: 2, name: "String" },
]

export const ValueRender = (props: {
	value?: any,
	typeId?: number,
	onChange?: (newValue: any) => void,
}) => {
	if (props.typeId == 1)
		return ( <IntRender value={ parseInt(props.value) } onChange={props.onChange} /> )
	if (props.typeId == 2)
		return ( <StringRender value = { props.value } onChange={props.onChange} /> )
	return ( <StringRender/> )
}

export const IntRender = (props: { value?: number, onChange?: (newValue: number) => void }) => {
	var [value, setValue] = useState(props.value)
    return (
      <InputNumber precision={0} defaultValue={ value } onChange={props.onChange} />
    );
}

export const StringRender = (props: { value?: string, onChange?: (newValue: string) => void  }) => {
	var [value, setValue] = useState(props.value)
    return (
      <Input type = "text" defaultValue={ value } onChange={(event) => { if (props && props.onChange) props.onChange(event.target.value)} } /> //TODO
    );
}

export const SolceryTypes: Map<SolceryTypeId, SolceryType> = new Map([
	[ 1, { id: 1, name: "Integer", render: IntRender}],
]);
