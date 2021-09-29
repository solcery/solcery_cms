import Unity, { UnityContext } from "react-unity-webgl";
import React, { useState, useEffect } from "react";
import { SBrick, BrickSignature, Brick, getBrickSignature, getParamSignatureById, solceryBricks } from "./index";
import { Select, Button } from 'antd';
import { SInt, SString, ValueRenderParams} from '../index'


export const ValueRender = (props: ValueRenderParams) => {

  const [ unityContext, setUnityContext ] = useState(new UnityContext({
    loaderUrl: "node_editor/node_editor_2.loader.js",
    dataUrl: "node_editor/node_editor_2.data",
    frameworkUrl: "node_editor/node_editor_2.framework.js",
    codeUrl: "node_editor/node_editor_2.wasm",
  }))

  unityContext.on("SaveBrickTree", (stringTree) => {
    if (!props.onChange)
      return
    var oldBrick: OldBrick = JSON.parse(stringTree).Genesis
    if (!oldBrick) {
      props.onChange(undefined)
      return
    }
    var newBrick = oldBrickToBrick(oldBrick)
    setValue(newBrick)
    props.onChange(newBrick)
  })

  unityContext.on("OnNodeEditorLoaded", async () => {
    var configs = getBrickConfigs()
    var brickData = {
      Genesis: value ? brickToOldBrick(value) : null
    }
    unityContext.send("NodeEditorReactToUnity", "SetNodeEditorData", JSON.stringify({ 
      BrickConfigsData: configs,
      BrickTree: brickData,
    }));
  });

	var [ value, setValue ] = useState<any>(undefined)
  var [ enabled, setEnabled ] = useState(false)

  useEffect(() => {
    if (!value && props.defaultValue) {
      setValue(props.defaultValue)
    }
  })

	if (!props.onChange)
		return (<p>Brick</p>)
	return (
    <div>
    <Button onClick = {() => { setEnabled(!enabled) }}>{ enabled ? "Disable" : "Enable" }</Button>
    { enabled && (<Unity tabIndex={3} style={{ width: 1000, height: 800 }} unityContext={unityContext} />)}
    </div>
	);
}


export const TypedataRender = (props: {
	defaultValue?: any, 
 	onChange?: (newValue: any) => void,
}) => {
	const { Option } = Select;
	var [loaded, setLoaded] = useState(false)
	useEffect(() => {
		if (props.onChange && !loaded)
		{
			setLoaded(true)
			props.onChange(new SBrick({brickType: 1}))
		}
	})
	return (
		<Select defaultValue={1} onChange={(brickType) => { props?.onChange && props.onChange(new SBrick({brickType: brickType}) ) }}>
	  	<Option value={1} key={1}>Action</Option>
	  	<Option value={2} key={2}>Condition</Option>
	  	<Option value={3} key={3}>Value</Option>
		</Select>
	)
}

function brickSignatureToBrickConfig(brick: BrickSignature) {
  var Slots = []
  var lastField = {
    HasField: false,
    FieldType: 0,
    FieldName: "",
  }
  for (var brickParam of brick.params) {
    if (brickParam.type instanceof SBrick) {
      var paramBrick = brickParam.type as SBrick
      Slots.push({
        Type: paramBrick.brickType,
        Name: brickParam.name
      })
    }
    else {
      lastField.HasField = true
      lastField.FieldType = (brickParam.type instanceof SInt) ? 0 : 1
      lastField.FieldName = brickParam.name
    }
  }
  return {
    Name: brick.name,
    Type: brick.type,
    Subtype: brick.subtype,
    Description: brick.description,
    HasField: lastField.HasField,
    FieldType: lastField.FieldType,
    FieldName: lastField.FieldName,
    HasObjectSelection: false,
    Slots: Slots
  }
}

type OldBrick = {
  Type: number,
  Subtype: number,
  HasField: boolean,
  IntField: number,
  StringField: string | null,
  Slots: OldBrick[],
}

export function oldBrickToBrick(oldBrick: OldBrick) {
  var result: Brick = {
    type: oldBrick.Type,
    subtype: oldBrick.Subtype,
    params: new Map()
  }
  var paramId = 1
  if (oldBrick.HasField) {
    result.params.set(paramId, oldBrick.StringField ? oldBrick.StringField : oldBrick.IntField)
    paramId++;
  }
  for (var slot of oldBrick.Slots) {
    result.params.set(paramId, oldBrickToBrick(slot))
    paramId++;
  }
  return result
}

function getBrickConfigs() {
  var actions = []
  var conditions = []
  var values = []
  for (var brickSignature of solceryBricks) {
    var brickConfig = brickSignatureToBrickConfig(brickSignature)
    if (brickConfig.Type == 0)
      actions.push(brickConfig)
    if (brickConfig.Type == 1)
      conditions.push(brickConfig)
    if (brickConfig.Type == 2)
      values.push(brickConfig)
  }
  return {
    ConfigsByType: {
      Action: actions,
      Condition: conditions,
      Value: values,
    }
  }
}

export const brickToOldBrick = (brick: Brick) => { // TODO: construct??
  var result: OldBrick = {
    Type: brick.type,
    Subtype: brick.subtype,
    HasField: false,
    IntField: 0,
    StringField: null,
    Slots: [],
  }
  var brickSignature = getBrickSignature(brick.type, brick.subtype)
  if (!brickSignature)
    throw new Error('Brick to old brick failed')
  for (var param of brick.params) {
    var paramSignature = getParamSignatureById(brickSignature, param[0])
    if (!paramSignature)
      throw new Error('Brick to old brick failed')
    if (paramSignature.type instanceof SInt) {
      result.HasField = true
      result.IntField = param[1]
      result.StringField = null
    }
    if (paramSignature.type instanceof SString) {
      result.HasField = true
      result.StringField = param[1]
      result.IntField = 0
    }
    if (paramSignature.type instanceof SBrick) {
      result.Slots.push(brickToOldBrick(param[1]))
    }
  }
  return result
}
