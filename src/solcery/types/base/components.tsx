import React, { useState, useEffect } from "react";
import { Select } from 'antd';
import { SType } from './index'
import { solceryTypes } from '../solceryTypes'
import { SInt } from '../index'

export const TypeSelector = (props: { //TODO: -> Type render
	onChange?: (newValue: SType) => void,
	defaultValue?: SType,
}) => {
	const DEFAULT_STYPE = new SInt();
	const { Option } = Select;
	const [ typeId, setTypeId ] = useState(props.defaultValue ? props.defaultValue.id : DEFAULT_STYPE.id);
	var [loaded, setLoaded] = useState(false)

	useEffect(() => {
		if (!loaded) {
			setLoaded(true)
			onChangeSolceryType(props.defaultValue ? props.defaultValue : DEFAULT_STYPE)
		}
	})

	const onChangeSolceryType = (newValue: any) => {
		if (props.onChange)
			props.onChange(newValue)
	}
	return (
		<div>
	    Add Field<br/>
	    <Select id="fieldType" defaultValue={ props.defaultValue ? props.defaultValue.id : DEFAULT_STYPE.id } onChange={(solceryTypeId) => { 
	    	let solceryType = solceryTypes.get(solceryTypeId)
	    	setTypeId(solceryTypeId)
	    	if (!solceryType.typedataRender)
	    		onChangeSolceryType(new solceryType())
	    }} >
	    {Array.from(solceryTypes.keys()).map((solceryTypeId) => 
	      <Option key={solceryTypeId} value={solceryTypeId}>{solceryTypes.get(solceryTypeId).name}</Option>
	    )}
	    </Select>
	    {solceryTypes.get(typeId)?.typedataRender && React.createElement(
	    	solceryTypes.get(typeId)?.typedataRender,
				{ 
					onChange: onChangeSolceryType,
					defaultValue: props.defaultValue,
				}
			)}
	  </div>
	)
}

export const NameRender = (props: {
	type: SType
}) => {
	return (<p>{props.type.name}</p>)
}