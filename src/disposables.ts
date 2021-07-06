import { commands, window, workspace } from "vscode";
import type { ViewController } from "./views/controller";
import { VersionedFileProvider } from "./providers/versioned-file";
import { container } from "./container/inversify.config";

export function createDisposables(viewController: ViewController) {
	return [
		commands.registerCommand("git-view.view", async () => {
			viewController.createWebviewPanel();
		}),
		commands.registerCommand("git-view.quit", () => {
			window.showInformationMessage("Quit");
		}),
		workspace.registerTextDocumentContentProvider(
			VersionedFileProvider.scheme,
			container.get(VersionedFileProvider)
		),
	];
}
