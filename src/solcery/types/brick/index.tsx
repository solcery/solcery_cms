import React, { useState, useEffect } from "react";
import { SType, SInt, SString, SBool } from "../index";
import { Select, Button } from 'antd';
import { PublicKey } from "@solana/web3.js";
import { BinaryReader, BinaryWriter } from 'borsh';
import { solceryTypes } from '../solceryTypes'
import { ValueRender, TypedataRender } from './components'

const debug = { log: false }

const checkValidity: (brickTree: any) => boolean = (brickTree: any) => {
  if (brickTree === undefined || brickTree === null)
    return false
  if (!brickTree.params)
    return true
  let result: boolean = true
  for (let param of brickTree.params) {
    result = result && checkValidity(param.value)
  }
  return result
}

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

  readValue = (reader: BinaryReader) => { // reading ignoring brick signatures and this.brickType
    var type = reader.readU32()
    var subtype = reader.readU32()
    var params: BrickParam[] = []
    var paramsAmount = reader.readU32()
    for (var i = 0; i < paramsAmount; i++) {
      var paramId = reader.readU32()
      var paramType = reader.readSType()
      var value = paramType.readValue(reader)
      params.push({
        id: paramId,
        value: value
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
    if (!brickSignature) {
      let def = defaultBricksByType.get(value.type)
      this.writeValue(def, writer)
      return
    }
    writer.writeU32(value.type)
    writer.writeU32(value.subtype)
    writer.writeU32(brickSignature.params.length)
    for (let param of value.params) {
      var paramSignature = getParamSignatureById(brickSignature, param.id)
      if (paramSignature) { //writing only params existing in signature
        writer.writeU32(param.id)
        writer.writeSType(paramSignature.type)
        paramSignature.type.writeValue(param.value, writer)
      }
    }
  };

  readConstructed = (reader: BinaryReader) => { // reading ignoring brick signatures and this.brickType
    var type = reader.readU32()
    var subtype = reader.readU32()
    var name = reader.readString()
    var params: any[] = []
    var paramsAmount = reader.readU32()
    for (var i = 0; i < paramsAmount; i++) {
      var paramName = reader.readString()
      var paramType = reader.readSType()
      var value = paramType.readConstructed(reader)
      let param: ConstructedBrickParam = {
        name: paramName,
        type: paramType,
        value: value
      }
      params.push(param)
    }
    var result: ConstructedBrick = {
      name,
      type,
      subtype,
      params,
    }
    return result
  };

  validate = (value: any, object: any) => {
    return checkValidity(value)
  }

  writeConstructed = (value: ConstructedBrick, writer: BinaryWriter) => { 
    var brickSignature = getBrickSignature(value.type, value.subtype)
    if (!brickSignature) {
      let def = defaultBricksByType.get(value.type)
      this.writeValue(def, writer)
      return
    }
    writer.writeU32(value.type)
    writer.writeU32(value.subtype)
    writer.writeString(value.name)
    writer.writeU32(brickSignature.params.length)
    for (let param of value.params) {
      writer.writeString(param.name)
      writer.writeSType(param.type)
      param.type.writeConstructed(param.value, writer)
    }
  };

  construct = (value: Brick, project: any) => {
    let result: any[] = []
    let constructedParams: any[] = []
    let brickSignature = getBrickSignature(value.type, value.subtype)
    if (!brickSignature) {
      return {
        name: "unknown brick",
        type: value.type,
        subtype: value.subtype,
        params: [],
      }
    }
    for (let param of value.params.values()) {
      let paramSignature = getParamSignatureById(brickSignature, param.id)
      if (paramSignature) {
        constructedParams.push({
          id: param.id,
          type: paramSignature.type,
          name: paramSignature.code,
          value: paramSignature.type.construct(param.value, project)
        }) 
      }
    }
    let brickTypeName = getBrickTypeName(value.type)
    brickTypeName = brickTypeName.charAt(0).toUpperCase() + brickTypeName.slice(1)
    let brickName = brickSignature.name.charAt(0).toUpperCase() + brickSignature.name.slice(1)
    return {
      name: brickTypeName + '.' + brickName,
      type: value.type,
      subtype: value.subtype,
      params: constructedParams
    }
  }

  toObject = (value: ConstructedBrick) => {
    let brickSignature = getBrickSignature(value.type, value.subtype)
    if (!brickSignature) {
      return defaultBricksByType.get(value.type)
    }
    let params: any[] = []
    for (let param of value.params) {
      let paramSignature = getParamSignatureById(brickSignature, param.id)
      if (paramSignature) {
        params.push({
          name: param.name,
          type: paramSignature.type,
          value: paramSignature.type.toObject(param.value),
        })
      }
    }
    return {
      name: value.name,
      type: value.type,
      subtype: value.subtype,
      params: params,
    }
  }
}

solceryTypes.set(6, SBrick)

export const basicBricks: BrickSignature[] = [];
export const customBricks: BrickSignature[] = [];
export const solceryBricks: BrickSignature[] = [];
export const customBricksMap: any = {};


export const getParamSignatureById = (brickSignature: BrickSignature, paramId: number) => {
  for (var param of brickSignature.params) {
    if (param.id == paramId)
      return param
  }
}

export const getBrickSignature = (type: number, subtype: number) => { // TODO customBricks
  for (let solceryBrick of solceryBricks) {
    if (solceryBrick.type == type && solceryBrick.subtype == subtype)
      return solceryBrick
  }
}

export const getBasicBrickSignature = (type: number, subtype: number) => { // TODO customBricks
  for (let basicBrick of basicBricks) {
    if (basicBrick.type == type && basicBrick.subtype == subtype)
      return basicBrick
  }
}

export const defaultBricksByType = new Map()



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
    let paramName = brick.params[0].value
    let paramKey = getBrickTypeName(brick.type) + '.' + paramName
    if (!result.has(paramKey))
      result.set(paramKey, {
        id: result.size + 1,
        name: paramName,
        code: paramName,
        type: new SBrick({ brickType: brick.type })
      })
  }
  for (let param of brick.params) {
    let value = param.value
    if (value instanceof Object && value.type !== undefined && value.subtype !== undefined) { // TODO: check if brick
      exportArgsAsParams(value, result)
    }
  }
}

export type Brick = {
  type: number, // ACtion, Condition
  subtype: number, // Void, Set, Conditional, MoveTo
  params: any[],
}

export type ConstructedBrick = {
  type: number,
  subtype: number,
  name: string,
  params: any,
}

export type ConstructedBrickParam = {
  name: string,
  type: SType,
  value: any,
}

export type BrickParam = {
  id: number,
  value: any,
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

export const applyBrick: (brick: any, ctx: any) => any = (brick: any, ctx: any) => {
  let params: any = {}
  for (let param of brick.params) {
    params[param.name] = param.value
  }
  if (brick.subtype > 10000) {
    let func = (params: any, ctx: any) => {
      ctx.args.push(params)
      let result = applyBrick(ctx.game.content.get('customBricks', brick.subtype - 10000).brick, ctx)
      ctx.args.pop()
      return result
    }
    return func(params, ctx)
  }
  let brickSignature = getBasicBrickSignature(brick.type, brick.subtype)
  if (!brickSignature)
    throw new Error("Trying to apply unexistent brick")
  return brickSignature.func(params, ctx)
}


// const snakeCase = (string: string) => {
//     return string.replace(/\W+/g, " ")
//       .split(/ |\B(?=[A-Z])/)
//       .map((word: string) => word.toLowerCase())
//       .join('_');
// };

export const exportBrick = (name: string, id: number, brick: Brick) => {
  let paramsMap = new Map<string, BrickParamSignature>()
  exportArgsAsParams(brick, paramsMap)
  let subtype = 10000 + id //TODO: magic number
  return {
    type: brick.type,
    subtype: subtype,
    //name: 'custom.' + subtype + ' [' + name + ']',
    name: '[' + (subtype - 10000) + '] ' + name,
    params: Array.from(paramsMap.values()),
    func: (params: any, ctx: any) => {
      let templateName = getBrickTypeName(brick.type) + 's'
      ctx.args.push(params)
      let result = applyBrick(ctx.game.content.get(templateName, id).brick, ctx)
      ctx.args.pop()
      return result
    }
  }
}

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

export const addCustomBrick = (brick: BrickSignature) => {
  let key = 'b' + brick.type + '-' + brick.subtype
  customBricksMap[key] = brick
  let customBricks = Object.values(customBricksMap).map(brick => brick as BrickSignature)
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
  var result = applyBrick(args[params.name], ctx)
  ctx.args.push(args)
  return result
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
    { id: 1, code: 'action1', name: 'Action #1', type: new SBrick({ brickType: 0 }) },
    { id: 2, code: 'action2', name: 'Action #2', type: new SBrick({ brickType: 0 }) }
  ],
  func: (params: any, ctx: any) => {
    applyBrick(params.action1, ctx)
    applyBrick(params.action2, ctx)
  }
})

// action.conditional
basicBricks.push({
  type: 0,
  subtype: 2,
  name: 'If-Then-Else',
  params: [
    { id: 1, code: 'if', name: 'If', type: new SBrick({ brickType: 1 }) },
    { id: 2, code: 'then', name: 'Then', type: new SBrick({ brickType: 0 }) },
    { id: 3, code: 'else', name: 'Else', type: new SBrick({ brickType: 0 }) }
  ],
  func: (params: any, ctx: any) => {
    if (applyBrick(params.if, ctx)) {
      applyBrick(params.then, ctx)
    }
    else {
      applyBrick(params.else, ctx)
    }
  }
})

basicBricks.push({
  type: 0,
  subtype: 3,
  name: 'Loop',
  params: [
    { id: 1, code: 'counter_var', name: 'Counter var', type: new SString() },
    { id: 2, code: 'iterations', name: 'Iterations', type: new SBrick({ brickType: 2 }) },
    { id: 3, code: 'action', name: 'Action', type: new SBrick({ brickType: 0 }) },
  ],
  func: (params: any, ctx: any) => {
    let iter = applyBrick(params.iterations, ctx)
    for (let i = 0; i < iter; i++) {
      ctx.vars[params.counter_var] = i; //TODO: cleanup
      applyBrick(params.action, ctx);
    }
  }
})

basicBricks.push({
  type: 0,
  subtype: 4,
  name: 'Argument',
  params: [
    { id: 1, code: 'name', name: 'Name', type: new SString() },
  ],
  func: argFunc,
})

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
    { id: 1, code: 'condition',name: 'Condition', type: new SBrick({ brickType: 1 }) },
    { id: 2, code: 'action',name: 'Action', type: new SBrick({ brickType: 0 }) },
    { id: 3, code: 'limit', name: 'Limit', type: new SBrick({ brickType: 2 }) }
  ],
  func: (params: any, ctx: any) => {
    let limit = applyBrick(params.limit, ctx)
    let objs: any[] = []
    let oldObj = ctx.object 
    let amount = 0
    let objects = [...ctx.game.objects.values()]
    shuffleArray(objects)
    while (limit > 0 && objects.length > 0) {
      ctx.object = objects.pop()
      if (applyBrick(params.condition, ctx)) {
        objs.push(ctx.object)
        limit--;
      }
    }
    for (let obj of objs) {
      ctx.object = obj
      applyBrick(params.action, ctx)
    }
    ctx.object = oldObj
  }
})

basicBricks.push({
  type: 0,
  subtype: 6,
  name: 'Set variable',
  params: [
    { id: 1, code: 'var_name', name: 'Var', type: new SString() },
    { id: 2, code: 'value', name: 'Value', type: new SBrick({ brickType: 2 }) }
  ],
  func: (params: any, ctx: any) => {
    let varName = params.var_name
    let value = applyBrick(params.value, ctx)
    ctx.vars[varName] = value
  }
})

basicBricks.push({
  type: 0,
  subtype: 7,
  name: 'Set attribute',
  params: [
    { id: 1, code: 'attr_name', name: 'Attr', type: new SString() },
    { id: 2, code: 'value', name: 'Value', type: new SBrick({ brickType: 2 }) }
  ],
  func: (params: any, ctx: any) => {
    let attrName = params.attr_name
    let value = applyBrick(params.value, ctx)
    if (ctx.object.attrs[attrName] === undefined)
      throw new Error("trying to set unknown attr " + attrName)
    ctx.game.setAttr(ctx, attrName, value)
  }
})


basicBricks.push({
  type: 0,
  subtype: 8,
  name: 'Use card',
  params: [],
  func: (params: any, ctx: any) => {
    let tplId = ctx.object.tplId
    let cardType = ctx.game.content.get('cardTypes', tplId)
    if (cardType.action) {
      applyBrick(cardType.action, ctx)
    }
  }
})

basicBricks.push({
  type: 0,
  subtype: 9,
  name: 'Set game attribute',
  params: [
    { id: 1, code: 'attr_name', name: 'Attr', type: new SString() },
    { id: 2, code: 'value', name: 'Value', type: new SBrick({ brickType: 2 }) }
  ],
  func: (params: any, ctx: any) => {
    let attrName = params.attr_name
    let value = applyBrick(params.value, ctx)
    if (ctx.game.attrs[attrName] === undefined)
      throw new Error("Trying to set unknown game attr " + attrName)
    ctx.game.attrs[attrName] = value
    if (ctx.diff) {
      ctx.diff.attrs[attrName] = value
    }
  }
})

basicBricks.push({
  type: 0,
  subtype: 10,
  name: 'Pause',
  params: [
    { id: 1, code: 'duration', name: 'Duration', type: new SBrick({ brickType: 2 }) }, 
  ],
  func: (params: any, ctx: any) => {
    let duration = applyBrick(params.duration, ctx);
    ctx.game.exportDiff(ctx)
    let pauseState = {
      id: ctx.log.length,
      state_type: 1,
      value: {
        delay: duration,
      }
    };
    ctx.log.push(pauseState)
  }
})

basicBricks.push({
  type: 0,
  subtype: 11,
  name: 'Event',
  params: [
    { id: 1, code: 'event_name', name: 'Event name', type: new SString() }, 
  ],
  func: (params: any, ctx: any) => {
    let tplId = ctx.object.tplId
    let cardType = ctx.game.content.get('cardTypes', tplId)
    let fieldName = `action_on_${params.event_name}`;
    if (cardType[fieldName]) {
      applyBrick(cardType[fieldName], ctx)
    }
  }
})

basicBricks.push({
  type: 0,
  subtype: 12,
  name: 'CreateEntity',
  params: [
    { id: 1, code: 'card_type', name: 'Card type', type: new SBrick({ brickType: 2 }) }, 
    { id: 2, code: 'place', name: 'Place', type: new SBrick({ brickType: 2 }) }, 
    { id: 3, code: 'action', name: 'Action', type: new SBrick({ brickType: 0 }) }, 
  ],
  func: (params: any, ctx: any) => {
    let card_type  = applyBrick(params.card_type, ctx)
    let place = applyBrick(params.place, ctx)
    let newObj = ctx.game.createEntity(card_type)
    let oldObj = ctx.object
    ctx.object = newObj
    ctx.game.setAttr(ctx, 'place', place)
    applyBrick(params.action, ctx)
    ctx.object = oldObj
  }
})

basicBricks.push({
  type: 0,
  subtype: 13,
  name: 'DeleteEntity',
  params: [],
  func: (params: any, ctx: any) => {
    ctx.game.objects[ctx.object.id] = undefined
    ctx.object.deleted = true;
  }
})


basicBricks.push({
  type: 0,
  subtype: 256,
  name: 'Console log',
  params: [
    { id: 1, code: 'message', name: 'Message', type: new SString() },
  ],
  func: (params: any, ctx: any) => {
    console.log('Brick Message: ' + params[1])
    console.log('VARS: ' + JSON.stringify(ctx.vars))
    console.log('ATTRS: ' + JSON.stringify(ctx.object.attrs))
    console.log('GAME ATTRS ' + JSON.stringify(ctx.game.attrs))
  }
})




//condition.const
basicBricks.push({
  type: 1,
  subtype: 0,
  name: 'Constant',
  params: [
    { id: 1, code: 'value', name: 'Value', type: new SBool() }, //TODO
  ],
  func: (params: any, ctx: any) => {
    return params.value != 0
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
    return !applyBrick(params.condition, ctx)
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
    return applyBrick(params.value1, ctx) === applyBrick(params.value2, ctx)
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
    return applyBrick(params.value1, ctx) > applyBrick(params.value2, ctx)
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
    return applyBrick(params.value1, ctx) < applyBrick(params.value2, ctx)
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
    return applyBrick(params.cond1, ctx) || applyBrick(params.cond2, ctx)
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
    return applyBrick(params.cond1, ctx) && applyBrick(params.cond2, ctx)
  },
})


basicBricks.push({ // TODO: reuse code
  type: 1,
  subtype: 8,
  name: 'OR Iterator',
  params: [
    { id: 1, code: 'iter_condition',name: 'Iteration Condition', type: new SBrick({ brickType: 1 }) },
    { id: 2, code: 'condition',name: 'Condition', type: new SBrick({ brickType: 1 }) },
    { id: 3, code: 'limit', name: 'Limit', type: new SBrick({ brickType: 2 }) }
  ],
  func: (params: any, ctx: any) => {
    let limit = applyBrick(params.limit, ctx)
    let objs: any[] = []
    let oldObj = ctx.object 
    let amount = 0
    let objects = [...ctx.game.objects.values()]
    shuffleArray(objects)
    while (limit > 0 && objects.length > 0) {
      ctx.object = objects.pop()
      if (applyBrick(params.iter_condition, ctx)) {
        objs.push(ctx.object)
        limit--;
      }
    }
    let result = false
    for (let obj of objs) {
      ctx.object = obj
      result = result || applyBrick(params.condition, ctx)
    }
    ctx.object = oldObj
    return result
  }
})

basicBricks.push({ // TODO: reuse code
  type: 1,
  subtype: 9,
  name: 'AND Iterator',
  params: [
    { id: 1, code: 'iter_condition',name: 'Iteration Condition', type: new SBrick({ brickType: 1 }) },
    { id: 2, code: 'condition',name: 'Condition', type: new SBrick({ brickType: 1 }) },
    { id: 3, code: 'limit', name: 'Limit', type: new SBrick({ brickType: 2 }) }
  ],
  func: (params: any, ctx: any) => {
    let limit = applyBrick(params.limit, ctx)
    let objs: any[] = []
    let oldObj = ctx.object 
    let amount = 0
    let objects = [...ctx.game.objects.values()]
    shuffleArray(objects)
    while (limit > 0 && objects.length > 0) {
      ctx.object = objects.pop()
      if (applyBrick(params.iter_condition, ctx)) {
        objs.push(ctx.object)
        limit--;
      }
    }
    let result = true
    for (let obj of objs) {
      ctx.object = obj
      result = result && applyBrick(params.condition, ctx)
    }
    ctx.object = oldObj
    return result
  }
})

basicBricks.push({
  type: 2,
  subtype: 0,
  name: 'Constant',
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
  name: 'Variable',
  params: [
    { id: 1, code: 'var_name', name: 'Variable name', type: new SString() }
  ],
  func: (params: any, ctx: any) => {
    let res = ctx.vars[params.var_name]
    return res ? res : 0
  }
})

// value.attr
basicBricks.push({
  type: 2,
  subtype: 2,
  name: 'Attribute',
  params: [
    { id: 1, code: 'attr_name', name: 'Attribute name', type: new SString() }
  ],
  func: (params: any, ctx: any) => {
    return ctx.object.attrs[params.attr_name]
  }
})

basicBricks.push({
  type: 2,
  subtype: 3,
  name: 'Argument',
  params: [
    { id: 1, code: 'name', name: 'Name', type: new SString() },
  ],
  func: argFunc,
})

// value.conditional
basicBricks.push({
  type: 2,
  subtype: 4,
  name: 'If-Then-Else',
  params: [
    { id: 1, code: 'if', name: 'If', type: new SBrick({ brickType: 1 }) },
    { id: 2, code: 'then', name: 'Then', type: new SBrick({ brickType: 2 }) },
    { id: 3, code: 'else', name: 'Else', type: new SBrick({ brickType: 2 }) }
  ],
  func: (params: any, ctx: any) => {
    if (applyBrick(params.if, ctx))
      return applyBrick(params.then, ctx)
    else
      return applyBrick(params.else, ctx)
  }
})

basicBricks.push({
  type: 2,
  subtype: 5,
  name: 'Addition',
  params: [
    { id: 1, code: 'value1', name: 'Value #1', type: new SBrick({ brickType: 2 }) },
    { id: 2, code: 'value2', name: 'Value #2', type: new SBrick({ brickType: 2 }) }
  ],
  func: (params: any, ctx: any) => {
    let v1 = applyBrick(params.value1, ctx)
    let v2 = applyBrick(params.value2, ctx)
    return v1 + v2  
  }
})

basicBricks.push({
  type: 2,
  subtype: 6,
  name: 'Subtraction',
  params: [
    { id: 1, code: 'value1', name: 'Value #1', type: new SBrick({ brickType: 2 }) },
    { id: 2, code: 'value2', name: 'Value #2', type: new SBrick({ brickType: 2 }) }
  ],
  func: (params: any, ctx: any) => {
    let v1 = applyBrick(params.value1, ctx)
    let v2 = applyBrick(params.value2, ctx)
    return v1 - v2
  }
})

basicBricks.push({
  type: 2,
  subtype: 7,
  name: 'Multiplication',
  params: [
    { id: 1, code: 'value1', name: 'Value #1', type: new SBrick({ brickType: 2 }) },
    { id: 2, code: 'value2', name: 'Value #2', type: new SBrick({ brickType: 2 }) }
  ],
  func: (params: any, ctx: any) => {
    let v1 = applyBrick(params.value1, ctx)
    let v2 = applyBrick(params.value2, ctx)
    return v1 * v2
  }
})

basicBricks.push({
  type: 2,
  subtype: 8,
  name: 'Division',
  params: [
    { id: 1, code: 'value1', name: 'Value #1', type: new SBrick({ brickType: 2 }) },
    { id: 2, code: 'value2', name: 'Value #2', type: new SBrick({ brickType: 2 }) }
  ],
  func: (params: any, ctx: any) => {
    let v1 = applyBrick(params.value1, ctx)
    let v2 = applyBrick(params.value2, ctx)
    return Math.floor(v1 / v2) 
  }
})

basicBricks.push({
  type: 2,
  subtype: 9,
  name: 'Modulo',
  params: [
    { id: 1, code: 'value1', name: 'Value #1', type: new SBrick({ brickType: 2 }) },
    { id: 2, code: 'value2', name: 'Value #2', type: new SBrick({ brickType: 2 }) }
  ],
  func: (params: any, ctx: any) => {
    let v1 = applyBrick(params.value1, ctx)
    let v2 = applyBrick(params.value2, ctx)
    return v1 - (Math.floor(v1 / v2) * v2)
  }
})

basicBricks.push({
  type: 2,
  subtype: 10,
  name: 'Random',
  params: [
    { id: 1, code: 'from', name: 'From', type: new SBrick({ brickType: 2 }) },
    { id: 2, code: 'to', name: 'To', type: new SBrick({ brickType: 2 }) }
  ],
  func: (params: any, ctx: any) => {
    let min = applyBrick(params.from, ctx)
    let max = applyBrick(params.to, ctx) + 1
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

// value.attr
basicBricks.push({
  type: 2,
  subtype: 13,
  name: 'Game Attribute',
  params: [
    { id: 1, code: 'attr_name', name: 'Attribute name', type: new SString() }
  ],
  func: (params: any, ctx: any) => {
    return ctx.game.attrs[params.attr_name]
  }
})

basicBricks.push({ // TODO: reuse code
  type: 2,
  subtype: 14,
  name: 'Sum Iterator',
  params: [
    { id: 1, code: 'iter_condition',name: 'Iteration Condition', type: new SBrick({ brickType: 1 }) },
    { id: 2, code: 'target_value',name: 'Target Value', type: new SBrick({ brickType: 2 }) },
    { id: 3, code: 'limit', name: 'Limit', type: new SBrick({ brickType: 2 }) }
  ],
  func: (params: any, ctx: any) => {
    let limit = applyBrick(params.limit, ctx)
    let objs: any[] = []
    let oldObj = ctx.object 
    let amount = 0
    let objects = [...ctx.game.objects.values()]
    shuffleArray(objects)
    while (limit > 0 && objects.length > 0) {
      ctx.object = objects.pop()
      if (applyBrick(params.iter_condition, ctx)) {
        objs.push(ctx.object)
        limit--;
      }
    }
    let result = 0
    for (let obj of objs) {
      ctx.object = obj
      result = result + applyBrick(params.target_value, ctx)
    }
    ctx.object = oldObj
    return result
  }
})

basicBricks.push({
  type: 2,
  subtype: 15,
  name: 'Set variable',
  params: [
    { id: 1, code: 'var_name', name: 'Var name', type: new SString() },
    { id: 2, code: 'value', name: 'Value', type: new SBrick({ brickType: 2 }) }
  ],
  func: (params: any, ctx: any) => {
    let varName = params.var_name
    let value = params.value
    ctx.vars[varName] = applyBrick(value, ctx)
    return ctx.vars[varName]
  }
})

basicBricks.push({ // TODO: reuse code
  type: 2,
  subtype: 16,
  name: 'Max Iterator',
  params: [
    { id: 1, code: 'iter_condition',name: 'Iteration Condition', type: new SBrick({ brickType: 1 }) },
    { id: 2, code: 'value',name: 'Value', type: new SBrick({ brickType: 2 }) },
    { id: 3, code: 'fallback', name: 'Fallback', type: new SBrick({ brickType: 2 }) }
  ],
  func: (params: any, ctx: any) => {
    let old_object = ctx.object 
    let amount = 0
    let objects = [...ctx.game.objects.values()]
    shuffleArray(objects)
    let result = Number.NEGATIVE_INFINITY
    debug.log = true;
    for (let obj of objects) {
      ctx.object = obj
      if (applyBrick(params.iter_condition, ctx)) {
        result = Math.max(applyBrick(params.value, ctx), result)
      }
    }
    debug.log = false;
    ctx.object = old_object
    if (result == Number.NEGATIVE_INFINITY) {
      result = applyBrick(params.fallback, ctx)
    }
    return result
  }
})

basicBricks.push({ // TODO: reuse code
  type: 2,
  subtype: 17,
  name: 'Min Iterator',
  params: [
    { id: 1, code: 'iter_condition',name: 'Iteration Condition', type: new SBrick({ brickType: 1 }) },
    { id: 2, code: 'value',name: 'Value', type: new SBrick({ brickType: 2 }) },
    { id: 3, code: 'fallback', name: 'Fallback', type: new SBrick({ brickType: 2 }) }
  ],
  func: (params: any, ctx: any) => {
    let old_object = ctx.object 
    let amount = 0
    let objects = [...ctx.game.objects.values()]
    shuffleArray(objects)
    let result = Number.POSITIVE_INFINITY
    for (let obj of objects) {
      ctx.object = obj
      if (applyBrick(params.iter_condition, ctx)) {
        result = Math.min(applyBrick(params.value, ctx), result)
      }
    }
    ctx.object = old_object
    if (result == Number.POSITIVE_INFINITY) {
      result = applyBrick(params.fallback, ctx)
    }
    return result
  }
})




for (let brick of basicBricks)
  solceryBricks.push(brick)


let signature = getBrickSignature(0, 0)
if (signature) {
  defaultBricksByType.set(0, {
    type: 0,
    subtype: 0,
    params: [],
    error: true,
  })
}

signature = getBrickSignature(1, 0)
if (signature) {
  defaultBricksByType.set(1, {
    type: 1,
    subtype: 0,
    params: [{
      id: 1,
      code: 'value',
      value: 0,
      type: new SBool(),
      error: true,
    }]
  })
}

signature = getBrickSignature(2, 0)
if (signature) {
  defaultBricksByType.set(2, {
    type: 2,
    subtype: 0,
    params: [{
      id: 1,
      code: 'value',
      value: 0,
      type: new SInt(),
      error: true,
    }]
  })
}