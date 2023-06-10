import joplin from "api";
import { SettingItem, SettingItemType, SettingItemSubType } from "api/types";
import { helper } from "./helper";
import { i18n } from "./hotfolder";

export interface hotfolderSettings {
  notebookId: string;
  extensionsAddAsText: string;
  ignoreFiles: string;
  importTags: string;
  textAsTodo: boolean;
}

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
          label: i18n.__("settings.hotfolderPath"),
          description: i18n.__("settings.hotfolderPathDescription"),
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
        label: i18n.__("settings.ignoreFiles"),
        description: i18n.__("settings.ignoreFilesDescription"),
      };

      settingsObject[
        "extensionsAddAsText" + (hotfolderNr == 0 ? "" : hotfolderNr)
      ] = {
        value: ".txt, .md",
        type: SettingItemType.String,
        section: "hotfolderSection" + (hotfolderNr == 0 ? "" : hotfolderNr),
        public: true,
        label: i18n.__("settings.extensionsAddAsText"),
        description: i18n.__("settings.extensionsAddAsTextDescription"),
      };

      settingsObject[
        "extensionsAddTextAsTodo" + (hotfolderNr == 0 ? "" : hotfolderNr)
      ] = {
        value: false,
        type: SettingItemType.Bool,
        section: "hotfolderSection" + (hotfolderNr == 0 ? "" : hotfolderNr),
        public: true,
        label: i18n.__("settings.extensionsAddTextAsTodo"),
        description: i18n.__("settings.extensionsAddTextAsTodoDescription"),
      };

      settingsObject["importNotebook" + (hotfolderNr == 0 ? "" : hotfolderNr)] =
        {
          value: "",
          type: SettingItemType.String,
          section: "hotfolderSection" + (hotfolderNr == 0 ? "" : hotfolderNr),
          public: true,
          label: i18n.__("settings.importNotebook"),
          description: i18n.__("settings.importNotebookDescription"),
        };

      settingsObject["importTags" + (hotfolderNr == 0 ? "" : hotfolderNr)] = {
        value: "",
        type: SettingItemType.String,
        section: "hotfolderSection" + (hotfolderNr == 0 ? "" : hotfolderNr),
        public: true,
        label: i18n.__("settings.importTags"),
        description: i18n.__("settings.importTagsDescription"),
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
            label: i18n.__("settings.hotfolderAnz"),
            description: i18n.__("settings.hotfolderAnzDescription"),
          },
        });
      }

      hotfolderNr++;
    } while (hotfolderNr < (await joplin.settings.value("hotfolderAnz")));

    await joplin.settings.registerSettings(settingsObject);
  }

  export async function getHotfolder(
    hotfolderNr: string
  ): Promise<hotfolderSettings> {
    const ignoreFiles = await joplin.settings.value(
      "ignoreFiles" + hotfolderNr
    );

    const extensionsAddAsText = await joplin.settings.value(
      "extensionsAddAsText" + hotfolderNr
    );

    const extensionsAddTextAsTodo = await joplin.settings.value(
      "extensionsAddTextAsTodo" + hotfolderNr
    );

    const selectedFolder = await joplin.workspace.selectedFolder();
    const importNotebook = await joplin.settings.value(
      "importNotebook" + hotfolderNr
    );
    let notebookId = await helper.getNotebookId(importNotebook, false);
    if (notebookId == null) {
      notebookId = selectedFolder.id;
    }

    const importTags = await joplin.settings.value("importTags" + hotfolderNr);

    return {
      notebookId: notebookId,
      importTags: importTags,
      extensionsAddAsText: extensionsAddAsText,
      ignoreFiles: ignoreFiles,
      textAsTodo: extensionsAddTextAsTodo,
    };
  }
}
