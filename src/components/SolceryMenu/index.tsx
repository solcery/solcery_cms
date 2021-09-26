import React, { useCallback, useState, useEffect } from "react";
import { useConnection, sendTransaction} from "../../contexts/connection";
import { useWallet } from "../../contexts/wallet";
import { useProject } from "../../contexts/project"
import { LAMPORTS_PER_SOL, PublicKey, Account, TransactionInstruction } from "@solana/web3.js";
import { SystemProgram } from "@solana/web3.js";
import { notify } from "../../utils/notifications";
import { ConnectButton } from "./../../components/ConnectButton";
import { LABELS } from "../../constants";
import "./style.less";
import { Project, TemplateData, SolcerySchema, Storage} from "../../solcery/classes"
import { getAccountObject, programId, projectPublicKey} from "../../solcery/engine";
import { Button, Input } from "antd";

export const SolceryMenu = () => {
  const { project } = useProject();
  const connection = useConnection();
  var [ templates, setTemplates ] = useState<TemplateData[]>([]);  

  useEffect(() => { 
    if (templates.length < 1) {
      (async () => {
          if (project) {
            const strg = await Storage.get(connection, project?.templateStorage)
            setTemplates(await TemplateData.getAll(connection, strg.accounts))
          }
        
      })()
    }
  });

  if (templates.length > 0) 
    return (
      <div className='Solcery-Bar'>
        <a key='play' style={{padding: '25px 10px'}} href='/#/play'>PLAY</a>
        { templates.map((tpl) => {
          return (<a style={{padding: '25px 10px'}} key={tpl.publicKey.toBase58()} href={'/#/template/' + tpl.publicKey.toBase58()}>{tpl.name}</a>)
        })}
        
        <table id='templatesTable'></table>
      </div>
    );
  return (
    <div>NONE</div>
  )
};
