import joplin from "api";
import { SettingItemType } from "api/types";

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
}
