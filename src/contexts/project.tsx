import { PublicKey } from "@solana/web3.js";
import EventEmitter from "eventemitter3";
import React, {
  useContext,
  useState,
  useEffect,
} from "react";
import { Button, Modal, Input, Spin } from "antd";
import { ConnectButton } from "../components/ConnectButton";

import { SolceryMenu } from "../components/SolceryMenu";
import { useConnection } from "./connection";
import { useWallet, WalletProvider } from "./wallet";

import { Project as Prj } from '../content/project'

import Cookies from 'universal-cookie';

interface ProjectContextInterface {
  project: any | undefined;
  userPrefs: any | undefined;
}

const ProjectContext = React.createContext<ProjectContextInterface>({ 
	project: undefined,
	userPrefs: undefined,
});

export function ProjectProvider({ children = null as any }) {
	
	var cookies = new Cookies()
	const connection = useConnection()
	const { connected, publicKey } = useWallet();
	const [ projectKey, setProjectKey ] = useState<string>(cookies.get('projectKey'));
	const [ project, setProject ] = useState<any>(undefined)
	const [ isLoading, setIsLoading ] = useState(false)
	const [ userPrefs, setUserPrefs ] = useState<any>({})

	const SESSION_LENGTH = 86400 * 30 * 1000;

	const login = async () => {
		if (!projectKey)
			return
		setIsLoading(true)
		let prj = window.root.create(Prj, { id: projectKey, pubkey: new PublicKey(projectKey) })
		setProject(await prj.await(connection))
		setIsLoading(false)
		cookies.set('projectKey', projectKey, {
				expires: new Date((new Date()).getTime() + SESSION_LENGTH)
		})
	}

	useEffect(() => {
		if (!project) return;
		if (!publicKey) return;
		let user = project.getTemplates()
			.find((tpl: any) => tpl.code === 'users')
			.getObjects()
			.find((obj: any) => obj.fields.pubkey === publicKey.toBase58());
		if (user) {
			setUserPrefs(user.fields)
		}
	}, [ project ])

	useEffect(() => {
		if (!userPrefs) return;
		if (userPrefs.css) {
			var style = document.createElement('style');
			style.type = 'text/css';
			style.innerHTML = userPrefs.css;
			if (document) {
				document.getElementsByTagName('head')[0].appendChild(style);
			}
		}
	}, [ userPrefs ])

	if (project)
		return (
			<ProjectContext.Provider
				value={{ project, userPrefs }}
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
			okButtonProps={(!connected || isLoading) ? { style: { display: "none" }} : {}}
			closable={false}
			width={400}
			onOk={login}
		>
			<Input hidden={!connected || isLoading} onChange ={(event) => { setProjectKey(event.target.value) }} defaultValue={projectKey}/>
			{isLoading && <Spin size='large'/>}
			{!connected && <ConnectButton/>}
		</Modal>
		{children}
		</div>
	);
}

export function useProject() {
 	const { project, userPrefs } = useContext(ProjectContext);
	return { project, userPrefs }
}
