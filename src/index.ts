import joplin from "api";
import filePattern from "./filePattern";
import settings from "./settings";

const chokidar = require("chokidar");
const fs = require("fs-extra");
const fileType = require("file-type");
const path = require("path");
let watchers = [];

joplin.plugins.register({
  onStart: async function () {
    console.info("Hotfolder plugin started!");

    joplin.settings.onChange(async (event: any) => {
      console.log("Settings changed");
      await registerHotfolder();
    });

    await settings.registerHotfolderSettings();
    await registerHotfolder();

    async function processFile(file: string, hotfolderNr: string) {
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
        let notebookId = await getNotebookId(importNotebook, false);
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
          newResources = await createResources(file, fileName);
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

        await tagNote(newNote.id, addTags);

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

    async function createResources(
      file: string,
      fileName: string
    ): Promise<string> {
      try {
        let newResources = await joplin.data.post(
          ["resources"],
          null,
          { title: fileName },
          [
            {
              path: file,
            },
          ]
        );
        return newResources;
      } catch (e) {
        console.error("Error on create resources");
        console.error(e);
        return null;
      }
    }

    async function tagNote(noteId: string, addTags: Array<string>) {
      if (addTags != null) {
        for (let tag of addTags) {
          let tagId = await getTagId(tag);
          if (tagId != null) {
            try {
              await joplin.data.post(["tags", tagId, "notes"], null, {
                id: noteId,
              });
            } catch (e) {
              console.error("note tagging error");
              console.error(e);
            }
          }
        }
      }
    }

    async function getTagId(tag: string): Promise<string> {
      tag = tag.trim();
      var query = await joplin.data.get(["search"], {
        query: tag,
        type: "tag",
        fields: "id,title",
      });
      if (query.items.length === 0) {
        console.log("Create tag '" + tag + "'");
        const newTag = await joplin.data.post(["tags"], null, {
          title: tag,
        });
        return newTag.id;
      } else if (query.items.length === 1) {
        return query.items[0].id;
      } else {
        console.error("More than one tag match!");
        console.error(query);
        return null;
      }
    }

    // Get NotebookID
    // notebookName = Notebookname / Notebookpath
    // parent_id = parent NotebookId, empty string = Toplevel Notebook, false = search Notebook from Path
    async function getNotebookId(
      notebookName: string,
      parent_id: any
    ): Promise<string> {
      if (parent_id !== false) {
        let pageNum = 1;
        do {
          var folders = await joplin.data.get(["folders"], {
            fields: "id,title,parent_id",
            limit: 50,
            page: pageNum++,
          });
          for (const folder of folders.items) {
            if (notebookName == folder.title && parent_id == folder.parent_id) {
              return folder.id;
            }
          }
        } while (folders.has_more);
      } else {
        if (notebookName.indexOf("\\") !== -1) {
          const notebookPath = notebookName.split("\\");
          let notebookId = "";
          for (let subNotebook of notebookPath) {
            notebookId = await getNotebookId(subNotebook, notebookId);
          }
          return notebookId;
        } else {
          return getNotebookId(notebookName, "");
        }
      }

      return null;
    }

    async function registerHotfolder() {
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
              processFile(path, hotfolderNr == 0 ? "" : hotfolderNr.toString());
            });
          watchers.push(hotfolderWatcher);
        }
      }
    }
  },
});
