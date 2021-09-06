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
  var [ storage, setStorage ] = useState<Storage|undefined>();
  // var [ objects, setObjects ] = useState<{publicKey: PublicKey, object: TplObject}[]>([]);
  var [ objects, setObjects] = useState(new Map())
  var [ objectsAmount, setObjectsAmount ] = useState(0)

  const loadObject = async (objectPublicKey: PublicKey) => {
    var tpl = await TplObject.getTemplate(connection, objectPublicKey)
    var obj = await tpl.getObject(connection, objectPublicKey)
    var stringKey = objectPublicKey.toBase58()
    if (objects.get(stringKey))
    {
      return
    }
    objects.set(stringKey, obj)
    setObjectsAmount(objects.size)
  
  }


  useEffect(() => { 
    if (!props.readonly && !storage) {
      (async () => {
        const tpl = await TemplateData.get(connection, props.templatePublicKey)
        const strg = await Storage.get(connection, tpl.storages[0])
        setStorage(strg)
        for (let objectPublicKey of strg.accounts) {
          loadObject(objectPublicKey)
        }
      })()
    }
  });

  if (props.readonly)
    return (<a href={'/#/object/'+props.defaultValue?.toBase58()}>{props.defaultValue?.toBase58()}</a>)

  if (storage && objects && objects.size > 0) {
    return (
      <Select defaultValue={ props.defaultValue ? props.defaultValue.toBase58() : 'None' } onChange={(objectKey) => { 
        props?.onChange && props.onChange(objectKey != 'None' ? new PublicKey(objectKey) : undefined)
      }}>
      <Option key='none' value='None'>None</Option>
      {Array.from(objects.keys()).map( (key) => {
        return (<Option key={key} value={key}>{key}</Option>)
      })} 
      </Select>
    )
  }
  return (<div></div>)
}

export const SLinkSubtypeRender = (props: { 
  defaultValue?: any, 
  onLoad?: (newValue: any) => void, 
  onChange?: (newValue: any) => void  
}) => {
	const connection = useConnection();
	const { Option } = Select;
	var [ loaded, setLoaded ] = useState(false)
  var [ storage, setStorage ] = useState<Storage|undefined>();
  var [ templates, setTemplates ] = useState<{publicKey: PublicKey, name: string}[] | undefined>([]);
  var [ templatesAmount, setTemplatesAmount] = useState(0)

	const loadTemplate = async (templatePublicKey: PublicKey) => {
    var tpl = await TemplateData.get(connection, templatePublicKey)
    if (templates) {
      templates?.push({
        publicKey: templatePublicKey, 
        name: tpl.name
      })
      setTemplatesAmount(templates?.length)
    }
  }

   useEffect(() => { 
    if (!storage) {
      (async () => {
        const strg = await Storage.get(connection, projectStoragePublicKey)
        setStorage(strg)
        for (let templatePublicKey of strg.accounts) {
          loadTemplate(templatePublicKey)
        }
      })()
    }
    if (storage && templates && templates.length > 0) {
    	if (!loaded) {
	  		setLoaded(true)
	  		props?.onLoad && props.onLoad(new SLink({ templatePublicKey: templates[0].publicKey }))
	  	}
    }

  });


  if (storage && templates && templates.length > 0) {
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

export class SLink extends SType {
  id = 3;
  typeName = "Link";
  render = SLinkRender;
  templatePublicKey: PublicKey = new PublicKey('2WQzLh8J8Acmbzzi4qVmNv2ZX3hWycjHGMu7LRjQ8hbz');
  nameRender = (<p>Link</p>);
  readValue = (reader: BinaryReader) => { return reader.readPubkey() }
  writeValue = (value: string, writer: BinaryWriter) => { console.log('writeKey ' + value); writer.writePubkey(new PublicKey(value)) }
  static subtypeRender = SLinkSubtypeRender;
  constructor(src: { templatePublicKey: PublicKey }) {
  	super()
  	this.templatePublicKey = src.templatePublicKey;
    this.render = (props: { readonly?: boolean, defaultValue?: PublicKey,  onChange?: (newValue: any) => void  }) => { return(<SLinkRender 
      onChange={props.onChange} 
      defaultValue={props.defaultValue} 
      templatePublicKey={this.templatePublicKey}
      readonly={props?.readonly}
    />)}
    this.nameRender = (<p>Link to: <a href = {'/#/template/'+src.templatePublicKey.toBase58()}>{src.templatePublicKey.toBase58()}</a></p>); //TOD: name
  }
  static read = (reader: BinaryReader) => {
  	return new SLink({ templatePublicKey: reader.readPubkey() })
  }
  write = (writer: BinaryWriter) => {
  	writer.writePubkey(this.templatePublicKey)
  }
}
