import joplin from "api";
import { SettingItemType } from "api/types";
import { helper } from "./helper";

export interface hotfolderSettings {
  notebookId: string;
  extensionsAddAsText: string;
  ignoreFiles: string;
  importTags: string;
}

export namespace settings {
  export async function register() {
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
          value: ".*",
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
          description: "Comma separated list of tags to be added to the note.",
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
          label: "Number of Hotfolders",
          description:
            "Sections appear on the left (Please restart Joplin after a change).",
        });
      }
      hotfolderNr++;
    } while (hotfolderNr < (await joplin.settings.value("hotfolderAnz")));
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
    };
  }
}
