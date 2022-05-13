import { useEffect } from 'react';
import { Handle, Position } from 'react-flow-renderer';
import { defaultBricksByType, getBrickTypeName } from './index';
import { notify } from "../../../utils/notifications";
import { useProject } from '../../../contexts/project';

export default function Brick(props: {
	id: string,
	data: any
}) {
	const { userPrefs } = useProject();
	const brick = props.data.brick;
	const brickClass = props.data.brickClass;
	const brickTypeName = getBrickTypeName(brick.type);
	let brickSignature = props.data.brickSignatures.find((bs: any) => bs.type === brick.type && bs.subtype === brick.subtype);
	if (!brickSignature) {
		brickSignature = defaultBricksByType.get(brick.type)
	}
	let nestedParams: any[] = [];
	let inlineParams: any[] = [];
	brickSignature.params.forEach((param: any) => {

		if (param.type instanceof brickClass) nestedParams.push(param);
		else inlineParams.push(param);
	});

	const onRemoveButtonClicked = () => {
		props.data.onRemoveButtonClicked(props.data.brickTree, props.data.parentBrick, props.data.paramID);
	};

	let isHovered = false;

	const copy = () => {
		let brickJson = JSON.stringify(props.data.brick)
		notify({ message: "Brick copied", description: brickJson.substring(0, 30) + '...', color: '#DDFFDD'})
		navigator.clipboard.writeText(brickJson);
	}

	const paste = () => {
		navigator.clipboard.readText().then((clipboardContents) => {
			if (!clipboardContents) return;
			
			let pastedBrickTree: any = null;
			try {
				pastedBrickTree = JSON.parse(clipboardContents);
			} catch {
				notify({ message: "Invalid brickTree format in clipboard", description: clipboardContents, color: '#FFDDDD'})
			}
			if (!pastedBrickTree) return; // TODO: add validation
			props.data.onPaste(pastedBrickTree, props.data.brickTree, props.data.parentBrick, props.data.paramID);
		});
	}

	useEffect(() => {
		let isCtrlDown = false;
		
		const onKeyDown = (e: KeyboardEvent) => {
			if (!isHovered) return;
			if (!e.ctrlKey) return;
			let charCode = String.fromCharCode(e.which).toLowerCase();
			if(charCode === 'c') copy();
			if(charCode === 'v') paste();
		};

		window.addEventListener('keydown', onKeyDown);
		return () => {
			window.removeEventListener('keydown', onKeyDown);
		};
	});


	return (
		<div className={ `brick ${brickTypeName} ${props.data.small ? 'small' : ''} ${props.data.readonly ? 'readonly' : ''}` } 
		onPointerEnter={() => isHovered = true }
		onPointerLeave={() => isHovered = false }
		style={{ width: `${Math.max(15, 4 + nestedParams.length * 5)}rem`}}
		>
			{!props.data.readonly && !props.data.small && <div className={"remove-button" } onClick={onRemoveButtonClicked}>x</div>}
			<div className="brick-name">{brickSignature.name}</div>
			{inlineParams.map((param: any) =>
				<div className="field-container" key={param.id}>
					<div>{param.name}</div>
					<param.type.valueRender 
						defaultValue={brick.params[param.id]} 
						onChange={ !props.data.readonly ?
						(value: any) => {
							brick.params[param.id] = value
							props.data.onChange()
						} : null } 
					/>
				</div>
			)}
			{props.data.parentBrick &&
			<Handle type="target" position={Position.Top} />}
			{nestedParams.map((param: any, index: number) =>
				<Handle id={`h${props.id}-${param.id}`} key={param.id} type="source" position={Position.Bottom}
				        style={{ left: Math.round(100 / (nestedParams.length + 1) * (index + 1)) + '%' }}>
					<div className="handle-label">{param.name}</div>
				</Handle>
			)}
		</div>
	);
}
