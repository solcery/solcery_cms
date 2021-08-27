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
  const { wallet, publicKey } = useWallet();
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
  });

  if (storage && templates) 
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
