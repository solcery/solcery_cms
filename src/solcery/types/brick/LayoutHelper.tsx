import { useEffect, useState } from 'react';
import { useStoreState } from 'react-flow-renderer';

export default function LayoutHelper(props: {
	onNodeSizesChange: (nodeSizesByID: any) => void
}) {

	const [ lastNodeSizesByIDJSON, setLastNodeSizesByIDJSON ] = useState('')
	const nodes = useStoreState((state) => state.nodes);
	useEffect(() => {
		const nodeSizesByID: any = {};
		const allSizesAreValid = nodes.length > 0 && nodes.every((node: any) => {
			const w = node.__rf.width, h = node.__rf.height;
			nodeSizesByID[node.id] = { width: w, height: h };
			return w !== null && h !== null;
		});
		if (allSizesAreValid) {
			const nodeSizesByIDJSON = JSON.stringify(nodeSizesByID);
			if (nodeSizesByIDJSON !== lastNodeSizesByIDJSON) {
				setLastNodeSizesByIDJSON(nodeSizesByIDJSON)
				props.onNodeSizesChange(nodeSizesByID);
			}
		}
	});
	return null;
};
