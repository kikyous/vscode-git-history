import {
	TreeDataProvider,
	TreeItem,
	ThemeIcon,
	ExtensionContext,
	TreeItemCollapsibleState,
	Uri,
	EventEmitter,
	Command,
} from "vscode";
import { inject, injectable } from "inversify";
import { TYPES } from "../container/types";
import {
	compareFileTreeNode,
	FileNode,
	FolderNode,
	getDiffUris,
	PathCollection,
	PathType,
} from "../git/utils";

@injectable()
export class FileTreeProvider implements TreeDataProvider<TreeItem> {
	private _onDidChangeTreeData = new EventEmitter<void>();
	readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

	constructor(
		@inject(TYPES.ExtensionContext) private context: ExtensionContext
	) {}

	getTreeItem(element: Path): Path {
		return element;
	}

	getChildren(element?: Path): Thenable<Path[]> {
		const treeData =
			this.context.globalState.get<PathCollection>("changedFileTree")!;
		// TODO: order by type and name
		return Promise.resolve(
			Object.entries(
				element ? (element.children as PathCollection)! : treeData
			)
				.sort(compareFileTreeNode)
				.map(([name, props]) => {
					return new Path(name, props.type, props);
				})
		);
	}

	refresh() {
		this._onDidChangeTreeData.fire();
	}
}

class Path extends TreeItem {
	children?: PathCollection = (this.props as FolderNode).children;
	iconPath = ThemeIcon[this.pathType];
	resourceUri = this.getResourceUri(this.pathType);
	collapsibleState = this.getCollapsibleState(this.pathType);
	readonly command?: Command = this.getCommand();

	constructor(
		public label: string,
		public pathType: PathType,
		public props: FolderNode | FileNode
	) {
		super(label);
	}

	private getResourceUri(pathType: PathType) {
		const URI_MAP = {
			[PathType.FOLDER]: () => Uri.file(this.label),
			[PathType.FILE]: () => (this.props as FileNode).change.uri,
		};

		return URI_MAP[pathType]();
	}

	private getCollapsibleState(pathType: PathType) {
		const STATE_MAP = {
			[PathType.FOLDER]: TreeItemCollapsibleState.Expanded,
			[PathType.FILE]: TreeItemCollapsibleState.None,
		};

		return STATE_MAP[pathType];
	}

	private getCommand() {
		if (this.props.type === PathType.FILE) {
			const { refs, change } = this.props;
			return {
				title: "diff",
				command: "vscode.diff",
				arguments: getDiffUris(refs, change),
			};
		}
	}
}
