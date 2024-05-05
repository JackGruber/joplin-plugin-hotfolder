import joplin from "api";
import * as chokidar from "chokidar";
import { filePattern } from "./filePattern";
import * as path from "path";
import * as fileType from "file-type";
import { helper } from "./helper";
import { hotfolderSettings, settings } from "./settings";
import { I18n } from "i18n";
import hotfolderLogging from "electron-log";

const fs = require("fs-extra");

let i18n: any;

class Hotfolder {
  private log: any;
  private logFile: any;
  private hotfolderAnz: number;
  private watchers = [];
  private dialogBox = null;

  constructor() {
    this.log = hotfolderLogging;
    this.setupLog();
  }

  public async init() {
    this.log.verbose("Hotfolder Plugin init");

    const installationDir = await joplin.plugins.installationDir();
    this.logFile = path.join(installationDir, "hotfolder.log");

    await this.confLocale(path.join(installationDir, "locales"));
    await this.registerSettings();
    this.dialogBox = await joplin.views.dialogs.create("hotfolderDialog");

    await this.deleteLogFile();
    await this.fileLogging(true);
    await this.registerHotfolders();
  }

  private async setupLog() {
    const logFormat = "[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}] {text}";
    this.log.transports.file.level = false;
    this.log.transports.file.format = logFormat;
    this.log.transports.console.level = "verbose";
    this.log.transports.console.format = logFormat;
  }

  private async fileLogging(enable: boolean) {
    const fileLogLevel = await joplin.settings.value("fileLogLevel");

    if (enable === true && fileLogLevel !== "false") {
      this.log.transports.file.resolvePath = () => this.logFile;
      this.log.transports.file.level = fileLogLevel;
    } else {
      this.log.transports.file.level = false;
    }
  }

  private async deleteLogFile() {
    this.log.verbose("Delete log file");
    if (fs.existsSync(this.logFile)) {
      try {
        await fs.unlinkSync(this.logFile);
      } catch (e) {
        this.log.error("deleteLogFile: " + e.message);
      }
    }
  }

  private async confLocale(localesDir: string) {
    this.log.verbose("Conf translation");
    const joplinLocale = await joplin.settings.globalValue("locale");
    i18n = new I18n({
      locales: ["en_US", "de_DE"],
      defaultLocale: "en_US",
      fallbacks: { "en_*": "en_US" },
      updateFiles: false,
      retryInDefaultLocale: true,
      syncFiles: false,
      directory: localesDir,
      objectNotation: true,
    });
    i18n.setLocale(joplinLocale);
    this.log.verbose("localesDir: " + localesDir);
    this.log.verbose("JoplinLocale: " + joplinLocale);
    this.log.verbose("i18nLocale: " + i18n.getLocale());
  }

  private async registerSettings() {
    await settings.register();
    await this.loadSettings();
  }

  public async loadSettings() {
    this.log.verbose("loadSettings");

    this.hotfolderAnz = await joplin.settings.value("hotfolderAnz");
  }

  private async showMsg(msg: string, title: string = null) {
    const html = [];

    html.push(`<h3>Hotfolder plugin</h3>`);
    if (title) {
      html.push(`<p>${title}</p>`);
    }
    html.push(`<div id="msg">${msg}`);
    html.push("</div>");
    this.log.verbose(`showMsg (${title}): ${msg}`);
    await joplin.views.dialogs.setButtons(this.dialogBox, [{ id: "ok" }]);
    await joplin.views.dialogs.setHtml(this.dialogBox, html.join("\n"));
    await joplin.views.dialogs.open(this.dialogBox);
  }

  public async registerHotfolders() {
    this.log.verbose("Register Hotfolders");

    // Close already watched folders
    if (this.watchers.length > 0) {
      this.log.info("Close open watchers");
      for (let watcher of this.watchers) {
        watcher.close().then(() => this.log.verbose("Hotfolder closed"));
      }
      this.watchers = [];
    }

    // Register hotfolders
    for (let hotfolderNr = 0; hotfolderNr < this.hotfolderAnz; hotfolderNr++) {
      let hotfolderPath = "";
      let hotfolderLogName = `Hotfolder (${hotfolderNr})`;

      this.log.info(`Register ${hotfolderLogName}`);
      try {
        hotfolderPath = await joplin.settings.value(
          "hotfolderPath" + (hotfolderNr == 0 ? "" : hotfolderNr)
        );
      } catch (e) {
        this.log.verbose(`${hotfolderLogName}: No hotfolder path set`);
      }

      if (hotfolderPath.trim() != "") {
        const importNotebook = await joplin.settings.value(
          "importNotebook" + (hotfolderNr == 0 ? "" : hotfolderNr)
        );
        this.log.verbose("Notebook: " + importNotebook);

        // Check notebook for import exists
        if (
          importNotebook.trim() !== "" &&
          (await helper.checkNotebookExist(importNotebook.trim())) === false
        ) {
          this.log.error("Notebook: " + importNotebook + " dose not exist");
          await this.showMsg(
            i18n.__(
              "error.notebookNotExist",
              importNotebook.trim(),
              hotfolderNr == 0 ? "" : hotfolderNr + 1
            )
          );
        }

        this.log.verbose(`${hotfolderLogName}: Setup chokidar`);

        var watcher = chokidar.watch(hotfolderPath, {
          persistent: true,
          awaitWriteFinish: true,
          depth: 0,
          usePolling: false,
        });

        watcher
          .on("ready", async () => {
            this.log.info(
              `${hotfolderLogName}: Initial scan complete. Ready for changes`
            );
          })
          .on("change", async (path) => {
            this.log.debug(
              `${hotfolderLogName}: File ${path} has been changed`
            );
          })
          .on("unlink", async (path) => {
            this.log.debug(
              `${hotfolderLogName}: File ${path} has been removed`
            );
          })
          .on("addDir", async (path) => {
            this.log.debug(
              `${hotfolderLogName}: Directory ${path} has been added`
            );
          })
          .on("unlinkDir", async (path) => {
            this.log.debug(
              `${hotfolderLogName}: Directory ${path} has been added`
            );
          })
          .on("error", async (error) => {
            this.log.error(`${hotfolderLogName}: Watcher error: ${error}`);
          })
          .on("raw", async (event, path, details) => {
            // internal
            this.log.debug(
              `${hotfolderLogName}: Raw event info ${event} ${path} ${details}`
            );
          })
          .on("add", async (path) => {
            this.log.info(`${hotfolderLogName}: File "${path}" has been added`);
            this.processFile(
              path,
              hotfolderNr == 0 ? "" : hotfolderNr.toString()
            );
          });
        this.log.verbose(`${hotfolderLogName}: Add chokidar`);
        this.watchers.push(watcher);
      }
    }
  }

  private async processFile(file: string, hotfolderNr: string) {
    this.log.verbose(`processFile (Hotfolder ${hotfolderNr}): ${file}`);
    const hotfolderSettings: hotfolderSettings = await settings.getHotfolder(
      hotfolderNr
    );
    const fileName = path.basename(file);
    const ignoreFileUser = await filePattern.match(
      fileName,
      hotfolderSettings.ignoreFiles
    );

    if (ignoreFileUser === 0) {
      const fileExt = path.extname(file);
      let newNote = null;
      let noteTitle = fileName.replace(fileExt, "");

      this.log.verbose(hotfolderSettings.notebookId);

      if (
        hotfolderSettings.importNotebook.trim() !== "" &&
        (await helper.checkNotebookExist(
          hotfolderSettings.importNotebook.trim()
        )) === false
      ) {
        this.showMsg(
          i18n.__(
            "msg.error.notebookNotExist",
            hotfolderSettings.importNotebook.trim(),
            parseInt(hotfolderNr) == 0 ? "" : parseInt(hotfolderNr) + 1
          )
        );
      }

      if (
        hotfolderSettings.extensionsAddAsText
          .split(/\s*,\s*/)
          .indexOf(fileExt) !== -1
      ) {
        this.log.verbose("Import as Text");
        newNote = await this.importAsText(
          file,
          noteTitle,
          hotfolderSettings.notebookId,
          hotfolderSettings.textAsTodo
        );
      } else {
        this.log.verbose("Import as attachment");
        newNote = await this.importAsAttachment(
          file,
          noteTitle,
          hotfolderSettings.notebookId
        );
      }

      await helper.tagNote(newNote.id, hotfolderSettings.importTags);

      try {
        fs.removeSync(file);
      } catch (e) {
        this.log.error(e);
        return;
      }
    } else {
      this.log.verbose(`File is ignored! ignoreFileUser: ${ignoreFileUser}`);
    }
  }

  private async importAsText(
    file: string,
    noteTitle: string,
    folder: string,
    todo: boolean
  ): Promise<any> {
    this.log.verbose("importAsText");
    let fileBuffer = null;
    try {
      fileBuffer = fs.readFileSync(file);
    } catch (e) {
      this.log.error("Error on readFileSync");
      this.log.error(e);
      return;
    }
    return await joplin.data.post(["notes"], null, {
      body: fileBuffer.toString(),
      title: noteTitle,
      parent_id: folder,
      is_todo: todo ? 1 : 0,
    });
  }

  private async importAsAttachment(
    file: string,
    noteTitle: string,
    noteFolder: string
  ): Promise<any> {
    this.log.verbose("importAsAttachment");
    const mimeType = await fileType.fromFile(file);
    const fileName = path.basename(file);

    let resource = await this.createResources(file, fileName);
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

  private async createResources(file: string, fileName: string): Promise<any> {
    this.log.verbose("createResources");
    try {
      return await joplin.data.post(["resources"], null, { title: fileName }, [
        {
          path: file,
        },
      ]);
    } catch (e) {
      this.log.error("Error on create resources");
      this.log.error(e);
      return null;
    }
  }
}

export { Hotfolder, i18n };
