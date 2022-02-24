import Unity, { UnityContext } from "react-unity-webgl";
import { useProject } from "../../../contexts/project"
import { useConnection } from "../../../contexts/connection"


import ReactFlow, { ReactFlowProvider } from 'react-flow-renderer';
import { BrickEditor } from './BrickEditor';
import React, { useState, useEffect } from "react";
import { OldBrick, oldBrickToBrick, getBrickConfigs, brickToOldBrick, getBricks } from "./index"
import { Select, Button, Modal } from 'antd';
import { SInt, SString, ValueRenderParams, SBrick } from '../index'

export const ValueRender = (props: ValueRenderParams) => {

  let [ value, setValue ] = useState<any>(undefined)

  useEffect(() => {
    setValue(reformat2(props.defaultValue))
  }, [])

  const onBrickEditorChange = (bt: any) => {
    if (!props.onChange)
      return;

    let reformatted = reformat(bt)
    if (checkCompleteness(reformatted)) {
      props.onChange(reformatted);
    }
  };

  const checkCompleteness: (brickTree: any) => boolean = (brickTree: any) => {
    if (!brickTree)
      return false
    if (!brickTree.params)
      return true
    let result: boolean = true
    for (let param of brickTree.params) {
      result = result && checkCompleteness(param.value)
    }
    return result
  }

  const reformat = (brickTree: any) => {
    if (!brickTree)
      return undefined
    if (!brickTree.params)
      return brickTree
    let newParams: any[] = []
    for (let key of Object.keys(brickTree.params)) {
      newParams.push({
        id: parseInt(key),
        value: reformat(brickTree.params[key]),
      })
    }
    return {
      type: brickTree.type,
      subtype: brickTree.subtype,
      params: newParams,
    }
  }

  const reformat2 = (brickTree: any) => {
    if (!brickTree)
      return undefined
    if (!brickTree.params)
      return brickTree
    let newParams: any = {}
    for (let param of brickTree.params) {
      newParams[param.id] = reformat2(param.value)
    }
    return {
      type: brickTree.type,
      subtype: brickTree.subtype,
      params: newParams,
    }
  }

  const [ enabled, setEnabled ] = useState(false)

  const changeEnabled = () => {
    setEnabled(!enabled)
    setValue(reformat2(props.defaultValue))
  }

  let style = {
    backgroundColor: enabled ? 'black' : 'transparent',
    pointerEvents: enabled ? 'auto' : 'none',
    position: enabled ? 'fixed' : 'relative',
    left: 0,
    top: 0,
    bottom: 0,
    right: 0,
    zIndex: 100,
    display: enabled ? 'inline' : 'block',
  } as React.CSSProperties
  
  let brickType = (props.type as SBrick).brickType
	return (
    <>
      <div onClick={() => { if (!enabled) changeEnabled() }}>
        <div style={style}>
          {enabled && (<Button onClick = {changeEnabled}>{enabled ? 'Close' : 'Open' }</Button>)}
            <ReactFlowProvider>
            <BrickEditor
              width={enabled ? window.innerWidth : 300}
              height={enabled ? window.innerHeight : 200}
              brickSignatures={getBricks()}
              brickClass={SBrick}
              brickTree={reformat2(props.defaultValue)}
              brickType={brickType}
              onChange={onBrickEditorChange}
              active={props.onChange && enabled}
            />
            </ReactFlowProvider>
        </div>
      </div>
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
