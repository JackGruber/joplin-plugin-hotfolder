import joplin from "api";
import * as chokidar from "chokidar";
import { filePattern } from "./filePattern";
import * as path from "path";
import * as fileType from "file-type";
import { helper } from "./helper";
import { hotfolderSettings, settings } from "./settings";
import { I18n } from "i18n";

let i18n: any;
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
            hotfolder.processFile(
              path,
              hotfolderNr == 0 ? "" : hotfolderNr.toString()
            );
          });
        watchers.push(hotfolderWatcher);
      }
    }
  }

  export async function confLocale() {
    const installationDir = await joplin.plugins.installationDir();
    const localesDir = path.join(installationDir, "locales");
    const joplinLocale = await joplin.settings.globalValue("locale");
    console.log(localesDir);
    console.log(joplinLocale);
    i18n = new I18n({
      locales: ["en_US", "de_DE"],
      defaultLocale: "en_US",
      fallbacks: { "en_*": "en_US" },
      updateFiles: false,
      retryInDefaultLocale: true,
      syncFiles: true,
      directory: localesDir,
    });
    i18n.setLocale(joplinLocale);
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

    if (ignoreFileUser === 0) {
      const mimeType = await fileType.fromFile(file);
      const fileExt = path.extname(file);
      let newNote = null;
      let newResources = null;
      let newBody = null;
      let noteTitle = fileName.replace(fileExt, "");

      if (
        hotfolderSettings.extensionsAddAsText
          .split(/\s*,\s*/)
          .indexOf(fileExt) !== -1
      ) {
        console.info("Import as Text");
        newNote = await hotfolder.importAsText(
          file,
          noteTitle,
          hotfolderSettings.notebookId,
          hotfolderSettings.textAsTodo
        );
      } else {
        console.info("Import as attachment");
        newNote = await hotfolder.importAsAttachment(
          file,
          noteTitle,
          hotfolderSettings.notebookId
        );
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

  export async function importAsText(
    file: string,
    noteTitle: string,
    folder: string,
    todo: boolean
  ): Promise<any> {
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
      is_todo: todo ? 1 : 0,
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

export { i18n };
