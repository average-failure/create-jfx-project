// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import * as fs from "fs-extra";

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  // The command has been defined in the package.json file
  // Now provide the implementation of the command with registerCommand
  // The commandId parameter must match the command field in package.json
  let disposable = vscode.commands.registerCommand(
    "create-jfx-project.createNew",
    async () => {
      const projectDir = await vscode.window.showOpenDialog({
        canSelectFolders: true,
        canSelectFiles: false,
        canSelectMany: false,
        openLabel: "Select project directory",
      });

      if (!projectDir || projectDir.length <= 0) {
        vscode.window.showErrorMessage("No project directory selected");
        return;
      }

      const projectName = await vscode.window.showInputBox({
        placeHolder: "Project name",
        prompt: "Enter the name of the project",
      });

      if (!projectName) {
        vscode.window.showErrorMessage("No project name provided");
        return;
      }

      const projectDirUri = projectDir[0];

      const projectPath = vscode.Uri.joinPath(projectDirUri, projectName);
      await vscode.workspace.fs.createDirectory(projectPath);

      await createDirs(projectPath);
      await copySDK(projectPath);
      await writeFiles(projectPath);

      await vscode.commands.executeCommand(
        "vscode.openFolder",
        projectPath,
        true
      );

      // Display a message box to the user
      vscode.window.showInformationMessage(
        `Created new JavaFX project '${projectName}'`
      );
    }
  );

  context.subscriptions.push(disposable);
}

async function copySDK(projectPath: vscode.Uri) {
  const jfxPath = await vscode.window.showOpenDialog({
    canSelectFolders: true,
    canSelectFiles: false,
    canSelectMany: false,
    openLabel: "Select JavaFX SDK folder",
  });

  if (!jfxPath || jfxPath.length <= 0) {
    vscode.window.showErrorMessage("No JavaFX SDK folder selected");
    return;
  }

  console.info("Copying folder from ", jfxPath[0].fsPath);
  await fs.copy(
    jfxPath[0].fsPath,
    vscode.Uri.joinPath(projectPath, "lib", "jfx-sdk").fsPath
  );
}

async function createDirs(projectPath: vscode.Uri) {
  const createDir = (...segments: string[]): Thenable<void> => {
    const dirUri = vscode.Uri.joinPath(projectPath, ...segments);
    console.info("Creating directory ", dirUri.fsPath);
    return vscode.workspace.fs.createDirectory(dirUri);
  };

  await createDir();

  for (const dir of [".vscode", "src", "bin", "lib"]) {
    await createDir(dir);
  }

  await createDir(
    "src",
    projectPath.fsPath.split("/").at(-1)?.replaceAll("-", "") as string
  );
  await createDir("src", "assets");
}

async function writeFiles(projectPath: vscode.Uri) {
  const encoder = new TextEncoder();
  const writeFile = (
    content: string,
    ...segments: string[]
  ): Thenable<void> => {
    const fileUri = vscode.Uri.joinPath(projectPath, ...segments);
    console.info("Creating file ", fileUri.fsPath);
    return vscode.workspace.fs.writeFile(fileUri, encoder.encode(content));
  };

  await writeFile(
    JSON.stringify({
      version: "0.2.0",
      configurations: [
        {
          type: "java",
          name: "Current File",
          request: "launch",
          mainClass: "${file}",
          vmArgs:
            "--module-path lib/jfx-sdk/lib --add-modules=javafx.controls,javafx.fxml",
        },
      ],
    }),
    ".vscode",
    "launch.json"
  );

  await writeFile(
    JSON.stringify({
      "java.project.sourcePaths": ["src"],
      "java.project.outputPath": "bin",
      "java.project.referencedLibraries": ["lib/**/*.jar"],
    }),
    ".vscode",
    "settings.json"
  );

  await writeFile(
    `
package ${projectPath.fsPath.split("/").at(-1)?.replaceAll("-", "")};

import javafx.application.Application;
import javafx.scene.Scene;
import javafx.scene.layout.GridPane;
import javafx.scene.text.Text;
import javafx.stage.Stage;

public class App extends Application {
    public static void main(String[] args) {
        launch(args);

        /*
          * Attach source to project via:
          *     1. alt+click on javafx class
          *     2. right click
          *     3. click attach source
          *     4. select lib/jfx-sdk/src.zip
        */
    }

    @Override
    public void start(Stage primaryStage) throws Exception {
        GridPane root = new GridPane();
        Scene scene = new Scene(root, 600, 800);

        Text text = new Text("Hello World from JavaFX!");
        root.getChildren().add(text);

        primaryStage.setScene(scene);
        primaryStage.show();
    }
}
    `,
    "src",
    projectPath.fsPath.split("/").at(-1)?.replaceAll("-", "") as string,
    "App.java"
  );

  await writeFile(
    `
## Getting Started

Welcome to the VS Code Java world. Here is a guideline to help you get started to write Java code in Visual Studio Code.

## Folder Structure

The workspace contains two folders by default, where:

- \`src\`: the folder to maintain sources
- \`lib\`: the folder to maintain dependencies

Meanwhile, the compiled output files will be generated in the \`bin\` folder by default.

> If you want to customize the folder structure, open \`.vscode/settings.json\` and update the related settings there.

## Dependency Management

The \`JAVA PROJECTS\` view allows you to manage your dependencies. More details can be found [here](https://github.com/microsoft/vscode-java-dependency#manage-dependencies).
`,
    "README.md"
  );
}

// This method is called when your extension is deactivated
export function deactivate() {}
