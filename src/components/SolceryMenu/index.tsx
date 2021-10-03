import React, { useState, useEffect } from "react";
import { useConnection } from "../../contexts/connection";
import { useProject } from "../../contexts/project"
import { SystemProgram } from "@solana/web3.js";
import "./style.less";
import { TemplateData, Storage} from "../../solcery/classes"

export const SolceryMenu = () => {
  const { project } = useProject();
  const connection = useConnection();
  var [ templates, setTemplates ] = useState<TemplateData[]>([]);  
  var [ loaded, setLoaded ] = useState<boolean>(false);

  useEffect(() => { 
    if (!loaded) {
      if (project) {
        (async () => {
          const strg = await Storage.get(connection, project?.templateStorage)
          setTemplates(await TemplateData.getAll(connection, strg.accounts))
        })()
        setLoaded(true)
      }
    }
  });

  if (templates.length > 0) 
    return (
      <div className='Solcery-Bar'>
        <a key='play' style={{padding: '25px 10px'}} href='/#/play'>PLAY</a>
        <a key='home' style={{padding: '25px 10px'}} href='/#/'>Home</a>
        { templates.map((tpl) => {
          return (<a style={{padding: '25px 10px'}} key={tpl.publicKey.toBase58()} href={'/#/template/' + tpl.publicKey.toBase58()}>{tpl.name}</a>)
        })}
        
        
      </div>
    );
  return (
    <div>NONE</div>
  )
};
