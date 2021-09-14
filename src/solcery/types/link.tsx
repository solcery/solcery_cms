import React, { useState, useEffect } from "react";
import { Select } from 'antd';
import { SType, solceryTypes } from "./index";
import { useConnection } from "../../contexts/connection";
import { TemplateData, Storage, TplObject } from "../classes";
import { projectStoragePublicKey } from "../engine";
import { PublicKey } from "@solana/web3.js";
import { BinaryReader, BinaryWriter } from "borsh";

export const SLinkRender = (props: { 
  templatePublicKey: PublicKey,
  defaultValue?: PublicKey, 
  onChange?: (newValue: any) => void 
  readonly?: boolean,
}) => {


	const connection = useConnection();
  const { Option } = Select;
  var [ objects, setObjects] = useState<TplObject[]>([]);
  var [ object, setObject ] = useState<TplObject|undefined>();

  useEffect(() => { 
    if (!props.readonly && objects.length == 0) {
      (async () => {
        const tpl = await TemplateData.get(connection, props.templatePublicKey)
        const storages = await Storage.getAll(connection, tpl.storages)
        var objectsToLoad: PublicKey[] = []
        for (let storage of storages) {
          objectsToLoad = objectsToLoad.concat(storage.accounts)
        }
        setObjects(await tpl.getObjects(connection, objectsToLoad))
      })()
    }
    if (props.defaultValue && object === undefined) {
      (async () => {
        const tpl = await TemplateData.get(connection, props.templatePublicKey)
        var [obj, _] = await tpl.getObject(connection, props.defaultValue)
        setObject(obj)
      })()
    }
  });

  if (props.readonly && object) {
    return (<a href={'/#/object/'+props.defaultValue?.toBase58()}>{ object.getName() }</a>)
  }

  if (objects) {
    return (
      <Select defaultValue={ props.defaultValue ? props.defaultValue.toBase58() : 'None' } onChange={(objectKey) => { 
        props?.onChange && props.onChange(objectKey != 'None' ? new PublicKey(objectKey) : undefined)
      }}>
      <Option key='none' value='None'>None</Option>
      {objects.map( (obj) => {
        return (<Option key={obj.publicKey.toBase58()} value={ obj.publicKey.toBase58()}>{ obj.getName() }</Option>) //TODO
      })} 
      </Select>
    )
  }
  return (<div></div>)
}

export const SLinkSubtypeRender = (props: { 
  defaultValue?: any, //TODO:
  onChange?: (newValue: any) => void  
}) => {
	const connection = useConnection();
	const { Option } = Select;
  var [ templates, setTemplates ] = useState<TemplateData[]>([]);
  useEffect(() => { 
    if (templates.length <= 0)
      (async () => {
        let strg = await Storage.get(connection, projectStoragePublicKey)
        var tpls = await TemplateData.getAll(connection, strg.accounts)
        props.onChange && props.onChange(new SLink({templatePublicKey: tpls[0].publicKey}))
        setTemplates(tpls)
      })()
  });


  if (templates.length > 0) {
	  return (
	  	<Select defaultValue={ templates[0].publicKey.toBase58() } onChange={(templateKey) => { 
	  		props?.onChange && props.onChange(new SLink({templatePublicKey: new PublicKey(templateKey)})) 
	  	}}>
	  	{templates.map((tpl) => {
      	return (<Option key={tpl.publicKey.toBase58()} value={tpl.publicKey.toBase58()}>{tpl.name}</Option>)
      })}
	  	</Select>
	  )
  }
	return (<div></div>)
}

export const SLinkNameRender = (props: { 
  templatePublicKey: PublicKey,
}) => {
  const connection = useConnection();
  var [ template, setTemplate ] = useState<TemplateData>();

   useEffect(() => { 
    if (!template)
      (async () => {
        setTemplate(await TemplateData.get(connection, props.templatePublicKey))
      })()
  });

  return (
    <p>Link to: <a href = {'/#/template/'+props.templatePublicKey.toBase58()}>{ template ? template.name : props.templatePublicKey.toBase58() }</a></p>
  )
}

export class SLink extends SType {
  id = 5;
  typeName = "Link";
  render = SLinkRender;
  templatePublicKey: PublicKey = new PublicKey('2WQzLh8J8Acmbzzi4qVmNv2ZX3hWycjHGMu7LRjQ8hbz');
  nameRender = (<p>Link</p>);
  static nested = true;
  readValue = (reader: BinaryReader) => { return reader.readPubkey() }
  writeValue = (value: string, writer: BinaryWriter) => { console.log('writeKey ' + value); writer.writePubkey(new PublicKey(value)) }
  static typedataRender = SLinkSubtypeRender;

  constructor(src: { templatePublicKey: PublicKey }) {
  	super()
  	this.templatePublicKey = src.templatePublicKey;
    this.nameRender = <SLinkNameRender templatePublicKey={ src.templatePublicKey }/>; //TOD: name
    this.valueRender = (props: { readonly?: boolean, defaultValue?: PublicKey,  onChange?: (newValue: any) => void  }) => { return(<SLinkRender 
      onChange={props.onChange} 
      defaultValue={props.defaultValue} 
      templatePublicKey={this.templatePublicKey}
      readonly={props?.readonly}
    />)}
  }
  static readType = (reader: BinaryReader) => {
  	return new SLink({ templatePublicKey: reader.readPubkey() })
  }
  writeType = (writer: BinaryWriter) => {
  	writer.writePubkey(this.templatePublicKey)
  }
}
