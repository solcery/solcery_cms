import React, { useState, useEffect } from "react";
import { useConnection } from "../../contexts/connection";
import { useProject } from "../../contexts/project"
import { SystemProgram } from "@solana/web3.js";
import { TemplateData, Storage} from "../../solcery/classes"
import { Menu} from "antd"

const { SubMenu } = Menu;

export const SolceryMenu = () => {
  const { project } = useProject();
  const connection = useConnection();
  var [ templates, setTemplates ] = useState<TemplateData[]>([]);  

  useEffect(() => { 
    if (project)
      (async () => {
        const strg = await Storage.get(connection, project?.templateStorage)
        setTemplates(await TemplateData.getAll(connection, strg.accounts))
      })()
  }, [ project ]);

  const handleClick = (event: any) => {

  }

  return (
    <Menu onClick={handleClick} mode="horizontal">
      <Menu.Item key="play">
        <a href="/#/play">PLAY</a>
      </Menu.Item>
      <Menu.Item key="home">
        <a key='home' href='/#/'>Home</a>
      </Menu.Item>
      {templates.map((tpl) => 
        <Menu.Item key={tpl.publicKey.toBase58()}>
          <a href={'/#/template/' + tpl.publicKey.toBase58()}>{tpl.name}</a>
        </Menu.Item>)
      }
    </Menu>);
};
