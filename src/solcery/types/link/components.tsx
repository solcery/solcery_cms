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
  const { project } = useProject();
  const [ template, setTemplate ] = useState<any>(undefined);
  const { Option } = Select;

  useEffect(() => { 
    setTemplate(project.getTemplate(props.type.templatePublicKey))
  }, [ project ]);


  if (!props.onChange && project) {
    let object = project.childrenById[props.defaultValue]
    return (<a href={'/#/object/'+ props.defaultValue?.toBase58()}>{ object ? object.fields.name : props.defaultValue?.toBase58() }</a>)
  }

  if (template) {
    return (
      <Select defaultValue={ props.defaultValue ? props.defaultValue.toBase58() : 'None' } onChange={(objectKey) => { 
        props?.onChange && props.onChange(objectKey != 'None' ? new PublicKey(objectKey) : undefined)
      }}>
      <Option key='none' value='None'>None</Option>
      {template.getObjects().map( (obj: any) => {
        return (<Option key={obj.publicKey.toBase58()} value={ obj.publicKey.toBase58()}>{ obj.fields.name }</Option>) //TODO
      })} 
      </Select>
    )
  }
  return (<></>)
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
  return (<></>)
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
