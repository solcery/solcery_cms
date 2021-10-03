import Unity, { UnityContext } from "react-unity-webgl";
import React, { useState, useEffect } from "react";
import { SType, SInt, SString } from "../index";
import { Select, Button } from 'antd';
import { PublicKey } from "@solana/web3.js";
import { BinaryReader, BinaryWriter } from 'borsh';
import { solceryTypes } from '../solceryTypes'
import { ValueRender, TypedataRender } from './components'


export class SBrick extends SType {
  id = 6;
  name = "Brick";
  valueRender = ValueRender;
  brickType = 0;

  static typedataRender = TypedataRender;
   constructor(src: { brickType: number }) {
  	super()
  	this.brickType = src.brickType
    this.nameRender = (<p>Brick: { this.brickType }</p>); //TOD: name
    this.valueRender = ValueRender
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

export const getParamSignatureById = (brickSignature: BrickSignature, paramId: number) => {
  for (var param of brickSignature.params) {
    if (param.id == paramId)
      return param
  }
}

const getBrickTypeName = (brickType: number) => {
  if (brickType == 0)
    return 'action'
  if (brickType == 1)
    return 'condition'
  if (brickType == 2)
    return 'value'
  return 'unknown'
}

const exportArgsAsParams = (brick: Brick, result: BrickParamSignature[]) => {
  let brickSignature = getBrickSignature(brick.type, brick.subtype)
  if (!brickSignature)
    return //throw error?
  if (brickSignature.name == 'Arg') { //TODO: proper check
    let paramName = brick.params.get(1)
    if (paramName) {
      let paramCode = 'arg.' + getBrickTypeName(brick.type) + '.' + camelize(paramName)
      result.push({
        id: result.length + 1,
        code: paramCode,
        name: paramName,
        type: new SBrick({ brickType: brick.type })
      })
    }
  } else {
    for (let [ paramId, param ] of brick.params) {
      if (param) {
        exportArgsAsParams(param, result)
      }
    }
  }
}

function camelize(str: string) {
  return str.replace(/(?:^\w|[A-Z]|\b\w)/g, function(word, index) {
    return index === 0 ? word.toLowerCase() : word.toUpperCase();
  }).replace(/\s+/g, '');
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

export type Brick = {
  type: number, // ACtion, Condition
  subtype: number, // Void, Set, Conditional, MoveTo
  params: Map<number, any>,
}

export type BrickParamSignature = {
  id: number,
  name: string,
  code: string,
  type: SType,
}

export type BrickSignature = {
  type: number,
  subtype: number,
  name: string,
  description?: string,
  params: any,
  func: any,
}

export const getBrickSignature = (type: number, subtype: number) => {
  for (let solceryBrick of solceryBricks) {
    if (solceryBrick.type == type && solceryBrick.subtype == subtype)
      return solceryBrick
  }
}

export const applyBrick = (brick: Brick, ctx: any) => {
  var brickSignature = getBrickSignature(brick.type, brick.subtype)
  if (brickSignature) {
    let parsedParams: any = {}
    for (let [ paramId, param ] of brick.params) {
      let paramSignature = getParamSignatureById(brickSignature, paramId)
      if (paramSignature) {
        parsedParams[paramSignature.code] = param
      }
    }
    return brickSignature.func(parsedParams, ctx)
  }
}

export const solceryBricks: BrickSignature[] = [];
export const solceryCustomBricks: BrickSignature[] = [];


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

export type OldBrick = {
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

export function getBrickConfigs() {
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



const constructBrickType = (content: any, brickType: number, brickTypeName: string) => {
  let brickTypeTemplate = content[brickTypeName]
  if (brickTypeTemplate) {
    for (let objectKey of Object.keys(brickTypeTemplate)) {
      let argParams: BrickParamSignature[] = []
      let object = brickTypeTemplate[objectKey]
      exportArgsAsParams(object.brick, argParams)
      solceryBricks.push({
        type: 0,
        subtype: 10000 + object.id,
        name: object.name,
        params: argParams,
        func: (params: any, ctx: any) => {
          Object.keys(params).forEach(paramCode => { 
            ctx.args[paramCode] = params[paramCode] 
          });
          applyBrick(ctx.game.content.actions[objectKey].brick, ctx) // closure?
        }
      })
    }
  }
}



export const constructBricks = (content: any) => {
  constructBrickType(content, 0, 'actions')
  constructBrickType(content, 1, 'conditions')
  constructBrickType(content, 2, 'values')
}

solceryBricks.push({
  type: 0,
  subtype: 10017,
  name: 'MoveTo',
  func: () => {},
  params: [
    { id: 1, code: 'place', name: 'Place', type: new SBrick({ brickType: 2 }) },
  ],
})


solceryBricks.push({
  type: 0,
  subtype: 0,
  name: 'Void',
  func: () => {},
  params: [],
})

// action.set
solceryBricks.push({
  type: 0,
  subtype: 1,
  name: 'Set',
  params: [
    { id: 1, code: 'action1', name: 'Action 1', type: new SBrick({ brickType: 0 }) },
    { id: 2, code: 'action2', name: 'Action 2', type: new SBrick({ brickType: 0 }) }
  ],
  func: (params: any, ctx: any) => {
    applyBrick(params.action1, ctx)
    applyBrick(params.action2, ctx)
  }
})

// action.conditional
solceryBricks.push({
  type: 0,
  subtype: 2,
  name: 'Conditional',
  params: [
    { id: 1, code: 'condition', name: 'Condition', type: new SBrick({ brickType: 1 }) },
    { id: 2, code: 'positive', name: 'Positive', type: new SBrick({ brickType: 0 }) },
    { id: 3, code: 'negative', name: 'Negative', type: new SBrick({ brickType: 0 }) }
  ],
  func: (params: any, ctx: any) => {
    if (applyBrick(params.condition, ctx))
      applyBrick(params.positive, ctx)
    else
      applyBrick(params.negative, ctx)
  }
})

solceryBricks.push({
  type: 0,
  subtype: 3,
  name: 'Loop',
  params: [
    { id: 1, code: 'iterations', name: 'Iterations', type: new SBrick({ brickType: 2 }) },
    { id: 2, code: 'action', name: 'Action', type: new SBrick({ brickType: 0 }) }
  ],
  func: (params: any, ctx: any) => {
    let iter = applyBrick(params.iterations, ctx)
    for (let i = 0; i < iter; i++)
      applyBrick(params.action, ctx)
  }
})

solceryBricks.push({
  type: 0,
  subtype: 4,
  name: 'Arg',
  params: [
    
  ],
  func: (params: any, ctx: any) => {
    // TODO
  }
})

solceryBricks.push({
  type: 0,
  subtype: 5,
  name: 'Iterator',
  params: [
    { id: 1, code: 'condition', name: 'Condition', type: new SBrick({ brickType: 1 }) },
    { id: 2, code: 'action', name: 'Action', type: new SBrick({ brickType: 0 }) },
    { id: 3, code: 'limit', name: 'Limit', type: new SBrick({ brickType: 2 }) }
  ],
  func: (params: any, ctx: any) => {
    let limit = applyBrick(params.limit, ctx)
    let objs: any[] = []
    let oldOlbj = ctx.object 
    let amount = 0
    for (let object of ctx.game.objects) { // TODO: shuffle
      let obj = object[1]
      if (amount < limit) {
        ctx.object = obj
        if (applyBrick(params.condition, ctx)) {
          amount++;
          console.log(amount)
          objs.push(obj)
        }
      }
    }
    for (let obj of objs) {
      ctx.object = obj
      applyBrick(params.action, ctx)
    }
    ctx.object = oldOlbj
  }
})

solceryBricks.push({
  type: 0,
  subtype: 6,
  name: 'SetVar',
  params: [
    { id: 1, code: 'varName', name: 'Var', type: new SString() },
    { id: 2, code: 'value', name: 'Value', type: new SBrick({ brickType: 2 }) }
  ],
  func: (params: any, ctx: any) => {
    let varName = params.varName
    let value = params.value
    ctx.vars[varName] = applyBrick(value, ctx)
  }
})

solceryBricks.push({
  type: 0,
  subtype: 7,
  name: 'SetAttr',
  params: [
    { id: 1, code: 'attrName', name: 'Attr', type: new SString() },
    { id: 2, code: 'value', name: 'Value', type: new SBrick({ brickType: 2 }) }
  ],
  func: (params: any, ctx: any) => {
    let attrName = params.attrName
    let value = params.value
    ctx.object.attrs[attrName] = applyBrick(value, ctx)
  }
})


//condition.const
solceryBricks.push({
  type: 1,
  subtype: 0,
  name: 'Const',
  params: [
    { id: 1, code: 'value', name: 'Value', type: new SInt() }, //TODO
  ],
  func: (params: any, ctx: any) => {
    return params.value != 0
  }
})

//condition.const
solceryBricks.push({
  type: 1,
  subtype: 1,
  name: 'Not',
  params: [
    { id: 1, code: 'condition', name: 'Condition', type: new SBrick({ brickType: 1 }) }, //TODO
  ],
  func: (params: any, ctx: any) => {
    return !applyBrick(params.condition, ctx)
  }
})

//condition.equal
solceryBricks.push({
  type: 1,
  subtype: 2,
  name: 'Equal',
  params: [
    { id: 1, code: 'value1', name: 'Value1', type: new SBrick({ brickType: 2 }) },
    { id: 2, code: 'value2', name: 'Value2', type: new SBrick({ brickType: 2 }) }
  ],
  func: (params: any, ctx: any) => {
    return applyBrick(params.value1, ctx) == applyBrick(params.value2, ctx)
  }
})

//condition.equal
solceryBricks.push({
  type: 1,
  subtype: 3,
  name: 'Greater than',
  params: [
    { id: 1, code: 'value1', name: 'Value1', type: new SBrick({ brickType: 2 }) },
    { id: 2, code: 'value2', name: 'Value2', type: new SBrick({ brickType: 2 }) }
  ],
  func: (params: any, ctx: any) => {
    return applyBrick(params.value1, ctx) > applyBrick(params.value2, ctx)
  }
})

//condition.lesserThan
solceryBricks.push({
  type: 1,
  subtype: 4,
  name: 'Lesser than',
  params: [
    { id: 1, code: 'value1', name: 'Value1', type: new SBrick({ brickType: 2 }) },
    { id: 2, code: 'value2', name: 'Value2', type: new SBrick({ brickType: 2 }) }
  ],
  func: (params: any, ctx: any) => {
    return applyBrick(params.value1, ctx) < applyBrick(params.value2, ctx)
  }
})

solceryBricks.push({
  type: 1,
  subtype: 5,
  name: 'Arg',
  params: [
    
  ],
  func: (params: any, ctx: any) => {
    // TODO
  }
})


solceryBricks.push({
  type: 2,
  subtype: 0,
  name: 'Const',
  params: [
    { id: 1, code: 'value', name: 'Value', type: new SInt() }
  ],
  func: (params: any, ctx: any) => {
    return params.value
  }
})

// value.attr
solceryBricks.push({
  type: 2,
  subtype: 1,
  name: 'Var',
  params: [
    { id: 1, code: 'varName', name: 'Var', type: new SString() }
  ],
  func: (params: any, ctx: any) => {
    return ctx.vars[params.varName]
  }
})

// value.attr
solceryBricks.push({
  type: 2,
  subtype: 2,
  name: 'Attr',
  params: [
    { id: 1, code: 'attrName', name: 'Attr', type: new SString() }
  ],
  func: (params: any, ctx: any) => {
    return ctx.object.attrs[params.attrName]
  }
})

solceryBricks.push({
  type: 2,
  subtype: 3,
  name: 'Arg',
  params: [
    { id: 1, code: 'name', name: 'Name', type: new SString() },
  ],
  func: (params: any, ctx: any) => {
    return applyBrick(ctx.args[params.name], ctx)
  }
})

// value.conditional
solceryBricks.push({
  type: 2,
  subtype: 4,
  name: 'Conditional',
  params: [
    { id: 1, code: 'condition', name: 'Condition', type: new SBrick({ brickType: 1 }) },
    { id: 2, code: 'positive', name: 'Positive', type: new SBrick({ brickType: 2 }) },
    { id: 3, code: 'negative', name: 'Negative', type: new SBrick({ brickType: 2 }) }
  ],
  func: (params: any, ctx: any) => {
    if (applyBrick(params.condition, ctx))
      return applyBrick(params.positive, ctx)
    else
      return applyBrick(params.negative, ctx)
  }
})

solceryBricks.push({
  type: 2,
  subtype: 5,
  name: 'Add',
  params: [
    { id: 1, code: 'value1', name: 'Value1', type: new SBrick({ brickType: 2 }) },
    { id: 2, code: 'value2', name: 'Value2', type: new SBrick({ brickType: 2 }) }
  ],
  func: (params: any, ctx: any) => {
    let v1 = applyBrick(params.value1, ctx)
    let v2 = applyBrick(params.value2, ctx)
    return v1 + v2  
  }
})

solceryBricks.push({
  type: 2,
  subtype: 6,
  name: 'Sub',
  params: [
    { id: 1, code: 'value1', name: 'Value1', type: new SBrick({ brickType: 2 }) },
    { id: 2, code: 'value2', name: 'Value2', type: new SBrick({ brickType: 2 }) }
  ],
  func: (params: any, ctx: any) => {
    let v1 = applyBrick(params.value1, ctx)
    let v2 = applyBrick(params.value2, ctx)
    return v1 - v2
  }
})

solceryBricks.push({
  type: 2,
  subtype: 7,
  name: 'Mul',
  params: [
    { id: 1, code: 'value1', name: 'Value1', type: new SBrick({ brickType: 2 }) },
    { id: 2, code: 'value2', name: 'Value2', type: new SBrick({ brickType: 2 }) }
  ],
  func: (params: any, ctx: any) => {
    let v1 = applyBrick(params.value1, ctx)
    let v2 = applyBrick(params.value2, ctx)
    return v1 * v2
  }
})

solceryBricks.push({
  type: 2,
  subtype: 8,
  name: 'Div',
  params: [
    { id: 1, code: 'value1', name: 'Value1', type: new SBrick({ brickType: 2 }) },
    { id: 2, code: 'value2', name: 'Value2', type: new SBrick({ brickType: 2 }) }
  ],
  func: (params: any, ctx: any) => {
    let v1 = applyBrick(params.value1, ctx)
    let v2 = applyBrick(params.value2, ctx)
    return Math.floor(v1 / v2) 
  }
})

solceryBricks.push({
  type: 2,
  subtype: 9,
  name: 'Mod',
  params: [
    { id: 1, code: 'value1', name: 'Value1', type: new SBrick({ brickType: 2 }) },
    { id: 2, code: 'value2', name: 'Value2', type: new SBrick({ brickType: 2 }) }
  ],
  func: (params: any, ctx: any) => {
    let v1 = applyBrick(params.value1, ctx)
    let v2 = applyBrick(params.value2, ctx)
    return v1 - Math.floor(v1 / v2) 
  }
})

solceryBricks.push({
  type: 2,
  subtype: 10,
  name: 'Rand',
  params: [
    { id: 1, code: 'value', name: 'From', type: new SBrick({ brickType: 2 }) },
    { id: 2, code: 'value', name: 'To', type: new SBrick({ brickType: 2 }) }
  ],
  func: (params: any, ctx: any) => {
    return 1 // TODO: 
  }
})
