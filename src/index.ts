import joplin from "api";
import { settings } from "./settings";
import { Hotfolder } from "./hotfolder";

const hotfolder = new Hotfolder();

joplin.plugins.register({
  onStart: async function () {
    console.info("Hotfolder plugin started!");
    await hotfolder.init();

    joplin.settings.onChange(async (event: any) => {
      console.log("Settings changed");
      await hotfolder.loadSettings();
      await hotfolder.registerHotfolders();
    });
  },
});
