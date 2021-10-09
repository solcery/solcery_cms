import Unity, { UnityContext } from "react-unity-webgl";
import { useProject } from "../../../contexts/project"
import { useConnection } from "../../../contexts/connection"
import React, { useState, useEffect } from "react";
import { OldBrick, oldBrickToBrick, getBrickConfigs, brickToOldBrick, getBricks } from "./index"
import { Select, Button, Modal } from 'antd';
import { SInt, SString, ValueRenderParams, SBrick } from '../index'


const unityContext = new UnityContext({
  loaderUrl: "node_editor/node_editor_10.loader.js",
  dataUrl: "node_editor/node_editor_10.data",
  frameworkUrl: "node_editor/node_editor_10.framework.js",
  codeUrl: "node_editor/node_editor_10.wasm",
})

export const ValueRender = (props: ValueRenderParams) => {

	var [ value, setValue ] = useState<any>(undefined)
  var [ newValue, setNewValue ] = useState<any>(undefined)
  var [ enabled, setEnabled ] = useState(false)
  var { project } = useProject()
  var connection = useConnection()
  // const [ unityContext, setUnityContext ] = useState<UnityContext|undefined>(undefined)

  useEffect(() => {
    if (unityContext) {
      unityContext.on("SaveBrickTree", (stringTree) => {
        if (!props.onChange)
          return
        var oldBrick: OldBrick = JSON.parse(stringTree).Genesis
        if (!oldBrick) {
          setNewValue(undefined)
          return
        }
        var newBrick = oldBrickToBrick(oldBrick)
        setNewValue(newBrick)
      })

      unityContext.on("OnNodeEditorLoaded", async () => {
        if (!project)
          throw new Error("No project on node editor, panic")
        await project.updateBricks(connection)
        console.log(getBricks())
        var configs = getBrickConfigs(getBricks())
        var brickData = {
          Genesis: value ? brickToOldBrick(value) : null
        }
        console.log(configs)
        console.log(JSON.stringify({ 
          BrickConfigsData: configs,
          BrickTree: brickData,
        }))
        unityContext.send("NodeEditorReactToUnity", "SetNodeEditorData", JSON.stringify({ 
          BrickConfigsData: configs,
          BrickTree: brickData,
        }));
      });
    }
  }, [value] )

  useEffect(() => {
    setValue(props.defaultValue)
    setNewValue(props.defaultValue)
  }, [])


  const changeEnabled = () => {
    setEnabled(!enabled)
  }

  const apply = () => {
    setValue(newValue)
    if (props.onChange)
      props.onChange(newValue)
    setEnabled(!enabled)
  }

  const cancel = () => {
    setNewValue(value)
    setEnabled(!enabled)
  }

  let style = {
    background: 'black',
    position: 'fixed',
    left: 0,
    top: 0,
    bottom: 0,
    right: 0,
    zIndex: 100,
    display: enabled ? 'inline' : 'none',
  } as React.CSSProperties
  

	if (!props.onChange)
		return (<p>Brick</p>)
  if (!enabled)
    return (<Button onClick = {changeEnabled}>Edit</Button>)
	return (
    <div>
      <div style={style}>
        <Button onClick = {apply}>Apply</Button>
        <Button onClick = {cancel}>Cancel</Button>
        <Unity style={{ width: '100%', height: '100%' }} unityContext={unityContext} />
      </div>
    </div>
	);
}

export const TypedataRender = (props: {
	defaultValue?: any, 
 	onChange?: (newValue: any) => void,
}) => {
	const { Option } = Select;
	useEffect(() => {
		if (props.onChange)
			props.onChange(new SBrick({brickType: 1}))
	}, [])
	return (
		<Select defaultValue={1} onChange={(brickType) => { 
      props?.onChange && props.onChange(new SBrick({brickType: brickType}) )
    }}>
	  	<Option value={1} key={1}>Action</Option>
	  	<Option value={2} key={2}>Condition</Option>
	  	<Option value={3} key={3}>Value</Option>
		</Select>
	)
}
