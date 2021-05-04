import joplin from "api";
import * as chokidar from "chokidar";
import { filePattern } from "./filePattern";
import * as path from "path";
import * as fileType from "file-type";
import { helper } from "./helper";

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
    const ignoreFiles = await joplin.settings.value(
      "ignoreFiles" + hotfolderNr
    );
    const fileName = path.basename(file);
    let ignoreFileUser = await filePattern.match(fileName, ignoreFiles);

    if (ignoreFileUser === 0) {
      const extensionsAddAsText = await joplin.settings.value(
        "extensionsAddAsText" + hotfolderNr
      );

      const selectedFolder = await joplin.workspace.selectedFolder();
      const importNotebook = await joplin.settings.value(
        "importNotebook" + hotfolderNr
      );
      let notebookId = await helper.getNotebookId(importNotebook, false);
      if (notebookId == null) {
        notebookId = selectedFolder.id;
      }

      const importTags = await joplin.settings.value(
        "importTags" + hotfolderNr
      );
      let addTags = null;
      if (importTags.trim() !== "") {
        addTags = importTags.split(/\s*,\s*/);
      }

      const mimeType = await fileType.fromFile(file);
      const fileExt = path.extname(file);
      let newNote = null;
      let fileBuffer = null;
      let newResources = null;
      let newBody = null;
      let noteTitle = fileName.replace(fileExt, "");

      if (
        extensionsAddAsText
          .toLowerCase()
          .split(/\s*,\s*/)
          .indexOf(fileExt) !== -1
      ) {
        console.info("Import as Text");
        try {
          fileBuffer = fs.readFileSync(file);
        } catch (e) {
          console.error("Error on readFileSync");
          console.error(e);
          return;
        }
        newNote = await joplin.data.post(["notes"], null, {
          body: fileBuffer.toString(),
          title: noteTitle,
          parent_id: notebookId,
        });
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

          newNote = await joplin.data.post(["notes"], null, {
            body: newBody,
            title: noteTitle,
            parent_id: notebookId,
          });
        }
      }

      await helper.tagNote(newNote.id, addTags);

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
}