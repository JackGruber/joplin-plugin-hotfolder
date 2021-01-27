import joplin from "api";
import { SettingItemType } from "api/types";

const chokidar = require("chokidar");
const fs = require("fs-extra");
const fileType = require("file-type");
const path = require("path");

joplin.plugins.register({
  onStart: async function () {
    console.info("Hotfolder plugin started!");

    await joplin.settings.registerSection("hotfolderSection", {
      label: "Hotfolder",
      iconName: "fas fa-eye",
    });

    await joplin.settings.registerSetting("hotfolderPath", {
      value: "",
      type: SettingItemType.String,
      section: "hotfolderSection",
      public: true,
      label: "Hotfolder Path",
      description: "Please restart Joplin after a change."
    });

    await joplin.settings.registerSetting("extensionsAddAsText", {
      value: ".txt, .md",
      type: SettingItemType.String,
      section: "hotfolderSection",
      public: true,
      label: "Add as text",
      description: "Comma separated list of file extensions, which will be imported as text."
    });

    await joplin.settings.registerSetting("importNotebook", {
      value: "",
      type: SettingItemType.String,
      section: "hotfolderSection",
      public: true,
      label: "Notebook",
      description: "If no notebook is specified, the import is made to the current notebook.",
    });

    await joplin.settings.registerSetting("importTags", {
      value: "",
      type: SettingItemType.String,
      section: "hotfolderSection",
      public: true,
      label: "Tags",
      description: "Comma separated list of tags to be added to the note.",
    });

    await registerHotfolder();

    async function processFile(file: string) {
      console.log("File", file, "has been added");

      if (!fs.existsSync(file + ".lock")) {
        const extensionsAddAsText = await joplin.settings.value(
          "extensionsAddAsText"
        );
        
        const selectedFolder = await joplin.workspace.selectedFolder();
        const importNotebook = await joplin.settings.value("importNotebook");
        let notebookId = await getNotebookId(importNotebook);
        if (notebookId == null){
          notebookId = selectedFolder.id;
        }

        const importTags = await joplin.settings.value("importTags");
        let addTags = null;
        if(importTags.trim() !== ""){
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
          extensionsAddAsText.toLowerCase().split(/\s*,\s*/).indexOf(fileExt) !== -1
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
          if (mimeType !== undefined && mimeType.mime.split("/")[0] === "image") {
            newBody = "!" + newBody;
          }

          newNote = await joplin.data.post(["notes"], null, {
            body: newBody,
            title: fileName,
            parent_id: notebookId,
          });
        }

        // Tag Note
        if(addTags != null){
          for (let tag of addTags){
            let tagId = await getTagId(tag);
            await joplin.data.post(
              ["tags", tagId, "notes"],
              null,
              { id: newNote.id }
            );
          }
        }

        try {
          fs.removeSync(file);
        } catch (e) {
          console.error(e);
          return;
        }
      }
    }

    async function getTagId(tag: string): Promise<string> {
      var query = await joplin.data.get(["search"], {
        query: tag,
        type: "tag",
        fields: "id,title",
      });
      if(query.items.length === 0){
        console.log("Create tag '" + tag + "'");
        const newTag = await joplin.data.post(["tags"], null, {
          title: tag
        });
        return newTag.id;
      } else if(query.items.length === 1){
        return query.items[0].id;
      } else {
        console.error("More than one tag match!");
        console.error(query);
      }
    }

    async function getNotebookId(notebookName: string): Promise<string> {
      let pageNum = 1;
      do {
        var folders = await joplin.data.get(["folders"], {
          fields: "id,title",
          limit: 50,
          page: pageNum++,
        });
        for (const folder of folders.items) {
          if (notebookName == folder.title) {
            return folder.id
          }
        }
      } while (folders.has_more);
      return null;
    }

    async function registerHotfolder() {
      const hotfolderPath = await joplin.settings.value("hotfolderPath");
      if (hotfolderPath !== "") {
        const watcher = chokidar
          .watch(hotfolderPath, {
            ignored: /(^|[\/\\])\..|\.lock$/, // ignore dotfiles and *.lock
            persistent: true,
            awaitWriteFinish: true,
            depth: 0,
            usePolling: false, // set true to successfully watch files over a network
          })
          .on("add", function (path) {
            processFile(path);
          });

        var watchedPaths = watcher.getWatched();
      }
    }
  },
});
