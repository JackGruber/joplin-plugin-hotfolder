import joplin from "api";
import { SettingItem, SettingItemType, SettingItemSubType } from "api/types";
import { helper } from "./helper";
import { i18n } from "./hotfolder";
import { hotfolderSettings } from "./type";

export namespace settings {
  export async function register() {
    let hotfolderNr = 0;
    const settingsObject: Record<string, SettingItem> = {};
    const joplinVersionInfo = await helper.joplinVersionInfo();

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

      settingsObject["hotfolderPath" + (hotfolderNr == 0 ? "" : hotfolderNr)] =
        {
          value: "",
          type: SettingItemType.String,
          section: "hotfolderSection" + (hotfolderNr == 0 ? "" : hotfolderNr),
          public: true,
          label: i18n.__("settings.hotfolderPath.label"),
          description: i18n.__("settings.hotfolderPath.description"),
        };
      // Add DirectoryPath selector for newer Joplin versions
      if (
        joplinVersionInfo !== null &&
        (await helper.versionCompare(joplinVersionInfo.version, "2.10.4")) >= 0
      ) {
        settingsObject["hotfolderPath" + (hotfolderNr == 0 ? "" : hotfolderNr)][
          "subType"
        ] = SettingItemSubType.DirectoryPath;
      }

      settingsObject["ignoreFiles" + (hotfolderNr == 0 ? "" : hotfolderNr)] = {
        value: ".*",
        type: SettingItemType.String,
        section: "hotfolderSection" + (hotfolderNr == 0 ? "" : hotfolderNr),
        public: true,
        label: i18n.__("settings.ignoreFiles.label"),
        description: i18n.__("settings.ignoreFiles.description"),
      };

      settingsObject[
        "extensionsAddAsText" + (hotfolderNr == 0 ? "" : hotfolderNr)
      ] = {
        value: ".txt, .md",
        type: SettingItemType.String,
        section: "hotfolderSection" + (hotfolderNr == 0 ? "" : hotfolderNr),
        public: true,
        label: i18n.__("settings.extensionsAddAsText.label"),
        description: i18n.__("settings.extensionsAddAsText.description"),
      };

      settingsObject[
        "extensionsAddTextAsTodo" + (hotfolderNr == 0 ? "" : hotfolderNr)
      ] = {
        value: false,
        type: SettingItemType.Bool,
        section: "hotfolderSection" + (hotfolderNr == 0 ? "" : hotfolderNr),
        public: true,
        label: i18n.__("settings.extensionsAddTextAsTodo.label"),
        description: i18n.__("settings.extensionsAddTextAsTodo.description"),
      };

      settingsObject["importNotebook" + (hotfolderNr == 0 ? "" : hotfolderNr)] =
        {
          value: "",
          type: SettingItemType.String,
          section: "hotfolderSection" + (hotfolderNr == 0 ? "" : hotfolderNr),
          public: true,
          label: i18n.__("settings.importNotebook.label"),
          description: i18n.__("settings.importNotebook.description"),
        };

      settingsObject["importTags" + (hotfolderNr == 0 ? "" : hotfolderNr)] = {
        value: "",
        type: SettingItemType.String,
        section: "hotfolderSection" + (hotfolderNr == 0 ? "" : hotfolderNr),
        public: true,
        label: i18n.__("settings.importTags.label"),
        description: i18n.__("settings.importTags.description"),
      };

      settingsObject[
        "intervallFileFinished" + (hotfolderNr == 0 ? "" : hotfolderNr)
      ] = {
        value: 0,
        minimum: 0,
        maximum: 100,
        type: SettingItemType.Int,
        section: "hotfolderSection" + (hotfolderNr == 0 ? "" : hotfolderNr),
        public: true,
        advanced: true,
        label: i18n.__("settings.intervallFileFinished.label"),
        description: i18n.__("settings.intervallFileFinished.description"),
      };

      settingsObject["usePolling" + (hotfolderNr == 0 ? "" : hotfolderNr)] = {
        value: false,
        type: SettingItemType.Bool,
        section: "hotfolderSection" + (hotfolderNr == 0 ? "" : hotfolderNr),
        public: true,
        advanced: true,
        label: i18n.__("settings.usePolling.label"),
        description: i18n.__("settings.usePolling.description"),
      };

      settingsObject[
        "pollingIntervall" + (hotfolderNr == 0 ? "" : hotfolderNr)
      ] = {
        value: 100,
        minimum: 100,
        type: SettingItemType.Int,
        section: "hotfolderSection" + (hotfolderNr == 0 ? "" : hotfolderNr),
        public: true,
        advanced: true,
        label: i18n.__("settings.pollingIntervall.label"),
        description: i18n.__("settings.pollingIntervall.description"),
      };

      if (hotfolderNr === 0) {
        await joplin.settings.registerSettings({
          hotfolderAnz: {
            value: 1,
            minimum: 1,
            maximum: 10,
            type: SettingItemType.Int,
            section: "hotfolderSection",
            public: true,
            label: i18n.__("settings.hotfolderAnz.label"),
            description: i18n.__("settings.hotfolderAnz.description"),
          },
          fileLogLevel: {
            value: "error",
            type: SettingItemType.String,
            section: "hotfolderSection",
            isEnum: true,
            public: true,
            advanced: true,
            label: i18n.__("settings.fileLogLevel.label"),
            description: i18n.__("settings.fileLogLevel.description"),
            options: {
              false: "Off",
              verbose: "Verbose",
              info: "Info",
              warn: "Warning",
              error: "Error",
            },
          },
        });
      }

      hotfolderNr++;
    } while (hotfolderNr < (await joplin.settings.value("hotfolderAnz")));

    await joplin.settings.registerSettings(settingsObject);
  }

  export async function getHotfolder(
    hotfolderNr: number
  ): Promise<hotfolderSettings> {
    let hotfolderNrStr = "";
    if (hotfolderNr != 0) {
      hotfolderNrStr = String(hotfolderNr);
    }
    const ignoreFiles = await joplin.settings.value(
      "ignoreFiles" + hotfolderNrStr
    );

    const extensionsAddAsText = await joplin.settings.value(
      "extensionsAddAsText" + hotfolderNrStr
    );

    const extensionsAddTextAsTodo = await joplin.settings.value(
      "extensionsAddTextAsTodo" + hotfolderNrStr
    );

    const selectedFolder = await joplin.workspace.selectedFolder();
    const importNotebook = await joplin.settings.value(
      "importNotebook" + hotfolderNrStr
    );
    let notebookId = await helper.getNotebookId(importNotebook, false);
    if (notebookId == null) {
      notebookId = selectedFolder.id;
    }

    const importTags = await joplin.settings.value(
      "importTags" + hotfolderNrStr
    );

    const intervallFileFinished = await joplin.settings.value(
      "intervallFileFinished" + hotfolderNrStr
    );

    const usePolling = await joplin.settings.value(
      "usePolling" + hotfolderNrStr
    );

    const pollingIntervall = await joplin.settings.value(
      "pollingIntervall" + hotfolderNrStr
    );

    return {
      notebookId: notebookId,
      importTags: importTags,
      extensionsAddAsText: extensionsAddAsText,
      ignoreFiles: ignoreFiles,
      textAsTodo: extensionsAddTextAsTodo,
      importNotebook: importNotebook,
      usePolling: usePolling,
      pollingIntervall: pollingIntervall,
      intervallFileFinished: intervallFileFinished,
    };
  }
}
