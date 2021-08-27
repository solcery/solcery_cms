import React, { useState, useCallback, useEffect } from "react";
import { PublicKey } from "@solana/web3.js";
import ReactDOM from 'react-dom'
import { Input, InputNumber, Select } from 'antd';
import { BinaryReader, BinaryWriter } from 'borsh';

import { useConnection} from "../../contexts/connection";
import { useWallet } from "../../contexts/wallet";
import { SolcerySchema, TemplateData, Storage } from "../classes"
import { projectStoragePublicKey } from "../engine"
import { SInt } from "./index";
import { SLink } from "./index";
import { SString} from "./index";

type SolceryTypeId = number;

export class SType {
  id: SolceryTypeId = 0;
  typeName = "Error";
  write: (writer: BinaryWriter) => void = () => {};
  nameRender: any = (<p>Error</p>);
  render: any = (<p>Error</p>);
  readValue: (reader: BinaryReader) => any = (reader: BinaryReader) => { throw new Error('Trying to read empty type value') };
  writeValue: (value: any, writer: BinaryWriter) => void = (value: any, writer: BinaryWriter) => { throw new Error('Trying to write empty type value') };
  static read = (reader: BinaryReader) => {
  	return new SType()
  }
  toBuffer = () => {
  	var writer = new BinaryWriter()
  	writer.writeSType(this)
  	return writer.buf.slice(0, writer.length)
  }
}

export const ValueRender = (props: {
	defaultValue?: any,
	type?: SType,
	onChange?: (newValue: any) => void,
	readonly?: boolean,
}) => {
	if (!props.type)
		return <div/>
	return React.createElement(
	  props.type.render,
	  { defaultValue: props.defaultValue, onChange: props.onChange, readonly: props.readonly}
	)
}

export const SubtypeRender = (props: {
	typeId: number,
	onLoad: (newValue: any) => void,
	onChange: (newValue: any) => void,
}) => {
	var stype = solceryTypes().get(props.typeId)?.class
	if (stype)
		return React.createElement(
		  stype.subtypeRender,
		  { onChange: props.onChange, onLoad: props.onLoad }
		)
	return null
}

export const TypeNameRender = (props: {
	type: SType,
}) => {
	return props.type.nameRender;
}



export const solceryTypes = () => {
	return new Map([
		[1, {id: 1, name: "Integer", class: SInt}],
		[2, {id: 2, name: "String", class: SString}],
		[3, {id: 3, name: "Link", class: SLink}]
	])
}

declare module "borsh" {
  interface BinaryReader {
    readSType(): SType;
  }

  interface BinaryWriter {
    writeSType(value: SType): void;
  }
}

(BinaryReader.prototype).readSType = function readSType() {
  const reader = this;
  const typeId = reader.readU8();
  var type = solceryTypes().get(typeId)
  var typeClass = type?.class
  var ret = typeClass?.read(reader)
  if (ret != undefined) 
  	return ret
  return new SType()
};

(BinaryWriter.prototype).writeSType = function writeSType(value: SType) {
	const writer = this;
	writer.writeU8(value.id)
  value.write(writer)
};



