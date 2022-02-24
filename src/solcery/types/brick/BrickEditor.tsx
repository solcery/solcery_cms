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
	active?: boolean,
}) => {
	const [ state, setState ] = useState <any> ({ elements: [], isLayouted: false });
	const [ brickTree, brickTreeSet ] = useState<any>(props.brickTree);
	const [ redraw, setRedraw ] = useState(true);
	const { fitView } = useZoomPanHelper()

	const setBrickTree = (brickTree: any) => {
		brickTreeSet(brickTree)
		if (props.onChange)
			props.onChange(brickTree)
	}

	// useEffect(() => {
	// 	if (props.onChange)
	// 		props.onChange(brickTree)
	// }, [ brickTree ])

	const addBrick = useCallback((brickSignature: any, bt: any, parentBrick: any, paramID: number) => {
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
	}, [props]);

	const removeBrick = useCallback((bt: any, parentBrick: any, paramID: number) => {
		if (parentBrick) {
			parentBrick.params[paramID] = null;
			setBrickTree(JSON.parse(JSON.stringify(bt)))
		} else {
			setBrickTree(null)
		}
	}, [props]);

	const onPaste = useCallback((pastedBrickTree: any, bt: any, parentBrick: any, paramID: number) => {
		if (!props.onChange) return;

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
			setBrickTree(pastedBrickTree)
		}
	}, [props]);

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
			}
		};
	}, [props.brickSignatures, props.brickClass, addBrick, onPaste]);

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

	const makeBrickElement = useCallback((brickID: string, brick: any, brickTree: any, parentBrick: any, paramID: number) => {
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
				onChange: () => { if (props.onChange) props.onChange(brickTree) },
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
	}, [props.brickSignatures, props.brickClass, makeAddButtonWithEdgeElements, makeBrickWithEdgeElements]);

	const onNodeSizesChange = (nodeSizesByID: any) => {
		const rootNodePos = { 'x': props.width * 0.5, 'y': props.height * 0.1 };
		setState({
			elements: makeLayoutedElements(state.elements, nodeSizesByID, rootNodePos, isNode),
			isLayouted: true
		});
	};

	// fitView();
	// for (let i = 1; i < 15; i++)
	// 	zoomOut();
	useEffect(() => {
		console.log(brickTree)
		let elements = null;
		if (brickTree) {
			console.log('makeBrickTreeElements')
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
		(async() => {
			await new Promise(r => setTimeout(r, 10));
			fitView()
		})()
	}, [ props.active ])

	useEffect(() => {
		if (state.isLayouted && editorRef.current) {
			editorRef.current.style.visibility = 'visible';
		}
	}, [state.isLayouted]);

	const editorRef = useRef <any> (null);
	const onLoad = (reactFlowInstance: any) => {
		reactFlowInstance.fitView();
	};


	return (
		<div ref={editorRef} className="brick-editor" style={{ width: props.width, height: props.height }}>
			<ReactFlow 
				nodeTypes={nodeTypes}
				elements={state.elements}
				nodesDraggable={false}
				nodesConnectable={false}
				zoomOnDoubleClick={false}
				paneMoveable={props.active}
				zoomOnScroll={props.active}
				zoomOnPinch={props.active}
				onLoad={onLoad}
				minZoom={0.001}
				maxZoom={1}
			>
			<LayoutHelper onNodeSizesChange={onNodeSizesChange} />
			</ReactFlow>
		</div>
	);
}

export default BrickEditor;
