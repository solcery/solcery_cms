import React, { useCallback, useState, useEffect } from "react";
import { useConnection, sendTransaction} from "../../contexts/connection";
import { useWallet } from "../../contexts/wallet";
import { LAMPORTS_PER_SOL, PublicKey, Account, TransactionInstruction } from "@solana/web3.js";
import { SystemProgram } from "@solana/web3.js";
import { notify } from "../../utils/notifications";
import { ConnectButton } from "./../../components/ConnectButton";
import { LABELS } from "../../constants";
import "./style.less";
import { Project, TemplateData, SolcerySchema, Storage} from "../../solcery/classes"
import { getAccountObject, programId, projectPublicKey, projectStoragePublicKey} from "../../solcery/engine";
import { Button, Input } from "antd";

export const SolceryMenu = () => {

  const connection = useConnection();
  var [ templates, setTemplates ] = useState<TemplateData[]>([]);

  useEffect(() => { 
    if (templates.length < 1) {
      (async () => {
        const strg = await Storage.get(connection, projectStoragePublicKey)
        setTemplates(await TemplateData.getAll(connection, strg.accounts))
      })()
    }
  });

  if (templates.length > 0) 
    return (
      <div className='Solcery-Bar'>
        { templates.map((tpl) => {
          return (<a key={tpl.publicKey.toBase58()} href={'/#/template/' + tpl.publicKey.toBase58()}>{tpl.name}</a>)
        })}
        
        <table id='templatesTable'></table>
      </div>
    );
  return (
    <div></div>
  )
};
