import React, { useState, useEffect } from "react";
import { useConnection } from "../../contexts/connection";
import { useProject } from "../../contexts/project"
import { SystemProgram } from "@solana/web3.js";
import { Template } from "../../content/"
import { Menu } from "antd"

const { SubMenu } = Menu;

const SolceryMenuTemplate = (
  template: any
) => {
  const connection = useConnection();
  const [ tpl, setTpl ] = useState<any>(undefined)

  useEffect(() => {
    (async () => {
      let t = await template.template.await(connection) //TODO: template.template?
      setTpl(t)
    })()
  }, [])

  if (tpl !== undefined)
    return (
      <Menu.Item key={tpl.id}>
        <a href={'/#/template/' + tpl.id}>{tpl.name}</a>
      </Menu.Item>)
  return (<></>)
}

export const SolceryMenu = () => {
  const { project, userPrefs } = useProject();
  const [ templates, setTemplates ] = useState<any[]>([]);
  const connection = useConnection();

  useEffect(() => {
    if (project) {
      setTemplates(project.templateStorage.getAll(Template))
    }
  }, [ project ]);

  // useEffect(() => {
  //   if (!templates) return;
  //   let res: any[] = [];
  //   for (let tpl of templates) {
  //     res.push({
  //       code: tpl.code,
  //       name: tpl.name,
  //       fields: Object.values(tpl.fields).map((field: any) => {
  //         return {
  //           name: field.name,
  //           code: field.code,
  //           type: field.fieldType.getName(project),
  //         }
  //       })
  //     })
  //   }
  //   console.log(JSON.stringify(res, undefined, 2))
  // }, [ templates ])

  if (!project) return <></>
  return (
    <Menu mode="horizontal">
      <Menu.Item key="play">
        <a href="/#/play">{ userPrefs && userPrefs.layoutPresets ? 'PLAY (CUSTOM PRESET)' : 'PLAY' }</a>
      </Menu.Item>
      <Menu.Item key="home">
        <a key='home' href='/#/'>Home</a>
      </Menu.Item>
      {templates.map((tpl: any) => 
        <Menu.Item key={tpl.id}>
          <a href={'/#/template/' + tpl.id}>{tpl.name}</a>
        </Menu.Item>
      )}
      {project && 
      <Menu.Item key="game">
        <a href={ "/#/game/" + project.id }>RELEASE</a>
      </Menu.Item>}
    </Menu>);
};
