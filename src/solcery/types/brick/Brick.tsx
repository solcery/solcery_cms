import { useEffect } from 'react';
import { Handle, Position } from 'react-flow-renderer';

export default function Brick(props: {
	id: string,
	data: any
}) {

	const brick = props.data.brick;
	const brickClass = props.data.brickClass;
	const brickSignature = props.data.brickSignatures.find((bs: any) => bs.type === brick.type && bs.subtype === brick.subtype);
	
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

	useEffect(() => {
		let isCtrlDown = false;
		
		const onKeyDown = (e: KeyboardEvent) => {
			isCtrlDown = e.keyCode === 17 || e.keyCode === 91;
		};
		const onKeyUp = (e: KeyboardEvent) => {
			isCtrlDown = !(e.keyCode === 17 || e.keyCode === 91); // Ctrl or Cmd keys
			
			if (isCtrlDown && e.keyCode === 67 /*'C' key*/ && isHovered) {
				navigator.clipboard.writeText(JSON.stringify(props.data.brick));
			}

			if (isCtrlDown && e.keyCode === 86 /*'V' key*/ && isHovered) {
				navigator.clipboard.readText().then((clipboardContents) => {
					if (!clipboardContents) return;
					
					let pastedBrickTree: any = null;
					try {
						pastedBrickTree = JSON.parse(clipboardContents);
					} catch {}
					if (!pastedBrickTree) return;
					
					props.data.onPaste(pastedBrickTree, props.data.brickTree, props.data.parentBrick, props.data.paramID);
				});
			}
		};
		
		window.addEventListener('keydown', onKeyDown);
		window.addEventListener('keyup', onKeyUp);
		
		return () => {
			window.removeEventListener('keydown', onKeyDown);
			window.removeEventListener('keyup', onKeyUp);
		};
	});

	return (
		<div className={ props.data.readonly ? "brick" : "brick brick-active" } onPointerEnter={() => isHovered = true} onPointerLeave={() => isHovered = false}>
			<div className={ props.data.readonly ? "remove-button" : "remove-button remove-button-active" } onClick={onRemoveButtonClicked}>x</div>
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
