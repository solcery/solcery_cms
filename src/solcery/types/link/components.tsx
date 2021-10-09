import React, { useState, useEffect } from "react";
import { Select } from 'antd';
import { useConnection } from "../../../contexts/connection";
import { useProject } from "../../../contexts/project";
import { TemplateData, Storage, TplObject } from "../../classes";
import { ValueRenderParams } from "../index";
import { SLink } from "./index"
import { PublicKey } from "@solana/web3.js";

export const ValueRender = (props: any) => {

  const connection = useConnection();
  const { Option } = Select;
  var [ objects, setObjects] = useState<TplObject[]>([]);
  var [ object, setObject ] = useState<TplObject|undefined>();

  useEffect(() => { 
    if (!props.readonly && objects.length == 0) {
      (async () => {
        const tpl = await TemplateData.get(connection, props.type.templatePublicKey)
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
        const tpl = await TemplateData.get(connection, props.type.templatePublicKey)
        var obj = await tpl.getObject(connection, props.defaultValue)
        setObject(obj)
      })()
    }
  });

  if (!props.onChange) {
    return (<a href={'/#/object/'+ props.defaultValue?.toBase58()}>{ object ? object.getName() : props.defaultValue?.toBase58() }</a>)
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

export const TypedataRender = (props: { 
  defaultValue?: any, //TODO:
  onChange?: (newValue: any) => void  
}) => {
  const connection = useConnection();
  const { Option } = Select;
  const { project } = useProject()

  var [ templates, setTemplates ] = useState<TemplateData[]>([]);
  useEffect(() => { 
    if (!project)
      return
    (async () => {
      let strg = await Storage.get(connection, project.templateStorage)
      var tpls = await TemplateData.getAll(connection, strg.accounts)
      props.onChange && props.onChange(new SLink({templatePublicKey: tpls[0].publicKey}))
      setTemplates(tpls)
    })()
  }, []);


  if (templates.length > 0) {
    return (
      <Select defaultValue={ props.defaultValue ? props.defaultValue.templatePublicKey.toBase58() : templates[0].publicKey.toBase58() } onChange={(templateKey) => { 
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

export const NameRender = (props: { 
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
