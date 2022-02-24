import { useState, useEffect, useCallback, useRef } from 'react';
import ReactFlow, { isNode, useZoomPanHelper } from 'react-flow-renderer';
import AddBrickButton from './AddBrickButton';
import Brick from './Brick';
import { Button } from 'antd';
import LayoutHelper from './LayoutHelper';
import makeLayoutedElements from './dagreLayout';
import './BrickEditor.scss';

let brickUniqueID = 0;

const nodeTypes = {
	add: AddBrickButton,
	brick: Brick
};

export const BrickEditor = (props: {
	width: number,
	height: number
	brickSignatures: any,
	brickClass: any,
	brickType: number,
	brickTree?: any,
	onChange?: (brickTree: any) => void
}) => {

	const [ valid, setValid ] = useState(true)

	const [ active, setActive ] = useState(false)
	let width = active ? window.innerWidth : props.width;
	let height = active ? window.innerHeight : props.height;

	const reformat = (brickTree: any) => {
		if (!brickTree)
			return undefined
		if (!brickTree.params)
			return brickTree
		let newParams: any[] = []
		for (let key of Object.keys(brickTree.params)) {
			newParams.push({
			id: parseInt(key),
			value: reformat(brickTree.params[key]),
			})
		}
		return {
			type: brickTree.type,
			subtype: brickTree.subtype,
			params: newParams,
		}
	}

	const reformat2 = (brickTree: any) => {
		if (!brickTree)
			return undefined
		if (!brickTree.params)
			return brickTree
		let newParams: any = {}
		for (let param of brickTree.params) {
			newParams[param.id] = reformat2(param.value)
		}
		return {
			type: brickTree.type,
			subtype: brickTree.subtype,
			params: newParams,
		}
	}

	const [ state, setState ] = useState <any> ({ elements: [], isLayouted: false });
	const [ brickTree, brickTreeSet ] = useState<any>(reformat2(props.brickTree));
	const [ redraw, setRedraw ] = useState(true);
	const { fitView } = useZoomPanHelper()

	const setBrickTree = (brickTree: any) => {
		brickTreeSet(brickTree)
		onChange(brickTree)
	}

	const onChange = (brickTree: any) => {
		if (props.onChange) {
			let isValid = checkCompleteness(brickTree)
			setValid(isValid)
			if (isValid) {
		 		props.onChange(reformat(brickTree));
		 	}
		}
	}

	const checkCompleteness: (brickTree: any) => boolean = (brickTree: any) => {
		if (!brickTree)
			return false
		if (!brickTree.params)
			return true
		let result: boolean = true
		for (let param of Object.values(brickTree.params)) {
			result = result && checkCompleteness(param)
		}
		return result
	}



	const addBrick = useCallback((brickSignature: any, bt: any, parentBrick: any, paramID: number) => {
		if (!props.onChange || !active) return;
		// making simple brick object from brick signature
		const brick: any = {
			type: brickSignature.type,
			subtype: brickSignature.subtype,
			params: {}
		};
		brickSignature.params.forEach((param: any) => {
			brick.params[param.id] = null;
		});

		if (parentBrick) {
			parentBrick.params[paramID] = brick;
			setBrickTree(JSON.parse(JSON.stringify(bt)))
		} else {
			setBrickTree(brick)
		}
	}, [ active, props ]);

	const removeBrick = useCallback((bt: any, parentBrick: any, paramID: number) => {
		if (!props.onChange || !active) return;

		if (parentBrick) {
			parentBrick.params[paramID] = null;
			setBrickTree(JSON.parse(JSON.stringify(bt)))
		} else {
			sleepAndFit()
			setBrickTree(null)
		}
	}, [ props, active ]);

	const onPaste = useCallback((pastedBrickTree: any, bt: any, parentBrick: any, paramID: number) => {
		if (!props.onChange || !active) return;

		if (parentBrick) {
			const brickSignature = props.brickSignatures.find((bs: any) => bs.type === parentBrick.type && bs.subtype === parentBrick.subtype);
			const param = brickSignature.params.find((p: any) => p.id === paramID);
			if (param.type.brickType === pastedBrickTree.type) {
				parentBrick.params[paramID] = pastedBrickTree;
				setBrickTree(JSON.parse(JSON.stringify(bt)))
			} else {
				alert('Unable to paste brick tree: incompatible brick types.');
			}
		} else if (pastedBrickTree.type === 0) { //??
			sleepAndFit()
			setBrickTree(pastedBrickTree)
		}
	}, [ props, active ]);

	const makeAddButtonElement = useCallback((brickID: string, brickType: number, brickTree: any, parentBrick: any, paramID: number) => {
		return {
			id: brickID,
			type: 'add',
			position: { x: 0, y: 0 },
			data: {
				brickSignatures: props.brickSignatures,
				brickClass: props.brickClass,
				brickType,
				brickTree,
				parentBrick,
				paramID,
				onBrickSubtypeSelected: addBrick,
				onPaste: onPaste,
				onChange: () => { if (props.onChange) props.onChange(brickTree) },
				readonly: !active || !props.onChange,
			}
		};
	}, [ active, props.brickSignatures, props.brickClass, addBrick, onPaste]);

	const makeAddButtonWithEdgeElements = useCallback((brickID: string, brickType: number, brickTree: any, parentBrick: any,
														 parentBrickID: any, paramID: number) => {
		const elements: any[] = [makeAddButtonElement(brickID, brickType, brickTree, parentBrick, paramID)];
		elements.push({
			id: `e${parentBrickID}-${brickID}`,
			source: parentBrickID,
			sourceHandle: `h${parentBrickID}-${paramID}`,
			target: brickID,
			type: 'smoothstep'
		});
		return elements;
	}, [makeAddButtonElement]);

	const makeBrickElement = useCallback((brickID: string, brick: any, bt: any, parentBrick: any, paramID: number) => {
		return {
			id: brickID,
			type: 'brick',
			position: { x: 0, y: 0 },
			data: {
				brickSignatures: props.brickSignatures,
				brickClass: props.brickClass,
				brick,
				parentBrick,
				brickTree,
				paramID,
				onRemoveButtonClicked: removeBrick,
				onPaste: onPaste,
				onChange: () => { onChange(bt) },
				readonly: !active || !props.onChange,
			}
		}
	}, [props.brickSignatures, props.brickClass, removeBrick, onPaste]);

	const makeBrickWithEdgeElements = useCallback((brickID: string, brick: any, brickTree: any, parentBrick: any,
													 parentBrickID: any, paramID: number) => {
		const elements: any[] = [makeBrickElement(brickID, brick, brickTree, parentBrick, paramID)];
		if (parentBrickID) {
			elements.push({
				id: `e${parentBrickID}-${brickID}`,
				source: parentBrickID,
				sourceHandle: `h${parentBrickID}-${paramID}`,
				target: brickID,
				type: 'smoothstep'
			});
		}
		return elements;
	}, [makeBrickElement]);

	const makeBrickTreeElements = useCallback((brickTree: any) => {
		const elements: any[] = [];

		const processBrick = (brick: any, parentBrickID: any = null, parentBrick: any = null, paramID: number = 0) => {
			const brickID = Number(++brickUniqueID).toString();
			elements.push(...makeBrickWithEdgeElements(brickID, brick, brickTree, parentBrick, parentBrickID, paramID));
			const brickSignature = props.brickSignatures.find((bs: any) => bs.type === brick.type && bs.subtype === brick.subtype);

			brickSignature.params.forEach((param: any) => {
				if (!(param.type instanceof props.brickClass)) return;

				const value = brick.params[param.id];
				if (value) {
					processBrick(value, brickID, brick, param.id);
				} else {
					const addButtonBrickID = Number(++brickUniqueID).toString();
					const addButtonElems = makeAddButtonWithEdgeElements(addButtonBrickID, param.type.brickType, brickTree, brick, brickID, param.id);
					elements.push(...addButtonElems);
				}
			});
		};

		processBrick(brickTree);

		return elements;
	}, [props.brickSignatures, active, props.brickClass, makeAddButtonWithEdgeElements, makeBrickWithEdgeElements]);

	const onNodeSizesChange = (nodeSizesByID: any) => {
		const rootNodePos = { 'x': width * 0.5, 'y': height * 0.1 };
		setState({
			elements: makeLayoutedElements(state.elements, nodeSizesByID, rootNodePos, isNode),
			isLayouted: true
		});
	};

	useEffect(() => {
		let elements = null;
		if (brickTree) {
			elements = makeBrickTreeElements(brickTree);
		}	else {
			elements = [makeAddButtonElement(Number(++brickUniqueID).toString(), props.brickType, null, null, 0)];
		}
		setState({ elements: elements, isLayouted: false });
		if (editorRef.current) {
			editorRef.current.style.visibility = 'hidden';
		}
	}, [brickTree, makeBrickTreeElements, makeAddButtonElement]);

	useEffect(() => {
		sleepAndFit()
	}, [ active ])

	useEffect(() => {
		if (state.isLayouted && editorRef.current) {
			editorRef.current.style.visibility = 'visible';
		}
	}, [state.isLayouted]);

	const editorRef = useRef <any> (null);
	const onLoad = (reactFlowInstance: any) => {
		sleepAndFit()
	};

	const sleepAndFit = () => {
		(async() => {
			await new Promise(r => setTimeout(r, 50));
			fitView();
		})()
	}

	const changeActive = () => {
		setActive(!active)
	}

	let style = {
		backgroundColor: active ? 'black' : 'transparent',
		pointerEvents: active ? 'auto' : 'none',
		position: active ? 'fixed' : 'relative',
		left: 0,
		top: 0,
		bottom: 0,
		right: 0,
		zIndex: active ? 100 : 10,
		display: active ? 'inline' : 'block',
  	} as React.CSSProperties
  	
	return (
	<>
	  <div onClick={() => { if (!active) changeActive() }}>
		<div style={style}>
		  {active && (!props.onChange || valid) && (<Button onClick = {() => { if (active) changeActive(); } }>OK</Button>)}
			<div ref={editorRef} className="brick-editor" style={{ 
				width: width, 
				height: height 
			}}>
				<ReactFlow 
					nodeTypes={nodeTypes}
					elements={state.elements}
					nodesDraggable={false}
					nodesConnectable={false}
					zoomOnDoubleClick={false}
					paneMoveable={active}
					zoomOnScroll={active}
					zoomOnPinch={active}
					onLoad={onLoad}
					minZoom={ active ? 0.4 : 0.001}
					maxZoom={1}>
					<LayoutHelper onNodeSizesChange={onNodeSizesChange} />
				</ReactFlow>
			</div>
		</div>
	  </div>
	</>);
}

export default BrickEditor;
