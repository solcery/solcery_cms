import Unity, { UnityContext } from "react-unity-webgl";
import React, { useState, useEffect } from "react";
import { SType, SInt, SString } from "../index";
import { Select, Button } from 'antd';
import { PublicKey } from "@solana/web3.js";
import { BinaryReader, BinaryWriter } from 'borsh';
import { solceryTypes } from '../solceryTypes'
import { ValueRender, TypedataRender } from './components'
import { TplObject } from '../../classes'

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

  readValue = (reader: BinaryReader) => { // reading ignoring brick signatures
    var type = reader.readU8()
    var subtype = reader.readU32()
    var params: Map<number, any> = new Map()
    var paramsAmount = reader.readU32()
    for (var i = 0; i < paramsAmount; i++) {
      var paramId = reader.readU32()
      var paramType = reader.readSType()
      var value = paramType.readValue(reader)
      params.set(paramId, value)
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
        writer.writeSType(paramSignature.type)
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
  if (brickSignature && brickSignature.name === 'Arg') { //TODO: proper check
    let paramName = brick.params.get(1)
    if (!paramName)
      throw new Error("Error loading bricks")
    result.push({
      id: result.length + 1,
      code: paramName,
      name: paramName,
      type: new SBrick({ brickType: brick.type })
    })
  }
  for (let [ paramId, param ] of brick.params) {
    if (param && param instanceof Object) { // TODO: check if brick
      exportArgsAsParams(param, result)
    }
  }
}

function camelize(str: string) {
  return str.replace(/(?:^\w|[A-Z]|\b\w)/g, function(word, index) {
    return index === 0 ? word.toLowerCase() : word.toUpperCase();
  }).replace(/\s+/g, '');
}

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

export const getBrickSignature = (type: number, subtype: number) => { // TODO customBricks
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

export function getBrickConfigs(bricks: any) {
  var actions = []
  var conditions = []
  var values = []
  for (var brickSignature of bricks) {
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

export const exportBrick = (object: TplObject, brick: Brick) => {
  let templateName = getBrickTypeName(brick.type) + 's'
  let argParams: BrickParamSignature[] = []
  exportArgsAsParams(brick, argParams)
  return {
    type: brick.type,
    subtype: 10000 + object.id, //TODO: magic number
    name: object.fields.get(1),
    params: argParams,
    func: (params: any, ctx: any) => {
      let args: any = {}
      Object.keys(params).forEach(function(paramId, index) {
        let param = argParams[index]
        args[param.code] = params[paramId]
      });
      ctx.args.push(args)
      applyBrick(ctx.game.content[templateName][object.publicKey.toBase58()].brick, ctx) // closure?
    }
  }
}

export const basicBricks: BrickSignature[] = [];
export const customBricks: BrickSignature[] = [];
export const solceryBricks: BrickSignature[] = [];

export const updateCustomBricks = (src: BrickSignature[]) => {
  customBricks.length = 0
  for (let brick of src)
    customBricks.push(brick)
  solceryBricks.length = 0
  for (let brick of basicBricks)
    solceryBricks.push(brick)
  for (let brick of customBricks)
    solceryBricks.push(brick)
}

export const getBricks = () => {
  return solceryBricks
}

basicBricks.push({
  type: 0,
  subtype: 0,
  name: 'Void',
  func: () => {},
  params: [],
})

// action.set
basicBricks.push({
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
})

// action.conditional
basicBricks.push({
  type: 0,
  subtype: 2,
  name: 'Conditional',
  params: [
    { id: 1, code: 'condition', name: 'Condition', type: new SBrick({ brickType: 1 }) },
    { id: 2, code: 'positive', name: 'Positive', type: new SBrick({ brickType: 0 }) },
    { id: 3, code: 'negative', name: 'Negative', type: new SBrick({ brickType: 0 }) }
  ],
  func: (params: any, ctx: any) => {
    if (applyBrick(params[1], ctx))
      applyBrick(params[2], ctx)
    else
      applyBrick(params[3], ctx)
  }
})

basicBricks.push({
  type: 0,
  subtype: 3,
  name: 'Loop',
  params: [
    { id: 1, code: 'iterations', name: 'Iterations', type: new SBrick({ brickType: 2 }) },
    { id: 2, code: 'action', name: 'Action', type: new SBrick({ brickType: 0 }) }
  ],
  func: (params: any, ctx: any) => {
    let iter = applyBrick(params[1], ctx)
    for (let i = 0; i < iter; i++)
      applyBrick(params[2], ctx)
  }
})

basicBricks.push({
  type: 0,
  subtype: 4,
  name: 'Arg',
  params: [
    
  ],
  func: (params: any, ctx: any) => {
    // TODO
  }
})

basicBricks.push({
  type: 0,
  subtype: 5,
  name: 'Iterator',
  params: [
    { id: 1, code: 'condition', name: 'Condition', type: new SBrick({ brickType: 1 }) },
    { id: 2, code: 'action', name: 'Action', type: new SBrick({ brickType: 0 }) },
    { id: 3, code: 'limit', name: 'Limit', type: new SBrick({ brickType: 2 }) }
  ],
  func: (params: any, ctx: any) => {
    let limit = applyBrick(params[3], ctx)
    let objs: any[] = []
    let oldOlbj = ctx.object 
    let amount = 0
    for (let object of ctx.game.objects) { // TODO: shuffle
      let obj = object[1]
      if (amount < limit) {
        ctx.object = obj
        if (applyBrick(params[1], ctx)) {
          amount++;
          objs.push(obj)
        }
      }
    }
    for (let obj of objs) {
      ctx.object = obj
      applyBrick(params[2], ctx)
    }
    ctx.object = oldOlbj
  }
})

basicBricks.push({
  type: 0,
  subtype: 6,
  name: 'SetVar',
  params: [
    { id: 1, code: 'varName', name: 'Var', type: new SString() },
    { id: 2, code: 'value', name: 'Value', type: new SBrick({ brickType: 2 }) }
  ],
  func: (params: any, ctx: any) => {
    let varName = params[1]
    let value = params[2]
    ctx.vars[varName] = applyBrick(value, ctx)
  }
})

basicBricks.push({
  type: 0,
  subtype: 7,
  name: 'SetAttr',
  params: [
    { id: 1, code: 'attrName', name: 'Attr', type: new SString() },
    { id: 2, code: 'value', name: 'Value', type: new SBrick({ brickType: 2 }) }
  ],
  func: (params: any, ctx: any) => {
    ctx.object.attrs[params.attrName] = applyBrick(params.value, ctx)
  }
})


//condition.const
basicBricks.push({
  type: 1,
  subtype: 0,
  name: 'Const',
  params: [
    { id: 1, code: 'value', name: 'Value', type: new SInt() }, //TODO
  ],
  func: (params: any, ctx: any) => {
    return params[1] != 0
  }
})

//condition.const
basicBricks.push({
  type: 1,
  subtype: 1,
  name: 'Not',
  params: [
    { id: 1, code: 'condition', name: 'Condition', type: new SBrick({ brickType: 1 }) }, //TODO
  ],
  func: (params: any, ctx: any) => {
    return !applyBrick(params[1], ctx)
  }
})

//condition.equal
basicBricks.push({
  type: 1,
  subtype: 2,
  name: 'Equal',
  params: [
    { id: 1, code: 'value1', name: 'Value1', type: new SBrick({ brickType: 2 }) },
    { id: 2, code: 'value2', name: 'Value2', type: new SBrick({ brickType: 2 }) }
  ],
  func: (params: any, ctx: any) => {
    return applyBrick(params[1], ctx) == applyBrick(params[2], ctx)
  }
})

//condition.equal
basicBricks.push({
  type: 1,
  subtype: 3,
  name: 'Greater than',
  params: [
    { id: 1, code: 'value1', name: 'Value1', type: new SBrick({ brickType: 2 }) },
    { id: 2, code: 'value2', name: 'Value2', type: new SBrick({ brickType: 2 }) }
  ],
  func: (params: any, ctx: any) => {
    return applyBrick(params[1], ctx) > applyBrick(params[2], ctx)
  }
})

//condition.lesserThan
basicBricks.push({
  type: 1,
  subtype: 4,
  name: 'Lesser than',
  params: [
    { id: 1, code: 'value1', name: 'Value1', type: new SBrick({ brickType: 2 }) },
    { id: 2, code: 'value2', name: 'Value2', type: new SBrick({ brickType: 2 }) }
  ],
  func: (params: any, ctx: any) => {
    return applyBrick(params[1], ctx) < applyBrick(params[2], ctx)
  }
})

basicBricks.push({
  type: 1,
  subtype: 5,
  name: 'Arg',
  params: [
    
  ],
  func: (params: any, ctx: any) => {
    // TODO
  }
})


basicBricks.push({
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
basicBricks.push({
  type: 2,
  subtype: 1,
  name: 'Var',
  params: [
    { id: 1, code: 'varName', name: 'Var', type: new SString() }
  ],
  func: (params: any, ctx: any) => {
    return ctx.vars[params[1]]
  }
})

// value.attr
basicBricks.push({
  type: 2,
  subtype: 2,
  name: 'Attr',
  params: [
    { id: 1, code: 'attrName', name: 'Attr', type: new SString() }
  ],
  func: (params: any, ctx: any) => {
    return ctx.object.attrs[params[1]]
  }
})

basicBricks.push({
  type: 2,
  subtype: 3,
  name: 'Arg',
  params: [
    { id: 1, code: 'name', name: 'Name', type: new SString() },
  ],
  func: (params: any, ctx: any) => {
    var args = ctx.args.pop()
    var result = applyBrick(args[params.name], ctx)
    ctx.args.push(args)
    return result
  }
})

// value.conditional
basicBricks.push({
  type: 2,
  subtype: 4,
  name: 'Conditional',
  params: [
    { id: 1, code: 'condition', name: 'Condition', type: new SBrick({ brickType: 1 }) },
    { id: 2, code: 'positive', name: 'Positive', type: new SBrick({ brickType: 2 }) },
    { id: 3, code: 'negative', name: 'Negative', type: new SBrick({ brickType: 2 }) }
  ],
  func: (params: any, ctx: any) => {
    if (applyBrick(params[1], ctx))
      return applyBrick(params[2], ctx)
    else
      return applyBrick(params[3], ctx)
  }
})

basicBricks.push({
  type: 2,
  subtype: 5,
  name: 'Add',
  params: [
    { id: 1, code: 'value1', name: 'Value1', type: new SBrick({ brickType: 2 }) },
    { id: 2, code: 'value2', name: 'Value2', type: new SBrick({ brickType: 2 }) }
  ],
  func: (params: any, ctx: any) => {
    let v1 = applyBrick(params[1], ctx)
    let v2 = applyBrick(params[2], ctx)
    return v1 + v2  
  }
})

basicBricks.push({
  type: 2,
  subtype: 6,
  name: 'Sub',
  params: [
    { id: 1, code: 'value1', name: 'Value1', type: new SBrick({ brickType: 2 }) },
    { id: 2, code: 'value2', name: 'Value2', type: new SBrick({ brickType: 2 }) }
  ],
  func: (params: any, ctx: any) => {
    let v1 = applyBrick(params[1], ctx)
    let v2 = applyBrick(params[2], ctx)
    return v1 - v2
  }
})

basicBricks.push({
  type: 2,
  subtype: 7,
  name: 'Mul',
  params: [
    { id: 1, code: 'value1', name: 'Value1', type: new SBrick({ brickType: 2 }) },
    { id: 2, code: 'value2', name: 'Value2', type: new SBrick({ brickType: 2 }) }
  ],
  func: (params: any, ctx: any) => {
    let v1 = applyBrick(params[1], ctx)
    let v2 = applyBrick(params[2], ctx)
    return v1 * v2
  }
})

basicBricks.push({
  type: 2,
  subtype: 8,
  name: 'Div',
  params: [
    { id: 1, code: 'value1', name: 'Value1', type: new SBrick({ brickType: 2 }) },
    { id: 2, code: 'value2', name: 'Value2', type: new SBrick({ brickType: 2 }) }
  ],
  func: (params: any, ctx: any) => {
    let v1 = applyBrick(params[1], ctx)
    let v2 = applyBrick(params[2], ctx)
    return Math.floor(v1 / v2) 
  }
})

basicBricks.push({
  type: 2,
  subtype: 9,
  name: 'Mod',
  params: [
    { id: 1, code: 'value1', name: 'Value1', type: new SBrick({ brickType: 2 }) },
    { id: 2, code: 'value2', name: 'Value2', type: new SBrick({ brickType: 2 }) }
  ],
  func: (params: any, ctx: any) => {
    let v1 = applyBrick(params[1], ctx)
    let v2 = applyBrick(params[2], ctx)
    return v1 - Math.floor(v1 / v2) 
  }
})

basicBricks.push({
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
