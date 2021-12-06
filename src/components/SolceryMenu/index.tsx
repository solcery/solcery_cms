import React, { useState, useEffect } from "react";
import { useConnection } from "../../contexts/connection";
import { useProject } from "../../contexts/project"
import { SystemProgram } from "@solana/web3.js";
import { Template } from "../../content/"
import { Menu} from "antd"

const { SubMenu } = Menu;

const SolceryMenuTemplate = (
  template: any
) => {
  const connection = useConnection();
  const [ tpl, setTpl ] = useState<any>(undefined)
  useEffect(() => {
    (async () => {
      console.log(template)
      let t = await template.await(connection)
      console.log(t)
      setTpl(t)
    })()
  }, [])

  if (tpl !== undefined)
    return (
      <Menu.Item key={tpl.id}>
        <a href={'/#/template/' + tpl.id}>{tpl.name}</a>
      </Menu.Item>)
}

export const SolceryMenu = () => {
  const { project } = useProject();
  const [ templates, setTemplates ] = useState<any[]>([]);
  const connection = useConnection();

  useEffect(() => {
    if (project) {
      (async () => {
        let templateStorage = project.templateStorage
        templateStorage = await templateStorage.await(connection)
        let tpls = templateStorage.getAll(Template)
        console.log(tpls)
        setTemplates(tpls)
      })()
      // setTemplates(project.templateStorage.getAll(Template))
    }
  }, [ project ]);

  return (
    <Menu mode="horizontal">
      <Menu.Item key="play">
        <a href="/#/play">PLAY</a>
      </Menu.Item>
      <Menu.Item key="home">
        <a key='home' href='/#/'>Home</a>
      </Menu.Item>
      {templates.map((tpl: any) => 
        <SolceryMenuTemplate key={tpl.id} template={tpl}/>
      )}
      {project && 
      <Menu.Item key="game">
        <a href={ "/#/game/" + project.id }>RELEASE</a>
      </Menu.Item>}
    </Menu>);
};
