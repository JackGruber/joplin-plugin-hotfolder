import joplin from "api";
import * as chokidar from "chokidar";
import { filePattern } from "./filePattern";
import * as path from "path";
import * as fileType from "file-type";
import { helper } from "./helper";
import { settings } from "./settings";
import { I18n } from "i18n";
import hotfolderLogging from "electron-log";
import { hotfolderSettings, processFile } from "./type";

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

  private async logSettings() {
    this.log.verbose("Settings:");
    this.log.verbose("hotfolderAnz:" + this.hotfolderAnz);
    for (let hotfolderNr = 0; hotfolderNr < this.hotfolderAnz; hotfolderNr++) {
      this.log.verbose("=================");
      let hotfolderPath = "";
      try {
        hotfolderPath = await joplin.settings.value(
          "hotfolderPath" + (hotfolderNr == 0 ? "" : hotfolderNr)
        );
      } catch (e) {
        this.log.verbose(`Error on load hotfolderPath`);
      }

      this.log.verbose(`Hotfolder (${hotfolderNr}): ${hotfolderPath}`);
      const hotfolderSettings: hotfolderSettings = await settings.getHotfolder(
        hotfolderNr
      );
      for (const setting in hotfolderSettings) {
        this.log.verbose(setting + ": " + hotfolderSettings[setting]);
      }
    }
    this.log.verbose("=================");
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
    await settings.register(this.logFile);
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

  private async fileFinished(processFile: processFile) {
    this.log.verbose(`Check file finished: ${processFile.path}`);
    let stat = null;

    try {
      stat = await fs.statSync(processFile.path);
    } catch (e) {
      this.log.error(`Error for fs stats: ${processFile.path}`);
      this.log.error(e.message);
      return false;
    }

    if (processFile.prevStat != null) {
      if (
        stat.mtimeMs === processFile.prevStat.mtimeMs &&
        stat.blocks == processFile.prevStat.blocks &&
        stat.size == processFile.prevStat.size
      ) {
        this.log.verbose(`File "${processFile.path}" finished via stats`);
        processFile["prevStat"] = stat;
      } else {
        processFile["prevStat"] = stat;
        await this.setFileRecheck(processFile);
        return false;
      }
    } else {
      processFile["prevStat"] = stat;
      await this.setFileRecheck(processFile);
      return false;
    }

    try {
      const fsCheck = fs.openSync(processFile.path, "r+");
      fs.closeSync(fsCheck);
      this.log.info(`File "${processFile.path}" finished writing`);
      return true;
    } catch (e) {
      this.log.verbose(e.message);
    }

    await this.setFileRecheck(processFile);
    return false;
  }

  private async setFileRecheck(processFile: processFile) {
    this.log.verbose(
      `File "${processFile.path}" recheck in ${processFile.intervallFileFinished}`
    );
    setTimeout(
      this.processFile.bind(this),
      processFile.intervallFileFinished * 1000,
      processFile
    );
  }

  public async registerHotfolders() {
    await this.logSettings();

    this.log.verbose("Register Hotfolders");

    // Close already watched folders
    if (this.watchers.length > 0) {
      this.log.info("Close open watchers");
      for (let watcher of this.watchers) {
        await watcher.close().then(() => this.log.verbose("Hotfolder closed"));
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
        const hotfolderSettings: hotfolderSettings =
          await settings.getHotfolder(hotfolderNr);

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
              "msg.error.notebookNotExist",
              importNotebook.trim(),
              hotfolderNr == 0 ? "" : hotfolderNr + 1
            )
          );
        }

        this.log.verbose(
          `${hotfolderLogName}: Setup chokidar ${hotfolderPath}`
        );

        const watcher = chokidar.watch(hotfolderPath, {
          persistent: true,
          alwaysStat: true,
          depth: hotfolderSettings.depth,
          usePolling: hotfolderSettings.usePolling,
          interval: hotfolderSettings.pollingIntervall,
          binaryInterval: hotfolderSettings.pollingIntervall * 2,
        });
        this.log.verbose(
          `${hotfolderLogName}: usePolling: ${hotfolderSettings.usePolling}`
        );
        this.log.verbose(
          `${hotfolderLogName}: interval: ${hotfolderSettings.pollingIntervall}`
        );

        // ignoreInitial
        watcher
          .on("ready", async () => {
            this.log.info(
              `${hotfolderLogName}: Initial scan complete. Ready for changes`
            );
          })
          .on("change", async (path, stats) => {
            this.log.verbose(
              `${hotfolderLogName}: File ${path} (${stats.size}) has been changed`
            );
          })
          .on("unlink", async (path) => {
            this.log.verbose(
              `${hotfolderLogName}: File ${path} has been removed`
            );
          })
          .on("addDir", async (path) => {
            this.log.verbose(
              `${hotfolderLogName}: Directory ${path} has been added`
            );
          })
          .on("unlinkDir", async (path) => {
            this.log.verbose(
              `${hotfolderLogName}: Directory ${path} has been removed`
            );
          })
          .on("error", async (error) => {
            this.log.error(`${hotfolderLogName}: Watcher error: ${error}`);
          })
          .on("add", async (path, stats) => {
            this.log.info(
              `${hotfolderLogName}: File "${path}" (${stats.size}) has been added`
            );

            this.processFile({
              path: path,
              hotfolderNr: hotfolderNr,
              prevStat: null,
              intervallFileFinished: hotfolderSettings.intervallFileFinished,
            });
          });
        this.log.verbose(`${hotfolderLogName}: Add chokidar`);
        this.watchers.push(watcher);
      } else {
        this.log.info(`${hotfolderLogName}: No hotfolder path set`);
      }
    }
  }

  private async processFile(processFile: processFile) {
    const hotfolderSettings: hotfolderSettings = await settings.getHotfolder(
      processFile.hotfolderNr
    );

    if (!(await this.fileFinished(processFile))) {
      return;
    }

    this.log.verbose(
      `processFile (Hotfolder ${processFile.hotfolderNr}): ${processFile.path}`
    );

    const fileName = path.basename(processFile.path);
    const ignoreFileUser = await filePattern.match(
      fileName,
      hotfolderSettings.ignoreFiles
    );

    if (ignoreFileUser !== 0) {
      this.log.verbose(`File is ignored! ignoreFileUser: ${ignoreFileUser}`);
      return;
    }

    const fileExt = path.extname(processFile.path);
    let newNote = null;
    let noteTitle = fileName.replace(fileExt, "");

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
          processFile.hotfolderNr == 0 ? "" : processFile.hotfolderNr + 1
        )
      );
    }

    if (
      hotfolderSettings.extensionsAddAsText
        .split(/\s*,\s*/)
        .indexOf(fileExt) !== -1
    ) {
      newNote = await this.importAsText(
        processFile.path,
        noteTitle,
        hotfolderSettings.notebookId,
        hotfolderSettings.textAsTodo
      );
    } else {
      newNote = await this.importAsAttachment(
        processFile.path,
        noteTitle,
        hotfolderSettings.notebookId
      );
    }

    this.log.verbose(
      `tagNote: ${newNote.id} with ${hotfolderSettings.importTags}`
    );
    try {
      await helper.tagNote(newNote.id, hotfolderSettings.importTags);
    } catch (e) {
      this.log.error(e);
      return;
    }

    this.log.verbose(`Remove: ${processFile.path}`);
    try {
      fs.removeSync(processFile.path);
    } catch (e) {
      this.log.error(e);
      return;
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
