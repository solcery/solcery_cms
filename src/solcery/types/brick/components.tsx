import Unity, { UnityContext } from "react-unity-webgl";
import { useProject } from "../../../contexts/project"
import { useConnection } from "../../../contexts/connection"


import ReactFlow, { ReactFlowProvider } from 'react-flow-renderer';
import { BrickEditor } from './BrickEditor';
import React, { useState, useEffect } from "react";
import { getBricks } from "./index"
import { Select, Button, Modal } from 'antd';
import { SInt, SString, ValueRenderParams, SBrick } from '../index'

interface BrickEditorParams extends ValueRenderParams {
	onActivate: boolean;
}

export const ValueRender = (props: BrickEditorParams) => {

  let brickType = (props.type as SBrick).brickType
  if (!props.onChange && !props.defaultValue)
    return <p>Empty</p>
	return (
    <>
      <ReactFlowProvider>
        <BrickEditor
          width={300}
          height={200}
          brickSignatures={getBricks()}
          brickClass={SBrick}
          brickTree={props.defaultValue}
          brickType={brickType}
          onChange={props.onChange}
          onActivate={props.onActivate}
        />
      </ReactFlowProvider>
    </>
	);
}

export const TypedataRender = (props: {
	defaultValue?: any, 
 	onChange?: (newValue: any) => void,
}) => {
	const { Option } = Select;
	useEffect(() => {
		if (props.onChange)
			props.onChange(props.defaultValue ? props.defaultValue : new SBrick({ brickType: 0 }))
	}, [])
	return (
		<Select defaultValue={0} onChange={(brickType) => { 
      props?.onChange && props.onChange(new SBrick({brickType: brickType}) )
    }}>
	  	<Option value={0} key={0}>Action</Option>
	  	<Option value={1} key={1}>Condition</Option>
	  	<Option value={2} key={2}>Value</Option>
		</Select>
	)
}
