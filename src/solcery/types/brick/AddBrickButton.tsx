import { useState, useEffect } from 'react';
import { Handle, Position } from 'react-flow-renderer';
import Select from 'react-select';
import { notify } from "../../../utils/notifications";

export default function AddBrickButton(props: {
	id: string,
	data: any
}) {
	const brickType = props.data.brickType;
	const brickSignaturesOfType = props.data.brickSignatures.filter((brick: any) => brick.type === brickType);

	const [isNodeTypeSelectorVisible, setNodeTypeSelectorVisible] = useState(false);

	// stopPropagation() is used extensively below to correctly handle config selector hiding on any click outside of it
	
	const onAddButtonPointerUp = (event: any) => {
		setNodeTypeSelectorVisible(true);
		event.stopPropagation();
	};

	const onSelectorPointerUp = (event: any) => {
		event.stopPropagation();
	};

	const onBrickSubtypeSelected = (option: any) => {
		const subtype = option.value;
		const brickSignature = brickSignaturesOfType.find((brick: any) => brick.subtype === subtype);
		props.data.onBrickSubtypeSelected(brickSignature, props.data.brickTree, props.data.parentBrick, props.data.paramID);
		setNodeTypeSelectorVisible(false);
	};

	useEffect(() => {
		const onMouseUp = () => {
			setNodeTypeSelectorVisible(false);
		};
		window.addEventListener('pointerup', onMouseUp);
		return () => {
			window.removeEventListener('pointerup', onMouseUp);
		};
	}, []);

	let isHovered = false;

	const paste = () => {
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

	useEffect(() => {
		let isCtrlDown = false;
		
		const onKeyDown = (e: KeyboardEvent) => {
			if (!isHovered) return;
			if (!e.ctrlKey) return;
			let charCode = String.fromCharCode(e.which).toLowerCase();
			if(charCode === 'v') paste();
		};

		window.addEventListener('keydown', onKeyDown);
		return () => {
			window.removeEventListener('keydown', onKeyDown);
		};
	});

	const selectorOptions = brickSignaturesOfType.map((bs: any) => {
		return { value: bs.subtype, label: bs.name, className: 'test' };
	});

	return (
		<>
			<div className={ props.data.readonly ? "add-brick-button" : "add-brick-button add-brick-button-active" }
			     onPointerUp={onAddButtonPointerUp}
			     onPointerEnter={() => isHovered = true}
			     onPointerLeave={() => isHovered = false}>+</div>
			{props.data.parentBrick &&
			<Handle type="target" position={Position.Top} />}
			{isNodeTypeSelectorVisible &&
			<div className="brick-subtype-selector nowheel" onPointerUp={onSelectorPointerUp}>
				<Select classNamePrefix="react-select" options={selectorOptions} placeholder="Search..."
				        autoFocus={true} defaultMenuIsOpen={true} onChange={onBrickSubtypeSelected} />
			</div>}
		</>
	);
}
