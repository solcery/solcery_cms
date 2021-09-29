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
  console.log(solceryBricks)
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

export const solceryBricks: BrickSignature[] = [];

    // //Conditions
    // { Type: 1, Subtype: 0, FieldType: 0, Slots: 0, }, //True
    // { Type: 1, Subtype: 1, FieldType: 0, Slots: 0, }, //False
    // { Type: 1, Subtype: 2, FieldType: 0, Slots: 2, }, //Or
    // { Type: 1, Subtype: 3, FieldType: 0, Slots: 2, }, //And
    // { Type: 1, Subtype: 4, FieldType: 0, Slots: 1, }, //Not
    // { Type: 1, Subtype: 5, FieldType: 0, Slots: 2, }, //Equal
    // { Type: 1, Subtype: 6, FieldType: 0, Slots: 2, }, //GreaterThan
    // { Type: 1, Subtype: 7, FieldType: 0, Slots: 2, }, //LesserThan
    // { Type: 1, Subtype: 100, FieldType: 0, Slots: 1, }, //IsAtPlace

    // //Values
    // { Type: 2, Subtype: 0, FieldType: 1, Slots: 0, }, //Const,
    // { Type: 2, Subtype: 1, FieldType: 0, Slots: 3, }, //Conditional
    // { Type: 2, Subtype: 2, FieldType: 0, Slots: 2, }, //Add
    // { Type: 2, Subtype: 3, FieldType: 0, Slots: 2, }, //Sub
    // { Type: 2, Subtype: 4, FieldType: 2, Slots: 0, }, //GetCtxVar
    // { Type: 2, Subtype: 5, FieldType: 0, Slots: 2, }, //GetCtxVar
    // { Type: 2, Subtype: 6, FieldType: 0, Slots: 2, }, //Mul
    // { Type: 2, Subtype: 3, FieldType: 0, Slots: 2, }, //Div
    // { Type: 2, Subtype: 2, FieldType: 0, Slots: 2, }, //Modulo
    // { Type: 2, Subtype: 100, FieldType: 1, Slots: 1, }, //GetPlayerAttr
    // { Type: 2, Subtype: 101, FieldType: 0, Slots: 0, }, //GetPlayerIndex
    // { Type: 2, Subtype: 102, FieldType: 0, Slots: 1, }, //GetCardsAmount
    // { Type: 2, Subtype: 103, FieldType: 0, Slots: 0, }, //CurrentPlace
    // { Type: 2, Subtype: 105, FieldType: 0, Slots: 0, }, //CasterPlayerIndex


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
    applyBrick(params[1], ctx)
    applyBrick(params[2], ctx)
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
    if (applyBrick(params[1], ctx))
      applyBrick(params[2], ctx)
    else
      applyBrick(params[3], ctx)
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
    let iter = applyBrick(params[1], ctx)
    for (let i = 0; i < iter; i++)
      applyBrick(params[2], ctx)
  }
})

solceryBricks.push({
  type: 0,
  subtype: 4,
  name: 'Link',
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
    let limit = applyBrick(params[3], ctx)
    let objs: any[] = []
    let oldOlbj = ctx.object 
    let amount = 0
    console.log('Iterator')
    console.log(limit)
    for (let object of ctx.game.objects) { // TODO: shuffle
      let obj = object[1]
      if (amount < limit) {
        ctx.object = obj
        if (applyBrick(params[1], ctx)) {
          amount++;
          console.log(amount)
          objs.push(obj)
        }
      }
    }
    for (let obj of objs) {
      ctx.object = obj
      console.log('applyBrick')
      applyBrick(params[2], ctx)
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
    let varName = params[1]
    let value = params[2]
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
    let attrName = params[1]
    let value = params[2]
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
    return params[1] != 0
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
    return !applyBrick(params[1], ctx)
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
    return applyBrick(params[1], ctx) == applyBrick(params[2], ctx)
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
    return applyBrick(params[1], ctx) > applyBrick(params[2], ctx)
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
    return applyBrick(params[1], ctx) < applyBrick(params[2], ctx)
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
    return params[1]
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
    return ctx.vars[params[1]]
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
    return ctx.object.attrs[params[1]]
  }
})

solceryBricks.push({
  type: 2,
  subtype: 3,
  name: 'Rand',
  params: [
    { id: 1, code: 'value', name: 'From', type: new SBrick({ brickType: 2 }) },
    { id: 2, code: 'value', name: 'To', type: new SBrick({ brickType: 2 }) }
  ],
  func: (params: any, ctx: any) => {
    return 1 // TODO: 
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
    if (applyBrick(params[1], ctx))
      return applyBrick(params[2], ctx)
    else
      return applyBrick(params[3], ctx)
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
    let v1 = applyBrick(params[1], ctx)
    let v2 = applyBrick(params[2], ctx)
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
    let v1 = applyBrick(params[1], ctx)
    let v2 = applyBrick(params[2], ctx)
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
    let v1 = applyBrick(params[1], ctx)
    let v2 = applyBrick(params[2], ctx)
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
    let v1 = applyBrick(params[1], ctx)
    let v2 = applyBrick(params[2], ctx)
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
    let v1 = applyBrick(params[1], ctx)
    let v2 = applyBrick(params[2], ctx)
    return v1 - Math.floor(v1 / v2) 
  }
})
