import joplin from "api";
import { SettingItemType } from "api/types";

const chokidar = require("chokidar");
const fs = require("fs-extra");
const fileType = require("file-type");
const path = require("path");
let watchers = [];

joplin.plugins.register({
  onStart: async function () {
    console.info("Hotfolder plugin started!");

    async function registerHotfolderSettings() {
      let hotfolderNr = 0;
      do {
        await joplin.settings.registerSection(
          "hotfolderSection" + (hotfolderNr == 0 ? "" : hotfolderNr),
          {
            label:
              "Hotfolder" +
              (hotfolderNr == 0 ? "" : " " + (hotfolderNr + 1).toString()),
            iconName: "fas fa-eye",
          }
        );

        await joplin.settings.registerSetting(
          "hotfolderPath" + (hotfolderNr == 0 ? "" : hotfolderNr),
          {
            value: "",
            type: SettingItemType.String,
            section: "hotfolderSection" + (hotfolderNr == 0 ? "" : hotfolderNr),
            public: true,
            label: "Hotfolder Path",
          }
        );

        await joplin.settings.registerSetting(
          "ignoreFiles" + (hotfolderNr == 0 ? "" : hotfolderNr),
          {
            value: "",
            type: SettingItemType.String,
            section: "hotfolderSection" + (hotfolderNr == 0 ? "" : hotfolderNr),
            public: true,
            label: "Ignore Files",
            description: "Comma separated list of files which will be ignored.",
          }
        );

        await joplin.settings.registerSetting(
          "extensionsAddAsText" + (hotfolderNr == 0 ? "" : hotfolderNr),
          {
            value: ".txt, .md",
            type: SettingItemType.String,
            section: "hotfolderSection" + (hotfolderNr == 0 ? "" : hotfolderNr),
            public: true,
            label: "Add as text",
            description:
              "Comma separated list of file extensions, which will be imported as text.",
          }
        );

        await joplin.settings.registerSetting(
          "importNotebook" + (hotfolderNr == 0 ? "" : hotfolderNr),
          {
            value: "",
            type: SettingItemType.String,
            section: "hotfolderSection" + (hotfolderNr == 0 ? "" : hotfolderNr),
            public: true,
            label: "Notebook",
            description:
              "If no notebook is specified, the import is made to the current notebook.",
          }
        );

        await joplin.settings.registerSetting(
          "importTags" + (hotfolderNr == 0 ? "" : hotfolderNr),
          {
            value: "",
            type: SettingItemType.String,
            section: "hotfolderSection" + (hotfolderNr == 0 ? "" : hotfolderNr),
            public: true,
            label: "Tags",
            description:
              "Comma separated list of tags to be added to the note.",
          }
        );

        if (hotfolderNr === 0) {
          await joplin.settings.registerSetting("hotfolderAnz", {
            value: 1,
            minimum: 1,
            maximum: 10,
            type: SettingItemType.Int,
            section: "hotfolderSection",
            public: true,
            label: "Numer of Hotfolders",
            description:
              "Sections appear on the left (Please restart Joplin after a change).",
          });
        }
        hotfolderNr++;
      } while (hotfolderNr < (await joplin.settings.value("hotfolderAnz")));
    }

    joplin.settings.onChange(async (event: any) => {
      console.log("Settings changed");
      await registerHotfolder();
    });

    await registerHotfolderSettings();
    await registerHotfolder();

    async function processFile(file: string, hotfolderNr: string) {
      const ignoreFiles = await joplin.settings.value(
        "ignoreFiles" + hotfolderNr
      );

      if (
        !fs.existsSync(file + ".lock") &&
        ignoreFiles.split(/\s*,\s*/).indexOf(path.basename(file)) === -1
      ) {
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
        const fileName = path.basename(file);
        let newNote = null;
        let fileBuffer = null;
        let newResources = null;
        let newBody = null;

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
            title: fileName,
            parent_id: notebookId,
          });
        } else {
          console.info("Import as attachment");
          try {
            newResources = await joplin.data.post(
              ["resources"],
              null,
              { title: fileName },
              [
                {
                  path: file, // Actual file
                },
              ]
            );
          } catch (e) {
            console.error("Error on create resources");
            console.error(e);
            return;
          }
          newBody = "[" + fileName + "](:/" + newResources.id + ")";
          if (
            mimeType !== undefined &&
            mimeType.mime.split("/")[0] === "image"
          ) {
            newBody = "!" + newBody;
          }

          newNote = await joplin.data.post(["notes"], null, {
            body: newBody,
            title: fileName,
            parent_id: notebookId,
          });
        }

        // Tag Note
        if (addTags != null) {
          for (let tag of addTags) {
            let tagId = await getTagId(tag);
            if(tagId != null) {
              try {
                await joplin.data.post(["tags", tagId, "notes"], null, {
                  id: newNote.id,
                });
              } catch (e) {
                console.error("note tagging error");
                console.error(e);
              }
            }
          }
        }

        try {
          fs.removeSync(file);
        } catch (e) {
          console.error(e);
          return;
        }
      } else {
        console.info("File is ignored!");
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
