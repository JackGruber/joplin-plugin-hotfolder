import joplin from "api";
import * as chokidar from "chokidar";
import { filePattern } from "./filePattern";
import * as path from "path";
import * as fileType from "file-type";
import { helper } from "./helper";
import { hotfolderSettings, settings } from "./settings";

const fs = require("fs-extra");

let watchers = [];

export namespace hotfolder {
  export async function register() {
    const hotfolderAnz = await joplin.settings.value("hotfolderAnz");

    if (watchers.length > 0) {
      for (let watcher of watchers) {
        watcher.close().then(() => console.log("Hotfolder closed"));
      }
      watchers = [];
    }

    for (let hotfolderNr = 0; hotfolderNr < hotfolderAnz; hotfolderNr++) {
      let hotfolderPath = "";
      try {
        hotfolderPath = await joplin.settings.value(
          "hotfolderPath" + (hotfolderNr == 0 ? "" : hotfolderNr)
        );
      } catch (e) {}

      let hotfolderAction = await joplin.settings.value(
        "hotfolderAction" + (hotfolderNr == 0 ? "" : hotfolderNr)
      );

      if (hotfolderPath.trim() != "") {
        let hotfolderWatcher = chokidar
          .watch(hotfolderPath, {
            persistent: true,
            awaitWriteFinish: true,
            depth: 0,
            usePolling: false, // set true to successfully watch files over a network
          })
          .on("ready", function () {
            console.log("Newly watched hotfolder path:", this.getWatched());
          })
          .on("change", function (path) {
            if (hotfolderAction == "update") {
              console.log("File", path, "has been changed");
              hotfolder.processFile(
                path,
                hotfolderNr == 0 ? "" : hotfolderNr.toString()
              );
            }
          })
          .on("add", function (path) {
            console.log("File", path, "has been added");
            hotfolder.processFile(
              path,
              hotfolderNr == 0 ? "" : hotfolderNr.toString()
            );
          });
        watchers.push(hotfolderWatcher);
      }
    }
  }

  export async function processFile(file: string, hotfolderNr: string) {
    const hotfolderSettings: hotfolderSettings = await settings.getHotfolder(
      hotfolderNr
    );
    const fileName = path.basename(file);
    const ignoreFileUser = await filePattern.match(
      fileName,
      hotfolderSettings.ignoreFiles
    );
    const ignorePluginFiles = await filePattern.match(fileName, "*.jhf");

    if (ignoreFileUser === 0 && ignorePluginFiles === 0) {
      const fileExt = path.extname(file);
      let note = null;
      let jhf = {};
      let noteTitle = fileName.replace(fileExt, "");
      const importAsText = hotfolderSettings.extensionsAddAsText
        .toLowerCase()
        .split(/\s*,\s*/)
        .indexOf(fileExt);

      if (hotfolderSettings.action == "update") {
        if (importAsText !== -1) {
          console.info("Update note text");
          if (fs.existsSync(file + ".jhf")) {
            await hotfolder.updateText(file);
          } else {
            note = await hotfolder.importAsText(
              file,
              noteTitle,
              hotfolderSettings.notebookId
            );
            jhf["noteid"] = note.id;
            jhf["lastupdate"] = new Date().getTime();
            await hotfolder.writeJHF(file, jhf);
          }
        } else {
          console.info("Update resource in note");
        }
      } else if (hotfolderSettings.action == "import") {
        if (importAsText !== -1) {
          console.info("Import as Text");
          note = await hotfolder.importAsText(
            file,
            noteTitle,
            hotfolderSettings.notebookId
          );
        } else {
          console.info("Import as attachment");
          note = await hotfolder.importAsAttachment(
            file,
            noteTitle,
            hotfolderSettings.notebookId
          );
        }

        await helper.tagNote(note.id, hotfolderSettings.importTags);

        try {
          fs.removeSync(file);
        } catch (e) {
          console.error(e);
          return;
        }
      } else {
        console.log(
          "Hotfolder action: '" + hotfolderSettings.action + " not defined"
        );
        return;
      }
    } else {
      console.info(
        "File is ignored! ignoreFileUser: " +
          ignoreFileUser +
          " ignorePluginFiles: " +
          ignorePluginFiles
      );
    }
  }


  export async function fileModified(file: string, jhf: any): Promise<boolean>{
    let filestat = fs.statSync(file);
    if (
      jhf['lastupdate'] === undefined ||
      jhf['lastupdate'] < filestat.ctime.getTime()
    ) {
      return true;
    } else {
      return false;
    }
  }

  export async function updateText(file: string) {
    let info = null;
    let fileBuffer = null;

    if (fs.existsSync(file)) {
      info = await hotfolder.getJHF(file);
      if (info === null) return false;

      if (await hotfolder.fileModified(file, info) === true) {
        fileBuffer = await hotfolder.readContent(file);
        await joplin.data.put(["notes", info.noteid], null, {
          body: fileBuffer.toString(),
        });
        info["lastupdate"] = new Date().getTime();
        await hotfolder.writeJHF(file, info);
      } else {
        console.log("File not newer");
      }
    }
  }

  export async function writeJHF(file: string, data: any) {
    file = file + ".jhf";
    try {
      fs.writeFileSync(file, JSON.stringify(data, null, 4), "utf8");
    } catch (e) {
      console.error("Error on writeFileSync");
      console.error(e);
    }
  }

  export async function getJHF(file: string): Promise<JSON> {
    file = file + ".jhf";
    if (fs.existsSync(file)) {
      let data = null;
      try {
        data = fs.readFileSync(file, "utf8");
      } catch (e) {
        console.error("Error on readFileSync");
        console.error(e);
        return null;
      }

      try {
        let info = JSON.parse(data);
        info["error"] = ""; // Clear error msg
        return info;
      } catch (e) {
        console.error("Json parse error");
        console.error(e);
        return null;
      }
    } else {
      return null;
    }
  }

  export async function readContent(file: string): Promise<any> {
    try {
      return fs.readFileSync(file);
    } catch (e) {
      console.error("Error on readFileSync");
      console.error(e);
      return;
    }
  }

  export async function importAsText(
    file: string,
    noteTitle: string,
    folder: string
  ): Promise<any> {
    const fileBuffer = await hotfolder.readContent(file);
    return await joplin.data.post(["notes"], null, {
      body: fileBuffer.toString(),
      title: noteTitle,
      parent_id: folder,
    });
  }

  export async function importAsAttachment(
    file: string,
    noteTitle: string,
    noteFolder: string
  ): Promise<any> {
    const mimeType = await fileType.fromFile(file);
    const fileName = path.basename(file);

    let resource = await hotfolder.createResources(file, fileName);
    let newBody = null;
    if (resource.id) {
      newBody = "[" + fileName + "](:/" + resource.id + ")";
      if (mimeType !== undefined && mimeType.mime.split("/")[0] === "image") {
        newBody = "!" + newBody;
      }

      return await joplin.data.post(["notes"], null, {
        body: newBody,
        title: noteTitle,
        parent_id: noteFolder,
      });
    }
  }

  export async function createResources(
    file: string,
    fileName: string
  ): Promise<any> {
    try {
      return await joplin.data.post(["resources"], null, { title: fileName }, [
        {
          path: file,
        },
      ]);
    } catch (e) {
      console.error("Error on create resources");
      console.error(e);
      return null;
    }
  }
}
