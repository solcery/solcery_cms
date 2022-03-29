import { PublicKey } from "@solana/web3.js";
import EventEmitter from "eventemitter3";
import React, {
  useContext,
  useState,
} from "react";
import { Button, Modal, Input } from "antd";
import { ConnectButton } from "../components/ConnectButton";

import { SolceryMenu } from "../components/SolceryMenu";
import { useConnection } from "./connection";
import { useWallet, WalletProvider } from "./wallet";

import { Project as Prj } from '../content/project'

import Cookies from 'universal-cookie';

interface ProjectContextInterface {
  project: any | undefined;
}

const ProjectContext = React.createContext<ProjectContextInterface>({ 
	project: undefined
});

export function ProjectProvider({ children = null as any }) {
	
	var cookies = new Cookies()
	const connection = useConnection()
	const { connected } = useWallet();
	const [ projectKey, setProjectKey ] = useState<string>(cookies.get('projectKey'));
	const [ project, setProject ] = useState<any>(undefined)
	// console.log(connected)

	const login = async () => {
		if (!projectKey)
			return
		cookies.set('projectKey', projectKey)
		let prj = window.root.create(Prj, { id: projectKey, pubkey: new PublicKey(projectKey) })
		setProject(await prj.await(connection))
	}

	if (project)
		return (
			<ProjectContext.Provider
			value={{
				project: project
			}}
			>
			<SolceryMenu/>
			{children}
			</ProjectContext.Provider>
		);
	return (
		<div>
		<Modal
			title="Login"
			okText="Login"
			visible={!project}
			cancelButtonProps={{ style: { display: "none" } }}
			okButtonProps={!connected ? { style: { display: "none" }} : {}}
			closable={false}
			width={400}
			onOk={login}
		>
		<Input hidden={!connected} onChange ={(event) => { setProjectKey(event.target.value) }} defaultValue={projectKey}/>
		{!connected && <ConnectButton/>}
		</Modal>
		{children}
		</div>
	);
}

export function useProject() {
 	const { project } = useContext(ProjectContext);
	return { project }
}
