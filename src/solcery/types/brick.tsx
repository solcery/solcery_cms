import Unity, { UnityContext } from "react-unity-webgl";
import React, { useState, useEffect } from "react";
import { useConnection} from "../../contexts/connection";
import { SType, SInt, SString } from "./index";
import { Select, Button } from 'antd';
import { PublicKey } from "@solana/web3.js";
import { BinaryReader, BinaryWriter } from 'borsh';
import { solceryTypes } from './solceryTypes'

export const SBrickRender = (props: { 
  brickType: number, 
  defaultValue?: any, 
  onChange?: (newValue: any) => void,
  readonly?: boolean,
}) => {

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
    props.onChange(newBrick)
  })

  unityContext.on("OnNodeEditorLoaded", async () => {
    var configs = getBrickConfigs()
    var brickData = {
      Genesis: props.defaultValue ? brickToOldBrick(props.defaultValue) : null
    }
    unityContext.send("NodeEditorReactToUnity", "SetNodeEditorData", JSON.stringify({ 
      BrickConfigsData: configs,
      BrickTree: brickData,
    }));
  });

	var [ value, setValue ] = useState(props.defaultValue)
  var [ enabled, setEnabled ] = useState(false)
	if (props.readonly)
		return (<p>Brick</p>)
	return (
    <div>
    <Button onClick = {() => { setEnabled(!enabled) }}>{ enabled ? "Disable" : "Enable" }</Button>
    { enabled && (<Unity tabIndex={3} style={{ width: 1000, height: 800 }} unityContext={unityContext} />)}
    </div>
	);
}


export const SBrickSubtypeRender = (props: {
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

export class SBrick extends SType {
  id = 6;
  name = "Brick";
  valueRender = SBrickRender;
  brickType = 0;

  static typedataRender = SBrickSubtypeRender;
   constructor(src: { brickType: number }) {
  	super()
  	this.brickType = src.brickType
    this.nameRender = (<p>Brick: { this.brickType }</p>); //TOD: name
    this.valueRender = (props: { readonly?: boolean, defaultValue?: PublicKey,  onChange?: (newValue: any) => void  }) => { return(<SBrickRender 
      onChange={props.onChange} 
      defaultValue={props.defaultValue} 
      brickType={this.brickType}
      readonly={props?.readonly}
    />)}
  }
  static readType = (reader: BinaryReader) => {
  	return new SBrick({ brickType: reader.readU32() })
  }
  writeType = (writer: BinaryWriter) => {
  	writer.writeU32(this.brickType)
  }

  readValue = (reader: BinaryReader) => { 
    var type = reader.readU8()
    var subtype = reader.readU32()
    var brickSignature = getBrickSignature(type, subtype)
    var params: Map<number, any> = new Map()
    if (!brickSignature)
      throw new Error("Reading brick failed")
    var paramsAmount = reader.readU32()
    for (var i = 0; i < paramsAmount; i++) {
      var paramId = reader.readU32()
      var paramSignature = getParamSignatureById(brickSignature, paramId)
      if (!paramSignature)
        throw new Error("Reading brick failed")
      params.set(paramId, paramSignature.type.readValue(reader))
    }
    var result: Brick = {
      type: type,
      subtype: subtype,
      params: params,
    }
    return result
  };

  writeValue = (value: Brick, writer: BinaryWriter) => { 
    var brickSignature = getBrickSignature(value.type, value.subtype)
    if (!brickSignature)
      throw new Error("Writing brick failed")
    writer.writeU8(value.type)
    writer.writeU32(value.subtype)
    writer.writeU32(value.params.size)
    for (let param of value.params) {
      var paramSignature = getParamSignatureById(brickSignature, param[0])
      if (paramSignature) {
        writer.writeU32(param[0])
        paramSignature.type.writeValue(param[1], writer)
      }
    }
  };
}

solceryTypes.set(6, SBrick)

function getParamSignatureById(brickSignature: BrickSignature, paramId: number) {
  for (var param of brickSignature.params) {
    if (param.id == paramId)
      return param
  }
}

declare module "borsh" {
  interface BinaryReader {
    readBrick(): SBrick;
  }

  interface BinaryWriter {
    writeBrick(value: SBrick): void;
  }
}

(BinaryReader.prototype).readBrick = function readBrick() {
  const reader = this;
  const array = reader.readFixedArray(32);
  return new SBrick({ brickType: 1 });
};

(BinaryWriter.prototype).writeBrick = function writeBrick(value: SBrick) {
  const writer = this;
};

type BrickParamSignature = {
  id: number,
  name: string,
  code: string,
  type: SType,
}

type BrickSignature = {
  type: number,
  subtype: number,
  name: string,
  description?: string,
  params: any,
  func: any,
}

const getBrickSignature = (type: number, subtype: number) => {
  for (let solceryBrick of solceryBricks) {
    if (solceryBrick.type == type && solceryBrick.subtype == subtype)
      return solceryBrick
  }
}

export const applyBrick = (brick: Brick, ctx: any) => {
  var brickSignature = getBrickSignature(brick.type, brick.subtype)
  if (brickSignature) {
    return brickSignature.func(Object.fromEntries(brick.params), ctx)
  }
}

export const solceryBricks: BrickSignature[] = [
  {
    type: 0,
    subtype: 0,
    name: 'Void',
    func: () => {},
    params: [],
  },

  {
    type: 0,
    subtype: 1,
    name: 'Set',
    params: [
      { id: 1, code: 'action1', name: 'Action 1', type: new SBrick({ brickType: 0 }) },
      { id: 2, code: 'action2', name: 'Action 2', type: new SBrick({ brickType: 0 }) }
    ],
    func: (params: any, ctx: any) => {
      applyBrick(params[1], ctx)
      applyBrick(params[2], ctx)
    }
  },
  {
    type: 0,
    subtype: 100,
    name: 'MoveTo',
    params: [
      { id: 1, code: 'place', name: 'Place', type: new SBrick({ brickType: 2 }) }
    ],
    func: (params: any, ctx: any) => {
      ctx.object.attrs.place = applyBrick(params[1], ctx)
    }
  },

  {
    type: 2,
    subtype: 0,
    name: 'Const',
    params: [
      { id: 1, code: 'value', name: 'Value', type: new SInt() }
    ],
    func: (params: any, ctx: any) => {
      return params[1]
    }
  }
];

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


type Brick = {
  type: number, // ACtion, Condition
  subtype: number, // Void, Set, Conditional, MoveTo
  params: Map<number, any>,
}

function parseBrick(brickData: string) {
  var oldBrick: OldBrick = JSON.parse(brickData)
  var newBrick: Brick = {
    type: oldBrick.Type,
    subtype: oldBrick.Subtype,
    params: new Map(),
  }
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
