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
  static typename = "Brick";
  typename = "Brick";
  valueRender = ValueRender;
  brickType: number;

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
    var type = reader.readU32()
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
    writer.writeU32(value.type)
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

const exportArgsAsParams = (brick: Brick, result: Map<string, BrickParamSignature>) => {
  let brickSignature = getBrickSignature(brick.type, brick.subtype)
  if (brickSignature && brickSignature.name === 'Argument') { //TODO: proper check
    let paramName = brick.params.get(1)
    if (!paramName)
      throw new Error("Error loading bricks")
    let paramKey = getBrickTypeName(brick.type) + '.' + paramName
    if (!result.has(paramKey))
      result.set(paramKey, {
        id: result.size + 1,
        name: paramName,
        code: paramName,
        type: new SBrick({ brickType: brick.type })
      })
  }
  for (let [ paramId, param ] of brick.params) {
    if (param && param instanceof Object) { // TODO: check if brick
      exportArgsAsParams(param, result)
    }
  }
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
        parsedParams[paramSignature.id] = param
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
  let paramsMap = new Map<string, BrickParamSignature>()
  exportArgsAsParams(brick, paramsMap)
  let argParams = Array.from(paramsMap.values())
  let name = object.fields.get(1)
  let subtype = 10000 + object.id
  return {
    type: brick.type,
    subtype: subtype, //TODO: magic number
    name: name,
    params: argParams,
    func: (params: any, ctx: any) => {
      let args: any = {}
      Object.keys(params).forEach(function(paramId, index) {
        let param = argParams[index]
        args[param.name] = params[paramId]
      });
      ctx.args.push(args)
      // Object.keys(params).forEach(function(paramId, index) {
      //   let param = argParams[index]
      //   ctx.args[param.name] = applyBrick(params[paramId], ctx) // Calculating params TODO: addType
      // });
      let result = applyBrick(ctx.game.content[templateName][object.publicKey.toBase58()].brick, ctx) // closure?
      ctx.args.pop()
      return result
    }
  }
}

export const basicBricks: BrickSignature[] = [];
export const customBricks: BrickSignature[] = [];
export const solceryBricks: BrickSignature[] = [];

function aplhabetSortBricks(a: BrickSignature, b: BrickSignature) {
  return a.name.localeCompare(b.name)
}

export const updateCustomBricks = (src: BrickSignature[]) => {
  customBricks.length = 0
  for (let brick of src)
    customBricks.push(brick)
  customBricks.sort(aplhabetSortBricks)
  solceryBricks.length = 0
  for (let brick of basicBricks)
    solceryBricks.push(brick)
  for (let brick of customBricks)
    solceryBricks.push(brick)
}

export const getBricks = () => {
  return solceryBricks
}

const argFunc = (params: any, ctx: any) => {
  var args = ctx.args.pop()
  var result = applyBrick(args[params[1]], ctx)
  ctx.args.push(args)
  return result
}

const altArgFunc = (params: any, ctx: any) => {
  return ctx.args[params[1]]
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
  name: 'Two actions',
  params: [
    { id: 1, name: 'Action #1', type: new SBrick({ brickType: 0 }) },
    { id: 2, name: 'Action #2', type: new SBrick({ brickType: 0 }) }
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
  name: 'If-Then-Else',
  params: [
    { id: 1, name: 'If', type: new SBrick({ brickType: 1 }) },
    { id: 2, name: 'Then', type: new SBrick({ brickType: 0 }) },
    { id: 3, name: 'Else', type: new SBrick({ brickType: 0 }) }
  ],
  func: (params: any, ctx: any) => {
    if (applyBrick(params[1], ctx)) {
      applyBrick(params[2], ctx)
    }
    else {
      applyBrick(params[3], ctx)
    }
  }
})

basicBricks.push({
  type: 0,
  subtype: 3,
  name: 'Loop',
  params: [
    { id: 1, name: 'Counter var', type: new SString() },
    { id: 2, name: 'Iterations', type: new SBrick({ brickType: 2 }) },
    { id: 3, name: 'Action', type: new SBrick({ brickType: 0 }) },
  ],
  func: (params: any, ctx: any) => {
    let iter = applyBrick(params[2], ctx)
    for (let i = 0; i < iter; i++) {
      ctx.vars[params[1]] = i; //TODO: cleanup
      applyBrick(params[3], ctx);
    }
  }
})

// basicBricks.push({
//   type: 0,
//   subtype: 4,
//   name: 'Argument',
//   params: [
//     { id: 1, name: 'Name', type: new SString() },
//   ],
//   func: argFunc,
// })

function shuffleArray(array: any[]) {
    for (var i = array.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var temp = array[i];
        array[i] = array[j];
        array[j] = temp;
    }
}

basicBricks.push({
  type: 0,
  subtype: 5,
  name: 'Iterator',
  params: [
    { id: 1, name: 'Condition', type: new SBrick({ brickType: 1 }) },
    { id: 2, name: 'Action', type: new SBrick({ brickType: 0 }) },
    { id: 3, name: 'Limit', type: new SBrick({ brickType: 2 }) }
  ],
  func: (params: any, ctx: any) => {
    let limit = applyBrick(params[3], ctx)
    let objs: any[] = []
    let oldOlbj = ctx.object 
    let amount = 0
    let objects = [...ctx.game.objects.values()]
    shuffleArray(objects)
    while (limit > 0 && objects.length > 0) {
      ctx.object = objects.pop()
      if (applyBrick(params[1], ctx)) {
        objs.push(ctx.object)
        limit--;
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
  name: 'Set variable',
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
  name: 'Set attribute',
  params: [
    { id: 1, code: 'attrName', name: 'Attr', type: new SString() },
    { id: 2, code: 'value', name: 'Value', type: new SBrick({ brickType: 2 }) }
  ],
  func: (params: any, ctx: any) => {
    let attrName = params[1]
    let value = applyBrick(params[2], ctx)
    ctx.object.attrs[attrName] = value
    if (ctx.diff) {
      let objectId = ctx.object.id
      let objectDiff = ctx.diff.get(objectId)
      if (!objectDiff)
        ctx.diff.set(objectId, new Map())
      ctx.diff.get(objectId).set(attrName, value)
    }
  }
})


basicBricks.push({
  type: 0,
  subtype: 8,
  name: 'Use card',
  params: [],
  func: (params: any, ctx: any) => {
    let tplId = ctx.object.tplId
    let cardTypes = ctx.game.content.cardTypes
    for (let cardTypeId in cardTypes) {
      let cardType = cardTypes[cardTypeId]
      if (cardType.id == tplId) {
        if (cardType.action) {
          applyBrick(cardType.action, ctx)
        }
        return
      }
    }
  }
})



//condition.const
basicBricks.push({
  type: 1,
  subtype: 0,
  name: 'Constant',
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
    return applyBrick(params[1], ctx) === applyBrick(params[2], ctx)
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
  name: 'Argument',
  params: [
    { id: 1, code: 'name', name: 'Name', type: new SString() },
  ],
  func: argFunc,
})

basicBricks.push({
  type: 1,
  subtype: 6,
  name: 'Or',
   params: [
    { id: 1, code: 'cond1', name: 'Cond #1', type: new SBrick({ brickType: 1 }) },
    { id: 2, code: 'cond2', name: 'Cond #2', type: new SBrick({ brickType: 1 }) }
  ],
  func: (params: any, ctx: any) => {
    return applyBrick(params[1], ctx) || applyBrick(params[2], ctx)
  },
})

basicBricks.push({
  type: 1,
  subtype: 7,
  name: 'And',
   params: [
    { id: 1, code: 'cond1', name: 'Cond #1', type: new SBrick({ brickType: 1 }) },
    { id: 2, code: 'cond2', name: 'Cond #2', type: new SBrick({ brickType: 1 }) }
  ],
  func: (params: any, ctx: any) => {
    return applyBrick(params[1], ctx) && applyBrick(params[2], ctx)
  },
})


basicBricks.push({
  type: 2,
  subtype: 0,
  name: 'Constant',
  params: [
    { id: 1, code: 'value', name: 'Value', type: new SInt() }
  ],
  func: (params: any, ctx: any) => {
    return params[1]
  }
})

// value.attr
basicBricks.push({
  type: 2,
  subtype: 1,
  name: 'Variable',
  params: [
    { id: 1, code: 'varName', name: 'Variable name', type: new SString() }
  ],
  func: (params: any, ctx: any) => {
    let res = ctx.vars[params[1]]
    return res ? res : 0
  }
})

// value.attr
basicBricks.push({
  type: 2,
  subtype: 2,
  name: 'Attribute',
  params: [
    { id: 1, code: 'attrName', name: 'Attribute name', type: new SString() }
  ],
  func: (params: any, ctx: any) => {
    return ctx.object.attrs[params[1]]
  }
})

basicBricks.push({
  type: 2,
  subtype: 3,
  name: 'Argument',
  params: [
    { id: 1, name: 'Name', type: new SString() },
  ],
  func: argFunc,
})

// value.conditional
basicBricks.push({
  type: 2,
  subtype: 4,
  name: 'If-Then-Else',
  params: [
    { id: 1, name: 'If', type: new SBrick({ brickType: 1 }) },
    { id: 2, name: 'Then', type: new SBrick({ brickType: 2 }) },
    { id: 3, name: 'Else', type: new SBrick({ brickType: 2 }) }
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
  name: 'Addition',
  params: [
    { id: 1, name: 'Value #1', type: new SBrick({ brickType: 2 }) },
    { id: 2, name: 'Value #2', type: new SBrick({ brickType: 2 }) }
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
  name: 'Subtraction',
  params: [
    { id: 1, name: 'Value #1', type: new SBrick({ brickType: 2 }) },
    { id: 2, name: 'Value #2', type: new SBrick({ brickType: 2 }) }
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
  name: 'Multiplication',
  params: [
    { id: 1, name: 'Value #1', type: new SBrick({ brickType: 2 }) },
    { id: 2, name: 'Value #2', type: new SBrick({ brickType: 2 }) }
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
  name: 'Division',
  params: [
    { id: 1, name: 'Value #1', type: new SBrick({ brickType: 2 }) },
    { id: 2, name: 'Value #2', type: new SBrick({ brickType: 2 }) }
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
  name: 'Modulo',
  params: [
    { id: 1, name: 'Value #1', type: new SBrick({ brickType: 2 }) },
    { id: 2, name: 'Value #2', type: new SBrick({ brickType: 2 }) }
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
  name: 'Random',
  params: [
    { id: 1, code: 'value', name: 'From', type: new SBrick({ brickType: 2 }) },
    { id: 2, code: 'value', name: 'To', type: new SBrick({ brickType: 2 }) }
  ],
  func: (params: any, ctx: any) => {
    let min = applyBrick(params[1], ctx)
    let max = applyBrick(params[2], ctx) + 1
    return min + Math.floor(Math.random() * (max - min));
  }
})

basicBricks.push({
  type: 2,
  subtype: 11,
  name: 'Card Id',
  params: [],
  func: (params: any, ctx: any) => {
    return ctx.object.id
  }
})

basicBricks.push({
  type: 2,
  subtype: 12,
  name: 'Card type Id',
  params: [],
  func: (params: any, ctx: any) => {
    return ctx.object.tplId
  }
})
