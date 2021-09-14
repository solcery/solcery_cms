import React, { useState, useCallback, useEffect } from "react";
import { PublicKey } from "@solana/web3.js";
import ReactDOM from 'react-dom'
import { Input, InputNumber, Select, Button } from 'antd';
import { BinaryReader, BinaryWriter } from 'borsh';

import { useConnection} from "../../contexts/connection";
import { useWallet } from "../../contexts/wallet";
import { SolcerySchema, TemplateData, Storage } from "../classes"
import { projectStoragePublicKey } from "../engine"
import { SBool, SInt, SLink, SString, SBrick, SIntRender, SUrl, SArray } from "./index";

export class SType {
  id: number = 0;
  typedata: any;
  typeName = "Empty type";

  // static typedataRender: any = (<p>Error</p>);
  valueRender: any = (<p>Error</p>);
  
  readValue: (reader: BinaryReader) => any = (reader: BinaryReader) => { 
  	throw new Error('Trying to read empty type value') 
  };
  writeValue: (value: any, writer: BinaryWriter) => void = (value: any, writer: BinaryWriter) => { 
  	throw new Error('Trying to write empty type value')
  };

  writeType: (writer: BinaryWriter) => void = () => {};
  static readType = (reader: BinaryReader) => {
  	return new SType()
  }

  toBuffer = () => {
  	console.log('toBuffer')
  	var writer = new BinaryWriter()
  	writer.writeSType(this)
  	return writer.buf.slice(0, writer.length)
  	console.log( writer.buf.slice(0, writer.length))
  }
}

export const solceryTypes = () => {
	return new Map<number, any>([
		[1, SBool ],
		[2, SInt ],
		[3, SString ],
		[4, SUrl ],
		[5, SLink ],
		[6, SBrick ],
		[7, SArray ],
	])
}

export const TypeSelector = (props: { //TODO: -> Type render
	onChange?: (newValue: SType) => void,
}) => {
	const DEFAULT_STYPE = new SInt();
	const { Option } = Select;
	const [ typeId, setTypeId ] = useState(DEFAULT_STYPE.id);
	var [loaded, setLoaded] = useState(false)

	useEffect(() => {
		if (!loaded) {
			setLoaded(true)
			onChangeSolceryType(DEFAULT_STYPE)
		}
	})
	const onChangeSolceryType = (newValue: any) => {
		if (props.onChange)
			props.onChange(newValue)
	}
	return (
		<div>
	    Add Field<br/>
	    <Select id="fieldType" defaultValue={ DEFAULT_STYPE.id } onChange={(solceryTypeId) => { 
	    	let solceryType = solceryTypes().get(solceryTypeId)
	    	setTypeId(solceryTypeId)
	    	if (!solceryType.typedataRender)
	    		onChangeSolceryType(new solceryType())
	    }} >
	    {Array.from(solceryTypes().keys()).map((solceryTypeId) => 
	      <Option key={solceryTypeId} value={solceryTypeId}>{solceryTypes().get(solceryTypeId).name}</Option>
	    )}
	    </Select>
	    {solceryTypes().get(typeId)?.typedataRender && React.createElement(
	    	solceryTypes().get(typeId)?.typedataRender,
				{ onChange: onChangeSolceryType }
			)}
	  </div>
	)
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
  if (!type)
  	throw new Error("Error reading SType")
  var ret = type.readType(reader)
  if (ret != undefined) 
  	return ret
  throw new Error("Error reading SType")
};

(BinaryWriter.prototype).writeSType = function writeSType(value: SType) {
	const writer = this;
	writer.writeU8(value.id)
  value.writeType(writer)
};



