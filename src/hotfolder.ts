import joplin from "api";
import * as chokidar from "chokidar";
import { filePattern } from "./filePattern";
import * as path from "path";
import * as fileType from "file-type";
import { helper } from "./helper";
import { hotfolderSettings, settings } from "./settings";

const fs = require("fs-extra")

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
          .on("add", function (path) {
            console.log("File", path, "has been added");
            hotfolder.processFile(path, hotfolderNr == 0 ? "" : hotfolderNr.toString());
          });
        watchers.push(hotfolderWatcher);
      }
    }
  }

  export async function processFile(file: string, hotfolderNr: string) {
    const hotfolderSettings: hotfolderSettings = await settings.getHotfolder(hotfolderNr);
    const fileName = path.basename(file);
    const ignoreFileUser = await filePattern.match(fileName, hotfolderSettings.ignoreFiles);

    if (ignoreFileUser === 0) {
      const mimeType = await fileType.fromFile(file);
      const fileExt = path.extname(file);
      let newNote = null;
      let newResources = null;
      let newBody = null;
      let noteTitle = fileName.replace(fileExt, "");

      if (
        hotfolderSettings.extensionsAddAsText
          .toLowerCase()
          .split(/\s*,\s*/)
          .indexOf(fileExt) !== -1
      ) {
        console.info("Import as Text");
        newNote = hotfolder.importAsText(file, noteTitle, hotfolderSettings.notebookId);
      } else {
        console.info("Import as attachment");
        newResources = await helper.createResources(file, fileName);
        if (newResources) {
          newBody = "[" + fileName + "](:/" + newResources.id + ")";
          if (
            mimeType !== undefined &&
            mimeType.mime.split("/")[0] === "image"
          ) {
            newBody = "!" + newBody;
          }

      await helper.tagNote(newNote.id, hotfolderSettings.importTags);

      try {
        fs.removeSync(file);
      } catch (e) {
        console.error(e);
        return;
      }
    } else {
      console.info("File is ignored! ignoreFileUser: " + ignoreFileUser);
    }
  }

  export async function importAsText(file: string, noteTitle: string, folder: string): Promise<any> {
    let fileBuffer = null; 
    try {
      fileBuffer = fs.readFileSync(file);
    } catch (e) {
      console.error("Error on readFileSync");
      console.error(e);
      return;
    }
    return await joplin.data.post(["notes"], null, {
      body: fileBuffer.toString(),
      title: noteTitle,
      parent_id: folder,
    });
  }
}
  export async function createResources(
    file: string,
    fileName: string
  ): Promise<any> {
    try {
      return await joplin.data.post(
        ["resources"],
        null,
        { title: fileName },
        [
          {
            path: file,
          },
        ]
      );
    } catch (e) {
      console.error("Error on create resources");
      console.error(e);
      return null;
    }
  }
