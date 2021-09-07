import Unity, { UnityContext } from "react-unity-webgl";
import React, { useState, useEffect } from "react";
import { useConnection} from "../../contexts/connection";
import { SType, SInt, SString, solceryTypes } from "./index";
import { Select } from 'antd';
import { PublicKey } from "@solana/web3.js";
import { BinaryReader, BinaryWriter } from 'borsh';
import brickConfigs from './bricksConfig.json';
import ReactFlow from 'react-flow-renderer';



// export function set_unity_card_creation_signed(cardName: string, isSigned: boolean) {
//   var data = { CardName: cardName, IsSigned: isSigned };
//   unityContext.send("ReactToUnity", "SetCardCreationSigned", JSON.stringify(data));
// }



// var brickConfigs = [
//   //Actions
//   { Type: 0, Subtype: 0, FieldType: 0, Slots: 0, }, //Void
//   { Type: 0, Subtype: 1, FieldType: 0, Slots: 2, }, //Set
//   { Type: 0, Subtype: 2, FieldType: 0, Slots: 3, }, //Conditional
//   { Type: 0, Subtype: 3, FieldType: 0, Slots: 2, }, //Loop
//   { Type: 0, Subtype: 4, FieldType: 1, Slots: 0, }, //Card
//   { Type: 0, Subtype: 5, FieldType: 2, Slots: 0, }, //Show message
//   { Type: 0, Subtype: 6, FieldType: 2, Slots: 1, }, //Set context var
//   { Type: 0, Subtype: 100, FieldType: 0, Slots: 1, }, //MoveTo
//   { Type: 0, Subtype: 101, FieldType: 1, Slots: 2, }, //SetPlayerAttr
//   { Type: 0, Subtype: 102, FieldType: 1, Slots: 2, }, //AddPlayerAttr
//   { Type: 0, Subtype: 103, FieldType: 0, Slots: 3, }, //ApplyToPlace
//   { Type: 0, Subtype: 104, FieldType: 1, Slots: 2, }, //SubPlayerAttr

//   //Conditions
//   { Type: 1, Subtype: 0, FieldType: 0, Slots: 0, }, //True
//   { Type: 1, Subtype: 1, FieldType: 0, Slots: 0, }, //False
//   { Type: 1, Subtype: 2, FieldType: 0, Slots: 2, }, //Or
//   { Type: 1, Subtype: 3, FieldType: 0, Slots: 2, }, //And
//   { Type: 1, Subtype: 4, FieldType: 0, Slots: 1, }, //Not
//   { Type: 1, Subtype: 5, FieldType: 0, Slots: 2, }, //Equal
//   { Type: 1, Subtype: 6, FieldType: 0, Slots: 2, }, //GreaterThan
//   { Type: 1, Subtype: 7, FieldType: 0, Slots: 2, }, //LesserThan
//   { Type: 1, Subtype: 100, FieldType: 0, Slots: 1, }, //IsAtPlace

//   //Values
//   { Type: 2, Subtype: 0, FieldType: 1, Slots: 0, }, //Const,
//   { Type: 2, Subtype: 1, FieldType: 0, Slots: 3, }, //Conditional
//   { Type: 2, Subtype: 2, FieldType: 0, Slots: 2, }, //Add
//   { Type: 2, Subtype: 3, FieldType: 0, Slots: 2, }, //Sub
//   { Type: 2, Subtype: 4, FieldType: 2, Slots: 0, }, //GetCtxVar
//   { Type: 2, Subtype: 5, FieldType: 0, Slots: 2, }, //GetCtxVar
//   { Type: 2, Subtype: 6, FieldType: 0, Slots: 2, }, //Mul
//   { Type: 2, Subtype: 3, FieldType: 0, Slots: 2, }, //Div
//   { Type: 2, Subtype: 2, FieldType: 0, Slots: 2, }, //Modulo
//   { Type: 2, Subtype: 100, FieldType: 1, Slots: 1, }, //GetPlayerAttr
//   { Type: 2, Subtype: 101, FieldType: 0, Slots: 0, }, //GetPlayerIndex
//   { Type: 2, Subtype: 102, FieldType: 0, Slots: 1, }, //GetCardsAmount
//   { Type: 2, Subtype: 103, FieldType: 0, Slots: 0, }, //CurrentPlace
//   { Type: 2, Subtype: 105, FieldType: 0, Slots: 0, }, //CasterPlayerIndex
// ]


	// var elements = ;


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

	var [value, setValue] = useState(props.defaultValue)
	if (props.readonly)
		return (<p>Brick</p>)
	return (
		<Unity tabIndex={3} style={{ width: 500, height: 200 }} unityContext={unityContext} />
	);
}


export const SBrickSubtypeRender = (props: {
	defaultValue?: any, 
	onLoad: (newValue: any) => void,
 	onChange?: (newValue: any) => void  
}) => {
	const { Option } = Select;
	var [loaded, setLoaded] = useState(false)
	useEffect(() => {
		if (!loaded)
		{
			setLoaded(true)
			props.onLoad(new SBrick({brickType: 1}))
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
  id = 4;
  typeName = "Brick";
  nameRender = (<p>Brick</p>);
  render = SBrickRender;
  brickType = 1;

  static subtypeRender = SBrickSubtypeRender;
   constructor(src: { brickType: number }) {
  	super()
  	this.brickType = src.brickType
    this.render = (props: { readonly?: boolean, defaultValue?: PublicKey,  onChange?: (newValue: any) => void  }) => { return(<SBrickRender 
      onChange={props.onChange} 
      defaultValue={props.defaultValue} 
      brickType={this.brickType}
      readonly={props?.readonly}
    />)}
    this.nameRender = (<p>Brick: { this.brickType }</p>); //TOD: name
  }
  static read = (reader: BinaryReader) => {
  	return new SBrick({ brickType: reader.readU32() })
  }
  write = (writer: BinaryWriter) => {
  	writer.writeU32(this.brickType)
  }

  readValue = (reader: BinaryReader) => { 
    var type = reader.readU8()
    var subtype = reader.readU32()
    var brickSignature = getBrickSignature(type, subtype)
    var params: BrickParam[] = []
    if (!brickSignature)
      throw new Error("Reading brick failed")
    var paramsAmount = reader.readU32()
    for (var i = 0; i < paramsAmount; i++) {
      var paramId = reader.readU32()
      var paramSignature = getParamSignature(brickSignature, paramId)
      if (!paramSignature)
        throw new Error("Reading brick failed")
      params.push({
        paramId: paramId,
        value: paramSignature.type.readValue(reader)
      })
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
    writer.writeU32(value.params.length)
    for (var brickParam of value.params) {
      var paramSignature = getParamSignature(brickSignature, brickParam.paramId)
      if (paramSignature) {
        writer.writeU32(brickParam.paramId)
        paramSignature.type.writeValue(brickParam.value, writer)
      }
    }
  };
}


  function getParamSignature(brickSignature: BrickSignature, paramId: number) {
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
  type: SType,
}

type BrickSignature = {
  type: number,
  subtype: number,
  name: string,
  description: string,
  params: BrickParamSignature[]
}

const getBrickSignature = (type: number, subtype: number) => {
  for (let solceryBrick of solceryBricks) {
    if (solceryBrick.type == type && solceryBrick.subtype == subtype)
      return solceryBrick
  }
}

export const solceryBricks: BrickSignature[] = [
  {
    type: 0,
    subtype: 0,
    name: 'Void',
    description: 'Does nothing',
    params: [],
  },

  {
    type: 0,
    subtype: 1,
    name: 'Set',
    description: 'Description',
    params: [
      {
        id: 1,
        name: 'Action 1',
        type: new SBrick({ brickType: 0 }),
      },
      {
        id: 2,
        name: 'Action 2',
        type: new SBrick({ brickType: 0 }),
      }
    ],
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

type BrickParam = {
  paramId: number,
  value: any
}

type Brick = {
  type: number,
  subtype: number,
  params: BrickParam[],
}


function parseBrick(brickData: string) {
  var oldBrick: OldBrick = JSON.parse(brickData)
  console.log(oldBrick)
  var newBrick: Brick = {
    type: oldBrick.Type,
    subtype: oldBrick.Subtype,
    params: [],
  }
}

function oldBrickToBrick(oldBrick: OldBrick) {
  var result: Brick = {
    type: oldBrick.Type,
    subtype: oldBrick.Subtype,
    params: []
  }
  var paramId = 1
  if (oldBrick.HasField) {
    result.params.push({
      paramId: paramId,
      value: oldBrick.StringField ? oldBrick.StringField : oldBrick.IntField,
    })
    paramId++;
  }
  for (var slot of oldBrick.Slots) {
    result.params.push({
      paramId: paramId,
      value: oldBrickToBrick(slot)
    })
  }
  return result
}

function brickToOldBrick(brick: Brick) {
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
    var paramSignature = getParamSignature(brickSignature, param.paramId)
    if (!paramSignature)
      throw new Error('Brick to old brick failed')
    if (paramSignature.type instanceof SInt) {
      result.HasField = true
      result.IntField = param.value
      result.StringField = null
    }
    if (paramSignature.type instanceof SString) {
      result.HasField = true
      result.StringField = param.value
      result.IntField = 0
    }
    if (paramSignature.type instanceof SBrick) {
      result.Slots.push(brickToOldBrick(param.value))
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
